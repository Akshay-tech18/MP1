import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Calendar,
  Clock,
  Video,
  Users,
  Repeat,
  MessageSquare,
  Sparkles,
  AlertCircle,
  Coffee,
  CheckSquare,
  RotateCcw,
  Cpu,
} from "lucide-react";
import client from "../../api/client";
import useChannelStore from "../../store/useChannelStore";

const CEREMONIES = [
  {
    type: "STANDUP",
    label: "Daily Standup",
    icon: Coffee,
    duration: 15,
    description: "15m daily sync on yesterday, today, and blockers",
  },
  {
    type: "SPRINT_PLANNING",
    label: "Sprint Planning",
    icon: CheckSquare,
    duration: 60,
    description: "Align team on sprint scope, capacity & commitment",
  },
  {
    type: "SPRINT_RETRO",
    label: "Sprint Retrospective",
    icon: RotateCcw,
    duration: 45,
    description: "Inspect what went well, what didn't, and improvements",
  },
  {
    type: "ARCHITECTURE_REVIEW",
    label: "Architecture Review",
    icon: Cpu,
    duration: 60,
    description: "Deep dive into RFCs, technical specs & system design",
  },
  {
    type: "AD_HOC",
    label: "Ad-Hoc Sync",
    icon: Video,
    duration: 30,
    description: "Spontaneous or one-off collaborative discussion",
  },
];

const DURATION_PRESETS = [
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "1 hour", value: 60 },
  { label: "1.5 hours", value: 90 },
];

const RECURRENCE_OPTIONS = [
  { label: "Does not repeat", value: "NONE" },
  { label: "Daily (Mon - Fri)", value: "DAILY_WEEKDAYS" },
  { label: "Weekly", value: "WEEKLY" },
];

