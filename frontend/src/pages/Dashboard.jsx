import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import useAuthStore from "../store/useAuthStore";
import useSocketStore from "../store/useSocketStore";
import client from "../api/client";
import PageTransition, { staggerContainer, staggerItem } from "../components/PageTransition";
import Avatar from "../components/Avatar";
import {
  CheckCircle,
  Clock,
  MessageSquare,
  TrendingUp,
  FolderDot,
  Activity,
  Inbox,
  Hash,
  Info,
  List,
  KanbanSquare,
  Calendar,
  Table,
  Database,
  Users,
  Sparkles,
  Plus,
  X,
  Bell,
  SlidersHorizontal,
  RefreshCw,
  FolderPlus,
  Bookmark,
  FileText,
  AlertCircle,
  ArrowRight,
  GitPullRequest,
  CheckCircle2,
  Flame,
  ArrowUpRight,
} from "lucide-react";
import { SocketEvent } from "../config/constants";

// ClickUp Brain / Nexus flower icon
function BrainFlowerIcon({ className = "w-3.5 h-3.5" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <circle cx="12" cy="7" r="3.8" fill="#38bdf8" />
      <circle cx="17" cy="12" r="3.8" fill="#c084fc" />
      <circle cx="12" cy="17" r="3.8" fill="#f472b6" />
      <circle cx="7" cy="12" r="3.8" fill="#34d399" />
      <circle cx="12" cy="12" r="2.2" fill="#ffffff" />
    </svg>
  );
}

