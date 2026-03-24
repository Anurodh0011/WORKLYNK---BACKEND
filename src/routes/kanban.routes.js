import express from "express";
import * as kanbanController from "../controllers/kanban.controller.js";
import { authenticate } from "../middleware/authenticate.js";

const router = express.Router();

router.get("/:contractId", authenticate, kanbanController.getBoardData);
router.post("/tasks", authenticate, kanbanController.createTask);
router.patch("/tasks/:taskId/move", authenticate, kanbanController.moveTask);
router.patch("/columns/:columnId", authenticate, kanbanController.renameColumn);
router.post("/contracts/:contractId/milestones/:milestoneId/submit", authenticate, kanbanController.submitMilestone);
router.post("/contracts/:contractId/milestones/:milestoneId/review", authenticate, kanbanController.reviewMilestone);

export default router;
