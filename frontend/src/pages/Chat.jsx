import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useAuthStore from "../store/useAuthStore";
import useSocketStore from "../store/useSocketStore";
import client from "../api/client";
import PageTransition from "../components/PageTransition";
import Avatar from "../components/Avatar";
import { Send, Hash, MessageSquare } from "lucide-react";
import { SocketEvent } from "../config/constants";

export default function Chat() {
  const { user, currentProject } = useAuthStore();
  const { socket } = useSocketStore();

  const [members, setMembers] = useState([]);
  const [activeChannel, setActiveChannel] = useState({ isGroup: true, targetUser: null });
  const [messages, setMessages] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [typingUsers, setTypingUsers] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  // 1. Fetch project members
  useEffect(() => {
    async function loadMembers() {
      if (!currentProject) return;
      try {
        const res = await client.get(`/projects/${currentProject.id}`);
        if (res.data.success) {
          const list = res.data.data.project.members.filter(m => m.userId !== user.id);
          setMembers(list);
        }
      } catch (e) { console.error(e); }
    }
    loadMembers();
    setActiveChannel({ isGroup: true, targetUser: null });
  }, [currentProject]);

  // 2. Fetch messages
  const fetchMessages = async (cursorId = null) => {
    if (!currentProject) return;
    const isMore = cursorId !== null;
    if (isMore) setLoadingMore(true);
    else setLoading(true);

    try {
      const params = { isGroup: activeChannel.isGroup ? "true" : "false", limit: 30 };
      if (cursorId) params.cursor = cursorId;
      if (!activeChannel.isGroup && activeChannel.targetUser) params.otherUserId = activeChannel.targetUser.id;

      const res = await client.get(`/projects/${currentProject.id}/messages`, { params });
      if (res.data.success) {
        const { messages: fetched, nextCursor: next } = res.data.data;
        if (isMore) setMessages((prev) => [...fetched, ...prev]);
        else { setMessages(fetched); setTimeout(scrollToBottom, 50); }
        setNextCursor(next);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); setLoadingMore(false); }
  };

  useEffect(() => { fetchMessages(); setTypingUsers({}); }, [activeChannel, currentProject]);

  // 3. Socket Events
  useEffect(() => {
    if (!socket || !currentProject) return;

    socket.on(SocketEvent.CHAT_MESSAGE, (msg) => {
      const isForGroup = msg.isGroup && activeChannel.isGroup;
      const isForDM = !msg.isGroup && !activeChannel.isGroup &&
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
        content: messageText, isGroup: activeChannel.isGroup,
        receiverId: activeChannel.isGroup ? null : activeChannel.targetUser.id
      });
      setMessageText(""); stopTyping();
    } catch (err) { console.error(err); }
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
              <span className="text-metric-label font-bold dark:text-dp-text-muted text-dp-text-light-muted uppercase tracking-wider px-2.5 block mb-1.5">Channels</span>
              <button
                onClick={() => setActiveChannel({ isGroup: true, targetUser: null })}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-nav-primary text-left transition-all duration-150 font-medium ${
                  activeChannel.isGroup
                    ? "dark:bg-dp-primary/10 bg-dp-primary/5 text-dp-primary font-semibold"
                    : "dark:text-dp-text-secondary text-dp-text-light-secondary dark:hover:bg-dp-dark-surface-hover hover:bg-dp-light-bg-secondary"
                }`}
              >
                <Hash className="w-4 h-4" />
                general-chat
              </button>
            </div>

            {/* DMs */}
            <div>
              <span className="text-metric-label font-bold dark:text-dp-text-muted text-dp-text-light-muted uppercase tracking-wider px-2.5 block mb-1.5">Direct Messages</span>
              <div className="space-y-0.5">
                {members.length === 0 ? (
                  <span className="text-task-metadata dark:text-dp-text-muted text-dp-text-light-muted italic px-2.5 block py-3">No other members.</span>
                ) : (
                  members.map((member) => (
                    <button
                      key={member.userId}
                      onClick={() => setActiveChannel({ isGroup: false, targetUser: member.user })}
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
          <div className="h-13 glass-sidebar border-b px-5 flex items-center flex-shrink-0">
            <div className="flex items-center gap-2.5 text-major-heading dark:text-dp-text-primary text-dp-text-light-primary">
              {activeChannel.isGroup ? (
                <><Hash className="w-5 h-5 dark:text-dp-text-muted text-dp-text-light-muted" />general-chat</>
              ) : (
                <><Avatar src={activeChannel.targetUser?.avatar} name={activeChannel.targetUser?.name} size="sm" />{activeChannel.targetUser?.name}</>
              )}
            </div>
          </div>

          {/* Messages */}
          <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-5 space-y-4">
            {loadingMore && (
              <div className="text-center text-task-metadata dark:text-dp-text-muted text-dp-text-light-muted font-semibold py-2">Loading older messages...</div>
            )}

            {loading ? (
              <div className="flex-1 flex items-center justify-center py-20 text-body-secondary dark:text-dp-text-muted text-dp-text-light-muted font-medium">Loading discussion...</div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center select-none max-w-md mx-auto">
                <div className="w-12 h-12 rounded-2xl dark:bg-white/[0.04] bg-slate-100 flex items-center justify-center mb-3 text-indigo-500 border dark:border-white/5 border-slate-200 shadow-sm">
                  {activeChannel.isGroup ? <Hash className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
                </div>
                <h5 className="text-card-title font-bold dark:text-white text-slate-900 uppercase tracking-wider">
                  {activeChannel.isGroup ? "General Channel" : `@${activeChannel.targetUser?.name || "Direct Message"}`}
                </h5>
                <p className="text-body-secondary dark:text-slate-400 text-slate-500 mt-1 mb-5 leading-relaxed">
                  Start an operational discussion with your team. Messages and notifications sync in real-time.
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
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="flex gap-3 items-start"
                  >
                    <Avatar src={msg.sender.avatar} name={msg.sender.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5">
                        <span className="text-card-title font-bold dark:text-dp-text-primary text-dp-text-light-primary">{msg.sender.name}</span>
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
                  </motion.div>
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
                placeholder={activeChannel.isGroup ? "Message #general-chat..." : `Message @${activeChannel.targetUser?.name}...`}
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
      </div>
    </PageTransition>
  );
}