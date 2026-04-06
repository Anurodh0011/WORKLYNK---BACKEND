// ─── Admin Routes ────────────────────────────────────────
// Routes accessible only by users with ADMIN role

import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorize, requireVerified } from "../middleware/authorize.js";
import { successResponse } from "../helpers/response.helper.js";
import prisma from "../prisma/client.js";

const adminRouter = Router();

// All admin routes require authentication + ADMIN role + verified email
adminRouter.use(authenticate, requireVerified, authorize("ADMIN"));

/**
 * GET /api/v1/admin/dashboard
 * Admin dashboard — system overview
 */
adminRouter.get("/dashboard", async (req, res, next) => {
  try {
    const [totalUsers, totalClients, totalFreelancers, activeSessions] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: "CLIENT" } }),
        prisma.user.count({ where: { role: "FREELANCER" } }),
        prisma.session.count({ where: { expiresAt: { gt: new Date() } } }),
      ]);

    return successResponse(res, "Admin dashboard data", {
      stats: {
        totalUsers,
        totalClients,
        totalFreelancers,
        activeSessions,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/admin/users/metrics
 * User dashboard metrics including trends and top users
 */
adminRouter.get("/users/metrics", async (req, res, next) => {
  try {
    // 1. User role distribution for doughnut chart
    const roleDistribution = await prisma.user.groupBy({
      by: ["role"],
      _count: { id: true },
    });

    // 2. User registration trend (last 6 months) for line/bar chart
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const recentUsers = await prisma.user.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true, role: true },
      orderBy: { createdAt: "asc" }
    });

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const trendData = {};
    recentUsers.forEach(u => {
      const d = u.createdAt;
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      if (!trendData[key]) {
        trendData[key] = { name: key, CLIENT: 0, FREELANCER: 0, ADMIN: 0, total: 0 };
      }
      trendData[key][u.role] = (trendData[key][u.role] || 0) + 1;
      trendData[key].total += 1;
    });

    const registrationTrend = Object.values(trendData);

    // 3. Top 5 Clients (by project count)
    const topClients = await prisma.user.findMany({
      where: { role: "CLIENT" },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        _count: { select: { projects: true } }
      },
      orderBy: { projects: { _count: "desc" } },
      take: 5
    });

    // 4. Top 5 Freelancers (by contract count)
    const topFreelancers = await prisma.user.findMany({
      where: { role: "FREELANCER" },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        _count: { select: { contractsAsFreelancer: true } }
      },
      orderBy: { contractsAsFreelancer: { _count: "desc" } },
      take: 5
    });

    const roles = { CLIENT: 0, FREELANCER: 0, ADMIN: 0 };
    roleDistribution.forEach(r => roles[r.role] = r._count.id);

    return successResponse(res, "User metrics retrieved", {
      distribution: roles,
      trend: registrationTrend,
      topClients: topClients.map(c => ({ 
        id: c.id, name: c.name, email: c.email, status: c.status, count: c._count.projects 
      })),
      topFreelancers: topFreelancers.map(f => ({ 
        id: f.id, name: f.name, email: f.email, status: f.status, count: f._count.contractsAsFreelancer 
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/admin/users
 * List all users with pagination
 */
adminRouter.get("/users", async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          lastLoginAt: true,
          _count: { select: { statusHistory: true } }
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count(),
    ]);

    return successResponse(res, "Users retrieved", {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v1/admin/users/:userId/status
 * Update user account status (activate, suspend, deactivate)
 */
adminRouter.patch("/users/:userId/status", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { status, remarks, suspensionDuration } = req.body;

    const validStatuses = ["ACTIVE", "SUSPENDED", "DEACTIVATED"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    console.log("DEBUG: Status change request for user:", userId);
    console.log("DEBUG: Payload:", { status, remarks, suspensionDuration });
    
    let suspendedUntil = null;
    if (status === "SUSPENDED" && suspensionDuration) {
      suspendedUntil = new Date();
      suspendedUntil.setDate(suspendedUntil.getDate() + parseInt(suspensionDuration));
      console.log("DEBUG: Calculated suspendedUntil:", suspendedUntil);
    }

    console.log("DEBUG: Checking user existence...");
    const userExists = await prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) {
      console.log("DEBUG: User not found:", userId);
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    console.log("DEBUG: Starting transaction...");
    const user = await prisma.$transaction(async (tx) => {
      console.log("DEBUG: Inside transaction block, updating user status...");
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { 
          status,
          // suspendedUntil: status === "SUSPENDED" ? suspendedUntil : null
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          // suspendedUntil: true
        },
      });

      console.log("DEBUG: User updated successfully. Creating history record...");
      await tx.userStatusHistory.create({
        data: {
          userId,
          status,
          remarks: remarks || "No remarks provided",
          // suspensionDuration: status === "SUSPENDED" && suspensionDuration ? parseInt(suspensionDuration) : null,
          changedById: req.user.id,
        },
      });

      return updatedUser;
    });

    console.log("DEBUG: Transaction finished successfully.");
    
    // If suspending/deactivating, destroy all their sessions
    if (status === "SUSPENDED" || status === "DEACTIVATED") {
      console.log("DEBUG: Cleaning up user sessions...");
      await prisma.session.deleteMany({ where: { userId } });
    }

    return successResponse(res, `User status updated to ${status}`, { user });

  } catch (error) {
    console.error("❌ ERROR: User status update failed:", error);
    next(error);
  }
});

/**
 * GET /api/v1/admin/users/:userId/status-history
 * Fetch history of status changes for a specific user
 */
adminRouter.get("/users/:userId/status-history", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const history = await prisma.userStatusHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return successResponse(res, "User status history retrieved", { history });
  } catch (error) {
    next(error);
  }
});

export default adminRouter;
