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
  BarChart3, RefreshCw, AlertCircle, FileCode, CheckCircle, Plus, Github, X,
  GitCommit, GitBranch, ExternalLink, Calendar, Search, Copy, Check
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
  const [bugRiskList, setBugRiskList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [syncingCommits, setSyncingCommits] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState("");
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [newRepoInput, setNewRepoInput] = useState("");
  const [linkingRepo, setLinkingRepo] = useState(false);
  const [linkError, setLinkError] = useState("");

  // Commit History & Velocity state
  const [commits, setCommits] = useState([]);
  const [loadingCommits, setLoadingCommits] = useState(false);
  const [commitSearch, setCommitSearch] = useState("");
  const [velocityRange, setVelocityRange] = useState("active"); // "active" | "30d" | "90d"
  const [copiedSha, setCopiedSha] = useState("");

  const loadAnalytics = async () => {
    if (!currentProject) return;
    try {
      const metricsRes = await client.get(`/projects/${currentProject.id}/analytics/dashboard`);
      if (metricsRes.data.success) setDashboardMetrics(metricsRes.data.data);

      const reposRes = await client.get(`/projects/${currentProject.id}/repositories`);
      if (reposRes.data.success) {
        const repoList = reposRes.data.data.repositories;
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
    if (!currentProject) return;
    setLoadingCommits(true);
    try {
      const url = (!repoId || repoId === "ALL")
        ? `/projects/${currentProject.id}/repositories/commits`
        : `/projects/${currentProject.id}/repositories/${repoId}/commits`;
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
    loadAnalytics();
  }, [currentProject]);

  useEffect(() => {
    if (currentProject && (selectedRepoId || repositories.length > 0)) {
      loadCommits(selectedRepoId || repositories[0]?.id);
    }
  }, [selectedRepoId, currentProject, repositories.length]);

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
      await loadAnalytics();
    } catch (err) {
      console.error(err);
    } finally {
      setScanning(false);
    }
  };

  const handleSyncCommits = async () => {
    const targetRepo = selectedRepoId === "ALL" ? repositories[0]?.id : selectedRepoId;
    if (!targetRepo || syncingCommits) return;
    setSyncingCommits(true);
    setSyncSuccessMsg("");
    try {
      const res = await client.post(`/projects/${currentProject.id}/repositories/${targetRepo}/sync`);
      if (res.data.success) {
        setSyncSuccessMsg(res.data.message || "Commits synced successfully!");
        await loadAnalytics();
        await loadCommits(selectedRepoId);
        setTimeout(() => setSyncSuccessMsg(""), 5000);
      }
    } catch (err) {
      console.error("Sync commits failed:", err);
      alert(err.response?.data?.message || "Failed to sync commits from GitHub");
    } finally {
      setSyncingCommits(false);
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

  // Group commits for velocity chart accurately in client local timezone
  const barData = useMemo(() => {
    if (!commits || commits.length === 0) return [];

    if (velocityRange === "active") {
      // Group by user's local calendar day
      const map = {};
      const sorted = [...commits].sort((a, b) => new Date(a.committedAt) - new Date(b.committedAt));

      sorted.forEach(c => {
        const d = new Date(c.committedAt);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const key = `${year}-${month}-${day}`;

        const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const fullDate = d.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric"
        });

        if (!map[key]) {
          map[key] = { day: key, label, fullDate, count: 0 };
        }
        map[key].count++;
      });

      return Object.values(map);
    }

    // Sequential 30-day or 90-day window ending today
    const days = velocityRange === "90d" ? 90 : 30;
    const now = new Date();
    const map = {};

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const key = `${year}-${month}-${day}`;
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const fullDate = d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric"
      });
      map[key] = { day: key, label, fullDate, count: 0 };
    }

    commits.forEach(c => {
      const d = new Date(c.committedAt);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const key = `${year}-${month}-${day}`;
      if (map[key]) {
        map[key].count++;
      }
    });

    return Object.values(map);
  }, [commits, velocityRange]);

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

  const pieData = dashboardMetrics
    ? Object.keys(dashboardMetrics.statusDistribution).map(status => ({
        name: status.replace("_", " "),
        value: dashboardMetrics.statusDistribution[status]
      })).filter(item => item.value > 0)
    : [];

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
          className="flex items-center justify-between border-b dark:border-dp-dark-border-light/30 border-dp-light-border pb-4 flex-shrink-0"
        >
          <div>
            <h2 className="font-display text-2xl font-bold dark:text-dp-text-primary text-dp-text-light-primary flex items-center gap-2.5" style={{ letterSpacing: '-0.03em' }}>
              <BarChart3 className="w-6 h-6 dark:text-dp-text-muted text-dp-text-light-muted" />
              Analytics & <span className="text-gradient">AI Bug Risk</span>
            </h2>
            <p className="text-sm dark:text-dp-text-muted text-dp-text-light-muted mt-1.5">
              Review development velocity, live Git commit history, and ML code safety rankings.
            </p>
          </div>

          {repositories.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                value={selectedRepoId}
                onChange={(e) => setSelectedRepoId(e.target.value)}
                className="glass-select text-xs"
              >
                <option value="ALL">All Repositories ({repositories.length})</option>
                {repositories.map(repo => (
                  <option key={repo.id} value={repo.id}>{repo.name}</option>
                ))}
              </select>

              <button
                onClick={handleSyncCommits}
                disabled={syncingCommits}
                className="btn-ghost flex items-center gap-2 py-2 px-3 text-[13px] magnetic-btn border dark:border-dp-dark-border-light border-dp-light-border dark:bg-dp-dark-surface/80 bg-white"
                title="Fetch latest commits from GitHub"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingCommits ? "animate-spin text-dp-primary" : ""}`} />
                {syncingCommits ? "Syncing..." : "Sync Commits"}
              </button>

              <button
                onClick={handleTriggerScan}
                disabled={scanning}
                className="btn-primary flex items-center gap-2 py-2 text-[13px] magnetic-btn"
              >
                <BarChart3 className="w-4 h-4" />
                {scanning ? "Scanning..." : "Run AI Scan"}
              </button>

              <button
                onClick={() => setShowLinkModal(true)}
                className="btn-ghost py-2 px-2.5 text-xs flex items-center gap-1 border dark:border-dp-dark-border-light border-dp-light-border"
                title="Link another repository"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </motion.div>

        {syncSuccessMsg && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center gap-2 font-medium">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{syncSuccessMsg}</span>
          </div>
        )}

        {repositories.length === 0 && (
          <div className="p-4 dark:bg-dp-warning/10 bg-dp-warning/5 border dark:border-amber-500/20 border-amber-200 dark:text-amber-300 text-amber-700 rounded-xl flex items-center justify-between gap-4 text-sm font-medium">
            <div className="flex gap-2.5 items-start">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <span>No repository linked to this space.</span>
                <p className="text-[12px] dark:text-dp-text-muted text-dp-text-light-muted mt-1">
                  Link a GitHub repository to track commits, pull requests, and calculate AI bug defect risks.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowLinkModal(true)}
              className="btn-primary py-2 px-3.5 text-xs flex items-center gap-1.5 flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Link Repository
            </button>
          </div>
        )}

        {/* Charts Row */}
        {dashboardMetrics && (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 lg:grid-cols-2 gap-4"
          >
            {/* Pie Chart: Task Status */}
            <motion.div variants={staggerItem} className="glass-card glossy-card p-4 flex flex-col h-80">
              <h3 className="text-[13px] font-display font-bold dark:text-dp-text-primary text-dp-text-light-primary uppercase tracking-wider mb-3">
                Task Status Distribution
              </h3>
              {pieData.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-xs dark:text-dp-text-muted text-dp-text-light-muted">
                  No tasks logged
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="90%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {pieData.map((entry, index) => {
                        const key = entry.name.replace(" ", "_");
                        return <Cell key={`cell-${index}`} fill={PIE_COLORS[key] || "#cbd5e1"} />;
                      })}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`${value} Task(s)`, "Count"]}
                      contentStyle={{
                        background: isDark ? 'rgba(17,24,39,0.9)' : 'rgba(255,255,255,0.95)',
                        border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(226,232,240,0.8)',
                        borderRadius: '8px',
                        backdropFilter: 'blur(12px)',
                        fontSize: '11px',
                        color: isDark ? '#f8fafc' : '#0f172a',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px', color: chartTextColor }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </motion.div>

            {/* Bar Chart: Commit Velocity with Accurate Dates & Range Filters */}
            <motion.div variants={staggerItem} className="glass-card glossy-card p-4 flex flex-col h-80">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-[13px] font-display font-bold dark:text-dp-text-primary text-dp-text-light-primary uppercase tracking-wider">
                    Commit Velocity
                  </h3>
                  <span className="text-[11px] dark:text-dp-text-muted text-dp-text-light-muted">
                    {velocityRange === "active" ? "Active Commit Days" : velocityRange === "30d" ? "Last 30 Days" : "Last 90 Days"} ({barData.reduce((acc, b) => acc + b.count, 0)} commits)
                  </span>
                </div>
                <div className="flex items-center gap-1 bg-black/10 dark:bg-white/5 p-0.5 rounded-lg border dark:border-dp-dark-border-light/40 border-dp-light-border/60">
                  <button
                    type="button"
                    onClick={() => setVelocityRange("active")}
                    className={`px-2 py-1 text-[10px] font-medium rounded-md transition-all ${
                      velocityRange === "active"
                        ? "bg-dp-primary text-white shadow-sm"
                        : "dark:text-dp-text-muted text-dp-text-light-muted hover:text-white"
                    }`}
                  >
                    Active Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setVelocityRange("30d")}
                    className={`px-2 py-1 text-[10px] font-medium rounded-md transition-all ${
                      velocityRange === "30d"
                        ? "bg-dp-primary text-white shadow-sm"
                        : "dark:text-dp-text-muted text-dp-text-light-muted hover:text-white"
                    }`}
                  >
                    30 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setVelocityRange("90d")}
                    className={`px-2 py-1 text-[10px] font-medium rounded-md transition-all ${
                      velocityRange === "90d"
                        ? "bg-dp-primary text-white shadow-sm"
                        : "dark:text-dp-text-muted text-dp-text-light-muted hover:text-white"
                    }`}
                  >
                    90 Days
                  </button>
                </div>
              </div>

              {barData.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-xs dark:text-dp-text-muted text-dp-text-light-muted gap-2">
                  <GitCommit className="w-6 h-6 opacity-30" />
                  <span>No commits in selected timeframe</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="85%">
                  <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridColor} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 9, fill: chartTextColor }}
                      interval={velocityRange === "active" ? 0 : "preserveStartEnd"}
                    />
                    <YAxis tick={{ fontSize: 9, fill: chartTextColor }} allowDecimals={false} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div
                              style={{
                                background: isDark ? "rgba(17,24,39,0.95)" : "rgba(255,255,255,0.98)",
                                border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(226,232,240,0.8)",
                                borderRadius: "8px",
                                padding: "8px 12px",
                                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
                                fontSize: "11px",
                                color: isDark ? "#f8fafc" : "#0f172a",
                              }}
                            >
                              <p className="font-semibold text-dp-primary">{data.fullDate || data.day}</p>
                              <p className="mt-1 flex items-center gap-1 font-medium">
                                <span className="w-2 h-2 rounded-full bg-pink-500 inline-block"></span>
                                {data.count} {data.count === 1 ? "Commit" : "Commits"} pushed
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="count" fill="url(#barGradient)" radius={[4, 4, 0, 0]} maxBarSize={45} />
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7c3aed" />
                        <stop offset="100%" stopColor="#ec4899" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              )}
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
                <h3 className="font-display font-bold text-[15px] dark:text-dp-text-primary text-dp-text-light-primary flex items-center gap-2">
                  Git Commit History
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-dp-primary/10 text-dp-primary border border-dp-primary/20">
                    {filteredCommits.length}
                  </span>
                </h3>
                <p className="text-[12px] dark:text-dp-text-muted text-dp-text-light-muted">
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
                  className="glass-input pl-8 pr-3 py-1.5 text-xs w-48 sm:w-60"
                />
                {commitSearch && (
                  <button
                    onClick={() => setCommitSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs opacity-60 hover:opacity-100"
                  >
                    ×
                  </button>
                )}
              </div>

              <button
                onClick={handleSyncCommits}
                disabled={syncingCommits}
                className="btn-ghost py-1.5 px-3 text-xs flex items-center gap-1.5 border dark:border-dp-dark-border-light border-dp-light-border"
                title="Sync latest commits from GitHub"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingCommits ? "animate-spin text-dp-primary" : ""}`} />
                {syncingCommits ? "Syncing..." : "Sync"}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loadingCommits ? (
              <div className="py-16 text-center text-xs dark:text-dp-text-muted text-dp-text-light-muted flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-dp-primary" />
                <span>Loading commit history from database...</span>
              </div>
            ) : filteredCommits.length === 0 ? (
              <div className="py-16 text-center text-sm dark:text-dp-text-muted text-dp-text-light-muted font-medium flex flex-col items-center gap-3">
                <GitCommit className="w-8 h-8 opacity-30" />
                <div>
                  <p>No commits found {commitSearch ? "matching your filter" : "for this repository"}.</p>
                  <p className="text-xs opacity-75 mt-0.5">Click "Sync Commits" above to fetch the latest history from GitHub.</p>
                </div>
                {!commitSearch && (
                  <button
                    onClick={handleSyncCommits}
                    disabled={syncingCommits}
                    className="btn-primary py-2 px-3 text-xs flex items-center gap-1.5 mt-1"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncingCommits ? "animate-spin" : ""}`} />
                    Sync Commits Now
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="text-[11px] font-bold dark:text-dp-text-muted text-dp-text-light-muted uppercase tracking-wider dark:bg-dp-dark-surface/40 bg-dp-light-bg-secondary/60">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Commit Message</th>
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

                    return (
                      <tr
                        key={commit.id}
                        className="dark:hover:bg-dp-dark-surface-hover/50 hover:bg-dp-light-bg-secondary/50 transition-colors"
                      >
                        {/* Message */}
                        <td className="px-5 py-3.5 max-w-md">
                          <div className="font-semibold text-[13px] dark:text-dp-text-primary text-dp-text-light-primary leading-snug">
                            {commit.message}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {repoFullName && (
                              <span className="text-[10px] font-mono dark:text-dp-text-muted text-dp-text-light-muted flex items-center gap-1">
                                <GitBranch className="w-3 h-3 opacity-60" />
                                {repoFullName}
                              </span>
                            )}
                            {commit.task && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                                #{commit.task.taskNumber}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Author */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold text-[10px] uppercase shadow-sm">
                              {(commit.authorName || "A").slice(0, 2)}
                            </div>
                            <span className="font-medium text-xs dark:text-dp-text-secondary text-dp-text-light-secondary">
                              {commit.authorName}
                            </span>
                          </div>
                        </td>

                        {/* Date & Time */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-medium text-xs dark:text-dp-text-primary text-dp-text-light-primary flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-dp-primary opacity-80" />
                              {formatFullDate(commit.committedAt)}
                            </span>
                            <span className="text-[11px] dark:text-dp-text-muted text-dp-text-light-muted pl-5">
                              {formatRelativeTime(commit.committedAt)}
                            </span>
                          </div>
                        </td>

                        {/* SHA Badge */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs px-2 py-1 rounded-md dark:bg-dp-dark-surface bg-dp-light-bg-secondary border dark:border-dp-dark-border-light border-dp-light-border text-dp-primary font-semibold">
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
                          <span className="text-xs px-2 py-0.5 rounded-full dark:bg-white/5 bg-black/5 dark:text-dp-text-muted text-dp-text-light-muted border dark:border-white/10 border-black/5 font-mono">
                            {Array.isArray(commit.filesChanged) ? commit.filesChanged.length : 0} files
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

        {/* Bug Risk Table */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="glass-card glossy-card overflow-hidden flex flex-col"
        >
          <div className="p-5 border-b dark:border-dp-dark-border-light/30 border-dp-light-border flex items-center justify-between">
            <h3 className="font-display font-bold text-[15px] dark:text-dp-text-primary text-dp-text-light-primary flex items-center gap-2.5">
              <FileCode className="w-5 h-5 dark:text-dp-text-muted text-dp-text-light-muted" />
              AI File Defect Risk Rankings ({bugRiskList.length})
            </h3>
            <span className="text-[12px] dark:text-dp-text-muted text-dp-text-light-muted italic">
              XGBoost vs Random Forest validation agreement
            </span>
          </div>

          <div className="overflow-x-auto">
            {bugRiskList.length === 0 ? (
              <div className="py-16 text-center text-sm dark:text-dp-text-muted text-dp-text-light-muted font-medium">
                No predictions found. Link a repo and click "Run AI Scan" to evaluate codebase risks.
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="text-[12px] font-bold dark:text-dp-text-muted text-dp-text-light-muted uppercase tracking-wider dark:bg-dp-dark-surface/40 bg-dp-light-bg-secondary/60">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Source File</th>
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
                  {bugRiskList.map((row) => (
                    <tr key={row.id} className="dark:hover:bg-dp-dark-surface-hover/50 hover:bg-dp-light-bg-secondary/50 transition-colors">
                      <td className="px-5 py-3 font-semibold dark:text-dp-text-primary text-dp-text-light-primary font-mono select-all">
                        {row.filePath}
                        <span className="text-[9px] dark:text-dp-text-muted text-dp-text-light-muted block font-normal font-sans">{row.repoName}</span>
                      </td>
                      <td className="px-5 py-3 dark:text-dp-text-secondary text-dp-text-light-secondary font-semibold">{row.commitFrequency}</td>
                      <td className="px-5 py-3 dark:text-dp-text-secondary text-dp-text-light-secondary font-mono font-bold">{row.codeChurn} lines</td>
                      <td className="px-5 py-3 dark:text-dp-text-secondary text-dp-text-light-secondary">{row.numContributors}</td>
                      <td className="px-5 py-3 dark:text-dp-text-secondary text-dp-text-light-secondary">{Math.round(row.bugFixRatio * 100)}%</td>
                      <td className="px-5 py-3">
                        <span className={`status-badge ${RISK_BADGES[row.xgboostRisk]} capitalize`}>{row.xgboostRisk.toLowerCase()}</span>
                        <span className="text-[10px] dark:text-dp-text-muted text-dp-text-light-muted ml-1">({row.xgboostConfidence}%)</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="status-badge dark:bg-dp-dark-elevated bg-dp-light-bg-secondary dark:text-dp-text-muted text-dp-text-light-muted dark:border-dp-dark-border-light border-dp-light-border capitalize">{row.rfRisk.toLowerCase()}</span>
                        <span className="text-[10px] dark:text-dp-text-muted text-dp-text-light-muted ml-1">({row.rfConfidence}%)</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        {row.agreement ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full dark:bg-emerald-500/10 bg-emerald-50 text-emerald-400 font-bold border dark:border-emerald-500/20 border-emerald-200 text-[10px]" title="Models agree">✓</span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full dark:bg-amber-500/10 bg-amber-50 text-amber-400 font-bold border dark:border-amber-500/20 border-amber-200 text-[10px]" title="Models disagree">!</span>
                        )}
                      </td>
                    </tr>
                  ))}
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
                <h3 className="font-display font-bold text-sm dark:text-dp-text-primary text-dp-text-light-primary flex items-center gap-2">
                  <Github className="w-4 h-4 text-dp-primary" />
                  Link GitHub Repository
                </h3>
                <button onClick={() => setShowLinkModal(false)} className="w-6 h-6 rounded-lg flex items-center justify-center dark:hover:bg-dp-dark-surface-hover hover:bg-dp-light-bg-secondary dark:text-dp-text-muted text-dp-text-light-muted">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {linkError && (
                <div className="p-2.5 mb-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg">
                  {linkError}
                </div>
              )}

              <form onSubmit={handleLinkRepository} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider dark:text-dp-text-muted text-dp-text-light-muted mb-1.5">
                    Repository Name (owner/repo)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. facebook/react or Akshay-tech18/MP1"
                    value={newRepoInput}
                    onChange={(e) => setNewRepoInput(e.target.value)}
                    className="glass-input w-full text-xs"
                    required
                    autoFocus
                  />
                  <p className="text-[11px] dark:text-dp-text-muted text-dp-text-light-muted mt-1.5">
                    Enter the GitHub repository in format <code>owner/repository</code>.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowLinkModal(false)} className="btn-ghost text-xs">
                    Cancel
                  </button>
                  <button type="submit" disabled={linkingRepo} className="btn-primary text-xs flex items-center gap-1.5">
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