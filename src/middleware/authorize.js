// ─── Authorization Middleware (Factory Pattern) ──────────
// Role-based access control using a factory function
// Usage: authorize("ADMIN", "CLIENT") or authorize("FREELANCER")

import { errorResponse } from "../helpers/response.helper.js";

/**
 * Factory: Create role-checking middleware
 * @param {...string} allowedRoles - roles permitted to access the route
 * @returns {Function} Express middleware
 *
 * @example
 * router.get("/admin/dashboard", authenticate, authorize("ADMIN"), handler);
 * router.get("/projects", authenticate, authorize("CLIENT", "ADMIN"), handler);
 */
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    // authenticate middleware must run first
    if (!req.user) {
      return errorResponse(res, "Authentication required", null, 401);
    }

    // Check if user's role is in the allowed list
    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return errorResponse(
        res,
        `Access denied. This resource requires one of the following roles: ${allowedRoles.join(", ")}`,
        { requiredRoles: allowedRoles, currentRole: userRole },
        403
      );
    }

    next();
  };
}

/**
 * Middleware: Require email-verified account
 * Must be used after authenticate middleware
 */
export function requireVerified(req, res, next) {
  if (!req.user) {
    return errorResponse(res, "Authentication required", null, 401);
  }

  if (!req.user.emailVerified) {
    return errorResponse(
      res,
      "Email verification required. Please verify your email to access this resource.",
      null,
      403
    );
  }

  next();
}
