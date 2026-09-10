import React, { useState } from "react";
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
} from "lucide-react";
import PageTransition from "../components/PageTransition";
import useAuthStore from "../store/useAuthStore";

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
    prompt: "Summarize the latest database schema updates, Prisma migration logs, and API contract changes for the Fleet Management Space.",
    response: `### Nexus² Doc Summary: Schema & API Contracts

**1. Database Schema Migrations (Prisma + PostgreSQL)**
- Added \`isStarred\` and \`tags\` array column to \`WorkspaceDoc\` model.
- Refactored relations on \`TimeEntry\` to support weekly roll-up calculations by project member.
- Introduced \`RepositorySync\` status enum: \`PENDING\`, \`SYNCING\`, \`COMPLETED\`.

**2. API Contract Revisions**
- \`GET /api/timesheets/summary\` — Returns cached 7-day matrix aggregations with billable tags.
- \`POST /api/workspaces/sync-github\` — Implemented non-blocking background queue with retry logic.
- \`WS /socket.io\` — Added real-time channel broadcasting for collaborative doc edits.

*All migrations successfully applied on main dev branch.*`,
  },
  {
    id: "project-update",
    title: "Project Update",
    desc: "Sync team status across active sprints",
    icon: Layers,
    prompt: "Generate an executive team status update for Fleet Management Phase 2 sprint.",
    response: `### Nexus² Sprint Health Update: Phase 2

- **Sprint Velocity**: 86% on-track (32/38 story points completed)
- **Active Milestones**:
  - [Completed] **GitHub App Integration**: Live & syncing repositories with automated webhook hooks.
  - [In Review] **Real-Time Timesheets**: Frontend matrix completed; pending final PR review.
  - [In Review] **Nexus² AI Assistant**: Core contextual ask engine active with workspace document grounding.
- **Blockers & Risks**: No critical blockers reported. Electron packaging builds verified locally.`,
  },
  {
    id: "draft-update",
    title: "Draft Update",
    desc: "Draft communication message for stakeholders",
    icon: Sparkles,
    prompt: "Draft a concise release announcement for the engineering team on Slack and Docs.",
    response: `### Team Announcement Draft

Hello team,

We have deployed updates to the workspace:
1. **Nexus² AI**: Instant contextual answers grounded in your repo, docs, and tasks.
2. **Interactive Timesheets**: Log and monitor team allocations across weekly sprints.
3. **Workspace Documents**: Centralized markdown repository with live sync and tagging.

Review the changes in the dashboard and share feedback in **# General**.`,
  },
  {
    id: "search-docs",
    title: "Search Docs",
    desc: "Search database documents and architecture notes",
    icon: Search,
    prompt: "Find all documentation related to Neon PostgreSQL and Electron app setup.",
    response: `### Nexus² Document Search Results (2 matches)

1. **Working with Neon and Prisma**
   - *Location*: \`Team Space > Phase 2\`
   - *Excerpt*: Direct connection pooling via Neon serverless endpoints; SSL requirement flags (\`sslmode=require\`).
   - *Updated*: Dec 19, 2025

2. **README for electron setup**
   - *Location*: \`Team Space > Phase 2\`
   - *Excerpt*: Scripts to start the electron desktop wrapper using Vite dev-server hot-reload on \`localhost:5173\`.
   - *Updated*: Jan 15, 2026`,
  },
];

