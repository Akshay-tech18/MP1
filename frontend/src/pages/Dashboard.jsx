import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import useAuthStore from "../store/useAuthStore";
import useSocketStore from "../store/useSocketStore";
import client from "../api/client";
import PageTransition from "../components/PageTransition";
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
  Loader2,
  UserCheck,
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

// Relative time helper
function formatRelativeTime(dateStr) {
  if (!dateStr) return "Just now";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Activity badge styling helper
function getActivityMeta(actionType) {
  switch (actionType) {
    case "TASK_CREATED":
      return {
        label: "Task Created",
        badge: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
        icon: Plus,
        iconBg: "bg-indigo-500/15 text-indigo-400 border-indigo-500/25",
      };
    case "TASK_STATUS_CHANGED":
      return {
        label: "Status Updated",
        badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        icon: CheckCircle2,
        iconBg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
      };
    case "MEMBER_ADDED":
      return {
        label: "Member Added",
        badge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
        icon: UserCheck,
        iconBg: "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
      };
    case "MEMBER_REMOVED":
      return {
        label: "Member Removed",
        badge: "bg-rose-500/20 text-rose-300 border-rose-500/30",
        icon: X,
        iconBg: "bg-rose-500/15 text-rose-400 border-rose-500/25",
      };
    case "SPRINT_CREATED":
      return {
        label: "Sprint Created",
        badge: "bg-purple-500/20 text-purple-300 border-purple-500/30",
        icon: Flame,
        iconBg: "bg-purple-500/15 text-purple-400 border-purple-500/25",
      };
    case "COMMIT_SYNCED":
      return {
        label: "Git Commit",
        badge: "bg-blue-500/20 text-blue-300 border-blue-500/30",
        icon: GitPullRequest,
        iconBg: "bg-blue-500/15 text-blue-400 border-blue-500/25",
      };
    default:
      return {
        label: actionType?.replace(/_/g, " ") || "Activity",
        badge: "dark:bg-white/10 bg-slate-200 text-slate-400 border-slate-300",
        icon: Activity,
        iconBg: "dark:bg-white/10 bg-slate-100 text-slate-400",
      };
  }
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, currentProject } = useAuthStore();
  const { socket } = useSocketStore();

  const [projectDetails, setProjectDetails] = useState(null);
  const [dashboardMetrics, setDashboardMetrics] = useState(null);
  const [workspaceTasks, setWorkspaceTasks] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [docsCount, setDocsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showBanner, setShowBanner] = useState(() => !sessionStorage.getItem("dp_hide_banner"));
  const [quickTaskText, setQuickTaskText] = useState("");
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  // Load all real data strictly for the current workspace
  const loadDashboardData = useCallback(async () => {
    if (!currentProject?.id) {
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch Project Details (members, description, deadline)
      const projRes = await client.get(`/projects/${currentProject.id}`);
      if (projRes.data?.success) {
        setProjectDetails(projRes.data.data.project);
      }

      // 2. Fetch Project Analytics & Dashboard Metrics (real recentActivity, statusDistribution)
      const metricsRes = await client.get(`/projects/${currentProject.id}/analytics/dashboard`);
      if (metricsRes.data?.success) {
        setDashboardMetrics(metricsRes.data.data);
      }

      // 3. Fetch all tasks for this workspace
      const tasksRes = await client.get(`/projects/${currentProject.id}/tasks`);
      if (tasksRes.data?.success) {
        setWorkspaceTasks(tasksRes.data.data.tasks || []);
      }

      // 4. Fetch sprints for this workspace
      const sprintsRes = await client.get(`/projects/${currentProject.id}/sprints`);
      if (sprintsRes.data?.success) {
        setSprints(sprintsRes.data.data.sprints || []);
      }

      // 5. Fetch documents count for this workspace
      const docsRes = await client.get(`/projects/${currentProject.id}/documents`);
      if (docsRes.data?.success) {
        setDocsCount(docsRes.data.data.documents?.length || 0);
      }
    } catch (err) {
      console.error("Dashboard data load error:", err);
    } finally {
      setLoading(false);
    }
  }, [currentProject]);

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

  // Toggle task completed via backend API
  const toggleTaskCompleted = async (task) => {
    if (!currentProject || !task?.id) return;
    const newStatus = task.status === "COMPLETED" ? "TODO" : "COMPLETED";

    // Optimistic UI update
    setWorkspaceTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
    );

    try {
      await client.patch(`/projects/${currentProject.id}/tasks/${task.id}`, {
        status: newStatus,
      });
      loadDashboardData();
    } catch (err) {
      console.error("Failed to update task status:", err);
      // Revert on error
      setWorkspaceTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t))
      );
    }
  };

  // Add quick task to database
  const handleAddQuickTask = async (e) => {
    e.preventDefault();
    if (!quickTaskText.trim() || !currentProject || isSubmittingTask) return;

    setIsSubmittingTask(true);
    try {
      const res = await client.post(`/projects/${currentProject.id}/tasks`, {
        title: quickTaskText.trim(),
        status: "TODO",
        priority: "MEDIUM",
      });

      if (res.data?.success && res.data?.data?.task) {
        setQuickTaskText("");
        await loadDashboardData();
      }
    } catch (err) {
      console.error("Failed to add quick task:", err);
    } finally {
      setIsSubmittingTask(false);
    }
  };

  // Derived real workspace metrics
  const totalTasks = workspaceTasks.length;
  const completedTasks = workspaceTasks.filter((t) => t.status === "COMPLETED");
  const completedCount = completedTasks.length;
  const activeTasks = workspaceTasks.filter((t) => t.status !== "COMPLETED");
  const activeTasksCount = activeTasks.length;
  const inProgressCount = workspaceTasks.filter((t) => t.status === "IN_PROGRESS").length;
  const urgentCount = workspaceTasks.filter((t) => t.priority === "URGENT").length;
  const highCount = workspaceTasks.filter((t) => t.priority === "HIGH").length;
  const membersCount = projectDetails?.members?.length || 1;
  const completionRate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  const activeSprint =
    dashboardMetrics?.activeSprint ||
    sprints.find((s) => s.status === "ACTIVE") ||
    sprints[0] ||
    null;
  const sprintName = activeSprint ? activeSprint.name : "Sprint Backlog";
  const recentActivities = dashboardMetrics?.recentActivity || [];

  return (
    <PageTransition>
      <div className="flex-1 flex flex-col h-full overflow-hidden dark:bg-[#080808] bg-[#f8fafc] dark:text-white text-slate-900 select-none transition-colors duration-200">
        
        {/* ══════ Top Notification Banner ══════ */}
        {showBanner && (
          <div className="bg-gradient-to-r from-purple-700 via-indigo-600 to-indigo-700 px-4 py-2 text-xs font-medium text-white flex items-center justify-between shadow-sm flex-shrink-0">
            <div className="flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 text-purple-200" />
              <span>Workspace Active • Live telemetry and task synchronization active.</span>
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

        {/* ══════ Team Space Subnav Tabs ══════ */}
        <div className="h-10 border-b dark:border-white/[0.08] border-slate-200 px-4 flex items-center justify-between dark:bg-[#0d0d10] bg-white flex-shrink-0 text-xs transition-colors">
          <div className="flex items-center gap-3 h-full overflow-x-auto scrollbar-none">
            {/* Space Identifier */}
            <div className="flex items-center gap-1.5 font-bold dark:text-white text-slate-800 pr-2 border-r dark:border-white/10 border-slate-200">
              <span className="w-4 h-4 rounded bg-indigo-600 flex items-center justify-center text-[10px]">
                <Users className="w-2.5 h-2.5 text-white" />
              </span>
              <span>{currentProject?.name || "Workspace"}</span>
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
              className="flex items-center gap-1.5 font-semibold dark:text-white text-slate-900 border-b-2 border-indigo-500 h-full px-1"
            >
              <Info className="w-3.5 h-3.5 text-indigo-500" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => navigate("/board")}
              className="flex items-center gap-1.5 text-slate-500 dark:hover:text-white hover:text-slate-900 h-full px-1 transition-colors"
            >
              <KanbanSquare className="w-3.5 h-3.5 text-slate-400" />
              <span>Board</span>
            </button>

            <button
              onClick={() => navigate("/teams")}
              className="flex items-center gap-1.5 text-slate-500 dark:hover:text-white hover:text-slate-900 h-full px-1 transition-colors"
            >
              <Users className="w-3.5 h-3.5 text-slate-400" />
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
        </div>

        {/* ══════ Scrollable Dashboard Body ══════ */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* 1. Header: Greeting + Real Workspace Telemetry */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-page-title dark:text-white text-slate-900 flex items-center gap-2">
                <span>Welcome back,</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500">
                  {user?.name || "Engineer"}!
                </span>
              </h2>
              
              {/* Workspace Status Pulse (Dynamic strictly for current workspace) */}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap text-caption-meta dark:text-slate-400 text-slate-500">
                <span className="flex items-center gap-1.5 font-semibold dark:text-slate-200 text-slate-700">
                  <span className="signal-dot signal-dot-success animate-pulse" />
                  {sprintName}
                </span>
                <span className="opacity-40">•</span>
                <span><strong className="dark:text-slate-200 text-slate-800">{activeTasksCount}</strong> active tasks</span>
                <span className="opacity-40">•</span>
                <span className={urgentCount > 0 ? "text-rose-400 font-semibold" : "text-amber-400 font-medium"}>
                  {urgentCount > 0 ? `${urgentCount} urgent` : `${highCount} high priority`}
                </span>
                <span className="opacity-40">•</span>
                <span>{completedCount} completed</span>
                <span className="opacity-40">•</span>
                <span className="font-semibold text-indigo-400">
                  {completionRate}% progress
                </span>
              </div>
            </div>

            {/* Sprint Status Badge */}
            <div className="flex items-center gap-3 dark:bg-[#121214] bg-white border dark:border-white/[0.08] border-slate-200 p-2 px-3.5 rounded-xl text-xs shadow-sm flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold dark:text-white text-slate-800 text-[13px]">{sprintName}</span>
              </div>
              <span className="dark:text-slate-600 text-slate-300">|</span>
              <div className="flex items-center gap-1.5 text-slate-500 text-[12px]">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  {activeSprint?.endDate
                    ? `Ends ${new Date(activeSprint.endDate).toLocaleDateString([], { month: "short", day: "numeric" })}`
                    : "Active Workspace"}
                </span>
              </div>
              <span className="dark:text-slate-600 text-slate-300">|</span>
              <span className="font-mono text-emerald-500 font-semibold flex items-center gap-1 text-[12px]">
                <TrendingUp className="w-3 h-3" />
                {completionRate}% Complete
              </span>
            </div>
          </div>

          {/* 2. Quick Jump Feature Cards (Real numbers) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              onClick={() => navigate("/board")}
              className="p-3.5 rounded-2xl dark:bg-[#121214] bg-white hover:bg-slate-50 dark:hover:bg-[#18181b] border dark:border-white/[0.08] border-slate-200 hover:border-indigo-500/30 transition-all text-left group shadow-sm flex flex-col justify-between micro-elevate"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center">
                  <KanbanSquare className="w-4 h-4" />
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
              </div>
              <div>
                <h4 className="text-card-title dark:text-white text-slate-900 group-hover:text-indigo-500 dark:group-hover:text-indigo-300 transition-colors">
                  Kanban Board
                </h4>
                <div className="flex items-center gap-1.5 mt-1 text-[11.5px] text-slate-400">
                  <span className="font-semibold dark:text-slate-300 text-slate-600">{activeTasksCount} active tasks</span>
                  <span>•</span>
                  <span className="text-indigo-400 font-medium">{inProgressCount} in progress</span>
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate("/ai")}
              className="p-3.5 rounded-2xl dark:bg-[#121214] bg-white hover:bg-slate-50 dark:hover:bg-[#18181b] border dark:border-white/[0.08] border-slate-200 hover:border-pink-500/30 transition-all text-left group shadow-sm flex flex-col justify-between micro-elevate"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-pink-500/15 text-pink-500 flex items-center justify-center">
                  <BrainFlowerIcon className="w-4 h-4" />
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-pink-500 transition-colors" />
              </div>
              <div>
                <h4 className="text-card-title dark:text-white text-slate-900 group-hover:text-pink-500 dark:group-hover:text-pink-300 transition-colors">
                  Nexus² AI
                </h4>
                <div className="flex items-center gap-1.5 mt-1 text-[11.5px] text-slate-400">
                  <span className="font-semibold dark:text-slate-300 text-slate-600">{docsCount} docs indexed</span>
                  <span>•</span>
                  <span className="text-emerald-400">RAG Ready</span>
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate("/teams")}
              className="p-3.5 rounded-2xl dark:bg-[#121214] bg-white hover:bg-slate-50 dark:hover:bg-[#18181b] border dark:border-white/[0.08] border-slate-200 hover:border-amber-500/30 transition-all text-left group shadow-sm flex flex-col justify-between micro-elevate"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 transition-colors" />
              </div>
              <div>
                <h4 className="text-card-title dark:text-white text-slate-900 group-hover:text-amber-500 dark:group-hover:text-amber-300 transition-colors">
                  Workspace Team
                </h4>
                <div className="flex items-center gap-1.5 mt-1 text-[11.5px] text-slate-400">
                  <span className="font-semibold dark:text-slate-300 text-slate-600">{membersCount} members</span>
                  <span>•</span>
                  <span className="text-emerald-500 font-medium">Collaborating</span>
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate("/docs")}
              className="p-3.5 rounded-2xl dark:bg-[#121214] bg-white hover:bg-slate-50 dark:hover:bg-[#18181b] border dark:border-white/[0.08] border-slate-200 hover:border-cyan-500/30 transition-all text-left group shadow-sm flex flex-col justify-between micro-elevate"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-500 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-500 transition-colors" />
              </div>
              <div>
                <h4 className="text-card-title dark:text-white text-slate-900 group-hover:text-cyan-500 dark:group-hover:text-cyan-300 transition-colors">
                  Knowledge Docs
                </h4>
                <div className="flex items-center gap-1.5 mt-1 text-[11.5px] text-slate-400">
                  <span className="font-semibold dark:text-slate-300 text-slate-600">{docsCount} workspace docs</span>
                  <span>•</span>
                  <span className="text-cyan-400">pgvector sync</span>
                </div>
              </div>
            </button>
          </div>

          {/* 3. Metric Cards with Real Numbers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl dark:bg-[#121214] bg-white border dark:border-white/[0.08] border-slate-200 shadow-sm relative overflow-hidden micro-elevate">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-metric-label text-slate-400 block">
                    Active Tasks
                  </span>
                  <span className="text-metric-val dark:text-white text-slate-900 mt-1 block">
                    {activeTasksCount}
                  </span>
                  <span className="text-metric-support text-slate-400 mt-0.5 block">Pending in workspace</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl dark:bg-[#121214] bg-white border dark:border-white/[0.08] border-slate-200 shadow-sm relative overflow-hidden micro-elevate">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-metric-label text-slate-400 block">
                    Completed
                  </span>
                  <span className="text-metric-val text-emerald-500 mt-1 block">
                    {completedCount}
                  </span>
                  <span className="text-metric-support text-slate-400 mt-0.5 block">Finished tasks</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl dark:bg-[#121214] bg-white border dark:border-white/[0.08] border-slate-200 shadow-sm relative overflow-hidden micro-elevate">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-metric-label text-slate-400 block">
                    Completion Velocity
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-metric-val dark:text-white text-slate-900 block">
                      {completionRate}%
                    </span>
                  </div>
                  <span className="text-metric-support text-slate-400 mt-0.5 block">{completedCount} of {totalTasks} tasks done</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-500 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl dark:bg-[#121214] bg-white border dark:border-white/[0.08] border-slate-200 shadow-sm relative overflow-hidden micro-elevate">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-metric-label text-slate-400 block">
                    Workspace Health
                  </span>
                  <span className="text-metric-val text-indigo-400 mt-1 block">
                    {urgentCount === 0 ? "Optimal" : "Attention"}
                  </span>
                  <span className="text-metric-support text-slate-400 mt-0.5 block">
                    {urgentCount} urgent blocker{urgentCount !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-pink-500/15 text-pink-500 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* 4. Main Operational Command Center: Real Lineup & Real Activity Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            
            {/* Left Column (2 Cols): Real Workspace Lineup & Work Queue */}
            <div className="lg:col-span-2 rounded-2xl dark:bg-[#121214] bg-white border dark:border-white/[0.08] border-slate-200 flex flex-col overflow-hidden shadow-sm">
              {/* Card Header */}
              <div className="p-3.5 px-4 border-b dark:border-white/[0.08] border-slate-200 flex items-center justify-between dark:bg-[#161619] bg-slate-50/70">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-indigo-500/15 text-indigo-500 flex items-center justify-center">
                    <CheckCircle className="w-3.5 h-3.5" />
                  </span>
                  <h3 className="text-section-heading dark:text-white text-slate-800">
                    Workspace Lineup ({workspaceTasks.length})
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigate("/board")}
                    className="text-[13px] font-semibold text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors"
                  >
                    <span>Open Board</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Quick Add Task Input (Saves directly to Database) */}
              <form onSubmit={handleAddQuickTask} className="p-2.5 px-3 border-b dark:border-white/[0.06] border-slate-200 dark:bg-[#080808]/50 bg-slate-50/50 flex items-center gap-2">
                {isSubmittingTask ? (
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                ) : (
                  <Plus className="w-4 h-4 text-slate-400" />
                )}
                <input
                  type="text"
                  placeholder="+ Add quick task to this workspace... (Press Enter)"
                  value={quickTaskText}
                  onChange={(e) => setQuickTaskText(e.target.value)}
                  disabled={isSubmittingTask}
                  className="flex-1 bg-transparent text-[13px] dark:text-white text-slate-900 placeholder-slate-400 outline-none disabled:opacity-50"
                />
                {quickTaskText.trim() && (
                  <button
                    type="submit"
                    disabled={isSubmittingTask}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-bold disabled:opacity-50"
                  >
                    Add
                  </button>
                )}
              </form>

              {/* Task Items List strictly from DB */}
              <div className="divide-y dark:divide-white/[0.04] divide-slate-100 overflow-y-auto max-h-[380px]">
                {workspaceTasks.length === 0 && !loading && (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    <Inbox className="w-6 h-6 mx-auto mb-2 opacity-50" />
                    <p className="font-semibold dark:text-slate-300 text-slate-700">No tasks in this workspace yet</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Type above to add a quick task or create one on the Board.</p>
                  </div>
                )}

                {workspaceTasks.map((t) => {
                  const isCompleted = t.status === "COMPLETED";
                  const edgeClass = t.priority === "URGENT"
                    ? "priority-edge-urgent"
                    : t.priority === "HIGH"
                    ? "priority-edge-high"
                    : isCompleted
                    ? "priority-edge-completed"
                    : "priority-edge-normal";

                  const priorityColor = t.priority === "URGENT"
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                    : t.priority === "HIGH"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                    : "bg-blue-500/20 text-blue-300 border-blue-500/30";

                  return (
                    <div
                      key={t.id}
                      onClick={() => toggleTaskCompleted(t)}
                      className={`p-3 px-4 flex items-center justify-between gap-3 dark:hover:bg-white/[0.03] hover:bg-slate-50 transition-colors cursor-pointer group ${edgeClass} ${
                        isCompleted ? "opacity-60" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTaskCompleted(t);
                          }}
                          className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all flex-shrink-0 ${
                            isCompleted
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : "dark:border-white/20 border-slate-300 dark:hover:border-white/40 hover:border-slate-400"
                          }`}
                        >
                          {isCompleted && <CheckCircle2 className="w-3 h-3" />}
                        </button>

                        <div className="min-w-0 flex-1">
                          <span
                            className={`text-card-title truncate block ${
                              isCompleted
                                ? "line-through text-slate-400"
                                : "dark:text-slate-200 text-slate-800 dark:group-hover:text-white group-hover:text-slate-900"
                            }`}
                          >
                            {t.title}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Status tag */}
                        <span className="px-1.5 py-0.5 rounded text-badge-meta dark:bg-white/5 bg-slate-100 dark:text-slate-400 text-slate-600 border dark:border-white/5 border-slate-200 font-mono">
                          {t.status}
                        </span>
                        
                        {/* Priority Badge */}
                        <span
                          className={`px-1.5 py-0.5 rounded text-badge-meta font-bold uppercase tracking-wider border ${priorityColor}`}
                        >
                          {t.priority}
                        </span>
                        
                        {/* Due status */}
                        {t.dueDate && (
                          <span className="text-task-metadata font-medium px-1.5 py-0.5 rounded text-slate-400">
                            {new Date(t.dueDate).toLocaleDateString([], { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column (1 Col): Real-Time Telemetry & Real Database Activity Feed */}
            <div className="rounded-2xl dark:bg-[#121214] bg-white border dark:border-white/[0.08] border-slate-200 flex flex-col overflow-hidden shadow-sm">
              <div className="p-3.5 px-4 border-b dark:border-white/[0.08] border-slate-200 flex items-center justify-between dark:bg-[#161619] bg-slate-50/70">
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-indigo-500" />
                  <h3 className="text-section-heading dark:text-white text-slate-800">
                    Workspace Activity Feed
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 text-caption-meta text-slate-400 font-mono">
                  <span className="signal-dot signal-dot-success animate-pulse" />
                  <span>Live</span>
                </div>
              </div>

              {/* Real Activity Logs from PostgreSQL */}
              <div className="p-3.5 space-y-3 overflow-y-auto max-h-[380px] text-xs divide-y dark:divide-white/[0.04] divide-slate-100">
                {recentActivities.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    <Activity className="w-6 h-6 mx-auto mb-2 opacity-50" />
                    <p className="font-semibold dark:text-slate-300 text-slate-700">No activity recorded yet</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Activities appear automatically as team members interact.</p>
                  </div>
                )}

                {recentActivities.map((act) => {
                  const meta = getActivityMeta(act.actionType);
                  const Icon = meta.icon;
                  const userName = act.user?.name || "Team Member";

                  // Extract action summary
                  let description = "";
                  if (act.actionType === "TASK_STATUS_CHANGED") {
                    description = `moved "${act.metadata?.title || "Task"}" to ${act.metadata?.newStatus || "updated"}`;
                  } else if (act.actionType === "TASK_CREATED") {
                    description = `created task "${act.metadata?.title || "New task"}"`;
                  } else if (act.actionType === "MEMBER_ADDED") {
                    description = `added ${act.metadata?.name || "member"} as ${act.metadata?.role || "collaborator"}`;
                  } else if (act.actionType === "MEMBER_REMOVED") {
                    description = `removed ${act.metadata?.name || "member"} from workspace`;
                  } else {
                    description = act.metadata?.title || act.metadata?.name || act.actionType?.toLowerCase().replace(/_/g, " ");
                  }

                  return (
                    <div key={act.id} className="flex items-start gap-3 pt-2.5 first:pt-0">
                      <div className={`w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm ${meta.iconBg}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-badge-meta uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border ${meta.badge}`}>
                            {meta.label}
                          </span>
                        </div>
                        <p className="dark:text-slate-300 text-slate-600 leading-snug mt-1 text-[12.5px]">
                          <strong className="dark:text-white text-slate-900">{userName}</strong>{" "}
                          <span>{description}</span>
                        </p>
                        <span className="text-caption-meta text-slate-400 mt-0.5 block">
                          {formatRelativeTime(act.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </div>
    </PageTransition>
  );
}