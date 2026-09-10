const prisma = require("../../config/db");
const { sendSuccess, sendError } = require("../../utils/response.utils");
const { SocketEvent, ActivityType } = require("../../config/constants");
const logger = require("../../utils/logger");

const emitToProject = (req, projectId, event, data) => {
  const io = req.app.get("io");
  if (io) {
    io.of("/project").to(projectId).emit(event, data);
  }
};

/**
 * Create a new sprint in project
 */
const createSprint = async (req, res) => {
  const projectId = req.params.id;
  const { name, goal, startDate, endDate } = req.body;

  try {
    const sprint = await prisma.sprint.create({
      data: {
        name,
        goal,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        projectId,
        status: "PLANNED"
      }
    });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        actionType: ActivityType.SPRINT_CREATED,
        entityType: "SPRINT",
        entityId: sprint.id,
        metadata: { name: sprint.name },
        projectId,
        userId: req.user.id
      }
    });

    // Socket Emit
    emitToProject(req, projectId, SocketEvent.SPRINT_CREATED, sprint);

    return sendSuccess(res, 201, "Sprint created successfully", { sprint });
  } catch (error) {
    logger.error("Sprint creation error: %o", error);
    return sendError(res, 500, "Failed to create sprint");
  }
};

/**
 * List all sprints in a project
 */
const listSprints = async (req, res) => {
  const projectId = req.params.id;

  try {
    const sprints = await prisma.sprint.findMany({
      where: { projectId },
      include: {
        _count: { select: { tasks: true } }
      },
      orderBy: { createdAt: "asc" }
    });

    return sendSuccess(res, 200, "Sprints retrieved", { sprints });
  } catch (error) {
    logger.error("List sprints error: %o", error);
    return sendError(res, 500, "Failed to retrieve sprints");
  }
};

/**
 * Get sprint details by ID with tasks
 */
const getSprint = async (req, res) => {
  const { id: projectId, sprintId } = req.params;

  try {
    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      include: {
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, avatar: true } },
            reporter: { select: { id: true, name: true, avatar: true } }
          },
          orderBy: { orderIndex: "asc" }
        }
      }
    });

    if (!sprint || sprint.projectId !== projectId) {
      return sendError(res, 404, "Sprint not found in this project");
    }

    return sendSuccess(res, 200, "Sprint details retrieved", { sprint });
  } catch (error) {
    logger.error("Get sprint error: %o", error);
    return sendError(res, 500, "Failed to retrieve sprint details");
  }
};

/**
 * Update sprint details
 */
const updateSprint = async (req, res) => {
  const { id: projectId, sprintId } = req.params;
  const { name, goal, status, startDate, endDate } = req.body;

  try {
    // 1. Verify sprint exists
    const existingSprint = await prisma.sprint.findUnique({
      where: { id: sprintId }
    });

    if (!existingSprint || existingSprint.projectId !== projectId) {
      return sendError(res, 404, "Sprint not found in this project");
    }

    // 2. Concurrency rule: only one ACTIVE sprint per project
    if (status === "ACTIVE" && existingSprint.status !== "ACTIVE") {
      const activeSprint = await prisma.sprint.findFirst({
        where: { projectId, status: "ACTIVE" }
      });

      if (activeSprint) {
        return sendError(
          res,
          400,
          `Cannot activate sprint. Another sprint "${activeSprint.name}" is currently ACTIVE. Complete or cancel it first.`
        );
      }
    }

    // 3. Update
    const updatedSprint = await prisma.sprint.update({
      where: { id: sprintId },
      data: {
        name: name || undefined,
        goal: goal !== undefined ? goal : undefined,
        status: status || undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined
      }
    });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        actionType: ActivityType.SPRINT_UPDATED,
        entityType: "SPRINT",
        entityId: sprintId,
        metadata: { changes: req.body },
        projectId,
        userId: req.user.id
      }
    });

    // Socket Emit
    emitToProject(req, projectId, SocketEvent.SPRINT_UPDATED, updatedSprint);

    return sendSuccess(res, 200, "Sprint updated successfully", { sprint: updatedSprint });
  } catch (error) {
    logger.error("Update sprint error: %o", error);
    return sendError(res, 500, "Failed to update sprint");
  }
};

/**
 * Complete a sprint and move unfinished tasks to backlog
 */
