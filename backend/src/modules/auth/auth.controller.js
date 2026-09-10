const { signAccessToken, signRefreshToken, verifyRefreshToken } = require("../../utils/jwt.utils");
const prisma = require("../../config/db");
const { sendSuccess, sendError } = require("../../utils/response.utils");
const logger = require("../../utils/logger");

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
};

// Set token cookies and respond
const handleAuthSuccess = (res, user, message = "Authentication successful") => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  // Set cookies
  res.cookie("accessToken", accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 15 * 60 * 1000, // 15 mins
  });

  res.cookie("refreshToken", refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
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
  const refreshToken = signRefreshToken(req.user);

  res.cookie("accessToken", accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 15 * 60 * 1000,
  });

  res.cookie("refreshToken", refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.redirect(`${process.env.CORS_ORIGIN || "http://localhost:3000"}/dashboard?auth=success`);
};

/**
 * Handle passport GitHub callback
 */
const githubCallback = (req, res) => {
  if (!req.user) {
    return res.redirect(`${process.env.CORS_ORIGIN || "http://localhost:3000"}/login?error=auth_failed`);
  }

  const accessToken = signAccessToken(req.user);
  const refreshToken = signRefreshToken(req.user);

  res.cookie("accessToken", accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 15 * 60 * 1000,
  });

  res.cookie("refreshToken", refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.redirect(`${process.env.CORS_ORIGIN || "http://localhost:3000"}/dashboard?auth=success`);
};

/**
 * Refresh expired access token
 */
const refresh = async (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!refreshToken) {
    return sendError(res, 401, "Refresh token missing");
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);
    
    // Check user in DB
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true, name: true, avatar: true }
    });

    if (!user) {
      return sendError(res, 401, "User not found");
    }

    // Issue new access token
    const newAccessToken = signAccessToken(user);
    
    res.cookie("accessToken", newAccessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000,
    });

    return sendSuccess(res, 200, "Access token refreshed", { accessToken: newAccessToken });
  } catch (error) {
    logger.error("Refresh token error: %o", error);
    return sendError(res, 401, "Invalid or expired refresh token");
  }
};

/**
 * Log user out, clear cookies
 */
const logout = (req, res) => {
  res.clearCookie("accessToken", COOKIE_OPTIONS);
  res.clearCookie("refreshToken", COOKIE_OPTIONS);
  return sendSuccess(res, 200, "Logged out successfully");
};

/**
 * Get current authenticated user
 */
const getMe = (req, res) => {
  if (!req.user) {
    return sendError(res, 401, "Not authenticated");
  }
  return sendSuccess(res, 200, "User profile retrieved", { user: req.user });
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
  refresh,
  logout,
  getMe,
  mockLogin,
};
