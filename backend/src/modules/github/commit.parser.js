const prisma = require("../../config/db");
const { SocketEvent, ActivityType } = require("../../config/constants");
const logger = require("../../utils/logger");

const emitToProject = (req, projectId, event, data) => {
  const io = req.app.get("io");
  if (io) {
    io.of("/project").to(projectId).emit(event, data);
  }
};

/**
 * Parses a commit message for #TASK-N references and updates task states
 * @param {object} req - Express request object (to access Socket.IO)
 * @param {string} projectId - Project ID
 * @param {object} commitRecord - The database Commit record
 */
async function parseCommitForTasks(req, projectId, commitRecord) {
  const message = commitRecord.message;
  // Match patterns like #TASK-21 or TASK-21 (case insensitive)
  const regex = /#?(TASK-(\d+))/gi;
  const matches = [...message.matchAll(regex)];

  if (matches.length === 0) {
    return;
  }

  // Deduplicate matched task numbers
  const taskNumbers = [...new Set(matches.map(m => parseInt(m[2], 10)))];
  logger.info(`Parsed task references from commit ${commitRecord.sha}: ${taskNumbers.join(", ")}`);

  for (const taskNumber of taskNumbers) {
    try {
      // Find task in the database for this project
      const task = await prisma.task.findFirst({
        where: {
          projectId,
          taskNumber
        }
      });

      if (!task) {
        logger.warn(`Referenced task TASK-${taskNumber} not found in project ${projectId}`);
        continue;
      }

      // Link commit to task
      await prisma.commit.update({
        where: { id: commitRecord.id },
        data: { taskId: task.id }
      });

      // Update task status: move TODO or IN_PROGRESS to IN_REVIEW
      let statusUpdated = false;
      let oldStatus = task.status;
      let newStatus = task.status;

      if (task.status === "TODO" || task.status === "IN_PROGRESS") {
        newStatus = "IN_REVIEW";
        await prisma.task.update({
          where: { id: task.id },
          data: { status: newStatus }
        });
        statusUpdated = true;
      }

      // Log activity
      await prisma.activityLog.create({
        data: {
          actionType: ActivityType.COMMIT_LINKED,
          entityType: "TASK",
          entityId: task.id,
          metadata: {
            sha: commitRecord.sha,
            message: commitRecord.message,
            authorName: commitRecord.authorName,
            statusChanged: statusUpdated,
            oldStatus,
            newStatus
          },
          projectId,
          userId: commitRecord.taskId ? undefined : (await getProjectUserIdForCommit(projectId, commitRecord.authorName))
        }
      });

      // Emit socket notification
      if (statusUpdated) {
        const updatedTask = await prisma.task.findUnique({
          where: { id: task.id },
          include: {
            assignee: { select: { id: true, name: true, avatar: true } },
            reporter: { select: { id: true, name: true, avatar: true } }
          }
        });
        emitToProject(req, projectId, SocketEvent.TASK_UPDATED, updatedTask);
      } else {
        // Emit task commit association updated
        emitToProject(req, projectId, SocketEvent.TASK_UPDATED, {
          id: task.id,
          commitsCount: (await prisma.commit.count({ where: { taskId: task.id } }))
        });
      }
    } catch (err) {
      logger.error(`Error processing task update for TASK-${taskNumber}: %o`, err);
    }
  }
}

/**
 * Attempts to associate a git commit author name with a user in the project
 */
async function getProjectUserIdForCommit(projectId, authorName) {
  try {
    // Find member by name
    const member = await prisma.projectMember.findFirst({
      where: {
        projectId,
        user: { name: { contains: authorName, mode: "insensitive" } }
      },
      select: { userId: true }
    });
    
    if (member) return member.userId;

    // Fallback: get project owner
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true }
    });
    
    return project ? project.ownerId : null;
  } catch (e) {
    return null;
  }
}

/**
 * Check if a commit message indicates a bug fix
 */
function isBugFixCommit(message) {
  const bugKeywords = [/fix/i, /bug/i, /patch/i, /hotfix/i, /resolve/i, /issue/i, /close/i];
  return bugKeywords.some(pattern => pattern.test(message));
}

module.exports = {
  parseCommitForTasks,
  isBugFixCommit
};
