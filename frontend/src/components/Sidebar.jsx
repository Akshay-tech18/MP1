import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";
import CreateWorkspaceModal from "./CreateWorkspaceModal";
import VideoMeetingModal from "./VideoMeetingModal";
import {
  Inbox,
  Search,
  Filter,
  Plus,
  Phone,
  User,
  MoreHorizontal,
  Folder,
  ChevronDown,
  Hash,
  Sparkles,
  Users,
  Layers,
  Check,
} from "lucide-react";

// Flower SVG icon matching ClickUp Brain / Nexus
function BrainFlowerIcon({ className = "w-3.5 h-3.5" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <circle cx="12" cy="7" r="3.8" fill="#38bdf8" />
      <circle cx="17" cy="12" r="3.8" fill="#c084fc" />
      <circle cx="12" cy="17" r="3.8" fill="#f472b6" />
      <circle cx="7" cy="12" r="3.8" fill="#34d399" />
      <circle cx="12" cy="12" r="2.2" fill="#ffffff" />
    </svg>
  );
}

export default function Sidebar({ isOpen }) {
  const navigate = useNavigate();
  const { currentProject, projects, setCurrentProject, user } = useAuthStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);

  const workspaceName = currentProject?.name || "Team Workspace";
  const initial = workspaceName.charAt(0).toUpperCase();

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

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
              <button
                onClick={() => setShowSearchInput(!showSearchInput)}
                title="Search spaces"
                className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg dark:bg-white bg-slate-900 dark:text-slate-900 text-white hover:opacity-90 text-xs font-bold transition-all shadow-md active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Create</span>
            </button>
          </div>

          {/* Optional inline search box */}
          {showSearchInput && (
            <div className="px-3 pt-2 pb-1">
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter spaces..."
                autoFocus
                className="w-full px-2.5 py-1.5 rounded-lg dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 dark:text-slate-200 text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 shadow-sm"
              />
            </div>
          )}

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

            {/* Section: AI Chats */}
            <div className="space-y-1">
              <div className="px-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                AI Chats
              </div>
              <button
                onClick={() => navigate("/ai")}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13.5px] font-medium dark:text-slate-200 text-slate-700 dark:hover:text-white hover:text-slate-900 dark:hover:bg-white/[0.06] hover:bg-slate-200/60 transition-all group"
              >
                <Plus className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                <span className="group-hover:text-indigo-500 transition-colors">
                  Ask, Build, Create
                </span>
                <BrainFlowerIcon className="w-4 h-4 ml-auto opacity-70 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>

            {/* Separator */}
            <div className="h-px dark:bg-white/[0.04] bg-slate-200" />

            {/* Section: Spaces (Clean & Dynamic - ZERO fake phase 2 dummy docs!) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between px-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Spaces</span>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="p-1 rounded-md dark:hover:bg-white/10 hover:bg-slate-200/80 text-slate-400 dark:hover:text-white hover:text-slate-800 transition-colors"
                  title="Create New Space"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* All Tasks Link */}
              <button
                onClick={() => navigate("/board")}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13.5px] font-medium dark:text-slate-200 text-slate-700 dark:hover:text-white hover:text-slate-900 dark:hover:bg-white/[0.06] hover:bg-slate-200/60 transition-all truncate group"
              >
                <Sparkles className="w-4 h-4 text-indigo-500 flex-shrink-0 group-hover:rotate-12 transition-transform" />
                <span className="truncate">All Tasks</span>
              </button>

              {/* Dynamic Projects/Spaces List */}
              <div className="space-y-1 pt-0.5">
                {projects.length === 0 ? (
                  /* Active default space */
                  <button
                    onClick={() => navigate("/board")}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13.5px] font-semibold dark:bg-white/[0.09] bg-slate-200/80 dark:text-white text-slate-900 shadow-sm border dark:border-white/[0.06] border-slate-300"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 shadow-sm">
                        {initial}
                      </span>
                      <span className="truncate">{workspaceName}</span>
                    </div>
                  </button>
                ) : (
                  filteredProjects.map((proj) => {
                    const isSelected = currentProject?.id === proj.id;
                    const projInitial = proj.name.charAt(0).toUpperCase();

                    return (
                      <button
                        key={proj.id}
                        onClick={() => {
                          setCurrentProject(proj);
                          navigate("/dashboard");
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13.5px] transition-all group ${
                          isSelected
                            ? "dark:bg-white/[0.09] bg-slate-200/80 dark:text-white text-slate-900 font-semibold shadow-sm border dark:border-white/[0.06] border-slate-300"
                            : "dark:text-slate-300 text-slate-700 dark:hover:text-white hover:text-slate-900 dark:hover:bg-white/[0.06] hover:bg-slate-200/60"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                              isSelected
                                ? "bg-indigo-600 text-white shadow-sm"
                                : "dark:bg-white/10 bg-slate-200 dark:text-slate-300 text-slate-700 dark:group-hover:text-white group-hover:text-slate-900"
                            }`}
                          >
                            {projInitial}
                          </span>
                          <span className="truncate">{proj.name}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* + New Space */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium text-slate-400 dark:hover:text-slate-200 hover:text-slate-800 dark:hover:bg-white/[0.06] hover:bg-slate-200/60 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>New Space</span>
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
