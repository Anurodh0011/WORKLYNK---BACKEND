// ─── Freelancer Routes ───────────────────────────────────
// Routes accessible only by users with FREELANCER role

import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorize, requireVerified } from "../middleware/authorize.js";
import { successResponse } from "../helpers/response.helper.js";

const freelancerRouter = Router();

import * as freelancerController from "../controllers/freelancer.controller.js";

// Public/Client/Freelancer: Browse freelancers
freelancerRouter.get("/", authenticate, requireVerified, authorize("CLIENT", "ADMIN", "FREELANCER"), freelancerController.listFreelancers);

// Restricted to Freelancers/Admins
freelancerRouter.get("/profile", authenticate, requireVerified, authorize("FREELANCER", "ADMIN"), (req, res) => {
  return successResponse(res, "Freelancer profile", {
    user: req.user,
  });
});

freelancerRouter.get("/available-projects", authenticate, requireVerified, authorize("FREELANCER", "ADMIN"), (req, res) => {
  return successResponse(res, "Available projects endpoint", {
    message: "Projects available for application will appear here",
    user: req.user.name,
  });
});

freelancerRouter.get("/applications", authenticate, requireVerified, authorize("FREELANCER", "ADMIN"), (req, res) => {
  return successResponse(res, "Freelancer applications endpoint", {
    message: "Your applications will appear here",
    user: req.user.name,
  });
});

export default freelancerRouter;
