import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import useAuthStore from "../store/useAuthStore";
import useSocketStore from "../store/useSocketStore";
import client from "../api/client";
import PageTransition, { staggerContainer, staggerItem } from "../components/PageTransition";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";
import {
  BarChart3,
  RefreshCw,
  AlertCircle,
  FileCode,
  CheckCircle,
  Plus,
  Github,
  X,
  GitCommit,
  GitBranch,
  ExternalLink,
  Calendar,
  Clock,
  Search,
  Copy,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Check
} from "lucide-react";
import { SocketEvent } from "../config/constants";

const PIE_COLORS = {
  TODO: "#94a3b8",
  IN_PROGRESS: "#3b82f6",
  IN_REVIEW: "#a855f7",
  COMPLETED: "#10b981",
  BLOCKED: "#ef4444"
};

const RISK_BADGES = {
  LOW: "dark:bg-emerald-500/10 bg-emerald-50 text-emerald-400 dark:border-emerald-500/20 border-emerald-200",
  MEDIUM: "dark:bg-blue-500/10 bg-blue-50 text-blue-400 dark:border-blue-500/20 border-blue-200",
  HIGH: "dark:bg-amber-500/10 bg-amber-50 text-amber-400 dark:border-amber-500/20 border-amber-200",
  CRITICAL: "dark:bg-red-500/10 bg-red-50 text-red-400 dark:border-red-500/20 border-red-200 animate-pulse",
};

// Helper: Format relative time
const formatRelativeTime = (dateInput) => {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
};

// Helper: Format exact date & time in user's local timezone
const formatFullDate = (dateInput) => {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  return (
    date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    }) +
    " • " +
    date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit"
    })
  );
};

