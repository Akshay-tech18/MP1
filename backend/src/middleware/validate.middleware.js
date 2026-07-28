const { sendError } = require("../utils/response.utils");

/**
 * Zod validation middleware for request bodies
 * @param {import("zod").ZodSchema} schema Zod schema to validate against
 */
const validateBody = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    
    if (!result.success) {
      const errors = result.error.errors.map(err => ({
        field: err.path.join("."),
        message: err.message
      }));
      return sendError(res, 400, "Validation failed", errors);
    }
    
    // Assign validated and stripped content back to body
    req.body = result.data;
    next();
  };
};

module.exports = {
  validateBody
};
