import React, { useState } from "react";
import {
  Video,
  Calendar,
  Clock,
  Repeat,
  Copy,
  Check,
  Coffee,
  CheckSquare,
  RotateCcw,
  Cpu,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const CEREMONY_META = {
  STANDUP: {
    label: "Daily Standup",
    icon: Coffee,
    color: "from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30",
  },
  SPRINT_PLANNING: {
    label: "Sprint Planning",
    icon: CheckSquare,
    color: "from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/30",
  },
  SPRINT_RETRO: {
    label: "Sprint Retrospective",
    icon: RotateCcw,
    color: "from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/30",
  },
  ARCHITECTURE_REVIEW: {
    label: "Architecture Review",
    icon: Cpu,
    color: "from-cyan-500/20 to-teal-500/20 text-cyan-400 border-cyan-500/30",
  },
  AD_HOC: {
    label: "Ad-Hoc Sync",
    icon: Video,
    color: "from-emerald-500/20 to-green-500/20 text-emerald-400 border-emerald-500/30",
  },
};

function formatMeetingDateTime(startIso, endIso) {
  try {
    const start = new Date(startIso);
    const end = new Date(endIso);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return "";

    const dateOptions = {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    };
    const dateStr = start.toLocaleDateString(undefined, dateOptions);

    const timeOptions = {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    };
    const startTimeStr = start.toLocaleTimeString(undefined, timeOptions);
    const endTimeStr = end.toLocaleTimeString(undefined, timeOptions);

    return {
      dateStr,
      timeStr: `${startTimeStr} - ${endTimeStr}`,
    };
  } catch (e) {
    return { dateStr: "", timeStr: "" };
  }
}

export default function MeetingChatCard({
  payload,
  projectId,
  onJoinMeeting,
}) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  if (!payload) return null;

  const {
    meetingId,
    title,
    type = "STANDUP",
    startTime,
    endTime,
    recurrence = "NONE",
    roomName,
    sprintName,
    description,
  } = payload;

  const meta = CEREMONY_META[type] || CEREMONY_META.STANDUP;
  const CeremonyIcon = meta.icon;
  const { dateStr, timeStr } = formatMeetingDateTime(startTime, endTime);

  // Status check: Live Now / Upcoming / Ended
  const now = new Date();
  const startDate = new Date(startTime);
  const endDate = new Date(endTime);
  const isLive = now >= startDate && now <= endDate;
  const isPast = now > endDate;

  const handleCopyLink = () => {
    const meetUrl = `${window.location.origin}/project/${projectId}/chat?room=${roomName}`;
    navigator.clipboard.writeText(meetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoin = () => {
    if (onJoinMeeting) {
      onJoinMeeting({
        id: meetingId,
        title,
        roomName,
      });
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl bg-[#121217]/95 border border-white/[0.12] shadow-[0_12px_40px_rgba(0,0,0,0.5)] overflow-hidden my-1 text-left transition-all hover:border-purple-500/40">
      {/* Specular Highlight */}
      <div className="h-1 w-full bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-500" />

      <div className="p-4 space-y-3">
        {/* Header Badges */}
        <div className="flex items-center justify-between gap-2">
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold bg-gradient-to-r ${meta.color}`}
          >
            <CeremonyIcon className="w-3.5 h-3.5" />
            <span>{meta.label}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {isLive ? (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                LIVE NOW
              </span>
            ) : isPast ? (
              <span className="px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/10 text-[10px] font-mono">
                Ended
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px] font-mono">
                Upcoming
              </span>
            )}

            {recurrence === "DAILY_WEEKDAYS" && (
              <span
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10 text-[10px]"
                title="Repeats every weekday"
              >
                <Repeat className="w-3 h-3 text-purple-400" />
                <span>Mon-Fri</span>
              </span>
            )}
            {recurrence === "WEEKLY" && (
              <span
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10 text-[10px]"
                title="Repeats weekly"
              >
                <Repeat className="w-3 h-3 text-purple-400" />
                <span>Weekly</span>
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <div>
          <h4 className="text-sm font-bold text-white leading-snug">{title}</h4>
          {sprintName && (
            <p className="text-[11px] text-indigo-400 flex items-center gap-1 mt-0.5 font-medium">
              <Sparkles className="w-3 h-3" />
              <span>Sprint: {sprintName}</span>
            </p>
          )}
        </div>

        {/* Date & Time pill */}
        <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-200 font-medium">
            <Calendar className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
            <span>{dateStr}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <span>{timeStr}</span>
          </div>
        </div>

        {/* Description / Agenda if present */}
        {description && (
          <p className="text-xs text-slate-400 line-clamp-2 italic bg-black/20 p-2 rounded-lg border border-white/[0.04]">
            "{description}"
          </p>
        )}

        {/* Actions */}
        <div className="pt-1 flex items-center gap-2">
          <button
            onClick={handleJoin}
            className={`flex-1 py-2 px-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 ${
              isLive
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]"
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>{isLive ? "Join Call Now" : "Join Call"}</span>
          </button>

          <button
            onClick={handleCopyLink}
            className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 border border-white/[0.08] transition-all"
            title="Copy meeting link"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            onClick={() => navigate(`/project/${projectId}/board?view=calendar`)}
            className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 border border-white/[0.08] transition-all"
            title="View in Calendar"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
