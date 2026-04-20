import { Router } from "express";
import * as projectController from "../controllers/project.controller.js";
import { authenticate, tryAuthenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";
import { parseMultipart } from "../middleware/multer.js";
import { 
  createProjectRules, 
  updateProjectRules, 
  getProjectsRules 
} from "../validators/project.validator.js";
import { 
  createProject, updateProject, getProjects, getProjectById, getMyProjects, closeProject, reopenProject 
} from "../controllers/project.controller.js";

const router = Router();

/**
 * Public/Freelancer/Client: Get open projects
 */
router.get(
  "/",
  tryAuthenticate,
  getProjectsRules,
  validate,
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
  tryAuthenticate,
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
  createProjectRules,
  validate,
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
  updateProjectRules,
  validate,
  projectController.updateProject
);

/**
 * Client: Close a project
 */
router.post(
  "/:id/close",
  authenticate,
  authorize("CLIENT"),
  closeProject
);

/**
 * Client: Reopen a project
 */
router.post(
  "/:id/reopen",
  authenticate,
  authorize("CLIENT"),
  reopenProject
);

export default router;
