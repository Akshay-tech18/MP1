const crypto = require("crypto");
const { Octokit } = require("@octokit/rest");
const prisma = require("../../config/db");
const { decrypt } = require("../../utils/crypto.utils");
const { sendSuccess, sendError } = require("../../utils/response.utils");
const { PullRequestState } = require("../../config/constants");
const { parseCommitForTasks } = require("./commit.parser");
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

    // 6. Automatically sync initial commits from GitHub
    try {
      await syncCommitsHelper(octokit, dbRepo, req);
    } catch (syncErr) {
      logger.warn("Initial commit sync warning: %s", syncErr.message);
    }

    return sendSuccess(res, 201, "Repository linked and commits synced successfully", { repository: dbRepo });
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
 * Helper to sync commits and PRs from GitHub REST API
 */
async function syncCommitsHelper(octokit, repo, req = null) {
  const [owner, repoName] = repo.name.split("/");
  logger.info(`Starting GitHub commit sync for ${repo.name}...`);

  let commitsData = [];
  try {
    const commitsRes = await octokit.repos.listCommits({
      owner,
      repo: repoName,
      per_page: 100
    });
    commitsData = commitsRes.data || [];
  } catch (err) {
    logger.warn(`Could not list commits from GitHub for ${repo.name}: %s`, err.message);
    return [];
  }

  const processedCommits = [];
  for (const item of commitsData) {
    const sha = item.sha;
    const message = item.commit?.message || "No commit message";
    const authorName = item.commit?.author?.name || item.author?.login || item.commit?.committer?.name || "Unknown Author";
    const rawDate = item.commit?.author?.date || item.commit?.committer?.date;
    const committedAt = rawDate ? new Date(rawDate) : new Date();

    let filesChanged = [];
    try {
      const detail = await octokit.repos.getCommit({
        owner,
        repo: repoName,
        ref: sha
      });
      filesChanged = (detail.data.files || []).map(f => f.filename);
    } catch (err) {
      filesChanged = [];
    }

    const commitRecord = await prisma.commit.upsert({
      where: {
        repoId_sha: { repoId: repo.id, sha }
      },
      update: {
        message,
        authorName,
        filesChanged,
        committedAt
      },
      create: {
        sha,
        message,
        authorName,
        filesChanged,
        committedAt,
        repoId: repo.id
      }
    });

    try {
      await parseCommitForTasks(req, repo.projectId, commitRecord);
    } catch (parseErr) {
      logger.warn("Parse commit task reference warning: %s", parseErr.message);
    }
    processedCommits.push(commitRecord);
  }

  // Also sync Pull Requests
  try {
    const prsRes = await octokit.pulls.list({
      owner,
      repo: repoName,
      state: "all",
      per_page: 30
    });

    for (const pr of prsRes.data || []) {
      let prState = PullRequestState.OPEN;
      if (pr.merged_at) {
        prState = PullRequestState.MERGED;
      } else if (pr.state === "closed") {
        prState = PullRequestState.CLOSED;
      }

      await prisma.pullRequest.upsert({
        where: {
          repoId_githubPrNumber: { repoId: repo.id, githubPrNumber: pr.number }
        },
        update: {
          title: pr.title,
          state: prState,
          mergedAt: pr.merged_at ? new Date(pr.merged_at) : null
        },
        create: {
          githubPrNumber: pr.number,
          title: pr.title,
          state: prState,
          mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
          repoId: repo.id
        }
      });
    }
  } catch (prErr) {
    logger.warn(`Could not sync PRs for ${repo.name}: %s`, prErr.message);
  }

  logger.info(`Successfully synced ${processedCommits.length} commits for ${repo.name}`);
  return processedCommits;
}

/**
 * Controller to manually trigger commit and PR sync for a repository
 */
const syncRepositoryCommits = async (req, res) => {
  const { id: projectId, repoId } = req.params;

  try {
    const repo = await prisma.repository.findFirst({
      where: { id: repoId, projectId },
      include: {
        project: {
          include: {
            owner: { select: { githubToken: true } },
            members: {
              include: { user: { select: { githubToken: true } } }
            }
          }
        }
      }
    });

    if (!repo) {
      return sendError(res, 404, "Repository not found in this project");
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { githubToken: true }
    });

    const tokenEncrypted = currentUser?.githubToken || repo.project.owner?.githubToken ||
      repo.project.members.find(m => m.user?.githubToken)?.user?.githubToken;

    if (!tokenEncrypted) {
      return sendError(res, 400, "Please connect your GitHub account to sync repositories.");
    }

    const decryptedToken = decrypt(tokenEncrypted);
    const octokit = new Octokit({ auth: decryptedToken });

    const syncedCommits = await syncCommitsHelper(octokit, repo, req);

    return sendSuccess(res, 200, `Successfully synced ${syncedCommits.length} commit(s) from GitHub`, {
      syncedCount: syncedCommits.length,
      commits: syncedCommits
    });
  } catch (error) {
    logger.error("Sync repository commits error: %o", error);
    return sendError(res, 500, `Failed to sync commits: ${error.message}`);
  }
};

module.exports = {
  getAvailableRepos,
  linkRepository,
  listRepositories,
  getCommits,
  getAllProjectCommits,
  getPullRequests,
  syncRepositoryCommits,
  syncCommitsHelper
};
