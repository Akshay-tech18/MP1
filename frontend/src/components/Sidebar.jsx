import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";
import useChannelStore from "../store/useChannelStore";
import client from "../api/client";
import CreateWorkspaceModal from "./CreateWorkspaceModal";
import VideoMeetingModal from "./VideoMeetingModal";
import Avatar from "./Avatar";
import {
  Inbox,
  Plus,
  Phone,
  User,
  MoreHorizontal,
  Hash,
  Sparkles,
  X,
  AlertCircle,
  AlertTriangle,
  Trash2,
} from "lucide-react";

export default function Sidebar({ isOpen }) {
  const navigate = useNavigate();
  const { currentProject, user } = useAuthStore();
  const {
    channels,
    loadChannels,
    addChannel,
    deleteChannel,
    setActiveChannelId,
  } = useChannelStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelTopic, setNewChannelTopic] = useState("");
  const [channelError, setChannelError] = useState("");

  const [channelToDelete, setChannelToDelete] = useState(null);
  const [isDeletingChannel, setIsDeletingChannel] = useState(false);
  const [members, setMembers] = useState([]);

  const workspaceName = currentProject?.name || "Team Workspace";
  const initial = workspaceName.charAt(0).toUpperCase();

  // Synchronize channels when active project changes
  useEffect(() => {
    loadChannels(currentProject?.id);
  }, [currentProject?.id, loadChannels]);

  // Fetch project members for Direct Messages
  useEffect(() => {
    async function loadMembers() {
      if (!currentProject) {
        setMembers([]);
        return;
      }
      try {
        const res = await client.get(`/projects/${currentProject.id}`);
        if (res.data.success) {
          const list = (res.data.data.project?.members || []).filter(
            (m) => m.userId !== user?.id
          );
          setMembers(list);
        }
      } catch (e) {
        console.error("Failed to load members in sidebar:", e);
      }
    }
    loadMembers();
  }, [currentProject?.id, user?.id]);

  const handleCreateChannel = (e) => {
    e.preventDefault();
    if (!newChannelName.trim()) {
      setChannelError("Channel name cannot be empty");
      return;
    }

    const res = addChannel(currentProject?.id, newChannelName, newChannelTopic);
    if (res.success) {
      setShowCreateChannelModal(false);
      setNewChannelName("");
      setNewChannelTopic("");
      setChannelError("");
      navigate(`/chat?channel=${encodeURIComponent(res.channel.id)}`);
    } else {
      setChannelError(res.error);
    }
  };

  const handleConfirmDeleteChannel = async () => {
    if (!channelToDelete || !currentProject) return;
    setIsDeletingChannel(true);
    try {
      await client
        .delete(`/projects/${currentProject.id}/messages/channels/${channelToDelete.id}`)
        .catch((err) => console.warn("Failed to delete channel messages on backend:", err));

      deleteChannel(currentProject?.id, channelToDelete.id);
      navigate("/chat?channel=general");
    } catch (err) {
      console.error("Failed to delete channel:", err);
    } finally {
      setIsDeletingChannel(false);
      setChannelToDelete(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 264, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="w-[264px] dark:bg-[#080808] bg-[#f8fafc] border-r dark:border-white/[0.08] border-slate-200 flex flex-col h-full overflow-hidden select-none flex-shrink-0 relative z-20 dark:text-slate-200 text-slate-700 transition-colors duration-200"
        >
          {/* 1. Header Toolbar */}
          <div className="px-3.5 py-3 border-b dark:border-white/[0.06] border-slate-200 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="text-nav-primary font-bold dark:text-white text-slate-900 flex items-center gap-1.5 tracking-tight">
                <span>Home</span>
                <Inbox className="w-4 h-4 text-slate-400" />
              </span>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg dark:bg-white bg-slate-900 dark:text-slate-900 text-white hover:opacity-90 text-btn-refined font-bold transition-all shadow-md active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Create</span>
            </button>
          </div>

          {/* 2. Scrollable Body */}
          <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4 scrollbar-thin">
            
            {/* Quick Links (Meetings, My Tasks, More) */}
            <div className="space-y-0.5">
              <button
                onClick={() => setShowMeetingModal(true)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-nav-primary font-medium dark:text-slate-200 text-slate-700 dark:hover:text-white hover:text-slate-900 dark:hover:bg-white/[0.06] hover:bg-slate-200/60 transition-all group"
              >
                <Phone className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                <span>Meetings</span>
              </button>

              <button
                onClick={() => navigate("/board")}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-nav-primary font-medium dark:text-slate-200 text-slate-700 dark:hover:text-white hover:text-slate-900 dark:hover:bg-white/[0.06] hover:bg-slate-200/60 transition-all group"
              >
                <User className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                <span>My Tasks</span>
              </button>

              <button
                onClick={() => navigate("/dashboard")}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-nav-primary font-medium dark:text-slate-200 text-slate-700 dark:hover:text-white hover:text-slate-900 dark:hover:bg-white/[0.06] hover:bg-slate-200/60 transition-all group"
              >
                <MoreHorizontal className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                <span>More</span>
              </button>
            </div>

            {/* Separator */}
            <div className="h-px dark:bg-white/[0.04] bg-slate-200" />

            {/* Section: Spaces */}
            <div className="space-y-1">
              <div className="px-2.5 text-metric-label font-bold text-slate-400 uppercase tracking-wider">
                Spaces
              </div>

              {/* All Tasks Link */}
              <button
                onClick={() => navigate("/board")}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-nav-primary font-medium dark:text-slate-200 text-slate-700 dark:hover:text-white hover:text-slate-900 dark:hover:bg-white/[0.06] hover:bg-slate-200/60 transition-all truncate group"
              >
                <Sparkles className="w-4 h-4 text-indigo-500 flex-shrink-0 group-hover:rotate-12 transition-transform" />
                <span className="truncate">All Tasks</span>
              </button>
            </div>

            {/* Separator */}
            <div className="h-px dark:bg-white/[0.04] bg-slate-200" />

            {/* Section: Channels */}
            <div className="space-y-1">
              <div className="px-2.5 flex items-center justify-between">
                <span className="text-metric-label font-bold text-slate-400 uppercase tracking-wider">
                  Channels
                </span>
                <button
                  type="button"
                  id="create-channel-btn"
                  onClick={() => {
                    setNewChannelName("");
                    setNewChannelTopic("");
                    setChannelError("");
                    setShowCreateChannelModal(true);
                  }}
                  className="w-5 h-5 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-200 dark:hover:text-white dark:hover:bg-white/10 hover:bg-slate-200 transition-all group"
                  title="Create Channel"
                >
                  <Plus className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                </button>
              </div>

              {channels.map((channel) => {
                const isGeneral = channel.id === "general";
                return (
                  <div key={channel.id} className="group relative flex items-center">
                    <button
                      onClick={() => {
                        setActiveChannelId(channel.id);
                        navigate(`/chat?channel=${encodeURIComponent(channel.id)}`);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-nav-primary font-medium dark:text-slate-200 text-slate-700 dark:hover:text-white hover:text-slate-900 dark:hover:bg-white/[0.06] hover:bg-slate-200/60 transition-all truncate pr-8"
                    >
                      <Hash className="w-4 h-4 text-slate-400 group-hover:text-cyan-500 transition-colors flex-shrink-0" />
                      <span className="truncate">{channel.name}</span>
                      {isGeneral && (
                        <span className="w-4 h-4 rounded-md bg-teal-600 flex items-center justify-center text-badge-meta font-bold text-white ml-auto flex-shrink-0">
                          {initial}
                        </span>
                      )}
                    </button>

                    {!isGeneral && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setChannelToDelete(channel);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/15 text-slate-400 hover:text-red-400 transition-all absolute right-2"
                        title={`Delete #${channel.name}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Separator between Channels and Direct Messages */}
            <div className="h-px dark:bg-white/[0.04] bg-slate-200 my-2" />

            {/* Section: Direct Messages */}
            <div className="space-y-1">
              <div className="px-2.5 flex items-center justify-between mb-1">
                <span className="text-metric-label font-bold text-slate-400 uppercase tracking-wider">
                  Direct Messages
                </span>
              </div>

              <div className="space-y-0.5">
                {members.length === 0 ? (
                  <span className="text-task-metadata dark:text-slate-500 text-slate-400 italic px-2.5 py-1.5 block">
                    No other members
                  </span>
                ) : (
                  members.map((member) => (
                    <button
                      key={member.userId}
                      onClick={() => {
                        navigate(`/chat?dm=${encodeURIComponent(member.user?.id || member.userId)}`);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-nav-primary font-medium dark:text-slate-200 text-slate-700 dark:hover:text-white hover:text-slate-900 dark:hover:bg-white/[0.06] hover:bg-slate-200/60 transition-all truncate group"
                    >
                      <Avatar
                        src={member.user?.avatar}
                        name={member.user?.name}
                        size="xs"
                        className="flex-shrink-0"
                      />
                      <span className="truncate">{member.user?.name}</span>
                    </button>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Create Workspace Wizard Modal */}
          <CreateWorkspaceModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
          />

          {/* Create Channel Modal */}
          <AnimatePresence>
            {showCreateChannelModal && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                onClick={() => setShowCreateChannelModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 10 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="glass-card w-[420px] max-w-[95vw] p-6 relative z-10 select-none"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                        <Hash className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-section-heading font-bold dark:text-white text-slate-900">
                          Create Channel
                        </h3>
                        <p className="text-task-metadata text-slate-400">
                          Create a channel for your workspace.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowCreateChannelModal(false)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center dark:hover:bg-dp-dark-surface-hover hover:bg-dp-light-bg-secondary dark:text-dp-text-muted text-dp-text-light-muted transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {channelError && (
                    <div className="mb-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-[12px] flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{channelError}</span>
                    </div>
                  )}

                  <form onSubmit={handleCreateChannel} className="space-y-4">
                    <div>
                      <label className="block text-metric-label dark:text-dp-text-muted text-dp-text-light-muted mb-1.5">
                        Channel Name *
                      </label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-slate-400 font-mono text-sm">#</span>
                        <input
                          type="text"
                          placeholder="e.g. frontend, announcements"
                          value={newChannelName}
                          onChange={(e) => {
                            setNewChannelName(e.target.value);
                            setChannelError("");
                          }}
                          className="glass-input w-full pl-7 text-[13px]"
                          required
                          autoFocus
                        />
                      </div>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                        Names can include letters, numbers, and hyphens.
                      </span>
                    </div>

                    <div>
                      <label className="block text-metric-label dark:text-dp-text-muted text-dp-text-light-muted mb-1.5">
                        Topic / Purpose (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="What is this channel about?"
                        value={newChannelTopic}
                        onChange={(e) => setNewChannelTopic(e.target.value)}
                        className="glass-input w-full text-[13px]"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowCreateChannelModal(false)}
                        className="btn-ghost text-btn-refined"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!newChannelName.trim()}
                        className="btn-primary text-btn-refined flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create Channel</span>
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}

            {/* Delete Channel Confirmation Modal */}
            {channelToDelete && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.16 }}
                  className="w-full max-w-md rounded-2xl dark:bg-[#0d0d10] bg-white border dark:border-red-500/20 border-red-200 p-6 shadow-2xl relative"
                >
                  <button
                    type="button"
                    disabled={isDeletingChannel}
                    onClick={() => setChannelToDelete(null)}
                    className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-major-heading font-bold dark:text-white text-slate-900">
                        Delete Channel?
                      </h3>
                      <p className="text-caption-meta text-red-400 font-medium">
                        This action cannot be undone
                      </p>
                    </div>
                  </div>

                  <p className="text-body-secondary dark:text-slate-300 text-slate-600 leading-relaxed mb-6">
                    Are you sure you want to delete <span className="font-bold dark:text-white text-slate-900">#{channelToDelete.name}</span>? All conversation history in this channel will be permanently removed.
                  </p>

                  <div className="flex justify-end gap-2.5">
                    <button
                      type="button"
                      disabled={isDeletingChannel}
                      onClick={() => setChannelToDelete(null)}
                      className="btn-ghost text-btn-refined"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isDeletingChannel}
                      onClick={handleConfirmDeleteChannel}
                      className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-btn-refined flex items-center gap-1.5 transition-all active:scale-95 shadow-lg shadow-red-600/20 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isDeletingChannel ? "Deleting..." : "Yes, Delete Channel"}</span>
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Jitsi Video Meeting Modal */}
          <VideoMeetingModal
            isOpen={showMeetingModal}
            onClose={() => setShowMeetingModal(false)}
            currentProject={currentProject}
            user={user}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

