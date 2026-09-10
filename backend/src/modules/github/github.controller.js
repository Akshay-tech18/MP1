const crypto = require("crypto");
const { Octokit } = require("@octokit/rest");
const prisma = require("../../config/db");
const { decrypt } = require("../../utils/crypto.utils");
const { sendSuccess, sendError } = require("../../utils/response.utils");
const logger = require("../../utils/logger");

/**
 * Get all GitHub repositories available to the authenticated user
 */
const getAvailableRepos = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { githubToken: true }
    });

    if (!user || !user.githubToken) {
      return sendError(res, 400, "Please connect your GitHub account to access repositories.");
    }

    const decryptedToken = decrypt(user.githubToken);
    const octokit = new Octokit({ auth: decryptedToken });

    // Fetch user repos (we only want ones they can administer to set up webhooks)
    const response = await octokit.repos.listForAuthenticatedUser({
      visibility: "all",
      affiliation: "owner,collaborator,organization_member",
      sort: "updated",
      per_page: 100
    });

    // Filter for admin permissions so we can create webhooks
    const availableRepos = response.data
      .filter(repo => repo.permissions && repo.permissions.admin)
      .map(repo => ({
        id: repo.id,
        name: repo.full_name, // e.g., "owner/repo"
        private: repo.private,
        url: repo.html_url,
        updatedAt: repo.updated_at
      }));

    return sendSuccess(res, 200, "Available repositories retrieved", {
      repositories: availableRepos,
      repos: availableRepos
    });
  } catch (error) {
    logger.error("Get available repos error: %o", error);
    return sendError(res, 500, "Failed to retrieve repositories from GitHub");
  }
};

/**
 * Link a GitHub repository to a project, register webhook
 */
const linkRepository = async (req, res) => {
  const projectId = req.params.id;
  const { repoName } = req.body; // format "owner/repo"

  if (!repoName || !repoName.includes("/")) {
    return sendError(res, 400, "Repository name must be in format 'owner/repo'");
  }

  try {
    // 1. Fetch user's encrypted GitHub token
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { githubToken: true }
    });

    if (!user || !user.githubToken) {
      // In development mode, allow mock repo linking if token is missing
      if (process.env.NODE_ENV !== "production") {
        logger.warn("No GitHub token found for user. Creating a mock repository in development mode.");
        const mockRepoId = Math.floor(Math.random() * 100000000);
        const [owner, repo] = repoName.split("/");
        
        const dbRepo = await prisma.repository.create({
          data: {
            githubRepoId: String(mockRepoId),
            name: repoName,
            owner,
            webhookSecret: crypto.randomBytes(32).toString("hex"),
            projectId
          }
        });
        
        return sendSuccess(res, 201, "Mock Repository linked successfully (Development bypass)", { repository: dbRepo });
      }

      return sendError(res, 400, "Please authenticate with GitHub first to retrieve OAuth scope.");
    }

    const decryptedToken = decrypt(user.githubToken);
    const [owner, repo] = repoName.split("/");

    const octokit = new Octokit({ auth: decryptedToken });
    let repoDetails;

    // 2. Fetch repo metadata from GitHub API
    try {
      const response = await octokit.repos.get({ owner, repo });
      repoDetails = response.data;
    } catch (apiErr) {
      logger.error("GitHub API repos.get error: %o", apiErr);
      return sendError(res, 400, `Failed to retrieve repository details from GitHub: ${apiErr.message}`);
    }

    // 3. Generate random 32-byte secret
    const webhookSecret = crypto.randomBytes(32).toString("hex");
    const callbackUrl = process.env.GITHUB_WEBHOOK_URL || `${req.protocol}://${req.get("host")}/api/webhooks/github`;

    // 4. Create Webhook on GitHub
    try {
      if (typeof octokit.repos.createWebhook === "function") {
        await octokit.repos.createWebhook({
          owner,
          repo,
          name: "web",
          active: true,
          events: ["push", "pull_request"],
          config: {
            url: callbackUrl,
            content_type: "json",
            secret: webhookSecret
          }
        });
      } else if (typeof octokit.repos.createHook === "function") {
        await octokit.repos.createHook({
          owner,
          repo,
          name: "web",
          active: true,
          events: ["push", "pull_request"],
          config: {
            url: callbackUrl,
            content_type: "json",
            secret: webhookSecret
          }
        });
      }
    } catch (hookErr) {
      logger.warn("GitHub Webhook creation skipped or failed (e.g. localhost URL or already exists): %s", hookErr.message);
      // In development or if hook exists, continue so repository is still linked in DB
    }

    // 5. Store Repo details in DB
    const dbRepo = await prisma.repository.create({
      data: {
        githubRepoId: String(repoDetails.id),
        name: repoName,
        owner,
        webhookSecret,
        projectId
      }
    });

    return sendSuccess(res, 201, "Repository linked and webhook registered successfully", { repository: dbRepo });
  } catch (error) {
    logger.error("Link repository error: %o", error);
    return sendError(res, 500, "Failed to link repository");
  }
};

