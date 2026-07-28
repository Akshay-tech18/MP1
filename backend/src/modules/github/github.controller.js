const crypto = require("crypto");
const { Octokit } = require("@octokit/rest");
const prisma = require("../../config/db");
const { decrypt } = require("../../utils/crypto.utils");
const { sendSuccess, sendError } = require("../../utils/response.utils");
const logger = require("../../utils/logger");

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
            githubRepoId: mockRepoId,
            name: repoName,
            owner,
            webhookSecret: "mock_webhook_secret_key_123",
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
    } catch (hookErr) {
      logger.error("GitHub Webhook creation failed: %o", hookErr);
      // If hook creation fails but repo exists, we can still link, or fail. Let's fail for safety in prod, 
      // but log a warning. If it's a conflict (hook already exists), we can proceed.
      if (hookErr.status !== 422) { // 422 is returned if webhook already exists
        return sendError(res, 500, `Failed to register webhook on GitHub: ${hookErr.message}`);
      }
    }

    // 5. Store Repo details in DB
    const dbRepo = await prisma.repository.create({
      data: {
        githubRepoId: repoDetails.id,
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

  try {
    // Verify repository belongs to project
    const repo = await prisma.repository.findFirst({
      where: { id: repoId, projectId }
    });

    if (!repo) {
      return sendError(res, 404, "Repository not found in this project");
    }

    const commits = await prisma.commit.findMany({
      where: { repoId },
      include: {
        task: { select: { id: true, taskNumber: true, title: true } }
      },
      orderBy: { committedAt: "desc" }
    });

    return sendSuccess(res, 200, "Commits retrieved successfully", { commits });
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

  try {
    // Verify repository belongs to project
    const repo = await prisma.repository.findFirst({
      where: { id: repoId, projectId }
    });

    if (!repo) {
      return sendError(res, 404, "Repository not found in this project");
    }

    const pullRequests = await prisma.pullRequest.findMany({
      where: { repoId },
      orderBy: { createdAt: "desc" }
    });

    return sendSuccess(res, 200, "Pull requests retrieved successfully", { pullRequests });
  } catch (error) {
    logger.error("Get PRs error: %o", error);
    return sendError(res, 500, "Failed to retrieve pull requests");
  }
};

module.exports = {
  linkRepository,
  listRepositories,
  getCommits,
  getPullRequests
};
