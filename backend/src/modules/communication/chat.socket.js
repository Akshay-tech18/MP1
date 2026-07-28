const { SocketEvent } = require("../../config/constants");
const logger = require("../../utils/logger");

/**
 * Register chat-specific real-time socket events
 * @param {import("socket.io").Server} io - Socket.IO server
 * @param {import("socket.io").Socket} socket - Socket instance
 */
module.exports = (io, socket) => {
  
  // 1. Ephemeral Typing Indicator
  socket.on(SocketEvent.CHAT_TYPING, (data) => {
    // data: { projectId, isTyping: boolean }
    const { projectId, isTyping } = data;
    
    if (!projectId) return;

    // Broadcast to everyone else in the project room
    socket.to(projectId).emit(SocketEvent.CHAT_TYPING, {
      userId: socket.user.id,
      isTyping
    });
  });

  // 2. Kanban Task Card editing lock: User opened edit modal
  socket.on(SocketEvent.TASK_EDITING, (data) => {
    // data: { projectId, taskId }
    const { projectId, taskId } = data;

    if (!projectId || !taskId) return;

    socket.to(projectId).emit(SocketEvent.TASK_EDITING, {
      userId: socket.user.id,
      userName: socket.user.name,
      taskId
    });
  });

  // 3. Kanban Task Card editing lock release: User closed/saved edit modal
  socket.on(SocketEvent.TASK_EDITING_DONE, (data) => {
    // data: { projectId, taskId }
    const { projectId, taskId } = data;

    if (!projectId || !taskId) return;

    socket.to(projectId).emit(SocketEvent.TASK_EDITING_DONE, {
      userId: socket.user.id,
      taskId
    });
  });
};
