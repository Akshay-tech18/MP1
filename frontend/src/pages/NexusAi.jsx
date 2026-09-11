import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Search,
  FileText,
  Send,
  Plus,
  Zap,
  Volume2,
  VolumeX,
  MoreVertical,
  ChevronDown,
  Mic,
  Bot,
  Layers,
  ArrowRight,
  Check,
  Copy,
  RotateCcw,
  Shield,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import PageTransition from "../components/PageTransition";
import useAuthStore from "../store/useAuthStore";
import { chatWithNexus, approveAgentAction } from "../api/nexus";

// ClickUp Brain flower emblem SVG
function NexusFlowerIcon({ className = "w-7 h-7" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <defs>
        <linearGradient id="nexus-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
        <linearGradient id="nexus-grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#f472b6" />
        </linearGradient>
        <linearGradient id="nexus-grad-3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#f43f5e" />
        </linearGradient>
        <linearGradient id="nexus-grad-4" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      {/* 4 organic petals resembling ClickUp Brain flower */}
      <circle cx="12" cy="7" r="4.5" fill="url(#nexus-grad-1)" fillOpacity="0.9" />
      <circle cx="17" cy="12" r="4.5" fill="url(#nexus-grad-2)" fillOpacity="0.9" />
      <circle cx="12" cy="17" r="4.5" fill="url(#nexus-grad-3)" fillOpacity="0.9" />
      <circle cx="7" cy="12" r="4.5" fill="url(#nexus-grad-4)" fillOpacity="0.9" />
      <circle cx="12" cy="12" r="2.8" fill="#ffffff" />
    </svg>
  );
}

const PRESET_CARDS = [
  {
    id: "doc-summary",
    title: "Doc Summary",
    desc: "Summarize schema changes and API contracts",
    icon: FileText,
    prompt: "Summarize the database schema, Prisma models, and API contract changes available in the workspace documents.",
  },
  {
    id: "create-task",
    title: "Create Task",
    desc: "Ask Nexus to draft a new sprint task",
    icon: Layers,
    prompt: "Create a task with title 'Deploy Backend to Production' and description 'Setup AWS ECS and SSL certificate'.",
  },
  {
    id: "draft-update",
    title: "Draft Update",
    desc: "Draft announcement for team workspace",
    icon: Sparkles,
    prompt: "Draft a concise release announcement for the engineering team regarding Nexus AI and Workspace Documents.",
  },
  {
    id: "search-docs",
    title: "Search Docs",
    desc: "Search database documents and architecture notes",
    icon: Search,
    prompt: "What does our documentation say about PostgreSQL pgvector and Neon database configuration?",
  },
];

