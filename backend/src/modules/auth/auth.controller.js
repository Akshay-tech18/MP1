const { signAccessToken, verifyAccessToken } = require("../../utils/jwt.utils");
const prisma = require("../../config/db");
const { sendSuccess, sendError } = require("../../utils/response.utils");
const logger = require("../../utils/logger");

const COOKIE_OPTIONS = {
  httpOnly: true,
  // If production (e.g. Render), use none + secure for cross-origin cookies.
  // If local development, use lax + false to allow HTTP access.
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
};

// Set token cookies and respond
const handleAuthSuccess = (res, user, message = "Authentication successful") => {
  const accessToken = signAccessToken(user);

  // Set cookies
  res.cookie("accessToken", accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  });

  return sendSuccess(res, 200, message, {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
    },
    // We also return the accessToken in the response body as fallback for client headers if needed, 
    // but the HttpOnly cookie is the primary storage.
    accessToken
  });
};

/**
 * Handle passport Google callback
 */
const googleCallback = (req, res) => {
  if (!req.user) {
    return res.redirect(`${process.env.CORS_ORIGIN || "http://localhost:3000"}/login?error=auth_failed`);
  }

  // For OAuth redirect flow, set the cookies and redirect to frontend dashboard
  const accessToken = signAccessToken(req.user);

  res.cookie("accessToken", accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 24 * 60 * 60 * 1000,
  });

  res.redirect(`${process.env.CORS_ORIGIN || "http://localhost:3000"}/dashboard?auth=success`);
};

/**
 * Handle passport GitHub callback
 */
const githubCallback = async (req, res) => {
  if (!req.user) {
    return res.redirect(`${process.env.CORS_ORIGIN || "http://localhost:3000"}/login?error=auth_failed`);
  }

  // If state was provided, it is an existing logged-in user connecting their GitHub account
  const stateToken = req.query.state;
  if (stateToken) {
    try {
      const decoded = verifyAccessToken(stateToken);
      if (decoded && decoded.id) {
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
          maxAge: 24 * 60 * 60 * 1000,
        });

        return res.redirect(`${process.env.CORS_ORIGIN || "http://localhost:3000"}/dashboard?github=connected`);
      }
    } catch (e) {
      logger.warn("Could not verify state token in githubCallback: %s", e.message);
    }
  }

  const accessToken = signAccessToken(req.user);

  res.cookie("accessToken", accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 24 * 60 * 60 * 1000,
  });

  res.redirect(`${process.env.CORS_ORIGIN || "http://localhost:3000"}/dashboard?github=connected`);
};

/**
 * Log user out, clear cookies
 */
const logout = (req, res) => {
  // Aggressively clear cookies matching both previous and current configurations
  // to ensure stale cookies from old versions are properly deleted by the browser.
  res.clearCookie("accessToken", COOKIE_OPTIONS);
  res.clearCookie("accessToken", { ...COOKIE_OPTIONS, sameSite: "lax", secure: false });
  res.clearCookie("access_token", COOKIE_OPTIONS);

  return sendSuccess(res, 200, "Logged out successfully");
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
};