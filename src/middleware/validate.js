// ─── Validation Middleware ───────────────────────────────
// Runs express-validator chains and returns formatted errors

import { validationResult } from "express-validator";
import { errorResponse } from "../helpers/response.helper.js";

/**
 * Middleware: Run validation results check
 * Must be placed after express-validator chain middleware
 */
export function validate(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
      value: err.value,
    }));

    return errorResponse(res, "Validation failed", formattedErrors, 422);
  }

  next();
}
