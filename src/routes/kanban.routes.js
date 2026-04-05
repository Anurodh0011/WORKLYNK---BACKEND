import express from "express";
import * as kanbanController from "../controllers/kanban.controller.js";
import { authenticate } from "../middleware/authenticate.js";

const router = express.Router();

router.get("/:contractId", authenticate, kanbanController.getBoardData);
router.post("/tasks", authenticate, kanbanController.createTask);
router.patch("/tasks/:taskId/move", authenticate, kanbanController.moveTask);
router.patch("/tasks/:taskId/feedback", authenticate, kanbanController.updateTaskFeedback);
router.post("/columns", authenticate, kanbanController.createColumn);
router.patch("/columns/:columnId", authenticate, kanbanController.renameColumn);
router.patch("/columns/:columnId/move", authenticate, kanbanController.moveColumn);
router.post("/columns/:columnId/feedback", authenticate, kanbanController.addColumnFeedback);
router.delete("/columns/:columnId", authenticate, kanbanController.deleteColumn);
router.post("/contracts/:contractId/milestones/:milestoneId/submit", authenticate, kanbanController.submitMilestone);
router.post("/contracts/:contractId/milestones/:milestoneId/review", authenticate, kanbanController.reviewMilestone);

export default router;
