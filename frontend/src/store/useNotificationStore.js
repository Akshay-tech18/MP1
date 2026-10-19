import { create } from "zustand";
import client from "../api/client";

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  activeToast: null,

  /**
   * Fetch all notifications for the authenticated user
   */
  fetchNotifications: async () => {
    set({ loading: true });
    try {
      const res = await client.get("/users/me/notifications");
      if (res.data.success) {
        const notifications = res.data.data.notifications || [];
        const unreadCount = notifications.filter((n) => !n.read).length;
        set({ notifications, unreadCount });
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Add a notification from Socket.IO real-time event
   */
  addNotification: (notification) => {
    const notifObj = {
      id: notification.id || `notif-${Date.now()}`,
      title: notification.title || "Notification",
      message: notification.message || "",
      link: notification.link || null,
      read: false,
      createdAt: notification.createdAt || new Date().toISOString(),
    };

    set((state) => ({
      notifications: [notifObj, ...state.notifications],
      unreadCount: state.unreadCount + 1,
      activeToast: notifObj,
    }));
  },

  /**
   * Dismiss the currently displayed floating toast
   */
  dismissToast: () => {
    set({ activeToast: null });
  },

  /**
   * Mark an individual notification as read
   */
  markAsRead: async (id) => {
    // 1. Optimistic state update: mark as read immediately in UI
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      const unreadCount = updated.filter((n) => !n.read).length;
      return { notifications: updated, unreadCount };
    });

    // 2. Persist to backend if this is a persisted DB notification (not synthetic socket notif)
    if (id && !String(id).startsWith("notif-")) {
      try {
        await client.patch(`/users/me/notifications/${id}/read`);
      } catch (err) {
        console.error("Failed to mark notification as read on server:", err);
      }
    }
  },

  /**
   * Mark all unread notifications as read
   */
  markAllAsRead: async () => {
    // 1. Optimistic state update: immediately clear unread badge and mark all notifications read
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));

    // 2. Persist to backend via atomic bulk update endpoint
    try {
      await client.patch("/users/me/notifications/read-all");
    } catch (err) {
      console.error("Failed to mark all notifications as read on server:", err);
    }
  },
}));

export default useNotificationStore;
