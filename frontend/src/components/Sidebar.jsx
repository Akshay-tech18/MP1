import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";
import CreateWorkspaceModal from "./CreateWorkspaceModal";
import VideoMeetingModal from "./VideoMeetingModal";
import {
  Inbox,
  Plus,
  Phone,
  User,
  MoreHorizontal,
  Hash,
  Sparkles,
} from "lucide-react";

export default function Sidebar({ isOpen }) {
  const navigate = useNavigate();
  const { currentProject, user } = useAuthStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);

  const workspaceName = currentProject?.name || "Team Workspace";
  const initial = workspaceName.charAt(0).toUpperCase();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 264, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="w-[264px] dark:bg-[#0c0e14] bg-[#f8fafc] border-r dark:border-white/[0.08] border-slate-200 flex flex-col h-full overflow-hidden select-none flex-shrink-0 relative z-20 dark:text-slate-200 text-slate-700 transition-colors duration-200"
        >
          {/* 1. Header Toolbar */}
          <div className="px-3.5 py-3 border-b dark:border-white/[0.06] border-slate-200 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="text-[13.5px] font-bold dark:text-white text-slate-900 flex items-center gap-1.5 tracking-tight">
                <span>Home</span>
                <Inbox className="w-4 h-4 text-slate-400" />
              </span>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg dark:bg-white bg-slate-900 dark:text-slate-900 text-white hover:opacity-90 text-xs font-bold transition-all shadow-md active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Create</span>
            </button>
          </div>

          {/* 2. Scrollable Body */}
          <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4 scrollbar-thin">
            
            {/* Quick Links (Meetings, My Tasks, More) */}
            <div className="space-y-0.5">
              <button
                onClick={() => setShowMeetingModal(true)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13.5px] font-medium dark:text-slate-200 text-slate-700 dark:hover:text-white hover:text-slate-900 dark:hover:bg-white/[0.06] hover:bg-slate-200/60 transition-all group"
              >
                <Phone className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                <span>Meetings</span>
              </button>

              <button
                onClick={() => navigate("/board")}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13.5px] font-medium dark:text-slate-200 text-slate-700 dark:hover:text-white hover:text-slate-900 dark:hover:bg-white/[0.06] hover:bg-slate-200/60 transition-all group"
              >
                <User className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                <span>My Tasks</span>
              </button>

              <button
                onClick={() => navigate("/dashboard")}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13.5px] font-medium dark:text-slate-200 text-slate-700 dark:hover:text-white hover:text-slate-900 dark:hover:bg-white/[0.06] hover:bg-slate-200/60 transition-all group"
              >
                <MoreHorizontal className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                <span>More</span>
              </button>
            </div>

            {/* Separator */}
            <div className="h-px dark:bg-white/[0.04] bg-slate-200" />

            {/* Section: Spaces */}
            <div className="space-y-1">
              <div className="px-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Spaces
              </div>

              {/* All Tasks Link */}
              <button
                onClick={() => navigate("/board")}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13.5px] font-medium dark:text-slate-200 text-slate-700 dark:hover:text-white hover:text-slate-900 dark:hover:bg-white/[0.06] hover:bg-slate-200/60 transition-all truncate group"
              >
                <Sparkles className="w-4 h-4 text-indigo-500 flex-shrink-0 group-hover:rotate-12 transition-transform" />
                <span className="truncate">All Tasks</span>
              </button>
            </div>

            {/* Separator */}
            <div className="h-px dark:bg-white/[0.04] bg-slate-200" />

            {/* Section: Channels */}
            <div className="space-y-1">
              <div className="px-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Channels
              </div>

              <button
                onClick={() => navigate("/chat")}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13.5px] font-medium dark:text-slate-200 text-slate-700 dark:hover:text-white hover:text-slate-900 dark:hover:bg-white/[0.06] hover:bg-slate-200/60 transition-all truncate group"
              >
                <Hash className="w-4 h-4 text-slate-400 group-hover:text-cyan-500 transition-colors" />
                <span className="truncate">General</span>
                <span className="w-4 h-4 rounded-md bg-teal-600 flex items-center justify-center text-[9px] font-bold text-white ml-auto flex-shrink-0">
                  {initial}
                </span>
              </button>

              <button
                onClick={() => navigate("/chat")}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13.5px] font-medium dark:text-slate-200 text-slate-700 dark:hover:text-white hover:text-slate-900 dark:hover:bg-white/[0.06] hover:bg-slate-200/60 transition-all group"
              >
                <Hash className="w-4 h-4 text-slate-400 group-hover:text-cyan-500 transition-colors" />
                <span>Engineering & Sprints</span>
              </button>
            </div>

          </div>

          {/* Create Workspace Wizard Modal */}
          <CreateWorkspaceModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
          />

          {/* Jitsi Video Meeting Modal */}
          <VideoMeetingModal
            isOpen={showMeetingModal}
            onClose={() => setShowMeetingModal(false)}
            currentProject={currentProject}
            user={user}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
