// ─── Global Error Handler ────────────────────────────────
// Catches unhandled errors and returns standardized responses

import { errorResponse } from "../helpers/response.helper.js";

/**
 * Global error handling middleware
 * Must be registered LAST in the middleware chain
 */
export function errorHandler(err, req, res, _next) {
  console.error(`❌ [${req.method}] ${req.originalUrl} — ${err.message}`);

  if (process.env.NODE_ENV === "development") {
    console.error(err.stack);
  }

  const statusCode = err.statusCode || 500;
  const message =
    statusCode === 500
      ? "An unexpected error occurred. Please try again later."
      : err.message;

  return errorResponse(res, message, null, statusCode);
}
