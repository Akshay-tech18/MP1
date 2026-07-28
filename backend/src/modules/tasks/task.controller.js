const prisma = require("../../config/db");
const { sendSuccess, sendError } = require("../../utils/response.utils");
const { SocketEvent, ActivityType } = require("../../config/constants");
const logger = require("../../utils/logger");

const emitToProject = (req, projectId, event, data) => {
  const io = req.app.get("io");
  if (io) {
    io.to(projectId).emit(event, data);
  }
};

/**
 * Create a new task in project
 */
const createTask = async (req, res) => {
  const projectId = req.params.id;
  const { title, description, priority, status, assigneeId, sprintId, dueDate } = req.body;
  const reporterId = req.user.id;

  const taskStatus = status || "TODO";

  try {
    // 1. Calculate orderIndex
    const taskCount = await prisma.task.count({
      where: { projectId, status: taskStatus }
    });
    const orderIndex = (taskCount + 1) * 1000.0;

    // 2. Create task
    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority: priority || "MEDIUM",
        status: taskStatus,
        orderIndex,
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId,
        sprintId: sprintId || null,
        reporterId,
        assigneeId: assigneeId || null
      },
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
        reporter: { select: { id: true, name: true, avatar: true } }
      }
    });

    // 3. Log Activity
    await prisma.activityLog.create({
      data: {
        actionType: ActivityType.TASK_CREATED,
        entityType: "TASK",
        entityId: task.id,
        metadata: { title: task.title, status: task.status },
        projectId,
        userId: reporterId
      }
    });

    // 4. Emit socket
    emitToProject(req, projectId, SocketEvent.TASK_CREATED, task);

    return sendSuccess(res, 201, "Task created successfully", { task });
  } catch (error) {
    logger.error("Task creation error: %o", error);
    return sendError(res, 500, "Failed to create task");
  }
};

/**
 * List all tasks in a project with optional query filters
 */
const listTasks = async (req, res) => {
  const projectId = req.params.id;
  const { sprintId, status, assigneeId } = req.query;

  try {
    const filter = { projectId };
    
    // Explicit null/backlog check or specific sprintId filtering
    if (sprintId === "null" || sprintId === "") {
      filter.sprintId = null;
    } else if (sprintId) {
      filter.sprintId = sprintId;
    }

    if (status) {
      filter.status = status;
    }

    if (assigneeId) {
      filter.assigneeId = assigneeId;
    }

    const tasks = await prisma.task.findMany({
      where: filter,
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
        reporter: { select: { id: true, name: true, avatar: true } },
        _count: { select: { comments: true, commits: true } }
      },
      orderBy: { orderIndex: "asc" }
    });

    return sendSuccess(res, 200, "Tasks retrieved successfully", { tasks });
  } catch (error) {
    logger.error("List tasks error: %o", error);
    return sendError(res, 500, "Failed to retrieve tasks");
  }
};

/**
 * Get details of a single task
 */
const getTask = async (req, res) => {
  const { id: projectId, taskId } = req.params;

  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        reporter: { select: { id: true, name: true, email: true, avatar: true } },
        comments: {
          include: {
            user: { select: { id: true, name: true, avatar: true } }
          },
          orderBy: { createdAt: "asc" }
        },
        commits: {
          select: {
            id: true,
            sha: true,
            message: true,
            authorName: true,
            committedAt: true,
            repository: { select: { name: true } }
          },
          orderBy: { committedAt: "desc" }
        }
      }
    });

    if (!task || task.projectId !== projectId) {
      return sendError(res, 404, "Task not found in this project");
    }

    return sendSuccess(res, 200, "Task details retrieved", { task });
  } catch (error) {
    logger.error("Get task error: %o", error);
    return sendError(res, 500, "Failed to retrieve task details");
  }
};

/**
 * Update task properties
 */