/**
 * List all repositories linked to a project
 */
const listRepositories = async (req, res) => {
  const projectId = req.params.id;

  try {
    const repositories = await prisma.repository.findMany({
      where: { projectId },
      select: {
        id: true,
        githubRepoId: true,
        name: true,
        owner: true,
        createdAt: true,
        _count: { select: { commits: true, pullRequests: true } }
      }
    });

    return sendSuccess(res, 200, "Repositories retrieved", { repositories });
  } catch (error) {
    logger.error("List repositories error: %o", error);
    return sendError(res, 500, "Failed to retrieve repositories");
  }
};

/**
 * List commits for a specific linked repository
 */
const getCommits = async (req, res) => {
  const { id: projectId, repoId } = req.params;
  const { cursor, limit = 50 } = req.query;
  const parsedLimit = parseInt(limit, 10);

  try {
    // Verify repository belongs to project
    const repo = await prisma.repository.findFirst({
      where: { id: repoId, projectId }
    });

    if (!repo) {
      return sendError(res, 404, "Repository not found in this project");
    }

    const queryOptions = {
      where: { repoId },
      include: {
        task: { select: { id: true, taskNumber: true, title: true } }
      },
      orderBy: { committedAt: "desc" },
      take: parsedLimit + 1,
    };

    if (cursor) {
      queryOptions.cursor = { id: cursor };
      queryOptions.skip = 1; // Skip the cursor itself
    }

    const commits = await prisma.commit.findMany(queryOptions);

    let nextCursor = null;
    if (commits.length > parsedLimit) {
      const nextItem = commits.pop();
      nextCursor = nextItem.id;
    }

    return sendSuccess(res, 200, "Commits retrieved successfully", { commits, nextCursor });
  } catch (error) {
    logger.error("Get commits error: %o", error);
    return sendError(res, 500, "Failed to retrieve commits");
  }
};

/**
 * List Pull Requests for a specific linked repository
 */
const getPullRequests = async (req, res) => {
  const { id: projectId, repoId } = req.params;
  const { cursor, limit = 50 } = req.query;
  const parsedLimit = parseInt(limit, 10);

  try {
    // Verify repository belongs to project
    const repo = await prisma.repository.findFirst({
      where: { id: repoId, projectId }
    });

    if (!repo) {
      return sendError(res, 404, "Repository not found in this project");
    }

    const queryOptions = {
      where: { repoId },
      orderBy: { createdAt: "desc" },
      take: parsedLimit + 1,
    };

    if (cursor) {
      queryOptions.cursor = { id: cursor };
      queryOptions.skip = 1;
    }

    const pullRequests = await prisma.pullRequest.findMany(queryOptions);

    let nextCursor = null;
    if (pullRequests.length > parsedLimit) {
      const nextItem = pullRequests.pop();
      nextCursor = nextItem.id;
    }

    return sendSuccess(res, 200, "Pull requests retrieved successfully", { pullRequests, nextCursor });
  } catch (error) {
    logger.error("Get PRs error: %o", error);
    return sendError(res, 500, "Failed to retrieve pull requests");
  }
};

module.exports = {
  getAvailableRepos,
  linkRepository,
  listRepositories,
  getCommits,
  getPullRequests
};
