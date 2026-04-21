// ─── Admin Routes ────────────────────────────────────────
// Routes accessible only by users with ADMIN role

import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorize, requireVerified } from "../middleware/authorize.js";
import { successResponse } from "../helpers/response.helper.js";
import prisma from "../prisma/client.js";
import { logActivity } from "../helpers/activity.helper.js";

import { hashPassword, comparePassword } from "../helpers/password.helper.js";

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
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const trendData = {};
    
    // Initialize last 6 months with 0s to ensure the chart always shows a trend line
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      trendData[key] = { name: key, CLIENT: 0, FREELANCER: 0, ADMIN: 0, total: 0 };
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const recentUsers = await prisma.user.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true, role: true },
    });

    recentUsers.forEach(u => {
      const d = u.createdAt;
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      if (trendData[key]) {
        trendData[key][u.role] = (trendData[key][u.role] || 0) + 1;
        trendData[key].total += 1;
      }
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
          statusHistory: {
            take: 1,
            orderBy: { createdAt: "desc" },
            select: { suspensionDuration: true }
          }
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count(),
    ]);

    return successResponse(res, "Users retrieved", {
      users: users.map(u => ({
        ...u,
        suspensionDuration: u.statusHistory?.[0]?.suspensionDuration || null
      })),
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

    if (userExists.role === "ADMIN" && (status === "SUSPENDED" || status === "DEACTIVATED")) {
      return res.status(403).json({
        success: false,
        message: "Administrative accounts cannot be suspended or deactivated.",
      });
    }

    console.log("DEBUG: Starting transaction...");
    const user = await prisma.$transaction(async (tx) => {
      console.log("DEBUG: Inside transaction block, updating user status...");
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { 
          status,
          suspendedUntil: status === "SUSPENDED" ? suspendedUntil : null
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          suspendedUntil: true
        },
      });

      console.log("DEBUG: User updated successfully. Creating history record...");
      await tx.userStatusHistory.create({
        data: {
          userId,
          status,
          remarks: remarks || "No remarks provided",
          suspensionDuration: status === "SUSPENDED" && suspensionDuration ? parseInt(suspensionDuration) : null,
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

    // Log the change
    await logActivity({
      adminId: req.user.id,
      event: `User Status Updated: ${status}`,
      targetId: userId,
      targetType: "USER",
      details: { status, remarks, suspensionDuration },
      deviceInfo: req.headers["user-agent"],
      ipAddress: req.ip,
      status: status === "ACTIVE" ? "SUCCESS" : "WARNING"
    });

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

/**
 * GET /api/v1/admin/projects/metrics
 * Project dashboard metrics
 */
adminRouter.get("/projects/metrics", async (req, res, next) => {
  try {
    // 1. Project status distribution
    const statusDistribution = await prisma.project.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    // 2. Project creation trend (last 6 months)
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const trendData = {};
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      trendData[key] = { name: key, total: 0 };
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const recentProjects = await prisma.project.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true },
    });

    recentProjects.forEach(p => {
      const d = p.createdAt;
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      if (trendData[key]) {
        trendData[key].total += 1;
      }
    });

    // 3. Status summary for KPIs
    const stats = {
      TOTAL: await prisma.project.count(),
      DRAFT: 0,
      OPEN: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      CANCELLED: 0
    };
    statusDistribution.forEach(s => stats[s.status] = s._count.id);

    return successResponse(res, "Project metrics retrieved", {
      distribution: stats,
      trend: Object.values(trendData),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/admin/projects
 * List all projects with pagination and status filtering
 */
adminRouter.get("/projects", async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status; // Optional filter
    const skip = (page - 1) * limit;

    const where = {};
    if (status && status !== "ALL") {
      if (status === "UPCOMING") {
        where.status = { in: ["DRAFT", "OPEN"] };
      } else {
        where.status = status;
      }
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        include: {
          client: {
            select: { id: true, name: true, email: true }
          },
          _count: {
            select: { applications: true, contracts: true }
          }
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.project.count({ where }),
    ]);

    return successResponse(res, "Projects retrieved", {
      projects,
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
 * GET /api/v1/admin/projects/:projectId
 * Fetch full project details for admin including all associations
 */
adminRouter.get("/projects/:projectId", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        client: {
          select: { id: true, name: true, email: true, profile: { select: { profilePicture: true } } }
        },
        applications: {
          include: {
            freelancer: {
              select: { 
                id: true, 
                name: true, 
                email: true,
                profile: { select: { profilePicture: true } }
              }
            }
          },
          orderBy: { createdAt: "desc" }
        },
        contracts: {
          include: {
            freelancer: {
              select: { 
                id: true, 
                name: true, 
                email: true,
                profile: { select: { profilePicture: true } }
              }
            }
          },
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    return successResponse(res, "Project details retrieved", { project });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/admin/users/:userId
 * Detailed user profile and activity report
 */
adminRouter.get("/users/:userId", async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        reviewsReceived: {
          include: {
            reviewer: { select: { id: true, name: true, profile: { select: { profilePicture: true } } } }
          },
          orderBy: { createdAt: "desc" }
        },
        applications: {
          include: { project: { select: { title: true, status: true, budgetMin: true, budgetMax: true } } },
          orderBy: { createdAt: "desc" }
        },
        contractsAsFreelancer: {
          include: { project: { select: { title: true, budgetMin: true, budgetMax: true } } },
          orderBy: { createdAt: "desc" }
        },
        contractsAsClient: {
          include: { project: { select: { title: true } } },
          orderBy: { createdAt: "desc" }
        },
        projects: {
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Performance Calculations
    const totalEarnings = user.contractsAsFreelancer
      .filter(c => c.status === "COMPLETED" || c.status === "ACTIVE")
      .reduce((sum, c) => sum + (c.paidAmount || 0), 0);

    const averageRating = user.reviewsReceived.length > 0
      ? user.reviewsReceived.reduce((sum, r) => sum + r.rating, 0) / user.reviewsReceived.length
      : 0;

    const totalApplications = user.applications.length;
    const approvedContracts = user.contractsAsFreelancer.length;
    const conversionRate = totalApplications > 0 
      ? (approvedContracts / totalApplications) * 100 
      : 0;

    // Project Completion Rate (Completed / Total)
    let completedProjects = 0;
    let totalProjectRecords = 0;

    if (user.role === 'CLIENT') {
      completedProjects = user.projects.filter(p => p.status === 'COMPLETED').length;
      totalProjectRecords = user.projects.length;
    } else {
      completedProjects = user.contractsAsFreelancer.filter(c => c.status === 'COMPLETED').length;
      totalProjectRecords = user.contractsAsFreelancer.length;
    }

    res.json({
      success: true,
      data: {
        user,
        metrics: {
          totalEarnings,
          averageRating,
          totalApplications,
          approvedContracts,
          conversionRate: conversionRate.toFixed(1),
          projectsCount: totalProjectRecords,
          completedProjects,
          completionRate: `${completedProjects}/${totalProjectRecords}`
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/admin/settings
 * Fetch all platform settings
 */
adminRouter.get("/settings", async (req, res, next) => {
  try {
    const settings = await prisma.platformSetting.findMany();
    // Convert to object for easier frontend consumption
    const settingsObj = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    
    return successResponse(res, "Settings retrieved", settingsObj);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/admin/settings
 * Update platform settings
 */
adminRouter.post("/settings", async (req, res, next) => {
  try {
    const updates = req.body; // { key: value }
    const adminId = req.user.id;

    const results = await prisma.$transaction(
      Object.entries(updates).map(([key, value]) => 
        prisma.platformSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) }
        })
      )
    );

    // Log the change
    await logActivity({
      adminId,
      event: "Platform Settings Updated",
      details: updates,
      deviceInfo: req.headers["user-agent"],
      ipAddress: req.ip,
      status: "SUCCESS"
    });

    return successResponse(res, "Settings updated successfully", results);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/admin/activity-logs
 * Fetch administrative activity logs
 */
adminRouter.get("/activity-logs", async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        skip,
        take: limit,
        include: {
          admin: { select: { id: true, name: true, email: true } }
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.activityLog.count(),
    ]);

    return successResponse(res, "Activity logs retrieved", {
      logs,
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
 * PATCH /api/v1/admin/security
 * Update admin email and password
 */
adminRouter.patch("/security", async (req, res, next) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
    const adminId = req.user.id;

    // 1. Fetch admin
    const admin = await prisma.user.findUnique({ where: { id: adminId } });
    if (!admin) return res.status(404).json({ success: false, message: "Admin not found" });

    // 2. Verify current password if changing email/password
    const isPasswordMatch = await comparePassword(currentPassword, admin.password);
    if (!isPasswordMatch) return res.status(401).json({ success: false, message: "Invalid current password" });

    // 3. Prepare updates
    const data = {};
    if (email) data.email = email;
    if (newPassword) data.password = await hashPassword(newPassword);

    const updatedAdmin = await prisma.user.update({
      where: { id: adminId },
      data,
      select: { id: true, name: true, email: true, role: true }
    });

    // 4. Log the change
    await logActivity({
      adminId,
      event: "Admin Security Credentials Updated",
      details: { emailChanged: !!email, passwordChanged: !!newPassword },
      deviceInfo: req.headers["user-agent"],
      ipAddress: req.ip,
      status: "CRITICAL"
    });

    return successResponse(res, "Security credentials updated", { user: updatedAdmin });
  } catch (error) {
    next(error);
  }
});

export default adminRouter;
