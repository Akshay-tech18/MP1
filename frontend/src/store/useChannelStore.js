import { create } from "zustand";
import client from "../api/client";

const DEFAULT_CHANNELS = [
  { id: "general", name: "General", isDefault: true },
  { id: "engineering-sprints", name: "Engineering & Sprints", isDefault: false },
];

const getStorageKey = (projectId) => `devpilot_channels_${projectId || "global"}`;

const loadChannelsFromStorage = (projectId) => {
  try {
    const raw = localStorage.getItem(getStorageKey(projectId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure general channel is always present as default
        const hasGeneral = parsed.some((c) => c.id === "general");
        let merged = [...parsed];
        if (!hasGeneral) merged.unshift(DEFAULT_CHANNELS[0]);
        return merged;
      }
    }
  } catch (e) {
    console.error("Error loading channels from localStorage:", e);
  }
  return DEFAULT_CHANNELS;
};

const useChannelStore = create((set, get) => ({
  channels: DEFAULT_CHANNELS,
  activeChannelId: "general",
  currentProjectId: null,

  loadChannels: async (projectId) => {
    // 1. Instantly display cached channels
    const cached = loadChannelsFromStorage(projectId);
    set({ channels: cached, currentProjectId: projectId });

    // 2. Fetch fresh channels from backend database
    if (projectId) {
      try {
        const res = await client.get(`/projects/${projectId}/messages/channels`);
        if (res.data.success && Array.isArray(res.data.data.channels)) {
          const remoteChannels = res.data.data.channels;
          set({ channels: remoteChannels });
          try {
            localStorage.setItem(getStorageKey(projectId), JSON.stringify(remoteChannels));
          } catch (e) {}
        }
      } catch (err) {
        // Silently use cached channels if offline or backend is synchronizing
      }
    }
  },

  setActiveChannelId: (channelId) => {
    set({ activeChannelId: channelId });
  },

  addChannel: async (projectId, rawName, topic = "") => {
    const name = rawName.trim();
    if (!name) return { success: false, error: "Channel name cannot be empty" };

    const { channels } = get();
    // Check duplicate
    const exists = channels.some(
      (c) => c.name.toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      return { success: false, error: `Channel "${name}" already exists` };
    }

    const id =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || `channel-${Date.now()}`;

    const newChannel = {
      id,
      name,
      topic: topic.trim() || null,
      isDefault: false,
      createdAt: new Date().toISOString(),
    };

    const updatedChannels = [...channels, newChannel];
    try {
      localStorage.setItem(
        getStorageKey(projectId),
        JSON.stringify(updatedChannels)
      );
    } catch (e) {
      console.error("Error saving channels to storage:", e);
    }

    set({ channels: updatedChannels, activeChannelId: id });

    // Synchronize to backend database
    if (projectId) {
      try {
        await client.post(`/projects/${projectId}/messages/channels`, {
          name,
          topic
        });
      } catch (err) {
        console.warn("Could not sync channel to backend:", err);
      }
    }

    return { success: true, channel: newChannel };
  },

  deleteChannel: async (projectId, channelId) => {
    const { channels, activeChannelId } = get();
    const updated = channels.filter((c) => c.id !== channelId);
    try {
      localStorage.setItem(getStorageKey(projectId), JSON.stringify(updated));
    } catch (e) {
      console.error("Error deleting channel:", e);
    }

    const nextActive =
      activeChannelId === channelId ? "general" : activeChannelId;
    set({ channels: updated, activeChannelId: nextActive });

    if (projectId) {
      try {
        await client.delete(`/projects/${projectId}/messages/channels/${channelId}`);
      } catch (err) {
        console.warn("Could not delete channel on backend:", err);
      }
    }
  },

  handleChannelCreated: (newChannel) => {
    const { channels } = get();
    if (!channels.some((c) => c.id === newChannel.id)) {
      const updated = [...channels, newChannel];
      set({ channels: updated });
    }
  },

  handleChannelDeleted: (deletedChannelId) => {
    const { channels, activeChannelId } = get();
    const updated = channels.filter((c) => c.id !== deletedChannelId);
    const nextActive =
      activeChannelId === deletedChannelId ? "general" : activeChannelId;
    set({ channels: updated, activeChannelId: nextActive });
  }
}));

export default useChannelStore;
