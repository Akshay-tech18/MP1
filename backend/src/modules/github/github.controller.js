const crypto = require("crypto");
const { Octokit } = require("@octokit/rest");
const prisma = require("../../config/db");
const { encrypt, decrypt } = require("../../utils/crypto.utils");
const { sendSuccess, sendError } = require("../../utils/response.utils");
const { PullRequestState } = require("../../config/constants");
const { parseCommitForTasks } = require("./commit.parser");
const logger = require("../../utils/logger");
const { syncCommitsForRepository } = require("./github.service");

/**
 * Get GitHub connection status for the authenticated user
 */
const getGitHubStatus = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { githubToken: true, githubId: true }
    });

    if (!user || !user.githubToken) {
      return sendSuccess(res, 200, "GitHub not connected", {
        connected: false
      });
    }

    try {
      const decryptedToken = decrypt(user.githubToken);
      const octokit = new Octokit({ auth: decryptedToken });
      const { data: ghUser } = await octokit.users.getAuthenticated();

      return sendSuccess(res, 200, "GitHub connected", {
        connected: true,
        user: {
          id: ghUser.id,
          username: ghUser.login,
          name: ghUser.name || ghUser.login,
          avatarUrl: ghUser.avatar_url,
          profileUrl: ghUser.html_url,
          publicRepos: ghUser.public_repos,
          totalPrivateRepos: ghUser.total_private_repos || 0
        }
      });
    } catch (apiErr) {
      logger.warn("Stored GitHub token is invalid or revoked: %s", apiErr.message);
      return sendSuccess(res, 200, "GitHub token expired or revoked", {
        connected: false,
        error: "GitHub token has expired or was revoked. Please reconnect."
      });
    }
  } catch (error) {
    logger.error("Error getting GitHub status: %o", error);
    return sendError(res, 500, "Failed to check GitHub connection status");
  }
};

/**
 * Connect GitHub account using Personal Access Token (PAT)
 */
const connectGitHubToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== "string" || !token.trim()) {
      return sendError(res, 400, "GitHub Personal Access Token is required");
    }

    const cleanToken = token.trim();
    const octokit = new Octokit({ auth: cleanToken });

    // Validate token with GitHub
    let ghUser;
    try {
      const resp = await octokit.users.getAuthenticated();
      ghUser = resp.data;
    } catch (err) {
      return sendError(res, 401, "Invalid GitHub token. Please ensure the token is active and includes 'repo' scope.");
    }

    // Encrypt and store token
    const encryptedToken = encrypt(cleanToken);
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        githubId: String(ghUser.id),
        githubToken: encryptedToken
      }
    });

    return sendSuccess(res, 200, `Successfully connected to GitHub as @${ghUser.login}`, {
      connected: true,
      user: {
        id: ghUser.id,
        username: ghUser.login,
        name: ghUser.name || ghUser.login,
        avatarUrl: ghUser.avatar_url,
        profileUrl: ghUser.html_url
      }
    });
  } catch (error) {
    logger.error("Error connecting GitHub token: %o", error);
    return sendError(res, 500, "Failed to connect GitHub token: " + error.message);
  }
};

/**
 * Disconnect GitHub account
 */
const disconnectGitHub = async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        githubToken: null,
        githubId: null
      }
    });

    return sendSuccess(res, 200, "GitHub disconnected successfully", {
      connected: false
    });
  } catch (error) {
    logger.error("Error disconnecting GitHub: %o", error);
    return sendError(res, 500, "Failed to disconnect GitHub account");
  }
};

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
      return sendError(res, 400, "Please connect your GitHub account to access repositories.", {
        connected: false,
        repositories: []
      });
    }

    const decryptedToken = decrypt(user.githubToken);
    const octokit = new Octokit({ auth: decryptedToken });

    // Fetch user repos (all repos user has access to)
    const response = await octokit.repos.listForAuthenticatedUser({
      visibility: "all",
      affiliation: "owner,collaborator,organization_member",
      sort: "updated",
      per_page: 100
    });

    // Check which repos are already linked to projects
    const linkedRepos = await prisma.repository.findMany({
      select: { githubRepoId: true, name: true, projectId: true }
    });
    const linkedRepoMap = new Map(linkedRepos.map((r) => [r.name.toLowerCase(), r]));

    const availableRepos = response.data.map((repo) => {
      const isLinked = linkedRepoMap.has(repo.full_name.toLowerCase());
      const linkedInfo = linkedRepoMap.get(repo.full_name.toLowerCase());

      return {
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name, // e.g. "owner/repo"
        owner: repo.owner?.login || "",
        ownerAvatar: repo.owner?.avatar_url || "",
        private: repo.private,
        url: repo.html_url,
        description: repo.description || "No description provided",
        updatedAt: repo.updated_at,
        stars: repo.stargazers_count || 0,
        language: repo.language || "Code",
        defaultBranch: repo.default_branch || "main",
        isLinked,
        linkedProjectId: linkedInfo?.projectId || null
      };
    });

    return sendSuccess(res, 200, "Available repositories retrieved", {
      connected: true,
      repositories: availableRepos,
      repos: availableRepos
    });
  } catch (error) {
    logger.error("Get available repos error: %o", error);
    return sendError(res, 500, "Failed to retrieve repositories from GitHub: " + error.message);
  }
};

