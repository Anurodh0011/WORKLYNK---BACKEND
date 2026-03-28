import express from "express";
import * as applicationController from "../controllers/application.controller.js";
import * as contractController from "../controllers/contract.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";
import { createApplicationValidator, updateApplicationStatusValidator } from "../validators/application.validator.js";
import upload from "../middleware/multer.js";

const router = express.Router();

// Apply for a project (FREELANCER only)
router.post(
  "/:projectId/apply",
  authenticate,
  authorize("FREELANCER"),
  upload.array("attachments", 5),
  createApplicationValidator,
  validate,
  applicationController.apply
);

// Get applications for a project (CLIENT who owns the project)
router.get(
  "/project/:projectId",
  authenticate,
  authorize("CLIENT"),
  applicationController.getProjectApplications
);

// Get freelancer's own applications
router.get(
  "/my-applications",
  authenticate,
  authorize("FREELANCER"),
  applicationController.getMyApplications
);

// Update application status (Accept/Reject/Withdraw)
router.patch(
  "/:id/status",
  authenticate,
  updateApplicationStatusValidator,
  validate,
  applicationController.updateStatus
);

// Accept application and create contract (CLIENT who owns the project)
router.post(
  "/:applicationId/accept",
  authenticate,
  authorize("CLIENT"),
  contractController.acceptApplication
);

export default router;
