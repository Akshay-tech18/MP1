const prisma = require("../../config/db");
const { sendSuccess, sendError } = require("../../utils/response.utils");
const logger = require("../../utils/logger");

const SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  avatar: true,
  role: true,
  createdAt: true
};

/**
 * Update current user's profile details
 */
const updateMe = async (req, res) => {
  const { name, avatar } = req.body;

  try {
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name: name || undefined,
        avatar: avatar || undefined
      },
      select: SAFE_SELECT
    });

    return sendSuccess(res, 200, "Profile updated successfully", { user: updatedUser });
  } catch (error) {
    logger.error("Update profile error: %o", error);
    return sendError(res, 500, "Failed to update profile");
  }
};

/**
 * Search users by name or email (for project additions)
 */
const searchUsers = async (req, res) => {
  const { q } = req.query;

  if (!q || q.trim() === "") {
    return sendSuccess(res, 200, "Empty query result", { users: [] });
  }

  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } }
        ]
      },
      select: SAFE_SELECT,
      take: 10
    });

    return sendSuccess(res, 200, "Users found", { users });
  } catch (error) {
    logger.error("User search error: %o", error);
    return sendError(res, 500, "Failed to search users");
  }
};

/**
 * Retrieve personal statistics for current user
 */
const getMeStats = async (req, res) => {
  const userId = req.user.id;

  try {
    // 1. Total tasks assigned
    const totalTasks = await prisma.task.count({
      where: { assigneeId: userId }
    });

    // 2. Tasks completed
    const completedTasks = await prisma.task.count({
      where: {
        assigneeId: userId,
        status: "COMPLETED"
      }
    });

    // 3. Comments posted
    const commentsCount = await prisma.taskComment.count({
      where: { userId }
    });

    // 4. Projects user belongs to
    const projectsCount = await prisma.projectMember.count({
      where: { userId }
    });

    // Calculate completion rate
    const completionRate = totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0;

    const stats = {
      totalTasksAssigned: totalTasks,
      tasksCompleted: completedTasks,
      completionRate,
      commentsPosted: commentsCount,
      projectsCount
    };

    return sendSuccess(res, 200, "User stats retrieved", { stats });
  } catch (error) {
    logger.error("User stats aggregation error: %o", error);
    return sendError(res, 500, "Failed to aggregate statistics");
  }
};

/**
 * Change system role of a user (Admin only)
 */
const changeSystemRole = async (req, res) => {
  const targetUserId = req.params.id;
  const { role } = req.body;

  // Admin cannot change their own system role
  if (targetUserId === req.user.id) {
    return sendError(res, 400, "Operation not allowed. You cannot change your own system-level role.");
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { role },
      select: SAFE_SELECT
    });

    return sendSuccess(res, 200, `User role changed to ${role} successfully`, { user: updatedUser });
  } catch (error) {
    logger.error("Role change error: %o", error);
    return sendError(res, 500, "Failed to update user role. User may not exist.");
  }
};

/**
 * Get user notifications
 */
const getNotifications = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      take: 50 // Limit to recent notifications
    });
    return sendSuccess(res, 200, "Notifications retrieved", { notifications });
  } catch (error) {
    logger.error("Get notifications error: %o", error);
    return sendError(res, 500, "Failed to retrieve notifications");
  }
};

/**
 * Mark a notification as read
 */
const markNotificationRead = async (req, res) => {
  const { id } = req.params;
  try {
    const notification = await prisma.notification.updateMany({
      where: { id, userId: req.user.id },
      data: { read: true }
    });

    if (notification.count === 0) {
      return sendError(res, 404, "Notification not found or unauthorized");
    }

    return sendSuccess(res, 200, "Notification marked as read");
  } catch (error) {
    logger.error("Mark notification read error: %o", error);
    return sendError(res, 500, "Failed to mark notification as read");
  }
};

module.exports = {
  updateMe,
  searchUsers,
  getMeStats,
  changeSystemRole,
  getNotifications,
  markNotificationRead,
  SAFE_SELECT
};
