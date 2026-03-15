// ─── Freelancer Routes ───────────────────────────────────
// Routes accessible only by users with FREELANCER role

import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorize, requireVerified } from "../middleware/authorize.js";
import { successResponse } from "../helpers/response.helper.js";

const freelancerRouter = Router();

// All freelancer routes require authentication + FREELANCER role + verified email
freelancerRouter.use(authenticate, requireVerified, authorize("FREELANCER", "ADMIN"));

/**
 * GET /api/v1/freelancer/profile
 * Get freelancer profile
 */
freelancerRouter.get("/profile", (req, res) => {
  return successResponse(res, "Freelancer profile", {
    user: req.user,
  });
});

/**
 * GET /api/v1/freelancer/available-projects
 * Get projects available for application (placeholder)
 */
freelancerRouter.get("/available-projects", (req, res) => {
  return successResponse(res, "Available projects endpoint", {
    message: "Projects available for application will appear here",
    user: req.user.name,
  });
});

/**
 * GET /api/v1/freelancer/applications
 * Get freelancer's job applications (placeholder)
 */
freelancerRouter.get("/applications", (req, res) => {
  return successResponse(res, "Freelancer applications endpoint", {
    message: "Your applications will appear here",
    user: req.user.name,
  });
});

export default freelancerRouter;
