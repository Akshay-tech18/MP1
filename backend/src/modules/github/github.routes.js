const express = require("express");
const { protect } = require("../../middleware/auth.middleware");
const { checkProjectRole } = require("../../middleware/rbac.middleware");
const { verifyGitHubWebhook } = require("../../middleware/webhook.middleware");
const {
  getGitHubStatus,
  connectGitHubToken,
  disconnectGitHub,
  getAvailableRepos,
  linkRepository,
  unlinkRepository,
  triggerSyncCommits,
  listRepositories,
  getCommits,
  getAllProjectCommits,
  getPullRequests,
  syncRepositoryCommits
} = require("./github.controller");
const { handleGitHubWebhook } = require("./webhook.handler");

// 1. User GitHub Router (General GitHub queries for the authenticated user)
const userGithubRouter = express.Router();
userGithubRouter.use(protect);
userGithubRouter.get("/status", getGitHubStatus);
userGithubRouter.post("/connect", connectGitHubToken);
userGithubRouter.delete("/disconnect", disconnectGitHub);
userGithubRouter.get("/repos", getAvailableRepos);

// 1. Webhook Router (Unauthenticated from client-side, verified via HMAC signature)
const webhookRouter = express.Router();
webhookRouter.post(
  "/github",
  express.raw({ type: "application/json" }), // capture raw bytes for signature verification
  verifyGitHubWebhook,
  handleGitHubWebhook
);

// 2. Repository Router (Scoped under project API endpoints /api/projects/:id/repositories)
const repositoryRouter = express.Router({ mergeParams: true });
repositoryRouter.use(protect);

repositoryRouter.post(
  "/",
  checkProjectRole("MANAGER"),
  linkRepository
);

repositoryRouter.delete(
  "/:repoId",
  checkProjectRole("MANAGER"),
  unlinkRepository
);

repositoryRouter.post(
  "/:repoId/sync",
  checkProjectRole("MANAGER", "DEVELOPER"),
  triggerSyncCommits
);

repositoryRouter.get(
  "/",
  checkProjectRole("MANAGER", "DEVELOPER", "QA_TESTER", "VIEWER"),
  listRepositories
);

repositoryRouter.get(
  "/commits",
  checkProjectRole("MANAGER", "DEVELOPER", "QA_TESTER", "VIEWER"),
  getAllProjectCommits
);

repositoryRouter.get(
  "/:repoId/commits",
  checkProjectRole("MANAGER", "DEVELOPER", "QA_TESTER", "VIEWER"),
  getCommits
);

repositoryRouter.get(
  "/:repoId/prs",
  checkProjectRole("MANAGER", "DEVELOPER", "QA_TESTER", "VIEWER"),
  getPullRequests
);

module.exports = {
  userGithubRouter,
  repositoryRouter,
  webhookRouter
};
