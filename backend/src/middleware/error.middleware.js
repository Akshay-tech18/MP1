const logger = require("../utils/logger");
const { sendError } = require("../utils/response.utils");

/**
 * Express global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  logger.error("Unhandled Exception: %s \nStack: %s", err.message, err.stack);

  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === "production" && statusCode === 500
    ? "Internal Server Error"
    : err.message || "An unexpected error occurred";

  const errorDetails = process.env.NODE_ENV !== "production"
    ? [{ stack: err.stack }]
    : [];

  return sendError(res, statusCode, message, errorDetails);
};

module.exports = {
  errorHandler
};
