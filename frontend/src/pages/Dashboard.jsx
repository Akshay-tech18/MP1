import React, { useState, useEffect } from "react";
import useAuthStore from "../store/useAuthStore";
import client from "../api/client";
import {
  CheckCircle,
  Clock,
  MessageSquare,
  TrendingUp,
  FolderDot,
  Calendar,
  Activity,
  AlertCircle
} from "lucide-react";

export default function Dashboard() {
  const { user, currentProject } = useAuthStore();
  const [personalStats, setPersonalStats] = useState(null);
  const [dashboardMetrics, setDashboardMetrics] = useState(null);
  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      if (!currentProject) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // 1. Fetch User Personal Stats
        const personalStatsRes = await client.get("/users/me/stats");
        if (personalStatsRes.data.success) {
          setPersonalStats(personalStatsRes.data.data.stats);
        }

        // 2. Fetch Project Dashboard Metrics (recent activity, status counters)
        const metricsRes = await client.get(`/projects/${currentProject.id}/analytics/dashboard`);
        if (metricsRes.data.success) {
          setDashboardMetrics(metricsRes.data.data);
        }

        // 3. Fetch Tasks assigned to user
        const tasksRes = await client.get(`/projects/${currentProject.id}/tasks`, {
          params: { assigneeId: user.id }
        });
        if (tasksRes.data.success) {
          setMyTasks(tasksRes.data.data.tasks);
        }
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [currentProject, user]);

  if (!currentProject) {
    return (
      <div className="flex-1 bg-clickup-light p-10 flex flex-col items-center justify-center text-center select-none">
        <div className="w-16 h-16 rounded-full bg-clickup-primary/10 text-clickup-primary flex items-center justify-center mb-4">
          <FolderDot className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Welcome to DevPilot!</h2>
        <p className="text-slate-500 text-sm mt-2 max-w-sm leading-relaxed">
          Create a new space or select an existing project space in the sidebar to view metrics, plan boards, and join discussions.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 bg-clickup-light p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 font-medium text-slate-500 text-sm">
          <div className="w-8 h-8 border-4 border-clickup-primary border-t-transparent rounded-full animate-spin"></div>
          Loading Space Dashboard...
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Tasks Assigned",
      value: personalStats?.totalTasksAssigned ?? 0,
      icon: Clock,
      color: "text-blue-500 bg-blue-50 border-blue-100"
    },
    {
      title: "Completed",
      value: personalStats?.tasksCompleted ?? 0,
      icon: CheckCircle,
      color: "text-emerald-500 bg-emerald-50 border-emerald-100"
    },
    {
      title: "Comments Posted",
      value: personalStats?.commentsPosted ?? 0,
      icon: MessageSquare,
      color: "text-purple-500 bg-purple-50 border-purple-100"
    },
    {
      title: "Completion Rate",
      value: `${personalStats?.completionRate ?? 0}%`,
      icon: TrendingUp,
      color: "text-pink-500 bg-pink-50 border-pink-100"
    }
  ];

  return (
    <div className="flex-1 bg-clickup-light p-8 overflow-y-auto space-y-8 select-none">
      {/* Welcome Banner */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">Welcome back, {user?.name}!</h2>
        <p className="text-xs text-slate-500 mt-1">Here's a summary of your activity in the "{currentProject.name}" Space.</p>
      </div>

      {/* 1. Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className={`p-4 border rounded bg-white flex items-center justify-between shadow-xs ${card.color}`}>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">{card.title}</span>
                <span className="text-2xl font-bold text-slate-850 mt-1 block">{card.value}</span>
              </div>
              <div className="p-2.5 rounded-full bg-white shadow-xs"><Icon className="w-5 h-5" /></div>
            </div>
          );
        })}
      </div>

      {/* 2. Main columns split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: My Tasks List (2/3 width) */}
        <div className="lg:col-span-2 bg-white border border-clickup-light-border rounded shadow-xs flex flex-col">
          <div className="p-4 border-b border-clickup-light-border flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-slate-400" />
              My Assigned Tasks ({myTasks.length})
            </h3>
          </div>
          
          <div className="p-4 divide-y divide-clickup-light-border overflow-y-auto max-h-96">
            {myTasks.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 font-medium">
                No tasks assigned to you in this space.
              </div>
            ) : (
              myTasks.map((t) => (
                <div key={t.id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0 hover:bg-slate-50/50 px-2 rounded transition">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="text-[10px] font-bold text-slate-400 font-mono flex-shrink-0">TASK-{t.taskNumber}</span>
                    <span className="text-xs font-semibold text-slate-800 truncate">{t.title}</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                      t.priority === "CRITICAL" ? "bg-red-50 text-red-500 border border-red-100" :
                      t.priority === "HIGH" ? "bg-amber-50 text-amber-600 border border-amber-100" :
                      t.priority === "MEDIUM" ? "bg-blue-50 text-blue-500 border border-blue-100" :
                      "bg-slate-100 text-slate-500 border border-slate-200"
                    }`}>
                      {t.priority}
                    </span>
                    <span className={`text-[9px] font-semibold px-2 py-0.5 rounded capitalize ${
                      t.status === "COMPLETED" ? "bg-emerald-50 text-emerald-600" :
                      t.status === "IN_REVIEW" ? "bg-purple-50 text-purple-600" :
                      t.status === "IN_PROGRESS" ? "bg-blue-50 text-blue-600" :
                      t.status === "BLOCKED" ? "bg-red-50 text-red-600" :
                      "bg-slate-100 text-slate-600"
                    }`}>
                      {t.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Recent Activities Log (1/3 width) */}
        <div className="bg-white border border-clickup-light-border rounded shadow-xs flex flex-col">
          <div className="p-4 border-b border-clickup-light-border flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-400" />
              Recent Space Activity
            </h3>
          </div>
          
          <div className="p-4 overflow-y-auto max-h-96 space-y-4">
            {(!dashboardMetrics || !dashboardMetrics.recentActivity || dashboardMetrics.recentActivity.length === 0) ? (
              <div className="py-12 text-center text-xs text-slate-400 font-medium">
                No activity logged in this space yet.
              </div>
            ) : (
              dashboardMetrics.recentActivity.map((log) => {
                const date = new Date(log.createdAt);
                const formattedTime = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                return (
                  <div key={log.id} className="flex gap-2 text-xs items-start">
                    <img
                      src={log.user.avatar}
                      alt=""
                      className="w-6 h-6 rounded-full bg-slate-100 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-800 leading-normal">
                        <strong className="text-slate-900 font-semibold">{log.user.name}</strong>{" "}
                        {log.actionType === "TASK_CREATED" && `created a task`}
                        {log.actionType === "TASK_STATUS_CHANGED" && `moved a task to ${log.metadata.newStatus}`}
                        {log.actionType === "TASK_ASSIGNEE_CHANGED" && `reassigned a task to ${log.metadata.newAssignee}`}
                        {log.actionType === "COMMIT_LINKED" && `pushed a commit referencing a task`}
                        {log.actionType === "MEMBER_ADDED" && `added ${log.metadata.name} to the space`}
                        {log.actionType === "SPRINT_COMPLETED" && `completed sprint "${log.metadata.name}"`}
                        {" — "}
                        <span className="text-slate-500 font-medium">"{log.metadata.title || log.metadata.name || ""}"</span>
                      </p>
                      <span className="text-[10px] text-slate-400 mt-0.5 block font-medium">{formattedTime}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