const DEFAULT_LINEUP = [
  {
    id: "def-1",
    title: "Configure Neon database connection pooling & retry interceptor",
    priority: "URGENT",
    priorityColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    dotColor: "bg-rose-500",
    tag: "Backend",
    due: "Today",
    completed: false,
  },
  {
    id: "def-2",
    title: "Implement ClickUp 3.0 dark-mode navigation rail and subnav tabs",
    priority: "HIGH",
    priorityColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    dotColor: "bg-amber-500",
    tag: "Frontend",
    due: "Tomorrow",
    completed: true,
  },
  {
    id: "def-3",
    title: "Build Nexus² contextual ask engine with workspace docs grounding",
    priority: "HIGH",
    priorityColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    dotColor: "bg-amber-500",
    tag: "AI / Core",
    due: "Sep 14",
    completed: false,
  },
  {
    id: "def-4",
    title: "Weekly timesheets matrix grid and member hour approvals",
    priority: "NORMAL",
    priorityColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    dotColor: "bg-blue-500",
    tag: "Timesheets",
    due: "Sep 16",
    completed: false,
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, currentProject } = useAuthStore();
  const { socket } = useSocketStore();
  const [personalStats, setPersonalStats] = useState(null);
  const [dashboardMetrics, setDashboardMetrics] = useState(null);
  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBanner, setShowBanner] = useState(() => !sessionStorage.getItem("dp_hide_banner"));
  const [activeViewTab, setActiveViewTab] = useState("overview");
  const [lineupTasks, setLineupTasks] = useState(DEFAULT_LINEUP);
  const [quickTaskText, setQuickTaskText] = useState("");

  const loadDashboardData = useCallback(async () => {
    if (!currentProject) {
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch User Personal Stats
      const personalStatsRes = await client.get("/users/me/stats");
      if (personalStatsRes.data.success) {
        setPersonalStats(personalStatsRes.data.data.stats);
      }

      // 2. Fetch Project Dashboard Metrics
      const metricsRes = await client.get(`/projects/${currentProject.id}/analytics/dashboard`);
      if (metricsRes.data.success) {
        setDashboardMetrics(metricsRes.data.data);
      }

      // 3. Fetch Tasks assigned to user in this space
      const tasksRes = await client.get(`/projects/${currentProject.id}/tasks`, {
        params: { assigneeId: user?.id }
      });
      if (tasksRes.data.success && tasksRes.data.data.tasks?.length > 0) {
        setMyTasks(tasksRes.data.data.tasks);
      }
    } catch (err) {
      // Keep state resilient
    } finally {
      setLoading(false);
    }
  }, [currentProject, user]);

  useEffect(() => {
    setLoading(true);
    loadDashboardData();
  }, [loadDashboardData]);

  // Real-time synchronization
  useEffect(() => {
    if (!socket || !currentProject) return;

    const handleBoardUpdate = () => loadDashboardData();
    socket.on(SocketEvent.TASK_CREATED, handleBoardUpdate);
    socket.on(SocketEvent.TASK_UPDATED, handleBoardUpdate);
    socket.on(SocketEvent.TASK_DELETED, handleBoardUpdate);
    socket.on(SocketEvent.TASK_REORDERED, handleBoardUpdate);

    return () => {
      socket.off(SocketEvent.TASK_CREATED, handleBoardUpdate);
      socket.off(SocketEvent.TASK_UPDATED, handleBoardUpdate);
      socket.off(SocketEvent.TASK_DELETED, handleBoardUpdate);
      socket.off(SocketEvent.TASK_REORDERED, handleBoardUpdate);
    };
  }, [socket, currentProject, loadDashboardData]);

  const handleDismissBanner = () => {
    setShowBanner(false);
    sessionStorage.setItem("dp_hide_banner", "true");
  };

  const toggleTaskCompleted = (id) => {
    setLineupTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleAddQuickTask = (e) => {
    e.preventDefault();
    if (!quickTaskText.trim()) return;

    const newTask = {
      id: `task-${Date.now()}`,
      title: quickTaskText.trim(),
      priority: "NORMAL",
      priorityColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      dotColor: "bg-blue-500",
      tag: "Sprint Task",
      due: "This Sprint",
      completed: false,
    };

    setLineupTasks([newTask, ...lineupTasks]);
    setQuickTaskText("");
  };

  const assignedCount = myTasks.length > 0 ? myTasks.length : lineupTasks.length;
  const completedCount = myTasks.length > 0 
    ? myTasks.filter((t) => t.status === "COMPLETED").length 
    : lineupTasks.filter((t) => t.completed).length;
  const completionRate = assignedCount > 0 ? Math.round((completedCount / assignedCount) * 100) : 0;

  return (
    <PageTransition>
      <div className="flex-1 flex flex-col h-full overflow-hidden dark:bg-[#0c0e14] bg-[#f8fafc] dark:text-white text-slate-900 select-none transition-colors duration-200">
        
        {/* ══════ Top Real-Time Notification Purple Banner ══════ */}
        {showBanner && (
          <div className="bg-gradient-to-r from-purple-700 via-indigo-600 to-indigo-700 px-4 py-2 text-xs font-medium text-white flex items-center justify-between shadow-sm flex-shrink-0">
            <div className="flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 text-purple-200" />
              <span>DevPilot 3.0 Workspace Active • Sprints and real-time sync connected.</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDismissBanner}
                className="px-2.5 py-0.5 rounded bg-white/20 hover:bg-white/30 text-white font-semibold transition-colors"
              >
                Dismiss
              </button>
              <button
                onClick={handleDismissBanner}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ══════ Team Space Subnav Tabs (ClickUp 3.0 Style) ══════ */}
        <div className="h-10 border-b dark:border-white/[0.08] border-slate-200 px-4 flex items-center justify-between dark:bg-[#0f121a] bg-white flex-shrink-0 text-xs transition-colors">
          <div className="flex items-center gap-3 h-full overflow-x-auto scrollbar-none">
            {/* Space Identifier */}
            <div className="flex items-center gap-1.5 font-bold dark:text-white text-slate-800 pr-2 border-r dark:border-white/10 border-slate-200">
              <span className="w-4 h-4 rounded bg-indigo-600 flex items-center justify-center text-[10px]">
                <Users className="w-2.5 h-2.5 text-white" />
              </span>
              <span>{currentProject?.name || "DevPilot Workspace"}</span>
            </div>

            {/* View Tabs */}
            <button
              onClick={() => navigate("/chat")}
              className="flex items-center gap-1.5 text-slate-500 dark:hover:text-white hover:text-slate-900 h-full px-1 transition-colors"
            >
              <Hash className="w-3.5 h-3.5 text-slate-400" />
              <span>Channel</span>
            </button>

            <button
              onClick={() => setActiveViewTab("overview")}
              className={`flex items-center gap-1.5 h-full px-1 font-semibold transition-colors ${
                activeViewTab === "overview"
                  ? "dark:text-white text-indigo-600 border-b-2 dark:border-white border-indigo-600 font-bold"
                  : "text-slate-500 dark:hover:text-white hover:text-slate-900"
              }`}
            >
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => navigate("/board")}
              className="flex items-center gap-1.5 text-slate-500 dark:hover:text-white hover:text-slate-900 h-full px-1 transition-colors"
            >
              <List className="w-3.5 h-3.5 text-slate-400" />
              <span>List</span>
            </button>

            <button
              onClick={() => navigate("/board")}
              className="flex items-center gap-1.5 text-slate-500 dark:hover:text-white hover:text-slate-900 h-full px-1 transition-colors"
            >
              <KanbanSquare className="w-3.5 h-3.5 text-indigo-500" />
              <span>Board</span>
            </button>

            <button
              onClick={() => navigate("/team")}
              className="flex items-center gap-1.5 text-slate-500 dark:hover:text-white hover:text-slate-900 h-full px-1 transition-colors"
            >
              <Users className="w-3.5 h-3.5 text-emerald-500" />
              <span>Teams</span>
            </button>

            <button
              onClick={() => navigate("/timesheets")}
              className="flex items-center gap-1.5 text-slate-500 dark:hover:text-white hover:text-slate-900 h-full px-1 transition-colors"
            >
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Timesheets</span>
            </button>

            <button
              onClick={() => navigate("/docs")}
              className="flex items-center gap-1.5 text-slate-500 dark:hover:text-white hover:text-slate-900 h-full px-1 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-cyan-500" />
              <span>Docs</span>
            </button>

            <button
              onClick={() => navigate("/ai")}
              className="flex items-center gap-1.5 text-slate-500 dark:hover:text-white hover:text-slate-900 h-full px-1 transition-colors"
            >
              <BrainFlowerIcon className="w-3.5 h-3.5" />
              <span>Nexus² AI</span>
            </button>
          </div>

          {/* Right quick shortcut */}
          <div className="flex items-center gap-3 text-slate-400 text-xs">
            <button
              onClick={() => navigate("/ai")}
              className="flex items-center gap-1 dark:text-slate-300 text-slate-600 dark:hover:text-white hover:text-slate-900 transition-colors"
            >
              <BrainFlowerIcon className="w-3.5 h-3.5" />
              <span>Nexus²</span>
            </button>
            <span>•</span>
            <span className="text-[11px] text-slate-400">Auto refresh: On</span>
          </div>
        </div>

        {/* ══════ Scrollable Dashboard Body ══════ */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* 1. Header: Greeting + Sprint Command Ribbon */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold dark:text-white text-slate-900 tracking-tight flex items-center gap-2">
                <span>Welcome back,</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500">
                  {user?.name || "Engineer"}!
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Here's what's shipping in your <span className="dark:text-slate-200 text-slate-800 font-semibold">{currentProject?.name || "Active Workspace"}</span> today.
              </p>
            </div>

            {/* Sprint Status Badge (Clean, NO green dot) */}
            <div className="flex items-center gap-3 dark:bg-[#121520] bg-white border dark:border-white/[0.08] border-slate-200 p-2 px-3.5 rounded-xl text-xs shadow-sm">
              <div className="flex items-center gap-2">
                <span className="font-semibold dark:text-white text-slate-800">Sprint 2</span>
              </div>
              <span className="dark:text-slate-600 text-slate-300">|</span>
              <div className="flex items-center gap-2 text-slate-500">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>Ends in 4 days</span>
              </div>
              <span className="dark:text-slate-600 text-slate-300">|</span>
              <span className="font-mono text-emerald-500 font-semibold">86% Velocity</span>
            </div>
          </div>

          {/* 2. Quick Jump Shortcuts */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={() => navigate("/board")}
              className="p-3.5 rounded-2xl dark:bg-[#121520] bg-white hover:bg-slate-50 dark:hover:bg-[#161a29] border dark:border-white/[0.08] border-slate-200 hover:border-indigo-500/30 transition-all text-left group shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center">
                  <KanbanSquare className="w-4 h-4" />
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
              </div>
              <div>
                <h4 className="text-xs font-bold dark:text-white text-slate-900 group-hover:text-indigo-500 dark:group-hover:text-indigo-300 transition-colors">
                  Kanban Board
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Drag & drop sprint cards</p>
              </div>
            </button>

            <button
              onClick={() => navigate("/ai")}
              className="p-3.5 rounded-2xl dark:bg-[#121520] bg-white hover:bg-slate-50 dark:hover:bg-[#161a29] border dark:border-white/[0.08] border-slate-200 hover:border-pink-500/30 transition-all text-left group shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-pink-500/15 text-pink-500 flex items-center justify-center">
                  <BrainFlowerIcon className="w-4 h-4" />
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-pink-500 transition-colors" />
              </div>
              <div>
                <h4 className="text-xs font-bold dark:text-white text-slate-900 group-hover:text-pink-500 dark:group-hover:text-pink-300 transition-colors">
                  Nexus² AI
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Ask questions & summarize docs</p>
              </div>
            </button>

            <button
              onClick={() => navigate("/timesheets")}
              className="p-3.5 rounded-2xl dark:bg-[#121520] bg-white hover:bg-slate-50 dark:hover:bg-[#161a29] border dark:border-white/[0.08] border-slate-200 hover:border-amber-500/30 transition-all text-left group shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 transition-colors" />
              </div>
              <div>
                <h4 className="text-xs font-bold dark:text-white text-slate-900 group-hover:text-amber-500 dark:group-hover:text-amber-300 transition-colors">
                  Weekly Timesheets
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Log hours & review allocations</p>
              </div>
            </button>

            <button
              onClick={() => navigate("/docs")}
              className="p-3.5 rounded-2xl dark:bg-[#121520] bg-white hover:bg-slate-50 dark:hover:bg-[#161a29] border dark:border-white/[0.08] border-slate-200 hover:border-cyan-500/30 transition-all text-left group shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-500 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-500 transition-colors" />
              </div>
              <div>
                <h4 className="text-xs font-bold dark:text-white text-slate-900 group-hover:text-cyan-500 dark:group-hover:text-cyan-300 transition-colors">
                  Knowledge Docs
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Architecture specs & guides</p>
              </div>
            </button>
          </div>

          {/* 3. Metrics Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl dark:bg-[#121520] bg-white border dark:border-white/[0.08] border-slate-200 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Active Tasks
                </span>
                <span className="text-3xl font-extrabold dark:text-white text-slate-900 mt-1 block">
                  {assignedCount}
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5 block">Assigned in sprint</span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl dark:bg-[#121520] bg-white border dark:border-white/[0.08] border-slate-200 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Completed
                </span>
                <span className="text-3xl font-extrabold text-emerald-500 mt-1 block">
                  {completedCount}
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5 block">Shipped to testing</span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl dark:bg-[#121520] bg-white border dark:border-white/[0.08] border-slate-200 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Sprint Velocity
                </span>
                <span className="text-3xl font-extrabold text-purple-500 mt-1 block">
                  32 SP
                </span>
                <span className="text-[11px] text-emerald-500 mt-0.5 block font-medium">+18% vs last week</span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-purple-500/15 text-purple-500 flex items-center justify-center">
                <Flame className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl dark:bg-[#121520] bg-white border dark:border-white/[0.08] border-slate-200 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Sprint Health
                </span>
                <span className="text-3xl font-extrabold text-pink-500 mt-1 block">
                  {completionRate > 0 ? `${completionRate}%` : "94%"}
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5 block">0 critical blockers</span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-pink-500/15 text-pink-500 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* 4. Main Two-Column Split: Lineup & Priority Tasks + Recent Activity Stream */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            
            {/* Left Column (2 Cols): Sprint Lineup & Task Work Queue */}
            <div className="lg:col-span-2 rounded-2xl dark:bg-[#121520] bg-white border dark:border-white/[0.08] border-slate-200 flex flex-col overflow-hidden shadow-sm">
              {/* Card Header */}
              <div className="p-4 border-b dark:border-white/[0.08] border-slate-200 flex items-center justify-between dark:bg-[#151926] bg-slate-50/70">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-indigo-500/15 text-indigo-500 flex items-center justify-center">
                    <CheckCircle className="w-3.5 h-3.5" />
                  </span>
                  <h3 className="text-xs font-bold dark:text-white text-slate-800 uppercase tracking-wider">
                    Sprint Lineup & Priority Work ({lineupTasks.length})
                  </h3>
                </div>
                <button
                  onClick={() => navigate("/board")}
                  className="text-xs font-semibold text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors"
                >
                  <span>Open Board</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Quick Add Task Input */}
              <form onSubmit={handleAddQuickTask} className="p-3 border-b dark:border-white/[0.06] border-slate-200 dark:bg-[#0c0e14]/50 bg-slate-50/50 flex items-center gap-2">
                <Plus className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="+ Add quick sprint task... (Press Enter)"
                  value={quickTaskText}
                  onChange={(e) => setQuickTaskText(e.target.value)}
                  className="flex-1 bg-transparent text-xs dark:text-white text-slate-900 placeholder-slate-400 outline-none"
                />
                {quickTaskText.trim() && (
                  <button
                    type="submit"
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-bold"
                  >
                    Add
                  </button>
                )}
              </form>

              {/* Task Items List */}
              <div className="divide-y dark:divide-white/[0.04] divide-slate-100 overflow-y-auto max-h-[380px]">
                {lineupTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => toggleTaskCompleted(t.id)}
                    className="p-3.5 px-4 flex items-center justify-between gap-3 dark:hover:bg-white/[0.03] hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTaskCompleted(t.id);
                        }}
                        className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                          t.completed
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "dark:border-white/20 border-slate-300 dark:hover:border-white/40 hover:border-slate-400"
                        }`}
                      >
                        {t.completed && <CheckCircle2 className="w-3 h-3" />}
                      </button>

                      <span
                        className={`text-xs font-medium truncate ${
                          t.completed
                            ? "line-through text-slate-400"
                            : "dark:text-slate-200 text-slate-800 dark:group-hover:text-white group-hover:text-slate-900"
                        }`}
                      >
                        {t.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="px-1.5 py-0.5 rounded text-[9px] dark:bg-white/5 bg-slate-100 dark:text-slate-400 text-slate-600 border dark:border-white/5 border-slate-200 font-mono">
                        {t.tag}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${t.priorityColor}`}
                      >
                        {t.priority}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">{t.due}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column (1 Col): Real-Time Telemetry & Sprint Activity */}
            <div className="rounded-2xl dark:bg-[#121520] bg-white border dark:border-white/[0.08] border-slate-200 flex flex-col overflow-hidden shadow-sm">
              <div className="p-4 border-b dark:border-white/[0.08] border-slate-200 flex items-center justify-between dark:bg-[#151926] bg-slate-50/70">
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-indigo-500" />
                  <h3 className="text-xs font-bold dark:text-white text-slate-800 uppercase tracking-wider">
                    Sprint Activity Feed
                  </h3>
                </div>
                <span className="text-[10px] text-slate-400 font-mono font-medium">
                  Real-time
                </span>
              </div>

              <div className="p-4 space-y-4 overflow-y-auto max-h-[380px] text-xs divide-y dark:divide-white/[0.04] divide-slate-100">
                <div className="flex items-start gap-3 pt-1">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/15 text-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <GitPullRequest className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="dark:text-slate-300 text-slate-600 leading-snug">
                      <strong className="dark:text-white text-slate-900">Varun S</strong> merged PR #42:{" "}
                      <span className="text-slate-500 font-mono">ClickUp 3.0 Dark Layout</span>
                    </p>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">10 mins ago</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-3">
                  <div className="w-6 h-6 rounded-lg bg-pink-500/15 text-pink-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <BrainFlowerIcon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="dark:text-slate-300 text-slate-600 leading-snug">
                      <strong className="dark:text-white text-slate-900">Nexus² AI</strong> generated sprint summary for{" "}
                      <span className="text-indigo-500"># Phase 2</span>
                    </p>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">24 mins ago</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-3">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="dark:text-slate-300 text-slate-600 leading-snug">
                      <strong className="dark:text-white text-slate-900">Gowtham N</strong> logged 6.5 hours on{" "}
                      <span className="text-slate-500">Neon query pooler</span>
                    </p>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">1 hour ago</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-3">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="dark:text-slate-300 text-slate-600 leading-snug">
                      <strong className="dark:text-white text-slate-900">Harshaa J</strong> completed task{" "}
                      <span className="text-slate-500">Timesheets approval workflow</span>
                    </p>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">2 hours ago</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </PageTransition>
  );
}