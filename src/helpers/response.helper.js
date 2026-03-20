/**
 * Build a success response object
 * @param {string} message
 * @param {any} data
 * @param {number} statusCode
 */
export function successResponse(res, message, data = null, statusCode = 200) {
  const response = {
    success: true,
    message,
    ...(data !== null && { data }),
  };
  return res.status(statusCode).json(response);
}

/**
 * Build an error response object
 * @param {string} message
 * @param {any} errors
 * @param {number} statusCode
 */
export function errorResponse(res, message, errors = null, statusCode = 400) {
  const response = {
    success: false,
    message,
    ...(errors !== null && { errors }),
  };
  return res.status(statusCode).json(response);
}