export default function NexusAi() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState("ask"); // "ask" | "agents"
  const [promptText, setPromptText] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [selectedModel, setSelectedModel] = useState("Max");
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const handleSendPrompt = (textToSend) => {
    const query = textToSend || promptText;
    if (!query.trim()) return;

    const userMessage = { id: Date.now(), role: "user", text: query };
    setConversation((prev) => [...prev, userMessage]);
    setPromptText("");
    setIsGenerating(true);

    // Find if it matches a preset card
    const preset = PRESET_CARDS.find((p) => p.prompt === query || p.title.toLowerCase() === query.toLowerCase());

    setTimeout(() => {
      const responseText = preset
        ? preset.response
        : `### 🌸 Nexus² Intelligence Response\n\nI processed your request regarding: **"${query}"**.\n\nHere are the recommended action items and synthesized knowledge:\n- Workspace context verified against active space **Fleet management system**.\n- 0 security policy violations found.\n- Suggested follow-up: link this insight directly to a sprint task on the Board.`;

      const aiMessage = {
        id: Date.now() + 1,
        role: "assistant",
        text: responseText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setConversation((prev) => [...prev, aiMessage]);
      setIsGenerating(false);
    }, 600);
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
      <div className="flex-1 flex flex-col h-full overflow-y-auto dark:bg-[#0c0e14] bg-[#f8fafc] dark:text-white text-slate-900 select-none relative transition-colors duration-200">
        
        {/* Top subtle ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[260px] bg-gradient-to-b from-indigo-900/15 via-purple-900/10 to-transparent blur-3xl pointer-events-none" />

        {/* Top Right Memory indicator (Clean, NO green pulse dot) */}
        <div className="absolute top-4 right-6 flex items-center gap-1.5 px-3 py-1 rounded-lg dark:bg-white/[0.04] bg-white border dark:border-white/[0.08] border-slate-200 text-[11px] font-medium dark:text-slate-300 text-slate-700 shadow-sm">
          <Zap className="w-3 h-3 text-indigo-400" />
          <span>Memory Active</span>
        </div>

        {/* Main Center Stage */}
        <div className="max-w-3xl mx-auto w-full px-6 pt-12 pb-16 flex flex-col items-center flex-1 justify-center min-h-[620px]">
          
          {/* 1. Header: Flower Emblem + Nexus² Title with Aesthetic Intro Sequence */}
          <div className="relative flex flex-col items-center mb-7">
            {/* Concentric ambient bloom shockwaves */}
            <motion.div
              initial={{ scale: 0.4, opacity: 0.8 }}
              animate={{ scale: [0.4, 1.8, 2.4], opacity: [0.8, 0.3, 0] }}
              transition={{ duration: 1.8, ease: "easeOut" }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border border-cyan-400/40 pointer-events-none"
            />
            <motion.div
              initial={{ scale: 0.3, opacity: 0.9 }}
              animate={{ scale: [0.3, 2.2, 3.0], opacity: [0.9, 0.25, 0] }}
              transition={{ duration: 2.2, delay: 0.15, ease: "easeOut" }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border border-fuchsia-500/30 pointer-events-none"
            />

            {/* Glowing radial backdrop */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: [0, 0.7, 0.5], scale: [0.8, 1.2, 1] }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="absolute -top-12 w-96 h-40 bg-gradient-to-r from-cyan-500/20 via-purple-600/25 to-pink-500/20 blur-3xl rounded-full pointer-events-none"
            />

            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-3 relative z-10"
            >
              {/* Spinning Bloom Nexus Flower Emblem */}
              <motion.div
                initial={{ scale: 0.2, rotate: -270, opacity: 0, filter: "blur(12px)" }}
                animate={{
                  scale: [0.2, 1.28, 0.95, 1],
                  rotate: [-270, 15, -5, 0],
                  opacity: 1,
                  filter: "blur(0px)",
                }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ scale: 1.12, rotate: 180, transition: { duration: 0.5 } }}
                whileTap={{ scale: 0.95 }}
                className="relative group cursor-pointer"
              >
                {/* Continuous subtle neon pulse */}
                <motion.div
                  animate={{
                    scale: [1, 1.25, 1],
                    opacity: [0.35, 0.7, 0.35],
                  }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -inset-2 rounded-2xl bg-gradient-to-tr from-cyan-400 via-fuchsia-500 to-amber-400 blur-md opacity-60"
                />

                <div className="relative w-11 h-11 rounded-2xl dark:bg-[#0e121d]/90 bg-white border dark:border-white/20 border-slate-200 flex items-center justify-center shadow-[0_0_25px_rgba(168,85,247,0.4),inset_0_1px_1px_rgba(255,255,255,0.25)] backdrop-blur-xl transition-transform group-hover:scale-105">
                  <NexusFlowerIcon className="w-6 h-6" />
                </div>
              </motion.div>

              {/* Shimmering Title */}
              <motion.h1
                initial={{ opacity: 0, x: -12, filter: "blur(4px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="text-3xl sm:text-4xl font-extrabold tracking-tight dark:text-white text-slate-900 flex items-start select-none"
              >
                <span className="bg-gradient-to-b dark:from-white dark:via-slate-100 dark:to-slate-300 from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">
                  Nexus
                </span>
                <motion.span
                  initial={{ scale: 0, opacity: 0, rotate: -40 }}
                  animate={{ scale: [0, 1.4, 1], opacity: 1, rotate: [-40, 10, 0] }}
                  transition={{ duration: 0.6, delay: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
                  className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-fuchsia-400 to-purple-400 ml-0.5 drop-shadow-[0_0_10px_rgba(236,72,153,0.8)]"
                >
                  ²
                </motion.span>
              </motion.h1>
            </motion.div>
          </div>

          {/* 2. Attached Tabs (Directly on top of prompt box) */}
          <div className="w-full flex justify-start pl-6">
            <div className="inline-flex items-center gap-1 dark:bg-[#121520] bg-white border-t border-x dark:border-white/[0.1] border-slate-200 rounded-t-xl px-2 pt-1.5 pb-2 text-xs font-semibold shadow-sm">
              <button
                onClick={() => setActiveTab("ask")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                  activeTab === "ask"
                    ? "dark:bg-white/10 bg-slate-100 dark:text-white text-slate-900 shadow-sm"
                    : "dark:text-slate-400 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <NexusFlowerIcon className="w-3.5 h-3.5" />
                <span>Ask</span>
              </button>
              <button
                onClick={() => setActiveTab("agents")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                  activeTab === "agents"
                    ? "dark:bg-white/10 bg-slate-100 dark:text-white text-slate-900 shadow-sm"
                    : "dark:text-slate-400 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <Bot className="w-3.5 h-3.5 text-indigo-400" />
                <span>Agents</span>
              </button>
            </div>
          </div>

          {/* 3. Prompt Container with Glowing Multi-color Gradient Halo */}
          <div className="w-full relative group">
            {/* Outer radiant neon gradient border halo */}
            <div className="absolute -inset-[1.5px] rounded-2xl bg-gradient-to-r from-[#38bdf8] via-[#a855f7] via-[#ec4899] to-[#f59e0b] opacity-80 blur-[1px] group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Ambient bloom behind box */}
            <div className="absolute -inset-2 rounded-2xl bg-gradient-to-r from-[#38bdf8] via-[#a855f7] to-[#ec4899] opacity-25 blur-xl group-hover:opacity-40 transition-opacity" />

            {/* Inner Surface Container */}
            <div className="relative rounded-2xl dark:bg-[#10131c] bg-white border dark:border-white/[0.1] border-slate-200 overflow-hidden shadow-2xl flex flex-col">
              
              {/* Text Input Area */}
              <div className="p-4 pb-2">
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
                  placeholder="Turn ideas into action. Create tasks, documents, or anything else with a prompt."
                  className="w-full bg-transparent text-sm dark:text-slate-100 text-slate-900 placeholder-slate-400 resize-none outline-none leading-relaxed"
                />
              </div>

              {/* Inside Toolbar */}
              <div className="px-4 py-2.5 dark:bg-[#0e111a]/80 bg-slate-50/90 border-t dark:border-white/[0.05] border-slate-200 flex items-center justify-between text-xs dark:text-slate-400 text-slate-600">
                {/* Left controls */}
                <div className="flex items-center gap-2">
                  <button
                    title="Attach Context or File"
                    className="w-7 h-7 rounded-lg flex items-center justify-center dark:hover:bg-white/10 hover:bg-slate-200/70 dark:text-slate-400 text-slate-500 dark:hover:text-white hover:text-slate-900 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  <button
                    title="Skill Plugins"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg dark:bg-white/5 bg-slate-200/50 dark:hover:bg-white/10 hover:bg-slate-200 dark:text-slate-300 text-slate-700 dark:hover:text-white hover:text-slate-900 border dark:border-white/5 border-slate-200 transition-colors font-medium"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Skills</span>
                  </button>
                </div>

                {/* Center Audio / Mute controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center dark:hover:bg-white/10 hover:bg-slate-200/70 dark:text-slate-400 text-slate-500 dark:hover:text-slate-200 hover:text-slate-900 transition-colors"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <button className="w-7 h-7 rounded-lg flex items-center justify-center dark:hover:bg-white/10 hover:bg-slate-200/70 dark:text-slate-400 text-slate-500 dark:hover:text-slate-200 hover:text-slate-900 transition-colors">
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Right Model & Action controls */}
                <div className="flex items-center gap-2 relative">
                  {/* Model Selector Pill */}
                  <div className="relative">
                    <button
                      onClick={() => setShowModelPicker(!showModelPicker)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg dark:bg-white/5 bg-slate-200/50 dark:hover:bg-white/10 hover:bg-slate-200 dark:text-slate-300 text-slate-700 dark:hover:text-white hover:text-slate-900 border dark:border-white/5 border-slate-200 transition-colors font-medium"
                    >
                      <NexusFlowerIcon className="w-3.5 h-3.5" />
                      <span>{selectedModel}</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>

                    {/* Model Picker Flyout */}
                    {showModelPicker && (
                      <div className="absolute right-0 bottom-full mb-2 w-44 rounded-xl dark:bg-[#151924] bg-white border dark:border-white/10 border-slate-200 shadow-2xl p-1.5 z-40 space-y-0.5">
                        {["Max", "Pro", "Flash"].map((model) => (
                          <button
                            key={model}
                            onClick={() => {
                              setSelectedModel(model);
                              setShowModelPicker(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                              selectedModel === model
                                ? "dark:bg-indigo-600/30 bg-indigo-50 text-indigo-600 dark:text-indigo-300 font-semibold"
                                : "dark:text-slate-300 text-slate-700 dark:hover:bg-white/5 hover:bg-slate-100"
                            }`}
                          >
                            <span>Nexus {model}</span>
                            {selectedModel === model && <Check className="w-3 h-3 text-indigo-500" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Mic / Voice trigger */}
                  <button
                    title="Voice dictation"
                    className="w-7 h-7 rounded-lg flex items-center justify-center dark:hover:bg-white/10 hover:bg-slate-200/70 dark:text-slate-400 text-slate-500 dark:hover:text-white hover:text-slate-900 transition-colors"
                  >
                    <Mic className="w-4 h-4" />
                  </button>

                  {/* Submit button */}
                  <button
                    onClick={() => handleSendPrompt()}
                    disabled={!promptText.trim() || isGenerating}
                    className="w-7 h-7 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white flex items-center justify-center transition-all shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Quick Action Cards */}
          <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-2.5 mt-4">
            {PRESET_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.id}
                  onClick={() => handleCardClick(card)}
                  className="text-left p-3 rounded-xl dark:bg-[#121520] bg-white dark:hover:bg-[#181c2b] hover:bg-slate-50 border dark:border-white/[0.06] border-slate-200 dark:hover:border-white/[0.15] hover:border-slate-300 transition-all group flex flex-col justify-between shadow-sm hover:shadow"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                    <span className="text-xs font-semibold dark:text-slate-200 text-slate-800 group-hover:text-indigo-600 dark:group-hover:text-white">
                      {card.title}
                    </span>
                  </div>
                  <p className="text-[11px] dark:text-slate-400 text-slate-500 leading-snug line-clamp-2">
                    {card.desc}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Conversation / Results Stream */}
          <AnimatePresence>
            {(conversation.length > 0 || isGenerating) && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="w-full mt-6 space-y-4"
              >
                {conversation.map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-2xl p-4 border text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "dark:bg-[#181c29] bg-indigo-50/80 dark:border-white/10 border-indigo-200/60 dark:text-slate-200 text-slate-800 ml-auto max-w-xl shadow-sm"
                        : "dark:bg-[#121520] bg-white dark:border-white/[0.08] border-slate-200 dark:text-slate-300 text-slate-700 shadow-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 font-semibold text-[11px]">
                        {msg.role === "assistant" ? (
                          <>
                            <NexusFlowerIcon className="w-4 h-4" />
                            <span className="dark:text-white text-slate-900">Nexus² Synthesis</span>
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
                    <div className="whitespace-pre-line dark:text-slate-200 text-slate-800">
                      {msg.text}
                    </div>
                  </div>
                ))}

                {isGenerating && (
                  <div className="rounded-2xl p-4 dark:bg-[#121520] bg-white border dark:border-white/[0.08] border-slate-200 flex items-center gap-3 text-xs dark:text-slate-400 text-slate-600 shadow-sm">
                    <NexusFlowerIcon className="w-4 h-4 animate-spin" />
                    <span>Nexus² is analyzing workspace documents and context...</span>
                  </div>
                )}

                {conversation.length > 0 && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => setConversation([])}
                      className="flex items-center gap-1.5 text-[11px] dark:text-slate-400 text-slate-600 dark:hover:text-slate-200 hover:text-slate-900 transition-colors py-1 px-2.5 rounded-lg dark:bg-white/5 bg-slate-100 border dark:border-white/5 border-slate-200"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Clear Chat</span>
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* 5. Bottom Promo Pill */}
          <div className="mt-12">
            <div className="flex items-center gap-3 px-4 py-2 rounded-2xl dark:bg-[#151824] bg-white border dark:border-white/[0.08] border-slate-200 shadow-lg hover:border-indigo-400/40 transition-all cursor-pointer group">
              <div className="w-7 h-7 rounded-xl dark:bg-slate-800/80 bg-slate-100 flex items-center justify-center shadow-inner">
                <NexusFlowerIcon className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold dark:text-white text-slate-900 group-hover:text-indigo-500 transition-colors">
                    Meet Nexus²
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-purple-600/20 text-purple-600 dark:text-purple-300 border border-purple-500/20">
                    New
                  </span>
                </div>
                <p className="text-[11px] dark:text-slate-400 text-slate-500">
                  Way smarter, wildly more capable
                </p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 dark:text-slate-400 text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all ml-2" />
            </div>
          </div>

        </div>
      </div>
    </PageTransition>
  );
}
