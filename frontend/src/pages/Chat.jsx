import React, { useState, useEffect, useRef } from "react";
import useAuthStore from "../store/useAuthStore";
import useSocketStore from "../store/useSocketStore";
import client from "../api/client";
import { Send, Hash, User, MessageSquare, AlertCircle } from "lucide-react";
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

  // 1. Fetch project members to construct sidebar DM lists
  useEffect(() => {
    async function loadMembers() {
      if (!currentProject) return;
      try {
        const res = await client.get(`/projects/${currentProject.id}`);
        if (res.data.success) {
          // Filter out current user from DMs list
          const list = res.data.data.project.members.filter(m => m.userId !== user.id);
          setMembers(list);
        }
      } catch (e) {
        console.error(e);
      }
    }

    loadMembers();
    // Default to group chat when switching projects
    setActiveChannel({ isGroup: true, targetUser: null });
  }, [currentProject]);

  // 2. Fetch messages whenever the channel changes
  const fetchMessages = async (cursorId = null) => {
    if (!currentProject) return;
    
    const isMore = cursorId !== null;
    if (isMore) setLoadingMore(true);
    else setLoading(true);

    try {
      const params = {
        isGroup: activeChannel.isGroup ? "true" : "false",
        limit: 30
      };
      
      if (cursorId) {
        params.cursor = cursorId;
      }

      if (!activeChannel.isGroup && activeChannel.targetUser) {
        params.otherUserId = activeChannel.targetUser.id;
      }

      const res = await client.get(`/projects/${currentProject.id}/messages`, { params });
      
      if (res.data.success) {
        const { messages: fetched, nextCursor: next } = res.data.data;
        
        if (isMore) {
          setMessages((prev) => [...fetched, ...prev]);
        } else {
          setMessages(fetched);
          // Scroll to bottom on initial load
          setTimeout(scrollToBottom, 50);
        }
        setNextCursor(next);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    setTypingUsers({});
  }, [activeChannel, currentProject]);

  // 3. Socket Event Bindings for incoming messages & typing indicators
  useEffect(() => {
    if (!socket || !currentProject) return;

    socket.on(SocketEvent.CHAT_MESSAGE, (msg) => {
      // Check if message belongs to current channel scope
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
      // data: { userId, isTyping }
      const { userId, isTyping } = data;
      
      if (isTyping) {
        // Find typing user name
        const typist = members.find(m => m.userId === userId);
        if (typist) {
          setTypingUsers(prev => ({ ...prev, [userId]: typist.user.name }));
        }
      } else {
        setTypingUsers(prev => {
          const updated = { ...prev };
          delete updated[userId];
          return updated;
        });
      }
    });

    return () => {
      socket.off(SocketEvent.CHAT_MESSAGE);
      socket.off(SocketEvent.CHAT_TYPING);
    };
  }, [socket, activeChannel, currentProject, members]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll to load older messages (infinite scroll pagination)
  const handleScroll = (e) => {
    const container = e.target;
    if (container.scrollTop === 0 && nextCursor && !loadingMore) {
      // Remember scroll height before loading more
      const prevHeight = container.scrollHeight;
      fetchMessages(nextCursor).then(() => {
        // Restore scroll position after loading more messages
        setTimeout(() => {
          container.scrollTop = container.scrollHeight - prevHeight;
        }, 30);
      });
    }
  };

  // 4. Send message trigger
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    try {
      await client.post(`/projects/${currentProject.id}/messages`, {
        content: messageText,
        isGroup: activeChannel.isGroup,
        receiverId: activeChannel.isGroup ? null : activeChannel.targetUser.id
      });
      setMessageText("");
      stopTyping();
    } catch (err) {
      console.error(err);
    }
  };

  // Emit typing indicator updates
  const handleInputChange = (e) => {
    setMessageText(e.target.value);

    if (!socket || !currentProject) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit(SocketEvent.CHAT_TYPING, { projectId: currentProject.id, isTyping: true });
    }

    // Clear timeout if user types before 2s
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 2000);
  };

  const stopTyping = () => {
    if (isTypingRef.current && socket && currentProject) {
      isTypingRef.current = false;
      socket.emit(SocketEvent.CHAT_TYPING, { projectId: currentProject.id, isTyping: false });
    }
  };

  const typingText = Object.values(typingUsers).join(", ");

  return (
    <div className="flex-1 bg-clickup-light flex h-screen overflow-hidden select-none">
      
      {/* 1. Left Sidebar - Chat Directories */}
      <div className="w-56 bg-white border-r border-clickup-light-border flex flex-col h-full flex-shrink-0">
        <div className="p-4 border-b border-clickup-light-border flex items-center justify-between flex-shrink-0">
          <span className="font-bold text-slate-800 text-xs tracking-wider uppercase">Messages</span>
        </div>

        {/* Directory Channels Scroll */}
        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {/* General channel */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-1">Channels</span>
            <button
              onClick={() => setActiveChannel({ isGroup: true, targetUser: null })}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left transition font-semibold ${
                activeChannel.isGroup ? "bg-slate-100 text-clickup-primary" : "text-slate-650 hover:bg-slate-50"
              }`}
            >
              <Hash className="w-3.5 h-3.5" />
              general-chat
            </button>
          </div>

          {/* DMs lists */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-1">Direct Messages</span>
            <div className="space-y-0.5">
              {members.length === 0 ? (
                <span className="text-[10px] text-slate-400 italic px-2 block py-2">No other members.</span>
              ) : (
                members.map((member) => (
                  <button
                    key={member.userId}
                    onClick={() => setActiveChannel({ isGroup: false, targetUser: member.user })}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left transition font-semibold truncate ${
                      !activeChannel.isGroup && activeChannel.targetUser?.id === member.user.id
                        ? "bg-slate-100 text-clickup-primary"
                        : "text-slate-650 hover:bg-slate-50"
                    }`}
                  >
                    <img
                      src={member.user.avatar}
                      alt=""
                      className="w-4 h-4 rounded-full border border-slate-100 bg-slate-50"
                    />
                    <span className="truncate">{member.user.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Right Workspace - Messages Feed Area */}
      <div className="flex-1 flex flex-col bg-slate-50 h-full overflow-hidden">
        
        {/* Chat Title bar */}
        <div className="h-14 bg-white border-b border-clickup-light-border px-6 flex items-center flex-shrink-0">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
            {activeChannel.isGroup ? (
              <>
                <Hash className="w-4 h-4 text-slate-400" />
                general-chat
              </>
            ) : (
              <>
                <img
                  src={activeChannel.targetUser?.avatar}
                  alt=""
                  className="w-5 h-5 rounded-full border border-slate-150"
                />
                {activeChannel.targetUser?.name}
              </>
            )}
          </div>
        </div>

        {/* Messages list */}
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-6 space-y-4"
        >
          {loadingMore && (
            <div className="text-center text-[10px] text-slate-400 font-semibold py-2">
              Loading older messages...
            </div>
          )}

          {loading ? (
            <div className="flex-1 flex items-center justify-center py-20 text-xs text-slate-400 font-medium">
              Loading discussion...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center select-none">
              <MessageSquare className="w-8 h-8 text-slate-300 mb-2" />
              <h5 className="font-semibold text-slate-700 text-xs">No Messages Yet</h5>
              <p className="text-[10px] text-slate-400 mt-1 max-w-xs leading-relaxed">
                Start the discussion! Type a message below and hit send to broadcast in real-time.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const date = new Date(msg.createdAt);
              const formattedTime = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              return (
                <div key={msg.id} className="flex gap-3 text-xs items-start animate-in fade-in slide-in-from-bottom-2 duration-100">
                  <img
                    src={msg.sender.avatar}
                    alt=""
                    className="w-8 h-8 rounded-full border border-slate-100 bg-slate-50 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{msg.sender.name}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{formattedTime}</span>
                    </div>
                    <p className="text-slate-750 mt-1 leading-relaxed bg-white border border-slate-200/50 p-2.5 rounded-lg inline-block max-w-lg shadow-2xs">
                      {msg.content}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input message form */}
        <div className="p-4 bg-white border-t border-clickup-light-border flex-shrink-0">
          {/* Typing Indicator text */}
          <div className="h-4 mb-1.5 text-[10px] text-slate-400 italic">
            {typingText && <span>{typingText} {typingText.includes(",") ? "are" : "is"} typing...</span>}
          </div>

          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              placeholder={activeChannel.isGroup ? "Message #general-chat..." : `Message @${activeChannel.targetUser?.name}...`}
              value={messageText}
              onChange={handleInputChange}
              className="flex-1 px-4 py-2 border border-slate-350 rounded text-xs focus:outline-none focus:border-clickup-primary focus:ring-1 focus:ring-clickup-primary"
            />
            <button
              type="submit"
              disabled={!messageText.trim()}
              className="px-4 py-2 bg-clickup-primary disabled:bg-clickup-primary/40 text-white font-bold rounded text-xs flex items-center gap-1.5 transition"
            >
              <Send className="w-3.5 h-3.5" />
              Send
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
