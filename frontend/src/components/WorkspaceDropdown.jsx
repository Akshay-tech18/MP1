import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Calendar,
  Settings,
  Users,
  Layers,
  LayoutTemplate,
  FileEdit,
  Bot,
  Tag,
  Plus,
  Sparkles,
  ExternalLink,
  Check,
} from "lucide-react";
import useAuthStore from "../store/useAuthStore";
import CreateWorkspaceModal from "./CreateWorkspaceModal";

export default function WorkspaceDropdown() {
  const { currentProject, projects, setCurrentProject } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const dropdownRef = useRef(null);

  const workspaceName = currentProject?.name || "Fleet management system";
  const initial = workspaceName.charAt(0).toUpperCase();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative inline-flex items-center" ref={dropdownRef}>
      {/* Workspace Switcher Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg dark:bg-[#181b24] bg-slate-100 hover:bg-slate-200 dark:hover:bg-[#202532] border dark:border-white/[0.08] border-slate-200 transition-all text-xs font-semibold dark:text-slate-200 text-slate-800 group shadow-sm"
      >
        <span className="w-5 h-5 rounded-md bg-teal-600 flex items-center justify-center text-white text-[11px] font-bold shadow-sm">
          {initial}
        </span>
        <span className="truncate max-w-[160px]">{workspaceName}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 dark:group-hover:text-slate-200 group-hover:text-slate-800 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Calendar quick action button */}
      <button
        title="Calendar Planner"
        className="ml-2 w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 dark:hover:text-slate-200 hover:text-slate-800 dark:hover:bg-white/5 hover:bg-slate-100 transition-colors"
      >
        <Calendar className="w-3.5 h-3.5" />
      </button>

      {/* Dropdown Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 top-full mt-2 w-76 rounded-3xl p-3.5 dark:shadow-[0_30px_70px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.2)] shadow-2xl border dark:border-white/[0.14] border-slate-200 dark:bg-[#0b0e17]/90 bg-white/95 backdrop-blur-3xl z-50 select-none dark:text-slate-200 text-slate-800 overflow-hidden"
          >
            {/* Top specular reflection line */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

            {/* Header: Workspace details */}
            <div className="flex items-center gap-3 p-1.5 mb-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white text-base font-bold shadow-md">
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold dark:text-white text-slate-900 truncate">
                  {workspaceName}
                </h4>
                <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <span>6 members</span>
                  <span>•</span>
                  <span>Free Forever</span>
                  <span>•</span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500 font-semibold cursor-pointer hover:underline">
                    Upgrade
                  </span>
                </p>
              </div>
            </div>

            {/* Quick Action Pill Buttons */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg dark:bg-white/5 bg-slate-100 hover:bg-slate-200/80 dark:hover:bg-white/10 border dark:border-white/5 border-slate-200 text-[11px] font-medium dark:text-slate-200 text-slate-700 transition-colors"
              >
                <Settings className="w-3.5 h-3.5 text-slate-400" />
                <span>Settings</span>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg dark:bg-white/5 bg-slate-100 hover:bg-slate-200/80 dark:hover:bg-white/10 border dark:border-white/5 border-slate-200 text-[11px] font-medium dark:text-slate-200 text-slate-700 transition-colors"
              >
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>People</span>
              </button>
            </div>

            {/* Manage Section */}
            <div className="space-y-0.5 border-t dark:border-white/[0.06] border-slate-200 pt-2 mb-2">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 block mb-1">
                Manage
              </span>

              <button
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs dark:hover:bg-white/5 hover:bg-slate-100 transition-colors group"
              >
                <div className="w-4 h-4 flex items-center justify-center text-indigo-400">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <span className="dark:text-slate-300 text-slate-700 dark:group-hover:text-white group-hover:text-slate-900 font-medium">Apps</span>
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs dark:hover:bg-white/5 hover:bg-slate-100 transition-colors group"
              >
                <div className="w-4 h-4 flex items-center justify-center text-cyan-400">
                  <LayoutTemplate className="w-3.5 h-3.5" />
                </div>
                <span className="dark:text-slate-300 text-slate-700 dark:group-hover:text-white group-hover:text-slate-900 font-medium">Templates</span>
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs dark:hover:bg-white/5 hover:bg-slate-100 transition-colors group"
              >
                <div className="w-4 h-4 flex items-center justify-center text-amber-400">
                  <FileEdit className="w-3.5 h-3.5" />
                </div>
                <span className="dark:text-slate-300 text-slate-700 dark:group-hover:text-white group-hover:text-slate-900 font-medium">Custom Fields</span>
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs dark:hover:bg-white/5 hover:bg-slate-100 transition-colors group"
              >
                <div className="w-4 h-4 flex items-center justify-center text-emerald-400">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <span className="dark:text-slate-300 text-slate-700 dark:group-hover:text-white group-hover:text-slate-900 font-medium">Automations</span>
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs dark:hover:bg-white/5 hover:bg-slate-100 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 flex items-center justify-center text-purple-400">
                    <Tag className="w-3.5 h-3.5" />
                  </div>
                  <span className="dark:text-slate-300 text-slate-700 dark:group-hover:text-white group-hover:text-slate-900 font-medium">Tag Manager</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-purple-600/30 text-purple-400 border border-purple-500/20">
                  New
                </span>
              </button>
            </div>

            {/* Other workspaces list if any */}
            {projects.length > 1 && (
              <div className="border-t dark:border-white/[0.06] border-slate-200 pt-2 mb-2 space-y-0.5">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 block mb-1">
                  Switch Workspace
                </span>
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setCurrentProject(p);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                      p.id === currentProject?.id
                        ? "bg-indigo-600/20 text-indigo-400 font-semibold"
                        : "dark:hover:bg-white/5 hover:bg-slate-100 dark:text-slate-300 text-slate-700"
                    }`}
                  >
                    <span className="truncate">{p.name}</span>
                    {p.id === currentProject?.id && (
                      <Check className="w-3.5 h-3.5 text-indigo-400" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Bottom: + Create Workspace Button */}
            <div className="border-t dark:border-white/[0.06] border-slate-200 pt-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowCreateModal(true);
                }}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl dark:bg-white/5 bg-slate-100 dark:hover:bg-white/10 hover:bg-slate-200/80 text-xs font-semibold dark:text-white text-slate-900 border dark:border-white/5 border-slate-200 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4 text-slate-400" />
                <span>Create Workspace</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Workspace Modal */}
      <CreateWorkspaceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}
