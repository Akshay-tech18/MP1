const { verifyAccessToken } = require("../utils/jwt.utils");
const prisma = require("../config/db");
const { sendError } = require("../utils/response.utils");
const logger = require("../utils/logger");

/**
 * Protect routes: verify JWT and attach user profile
 */
const protect = async (req, res, next) => {
  let token = null;

  // 1. Try to get token from cookies
  if (req.cookies) {
    token = req.cookies.accessToken || req.cookies.access_token;
  }

  // 2. Fallback to Authorization Header
  if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return sendError(res, 401, "Not authorized, token missing");
  }

  try {
    const decoded = verifyAccessToken(token);

    // Fetch user from DB to verify existence and check for changes
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true
      }
    });

    if (!user) {
      return sendError(res, 401, "Not authorized, user not found");
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error("Authentication error: %o", error);
    return sendError(res, 401, "Not authorized, token invalid or expired");
  }
};

/**
 * Verify user has system-level permissions
 * @param {...string} roles System roles allowed
 */
const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, "Not authenticated");
    }

    // ADMIN has bypass for everything
    if (req.user.role === "ADMIN") {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      return sendError(res, 403, `Forbidden, requires system role: ${roles.join(" or ")}`);
    }

    next();
  };
};

module.exports = {
  protect,
  checkRole
};
