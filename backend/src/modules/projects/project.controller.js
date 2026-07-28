const prisma = require("../../config/db");
const { sendSuccess, sendError } = require("../../utils/response.utils");
const { TaskPriorityWeight, SocketEvent, ActivityType } = require("../../config/constants");
const logger = require("../../utils/logger");

/**
 * Helper to emit socket events
 */
const emitToProject = (req, projectId, event, data) => {
  const io = req.app.get("io");
  if (io) {
    io.to(projectId).emit(event, data);
  }
};

/**
 * Create a new project and add creator as MANAGER
 */
const createProject = async (req, res) => {
  const { name, description, status } = req.body;
  const ownerId = req.user.id;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the project
      const project = await tx.project.create({
        data: {
          name,
          description,
          status: status || "PLANNING",
          ownerId
        }
      });

      // 2. Add owner as a project member with role MANAGER
      await tx.projectMember.create({
        data: {
          projectId: project.id,
          userId: ownerId,
          role: "MANAGER"
        }
      });

      return project;
    });

    return sendSuccess(res, 201, "Project created successfully", { project: result });
  } catch (error) {
    logger.error("Project creation error: %o", error);
    return sendError(res, 500, "Failed to create project");
  }
};

/**
 * List all projects the user is affiliated with
 */
const listProjects = async (req, res) => {
  const userId = req.user.id;

  try {
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } }
        ]
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        _count: {
          select: { members: true, tasks: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return sendSuccess(res, 200, "Projects retrieved", { projects });
  } catch (error) {
    logger.error("List projects error: %o", error);
    return sendError(res, 500, "Failed to retrieve projects");
  }
};

/**
 * Get project details by ID
 */
const getProject = async (req, res) => {
  const projectId = req.params.id;

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } }
          }
        },
        repositories: {
          select: { id: true, name: true, owner: true, createdAt: true }
        }
      }
    });

    if (!project) {
      return sendError(res, 404, "Project not found");
    }

    return sendSuccess(res, 200, "Project retrieved successfully", { project });
  } catch (error) {
    logger.error("Get project error: %o", error);
    return sendError(res, 500, "Failed to retrieve project details");
  }
};

/**
 * Update project details (Manager only)
 */
const updateProject = async (req, res) => {
  const projectId = req.params.id;
  const { name, description, status } = req.body;

  try {
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        name: name || undefined,
        description: description !== undefined ? description : undefined,
        status: status || undefined
      }
    });

    // Create activity log
    await prisma.activityLog.create({
      data: {
        actionType: ActivityType.PROJECT_UPDATED,
        entityType: "PROJECT",
        entityId: projectId,
        metadata: { changes: req.body },
        projectId,
        userId: req.user.id
      }
    });

    // Broadcast change
    emitToProject(req, projectId, SocketEvent.PROJECT_UPDATED, updatedProject);

    return sendSuccess(res, 200, "Project updated successfully", { project: updatedProject });
  } catch (error) {
    logger.error("Update project error: %o", error);
    return sendError(res, 500, "Failed to update project");
  }
};

/**
 * Delete project (Owner or System Admin only)
 */
const deleteProject = async (req, res) => {
  const projectId = req.params.id;

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true }
    });

    if (!project) {
      return sendError(res, 404, "Project not found");
    }

    // Allow if project owner or system ADMIN
    if (project.ownerId !== req.user.id && req.user.role !== "ADMIN") {
      return sendError(res, 403, "Access denied. Only the project owner can delete a project.");
    }

    await prisma.project.delete({
      where: { id: projectId }
    });

    // Notify connected project members
    emitToProject(req, projectId, SocketEvent.PROJECT_UPDATED, { id: projectId, deleted: true });

    return sendSuccess(res, 200, "Project and all associated data deleted successfully");
  } catch (error) {
    logger.error("Delete project error: %o", error);
    return sendError(res, 500, "Failed to delete project");
  }
};

/**
 * Add a member to a project
 */
const addMember = async (req, res) => {
  const projectId = req.params.id;
  const { userId, role } = req.body;

  try {
    // Check if target user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, avatar: true }
    });

    if (!user) {
      return sendError(res, 404, "Target user not found");
    }

    // Add or update project membership
    const member = await prisma.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId,
          userId
        }
      },
      update: { role },
      create: {
        projectId,
        userId,
        role
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } }
      }
    });

    // Create activity log
    await prisma.activityLog.create({
      data: {
        actionType: ActivityType.MEMBER_ADDED,
        entityType: "MEMBER",
        entityId: userId,
        metadata: { name: user.name, role },
        projectId,
        userId: req.user.id
      }
    });

    // Broadcast change
    emitToProject(req, projectId, SocketEvent.MEMBER_ADDED, member);

    return sendSuccess(res, 200, `${user.name} added to project as ${role}`, { member });
  } catch (error) {
    logger.error("Add project member error: %o", error);
    return sendError(res, 500, "Failed to add project member");
  }
};

/**
 * Remove a member from a project
 */
const removeMember = async (req, res) => {
  const projectId = req.params.id;
  const targetUserId = req.params.userId;

  try {
    // 1. Verify owner is not being removed
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true }
    });

    if (project.ownerId === targetUserId) {
      return sendError(res, 400, "The project owner cannot be removed from the project.");
    }

    // Get user details for logging
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { name: true }
    });

    // Delete membership
    await prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUserId
        }
      }
    });

    // Create activity log
    await prisma.activityLog.create({
      data: {
        actionType: ActivityType.MEMBER_REMOVED,
        entityType: "MEMBER",
        entityId: targetUserId,
        metadata: { name: user ? user.name : "Unknown user" },
        projectId,
        userId: req.user.id
      }
    });

    // Broadcast change
    emitToProject(req, projectId, SocketEvent.MEMBER_REMOVED, { userId: targetUserId });

    return sendSuccess(res, 200, "Member removed from project successfully");
  } catch (error) {
    logger.error("Remove project member error: %o", error);
    return sendError(res, 500, "Failed to remove member. They may not be in the project.");
  }
};

/**
 * Calculate project progress based on task priority weights
 */
const getProgress = async (req, res) => {
  const projectId = req.params.id;

  try {
    const tasks = await prisma.task.findMany({
      where: { projectId },
      select: { status: true, priority: true }
    });

    if (tasks.length === 0) {
      return sendSuccess(res, 200, "Project progress is 0% (no tasks)", { progress: 0 });
    }

    let totalWeight = 0;
    let completedWeight = 0;

    tasks.forEach(task => {
      const weight = TaskPriorityWeight[task.priority] || 1;
      totalWeight += weight;
      if (task.status === "COMPLETED") {
        completedWeight += weight;
      }
    });

    const progress = totalWeight > 0
      ? Math.round((completedWeight / totalWeight) * 100)
      : 0;

    return sendSuccess(res, 200, "Project progress calculated", { progress });
  } catch (error) {
    logger.error("Project progress calculation error: %o", error);
    return sendError(res, 500, "Failed to calculate project progress");
  }
};

module.exports = {
  createProject,
  listProjects,
  getProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
  getProgress
};
