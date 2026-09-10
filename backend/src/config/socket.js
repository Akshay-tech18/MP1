const { Server } = require("socket.io");
const { verifyAccessToken } = require("../utils/jwt.utils");
const { SocketEvent } = require("./constants");
const registerChatEvents = require("../modules/communication/chat.socket");
const logger = require("../utils/logger");
const prisma = require("./db");

/**
 * Initialize Socket.IO Server on the HTTP Server
 * @param {import("http").Server} httpServer - Express HTTP server
 * @returns {Server} socketIoServer
 */
function initSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Setup /project namespace
  const projectNamespace = io.of("/project");

  // JWT Handshake Verification Middleware
  projectNamespace.use((socket, next) => {
    let token = socket.handshake.auth.token;

    // Remove Bearer prefix if present
    if (token && token.startsWith("Bearer ")) {
      token = token.slice(7);
    }

    if (!token) {
      logger.warn("Socket connection rejected: Token missing on handshake");
      return next(new Error("Authentication error: Token missing"));
    }

    try {
      const decoded = verifyAccessToken(token);
      socket.user = decoded; // Attach user to socket
      next();
    } catch (err) {
      logger.warn(`Socket connection rejected: Invalid token: ${err.message}`);
      return next(new Error("Authentication error: Token invalid"));
    }
  });

  // Namespace Connection Event
  projectNamespace.on("connection", (socket) => {
    logger.info(`User connected to Socket.IO Namespace /project: ${socket.user.name || socket.user.email} (ID: ${socket.user.id})`);

    // Setup private user-specific room for DMs
    socket.join(`user:${socket.user.id}`);

    // Join Project Room
    socket.on(SocketEvent.JOIN_PROJECT, async (data) => {
      const { projectId } = data;
      if (!projectId) return;

      try {
        const member = await prisma.projectMember.findUnique({
          where: {
            projectId_userId: { projectId, userId: socket.user.id }
          }
        });

        if (!member) {
          logger.warn(`Unauthorized attempt by user ${socket.user.id} to join project ${projectId}`);
          socket.emit("error", { message: "Unauthorized to join this project room." });
          return;
        }

        socket.join(projectId);
        logger.info(`Socket ${socket.id} joined project room: ${projectId}`);
      } catch (err) {
        logger.error(`Error joining project room: %o`, err);
      }
    });

    // Leave Project Room
    socket.on(SocketEvent.LEAVE_PROJECT, (data) => {
      const { projectId } = data;
      if (!projectId) return;

      socket.leave(projectId);
      logger.info(`Socket ${socket.id} left project room: ${projectId}`);
    });

    // Register Chat & Collaboration Event Listeners
    registerChatEvents(projectNamespace, socket);

    // Disconnect
    socket.on("disconnect", () => {
      logger.info(`User disconnected from /project namespace: ${socket.user.email}`);
      
      // Let other members in rooms know this user went offline
      // We broadcast user:offline to all rooms this socket belonged to
      const rooms = Array.from(socket.rooms);
      rooms.forEach((roomId) => {
        if (roomId !== socket.id && !roomId.startsWith("user:")) {
          socket.to(roomId).emit(SocketEvent.USER_OFFLINE, { userId: socket.user.id });
        }
      });
    });
  });

  return io;
}

module.exports = {
  initSocketServer
};
