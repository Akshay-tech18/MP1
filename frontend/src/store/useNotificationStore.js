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
    try {
      await client.patch(`/users/me/notifications/${id}/read`);
      set((state) => {
        const updated = state.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        );
        const unreadCount = updated.filter((n) => !n.read).length;
        return { notifications: updated, unreadCount };
      });
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  },

  /**
   * Mark all unread notifications as read
   */
  markAllAsRead: async () => {
    const { notifications, markAsRead } = get();
    const unread = notifications.filter((n) => !n.read);
    await Promise.allSettled(unread.map((n) => markAsRead(n.id)));
  },
}));

export default useNotificationStore;