// Formats a Date object to "YYYY-MM-DD" local
const formatLocalDate = (d) => {
  const date = new Date(d);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Formats a Date object to "HH:MM" local
const formatLocalTime = (d) => {
  const date = new Date(d);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

export default function ScheduleMeetingModal({
  isOpen,
  onClose,
  projectId,
  initialDate,
  sprints = [],
  onMeetingScheduled,
}) {
  const { channels } = useChannelStore();

  const [type, setType] = useState("STANDUP");
  const [title, setTitle] = useState("Daily Engineering Standup");
  const [description, setDescription] = useState("");
  const [dateStr, setDateStr] = useState(() => formatLocalDate(new Date()));
  const [timeStr, setTimeStr] = useState("10:00");
  const [duration, setDuration] = useState(15);
  const [recurrence, setRecurrence] = useState("NONE");
  const [channelId, setChannelId] = useState("general");
  const [sprintId, setSprintId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      // Round to next 15-minute slot
      const nextQuarter = new Date(Math.ceil(now.getTime() / (15 * 60 * 1000)) * 15 * 60 * 1000);
      
      setDateStr(initialDate ? formatLocalDate(initialDate) : formatLocalDate(nextQuarter));
      setTimeStr(formatLocalTime(nextQuarter));
      setType("STANDUP");
      setTitle("Daily Engineering Standup");
      setDescription("");
      setDuration(15);
      setRecurrence("NONE");
      setChannelId("general");
      setSprintId("");
      setError(null);
    }
  }, [isOpen, initialDate]);

  const handleCeremonySelect = (ceremony) => {
    setType(ceremony.type);
    setTitle(ceremony.label);
    setDuration(ceremony.duration);
    if (ceremony.type === "STANDUP") {
      setRecurrence("DAILY_WEEKDAYS");
    } else {
      setRecurrence("NONE");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please provide a meeting title");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (!dateStr || !timeStr) {
        setError("Please provide both a meeting date and start time");
        setLoading(false);
        return;
      }

      // Explicit local time parse to avoid UTC shift
      const [year, month, day] = dateStr.split("-").map(Number);
      const [hours, minutes] = timeStr.split(":").map(Number);
      const start = new Date(year, month - 1, day, hours, minutes, 0, 0);
      const end = new Date(start.getTime() + duration * 60 * 1000);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        setError("Invalid date or time value");
        setLoading(false);
        return;
      }

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        type,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        recurrence,
        channelId: channelId || "general",
        sprintId: sprintId || null,
      };

      const res = await client.post(`/projects/${projectId}/meetings`, payload);

      if (res.data.success) {
        if (onMeetingScheduled) {
          onMeetingScheduled(res.data.data.meeting);
        }
        onClose();
      } else {
        setError(res.data.message || "Failed to schedule meeting");
      }
    } catch (err) {
      console.error("Error scheduling meeting:", err);
      setError(err.response?.data?.message || err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/65 backdrop-blur-md flex items-center justify-center z-[9999] p-3 sm:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 15 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-2xl rounded-3xl bg-[#0e0e12]/95 border border-white/[0.14] shadow-[0_25px_80px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.18)] flex flex-col overflow-hidden max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="h-16 px-6 border-b border-white/[0.08] flex items-center justify-between flex-shrink-0 bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                <Video className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <span>Schedule Meeting / Ceremony</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                    Microsoft Teams Style
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Instant WebRTC video link generated & broadcasted to channel
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/[0.05] hover:bg-white/10 text-slate-400 hover:text-white border border-white/[0.08] transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Ceremony Type Presets */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">
                Engineering Ceremony / Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CEREMONIES.map((c) => {
                  const Icon = c.icon;
                  const isSelected = type === c.type;
                  return (
                    <button
                      key={c.type}
                      type="button"
                      onClick={() => handleCeremonySelect(c)}
                      className={`p-2.5 rounded-2xl border text-left flex items-start gap-2.5 transition-all ${
                        isSelected
                          ? "bg-purple-600/20 border-purple-500/50 text-white shadow-sm ring-1 ring-purple-500/40"
                          : "bg-white/[0.03] border-white/[0.07] text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]"
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isSelected
                            ? "bg-purple-500 text-white"
                            : "bg-white/[0.05] text-slate-400"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[12px] font-semibold truncate leading-tight">
                          {c.label}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {c.duration} mins
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Meeting Title */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Meeting Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Daily Engineering Standup"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-sm focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/40 transition-all placeholder:text-slate-500"
                required
              />
            </div>

            {/* Date, Time, Duration Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Date */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                  <span>Date</span>
                </label>
                <input
                  type="date"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-xs font-mono focus:outline-none focus:border-purple-500/60 transition-all"
                  required
                />
              </div>

              {/* Start Time */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                  <span>Start Time</span>
                </label>
                <input
                  type="time"
                  value={timeStr}
                  onChange={(e) => setTimeStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-xs font-mono focus:outline-none focus:border-purple-500/60 transition-all"
                  required
                />
              </div>

              {/* Duration Presets */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Duration
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-xs focus:outline-none focus:border-purple-500/60 transition-all"
                >
                  {DURATION_PRESETS.map((d) => (
                    <option key={d.value} value={d.value} className="bg-slate-900 text-white">
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Recurrence & Channel Broadcast */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Recurrence */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Repeat className="w-3.5 h-3.5 text-purple-400" />
                  <span>Recurrence</span>
                </label>
                <select
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-xs focus:outline-none focus:border-purple-500/60 transition-all"
                >
                  {RECURRENCE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value} className="bg-slate-900 text-white">
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Channel Broadcast */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                  <span>Post Invite in Channel</span>
                </label>
                <select
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-xs focus:outline-none focus:border-purple-500/60 transition-all"
                >
                  {channels.map((ch) => (
                    <option key={ch.id} value={ch.id} className="bg-slate-900 text-white">
                      #{ch.name || ch.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sprint Association (Optional) */}
            {sprints && sprints.length > 0 && (
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Link to Sprint (Optional)</span>
                </label>
                <select
                  value={sprintId}
                  onChange={(e) => setSprintId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-xs focus:outline-none focus:border-purple-500/60 transition-all"
                >
                  <option value="" className="bg-slate-900 text-slate-400">
                    -- No Sprint Link --
                  </option>
                  {sprints.map((s) => (
                    <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                      {s.name} ({s.status})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Agenda / Description */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Agenda / Discussion Points (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Key topics to discuss, RFC links, or preparation notes..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-xs focus:outline-none focus:border-purple-500/60 transition-all placeholder:text-slate-500 resize-none"
              />
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-slate-300 text-xs font-semibold transition-all border border-white/[0.08]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Scheduling...</span>
                  </span>
                ) : (
                  <>
                    <Video className="w-4 h-4" />
                    <span>Schedule & Broadcast</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
