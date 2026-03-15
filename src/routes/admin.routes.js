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
          emailVerified: true,
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
