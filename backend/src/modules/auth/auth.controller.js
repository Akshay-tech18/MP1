const { signAccessToken, verifyAccessToken, signRefreshToken, verifyRefreshToken } = require("../../utils/jwt.utils");
const prisma = require("../../config/db");
const { sendSuccess, sendError } = require("../../utils/response.utils");
const logger = require("../../utils/logger");

const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days uninterrupted session

/**
 * Dynamically resolves cookie options based on protocol and environment.
 * If served over HTTPS (direct or behind reverse proxy / Tailscale), sets secure: true and sameSite: 'none'
 * to enable cross-origin cookie persistence across subdomains.
 */
const getCookieOptions = (req = null) => {
  const isHttps =
    process.env.NODE_ENV === "production" ||
    Boolean(req?.secure) ||
    req?.headers?.["x-forwarded-proto"] === "https";

  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? "none" : "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
};

/**
 * Safely resolves the frontend client URL:
 * 1. Inspects OAuth state for dynamic returnUrl passed by frontend
 * 2. Validates origin to strictly prevent Open Redirect attacks
 * 3. Falls back to CLIENT_URL -> CORS_ORIGIN -> http://localhost:3000
 */
const getClientUrl = (req = null) => {
  if (req?.query?.state) {
    try {
      let stateObj = null;
      try {
        stateObj = JSON.parse(Buffer.from(req.query.state, "base64").toString("utf-8"));
      } catch {
        stateObj = JSON.parse(req.query.state);
      }

      if (stateObj && typeof stateObj.returnUrl === "string" && stateObj.returnUrl.trim()) {
        const candidateUrl = new URL(stateObj.returnUrl.trim());
        const candidateOrigin = candidateUrl.origin;

        const configuredOrigins = [
          process.env.CLIENT_URL,
          ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim()) : [])
        ].filter(Boolean);

        // Security whitelist: localhost, loopback, tailscale network, or explicitly configured origins
        const isAllowed =
          candidateUrl.hostname === "localhost" ||
          candidateUrl.hostname === "127.0.0.1" ||
          candidateUrl.hostname.endsWith(".ts.net") ||
          configuredOrigins.some((orig) => {
            try {
              return new URL(orig).origin === candidateOrigin;
            } catch {
              return false;
            }
          });

        if (isAllowed) {
          return candidateOrigin;
        }
      }
    } catch {
      // Ignored: state not JSON or URL invalid
    }
  }

  if (process.env.CLIENT_URL) return process.env.CLIENT_URL.trim();
  if (process.env.CORS_ORIGIN) {
    return process.env.CORS_ORIGIN.split(",")[0].trim();
  }
  return "http://localhost:3000";
};

// Set token cookies and respond
const handleAuthSuccess = (res, user, message = "Authentication successful", req = null) => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  const cookieOpts = getCookieOptions(req);
  res.cookie("accessToken", accessToken, cookieOpts);
  res.cookie("refreshToken", refreshToken, cookieOpts);

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
    return res.redirect(`${getClientUrl(req)}/login?error=auth_failed`);
  }

  const accessToken = signAccessToken(req.user);
  const refreshToken = signRefreshToken(req.user);

  const cookieOpts = getCookieOptions(req);
  res.cookie("accessToken", accessToken, cookieOpts);
  res.cookie("refreshToken", refreshToken, cookieOpts);

  res.redirect(`${getClientUrl(req)}/dashboard?auth=success`);
};

/**
 * Handle passport GitHub callback
 */
const githubCallback = async (req, res) => {
  if (!req.user) {
    return res.redirect(`${getClientUrl(req)}/login?error=auth_failed`);
  }

  let stateToken = req.query.state;
  if (stateToken) {
    try {
      let parsed = null;
      try {
        parsed = JSON.parse(Buffer.from(stateToken, "base64").toString("utf-8"));
      } catch {
        parsed = JSON.parse(stateToken);
      }
      if (parsed && typeof parsed === "object") {
        stateToken = (typeof parsed.token === "string" && parsed.token.trim()) ? parsed.token.trim() : null;
      }
    } catch {
      // stateToken was already a plain raw string
    }
  }

  const cookieOpts = getCookieOptions(req);

  // If state was provided with a user token, it is an existing logged-in user connecting their GitHub account
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
        res.cookie("accessToken", accessToken, cookieOpts);

        return res.redirect(`${getClientUrl(req)}/dashboard?github=connected`);
      }
    } catch (e) {
      logger.error("Error linking GitHub account in githubCallback: %s", e.message);
      return res.redirect(`${getClientUrl(req)}/dashboard?error=github_link_failed`);
    }
  }

  const accessToken = signAccessToken(req.user);
  const refreshToken = signRefreshToken(req.user);

  res.cookie("accessToken", accessToken, cookieOpts);
  res.cookie("refreshToken", refreshToken, cookieOpts);

  return res.redirect(`${getClientUrl(req)}/dashboard?github=connected`);
};

/**
 * Log user out, clear cookies
 */
const logout = (req, res) => {
  const cookieOpts = getCookieOptions(req);
  res.clearCookie("accessToken", cookieOpts);
  res.clearCookie("accessToken", { ...cookieOpts, sameSite: "lax", secure: false });
  res.clearCookie("refreshToken", cookieOpts);
  res.clearCookie("refreshToken", { ...cookieOpts, sameSite: "lax", secure: false });
  res.clearCookie("access_token", cookieOpts);

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

    const cookieOpts = getCookieOptions(req);
    res.cookie("accessToken", newAccessToken, cookieOpts);
    res.cookie("refreshToken", newRefreshToken, cookieOpts);

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

    return handleAuthSuccess(res, user, `Mock login successful as ${user.role}`, req);
  } catch (error) {
    logger.error("Mock login error: %o", error);
    return sendError(res, 500, "Failed to login");
  }
};

module.exports = {
  getClientUrl,
  getCookieOptions,
  googleCallback,
  githubCallback,
  logout,
  getMe,
  mockLogin,
  refreshToken,
};
