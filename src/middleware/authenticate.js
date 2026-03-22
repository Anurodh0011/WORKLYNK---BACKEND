import { validateSession } from "../services/auth.service.js";
import { errorResponse } from "../helpers/response.helper.js";

/**
 * Middleware: Require authenticated session
 * Checks for session token in cookie or Authorization header
 * Attaches `req.user` on success
 */
export function authenticate(req, res, next) {
  // Extract session token from cookie or header
  const sessionToken =
    req.cookies?.session_token ||
    req.header("Authorization")?.replace("Bearer ", "").trim() ||
    null;

  if (!sessionToken) {
    return errorResponse(res, "Authentication required. Please log in.", null, 401);
  }

  // Validate the session
  validateSession(sessionToken)
    .then((user) => {
      if (!user) {
        return errorResponse(res, "Session expired or invalid. Please log in again. ", null, 401);
      }

      // Attach user and token to request
      req.user = user;
      req.sessionToken = sessionToken;
      next();
    })
    .catch((error) => {
      console.error("Auth middleware error:", error);
      return errorResponse(res, "Authentication failed", null, 500);
    });
}

/**
 * Middleware: Try to authenticate session
 * Checks for session token but continues even if not found
 * Attaches `req.user` if token is valid
 */
export function tryAuthenticate(req, res, next) {
  const sessionToken =
    req.cookies?.session_token ||
    req.header("Authorization")?.replace("Bearer ", "").trim() ||
    null;

  if (!sessionToken) {
    return next();
  }

  validateSession(sessionToken)
    .then((user) => {
      if (user) {
        req.user = user;
        req.sessionToken = sessionToken;
      }
      next();
    })
    .catch((error) => {
      console.error("Try auth middleware error:", error);
      next(); // Still continue even if token is invalid/expired
    });
}
