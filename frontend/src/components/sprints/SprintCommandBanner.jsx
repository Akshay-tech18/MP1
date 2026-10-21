import React from "react";
import { Zap, Calendar, Flag, Clock, CheckCircle2, Play, Trophy, Plus, AlertCircle } from "lucide-react";

const getDaysInfo = (endDate, status) => {
  if (status === "COMPLETED") return { label: "Completed", color: "text-slate-400 bg-white/5 border-white/10" };
  const now = new Date();
  const end = new Date(endDate);
  const diffTime = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      label: `Overdue by ${Math.abs(diffDays)}d`,
      color: "text-rose-400 bg-rose-500/10 border-rose-500/20 font-bold"
    };
  } else if (diffDays <= 2) {
    return {
      label: `${diffDays === 0 ? "Ends today" : `${diffDays}d left`}`,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20 font-bold"
    };
  } else {
    return {
      label: `${diffDays} days left`,
      color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20"
    };
  }
};

const formatDateRange = (start, end) => {
  if (!start || !end) return "";
  const s = new Date(start);
  const e = new Date(end);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[s.getMonth()]} ${s.getDate()} - ${months[e.getMonth()]} ${e.getDate()}`;
};

export default function SprintCommandBanner({
  sprints = [],
  selectedSprintId = "all",
  onSelectSprint,
  tasks = [],
  isManager = false,
  onOpenCreateModal,
  onOpenCompleteModal,
  onStartSprint,
  actionLoading = false
}) {
  // Identify active sprint across workspace
  const activeSprint = sprints.find((s) => s.status === "ACTIVE");

  // Determine currently focused sprint
  let currentSprint = null;
  if (selectedSprintId !== "all" && selectedSprintId !== "backlog") {
    currentSprint = sprints.find((s) => s.id === selectedSprintId) || null;
  } else if (selectedSprintId === "all" && activeSprint) {
    currentSprint = activeSprint;
  }

  // Calculate task progress for current sprint
  let totalTasks = 0;
  let completedTasks = 0;
  let percent = 0;

  if (currentSprint) {
    const sprintTasks = tasks.filter((t) => t.sprintId === currentSprint.id);
    totalTasks = sprintTasks.length;
    completedTasks = sprintTasks.filter((t) => t.status === "COMPLETED").length;
    percent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  }

  const daysInfo = currentSprint ? getDaysInfo(currentSprint.endDate, currentSprint.status) : null;
  const isAnotherSprintActive = Boolean(activeSprint && currentSprint && activeSprint.id !== currentSprint.id);

  return (
    <div className="w-full px-6 py-2.5 bg-gradient-to-r dark:from-[#0d0d12] dark:via-[#111116] dark:to-[#0d0d12] from-slate-100 via-white to-slate-100 border-b dark:border-white/[0.08] border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs transition-colors">
      {/* Left: Sprint Dropdown Selector & Details */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Sprint Selector */}
        <div className="flex items-center gap-2">
          <span className="font-semibold dark:text-slate-400 text-slate-500 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            <span>Sprint:</span>
          </span>
          <select
            value={selectedSprintId}
            onChange={(e) => onSelectSprint(e.target.value)}
            className="px-3 py-1.5 rounded-xl font-medium dark:bg-[#16161b] bg-white border dark:border-white/10 border-slate-300 dark:text-white text-slate-800 text-xs focus:outline-none focus:border-indigo-500 transition-colors shadow-xs"
          >
            <option value="all">All Sprints & Backlog</option>
            <option value="backlog">Backlog Only</option>
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.status.toLowerCase()})
              </option>
            ))}
          </select>
        </div>

        {/* Sprint Info Pills if focused on a sprint */}
        {currentSprint && (
          <div className="flex flex-wrap items-center gap-2 pl-1 border-l dark:border-white/10 border-slate-200">
            {/* Status Pill */}
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border flex items-center gap-1.5 ${
                currentSprint.status === "ACTIVE"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                  : currentSprint.status === "PLANNED"
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/25"
                  : "bg-slate-500/10 text-slate-400 border-slate-500/25"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  currentSprint.status === "ACTIVE"
                    ? "bg-emerald-400 animate-pulse"
                    : currentSprint.status === "PLANNED"
                    ? "bg-amber-400"
                    : "bg-slate-400"
                }`}
              />
              <span>{currentSprint.status}</span>
            </span>

            {/* Date Range */}
            <span className="text-[11px] font-mono dark:text-slate-400 text-slate-500 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>{formatDateRange(currentSprint.startDate, currentSprint.endDate)}</span>
            </span>

            {/* Countdown Chip */}
            {daysInfo && (
              <span className={`px-2 py-0.5 rounded-lg border text-[11px] font-mono flex items-center gap-1 ${daysInfo.color}`}>
                <Clock className="w-3 h-3" />
                <span>{daysInfo.label}</span>
              </span>
            )}

            {/* Sprint Goal (if available) */}
            {currentSprint.goal && (
              <span
                className="hidden lg:flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-white/[0.03] border border-white/5 text-[11px] text-slate-300 max-w-[220px] truncate"
                title={currentSprint.goal}
              >
                <Flag className="w-3 h-3 text-amber-400 flex-shrink-0" />
                <span className="truncate">{currentSprint.goal}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right: Progress Bar & Actions */}
      <div className="flex items-center gap-3">
        {/* Progress Bar for Current Sprint */}
        {currentSprint && totalTasks > 0 && (
          <div className="hidden sm:flex items-center gap-2.5 pr-2">
            <div className="w-24 sm:w-32 h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="text-[11px] font-mono dark:text-slate-300 text-slate-600 font-semibold">
              {completedTasks}/{totalTasks} ({percent}%)
            </span>
          </div>
        )}

        {/* Action Buttons for Managers */}
        {isManager && (
          <div className="flex items-center gap-2">
            {/* Start Sprint Button for Planned Sprints */}
            {currentSprint && currentSprint.status === "PLANNED" && (
              <button
                onClick={() => onStartSprint(currentSprint.id)}
                disabled={actionLoading || isAnotherSprintActive}
                title={
                  isAnotherSprintActive
                    ? `Cannot activate. Sprint "${activeSprint.name}" is currently active.`
                    : "Activate this sprint for the team"
                }
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Sprint</span>
              </button>
            )}

            {/* Complete Sprint Button for Active Sprints */}
            {currentSprint && currentSprint.status === "ACTIVE" && (
              <button
                onClick={() => onOpenCompleteModal(currentSprint)}
                disabled={actionLoading}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Complete Sprint</span>
              </button>
            )}

            {/* + New Sprint Button */}
            <button
              onClick={onOpenCreateModal}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold dark:bg-white/5 bg-slate-200/80 dark:hover:bg-white/10 hover:bg-slate-300 dark:text-white text-slate-800 border dark:border-white/10 border-slate-300 transition-all flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Sprint</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
