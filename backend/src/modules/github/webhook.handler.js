const prisma = require("../../config/db");
const { SocketEvent, PullRequestState } = require("../../config/constants");
const { parseCommitForTasks } = require("./commit.parser");
const logger = require("../../utils/logger");

const emitToProject = (req, projectId, event, data) => {
  const io = req.app.get("io");
  if (io) {
    io.of("/project").to(projectId).emit(event, data);
  }
};

/**
 * Handle incoming verified GitHub webhooks
 */
async function handleGitHubWebhook(req, res) {
  const event = req.headers["x-github-event"];
  const payload = req.gitHubPayload; // parsed in verifyGitHubWebhook middleware
  const repo = req.linkedRepo;       // fetched in verifyGitHubWebhook middleware

  logger.info(`Received GitHub Webhook event: ${event} for repo: ${payload.repository.full_name}`);

  try {
    if (event === "push") {
      await handlePushEvent(req, repo, payload);
    } else if (event === "pull_request") {
      await handlePullRequestEvent(req, repo, payload);
    } else {
      logger.info(`Ignored GitHub Webhook event type: ${event}`);
    }

    return res.status(200).json({ success: true, message: "Webhook processed successfully" });
  } catch (error) {
    logger.error("Error processing GitHub Webhook event: %o", error);
    return res.status(500).json({ success: false, message: "Error processing webhook event" });
  }
}

/**
 * Process a git push event (commits and file changes)
 */
async function handlePushEvent(req, repo, payload) {
  const commits = payload.commits || [];
  
  if (commits.length === 0) return;

  const processedCommits = [];

  for (const commit of commits) {
    // Collect unique files changed
    const added = commit.added || [];
    const modified = commit.modified || [];
    const removed = commit.removed || [];
    const filesChanged = [...new Set([...added, ...modified, ...removed])];

    const authorName = commit.author ? commit.author.name : "Unknown Author";
    const committedAt = commit.timestamp ? new Date(commit.timestamp) : new Date();

    // Upsert Commit
    const commitRecord = await prisma.commit.upsert({
      where: {
        repoId_sha: {
          repoId: repo.id,
          sha: commit.id
        }
      },
      update: {
        message: commit.message,
        authorName,
        filesChanged,
        committedAt
      },
      create: {
        sha: commit.id,
        message: commit.message,
        authorName,
        filesChanged,
        committedAt,
        repoId: repo.id
      }
    });

    // Parse commit message for task references
    await parseCommitForTasks(req, repo.projectId, commitRecord);
    processedCommits.push(commitRecord);
  }

  // Emit event to project room
  emitToProject(req, repo.projectId, SocketEvent.GITHUB_COMMIT, {
    repoId: repo.id,
    repoName: payload.repository.full_name,
    commits: processedCommits.map(c => ({
      sha: c.sha,
      message: c.message,
      authorName: c.authorName,
      committedAt: c.committedAt
    }))
  });
}

/**
 * Process a pull request event (open, close, merge)
 */
async function handlePullRequestEvent(req, repo, payload) {
  const pr = payload.pull_request;
  const action = payload.action; // opened, closed, merged, reopened

  if (!pr) return;

  // Determine state
  let prState = PullRequestState.OPEN;
  if (pr.merged === true) {
    prState = PullRequestState.MERGED;
  } else if (pr.state === "closed") {
    prState = PullRequestState.CLOSED;
  }

  const mergedAt = pr.merged_at ? new Date(pr.merged_at) : null;

  // Upsert PR record
  const prRecord = await prisma.pullRequest.upsert({
    where: {
      repoId_githubPrNumber: {
        repoId: repo.id,
        githubPrNumber: pr.number
      }
    },
    update: {
      title: pr.title,
      state: prState,
      mergedAt
    },
    create: {
      githubPrNumber: pr.number,
      title: pr.title,
      state: prState,
      mergedAt,
      repoId: repo.id
    }
  });

  // Emit event to project room
  emitToProject(req, repo.projectId, SocketEvent.GITHUB_PULL_REQUEST, {
    repoId: repo.id,
    prId: prRecord.id,
    number: prRecord.githubPrNumber,
    title: prRecord.title,
    state: prRecord.state,
    action
  });
}

module.exports = {
  handleGitHubWebhook
};
