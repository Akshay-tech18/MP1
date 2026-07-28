import React, { useState, useEffect } from "react";
import useAuthStore from "../store/useAuthStore";
import useSocketStore from "../store/useSocketStore";
import client from "../api/client";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";
import {
  BarChart3, RefreshCw, AlertCircle, FileCode, CheckCircle, HelpCircle
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
  LOW: "bg-emerald-50 text-emerald-600 border-emerald-100",
  MEDIUM: "bg-blue-50 text-blue-600 border-blue-100",
  HIGH: "bg-amber-50 text-amber-600 border-amber-100",
  CRITICAL: "bg-red-50 text-red-600 border-red-100 animate-pulse"
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

  // Fetch initial dashboard metrics
  const loadAnalytics = async () => {
    if (!currentProject) return;
    try {
      // 1. Fetch dashboard metrics
      const metricsRes = await client.get(`/projects/${currentProject.id}/analytics/dashboard`);
      if (metricsRes.data.success) {
        setDashboardMetrics(metricsRes.data.data);
      }

      // 2. Fetch linked repositories
      const reposRes = await client.get(`/projects/${currentProject.id}/repositories`);
      if (reposRes.data.success) {
        const repoList = reposRes.data.data.repositories;
        setRepositories(repoList);
        if (repoList.length > 0) {
          setSelectedRepoId(repoList[0].id);
        }
      }

      // 3. Fetch Bug Risk Report
      const riskRes = await client.get(`/projects/${currentProject.id}/analytics/bug-risk`);
      if (riskRes.data.success) {
        setBugRiskList(riskRes.data.data.predictions);
      }
    } catch (err) {
      console.error("Error loading analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [currentProject]);

  // Bind socket event to reload report when scan finishes
  useEffect(() => {
    if (!socket || !currentProject) return;

    socket.on(SocketEvent.ML_BATCH_PREDICTION, (data) => {
      // Reload risk list and metrics
      client.get(`/projects/${currentProject.id}/analytics/bug-risk`).then(res => {
        if (res.data.success) {
          setBugRiskList(res.data.data.predictions);
        }
      });
      client.get(`/projects/${currentProject.id}/analytics/dashboard`).then(res => {
        if (res.data.success) {
          setDashboardMetrics(res.data.data);
        }
      });
    });

    return () => {
      socket.off(SocketEvent.ML_BATCH_PREDICTION);
    };
  }, [socket, currentProject]);

  // Trigger scan action
  const handleTriggerScan = async () => {
    if (!selectedRepoId || scanning) return;
    setScanning(true);
    try {
      await client.post(`/projects/${currentProject.id}/ml/scan/${selectedRepoId}`);
      // Reload metrics
      await loadAnalytics();
    } catch (err) {
      console.error(err);
    } finally {
      setScanning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 bg-clickup-light p-8 flex items-center justify-center select-none">
        <div className="flex flex-col items-center gap-2 font-medium text-slate-500 text-sm">
          <div className="w-8 h-8 border-4 border-clickup-primary border-t-transparent rounded-full animate-spin"></div>
          Compiling Analytics & Bug Predictions...
        </div>
      </div>
    );
  }

  // Format Recharts status distribution data
  const pieData = dashboardMetrics
    ? Object.keys(dashboardMetrics.statusDistribution).map(status => ({
        name: status.replace("_", " "),
        value: dashboardMetrics.statusDistribution[status]
      })).filter(item => item.value > 0)
    : [];

  const barData = dashboardMetrics ? dashboardMetrics.commitTrend : [];

  return (
    <div className="flex-1 bg-clickup-light p-8 overflow-y-auto space-y-8 select-none">
      
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-clickup-light-border pb-4 flex-shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-slate-500" />
            Analytics & AI Bug Risk Reports
          </h2>
          <p className="text-xs text-slate-500 mt-1">Review development velocity and ML code safety logs.</p>
        </div>

        {/* Scan Actions */}
        {repositories.length > 0 && (
          <div className="flex items-center gap-3">
            <select
              value={selectedRepoId}
              onChange={(e) => setSelectedRepoId(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-350 rounded text-xs font-semibold text-slate-700 outline-none transition cursor-pointer"
            >
              {repositories.map(repo => (
                <option key={repo.id} value={repo.id}>{repo.name}</option>
              ))}
            </select>

            <button
              onClick={handleTriggerScan}
              disabled={scanning}
              className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-white bg-clickup-primary disabled:bg-clickup-primary/40 hover:bg-clickup-primary/95 rounded transition shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${scanning ? "animate-spin" : ""}`} />
              {scanning ? "Scanning Code..." : "Run AI Scan"}
            </button>
          </div>
        )}
      </div>

      {repositories.length === 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded flex gap-2 items-start text-xs font-medium">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <span>No repository linked to this space. </span>
            <p className="text-[10px] text-slate-500 mt-0.5">Link a repository in project settings, push commits, and run the ML scanner to view prediction rankings.</p>
          </div>
        </div>
      )}

      {/* 1. Visual Charts Row (Only shown if data exists) */}
      {dashboardMetrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Pie: Tasks Status distribution */}
          <div className="bg-white border border-clickup-light-border rounded p-4 shadow-2xs flex flex-col h-80">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">Task Status Distribution</h3>
            {pieData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-400 font-medium">No tasks logged in space</div>
            ) : (
              <ResponsiveContainer width="100%" height="90%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => {
                      const key = entry.name.replace(" ", "_");
                      return <Cell key={`cell-${index}`} fill={PIE_COLORS[key] || "#cbd5e1"} />;
                    })}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} Task(s)`, "Count"]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Bar: 30d Commit trends */}
          <div className="bg-white border border-clickup-light-border rounded p-4 shadow-2xs flex flex-col h-80">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">Developer Commit Velocity (30 Days)</h3>
            {barData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-400 font-medium">No Git commits synced yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tickFormatter={(str) => str.slice(5)} tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
                  <Tooltip formatter={(value) => [`${value} Commit(s)`, "Pushed"]} />
                  <Bar dataKey="count" fill="#7b68ee" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

        </div>
      )}

      {/* 2. ML Bug Risk Ranked Table */}
      <div className="bg-white border border-clickup-light-border rounded shadow-xs overflow-hidden flex flex-col">
        <div className="p-4 border-b border-clickup-light-border flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <FileCode className="w-4 h-4 text-slate-400" />
            AI File Defect Risk Rankings ({bugRiskList.length})
          </h3>
          <span className="text-[10px] text-slate-400 font-medium italic">
            XGBoost (primary model) vs Random Forest (baseline) validation agreement.
          </span>
        </div>

        <div className="overflow-x-auto">
          {bugRiskList.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400 font-medium">
              No bug predictions found. Link a git repository and click "Run AI Scan" to evaluate codebase risks.
            </div>
          ) : (
            <table className="w-full text-left text-xs divide-y divide-clickup-light-border">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 font-semibold">Source File Path</th>
                  <th className="px-6 py-3 font-semibold">Commits / Week</th>
                  <th className="px-6 py-3 font-semibold">Code Churn</th>
                  <th className="px-6 py-3 font-semibold">Contributors</th>
                  <th className="px-6 py-3 font-semibold">Bug Fix Ratio</th>
                  <th className="px-6 py-3 font-semibold">XGBoost Risk (Confidence)</th>
                  <th className="px-6 py-3 font-semibold">RF Risk (Confidence)</th>
                  <th className="px-6 py-3 font-semibold text-center">Agreement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-clickup-light-border font-medium">
                {bugRiskList.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 transition">
                    {/* Path */}
                    <td className="px-6 py-3.5 font-semibold text-slate-800 font-mono select-all">
                      {row.filePath}
                      <span className="text-[9px] text-slate-400 block font-normal">{row.repoName}</span>
                    </td>
                    
                    {/* Commit Frequency */}
                    <td className="px-6 py-3.5 text-slate-700 font-semibold">{row.commitFrequency}</td>
                    
                    {/* Code Churn */}
                    <td className="px-6 py-3.5 text-slate-700 font-mono font-bold">{row.codeChurn} lines</td>
                    
                    {/* Contributors count */}
                    <td className="px-6 py-3.5 text-slate-700">{row.numContributors}</td>
                    
                    {/* Bug fix ratio */}
                    <td className="px-6 py-3.5 text-slate-700">{Math.round(row.bugFixRatio * 100)}%</td>
                    
                    {/* XGBoost risk */}
                    <td className="px-6 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border capitalize ${RISK_BADGES[row.xgboostRisk]}`}>
                        {row.xgboostRisk.toLowerCase()}
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal ml-1">({row.xgboostConfidence}%)</span>
                    </td>

                    {/* Random Forest risk */}
                    <td className="px-6 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] border capitalize bg-slate-100 text-slate-600 border-slate-200`}>
                        {row.rfRisk.toLowerCase()}
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal ml-1">({row.rfConfidence}%)</span>
                    </td>

                    {/* Agreement check */}
                    <td className="px-6 py-3.5 text-center">
                      {row.agreement ? (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 font-bold border border-emerald-200" title="Models agree on risk rating">
                          ✓
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-600 font-bold border border-amber-200" title="Models disagree - check file metrics closely">
                          !
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      
    </div>
  );
}
