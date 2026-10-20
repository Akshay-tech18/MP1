const express = require("express");
const passport = require("passport");
const logger = require("../../utils/logger");
const { protect } = require("../../middleware/auth.middleware");
const {
  googleCallback,
  githubCallback,
  logout,
  getMe,
  mockLogin,
  refreshToken
} = require("./auth.controller");

const router = express.Router();

const getClientUrl = () => {
  if (process.env.CLIENT_URL) return process.env.CLIENT_URL;
  if (process.env.CORS_ORIGIN) {
    return process.env.CORS_ORIGIN.split(",")[0].trim();
  }
  return "http://localhost:3000";
};

// Google OAuth
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false })
);

router.get("/google/callback", (req, res, next) => {
  passport.authenticate("google", { session: false }, (err, user, info) => {
    if (err) {
      logger.error("Google OAuth Error: %s \nOAuth Details: %o", err.message, err.oauthError || err);
      return res.redirect(`${getClientUrl()}/login?error=google_auth_failed`);
    }
    if (!user) {
      logger.warn("Google OAuth Failed - No user returned: %o", info);
      return res.redirect(`${getClientUrl()}/login?error=auth_failed`);
    }
    req.user = user;
    return googleCallback(req, res);
  })(req, res, next);
});

// GitHub OAuth
router.get("/github", (req, res, next) => {
  const state = req.query.token || req.cookies?.accessToken || "";
  passport.authenticate("github", {
    scope: ["user:email", "repo"],
    session: false,
    state: state ? String(state) : undefined,
  })(req, res, next);
});

router.get("/github/callback", (req, res, next) => {
  passport.authenticate("github", { session: false }, (err, user, info) => {
    if (err) {
      logger.error("GitHub OAuth Error: %s \nOAuth Details: %o", err.message, err.oauthError || err);
      return res.redirect(`${getClientUrl()}/login?error=github_auth_failed`);
    }
    if (!user) {
      logger.warn("GitHub OAuth Failed - No user returned: %o", info);
      return res.redirect(`${getClientUrl()}/login?error=auth_failed`);
    }
    req.user = user;
    return githubCallback(req, res);
  })(req, res, next);
});

// Session Management & Tokens
router.post("/logout", logout);
router.post("/refresh", refreshToken);
router.get("/me", protect, getMe);

// Development Mock Login Route
router.post("/mock-login", mockLogin);

module.exports = router;
