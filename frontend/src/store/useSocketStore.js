import { create } from "zustand";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5001/project";

const useSocketStore = create((set, get) => ({
  socket: null,
  connected: false,
  activeProjectId: null,

  /**
   * Initialize socket connection to /project namespace
   */
  connectSocket: (accessToken) => {
    const { socket } = get();
    if (socket) return; // Connection already active

    const authPayload = {};
    if (accessToken) {
      authPayload.token = accessToken.startsWith("Bearer ") ? accessToken : `Bearer ${accessToken}`;
    }

    const newSocket = io(SOCKET_URL, {
      auth: authPayload,
      withCredentials: true,
      transports: ["websocket", "polling"]
    });

    newSocket.on("connect", () => {
      set({ connected: true });
      console.log("WebSocket connected to /project namespace");
      
      // Auto-join project room if activeProjectId is set or from localStorage
      const activeProjId = get().activeProjectId || localStorage.getItem("devpilot_active_project_id");
      if (activeProjId) {
        newSocket.emit("join_project", { projectId: activeProjId });
        set({ activeProjectId: activeProjId });
      }
    });

    newSocket.on("disconnect", () => {
      set({ connected: false });
      console.log("WebSocket disconnected");
    });

    newSocket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
    });

    set({ socket: newSocket });
  },

  /**
   * Switch active project room dynamically
   */
  switchProjectRoom: (newProjectId) => {
    const { socket, activeProjectId, connected } = get();
    if (!socket || !connected) {
      set({ activeProjectId: newProjectId || null });
      return;
    }

    if (activeProjectId && activeProjectId !== newProjectId) {
      socket.emit("leave_project", { projectId: activeProjectId });
      console.log(`Left project room: ${activeProjectId}`);
    }

    if (newProjectId && newProjectId !== activeProjectId) {
      socket.emit("join_project", { projectId: newProjectId });
      console.log(`Joined project room: ${newProjectId}`);
    }

    set({ activeProjectId: newProjectId || null });
  },

  /**
   * Terminate socket connection
   */
  disconnectSocket: () => {
    const { socket, activeProjectId } = get();
    if (socket) {
      if (activeProjectId) {
        socket.emit("leave_project", { projectId: activeProjectId });
      }
      socket.disconnect();
    }
    set({ socket: null, connected: false, activeProjectId: null });
  }
}));

export default useSocketStore;
