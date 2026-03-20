import express from "express";
import * as bookmarkController from "../controllers/bookmark.controller.js";
import { authenticate } from "../middleware/authenticate.js";

const router = express.Router();

router.use(authenticate);

// Projects
router.post("/projects/:projectId/toggle", bookmarkController.toggleProject);
router.get("/projects", bookmarkController.getSavedProjects);

// Freelancers (Client only)
router.post("/freelancers/:freelancerId/toggle", bookmarkController.toggleFreelancer);
router.get("/freelancers", bookmarkController.getSavedFreelancers);

export default router;
