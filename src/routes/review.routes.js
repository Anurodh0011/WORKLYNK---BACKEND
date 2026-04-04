import express from "express";
import * as reviewController from "../controllers/review.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";

const router = express.Router();

// Submit a review for a completed contract
router.post("/", authenticate, reviewController.submitReview);

export default router;
