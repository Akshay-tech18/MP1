const { Octokit } = require("@octokit/rest");
const prisma = require("../../config/db");
const { decrypt } = require("../../utils/crypto.utils");
const logger = require("../../utils/logger");

/**
 * Finds a valid decrypted GitHub token for a project or user
 */
async function resolveGitHubToken(requestingUserId, projectId) {
  // 1. Try requesting user's token
  if (requestingUserId) {
    const user = await prisma.user.findUnique({
      where: { id: requestingUserId },
      select: { githubToken: true }
    });
    if (user?.githubToken) {
      try {
        return decrypt(user.githubToken);
      } catch (e) {
        logger.warn("Failed to decrypt requesting user's github token: %s", e.message);
      }
    }
  }

  // 2. Try project owner's token
  if (projectId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        owner: { select: { githubToken: true } },
        members: {
          include: {
            user: { select: { githubToken: true } }
          }
        }
      }
    });

    if (project?.owner?.githubToken) {
      try {
        return decrypt(project.owner.githubToken);
      } catch (e) {
        logger.warn("Failed to decrypt project owner's github token: %s", e.message);
      }
    }

    // 3. Try any project member's token
    if (project?.members?.length > 0) {
      for (const m of project.members) {
        if (m.user?.githubToken) {
          try {
            return decrypt(m.user.githubToken);
          } catch (e) {
            // continue
          }
        }
      }
    }
  }

  // 4. Fallback: Any user in system with a github token (best-effort for shared spaces)
  const anyUser = await prisma.user.findFirst({
    where: { githubToken: { not: null } },
    select: { githubToken: true }
  });
  if (anyUser?.githubToken) {
    try {
      return decrypt(anyUser.githubToken);
    } catch (e) {
      logger.warn("Failed to decrypt system fallback github token: %s", e.message);
    }
  }

  return null;
}

/**
 * Syncs commits for a single repository from GitHub API into the database
 */
async function syncCommitsForRepository(repoId, requestingUserId = null) {
  try {
    const repo = await prisma.repository.findUnique({
      where: { id: repoId }
    });

    if (!repo) {
      logger.warn(`Cannot sync commits: Repository ${repoId} not found`);
      return { success: false, count: 0, error: "Repository not found" };
    }

    const token = await resolveGitHubToken(requestingUserId, repo.projectId);
    if (!token) {
      logger.warn(`Cannot sync commits for repo ${repo.name}: No GitHub token available in project`);
      return { success: false, count: 0, error: "No GitHub token available" };
    }

    // Parse owner and repo name
    let owner = repo.owner;
    let repoName = repo.name;
    if (repo.name.includes("/")) {
      const parts = repo.name.split("/");
      owner = parts[0];
      repoName = parts[1];
    }

    const octokit = new Octokit({ auth: token });
    logger.info(`Fetching commits from GitHub for ${owner}/${repoName}...`);

    let ghCommits = [];
    try {
      const response = await octokit.repos.listCommits({
        owner,
        repo: repoName,
        per_page: 100
      });
      ghCommits = response.data || [];
    } catch (apiErr) {
      logger.warn(`GitHub API listCommits failed for ${owner}/${repoName}: %s`, apiErr.message);
      return { success: false, count: 0, error: apiErr.message };
    }

    let upsertedCount = 0;
    for (const c of ghCommits) {
      try {
        const commitDate = new Date(
          c.commit?.author?.date || c.commit?.committer?.date || Date.now()
        );
        const author = c.commit?.author?.name || c.author?.login || "Unknown";
        const message = c.commit?.message || "Commit";

        await prisma.commit.upsert({
          where: {
            repoId_sha: {
              repoId: repo.id,
              sha: c.sha
            }
          },
          update: {
            message,
            authorName: author,
            committedAt: commitDate
          },
          create: {
            repoId: repo.id,
            sha: c.sha,
            message,
            authorName: author,
            committedAt: commitDate,
            filesChanged: []
          }
        });
        upsertedCount++;
      } catch (err) {
        logger.warn(`Failed to upsert commit ${c.sha} for repo ${repo.id}: %s`, err.message);
      }
    }

    logger.info(`Successfully synced ${upsertedCount} commits for ${owner}/${repoName}`);
    return { success: true, count: upsertedCount };
  } catch (error) {
    logger.error(`Error in syncCommitsForRepository for ${repoId}: %o`, error);
    return { success: false, count: 0, error: error.message };
  }
}

/**
 * Syncs commits for all repositories attached to a workspace/project
 */
async function syncCommitsForProject(projectId, requestingUserId = null) {
  try {
    const repos = await prisma.repository.findMany({
      where: { projectId },
      select: { id: true, name: true, owner: true }
    });

    if (!repos || repos.length === 0) {
      return { success: true, totalSynced: 0, message: "No repositories linked to this workspace" };
    }

    let totalSynced = 0;
    const results = await Promise.allSettled(
      repos.map(r => syncCommitsForRepository(r.id, requestingUserId))
    );

    for (const res of results) {
      if (res.status === "fulfilled" && res.value.success) {
        totalSynced += res.value.count || 0;
      }
    }

    logger.info(`Synced total of ${totalSynced} commits across ${repos.length} repos for project ${projectId}`);
    return { success: true, totalSynced, repoCount: repos.length };
  } catch (error) {
    logger.error(`Error syncing commits for project ${projectId}: %o`, error);
    return { success: false, totalSynced: 0, error: error.message };
  }
}

module.exports = {
  resolveGitHubToken,
  syncCommitsForRepository,
  syncCommitsForProject
};
