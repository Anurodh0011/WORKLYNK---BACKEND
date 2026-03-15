// ─── OTP Validators ───────────────────────────────────────
import { body } from "express-validator";

export const verifyOtpValidator = [
  body("email")
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),
  body("code")
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be exactly 6 digits"),
];

export const resendOtpValidator = [
  body("email")
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),
];