const completeSprint = async (req, res) => {
  const { id: projectId, sprintId } = req.params;

  try {
    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId }
    });

    if (!sprint || sprint.projectId !== projectId) {
      return sendError(res, 404, "Sprint not found in this project");
    }

    if (sprint.status === "COMPLETED") {
      return sendError(res, 400, "Sprint is already completed");
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Mark sprint as COMPLETED
      const completedSprint = await tx.sprint.update({
        where: { id: sprintId },
        data: { status: "COMPLETED" }
      });

      // 2. Find completed tasks count
      const completedTasksCount = await tx.task.count({
        where: { sprintId, status: "COMPLETED" }
      });

      // 3. Find unfinished tasks
      const unfinishedTasks = await tx.task.findMany({
        where: {
          sprintId,
          status: { not: "COMPLETED" }
        },
        select: { id: true }
      });

      const unfinishedTaskIds = unfinishedTasks.map(t => t.id);

      // 4. Move unfinished tasks to project backlog (sprintId = null)
      if (unfinishedTaskIds.length > 0) {
        await tx.task.updateMany({
          where: { id: { in: unfinishedTaskIds } },
          data: { sprintId: null }
        });
      }

      // 5. Create activity log
      await tx.activityLog.create({
        data: {
          actionType: ActivityType.SPRINT_COMPLETED,
          entityType: "SPRINT",
          entityId: sprintId,
          metadata: {
            name: sprint.name,
            completedTasks: completedTasksCount,
            movedToBacklog: unfinishedTaskIds.length
          },
          projectId,
          userId: req.user.id
        }
      });

      return {
        sprint: completedSprint,
        completedCount: completedTasksCount,
        backlogCount: unfinishedTaskIds.length
      };
    });

    // Socket Emit
    emitToProject(req, projectId, SocketEvent.SPRINT_COMPLETED, {
      sprintId,
      ...result
    });

    return sendSuccess(res, 200, "Sprint completed successfully", result);
  } catch (error) {
    logger.error("Complete sprint error: %o", error);
    return sendError(res, 500, "Failed to complete sprint");
  }
};

/**
 * Move tasks from backlog or other sprints into this sprint
 */
const moveTasksToSprint = async (req, res) => {
  const { id: projectId, sprintId } = req.params;
  const { taskIds } = req.body;

  try {
    // Check sprint exists
    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId }
    });

    if (!sprint || sprint.projectId !== projectId) {
      return sendError(res, 404, "Sprint not found in this project");
    }

    // Perform updates
    await prisma.task.updateMany({
      where: {
        id: { in: taskIds },
        projectId
      },
      data: { sprintId }
    });

    // Fetch updated tasks for emitting
    const updatedTasks = await prisma.task.findMany({
      where: { id: { in: taskIds } },
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
        reporter: { select: { id: true, name: true, avatar: true } }
      }
    });

    // Notify rooms
    emitToProject(req, projectId, SocketEvent.SPRINT_UPDATED, {
      sprintId,
      updatedTasks
    });

    return sendSuccess(res, 200, `${taskIds.length} tasks moved to sprint "${sprint.name}"`, { tasks: updatedTasks });
  } catch (error) {
    logger.error("Move tasks to sprint error: %o", error);
    return sendError(res, 500, "Failed to move tasks to sprint");
  }
};

/**
 * Delete a sprint, migrating its tasks safely to the backlog
 */
const deleteSprint = async (req, res) => {
  const { id: projectId, sprintId } = req.params;

  try {
    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId }
    });

    if (!sprint || sprint.projectId !== projectId) {
      return sendError(res, 404, "Sprint not found in this project");
    }

    await prisma.$transaction(async (tx) => {
      // 1. Move tasks to backlog
      await tx.task.updateMany({
        where: { sprintId },
        data: { sprintId: null }
      });

      // 2. Delete sprint
      await tx.sprint.delete({
        where: { id: sprintId }
      });
    });

    // Notify project
    emitToProject(req, projectId, SocketEvent.SPRINT_UPDATED, {
      sprintId,
      deleted: true
    });

    return sendSuccess(res, 200, "Sprint deleted, tasks moved to backlog");
  } catch (error) {
    logger.error("Delete sprint error: %o", error);
    return sendError(res, 500, "Failed to delete sprint");
  }
};

module.exports = {
  createSprint,
  listSprints,
  getSprint,
  updateSprint,
  completeSprint,
  moveTasksToSprint,
  deleteSprint
};
