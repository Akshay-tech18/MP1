/**
 * Standard API Response Formatting Helpers
 */

/**
 * Format success response
 * @param {import("express").Response} res Express response object
 * @param {number} statusCode HTTP status code
 * @param {string} message Human readable message
 * @param {any} data Response data object
 */
const sendSuccess = (res, statusCode = 200, message = "Success", data = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

/**
 * Format error response
 * @param {import("express").Response} res Express response object
 * @param {number} statusCode HTTP status code
 * @param {string} message Error description
 * @param {Array<object>} errors Detailed sub-errors (e.g. Zod validation errors)
 */
const sendError = (res, statusCode = 500, message = "Internal Server Error", errors = []) => {
  const payload = {
    success: false,
    message
  };

  if (errors && errors.length > 0) {
    payload.errors = errors;
  }

  return res.status(statusCode).json(payload);
};

module.exports = {
  sendSuccess,
  sendError
};