export default function NexusAi() {
  const { user, currentProject, projects } = useAuthStore();
  const projectId = currentProject?.id || (projects[0] ? projects[0].id : null);

  const [activeTab, setActiveTab] = useState("ask"); // "ask" | "agents"
  const [promptText, setPromptText] = useState("");
  const [selectedModel, setSelectedModel] = useState("GPT-OSS 120B");
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [approvingThreadId, setApprovingThreadId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const messagesEndRef = useRef(null);

  // Smooth auto-scroll to the bottom of the conversation
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation, isGenerating]);

  const handleSendPrompt = async (textToSend) => {
    const query = textToSend || promptText;
    if (!query.trim() || !projectId) return;

    const userMessage = { id: Date.now(), role: "user", text: query };
    setConversation((prev) => [...prev, userMessage]);
    setPromptText("");
    setIsGenerating(true);

    try {
      const res = await chatWithNexus(projectId, {
        message: query,
        useAgent: activeTab === "agents" || query.toLowerCase().includes("task") || query.toLowerCase().includes("create"),
        threadId: activeThreadId,
      });

      if (res.success && res.data) {
        if (res.data.threadId) {
          setActiveThreadId(res.data.threadId);
        }

        if (res.data.status === "approval_required") {
          const aiMessage = {
            id: Date.now() + 1,
            role: "assistant",
            status: "approval_required",
            threadId: res.data.threadId,
            toolCalls: res.data.toolCalls || [],
            text: "I have prepared an automated action for your workspace. Please review and confirm below before execution:",
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
          setConversation((prev) => [...prev, aiMessage]);
        } else {
          const aiMessage = {
            id: Date.now() + 1,
            role: "assistant",
            status: "completed",
            threadId: res.data.threadId,
            text: res.data.answer || "I processed your request.",
            sources: res.data.sources || [],
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
          setConversation((prev) => [...prev, aiMessage]);
        }
      }
    } catch (err) {
      console.error("Nexus chat error:", err);
      const errMsg =
        err.response?.data?.message ||
        err.message ||
        "Failed to reach Nexus AI backend.";

      const aiMessage = {
        id: Date.now() + 1,
        role: "assistant",
        status: "error",
        text: `⚠️ **Nexus AI Notice**: ${errMsg}`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setConversation((prev) => [...prev, aiMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApproveAction = async (threadId, approved) => {
    if (!projectId || !threadId) return;
    setApprovingThreadId(threadId);

    try {
      const res = await approveAgentAction(projectId, {
        threadId,
        approved,
      });

      if (res.success && res.data) {
        setConversation((prev) =>
          prev.map((msg) => {
            if (msg.threadId === threadId && msg.status === "approval_required") {
              return {
                ...msg,
                status: approved ? "approved" : "rejected",
                resultText: approved
                  ? (res.data.answer || "Action successfully executed!")
                  : "Action cancelled by user.",
              };
            }
            return msg;
          })
        );
      }
    } catch (err) {
      console.error("Failed to approve action:", err);
      alert("Failed to process action approval. Check backend logs.");
    } finally {
      setApprovingThreadId(null);
    }
  };

  const handleCardClick = (card) => {
    handleSendPrompt(card.prompt);
  };

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <PageTransition>
      <div className="flex-1 flex flex-col h-full overflow-hidden dark:bg-[#080808] bg-[#f8fafc] dark:text-white text-slate-900 select-none relative transition-colors duration-200">
        
        {/* Top subtle ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[220px] bg-gradient-to-b from-indigo-900/15 via-purple-900/10 to-transparent blur-3xl pointer-events-none" />

        {/* ══════ 1. FIXED TOP HEADER BAR ══════ */}
        <header className="h-14 px-6 border-b dark:border-white/[0.06] border-slate-200 flex items-center justify-between dark:bg-[#080808]/90 bg-white/90 backdrop-blur z-20 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl dark:bg-[#121214] bg-slate-100 border dark:border-white/10 border-slate-200 flex items-center justify-center shadow-xs">
              <NexusFlowerIcon className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight dark:text-white text-slate-900">
                Nexus²
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 dark:text-cyan-300 text-indigo-600 border dark:border-cyan-400/30 border-indigo-200 font-semibold uppercase tracking-wider">
                AI Agent
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {currentProject && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg dark:bg-white/[0.04] bg-slate-100 border dark:border-white/[0.08] border-slate-200 text-[11px] font-medium dark:text-slate-300 text-slate-700 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>{currentProject.name}</span>
              </div>
            )}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg dark:bg-white/[0.04] bg-slate-100 border dark:border-white/[0.08] border-slate-200 text-[11px] font-medium dark:text-slate-300 text-slate-700 shadow-xs">
              <Zap className="w-3 h-3 text-indigo-400" />
              <span>LangGraph HITL Active</span>
            </div>

            {conversation.length > 0 && (
              <button
                onClick={() => {
                  setConversation([]);
                  setActiveThreadId(null);
                }}
                className="flex items-center gap-1 text-[11.5px] px-2.5 py-1 rounded-lg dark:bg-white/5 bg-slate-100 hover:bg-slate-200 dark:hover:bg-white/10 border dark:border-white/10 border-slate-200 dark:text-slate-300 text-slate-700 transition-colors font-medium shadow-xs"
                title="Start a fresh chat"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>New Chat</span>
              </button>
            )}
          </div>
        </header>

        {/* ══════ 2. SCROLLABLE MIDDLE CHAT STAGE ══════ */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 min-h-0 flex flex-col">
          <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col">
            
            {/* Empty State: Welcome Hero Stage */}
            {conversation.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 my-auto py-8">
                {/* Flower Emblem Bloom */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="relative group cursor-pointer mb-5"
                >
                  <div className="relative w-14 h-14 rounded-3xl dark:bg-[#0c0c0e]/90 bg-white border dark:border-white/20 border-slate-200 flex items-center justify-center shadow-[0_0_35px_rgba(168,85,247,0.35)] backdrop-blur-xl">
                    <NexusFlowerIcon className="w-8 h-8" />
                  </div>
                </motion.div>

                <h2 className="text-xl sm:text-2xl font-black tracking-tight dark:text-white text-slate-900 mb-1.5 font-sans text-center">
                  How can Nexus² help your team today?
                </h2>
                <p className="text-xs sm:text-[13px] dark:text-slate-400 text-slate-500 font-medium tracking-tight text-center max-w-md mb-6 leading-relaxed">
                  Grounded with workspace documents, PostgreSQL pgvector RAG, and LangGraph autonomous task execution.
                </p>

                {/* Pill Switcher */}
                <div className="flex items-center p-1 rounded-xl dark:bg-[#121214] bg-slate-200/70 border dark:border-white/[0.06] border-slate-200 mb-8 shadow-sm">
                  <button
                    onClick={() => setActiveTab("ask")}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === "ask"
                        ? "dark:bg-white/10 bg-white dark:text-white text-slate-900 shadow-sm"
                        : "text-slate-500 dark:hover:text-slate-300 hover:text-slate-900"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Ask Nexus (RAG)</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("agents")}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === "agents"
                        ? "dark:bg-white/10 bg-white dark:text-white text-slate-900 shadow-sm"
                        : "text-slate-500 dark:hover:text-slate-300 hover:text-slate-900"
                    }`}
                  >
                    <Bot className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Agent Mode (Actions)</span>
                  </button>
                </div>

                {/* 4 Quick Action Preset Cards */}
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-2xl">
                  {PRESET_CARDS.map((card) => {
                    const Icon = card.icon;
                    return (
                      <button
                        key={card.id}
                        onClick={() => handleCardClick(card)}
                        className="text-left p-3.5 rounded-xl dark:bg-[#121214] bg-white dark:hover:bg-[#18181b] hover:bg-slate-50 border dark:border-white/[0.06] border-slate-200 dark:hover:border-indigo-500/30 hover:border-slate-300 transition-all group flex flex-col justify-between shadow-xs hover:shadow-sm"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-500 transition-colors" />
                          <span className="text-xs font-semibold dark:text-slate-200 text-slate-800 group-hover:text-indigo-600 dark:group-hover:text-white">
                            {card.title}
                          </span>
                        </div>
                        <p className="text-[11.5px] dark:text-slate-400 text-slate-500 leading-snug">
                          {card.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Active Conversation Messages */
              <div className="space-y-4 pb-4">
                {conversation.map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-2xl p-4 border text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "dark:bg-[#18181b] bg-indigo-50/80 dark:border-white/10 border-indigo-200/60 dark:text-slate-200 text-slate-800 ml-auto max-w-xl shadow-sm"
                        : "dark:bg-[#121214] bg-white dark:border-white/[0.08] border-slate-200 dark:text-slate-300 text-slate-700 shadow-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 font-semibold text-[11px]">
                        {msg.role === "assistant" ? (
                          <>
                            <NexusFlowerIcon className="w-4 h-4" />
                            <span className="dark:text-white text-slate-900">Nexus² Agent</span>
                          </>
                        ) : (
                          <span className="dark:text-slate-400 text-slate-500">You</span>
                        )}
                      </div>
                      {msg.role === "assistant" && (
                        <button
                          onClick={() => handleCopy(msg.id, msg.text)}
                          className="flex items-center gap-1 text-[10px] dark:text-slate-400 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-500">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Message Body */}
                    <div className="whitespace-pre-line dark:text-slate-200 text-slate-800 leading-relaxed font-sans">
                      {msg.text}
                    </div>

                    {/* Grounded Sources (RAG) */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-2 border-t dark:border-white/[0.06] border-slate-200 flex items-center gap-2 flex-wrap text-[11px]">
                        <span className="text-slate-400 font-medium">Grounded Sources:</span>
                        {msg.sources.map((src, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium"
                          >
                            📄 {src}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Human-in-the-Loop Action Approval Card */}
                    {msg.status === "approval_required" && (
                      <div className="mt-3 p-3.5 rounded-xl dark:bg-[#161619] bg-indigo-50/50 border border-indigo-500/30 space-y-3">
                        <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs">
                          <Shield className="w-4 h-4" />
                          <span>Action Confirmation Required</span>
                        </div>

                        {msg.toolCalls && msg.toolCalls.length > 0 && (
                          <div className="p-2.5 rounded-lg dark:bg-black/30 bg-white border dark:border-white/10 border-slate-200 space-y-1 font-mono text-[11.5px]">
                            <div className="text-slate-400">
                              Tool: <span className="text-indigo-400 font-bold">{msg.toolCalls[0].name}</span>
                            </div>
                            {msg.toolCalls[0].args?.title && (
                              <div>
                                Title: <span className="dark:text-white text-slate-900 font-sans font-semibold">"{msg.toolCalls[0].args.title}"</span>
                              </div>
                            )}
                            {msg.toolCalls[0].args?.description && (
                              <div className="text-slate-400 truncate">
                                Description: <span className="dark:text-slate-300 text-slate-700 font-sans">{msg.toolCalls[0].args.description}</span>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleApproveAction(msg.threadId, true)}
                            disabled={approvingThreadId === msg.threadId}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50"
                          >
                            {approvingThreadId === msg.threadId ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            <span>Approve & Execute</span>
                          </button>
                          <button
                            onClick={() => handleApproveAction(msg.threadId, false)}
                            disabled={approvingThreadId === msg.threadId}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg dark:bg-white/5 bg-slate-200/80 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 text-xs font-semibold transition-all disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Approved Action Result Banner */}
                    {msg.status === "approved" && (
                      <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-2 text-xs font-medium">
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                        <span>{msg.resultText || "Action approved and executed on board."}</span>
                      </div>
                    )}

                    {/* Rejected Action Banner */}
                    {msg.status === "rejected" && (
                      <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2 text-xs font-medium">
                        <XCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                        <span>Action was rejected by user.</span>
                      </div>
                    )}
                  </div>
                ))}

                {isGenerating && (
                  <div className="rounded-2xl p-4 dark:bg-[#121214] bg-white border dark:border-white/[0.08] border-slate-200 flex items-center gap-3 text-xs dark:text-slate-400 text-slate-600 shadow-sm">
                    <NexusFlowerIcon className="w-4 h-4 animate-spin" />
                    <span>Nexus² is analyzing workspace documents and context...</span>
                  </div>
                )}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ══════ 3. FIXED BOTTOM DOCKED INPUT BAR ══════ */}
        <div className="p-4 border-t dark:border-white/[0.06] border-slate-200/80 dark:bg-[#080808]/95 bg-white/95 backdrop-blur z-20 flex-shrink-0">
          <div className="max-w-3xl mx-auto w-full">
            <div className="relative rounded-2xl dark:bg-[#121214] bg-white border dark:border-white/10 border-slate-300 shadow-lg overflow-hidden transition-all focus-within:border-indigo-500/50">
              <div className="p-3">
                <textarea
                  rows={2}
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendPrompt();
                    }
                  }}
                  placeholder="Ask anything about workspace docs, or tell Nexus to 'Create a task'..."
                  className="w-full bg-transparent text-xs sm:text-sm dark:text-slate-100 text-slate-900 placeholder-slate-400 outline-none resize-none leading-relaxed"
                />
              </div>

              {/* Action Toolbar */}
              <div className="px-3.5 py-2 dark:bg-[#161619] bg-slate-50/90 border-t dark:border-white/[0.06] border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                  <span>Enter to send</span>
                  <span>•</span>
                  <span>Shift + Enter for new line</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      onClick={() => setShowModelPicker(!showModelPicker)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg dark:bg-white/5 bg-slate-200/50 dark:hover:bg-white/10 hover:bg-slate-200 dark:text-slate-300 text-slate-700 border dark:border-white/5 border-slate-200 text-xs font-medium"
                    >
                      <NexusFlowerIcon className="w-3.5 h-3.5" />
                      <span>{selectedModel}</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>

                    {showModelPicker && (
                      <div className="absolute right-0 bottom-full mb-2 w-44 rounded-xl dark:bg-[#151518] bg-white border dark:border-white/10 border-slate-200 shadow-2xl p-1.5 z-40 space-y-0.5">
                        {["GPT-OSS 120B", "GPT-OSS 20B"].map((m) => (
                          <button
                            key={m}
                            onClick={() => {
                              setSelectedModel(m);
                              setShowModelPicker(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                              selectedModel === m
                                ? "dark:bg-indigo-600/30 bg-indigo-50 text-indigo-600 dark:text-indigo-300 font-semibold"
                                : "dark:text-slate-300 text-slate-700 dark:hover:bg-white/5 hover:bg-slate-100"
                            }`}
                          >
                            <span>{m}</span>
                            {selectedModel === m && <Check className="w-3 h-3 text-indigo-500" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleSendPrompt()}
                    disabled={!promptText.trim() || isGenerating}
                    className="w-7 h-7 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white flex items-center justify-center transition-all shadow-sm"
                  >
                    {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </PageTransition>
  );
}
