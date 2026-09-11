import { create } from "zustand";

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

  loadChannels: (projectId) => {
    const channels = loadChannelsFromStorage(projectId);
    set({ channels, currentProjectId: projectId });
  },

  setActiveChannelId: (channelId) => {
    set({ activeChannelId: channelId });
  },

  addChannel: (projectId, rawName, topic = "") => {
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
    return { success: true, channel: newChannel };
  },

  deleteChannel: (projectId, channelId) => {
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
  },
}));

export default useChannelStore;
