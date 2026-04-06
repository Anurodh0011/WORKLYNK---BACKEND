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
    const { status } = req.body;

    const validStatuses = ["ACTIVE", "SUSPENDED", "DEACTIVATED"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { status },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    // If suspending/deactivating, destroy all their sessions
    if (status === "SUSPENDED" || status === "DEACTIVATED") {
      await prisma.session.deleteMany({ where: { userId } });
    }

    return successResponse(res, `User status updated to ${status}`, { user });
  } catch (error) {
    next(error);
  }
});

export default adminRouter;
