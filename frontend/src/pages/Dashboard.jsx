import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import useAuthStore from "../store/useAuthStore";
import client from "../api/client";
import PageTransition, { staggerContainer, staggerItem } from "../components/PageTransition";
import {
  CheckCircle,
  Clock,
  MessageSquare,
  TrendingUp,
  FolderDot,
  Activity,
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

  // Empty state
  if (!currentProject) {
    return (
      <PageTransition>
        <div className="flex-1 p-12 flex flex-col items-center justify-center text-center select-none">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="w-20 h-20 rounded-2xl bg-dp-primary/10 text-dp-primary flex items-center justify-center mb-5 mx-auto">
              <FolderDot className="w-10 h-10" />
            </div>
            <h2 className="font-display text-2xl font-bold dark:text-dp-text-primary text-dp-text-light-primary">
              Welcome to DevPilot!
            </h2>
            <p className="dark:text-dp-text-muted text-dp-text-light-muted text-[15px] mt-3 max-w-md leading-relaxed">
              Create a new space or select an existing project space in the sidebar to view metrics, plan boards, and join discussions.
            </p>
          </motion.div>
        </div>
      </PageTransition>
    );
  }

  // Loading
  if (loading) {
    return (
      <PageTransition>
        <div className="flex-1 p-10 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="spinner-gradient" />
            <span className="text-sm font-medium dark:text-dp-text-muted text-dp-text-light-muted">
              Loading Space Dashboard...
            </span>
          </div>
        </div>
      </PageTransition>
    );
  }

  const statCards = [
    {
      title: "Tasks Assigned",
      value: personalStats?.totalTasksAssigned ?? 0,
      icon: Clock,
      color: "text-blue-400",
      bgColor: "dark:bg-blue-500/10 bg-blue-50",
      borderColor: "dark:border-blue-500/20 border-blue-100",
    },
    {
      title: "Completed",
      value: personalStats?.tasksCompleted ?? 0,
      icon: CheckCircle,
      color: "text-emerald-400",
      bgColor: "dark:bg-emerald-500/10 bg-emerald-50",
      borderColor: "dark:border-emerald-500/20 border-emerald-100",
    },
    {
      title: "Comments",
      value: personalStats?.commentsPosted ?? 0,
      icon: MessageSquare,
      color: "text-purple-400",
      bgColor: "dark:bg-purple-500/10 bg-purple-50",
      borderColor: "dark:border-purple-500/20 border-purple-100",
    },
    {
      title: "Completion %",
      value: `${personalStats?.completionRate ?? 0}%`,
      icon: TrendingUp,
      color: "text-pink-400",
      bgColor: "dark:bg-pink-500/10 bg-pink-50",
      borderColor: "dark:border-pink-500/20 border-pink-100",
    },
  ];

  return (
    <PageTransition>
      <div className="flex-1 p-6 lg:p-8 overflow-y-auto space-y-7 select-none">
        
        {/* Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="font-display text-2xl font-bold dark:text-dp-text-primary text-dp-text-light-primary" style={{ letterSpacing: '-0.03em' }}>
            Welcome back,{" "}
            <span className="text-gradient">{user?.name}!</span>
          </h2>
          <p className="text-sm dark:text-dp-text-muted text-dp-text-light-muted mt-2">
            Here's a summary of your activity in the "{currentProject.name}" Space.
          </p>
        </motion.div>

        {/* Stat Cards Grid */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {statCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={i}
                variants={staggerItem}
                className={`glass-card glossy-stat p-5 flex items-center justify-between card-hover ${card.borderColor}`}
              >
                <div>
                  <span className="text-[12px] font-bold uppercase tracking-wider dark:text-dp-text-muted text-dp-text-light-muted block">
                    {card.title}
                  </span>
                  <span className="text-3xl font-display font-bold dark:text-dp-text-primary text-dp-text-light-primary mt-1.5 block" style={{ letterSpacing: '-0.02em' }}>
                    {card.value}
                  </span>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.bgColor}`}>
                  <Icon className={`w-6 h-6 ${card.color}`} />
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Main Split: Tasks + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          {/* My Tasks */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-2 glass-card glossy-card flex flex-col"
          >
            <div className="p-5 border-b dark:border-dp-dark-border-light/50 border-dp-light-border flex items-center justify-between">
              <h3 className="font-display font-bold text-[15px] dark:text-dp-text-primary text-dp-text-light-primary flex items-center gap-2.5">
                <CheckCircle className="w-5 h-5 dark:text-dp-text-muted text-dp-text-light-muted" />
                My Assigned Tasks ({myTasks.length})
              </h3>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-96">
              {myTasks.length === 0 ? (
                <div className="py-14 text-center text-sm dark:text-dp-text-muted text-dp-text-light-muted font-medium">
                  No tasks assigned to you in this space.
                </div>
              ) : (
                <div className="space-y-1">
                  {myTasks.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between py-3 px-4 rounded-xl transition-all duration-150 dark:hover:bg-dp-dark-surface-hover hover:bg-dp-light-bg-secondary group"
                    >
                      <div className="flex items-center gap-3.5 overflow-hidden">
                        <span className="text-[12px] font-bold dark:text-dp-text-muted text-dp-text-light-muted font-mono flex-shrink-0">
                          TASK-{t.taskNumber}
                        </span>
                        <span className="text-sm font-semibold dark:text-dp-text-primary text-dp-text-light-primary truncate">
                          {t.title}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2.5 flex-shrink-0">
                        <span className={`status-badge ${
                          t.priority === "CRITICAL" ? "dark:bg-red-500/10 bg-red-50 text-red-400 dark:border-red-500/20 border-red-200" :
                          t.priority === "HIGH" ? "dark:bg-amber-500/10 bg-amber-50 text-amber-400 dark:border-amber-500/20 border-amber-200" :
                          t.priority === "MEDIUM" ? "dark:bg-blue-500/10 bg-blue-50 text-blue-400 dark:border-blue-500/20 border-blue-200" :
                          "dark:bg-dp-dark-elevated bg-dp-light-bg-secondary dark:text-dp-text-muted text-dp-text-light-muted dark:border-dp-dark-border-light border-dp-light-border"
                        }`}>
                          {t.priority}
                        </span>
                        <span className={`status-badge capitalize ${
                          t.status === "COMPLETED" ? "dark:bg-emerald-500/10 bg-emerald-50 text-emerald-400 dark:border-emerald-500/20 border-emerald-200" :
                          t.status === "IN_REVIEW" ? "dark:bg-purple-500/10 bg-purple-50 text-purple-400 dark:border-purple-500/20 border-purple-200" :
                          t.status === "IN_PROGRESS" ? "dark:bg-blue-500/10 bg-blue-50 text-blue-400 dark:border-blue-500/20 border-blue-200" :
                          t.status === "BLOCKED" ? "dark:bg-red-500/10 bg-red-50 text-red-400 dark:border-red-500/20 border-red-200" :
                          "dark:bg-dp-dark-elevated bg-dp-light-bg-secondary dark:text-dp-text-muted text-dp-text-light-muted dark:border-dp-dark-border-light border-dp-light-border"
                        }`}>
                          {t.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="glass-card glossy-card flex flex-col"
          >
            <div className="p-5 border-b dark:border-dp-dark-border-light/50 border-dp-light-border">
              <h3 className="font-display font-bold text-[15px] dark:text-dp-text-primary text-dp-text-light-primary flex items-center gap-2.5">
                <Activity className="w-5 h-5 dark:text-dp-text-muted text-dp-text-light-muted" />
                Recent Activity
              </h3>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-96 space-y-4">
              {(!dashboardMetrics || !dashboardMetrics.recentActivity || dashboardMetrics.recentActivity.length === 0) ? (
                <div className="py-14 text-center text-sm dark:text-dp-text-muted text-dp-text-light-muted font-medium">
                  No activity logged in this space yet.
                </div>
              ) : (
                dashboardMetrics.recentActivity.map((log) => {
                  const date = new Date(log.createdAt);
                  const formattedTime = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  return (
                    <div key={log.id} className="flex gap-3 text-sm items-start">
                      <img
                        src={log.user.avatar}
                        alt=""
                        className="w-7 h-7 rounded-full dark:bg-dp-dark-surface bg-dp-light-bg-secondary flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="dark:text-dp-text-secondary text-dp-text-light-secondary leading-normal text-[13px]">
                          <strong className="dark:text-dp-text-primary text-dp-text-light-primary font-semibold">
                            {log.user.name}
                          </strong>{" "}
                          {log.actionType === "TASK_CREATED" && "created a task"}
                          {log.actionType === "TASK_STATUS_CHANGED" && `moved a task to ${log.metadata.newStatus}`}
                          {log.actionType === "TASK_ASSIGNEE_CHANGED" && `reassigned a task to ${log.metadata.newAssignee}`}
                          {log.actionType === "COMMIT_LINKED" && "pushed a commit referencing a task"}
                          {log.actionType === "MEMBER_ADDED" && `added ${log.metadata.name} to the space`}
                          {log.actionType === "SPRINT_COMPLETED" && `completed sprint "${log.metadata.name}"`}
                          {" — "}
                          <span className="dark:text-dp-text-muted text-dp-text-light-muted font-medium">
                            "{log.metadata.title || log.metadata.name || ""}"
                          </span>
                        </p>
                        <span className="text-[12px] dark:text-dp-text-muted text-dp-text-light-muted mt-1 block font-medium">
                          {formattedTime}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}