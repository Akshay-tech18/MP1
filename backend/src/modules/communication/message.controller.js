const prisma = require("../../config/db");
const { sendSuccess, sendError } = require("../../utils/response.utils");
const { SocketEvent } = require("../../config/constants");
const logger = require("../../utils/logger");

/**
 * Send a new chat message (Group or DM)
 */
const sendMessage = async (req, res) => {
  const projectId = req.params.id;
  const { content, isGroup, receiverId, fileUrl } = req.body;
  const senderId = req.user.id;

  try {
    // 1. Verify project membership
    const membership = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: senderId
        }
      }
    });

    if (!membership) {
      return sendError(res, 403, "Access denied. You are not a member of this project.");
    }

    // 2. If DM, verify receiver exists and belongs to the project
    if (isGroup === false) {
      if (!receiverId) {
        return sendError(res, 400, "Receiver ID is required for direct messages");
      }

      const receiverMembership = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId: receiverId
          }
        }
      });

      if (!receiverMembership) {
        return sendError(res, 400, "Receiver is not a member of this project");
      }
    }

    // 3. Create message in database
    const message = await prisma.message.create({
      data: {
        content,
        isGroup: isGroup !== undefined ? isGroup : true,
        projectId,
        senderId,
        receiverId: isGroup === false ? receiverId : null,
        fileUrl: fileUrl || null
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
        receiver: { select: { id: true, name: true, avatar: true } }
      }
    });

    // 4. Emit real-time event via Socket.IO
    const io = req.app.get("io");
    if (io) {
      if (message.isGroup) {
        // Group message: broadcast to all connected project members
        io.of("/project").to(projectId).emit(SocketEvent.CHAT_MESSAGE, message);
      } else {
        // Private Message (DM): emit to both sender's and receiver's private rooms
        io.of("/project").to(`user:${senderId}`).to(`user:${receiverId}`).emit(SocketEvent.CHAT_MESSAGE, message);
      }
    }

    return sendSuccess(res, 201, "Message sent successfully", { message });
  } catch (error) {
    logger.error("Send message error: %o", error);
    return sendError(res, 500, "Failed to send message");
  }
};

/**
 * Retrieve messages with cursor-based pagination
 */
const getMessages = async (req, res) => {
  const projectId = req.params.id;
  const { cursor, limit = 50, isGroup = "true", otherUserId } = req.query;
  const userId = req.user.id;

  const parsedLimit = parseInt(limit, 10);
  const parsedIsGroup = isGroup === "true";

  try {
    const filter = {
      projectId,
      isGroup: parsedIsGroup
    };

    if (parsedIsGroup) {
      // Group messages filter
      filter.receiverId = null;
    } else {
      // DM messages filter (conversation between req.user.id and otherUserId)
      if (!otherUserId) {
        return sendError(res, 400, "otherUserId is required to fetch direct messages");
      }
      filter.OR = [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId }
      ];
      // remove global projectId sender/receiver scope in case it interferes, 
      // but keeping projectId ensures it is scoped to the project workspace.
    }

    // Cursor pagination setup
    const query = {
      where: filter,
      take: parsedLimit,
      include: {
        sender: { select: { id: true, name: true, avatar: true } }
      },
      orderBy: { createdAt: "desc" } // get most recent first
    };

    if (cursor) {
      query.skip = 1; // Skip the cursor itself
      query.cursor = { id: cursor };
    }

    const messages = await prisma.message.findMany(query);

    // Determine next cursor
    const nextCursor = messages.length === parsedLimit ? messages[messages.length - 1].id : null;

    // Return chronological order for UI rendering
    const orderedMessages = messages.reverse();

    return sendSuccess(res, 200, "Messages retrieved", {
      messages: orderedMessages,
      nextCursor
    });
  } catch (error) {
    logger.error("Get messages error: %o", error);
    return sendError(res, 500, "Failed to retrieve messages");
  }
};

module.exports = {
  sendMessage,
  getMessages
};
