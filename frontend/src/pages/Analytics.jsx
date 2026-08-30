import React, { useState, useEffect } from "react";
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
  BarChart3, RefreshCw, AlertCircle, FileCode, CheckCircle
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

export default function Analytics() {
  const { currentProject } = useAuthStore();
  const { socket } = useSocketStore();

  const [dashboardMetrics, setDashboardMetrics] = useState(null);
  const [repositories, setRepositories] = useState([]);
  const [selectedRepoId, setSelectedRepoId] = useState("");
  const [bugRiskList, setBugRiskList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const loadAnalytics = async () => {
    if (!currentProject) return;
    try {
      const metricsRes = await client.get(`/projects/${currentProject.id}/analytics/dashboard`);
      if (metricsRes.data.success) setDashboardMetrics(metricsRes.data.data);

      const reposRes = await client.get(`/projects/${currentProject.id}/repositories`);
      if (reposRes.data.success) {
        const repoList = reposRes.data.data.repositories;
        setRepositories(repoList);
        if (repoList.length > 0) setSelectedRepoId(repoList[0].id);
      }

      const riskRes = await client.get(`/projects/${currentProject.id}/analytics/bug-risk`);
      if (riskRes.data.success) setBugRiskList(riskRes.data.data.predictions);
    } catch (err) {
      console.error("Error loading analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAnalytics(); }, [currentProject]);

  useEffect(() => {
    if (!socket || !currentProject) return;
    socket.on(SocketEvent.ML_BATCH_PREDICTION, () => {
      client.get(`/projects/${currentProject.id}/analytics/bug-risk`).then(res => {
        if (res.data.success) setBugRiskList(res.data.data.predictions);
      });
      client.get(`/projects/${currentProject.id}/analytics/dashboard`).then(res => {
        if (res.data.success) setDashboardMetrics(res.data.data);
      });
    });
    return () => { socket.off(SocketEvent.ML_BATCH_PREDICTION); };
  }, [socket, currentProject]);

  const handleTriggerScan = async () => {
    if (!selectedRepoId || scanning) return;
    setScanning(true);
    try {
      await client.post(`/projects/${currentProject.id}/ml/scan/${selectedRepoId}`);
      await loadAnalytics();
    } catch (err) { console.error(err); }
    finally { setScanning(false); }
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="flex-1 p-8 flex items-center justify-center select-none">
          <div className="flex flex-col items-center gap-3">
            <div className="spinner-gradient" />
            <span className="text-sm font-medium dark:text-dp-text-muted text-dp-text-light-muted">Compiling Analytics & Bug Predictions...</span>
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

  const barData = dashboardMetrics ? dashboardMetrics.commitTrend : [];

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
          className="flex items-center justify-between border-b dark:border-dp-dark-border-light/30 border-dp-light-border pb-4 flex-shrink-0"
        >
          <div>
            <h2 className="font-display text-2xl font-bold dark:text-dp-text-primary text-dp-text-light-primary flex items-center gap-2.5" style={{ letterSpacing: '-0.03em' }}>
              <BarChart3 className="w-6 h-6 dark:text-dp-text-muted text-dp-text-light-muted" />
              Analytics & <span className="text-gradient">AI Bug Risk</span>
            </h2>
            <p className="text-sm dark:text-dp-text-muted text-dp-text-light-muted mt-1.5">Review development velocity and ML code safety logs.</p>
          </div>

          {repositories.length > 0 && (
            <div className="flex items-center gap-2">
              <select value={selectedRepoId} onChange={(e) => setSelectedRepoId(e.target.value)} className="glass-select">
                {repositories.map(repo => (<option key={repo.id} value={repo.id}>{repo.name}</option>))}
              </select>
              <button onClick={handleTriggerScan} disabled={scanning}
                className="btn-primary flex items-center gap-2 py-2 text-[13px] magnetic-btn">
                <RefreshCw className={`w-4 h-4 ${scanning ? "animate-spin" : ""}`} />
                {scanning ? "Scanning..." : "Run AI Scan"}
              </button>
            </div>
          )}
        </motion.div>

        {repositories.length === 0 && (
          <div className="p-4 dark:bg-dp-warning/10 bg-dp-warning/5 border dark:border-amber-500/20 border-amber-200 dark:text-amber-300 text-amber-700 rounded-xl flex gap-2.5 items-start text-sm font-medium">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <span>No repository linked to this space.</span>
              <p className="text-[12px] dark:text-dp-text-muted text-dp-text-light-muted mt-1">Link a repository, push commits, and run the ML scanner to view prediction rankings.</p>
            </div>
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
            {/* Pie Chart */}
            <motion.div variants={staggerItem} className="glass-card glossy-card p-4 flex flex-col h-80">
              <h3 className="text-[13px] font-display font-bold dark:text-dp-text-primary text-dp-text-light-primary uppercase tracking-wider mb-3">Task Status Distribution</h3>
              {pieData.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-xs dark:text-dp-text-muted text-dp-text-light-muted">No tasks logged</div>
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

            {/* Bar Chart */}
            <motion.div variants={staggerItem} className="glass-card glossy-card p-4 flex flex-col h-80">
              <h3 className="text-[13px] font-display font-bold dark:text-dp-text-primary text-dp-text-light-primary uppercase tracking-wider mb-3">Commit Velocity (30 Days)</h3>
              {barData.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-xs dark:text-dp-text-muted text-dp-text-light-muted">No commits synced</div>
              ) : (
                <ResponsiveContainer width="100%" height="90%">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridColor} />
                    <XAxis dataKey="day" tickFormatter={(str) => str.slice(5)} tick={{ fontSize: 9, fill: chartTextColor }} />
                    <YAxis tick={{ fontSize: 9, fill: chartTextColor }} allowDecimals={false} />
                    <Tooltip
                      formatter={(value) => [`${value} Commit(s)`, "Pushed"]}
                      contentStyle={{
                        background: isDark ? 'rgba(17,24,39,0.9)' : 'rgba(255,255,255,0.95)',
                        border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(226,232,240,0.8)',
                        borderRadius: '8px',
                        backdropFilter: 'blur(12px)',
                        fontSize: '11px',
                        color: isDark ? '#f8fafc' : '#0f172a',
                      }}
                    />
                    <Bar dataKey="count" fill="url(#barGradient)" radius={[4, 4, 0, 0]} />
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
      </div>
    </PageTransition>
  );
}