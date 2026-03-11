// ─── OTP Controller ──────────────────────────────────────
// Updated: Uses email for identifying pending users

import * as otpService from "../services/otp.service.js";
import { successResponse, errorResponse } from "../helpers/response.helper.js";

/**
 * POST /api/v1/auth/otp/verify
 * Verify the OTP code and complete user creation
 */
export async function verifyOtp(req, res, next) {
  try {
    const { email, code } = req.body;

    const result = await otpService.verifyOtp(email, code);

    return successResponse(res, result.message, {
      user: result.user,
    });
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, null, error.statusCode);
    }
    next(error);
  }
}

/**
 * POST /api/v1/auth/otp/resend
 * Resend OTP to a pending email
 */
export async function resendOtp(req, res, next) {
  try {
    const { email } = req.body;

    const result = await otpService.resendOtp(email);

    return successResponse(res, result.message);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, null, error.statusCode);
    }
    next(error);
  }
}
