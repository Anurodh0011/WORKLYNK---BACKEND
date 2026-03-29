import express from "express";
import * as contractController from "../controllers/contract.controller.js";
import * as reviewController from "../controllers/review.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";

const router = express.Router();

// Get all user contracts
router.get(
  "/my-contracts",
  authenticate,
  contractController.getMyContracts
);

// Get contract details
router.get(
  "/:id",
  authenticate,
  contractController.getContractDetails
);

// Update contract (Client only)
router.patch(
  "/:id",
  authenticate,
  authorize("CLIENT"),
  contractController.updateContract
);

// Send contract to freelancer (Client only)
router.post(
  "/:id/send",
  authenticate,
  authorize("CLIENT"),
  contractController.sendContract
);

// Freelancer responds to contract (Freelancer only)
router.post(
  "/:id/respond",
  authenticate,
  authorize("FREELANCER"),
  contractController.respondToContract
);

// Freelancer marks project as complete (Requires all milestones to be PAID)
router.post(
  "/:contractId/complete",
  authenticate,
  authorize("FREELANCER"),
  reviewController.completeContractTrigger
);

export default router;
