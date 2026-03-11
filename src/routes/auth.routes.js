// ─── Authentication Routes ────────────────────────────────
import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import * as otpController from "../controllers/otp.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";
import { registerRules, loginRules } from "../validators/auth.validator.js";
import { verifyOtpValidator, resendOtpValidator } from "../validators/otp.validator.js";

const router = Router();

// Public routes
router.post("/register", registerRules, validate, authController.register);
router.post("/login", loginRules, validate, authController.login);

// OTP Verification (Public - user identifies by email)
router.post("/otp/verify", verifyOtpValidator, validate, otpController.verifyOtp);
router.post("/otp/resend", resendOtpValidator, validate, otpController.resendOtp);

// Protected routes (Requires valid session)
router.get("/me", authenticate, authController.getCurrentUser);
router.post("/logout", authenticate, authController.logout);

export default router;
