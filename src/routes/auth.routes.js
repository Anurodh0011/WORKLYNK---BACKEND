// ─── Authentication Routes ────────────────────────────────
import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import * as otpController from "../controllers/otp.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";
import { registerRules, loginRules, forgotPasswordRules, verifyCodeRules, resetPasswordRules } from "../validators/auth.validator.js";
import { verifyOtpValidator, resendOtpValidator } from "../validators/otp.validator.js";
import { parseMultipart } from "../middleware/multer.js";

const router = Router();

// Public routes
router.post("/register", parseMultipart, registerRules, validate, authController.register);
router.post("/login", parseMultipart, loginRules, validate, authController.login);

// Forgot Password Flow
router.post("/forgot-password", parseMultipart, forgotPasswordRules, validate, authController.forgotPassword);
router.post("/verify-code", parseMultipart, verifyCodeRules, validate, authController.verifyResetCode);
router.post("/reset-password", parseMultipart, resetPasswordRules, validate, authController.resetPassword);

// OTP Verification (Public - user identifies by email)
router.post("/otp/verify", verifyOtpValidator, validate, otpController.verifyOtp);
router.post("/otp/resend", resendOtpValidator, validate, otpController.resendOtp);

// Protected routes (Requires valid session)
router.get("/me", authenticate, authController.getCurrentUser);
router.post("/logout", authenticate, authController.logout);

// Public settings
router.get("/settings", authController.getPlatformSettings);

export default router;

