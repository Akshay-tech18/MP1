const crypto = require("crypto");
const prisma = require("../../config/db");
const { sendSuccess, sendError } = require("../../utils/response.utils");
const { SocketEvent, ActivityType, ProjectRole } = require("../../config/constants");
const logger = require("../../utils/logger");

/**
 * Schedule a new meeting/ceremony (Standup, Sprint Planning, Retro, Architecture Review, Ad-Hoc)
 */
const scheduleMeeting = async (req, res) => {
  const projectId = req.params.id;
  const hostId = req.user.id;
  const {
    title,
    description,
    type = "STANDUP",
    startTime,
    endTime,
    recurrence = "NONE",
    channelId = "general",
    sprintId,
  } = req.body;

  try {
    if (sprintId) {
      const sprint = await prisma.sprint.findFirst({
        where: { id: sprintId, projectId }
      });
      if (!sprint) {
        return sendError(res, 400, "The specified sprint does not belong to this project");
      }
    }

    // Generate clean room identifier for WebRTC/Jitsi call
    const roomSlug = `devpilot-meet-${crypto.randomBytes(4).toString("hex")}`;

    // Create Meeting in DB
    const meeting = await prisma.meeting.create({
      data: {
        title: title.trim(),
        description: description ? description.trim() : null,
        type,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        recurrence,
        roomName: roomSlug,
        projectId,
        channelId: channelId || "general",
        sprintId: sprintId || null,
        hostId,
      },
      include: {
        host: {
          select: { id: true, name: true, avatar: true },
        },
        sprint: {
          select: { id: true, name: true },
        },
      },
    });

    const io = req.app.get("io");

    // Post an interactive Meeting Invite Card to the designated chat channel
    const targetChannel = channelId || "general";
    try {
      const invitePayload = {
        event: "MEETING_INVITE",
        meetingId: meeting.id,
        title: meeting.title,
        type: meeting.type,
        startTime: meeting.startTime.toISOString(),
        endTime: meeting.endTime.toISOString(),
        recurrence: meeting.recurrence,
        roomName: meeting.roomName,
        sprintId: meeting.sprintId,
        sprintName: meeting.sprint?.name || null,
        description: meeting.description,
      };

      const messageContent = `[MEETING_INVITE] ${JSON.stringify(invitePayload)}`;

      const meetingMessage = await prisma.message.create({
        data: {
          content: messageContent,
          isGroup: true,
          channelId: targetChannel,
          projectId,
          senderId: hostId,
        },
        include: {
          sender: { select: { id: true, name: true, avatar: true } },
          receiver: { select: { id: true, name: true, avatar: true } },
        },
      });

      if (io) {
        io.of("/project").to(projectId).emit(SocketEvent.CHAT_MESSAGE, meetingMessage);
      }
    } catch (msgErr) {
      logger.warn("Could not post meeting message to channel: %o", msgErr);
    }

    // Notify project members (excluding the host)
    try {
      const projectMembers = await prisma.projectMember.findMany({
        where: {
          projectId,
          userId: { not: hostId },
        },
        select: { userId: true },
      });

      if (projectMembers.length > 0) {
        const readableType = meeting.type.replace(/_/g, " ").toLowerCase();
        const notificationData = projectMembers.map((m) => ({
          userId: m.userId,
          title: `Meeting Scheduled: ${meeting.title}`,
          message: `${req.user.name} scheduled a ${readableType} meeting.`,
          link: "/board?view=calendar",
        }));

        await prisma.notification.createMany({
          data: notificationData,
        });
      }
    } catch (notifErr) {
      logger.warn("Could not dispatch meeting notifications: %o", notifErr);
    }

    // Record in Activity Log
    try {
      await prisma.activityLog.create({
        data: {
          actionType: ActivityType.MEETING_SCHEDULED,
          entityType: "MEETING",
          entityId: meeting.id,
          metadata: {
            title: meeting.title,
            type: meeting.type,
            startTime: meeting.startTime,
            endTime: meeting.endTime,
            roomName: meeting.roomName,
          },
          projectId,
          userId: hostId,
        },
      });
    } catch (actErr) {
      logger.warn("Could not write meeting activity log: %o", actErr);
    }

    // Broadcast meeting:scheduled event
    if (io) {
      io.of("/project").to(projectId).emit(SocketEvent.MEETING_SCHEDULED, meeting);
    }

    return sendSuccess(res, 201, "Meeting scheduled successfully", { meeting });
  } catch (error) {
    logger.error("Schedule meeting error: %o", error);
    return sendError(res, 500, "Failed to schedule meeting");
  }
};

/**
 * List meetings for a project with optional filters
 */
const listMeetings = async (req, res) => {
  const projectId = req.params.id;
  const { sprintId, type, upcoming, startDate, endDate } = req.query;

  try {
    const whereClause = { projectId };

    if (sprintId) {
      whereClause.sprintId = sprintId;
    }

    if (type) {
      whereClause.type = type;
    }

    if (upcoming === "true") {
      whereClause.endTime = {
        gte: new Date(),
      };
    }

    if (startDate || endDate) {
      const timeFilter = {};
      if (startDate) {
        const parsedStart = new Date(startDate);
        if (!isNaN(parsedStart.getTime())) {
          timeFilter.gte = parsedStart;
        }
      }
      if (endDate) {
        const parsedEnd = new Date(endDate);
        if (!isNaN(parsedEnd.getTime())) {
          timeFilter.lte = parsedEnd;
        }
      }
      if (Object.keys(timeFilter).length > 0) {
        whereClause.startTime = timeFilter;
      }
    }

    const meetings = await prisma.meeting.findMany({
      where: whereClause,
      include: {
        host: {
          select: { id: true, name: true, avatar: true },
        },
        sprint: {
          select: { id: true, name: true },
        },
      },
      orderBy: {
        startTime: "asc",
      },
    });

    return sendSuccess(res, 200, "Meetings retrieved successfully", { meetings });
  } catch (error) {
    logger.error("List meetings error: %o", error);
    return sendError(res, 500, "Failed to retrieve meetings");
  }
};

