import { create } from "zustand";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5001/project";

const useSocketStore = create((set, get) => ({
  socket: null,
  connected: false,

  /**
   * Initialize socket connection to /project namespace
   */
  connectSocket: (accessToken) => {
    const { socket } = get();
    if (socket) return; // Connection already active

    const newSocket = io(SOCKET_URL, {
      auth: {
        token: `Bearer ${accessToken}`
      },
      transports: ["websocket"]
    });

    newSocket.on("connect", () => {
      set({ connected: true });
      console.log("WebSocket connected to /project namespace");
      
      // Auto-join project room if there is an active project
      const activeProjId = localStorage.getItem("devpilot_active_project_id");
      if (activeProjId) {
        newSocket.emit("join_project", { projectId: activeProjId });
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
   * Terminate socket connection
   */
  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
    }
    set({ socket: null, connected: false });
  }
}));

export default useSocketStore;
