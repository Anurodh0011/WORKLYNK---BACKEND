// ─── Client Routes ───────────────────────────────────────
// Routes accessible only by users with CLIENT role

import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorize, requireVerified } from "../middleware/authorize.js";
import { successResponse } from "../helpers/response.helper.js";

const clientRouter = Router();

// All client routes require authentication + CLIENT role + verified email
clientRouter.use(authenticate, requireVerified, authorize("CLIENT", "ADMIN"));

/**
 * GET /api/v1/client/projects
 * Get client's projects (placeholder — to be connected to projects module)
 */
clientRouter.get("/projects", (req, res) => {
  return successResponse(res, "Client projects endpoint", {
    message: "Your projects will appear here",
    user: req.user.name,
    role: req.user.role,
  });
});

/**
 * GET /api/v1/client/contracts
 * Get client's contracts (placeholder)
 */
clientRouter.get("/contracts", (req, res) => {
  return successResponse(res, "Client contracts endpoint", {
    message: "Your contracts will appear here",
    user: req.user.name,
  });
});

/**
 * GET /api/v1/client/profile
 * Get client profile
 */
clientRouter.get("/profile", (req, res) => {
  return successResponse(res, "Client profile", {
    user: req.user,
  });
});

export default clientRouter;
