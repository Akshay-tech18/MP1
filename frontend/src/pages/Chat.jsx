import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";
import useSocketStore from "../store/useSocketStore";
import useChannelStore from "../store/useChannelStore";
import client from "../api/client";
import PageTransition from "../components/PageTransition";
import Avatar from "../components/Avatar";
import {
  Send,
  Hash,
  MessageSquare,
  Plus,
  X,
  Trash2,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import { SocketEvent } from "../config/constants";

export default function Chat() {
  const { user, currentProject } = useAuthStore();
  const { socket } = useSocketStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    channels,
    loadChannels,
    activeChannelId,
    setActiveChannelId,
    addChannel,
    deleteChannel,
  } = useChannelStore();

  const [members, setMembers] = useState([]);
  const [activeChannel, setActiveChannel] = useState({
    isGroup: true,
    targetUser: null,
    channel: null,
  });
  const [messages, setMessages] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [typingUsers, setTypingUsers] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelTopic, setNewChannelTopic] = useState("");
  const [channelError, setChannelError] = useState("");

  const [channelToDelete, setChannelToDelete] = useState(null);
  const [isDeletingChannel, setIsDeletingChannel] = useState(false);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const activeRequestIdRef = useRef(0);

  // 1. Fetch project members & channels
  useEffect(() => {
    async function loadMembers() {
      if (!currentProject) return;
      try {
        const res = await client.get(`/projects/${currentProject.id}`);
        if (res.data.success) {
          const list = res.data.data.project.members.filter(
            (m) => m.userId !== user.id
          );
          setMembers(list);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadMembers();
    loadChannels(currentProject?.id);
  }, [currentProject, loadChannels]);

  // Synchronize active channel with URL param or store without redundant re-renders
  useEffect(() => {
    const channelParam = searchParams.get("channel");
    const dmParam = searchParams.get("dm");

    if (dmParam && members.length > 0) {
      const matchedMember = members.find(
        (m) => m.userId === dmParam || m.user?.id === dmParam
      );
      if (matchedMember) {
        setActiveChannel((prev) => {
          if (!prev.isGroup && prev.targetUser?.id === (matchedMember.user?.id || matchedMember.userId)) return prev;
          setMessages([]);
          setLoading(true);
          return { isGroup: false, targetUser: matchedMember.user, channel: null };
        });
        return;
      }
    }

    if (channelParam) {
      const matched = channels.find((c) => c.id === channelParam);
      if (matched) {
        setActiveChannel((prev) => {
          if (prev.isGroup && prev.channel?.id === matched.id) return prev;
          setMessages([]);
          setLoading(true);
          return { isGroup: true, targetUser: null, channel: matched };
        });
        setActiveChannelId(matched.id);
        return;
      }
    }

    if (!dmParam && channels.length > 0) {
      const active =
        channels.find((c) => c.id === activeChannelId) || channels[0];
      setActiveChannel((prev) => {
        if (!prev.isGroup && prev.targetUser) return prev;
        if (prev.isGroup && prev.channel?.id === active.id) return prev;
        setMessages([]);
        setLoading(true);
        return { isGroup: true, targetUser: null, channel: active };
      });
    }
  }, [searchParams, channels, members, activeChannelId, setActiveChannelId]);

  // Stable key for current channel or DM
  const channelKey = activeChannel.isGroup
    ? (activeChannel.channel?.id || "general")
    : (activeChannel.targetUser?.id ? `dm:${activeChannel.targetUser.id}` : "");

  // 2. Fetch messages with cancellation of stale responses & instant clearing
  const fetchMessages = async (cursorId = null) => {
    if (!currentProject) {
      setLoading(false);
      return;
    }
    const isMore = cursorId !== null;
    if (isMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setMessages([]); // Instant clear to prevent old channel messages from flashing
    }

    const reqId = ++activeRequestIdRef.current;
    const isGroup = activeChannel.isGroup;
    const channelId = activeChannel.channel?.id || "general";
    const otherUserId = activeChannel.targetUser?.id;

    try {
      const params = { isGroup: isGroup ? "true" : "false", limit: 30 };
      if (cursorId) params.cursor = cursorId;
      if (isGroup) {
        params.channelId = channelId;
      } else if (otherUserId) {
        params.otherUserId = otherUserId;
      }

      const res = await client.get(`/projects/${currentProject.id}/messages`, { params });
      
      // Discard stale out-of-order responses
      if (reqId !== activeRequestIdRef.current) return;

      if (res.data.success) {
        const { messages: fetched, nextCursor: next } = res.data.data;
        if (isMore) {
          setMessages((prev) => [...fetched, ...prev]);
        } else {
          setMessages(fetched);
          setTimeout(scrollToBottom, 50);
        }
        setNextCursor(next);
      }
    } catch (e) {
      if (reqId === activeRequestIdRef.current) console.error(e);
    } finally {
      if (reqId === activeRequestIdRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  // Only trigger message fetch when the channel/DM actually changes
  useEffect(() => {
    if (!currentProject || !channelKey) return;
    fetchMessages();
    setTypingUsers({});
  }, [channelKey, currentProject?.id]);

  // 3. Socket Events
  useEffect(() => {
    if (!socket || !currentProject) return;

    socket.on(SocketEvent.CHAT_MESSAGE, (msg) => {
      const currentChannelId = activeChannel.channel?.id || "general";
      const isForGroup =
        msg.isGroup &&
        activeChannel.isGroup &&
        (msg.channelId === currentChannelId ||
          (!msg.channelId && currentChannelId === "general"));
      const isForDM =
        !msg.isGroup &&
        !activeChannel.isGroup &&
        ((msg.senderId === user.id && msg.receiverId === activeChannel.targetUser?.id) ||
          (msg.senderId === activeChannel.targetUser?.id && msg.receiverId === user.id));
      if (isForGroup || isForDM) {
        setMessages((prev) => [...prev, msg]);
        setTimeout(scrollToBottom, 50);
      }
    });

    socket.on(SocketEvent.CHAT_TYPING, (data) => {
      const { userId, isTyping } = data;
      if (isTyping) {
        const typist = members.find(m => m.userId === userId);
        if (typist) setTypingUsers(prev => ({ ...prev, [userId]: typist.user.name }));
      } else {
        setTypingUsers(prev => { const u = { ...prev }; delete u[userId]; return u; });
      }
    });

    return () => { socket.off(SocketEvent.CHAT_MESSAGE); socket.off(SocketEvent.CHAT_TYPING); };
  }, [socket, activeChannel, currentProject, members]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  const handleScroll = (e) => {
    const container = e.target;
    if (container.scrollTop === 0 && nextCursor && !loadingMore) {
      const prevHeight = container.scrollHeight;
      fetchMessages(nextCursor).then(() => {
        setTimeout(() => { container.scrollTop = container.scrollHeight - prevHeight; }, 30);
      });
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    try {
      await client.post(`/projects/${currentProject.id}/messages`, {
        content: messageText,
        isGroup: activeChannel.isGroup,
        channelId: activeChannel.isGroup ? (activeChannel.channel?.id || "general") : null,
        receiverId: activeChannel.isGroup ? null : activeChannel.targetUser.id
      });
      setMessageText(""); stopTyping();
    } catch (err) { console.error(err); }
  };

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
      setActiveChannel({ isGroup: true, targetUser: null, channel: res.channel });
      setActiveChannelId(res.channel.id);
      setSearchParams({ channel: res.channel.id });
    } else {
      setChannelError(res.error);
    }
  };

  const handleConfirmDeleteChannel = async () => {
    if (!channelToDelete || !currentProject) return;
    setIsDeletingChannel(true);
    try {
      // 1. Delete channel messages from backend
      await client
        .delete(`/projects/${currentProject.id}/messages/channels/${channelToDelete.id}`)
        .catch((err) => console.warn("Failed to delete channel messages on backend:", err));

      // 2. Delete channel from store
      deleteChannel(currentProject?.id, channelToDelete.id);

      // 3. Navigate to general channel if current channel was deleted
      const fallback = channels.find((c) => c.id === "general") || {
        id: "general",
        name: "General",
        isDefault: true,
      };
      setActiveChannel({ isGroup: true, targetUser: null, channel: fallback });
      setActiveChannelId("general");
      setSearchParams({ channel: "general" });
    } catch (err) {
      console.error("Failed to delete channel:", err);
    } finally {
      setIsDeletingChannel(false);
      setChannelToDelete(null);
    }
  };

  const handleInputChange = (e) => {
    setMessageText(e.target.value);
    if (!socket || !currentProject) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit(SocketEvent.CHAT_TYPING, { projectId: currentProject.id, isTyping: true });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => stopTyping(), 2000);
  };

  const stopTyping = () => {
    if (isTypingRef.current && socket && currentProject) {
      isTypingRef.current = false;
      socket.emit(SocketEvent.CHAT_TYPING, { projectId: currentProject.id, isTyping: false });
    }
  };

  const typingText = Object.values(typingUsers).join(", ");

  if (!currentProject) {
    return (
      <PageTransition>
        <div className="flex-1 p-8 flex items-center justify-center select-none">
          <div className="max-w-md w-full text-center p-8 rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/10 border-slate-200 shadow-xl">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-4">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-major-heading font-bold dark:text-white text-slate-900 mb-1">
              No Active Workspace
            </h3>
            <p className="text-body-secondary dark:text-slate-400 text-slate-500 leading-relaxed">
              Create or select a workspace from the workspace dropdown in the header to start chatting with your team.
            </p>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="flex-1 flex h-full overflow-hidden select-none">
        
        {/* Left Channel Panel */}
        <div className="w-56 glass-sidebar border-r flex flex-col h-full flex-shrink-0">
          <div className="p-4 border-b dark:border-dp-dark-border-light/50 border-dp-light-border flex-shrink-0">
            <span className="text-metric-label font-bold uppercase tracking-wider dark:text-dp-text-muted text-dp-text-light-muted">Messages</span>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-4">
            {/* Channels */}
            <div>
              <div className="px-2.5 flex items-center justify-between mb-1.5">
                <span className="text-metric-label font-bold dark:text-dp-text-muted text-dp-text-light-muted uppercase tracking-wider">
                  Channels
                </span>
                <button
                  type="button"
                  id="chat-create-channel-btn"
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

              <div className="space-y-0.5">
                {channels.map((ch) => {
                  const isSelected =
                    activeChannel.isGroup &&
                    (activeChannel.channel?.id === ch.id ||
                      (!activeChannel.channel && ch.id === "general"));
                  return (
                    <div key={ch.id} className="group relative flex items-center">
                      <button
                        onClick={() => {
                          if (activeChannel.isGroup && activeChannel.channel?.id === ch.id) return;
                          setMessages([]);
                          setLoading(true);
                          setActiveChannel({
                            isGroup: true,
                            targetUser: null,
                            channel: ch,
                          });
                          setActiveChannelId(ch.id);
                          setSearchParams({ channel: ch.id });
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-nav-primary text-left transition-all duration-150 font-medium truncate ${
                          isSelected
                            ? "dark:bg-dp-primary/10 bg-dp-primary/5 text-dp-primary font-semibold"
                            : "dark:text-dp-text-secondary text-dp-text-light-secondary dark:hover:bg-dp-dark-surface-hover hover:bg-dp-light-bg-secondary"
                        }`}
                      >
                        <Hash className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{ch.name}</span>
                        {ch.id === "general" && currentProject?.name && (
                          <span className="w-4 h-4 rounded-md bg-teal-600 flex items-center justify-center text-badge-meta font-bold text-white ml-auto flex-shrink-0">
                            {currentProject.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </button>

                      {ch.id !== "general" && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setChannelToDelete(ch);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/15 text-slate-400 hover:text-red-400 transition-all absolute right-2"
                          title={`Delete #${ch.name}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Separator between Channels and Direct Messages */}
            <div className="h-px dark:bg-white/[0.04] bg-slate-200 my-2" />

            {/* DMs */}
            <div className="space-y-1">
              <div className="px-2.5 flex items-center justify-between mb-1">
                <span className="text-metric-label font-bold dark:text-dp-text-muted text-dp-text-light-muted uppercase tracking-wider">
                  Direct Messages
                </span>
              </div>
              <div className="space-y-0.5">
                {members.length === 0 ? (
                  <span className="text-task-metadata dark:text-dp-text-muted text-dp-text-light-muted italic px-2.5 block py-3">No other members.</span>
                ) : (
                  members.map((member) => (
                    <button
                      key={member.userId}
                      onClick={() => {
                        if (!activeChannel.isGroup && activeChannel.targetUser?.id === member.user.id) return;
                        setMessages([]);
                        setLoading(true);
                        setActiveChannel({ isGroup: false, targetUser: member.user, channel: null });
                        setSearchParams({ dm: member.user?.id || member.userId });
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-nav-primary text-left transition-all duration-150 font-medium truncate ${
                        !activeChannel.isGroup && activeChannel.targetUser?.id === member.user.id
                          ? "dark:bg-dp-primary/10 bg-dp-primary/5 text-dp-primary font-semibold"
                          : "dark:text-dp-text-secondary text-dp-text-light-secondary dark:hover:bg-dp-dark-surface-hover hover:bg-dp-light-bg-secondary"
                      }`}
                    >
                      <Avatar src={member.user.avatar} name={member.user.name} size="xs" />
                      <span className="truncate">{member.user.name}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Messages Feed */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          
          {/* Chat Title */}
          <div className="h-13 glass-sidebar border-b px-5 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5 text-major-heading dark:text-dp-text-primary text-dp-text-light-primary min-w-0">
              {activeChannel.isGroup ? (
                <div className="flex items-center gap-2 min-w-0">
                  <Hash className="w-5 h-5 dark:text-dp-text-muted text-dp-text-light-muted flex-shrink-0" />
                  <span className="truncate">{activeChannel.channel?.name || "General"}</span>
                  {activeChannel.channel?.topic && (
                    <span className="text-task-metadata text-slate-400 dark:text-slate-500 truncate font-normal hidden sm:inline">
                      — {activeChannel.channel.topic}
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar src={activeChannel.targetUser?.avatar} name={activeChannel.targetUser?.name} size="sm" />
                  <span className="truncate">{activeChannel.targetUser?.name}</span>
                </div>
              )}
            </div>

            {/* Actions for this Channel: Delete Channel with confirmation */}
            {activeChannel.isGroup && activeChannel.channel?.id && activeChannel.channel.id !== "general" && (
              <button
                type="button"
                id="delete-channel-top-btn"
                onClick={() => setChannelToDelete(activeChannel.channel)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-red-400 hover:text-white hover:bg-red-500/20 border border-red-500/30 text-btn-refined font-semibold transition-all active:scale-95 ml-3 flex-shrink-0"
                title={`Delete #${activeChannel.channel.name}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Delete Channel</span>
              </button>
            )}
          </div>

          {/* Messages */}
          <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-5 space-y-4">
            {loadingMore && (
              <div className="text-center text-task-metadata dark:text-dp-text-muted text-dp-text-light-muted font-semibold py-2">Loading older messages...</div>
            )}

            {loading ? (
              <div className="space-y-4 py-3 px-1 animate-pulse">
                <div className="flex gap-3 items-start opacity-40">
                  <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-700/60 flex-shrink-0" />
                  <div className="space-y-2 flex-1 max-w-sm">
                    <div className="h-3.5 w-24 bg-slate-300 dark:bg-slate-700/60 rounded" />
                    <div className="h-10 bg-slate-200 dark:bg-slate-800/60 rounded-xl" />
                  </div>
                </div>
                <div className="flex gap-3 items-start opacity-25">
                  <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-700/60 flex-shrink-0" />
                  <div className="space-y-2 flex-1 max-w-xs">
                    <div className="h-3.5 w-28 bg-slate-300 dark:bg-slate-700/60 rounded" />
                    <div className="h-8 bg-slate-200 dark:bg-slate-800/60 rounded-xl" />
                  </div>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center select-none max-w-md mx-auto">
                <div className="w-12 h-12 rounded-2xl dark:bg-white/[0.04] bg-slate-100 flex items-center justify-center mb-3 text-indigo-500 border dark:border-white/5 border-slate-200 shadow-sm">
                  {activeChannel.isGroup ? <Hash className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
                </div>
                <h5 className="text-card-title font-bold dark:text-white text-slate-900 uppercase tracking-wider">
                  {activeChannel.isGroup
                    ? `# ${activeChannel.channel?.name || "General Channel"}`
                    : `@${activeChannel.targetUser?.name || "Direct Message"}`}
                </h5>
                <p className="text-body-secondary dark:text-slate-400 text-slate-500 mt-1 mb-5 leading-relaxed">
                  {activeChannel.isGroup
                    ? (activeChannel.channel?.topic || "Start an operational discussion with your team. Messages and notifications sync in real-time.")
                    : "Start an operational discussion with your team. Messages and notifications sync in real-time."}
                </p>

                {/* Suggested Quick Actions */}
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={() => setMessageText("Hey team, has anyone started reviewing the latest PR? ")}
                    className="px-3 py-1.5 rounded-xl dark:bg-white/[0.04] bg-slate-100 dark:hover:bg-white/10 hover:bg-slate-200 border dark:border-white/[0.06] border-slate-200 text-btn-refined font-semibold dark:text-slate-200 text-slate-700 transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    <span>+ Ask a question</span>
                  </button>
                  <button
                    onClick={() => setMessageText("Sprint update: ")}
                    className="px-3 py-1.5 rounded-xl dark:bg-white/[0.04] bg-slate-100 dark:hover:bg-white/10 hover:bg-slate-200 border dark:border-white/[0.06] border-slate-200 text-btn-refined font-semibold dark:text-slate-200 text-slate-700 transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    <span>+ Share an update</span>
                  </button>
                  <button
                    onClick={() => setMessageText("Need review on task: ")}
                    className="px-3 py-1.5 rounded-xl dark:bg-white/[0.04] bg-slate-100 dark:hover:bg-white/10 hover:bg-slate-200 border dark:border-white/[0.06] border-slate-200 text-btn-refined font-semibold dark:text-slate-200 text-slate-700 transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    <span>+ Request review</span>
                  </button>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const date = new Date(msg.createdAt);
                const formattedTime = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                const isOwnMessage = msg.senderId === user?.id;
                return (
                  <div
                    key={msg.id}
                    className="flex gap-3 items-start transition-opacity duration-150"
                  >
                    <Avatar src={msg.sender?.avatar} name={msg.sender?.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5">
                        <span className="text-card-title font-bold dark:text-dp-text-primary text-dp-text-light-primary">{msg.sender?.name}</span>
                        <span className="text-caption-meta dark:text-dp-text-muted text-dp-text-light-muted">{formattedTime}</span>
                      </div>
                      <p className={`mt-1.5 leading-relaxed p-3 rounded-xl inline-block max-w-lg text-body-primary border ${
                        isOwnMessage
                          ? "bg-dp-primary/10 dark:border-dp-primary/20 border-dp-primary/15 dark:text-dp-text-primary text-dp-text-light-primary"
                          : "dark:bg-dp-dark-surface/60 bg-white dark:border-dp-dark-border-light/30 border-dp-light-border/60 dark:text-dp-text-secondary text-dp-text-light-secondary"
                      }`}>
                        {msg.content}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 glass-sidebar border-t flex-shrink-0">
            <div className="h-5 mb-1.5 text-task-metadata dark:text-dp-text-muted text-dp-text-light-muted italic">
              {typingText && (
                <span className="flex items-center gap-2">
                  {typingText} {typingText.includes(",") ? "are" : "is"} typing
                  <span className="typing-dots"><span /><span /><span /></span>
                </span>
              )}
            </div>
            <form onSubmit={handleSendMessage} className="flex gap-3">
              <input
                type="text"
                placeholder={
                  activeChannel.isGroup
                    ? `Message #${activeChannel.channel?.name || "general"}...`
                    : `Message @${activeChannel.targetUser?.name}...`
                }
                value={messageText}
                onChange={handleInputChange}
                className="glass-input flex-1 text-body-secondary"
              />
              <button type="submit" disabled={!messageText.trim()} className="btn-primary px-5 py-2.5 flex items-center gap-2 text-btn-refined disabled:opacity-40">
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </div>
        </div>

        {/* Create Channel Modal */}
        <AnimatePresence>
          {showCreateChannelModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.16 }}
                className="w-full max-w-md rounded-2xl dark:bg-[#0f1117] bg-white border dark:border-white/10 border-slate-200 p-6 shadow-2xl relative"
              >
                <button
                  type="button"
                  onClick={() => setShowCreateChannelModal(false)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                    <Hash className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-major-heading font-bold dark:text-white text-slate-900">
                      Create Channel
                    </h3>
                    <p className="text-caption-meta dark:text-slate-400 text-slate-500">
                      Channels are where your team discusses projects and sprints
                    </p>
                  </div>
                </div>

                {channelError && (
                  <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 text-task-metadata">
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
                      <Hash className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="e.g. backend-sprint, design-reviews"
                        value={newChannelName}
                        onChange={(e) => {
                          setNewChannelName(e.target.value);
                          setChannelError("");
                        }}
                        className="glass-input w-full pl-9 text-[13px]"
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
                className="w-full max-w-md rounded-2xl dark:bg-[#0f1117] bg-white border dark:border-red-500/20 border-red-200 p-6 shadow-2xl relative"
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
      </div>
    </PageTransition>
  );
}