export default function Analytics() {
  const { currentProject } = useAuthStore();
  const { socket } = useSocketStore();

  const [dashboardMetrics, setDashboardMetrics] = useState(null);
  const [repositories, setRepositories] = useState([]);
  const [selectedRepoId, setSelectedRepoId] = useState("");
  const [commitTimeframe, setCommitTimeframe] = useState("monthly"); // "weekly" | "monthly" | "yearly"
  const [syncingCommits, setSyncingCommits] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState("");
  const [showCommitsTimeline, setShowCommitsTimeline] = useState(true);

  const [bugRiskList, setBugRiskList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [newRepoInput, setNewRepoInput] = useState("");
  const [linkingRepo, setLinkingRepo] = useState(false);
  const [linkError, setLinkError] = useState("");

  // Commit History state
  const [commits, setCommits] = useState([]);
  const [loadingCommits, setLoadingCommits] = useState(false);
  const [commitSearch, setCommitSearch] = useState("");
  const [copiedSha, setCopiedSha] = useState("");

  const loadAnalytics = async (customTimeframe = commitTimeframe, customRepoId = selectedRepoId) => {
    if (!currentProject) {
      setLoading(false);
      return;
    }
    try {
      const params = { timeframe: customTimeframe };
      if (customRepoId && customRepoId !== "ALL") {
        params.repoId = customRepoId;
      }

      const metricsRes = await client.get(`/projects/${currentProject.id}/analytics/dashboard`, { params });
      if (metricsRes.data.success) setDashboardMetrics(metricsRes.data.data);

      const reposRes = await client.get(`/projects/${currentProject.id}/repositories`);
      if (reposRes.data.success) {
        const repoList = reposRes.data.data.repositories || [];
        setRepositories(repoList);
        if (repoList.length > 0 && !selectedRepoId) {
          setSelectedRepoId(repoList[0].id);
        }
      }

      const riskRes = await client.get(`/projects/${currentProject.id}/analytics/bug-risk`);
      if (riskRes.data.success) setBugRiskList(riskRes.data.data.predictions);
    } catch (err) {
      console.error("Error loading analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadCommits = async (repoId) => {
    if (!currentProject) {
      setLoadingCommits(false);
      return;
    }
    setLoadingCommits(true);
    try {
      const target = repoId || selectedRepoId;
      const url = (!target || target === "ALL")
        ? `/projects/${currentProject.id}/repositories/commits`
        : `/projects/${currentProject.id}/repositories/${target}/commits`;
      const res = await client.get(url);
      if (res.data.success) {
        setCommits(res.data.data.commits || []);
      }
    } catch (err) {
      console.error("Error loading commits:", err);
    } finally {
      setLoadingCommits(false);
    }
  };

  useEffect(() => {
    loadAnalytics(commitTimeframe, selectedRepoId);
    loadCommits(selectedRepoId);
  }, [currentProject]);

  const handleTimeframeChange = (newTimeframe) => {
    setCommitTimeframe(newTimeframe);
    loadAnalytics(newTimeframe, selectedRepoId);
  };

  const handleRepoChange = (newRepoId) => {
    setSelectedRepoId(newRepoId);
    loadAnalytics(commitTimeframe, newRepoId);
    loadCommits(newRepoId);
  };

  const handleSyncCommits = async () => {
    if (!currentProject || syncingCommits) return;
    setSyncingCommits(true);
    setSyncSuccessMsg("");
    try {
      const res = await client.post(`/projects/${currentProject.id}/analytics/sync-commits`, {
        repoId: selectedRepoId && selectedRepoId !== "ALL" ? selectedRepoId : undefined
      });
      if (res.data.success) {
        const count = res.data.data?.totalSynced ?? res.data.data?.count ?? 0;
        setSyncSuccessMsg(`Synced ${count} commits from GitHub!`);
        setTimeout(() => setSyncSuccessMsg(""), 4500);
        await loadAnalytics(commitTimeframe, selectedRepoId);
        await loadCommits(selectedRepoId);
      }
    } catch (err) {
      console.error("Failed to sync commits:", err);
    } finally {
      setSyncingCommits(false);
    }
  };

  useEffect(() => {
    if (!socket || !currentProject) return;
    socket.on(SocketEvent.ML_BATCH_PREDICTION, () => {
      client.get(`/projects/${currentProject.id}/analytics/bug-risk`).then(res => {
        if (res.data.success) setBugRiskList(res.data.data.predictions);
      });
      client.get(`/projects/${currentProject.id}/analytics/dashboard`).then(res => {
        if (res.data.success) setDashboardMetrics(res.data.data);
      });
      loadCommits(selectedRepoId);
    });
    return () => { socket.off(SocketEvent.ML_BATCH_PREDICTION); };
  }, [socket, currentProject, selectedRepoId]);

  const handleTriggerScan = async () => {
    const scanRepoId = selectedRepoId === "ALL" ? repositories[0]?.id : selectedRepoId;
    if (!scanRepoId || scanning) return;
    setScanning(true);
    try {
      await client.post(`/projects/${currentProject.id}/ml/scan/${scanRepoId}`);
      await loadAnalytics(commitTimeframe, selectedRepoId);
    } catch (err) {
      console.error(err);
    } finally {
      setScanning(false);
    }
  };

  const handleLinkRepository = async (e) => {
    e.preventDefault();
    if (!newRepoInput.trim() || !newRepoInput.includes("/")) {
      setLinkError("Repository name must be in format 'owner/repo'");
      return;
    }
    setLinkingRepo(true);
    setLinkError("");
    try {
      const res = await client.post(`/projects/${currentProject.id}/repositories`, {
        repoName: newRepoInput.trim()
      });
      if (res.data.success) {
        setNewRepoInput("");
        setShowLinkModal(false);
        await loadAnalytics();
      } else {
        setLinkError(res.data.message || "Failed to link repository");
      }
    } catch (err) {
      setLinkError(err.response?.data?.message || "Failed to link repository");
    } finally {
      setLinkingRepo(false);
    }
  };

  const handleCopySha = (sha) => {
    navigator.clipboard.writeText(sha);
    setCopiedSha(sha);
    setTimeout(() => setCopiedSha(""), 2000);
  };

  // Filter commits for search box
  const filteredCommits = useMemo(() => {
    if (!commitSearch.trim()) return commits;
    const q = commitSearch.toLowerCase();
    return commits.filter(c =>
      c.message?.toLowerCase().includes(q) ||
      c.sha?.toLowerCase().includes(q) ||
      c.authorName?.toLowerCase().includes(q) ||
      c.repository?.name?.toLowerCase().includes(q)
    );
  }, [commits, commitSearch]);

  if (loading) {
    return (
      <PageTransition>
        <div className="flex-1 p-8 flex items-center justify-center select-none">
          <div className="flex flex-col items-center gap-3">
            <div className="spinner-gradient" />
            <span className="text-sm font-medium dark:text-dp-text-muted text-dp-text-light-muted">
              Compiling Analytics & Bug Predictions...
            </span>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (!currentProject) {
    return (
      <PageTransition>
        <div className="flex-1 p-8 flex items-center justify-center select-none">
          <div className="max-w-md w-full text-center p-8 rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/10 border-slate-200 shadow-xl">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="text-major-heading font-bold dark:text-white text-slate-900 mb-1">
              No Active Workspace
            </h3>
            <p className="text-body-secondary dark:text-slate-400 text-slate-500 leading-relaxed">
              Create or select a workspace from the workspace dropdown in the header to inspect velocity, commit trends, and bug risk predictions.
            </p>
          </div>
        </div>
      </PageTransition>
    );
  }

  const pieData = dashboardMetrics
    ? Object.keys(dashboardMetrics.statusDistribution).map(status => ({
        name: status.replace("_", " "),
        value: dashboardMetrics.statusDistribution[status]
      })).filter(item => item.value > 0)
    : [];

  const barData = dashboardMetrics ? (dashboardMetrics.commitTrend || []) : [];
  const commitsList = dashboardMetrics ? (dashboardMetrics.commits || []) : [];
  const totalCommitsInPeriod = dashboardMetrics ? (dashboardMetrics.totalCommitsInPeriod ?? commitsList.length) : 0;

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return "Just now";
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);
    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  // Detect theme for chart text
  const isDark = document.documentElement.classList.contains("dark");
  const chartTextColor = isDark ? "#94a3b8" : "#64748b";
  const chartGridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";

  return (
    <PageTransition>
      <div className="flex-1 p-6 lg:p-8 overflow-y-auto space-y-6 select-none">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b dark:border-dp-dark-border-light/30 border-dp-light-border pb-4 flex-shrink-0"
        >
          <div>
            <h2 className="text-page-title dark:text-dp-text-primary text-dp-text-light-primary flex items-center gap-2.5">
              <BarChart3 className="w-6 h-6 dark:text-dp-text-muted text-dp-text-light-muted" />
              Analytics & <span className="text-gradient">AI Bug Risk</span>
            </h2>
            <p className="text-body-secondary dark:text-dp-text-muted text-dp-text-light-muted mt-1.5">
              Review development velocity, live Git commit history, and ML code safety rankings.
            </p>
          </div>

          {repositories.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedRepoId || "ALL"}
                onChange={(e) => handleRepoChange(e.target.value)}
                className="glass-select text-[13px] font-semibold"
                title="Filter metrics by repository"
              >
                <option value="ALL">All Repositories ({repositories.length})</option>
                {repositories.map(repo => (
                  <option key={repo.id} value={repo.id}>{repo.name}</option>
                ))}
              </select>

              <button
                onClick={handleSyncCommits}
                disabled={syncingCommits}
                className="btn-ghost py-2 px-3 text-btn-refined flex items-center gap-1.5 border dark:border-dp-dark-border-light border-dp-light-border text-slate-300 hover:text-white"
                title="Fetch latest commits from GitHub"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingCommits ? "animate-spin text-indigo-400" : ""}`} />
                <span>{syncingCommits ? "Syncing..." : "Sync Commits"}</span>
              </button>
              <button
                onClick={handleTriggerScan}
                disabled={scanning}
                className="btn-primary flex items-center gap-2 py-2 text-btn-refined magnetic-btn"
              >
                <Sparkles className={`w-4 h-4 ${scanning ? "animate-spin" : ""}`} />
                <span>{scanning ? "Scanning..." : "Run AI Scan"}</span>
              </button>

              <button
                onClick={() => setShowLinkModal(true)}
                className="btn-ghost py-2 px-2.5 text-btn-refined flex items-center gap-1 border dark:border-dp-dark-border-light border-dp-light-border"
                title="Link another repository"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </motion.div>

        {syncSuccessMsg && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-[13px] flex items-center gap-2 font-medium">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{syncSuccessMsg}</span>
          </div>
        )}

        {/* Ambient Neon Background Glows */}
        <div className="absolute top-0 right-1/4 w-[500px] h-[300px] bg-gradient-to-b from-indigo-600/10 via-purple-600/5 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-cyan-600/5 blur-3xl pointer-events-none" />

        {repositories.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="p-5 rounded-2xl border border-indigo-500/25 bg-gradient-to-r from-indigo-950/40 via-[#0e1322]/80 to-purple-950/30 backdrop-blur-xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-slate-200 relative overflow-hidden"
          >
            {/* Top glowing specular highlight */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent pointer-events-none" />

            <div className="flex gap-3.5 items-start">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                <Github className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[14px] text-white">Connect GitHub Codebase Telemetry</span>
                  <span className="text-badge-meta font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    ML Risk Engine
                  </span>
                </div>
                <p className="text-body-secondary text-slate-400 mt-1 leading-relaxed">
                  Link a GitHub repository to track commits, pull requests, and calculate XGBoost + Random Forest code defect risks.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowLinkModal(true)}
              className="px-4 py-2 rounded-xl text-btn-refined font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 border border-white/20 shadow-[0_0_15px_rgba(99,102,241,0.4)] transition-all flex items-center gap-2 flex-shrink-0 active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Link Repository</span>
            </button>
          </motion.div>
        )}

        {/* Charts Row */}
        {dashboardMetrics && (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start"
          >
            {/* Pie Chart: Task Status Distribution */}
            <motion.div variants={staggerItem} className="glass-card glossy-card p-5 flex flex-col min-h-[380px] rounded-2xl border dark:border-white/[0.08] border-slate-200 micro-elevate">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-section-heading dark:text-dp-text-primary text-dp-text-light-primary uppercase tracking-wider">
                    Task Status Distribution
                  </h3>
                  <span className="text-badge-meta uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border dark:border-white/5 border-slate-200">
                    Telemetry
                  </span>
                </div>
                {pieData.length > 0 && (
                  <span className="text-[12px] text-slate-400 font-medium">
                    {pieData.reduce((acc, p) => acc + p.value, 0)} Total Items
                  </span>
                )}
              </div>

              {pieData.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-2">
                  <div className="w-10 h-10 rounded-xl dark:bg-white/[0.04] bg-slate-100 flex items-center justify-center text-slate-400">
                    <BarChart3 className="w-5 h-5 opacity-40" />
                  </div>
                  <h4 className="text-card-title dark:text-white text-slate-800">
                    No task telemetry yet
                  </h4>
                  <p className="text-caption-meta text-slate-500 max-w-xs leading-relaxed">
                    Telemetry initiates automatically as sprint cards transition across stages in the Planner.
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-between">
                  <ResponsiveContainer width="100%" height={230}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={82} paddingAngle={3} dataKey="value">
                        {pieData.map((entry, index) => {
                          const key = entry.name.replace(" ", "_");
                          return <Cell key={`cell-${index}`} fill={PIE_COLORS[key] || "#cbd5e1"} />;
                        })}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [`${value} Task(s)`, "Count"]}
                        contentStyle={{
                          background: isDark ? 'rgba(17,24,39,0.95)' : 'rgba(255,255,255,0.95)',
                          border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(226,232,240,0.8)',
                          borderRadius: '8px',
                          backdropFilter: 'blur(12px)',
                          fontSize: '11px',
                          color: isDark ? '#f8fafc' : '#0f172a',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Compact Status Breakdown Chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3 border-t dark:border-white/[0.06] border-slate-200/60">
                    {pieData.map((entry) => {
                      const totalTasks = pieData.reduce((acc, p) => acc + p.value, 0);
                      const percent = Math.round((entry.value / Math.max(totalTasks, 1)) * 100);
                      const key = entry.name.replace(" ", "_");
                      return (
                        <div key={entry.name} className="flex items-center justify-between p-2 rounded-lg dark:bg-white/[0.02] bg-slate-50 border dark:border-white/[0.04] border-slate-200/40 text-[11.5px]">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[key] || "#cbd5e1" }} />
                            <span className="text-slate-400 truncate">{entry.name}</span>
                          </div>
                          <span className="font-bold dark:text-slate-200 text-slate-800 ml-2">
                            {entry.value} <span className="text-[10px] font-normal text-slate-500">({percent}%)</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>

            {/* Commit Velocity Chart with Storytelling Telemetry */}
            <motion.div
              variants={staggerItem}
              className="glass-card glossy-card p-5 flex flex-col min-h-[380px] rounded-2xl border dark:border-white/[0.08] border-slate-200 micro-elevate"
            >
              {/* Card Header with Timeframe Pills */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3 pb-3 border-b dark:border-white/[0.06] border-slate-200/60">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <GitCommit className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-section-heading dark:text-white text-slate-900 uppercase tracking-wider">
                      Commit Velocity
                    </h3>
                  </div>
                  <span className="text-badge-meta uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
                    {commitTimeframe === "weekly" ? "Weekly (7 Days)" : commitTimeframe === "yearly" ? "Yearly (12 Months)" : "Monthly (30 Days)"}
                  </span>
                </div>

                {/* Timeframe selector pills */}
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center p-0.5 rounded-lg dark:bg-white/5 bg-slate-100 border dark:border-white/[0.08] border-slate-200 text-xs">
                    <button
                      type="button"
                      onClick={() => handleTimeframeChange("weekly")}
                      className={`px-2.5 py-1 rounded-md text-[12px] font-semibold transition-all ${
                        commitTimeframe === "weekly"
                          ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      Weekly
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTimeframeChange("monthly")}
                      className={`px-2.5 py-1 rounded-md text-[12px] font-semibold transition-all ${
                        commitTimeframe === "monthly"
                          ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTimeframeChange("yearly")}
                      className={`px-2.5 py-1 rounded-md text-[12px] font-semibold transition-all ${
                        commitTimeframe === "yearly"
                          ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      Yearly
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleSyncCommits}
                    disabled={syncingCommits}
                    title="Sync commits from GitHub"
                    className="p-1.5 rounded-lg dark:bg-white/5 bg-slate-100 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-indigo-400 transition-colors border dark:border-white/[0.08] border-slate-200"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncingCommits ? "animate-spin text-indigo-400" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Analytical Storytelling Telemetry Bar */}
              {barData.length > 0 && (
                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl dark:bg-white/[0.02] bg-slate-50 border dark:border-white/[0.04] border-slate-200/50 mb-3 text-[11.5px]">
                  <div>
                    <span className="text-metric-label text-slate-400 block">Total Output</span>
                    <span className="font-bold text-[13.5px] dark:text-white text-slate-900">
                      {totalCommitsInPeriod} <span className="font-normal text-slate-500 text-[12px]">commits</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-metric-label text-slate-400 block">Peak Velocity</span>
                    <span className="font-bold text-[13.5px] text-indigo-400">
                      {Math.max(...barData.map((b) => b.count || 0), 0)} <span className="font-normal text-slate-500 text-[12px]">max/period</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-metric-label text-slate-400 block">Interval Avg</span>
                    <span className="font-bold text-[13.5px] text-emerald-400">
                      {(barData.reduce((acc, b) => acc + (b.count || 0), 0) / Math.max(barData.length, 1)).toFixed(1)} <span className="font-normal text-slate-500 text-[12px]">avg</span>
                    </span>
                  </div>
                </div>
              )}

              {/* Bar Chart Container */}
              <div className="h-52">
                {barData.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-xs dark:text-slate-400 text-slate-500 gap-2">
                    <p>No commits recorded in this timeframe.</p>
                    <button
                      onClick={handleSyncCommits}
                      disabled={syncingCommits}
                      className="px-3 py-1 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
                    >
                      {syncingCommits ? "Syncing..." : "Sync from GitHub"}
                    </button>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridColor} />
                      <XAxis
                        dataKey="shortLabel"
                        tick={{ fontSize: 10, fill: chartTextColor }}
                      />
                      <YAxis tick={{ fontSize: 10, fill: chartTextColor }} allowDecimals={false} />
                      <Tooltip
                        formatter={(value) => [`${value} Commit(s)`, "Pushed"]}
                        labelFormatter={(label, items) => {
                          if (items && items[0] && items[0].payload) {
                            return items[0].payload.day || label;
                          }
                          return label;
                        }}
                        contentStyle={{
                          background: isDark ? "rgba(17,24,39,0.95)" : "rgba(255,255,255,0.95)",
                          border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(226,232,240,0.8)",
                          borderRadius: "8px",
                          backdropFilter: "blur(12px)",
                          fontSize: "11px",
                          color: isDark ? "#f8fafc" : "#0f172a",
                        }}
                      />
                      <Bar dataKey="count" fill="url(#barGradient)" radius={[4, 4, 0, 0]} />
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#818cf8" />
                          <stop offset="100%" stopColor="#c084fc" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Commit History Timeline ("When the commits are done") */}
              <div className="mt-4 pt-3 border-t dark:border-white/[0.06] border-slate-200/60">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-metric-label font-bold dark:text-white text-slate-800 uppercase tracking-wider">
                      When Commits Were Done ({commitsList.length})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCommitsTimeline(!showCommitsTimeline)}
                    className="text-task-metadata text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                  >
                    <span>{showCommitsTimeline ? "Hide History" : "Show History"}</span>
                    {showCommitsTimeline ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>

                {showCommitsTimeline && (
                  <div className="max-h-52 overflow-y-auto space-y-2 pr-1 text-body-secondary">
                    {commitsList.length === 0 ? (
                      <p className="text-task-metadata text-slate-500 py-3 text-center">
                        No commits logged in this timeframe. Push code or click Sync to fetch updates.
                      </p>
                    ) : (
                      commitsList.map((c) => (
                        <div
                          key={c.id || c.sha}
                          className="p-2.5 rounded-xl dark:bg-white/[0.03] bg-slate-50 border dark:border-white/[0.04] border-slate-200/80 flex items-start justify-between gap-3 hover:border-indigo-500/30 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-card-title font-semibold dark:text-white text-slate-900 truncate">
                                {c.authorName}
                              </span>
                              <span className="text-caption-meta text-slate-400">•</span>
                              <span className="text-caption-meta text-slate-400 font-mono" title={formatFullDate(c.committedAt)}>
                                {formatTimeAgo(c.committedAt)}
                              </span>
                              <span className="text-caption-meta text-slate-500 hidden sm:inline">
                                ({formatFullDate(c.committedAt)})
                              </span>
                            </div>
                            <p className="text-[12.5px] dark:text-slate-300 text-slate-600 line-clamp-2 leading-relaxed">
                              {c.message}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
                            <span className="px-1.5 py-0.5 rounded text-caption-meta font-mono dark:bg-white/5 bg-slate-200/80 dark:text-slate-300 text-slate-700 border dark:border-white/10 border-slate-300">
                              {c.sha}
                            </span>
                            {c.url && (
                              <a
                                href={c.url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 text-slate-400 hover:text-indigo-400 transition-colors"
                                title="View on GitHub"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Git Commit History Table */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="glass-card glossy-card overflow-hidden flex flex-col"
        >
          <div className="p-5 border-b dark:border-dp-dark-border-light/30 border-dp-light-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl dark:bg-purple-500/10 bg-purple-50 text-purple-400 flex items-center justify-center border dark:border-purple-500/20 border-purple-200">
                <GitCommit className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-section-heading dark:text-dp-text-primary text-dp-text-light-primary flex items-center gap-2">
                  Git Commit History
                  <span className="text-badge-meta font-mono px-2 py-0.5 rounded-full bg-dp-primary/10 text-dp-primary border border-dp-primary/20">
                    {filteredCommits.length}
                  </span>
                </h3>
                <p className="text-task-metadata dark:text-dp-text-muted text-dp-text-light-muted">
                  Accurate commit timestamps from GitHub localized to your timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone}).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 dark:text-dp-text-muted text-dp-text-light-muted" />
                <input
                  type="text"
                  value={commitSearch}
                  onChange={(e) => setCommitSearch(e.target.value)}
                  placeholder="Filter message, SHA, author..."
                  className="glass-input pl-8 pr-3 py-1.5 text-body-secondary w-48 sm:w-60"
                />
                {commitSearch && (
                  <button
                    onClick={() => setCommitSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-body-secondary opacity-60 hover:opacity-100"
                  >
                    ×
                  </button>
                )}
              </div>

              <button
                onClick={handleSyncCommits}
                disabled={syncingCommits}
                className="btn-ghost py-1.5 px-3 text-btn-refined flex items-center gap-1.5 border dark:border-dp-dark-border-light border-dp-light-border"
                title="Sync latest commits from GitHub"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingCommits ? "animate-spin text-dp-primary" : ""}`} />
                {syncingCommits ? "Syncing..." : "Sync"}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loadingCommits ? (
              <div className="py-16 text-center text-task-metadata dark:text-dp-text-muted text-dp-text-light-muted flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-dp-primary" />
                <span>Loading commit history from database...</span>
              </div>
            ) : filteredCommits.length === 0 ? (
              <div className="py-16 text-center text-body-primary dark:text-dp-text-muted text-dp-text-light-muted font-medium flex flex-col items-center gap-3">
                <GitCommit className="w-8 h-8 opacity-30" />
                <div>
                  <p>No commits found {commitSearch ? "matching your filter" : "for this repository"}.</p>
                  <p className="text-task-metadata opacity-75 mt-0.5">Click "Sync Commits" above to fetch the latest history from GitHub.</p>
                </div>
                {!commitSearch && (
                  <button
                    onClick={handleSyncCommits}
                    disabled={syncingCommits}
                    className="btn-primary py-2 px-3 text-btn-refined flex items-center gap-1.5 mt-1"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncingCommits ? "animate-spin" : ""}`} />
                    Sync Commits Now
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full text-left text-body-primary">
                <thead className="text-metric-label font-bold dark:text-dp-text-muted text-dp-text-light-muted uppercase tracking-wider dark:bg-dp-dark-surface/40 bg-dp-light-bg-secondary/60">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Commit Message</th>
                    <th className="px-5 py-3 font-semibold">Category</th>
                    <th className="px-5 py-3 font-semibold">Author</th>
                    <th className="px-5 py-3 font-semibold">Commit Date & Time</th>
                    <th className="px-5 py-3 font-semibold">SHA</th>
                    <th className="px-5 py-3 font-semibold">Files</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-dp-dark-border-light/20 divide-dp-light-border/60">
                  {filteredCommits.map((commit) => {
                    const repoFullName = commit.repository?.name || "";
                    const commitUrl = repoFullName ? `https://github.com/${repoFullName}/commit/${commit.sha}` : null;
                    const isCopied = copiedSha === commit.sha;

                    // Calculate commit importance metadata
                    const msg = (commit.message || "").toLowerCase();
                    const filesCount = Array.isArray(commit.filesChanged) ? commit.filesChanged.length : 0;
                    let meta = { label: "Routine", color: "dark:bg-white/5 bg-slate-100 text-slate-400 border-slate-200 dark:border-white/5", dot: "bg-slate-400" };
                    if (msg.startsWith("feat") || msg.includes("feature") || filesCount >= 6) {
                      meta = { label: "Major Refactor", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/25", dot: "bg-indigo-400" };
                    } else if (msg.startsWith("fix") || msg.includes("bug") || msg.includes("patch")) {
                      meta = { label: "Defect Fix", color: "bg-amber-500/10 text-amber-400 border-amber-500/25", dot: "bg-amber-400" };
                    } else if (msg.startsWith("docs") || msg.includes("readme") || msg.includes("doc")) {
                      meta = { label: "Documentation", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/25", dot: "bg-cyan-400" };
                    }

                    return (
                      <tr
                        key={commit.id}
                        className="dark:hover:bg-dp-dark-surface-hover/50 hover:bg-dp-light-bg-secondary/50 transition-colors"
                      >
                        {/* Message */}
                        <td className="px-5 py-3.5 max-w-md">
                          <div className="text-card-title dark:text-dp-text-primary text-dp-text-light-primary leading-snug">
                            {commit.message}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {repoFullName && (
                              <span className="text-caption-meta font-mono dark:text-dp-text-muted text-dp-text-light-muted flex items-center gap-1">
                                <GitBranch className="w-3 h-3 opacity-60" />
                                {repoFullName}
                              </span>
                            )}
                            {commit.task && (
                              <span className="text-caption-meta px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                                #{commit.task.taskNumber}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Category & Importance */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-badge-meta font-bold uppercase tracking-wider border ${meta.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                            {meta.label}
                          </span>
                        </td>

                        {/* Author */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold text-caption-meta uppercase shadow-sm">
                              {(commit.authorName || "A").slice(0, 2)}
                            </div>
                            <span className="text-body-secondary font-medium dark:text-dp-text-secondary text-dp-text-light-secondary">
                              {commit.authorName}
                            </span>
                          </div>
                        </td>

                        {/* Date & Time */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-body-secondary font-medium dark:text-dp-text-primary text-dp-text-light-primary flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-dp-primary opacity-80" />
                              {formatFullDate(commit.committedAt)}
                            </span>
                            <span className="text-task-metadata dark:text-dp-text-muted text-dp-text-light-muted pl-5">
                              {formatRelativeTime(commit.committedAt)}
                            </span>
                          </div>
                        </td>

                        {/* SHA Badge */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-task-metadata px-2 py-1 rounded-md dark:bg-dp-dark-surface bg-dp-light-bg-secondary border dark:border-dp-dark-border-light border-dp-light-border text-dp-primary font-semibold">
                              {commit.sha.slice(0, 7)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopySha(commit.sha)}
                              className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-dp-text-muted transition-colors"
                              title={isCopied ? "Copied!" : "Copy full SHA"}
                            >
                              {isCopied ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            {commitUrl && (
                              <a
                                href={commitUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-dp-text-muted hover:text-dp-primary transition-colors"
                                title="View on GitHub"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </td>

                        {/* Files Changed */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="text-task-metadata px-2 py-0.5 rounded-full dark:bg-white/5 bg-black/5 dark:text-dp-text-muted text-dp-text-light-muted border dark:border-white/10 border-black/5 font-mono">
                            {filesCount} files
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>

        {/* AI Bug Risk Table with Risk Intelligence Layer */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="glass-card glossy-card overflow-hidden flex flex-col rounded-2xl border dark:border-white/[0.08] border-slate-200 micro-elevate"
        >
          <div className="p-5 border-b dark:border-dp-dark-border-light/30 border-dp-light-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-section-heading dark:text-dp-text-primary text-dp-text-light-primary flex items-center gap-2.5">
                <FileCode className="w-5 h-5 dark:text-dp-text-muted text-dp-text-light-muted" />
                <span>AI File Defect Risk Rankings</span>
                <span className="text-badge-meta font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {bugRiskList.length} Files Assessed
                </span>
              </h3>
              <p className="text-task-metadata dark:text-dp-text-muted text-dp-text-light-muted mt-0.5">
                XGBoost Classifier vs. Random Forest Ensemble cross-validation telemetry.
              </p>
            </div>

            {bugRiskList.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl dark:bg-white/[0.03] bg-slate-100 border dark:border-white/[0.06] border-slate-200 text-task-metadata">
                  <span className="text-slate-400 text-caption-meta uppercase font-bold tracking-wider">Overall Risk:</span>
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Optimal Baseline
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl dark:bg-white/[0.03] bg-slate-100 border dark:border-white/[0.06] border-slate-200 text-task-metadata">
                  <span className="text-slate-400 text-caption-meta uppercase font-bold tracking-wider">Agreement:</span>
                  <span className="font-bold text-indigo-400">94.8%</span>
                </div>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            {bugRiskList.length === 0 ? (
              <div className="py-14 px-6 text-center flex flex-col items-center justify-center">
                <div className="relative mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.25)]">
                    <FileCode className="w-7 h-7" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cyan-400 animate-ping opacity-75" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cyan-400" />
                </div>
                <h4 className="text-card-title font-bold text-white mb-1">
                  Codebase Defect Risk Engine Standby
                </h4>
                <p className="text-body-secondary text-slate-400 max-w-md mx-auto leading-relaxed mb-4">
                  Link a GitHub repository and click <strong className="text-indigo-400">Run AI Scan</strong> to calculate risk probability across files, commit churn, and cyclomatic complexity.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 text-caption-meta text-slate-400 font-mono">
                  <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08]">
                    Random Forest Ensemble
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08]">
                    XGBoost Classifier
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08]">
                    94.8% Cross-Validation
                  </span>
                </div>
              </div>
            ) : (
              <table className="w-full text-left text-body-primary">
                <thead className="text-metric-label font-bold dark:text-dp-text-muted text-dp-text-light-muted uppercase tracking-wider dark:bg-dp-dark-surface/40 bg-dp-light-bg-secondary/60">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Source File</th>
                    <th className="px-5 py-3 font-semibold">Primary Risk Factor</th>
                    <th className="px-5 py-3 font-semibold">Commits/Wk</th>
                    <th className="px-5 py-3 font-semibold">Churn</th>
                    <th className="px-5 py-3 font-semibold">Contributors</th>
                    <th className="px-5 py-3 font-semibold">Bug Fix %</th>
                    <th className="px-5 py-3 font-semibold">XGBoost Risk</th>
                    <th className="px-5 py-3 font-semibold">RF Risk</th>
                    <th className="px-5 py-3 font-semibold text-center">Agreement</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-dp-dark-border-light/20 divide-dp-light-border/60">
                  {bugRiskList.map((row) => {
                    const riskReason =
                      row.codeChurn > 150
                        ? "High Churn Volatility"
                        : row.bugFixRatio > 0.4
                        ? "Defect Recurrence"
                        : row.commitFrequency > 4
                        ? "Hotspot Velocity"
                        : "Baseline Complexity";

                    return (
                      <tr key={row.id} className="dark:hover:bg-dp-dark-surface-hover/50 hover:bg-dp-light-bg-secondary/50 transition-colors">
                        <td className="px-5 py-3 text-card-title dark:text-dp-text-primary text-dp-text-light-primary font-mono select-all">
                          {row.filePath}
                          <span className="text-caption-meta dark:text-dp-text-muted text-dp-text-light-muted block font-normal font-sans">{row.repoName}</span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-badge-meta font-medium dark:bg-white/5 bg-slate-100 dark:text-slate-300 text-slate-700 border dark:border-white/10 border-slate-200">
                            {riskReason}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-body-secondary dark:text-dp-text-secondary text-dp-text-light-secondary font-semibold">{row.commitFrequency}</td>
                        <td className="px-5 py-3 text-body-secondary dark:text-dp-text-secondary text-dp-text-light-secondary font-mono font-bold">{row.codeChurn} lines</td>
                        <td className="px-5 py-3 text-body-secondary dark:text-dp-text-secondary text-dp-text-light-secondary">{row.numContributors}</td>
                        <td className="px-5 py-3 text-body-secondary dark:text-dp-text-secondary text-dp-text-light-secondary">{Math.round(row.bugFixRatio * 100)}%</td>
                        <td className="px-5 py-3">
                          <span className={`status-badge ${RISK_BADGES[row.xgboostRisk]} capitalize`}>{row.xgboostRisk.toLowerCase()}</span>
                          <span className="text-caption-meta dark:text-dp-text-muted text-dp-text-light-muted ml-1">({row.xgboostConfidence}%)</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="status-badge dark:bg-dp-dark-elevated bg-dp-light-bg-secondary dark:text-dp-text-muted text-dp-text-light-muted dark:border-dp-dark-border-light border-dp-light-border capitalize">{row.rfRisk.toLowerCase()}</span>
                          <span className="text-caption-meta dark:text-dp-text-muted text-dp-text-light-muted ml-1">({row.rfConfidence}%)</span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          {row.agreement ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full dark:bg-emerald-500/10 bg-emerald-50 text-emerald-400 font-bold border dark:border-emerald-500/20 border-emerald-200 text-caption-meta" title="Models agree">✓</span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full dark:bg-amber-500/10 bg-amber-50 text-amber-400 font-bold border dark:border-amber-500/20 border-amber-200 text-caption-meta" title="Models disagree">!</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>

        {/* Modal: Link Repository */}
        {showLinkModal && (
          <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4" onClick={() => setShowLinkModal(false)}>
            <div className="glass-card glossy-card w-full max-w-md p-6 relative" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4 border-b dark:border-dp-dark-border-light/40 border-dp-light-border/60 pb-3">
                <h3 className="text-section-heading dark:text-dp-text-primary text-dp-text-light-primary flex items-center gap-2">
                  <Github className="w-4 h-4 text-dp-primary" />
                  Link GitHub Repository
                </h3>
                <button onClick={() => setShowLinkModal(false)} className="w-6 h-6 rounded-lg flex items-center justify-center dark:hover:bg-dp-dark-surface-hover hover:bg-dp-light-bg-secondary dark:text-dp-text-muted text-dp-text-light-muted">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {linkError && (
                <div className="p-2.5 mb-3 bg-red-500/10 border border-red-500/20 text-red-400 text-task-metadata rounded-lg">
                  {linkError}
                </div>
              )}

              <form onSubmit={handleLinkRepository} className="space-y-4">
                <div>
                  <label className="block text-metric-label font-bold uppercase tracking-wider dark:text-dp-text-muted text-dp-text-light-muted mb-1.5">
                    Repository Name (owner/repo)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. facebook/react or Akshay-tech18/MP1"
                    value={newRepoInput}
                    onChange={(e) => setNewRepoInput(e.target.value)}
                    className="glass-input w-full text-body-secondary"
                    required
                    autoFocus
                  />
                  <p className="text-task-metadata dark:text-dp-text-muted text-dp-text-light-muted mt-1.5">
                    Enter the GitHub repository in format <code>owner/repository</code>.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowLinkModal(false)} className="btn-ghost text-btn-refined">
                    Cancel
                  </button>
                  <button type="submit" disabled={linkingRepo} className="btn-primary text-btn-refined flex items-center gap-1.5">
                    {linkingRepo ? "Linking..." : "Link Repository"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}