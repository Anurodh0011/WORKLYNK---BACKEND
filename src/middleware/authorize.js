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

  // In this system, any user in the main 'users' table is already email-verified.
  // We check if the account is ACTIVE.
  if (req.user.status !== "ACTIVE") {
    return errorResponse(
      res,
      "Your account is not active. Please contact support.",
      null,
      403
    );
  }

  next();
}