/**
 * Link a GitHub repository to a project, register webhook
 */
const linkRepository = async (req, res) => {
  const projectId = req.params.id;
  const { repoName } = req.body || {};
  let targetRepoName = repoName ? String(repoName).trim() : "";
  if (!targetRepoName) {
    return sendError(res, 400, "Repository name is required");
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
        const [owner, repo] = targetRepoName.includes("/") ? targetRepoName.split("/") : ["dev", targetRepoName];
        
        const dbRepo = await prisma.repository.create({
          data: {
            githubRepoId: String(mockRepoId),
            name: targetRepoName,
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
    const octokit = new Octokit({ auth: decryptedToken });

    // Auto-resolve owner if not present in targetRepoName
    let owner = "";
    let repo = "";
    if (!targetRepoName.includes("/")) {
      try {
        const { data: ghUser } = await octokit.users.getAuthenticated();
        owner = ghUser.login;
        repo = targetRepoName;
        targetRepoName = `${owner}/${repo}`;
      } catch (e) {
        return sendError(res, 400, "Could not determine repository owner. Format must be 'owner/repo'");
      }
    } else {
      [owner, repo] = targetRepoName.split("/");
    }
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

    // 5. Store or update Repo details in DB
    const existingRepo = await prisma.repository.findUnique({
      where: { githubRepoId: String(repoDetails.id) }
    });

    let dbRepo;
    if (existingRepo) {
      dbRepo = await prisma.repository.update({
        where: { id: existingRepo.id },
        data: {
          projectId,
          name: targetRepoName,
          owner,
          webhookSecret
        }
      });
    } else {
      dbRepo = await prisma.repository.create({
        data: {
          githubRepoId: String(repoDetails.id),
          name: targetRepoName,
          owner,
          webhookSecret,
          projectId
        }
      });
    }

    // Immediately trigger initial commit sync in background
    syncCommitsForRepository(dbRepo.id, req.user.id).catch((err) => {
      logger.warn("Initial commit sync failed for %s: %s", targetRepoName, err.message);
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
        repository: { select: { id: true, name: true, owner: true } },
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
 * List commits across all repositories in a project
 */
const getAllProjectCommits = async (req, res) => {
  const { id: projectId } = req.params;
  const { limit = 100 } = req.query;
  const parsedLimit = parseInt(limit, 10);

  try {
    const repos = await prisma.repository.findMany({
      where: { projectId },
      select: { id: true, name: true, owner: true }
    });
    const repoIds = repos.map(r => r.id);

    const commits = await prisma.commit.findMany({
      where: { repoId: { in: repoIds } },
      include: {
        repository: { select: { id: true, name: true, owner: true } },
        task: { select: { id: true, taskNumber: true, title: true } }
      },
      orderBy: { committedAt: "desc" },
      take: parsedLimit
    });

    return sendSuccess(res, 200, "All project commits retrieved", { commits });
  } catch (error) {
    logger.error("Get all project commits error: %o", error);
    return sendError(res, 500, "Failed to retrieve project commits");
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

/**
 * Unlink a repository from a workspace
 */
const unlinkRepository = async (req, res) => {
  const { id: projectId, repoId } = req.params;

  try {
    const repo = await prisma.repository.findFirst({
      where: { id: repoId, projectId }
    });

    if (!repo) {
      return sendError(res, 404, "Repository not found in this workspace");
    }

    await prisma.repository.delete({
      where: { id: repo.id }
    });

    logger.info(`Repository '${repo.name}' unlinked from workspace '${projectId}'`);
    return sendSuccess(res, 200, `Repository ${repo.name} unlinked from workspace`);
  } catch (error) {
    logger.error("Unlink repository error: %o", error);
    return sendError(res, 500, "Failed to unlink repository: " + error.message);
  }
};

/**
 * Trigger on-demand sync for a repository in a workspace
 */
const triggerSyncCommits = async (req, res) => {
  const { id: projectId, repoId } = req.params;

  try {
    const repo = await prisma.repository.findFirst({
      where: { id: repoId, projectId }
    });

    if (!repo) {
      return sendError(res, 404, "Repository not found in this workspace");
    }

    const result = await syncCommitsForRepository(repo.id, req.user.id);
    if (!result.success && result.error) {
      return sendError(res, 400, result.error);
    }

    return sendSuccess(res, 200, `Successfully synced ${result.count || 0} commits`, result);
  } catch (error) {
    logger.error("Sync repository commits error: %o", error);
    return sendError(res, 500, "Failed to sync commits: " + error.message);
  }
};

module.exports = {
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
  syncRepositoryCommits,
  syncCommitsHelper
};
