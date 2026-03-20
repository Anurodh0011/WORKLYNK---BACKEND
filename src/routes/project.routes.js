import { Router } from "express";
import * as projectController from "../controllers/project.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";
import { parseMultipart } from "../middleware/multer.js";
import { 
  createProjectRules, 
  updateProjectRules, 
  getProjectsRules 
} from "../validators/project.validator.js";

const router = Router();

/**
 * Public/Freelancer/Client: Get open projects
 */
router.get(
  "/",
  authenticate,
  validate(getProjectsRules),
  projectController.getProjects
);

/**
 * Client: Get my own projects
 */
router.get(
  "/my-projects",
  authenticate,
  authorize("CLIENT"),
  projectController.getMyProjects
);

/**
 * Public/Freelancer/Client: Get project details
 */
router.get(
  "/:id",
  authenticate,
  projectController.getProjectById
);

/**
 * Client: Create a new project (or draft)
 * Handles multipart/form-data for attachments
 */
router.post(
  "/",
  authenticate,
  authorize("CLIENT"),
  parseMultipart,
  validate(createProjectRules),
  projectController.createProject
);

/**
 * Client: Update a project (or draft)
 */
router.patch(
  "/:id",
  authenticate,
  authorize("CLIENT"),
  parseMultipart,
  validate(updateProjectRules),
  projectController.updateProject
);

export default router;
