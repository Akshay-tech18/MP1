const { signAccessToken, verifyAccessToken, signRefreshToken, verifyRefreshToken } = require("../../utils/jwt.utils");
const prisma = require("../../config/db");
const { sendSuccess, sendError } = require("../../utils/response.utils");
const logger = require("../../utils/logger");

const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days uninterrupted session

const COOKIE_OPTIONS = {
  httpOnly: true,
  // If production (e.g. Render) or HTTPS, use none + secure for cross-origin cookies.
  // If local development, use lax + false to allow HTTP access.
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
};

const getClientUrl = () => {
  if (process.env.CLIENT_URL) return process.env.CLIENT_URL;
  if (process.env.CORS_ORIGIN) {
    return process.env.CORS_ORIGIN.split(",")[0].trim();
  }
  return "http://localhost:3000";
};

// Set token cookies and respond
const handleAuthSuccess = (res, user, message = "Authentication successful") => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  // Set cookies for 7 days
  res.cookie("accessToken", accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: SESSION_MAX_AGE,
  });

  res.cookie("refreshToken", refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: SESSION_MAX_AGE,
  });

  return sendSuccess(res, 200, message, {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
    },
    accessToken,
    refreshToken
  });
};

/**
 * Handle passport Google callback
 */
const googleCallback = (req, res) => {
  if (!req.user) {
    return res.redirect(`${getClientUrl()}/login?error=auth_failed`);
  }

  // For OAuth redirect flow, set the cookies and redirect to frontend dashboard
  const accessToken = signAccessToken(req.user);

  res.cookie("accessToken", accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: SESSION_MAX_AGE,
  });

  res.redirect(`${getClientUrl()}/dashboard?auth=success`);
};

/**
 * Handle passport GitHub callback
 */
const githubCallback = async (req, res) => {
  if (!req.user) {
    return res.redirect(`${getClientUrl()}/login?error=auth_failed`);
  }

  // If state was provided, it is an existing logged-in user connecting their GitHub account
  const stateToken = req.query.state;
  if (stateToken) {
    try {
      const decoded = verifyAccessToken(stateToken);
      if (decoded && decoded.id) {
        // If Passport created or matched a different user record with this githubId,
        // release the unique constraint before linking to the logged-in user.
        if (req.user && req.user.id !== decoded.id) {
          await prisma.user.update({
            where: { id: req.user.id },
            data: { githubId: null, githubToken: null },
          });

          // If the transient user has no associated projects or memberships, clean it up
          const membershipCount = await prisma.projectMember.count({ where: { userId: req.user.id } });
          const ownedProjectsCount = await prisma.project.count({ where: { ownerId: req.user.id } });
          if (membershipCount === 0 && ownedProjectsCount === 0) {
            await prisma.user.delete({ where: { id: req.user.id } }).catch(() => {});
          }
        }

        const updatedUser = await prisma.user.update({
          where: { id: decoded.id },
          data: {
            githubId: req.user.githubId,
            githubToken: req.user.githubToken,
          },
        });

        const accessToken = signAccessToken(updatedUser);

        res.cookie("accessToken", accessToken, {
          ...COOKIE_OPTIONS,
          maxAge: SESSION_MAX_AGE,
        });

        return res.redirect(`${getClientUrl()}/dashboard?github=connected`);
      }
    } catch (e) {
      logger.error("Error linking GitHub account in githubCallback: %s", e.message);
      return res.redirect(`${getClientUrl()}/dashboard?error=github_link_failed`);
    }
  }

  const accessToken = signAccessToken(req.user);

  res.cookie("accessToken", accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: SESSION_MAX_AGE,
  });

  return res.redirect(`${getClientUrl()}/dashboard?github=connected`);
};

/**
 * Log user out, clear cookies
 */
const logout = (req, res) => {
  // Aggressively clear cookies matching both previous and current configurations
  res.clearCookie("accessToken", COOKIE_OPTIONS);
  res.clearCookie("accessToken", { ...COOKIE_OPTIONS, sameSite: "lax", secure: false });
  res.clearCookie("refreshToken", COOKIE_OPTIONS);
  res.clearCookie("refreshToken", { ...COOKIE_OPTIONS, sameSite: "lax", secure: false });
  res.clearCookie("access_token", COOKIE_OPTIONS);

  return sendSuccess(res, 200, "Logged out successfully");
};

/**
 * Refresh access token using existing session
 */
const refreshToken = async (req, res) => {
  const token =
    req.cookies?.refreshToken ||
    req.cookies?.accessToken ||
    req.body?.refreshToken ||
    (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : null);

  if (!token) {
    return sendError(res, 401, "No refresh token provided");
  }

  try {
    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch (e) {
      decoded = verifyAccessToken(token);
    }

    if (!decoded || !decoded.id) {
      return sendError(res, 401, "Invalid or expired token");
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!user) {
      return sendError(res, 404, "User not found");
    }

    const newAccessToken = signAccessToken(user);
    const newRefreshToken = signRefreshToken(user);

    res.cookie("accessToken", newAccessToken, {
      ...COOKIE_OPTIONS,
      maxAge: SESSION_MAX_AGE,
    });

    res.cookie("refreshToken", newRefreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: SESSION_MAX_AGE,
    });

    return sendSuccess(res, 200, "Session refreshed", {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role
      }
    });
  } catch (err) {
    logger.warn("Token refresh failed: %s", err.message);
    return sendError(res, 401, "Session expired, please login again");
  }
};

/**
 * Get current authenticated user
 */
const getMe = (req, res) => {
  if (!req.user) {
    return sendError(res, 401, "Not authenticated");
  }
  const token = req.cookies?.accessToken || req.cookies?.access_token || (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : null);
  return sendSuccess(res, 200, "User profile retrieved", {
    user: req.user,
    accessToken: token
  });
};

/**
 * Mock login for testing/development
 */
const mockLogin = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return sendError(res, 400, "Email is required");
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return sendError(res, 404, `Mock user with email ${email} not found. Run seed script first.`);
    }

    return handleAuthSuccess(res, user, `Mock login successful as ${user.role}`);
  } catch (error) {
    logger.error("Mock login error: %o", error);
    return sendError(res, 500, "Failed to login");
  }
};

module.exports = {
  googleCallback,
  githubCallback,
  logout,
  getMe,
  mockLogin,
  refreshToken,
};