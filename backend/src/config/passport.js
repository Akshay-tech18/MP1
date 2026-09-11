const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const GitHubStrategy = require("passport-github2").Strategy;
const prisma = require("./db");
const { encrypt } = require("../utils/crypto.utils");
const logger = require("../utils/logger");

// 1. Google OAuth Strategy
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (googleClientId && googleClientSecret && googleClientId !== "dummy_google_id") {
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:5001/api/auth/google/callback",
        passReqToCallback: true,
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
          if (!email) {
            return done(new Error("No email found in Google profile"), null);
          }

          const avatar =
            (profile.photos && profile.photos[0] ? profile.photos[0].value : null) ||
            profile._json?.picture ||
            null;

          let user = await prisma.user.findUnique({ where: { email } });
          if (user) {
            user = await prisma.user.update({
              where: { id: user.id },
              data: {
                googleId: profile.id,
                name: profile.displayName || user.name,
                avatar: avatar || user.avatar,
              },
            });
          } else {
            user = await prisma.user.create({
              data: {
                email,
                name: profile.displayName || "Google User",
                avatar,
                role: "DEVELOPER",
                googleId: profile.id,
              },
            });
          }

          return done(null, user);
        } catch (error) {
          logger.error("Error in Google OAuth verification: %o", error);
          return done(null, false, { message: error.message });
        }
      }
    )
  );
} else {
  logger.warn("Google OAuth credentials not configured. Google Strategy will not be registered.");
}

// 2. GitHub OAuth Strategy
const githubClientId = process.env.GITHUB_CLIENT_ID;
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;

if (githubClientId && githubClientSecret && githubClientId !== "dummy_github_id") {
  passport.use(
    new GitHubStrategy(
      {
        clientID: githubClientId,
        clientSecret: githubClientSecret,
        callbackURL: process.env.GITHUB_CALLBACK_URL || "http://localhost:5001/api/auth/github/callback",
        scope: ["user:email", "repo"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
          
          if (!email) {
            // Fallback for Github profiles with private email
            // Use github_username@users.noreply.github.com
            const username = profile.username || `github_user_${profile.id}`;
            const fallbackEmail = `${username}@users.noreply.github.com`;
            
            // Check if user exists with githubId
            let user = await prisma.user.findUnique({
              where: { githubId: profile.id }
            });

            if (!user) {
              // Try finding by fallback email
              user = await prisma.user.findUnique({
                where: { email: fallbackEmail }
              });
            }

            const avatar =
              (profile.photos && profile.photos[0] ? profile.photos[0].value : null) ||
              profile._json?.avatar_url ||
              null;
            const encryptedToken = encrypt(accessToken);

            if (user) {
              user = await prisma.user.update({
                where: { id: user.id },
                data: {
                  githubId: profile.id,
                  githubToken: encryptedToken,
                  name: profile.displayName || user.name,
                  avatar: avatar || user.avatar,
                }
              });
            } else {
              user = await prisma.user.create({
                data: {
                  email: fallbackEmail,
                  name: profile.displayName || username,
                  avatar,
                  role: "DEVELOPER",
                  githubId: profile.id,
                  githubToken: encryptedToken,
                }
              });
            }
            return done(null, user);
          }

          const avatar =
            (profile.photos && profile.photos[0] ? profile.photos[0].value : null) ||
            profile._json?.avatar_url ||
            null;
          const encryptedToken = encrypt(accessToken);

          let userWithEmail = await prisma.user.findUnique({ where: { email } });
          
          if (userWithEmail) {
            userWithEmail = await prisma.user.update({
              where: { id: userWithEmail.id },
              data: {
                githubId: profile.id,
                githubToken: encryptedToken,
                name: profile.displayName || userWithEmail.name,
                avatar: avatar || userWithEmail.avatar,
              },
            });
            return done(null, userWithEmail);
          } else {
            const newUser = await prisma.user.create({
              data: {
                email,
                name: profile.displayName || "GitHub User",
                avatar,
                role: "DEVELOPER",
                githubId: profile.id,
                githubToken: encryptedToken,
              },
            });
            return done(null, newUser);
          }
        } catch (error) {
          logger.error("Error in GitHub OAuth verification: %o", error);
          return done(null, false, { message: error.message });
        }
      }
    )
  );
} else {
  logger.warn("GitHub OAuth credentials not configured. GitHub Strategy will not be registered.");
}

module.exports = passport;
