import { body } from "express-validator";

export const createApplicationValidator = [
  body("bidAmount")
    .notEmpty()
    .withMessage("Bid amount is required")
    .isNumeric()
    .withMessage("Bid amount must be a number")
    .custom((value) => value > 0)
    .withMessage("Bid amount must be greater than zero"),
  
  body("proposal")
    .notEmpty()
    .withMessage("Proposal is required")
    .isLength({ min: 50 })
    .withMessage("Proposal must be at least 50 characters long"),
  
  body("estimatedDays")
    .notEmpty()
    .withMessage("Estimated days is required")
    .isInt({ min: 1 })
    .withMessage("Estimated days must be at least 1"),
];

export const updateApplicationStatusValidator = [
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["PENDING", "ACCEPTED", "REJECTED", "WITHDRAWN"])
    .withMessage("Invalid application status"),
];
