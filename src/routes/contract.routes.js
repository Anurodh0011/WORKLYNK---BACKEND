import express from "express";
import * as contractController from "../controllers/contract.controller.js";
import { authenticate } from "../middleware/authenticate.js";

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

export default router;