/**
 * Get single meeting details
 */
const getMeeting = async (req, res) => {
  const { id: projectId, meetingId } = req.params;

  try {
    const meeting = await prisma.meeting.findFirst({
      where: {
        id: meetingId,
        projectId,
      },
      include: {
        host: {
          select: { id: true, name: true, avatar: true },
        },
        sprint: {
          select: { id: true, name: true },
        },
      },
    });

    if (!meeting) {
      return sendError(res, 404, "Meeting not found");
    }

    return sendSuccess(res, 200, "Meeting retrieved successfully", { meeting });
  } catch (error) {
    logger.error("Get meeting error: %o", error);
    return sendError(res, 500, "Failed to retrieve meeting");
  }
};

/**
 * Update meeting details
 */
const updateMeeting = async (req, res) => {
  const { id: projectId, meetingId } = req.params;
  const userId = req.user.id;

  try {
    const existing = await prisma.meeting.findFirst({
      where: {
        id: meetingId,
        projectId,
      },
    });

    if (!existing) {
      return sendError(res, 404, "Meeting not found");
    }

    // Only host, project manager, or workspace owner can update meeting
    const membership = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId },
      },
    });

    const isHost = existing.hostId === userId;
    const isOwner = req.isProjectOwner || req.user.role === "ADMIN";
    const isManager = isOwner || (membership && membership.role === ProjectRole.MANAGER);

    if (!isHost && !isManager) {
      return sendError(res, 403, "Only the meeting host, project manager, or owner can update this meeting");
    }

    const {
      title,
      description,
      type,
      startTime,
      endTime,
      recurrence,
      channelId,
      sprintId,
    } = req.body;

    const dataToUpdate = {};
    if (title !== undefined) dataToUpdate.title = title.trim();
    if (description !== undefined) dataToUpdate.description = description ? description.trim() : null;
    if (type !== undefined) dataToUpdate.type = type;
    if (startTime !== undefined) dataToUpdate.startTime = new Date(startTime);
    if (endTime !== undefined) dataToUpdate.endTime = new Date(endTime);
    if (recurrence !== undefined) dataToUpdate.recurrence = recurrence;
    if (channelId !== undefined) dataToUpdate.channelId = channelId;
    if (sprintId !== undefined) {
      if (sprintId) {
        const sprint = await prisma.sprint.findFirst({
          where: { id: sprintId, projectId }
        });
        if (!sprint) {
          return sendError(res, 400, "The specified sprint does not belong to this project");
        }
      }
      dataToUpdate.sprintId = sprintId || null;
    }

    const updated = await prisma.meeting.update({
      where: { id: meetingId },
      data: dataToUpdate,
      include: {
        host: {
          select: { id: true, name: true, avatar: true },
        },
        sprint: {
          select: { id: true, name: true },
        },
      },
    });

    const io = req.app.get("io");
    if (io) {
      io.of("/project").to(projectId).emit(SocketEvent.MEETING_UPDATED, updated);
    }

    return sendSuccess(res, 200, "Meeting updated successfully", { meeting: updated });
  } catch (error) {
    logger.error("Update meeting error: %o", error);
    return sendError(res, 500, "Failed to update meeting");
  }
};

/**
 * Delete / Cancel a meeting
 */
const deleteMeeting = async (req, res) => {
  const { id: projectId, meetingId } = req.params;
  const userId = req.user.id;

  try {
    const existing = await prisma.meeting.findFirst({
      where: {
        id: meetingId,
        projectId,
      },
    });

    if (!existing) {
      return sendError(res, 404, "Meeting not found");
    }

    const membership = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId },
      },
    });

    const isHost = existing.hostId === userId;
    const isOwner = req.isProjectOwner || req.user.role === "ADMIN";
    const isManager = isOwner || (membership && membership.role === ProjectRole.MANAGER);

    if (!isHost && !isManager) {
      return sendError(res, 403, "Only the meeting host, project manager, or owner can cancel this meeting");
    }

    await prisma.meeting.delete({
      where: { id: meetingId },
    });

    // Record Activity Log
    try {
      await prisma.activityLog.create({
        data: {
          actionType: ActivityType.MEETING_CANCELLED,
          entityType: "MEETING",
          entityId: meetingId,
          metadata: {
            title: existing.title,
            type: existing.type,
          },
          projectId,
          userId,
        },
      });
    } catch (actErr) {
      logger.warn("Could not write meeting cancellation activity log: %o", actErr);
    }

    const io = req.app.get("io");
    if (io) {
      io.of("/project").to(projectId).emit(SocketEvent.MEETING_CANCELLED, { meetingId });
    }

    return sendSuccess(res, 200, "Meeting cancelled successfully", { meetingId });
  } catch (error) {
    logger.error("Delete meeting error: %o", error);
    return sendError(res, 500, "Failed to cancel meeting");
  }
};

module.exports = {
  scheduleMeeting,
  listMeetings,
  getMeeting,
  updateMeeting,
  deleteMeeting,
};
