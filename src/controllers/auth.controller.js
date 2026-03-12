// ─── Auth Controller ─────────────────────────────────────
// Route handlers for registration, login, logout, and current user

import * as authService from "../services/auth.service.js";
import { successResponse, errorResponse } from "../helpers/response.helper.js";
import env from "../config/env.js";

/**
 * POST /api/v1/auth/register
 * Register a new user account
 */
export async function register(req, res, next) {
  try {
    const { name, email, password, role, phoneNumber } = req.body;

    const user = await authService.registerUser({
      name,
      email,
      password,
      role,
      phoneNumber,
    });

    return successResponse(
      res,
      "Registration successful. Please verify your email.",
      user,
      201,
    );
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, null, error.statusCode);
    }
    next(error);
  }
}

/**
 * POST /api/v1/auth/login
 * Authenticate user and create session
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.get("User-Agent");

    const { user, sessionToken, expiresAt } = await authService.loginUser({
      email,
      password,
      ipAddress,
      userAgent,
    });

    // Set session token as HTTP-only cookie
    res.cookie("session_token", sessionToken, {
      httpOnly: true,
      secure: env.nodeEnv === "production",
      sameSite: "lax",
      maxAge: env.sessionMaxAge,
      path: "/",
    });

    return successResponse(res, "Login successful", {
      user,
      session: {
        token: sessionToken,
        expiresAt,
      },
    });
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, null, error.statusCode);
    }
    next(error);
  }
}

/**
 * POST /api/v1/auth/logout
 * Destroy session and clear cookie
 */
export async function logout(req, res, next) {
  try {
    const sessionToken = req.sessionToken || req.cookies?.session_token;

    await authService.logoutUser(sessionToken);

    // Clear the session cookie
    res.clearCookie("session_token", {
      httpOnly: true,
      secure: env.nodeEnv === "production",
      sameSite: "lax",
      path: "/",
    });

    return successResponse(res, "Logged out successfully");
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/auth/me
 * Get current authenticated user info
 */
export async function getCurrentUser(req, res, next) {
  try {
    const user = await authService.getUserById(req.user.id);

    if (!user) {
      return errorResponse(res, "User not found", null, 404);
    }

    return successResponse(res, "User retrieved successfully", { user });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/auth/forgot-password
 */
export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const result = await authService.forgotPassword(email);
    return successResponse(res, result.message);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/auth/verify-code
 */
export async function verifyResetCode(req, res, next) {
  try {
    const { email, code } = req.body;
    const result = await authService.verifyResetCode(email, code);
    return successResponse(res, result.message, result);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, null, error.statusCode);
    }
    next(error);
  }
}

/**
 * POST /api/v1/auth/reset-password
 */
export async function resetPassword(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.resetPassword(email, password);
    return successResponse(res, result.message);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, null, error.statusCode);
    }
    next(error);
  }
}
