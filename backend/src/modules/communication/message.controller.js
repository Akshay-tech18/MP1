const prisma = require("../../config/db");
const { sendSuccess, sendError } = require("../../utils/response.utils");
const { SocketEvent } = require("../../config/constants");
const logger = require("../../utils/logger");

/**
 * Send a new chat message (Group or DM)
 */
const sendMessage = async (req, res) => {
  const projectId = req.params.id;
  const { content, isGroup, receiverId, fileUrl, channelId } = req.body;
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

    const targetChannelId = isGroup !== false ? (channelId || "general") : null;

    // 3. Create message in database
    const message = await prisma.message.create({
      data: {
        content: content || "",
        isGroup: isGroup !== undefined ? isGroup : true,
        channelId: targetChannelId,
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
  const { cursor, limit = 50, isGroup = "true", otherUserId, channelId } = req.query;
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
      const targetChannel = channelId || "general";
      if (targetChannel === "general") {
        // Legacy messages without channelId or general
        filter.OR = [
          { channelId: "general" },
          { channelId: null }
        ];
      } else {
        filter.channelId = targetChannel;
      }
    } else {
      // DM messages filter (conversation between req.user.id and otherUserId)
      if (!otherUserId) {
        return sendError(res, 400, "otherUserId is required to fetch direct messages");
      }
      filter.OR = [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId }
      ];
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

const DEFAULT_CHANNELS = [
  { id: "general", name: "General", topic: "Workspace-wide discussions", isDefault: true },
  { id: "engineering-sprints", name: "Engineering & Sprints", topic: "Sprint planning and dev sync", isDefault: false }
];

/**
 * Retrieve all group channels for a project
 */
const getChannels = async (req, res) => {
  const projectId = req.params.projectId || req.params.id;
  try {
    let channels = [...DEFAULT_CHANNELS];

    // Discover active channels from messages
    const activeChannelMessages = await prisma.message.findMany({
      where: {
        projectId,
        isGroup: true,
        channelId: { not: null }
      },
      select: { channelId: true },
      distinct: ["channelId"]
    });

    for (const m of activeChannelMessages) {
      if (m.channelId && !channels.some(c => c.id === m.channelId)) {
        const formattedName = m.channelId
          .split("-")
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        channels.push({
          id: m.channelId,
          name: formattedName,
          isDefault: false
        });
      }
    }

    return sendSuccess(res, 200, "Channels retrieved successfully", { channels });
  } catch (error) {
    logger.error("Get channels error: %o", error);
    return sendError(res, 500, "Failed to retrieve channels");
  }
};

/**
 * Create a new channel and broadcast to team
 */
const createChannel = async (req, res) => {
  const projectId = req.params.projectId || req.params.id;
  const { name, topic } = req.body;

  if (!name || !name.trim()) {
    return sendError(res, 400, "Channel name is required");
  }

  const trimmedName = name.trim();
  const slug = trimmedName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || `channel-${Date.now()}`;

  try {
    const newChannel = {
      id: slug,
      name: trimmedName,
      topic: topic ? topic.trim() : null,
      isDefault: false,
      createdAt: new Date().toISOString()
    };

    // Persist an initial channel creation message so getChannels permanently discovers it across refreshes
    await prisma.message.create({
      data: {
        content: `Created channel #${trimmedName}${topic ? `: ${topic}` : ""}`,
        isGroup: true,
        channelId: slug,
        projectId,
        senderId: req.user.id
      }
    });

    // Emit real-time event to all connected project members
    const io = req.app.get("io");
    if (io) {
      io.of("/project").to(projectId).emit("channel:created", newChannel);
    }

    return sendSuccess(res, 201, "Channel created successfully", { channel: newChannel });
  } catch (error) {
    logger.error("Create channel error: %o", error);
    return sendError(res, 500, "Failed to create channel: " + error.message);
  }
};

/**
 * Delete all messages in a channel (called when a channel is deleted)
 */
const deleteChannelMessages = async (req, res) => {
  const projectId = req.params.projectId || req.params.id;
  const { channelId } = req.params;

  try {
    if (!channelId || channelId === "general") {
      return sendError(res, 400, "Cannot delete default general channel messages");
    }

    await prisma.message.deleteMany({
      where: {
        projectId,
        isGroup: true,
        channelId
      }
    });

    const io = req.app.get("io");
    if (io) {
      io.of("/project").to(projectId).emit("channel:deleted", { channelId });
    }

    return sendSuccess(res, 200, "Channel messages deleted successfully");
  } catch (error) {
    logger.error("Delete channel messages error: %o", error);
    return sendError(res, 500, "Failed to delete channel messages");
  }
};

module.exports = {
  sendMessage,
  getMessages,
  getChannels,
  createChannel,
  deleteChannelMessages
};