const updateTask = async (req, res) => {
  const { id: projectId, taskId } = req.params;
  const { title, description, priority, status, assigneeId, sprintId, dueDate } = req.body;

  try {
    // 1. Fetch current task state
    const currentTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: { assignee: true }
    });

    if (!currentTask || currentTask.projectId !== projectId) {
      return sendError(res, 404, "Task not found in this project");
    }

    const updates = {};
    const activities = [];

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (priority !== undefined) updates.priority = priority;
    if (dueDate !== undefined) updates.dueDate = dueDate ? new Date(dueDate) : null;
    if (sprintId !== undefined) updates.sprintId = sprintId || null;

    // Handle status change tracking
    if (status !== undefined && status !== currentTask.status) {
      updates.status = status;
      activities.push(
        prisma.activityLog.create({
          data: {
            actionType: ActivityType.TASK_STATUS_CHANGED,
            entityType: "TASK",
            entityId: taskId,
            metadata: { oldStatus: currentTask.status, newStatus: status, title: currentTask.title },
            projectId,
            userId: req.user.id
          }
        })
      );
    }

    // Handle assignee change tracking
    if (assigneeId !== undefined && assigneeId !== currentTask.assigneeId) {
      updates.assigneeId = assigneeId || null;
      let oldName = currentTask.assignee ? currentTask.assignee.name : "Unassigned";
      let newName = "Unassigned";

      if (assigneeId) {
        const newAssignee = await prisma.user.findUnique({ where: { id: assigneeId } });
        if (newAssignee) newName = newAssignee.name;
      }

      activities.push(
        prisma.activityLog.create({
          data: {
            actionType: ActivityType.TASK_ASSIGNEE_CHANGED,
            entityType: "TASK",
            entityId: taskId,
            metadata: { oldAssignee: oldName, newAssignee: newName, title: currentTask.title },
            projectId,
            userId: req.user.id
          }
        })
      );
    }

    // 2. Perform updates
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updates,
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
        reporter: { select: { id: true, name: true, avatar: true } }
      }
    });

    // Run activity logs
    if (activities.length > 0) {
      await Promise.all(activities);
    }

    // 3. Socket Emit
    emitToProject(req, projectId, SocketEvent.TASK_UPDATED, updatedTask);

    return sendSuccess(res, 200, "Task updated successfully", { task: updatedTask });
  } catch (error) {
    logger.error("Update task error: %o", error);
    return sendError(res, 500, "Failed to update task");
  }
};

/**
 * Delete task (Manager only)
 */
const deleteTask = async (req, res) => {
  const { id: projectId, taskId } = req.params;

  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task || task.projectId !== projectId) {
      return sendError(res, 404, "Task not found in this project");
    }

    await prisma.task.delete({
      where: { id: taskId }
    });

    // Socket Emit
    emitToProject(req, projectId, SocketEvent.TASK_DELETED, { id: taskId });

    return sendSuccess(res, 200, "Task deleted successfully");
  } catch (error) {
    logger.error("Delete task error: %o", error);
    return sendError(res, 500, "Failed to delete task");
  }
};

/**
 * Batch updates for reordering Kanban cards
 */
const reorderTasks = async (req, res) => {
  const projectId = req.params.id;
  const { updates } = req.body;

  try {
    // Perform reorder in a transaction
    await prisma.$transaction(
      updates.map((item) =>
        prisma.task.update({
          where: { id: item.id, projectId },
          data: {
            orderIndex: item.orderIndex,
            status: item.status || undefined
          }
        })
      )
    );

    // Emit event
    emitToProject(req, projectId, SocketEvent.TASK_REORDERED, { updates });

    return sendSuccess(res, 200, "Kanban board reordered successfully");
  } catch (error) {
    logger.error("Kanban reorder error: %o", error);
    return sendError(res, 500, "Failed to reorder tasks");
  }
};

/**
 * Add a comment to a task
 */
const addComment = async (req, res) => {
  const { id: projectId, taskId } = req.params;
  const { content } = req.body;
  const userId = req.user.id;

  try {
    // Check task exists
    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task || task.projectId !== projectId) {
      return sendError(res, 404, "Task not found in this project");
    }

    const comment = await prisma.taskComment.create({
      data: {
        content,
        taskId,
        userId
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } }
      }
    });

    // Socket Emit
    emitToProject(req, projectId, SocketEvent.TASK_COMMENT_ADDED, { taskId, comment });

    return sendSuccess(res, 201, "Comment added successfully", { comment });
  } catch (error) {
    logger.error("Add comment error: %o", error);
    return sendError(res, 500, "Failed to post comment");
  }
};

/**
 * Retrieve comments thread for a task
 */
const listComments = async (req, res) => {
  const { id: projectId, taskId } = req.params;

  try {
    // Check task exists
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, projectId: true }
    });

    if (!task || task.projectId !== projectId) {
      return sendError(res, 404, "Task not found in this project");
    }

    const comments = await prisma.taskComment.findMany({
      where: { taskId },
      include: {
        user: { select: { id: true, name: true, avatar: true } }
      },
      orderBy: { createdAt: "asc" }
    });

    return sendSuccess(res, 200, "Comments retrieved", { comments });
  } catch (error) {
    logger.error("List comments error: %o", error);
    return sendError(res, 500, "Failed to retrieve comments");
  }
};

module.exports = {
  createTask,
  listTasks,
  getTask,
  updateTask,
  deleteTask,
  reorderTasks,
  addComment,
  listComments
};
