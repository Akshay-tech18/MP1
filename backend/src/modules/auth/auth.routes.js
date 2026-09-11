const express = require("express");
const passport = require("passport");
const { protect } = require("../../middleware/auth.middleware");
const {
  googleCallback,
  githubCallback,
  logout,
  getMe,
  mockLogin
} = require("./auth.controller");

const router = express.Router();

const CLIENT_LOGIN_ERROR = `${process.env.CORS_ORIGIN || "http://localhost:3000"}/login?error=auth_failed`;

// Google OAuth
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: CLIENT_LOGIN_ERROR }),
  googleCallback
);

// GitHub OAuth
router.get("/github", (req, res, next) => {
  const state = req.query.token || req.cookies?.accessToken || "";
  passport.authenticate("github", {
    scope: ["user:email", "repo"],
    session: false,
    state: state ? String(state) : undefined,
  })(req, res, next);
});

router.get(
  "/github/callback",
  passport.authenticate("github", { session: false, failureRedirect: CLIENT_LOGIN_ERROR }),
  githubCallback
);

// Session Management & Tokens
router.post("/logout", logout);
router.get("/me", protect, getMe);

// Development Mock Login Route
router.post("/mock-login", mockLogin);

module.exports = router;
