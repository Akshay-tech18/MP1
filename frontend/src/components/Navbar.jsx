import React, { useState, useRef, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import useAuthStore from "../store/useAuthStore";
import useSocketStore from "../store/useSocketStore";
import useNotificationStore from "../store/useNotificationStore";
import VideoMeetingModal from "./VideoMeetingModal";
import WorkspaceDropdown from "./WorkspaceDropdown";
import ThemeToggle from "./ThemeToggle";
import ProfilePopover from "./ProfilePopover";
import {
  Search,
  Video,
  Bell,
  CheckCheck,
  Clock,
  Sparkles,
  Github,
} from "lucide-react";
import GitIntegrationModal from "./GitIntegrationModal";
import { useNavigate } from "react-router-dom";

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

export default function Navbar() {
  const { user, currentProject, logout } = useAuthStore();
  const { connected } = useSocketStore();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    loading: loadingNotifs,
  } = useNotificationStore();

  const [showNotifications, setShowNotifications] = useState(false);
  const [isMeetingOpen, setIsMeetingOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showGitModal, setShowGitModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const notifDropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const navigate = useNavigate();

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowSearchModal((prev) => !prev);
      } else if (e.key === "Escape") {
        setShowSearchModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (showSearchModal) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [showSearchModal]);

  const commandItems = [
    { id: "cmd-1", label: "Open Kanban Planner & Sprint", category: "Navigation", icon: "📋", action: () => navigate("/board") },
    { id: "cmd-2", label: "Launch Nexus AI Workspace", category: "Intelligence", icon: "✨", action: () => navigate("/ai") },
    { id: "cmd-3", label: "Log Weekly Timesheet Hours", category: "Operational", icon: "⏱️", action: () => navigate("/timesheets") },
    { id: "cmd-4", label: "Inspect Codebase Defect Risk", category: "Intelligence", icon: "📊", action: () => navigate("/analytics") },
    { id: "cmd-5", label: "Manage Team Workload & Invites", category: "Operational", icon: "👥", action: () => navigate("/teams") },
    { id: "cmd-6", label: "Working with Neon and Prisma", category: "Docs", icon: "📄", action: () => navigate("/docs") },
    { id: "cmd-7", label: "Phase 1 - API Contract Spec", category: "Docs", icon: "📄", action: () => navigate("/docs") },
    { id: "cmd-8", label: "Database Schema Architecture", category: "Docs", icon: "📄", action: () => navigate("/docs") },
  ];

  const filteredCommands = commandItems.filter((c) =>
    c.label.toLowerCase().includes(commandQuery.toLowerCase()) ||
    c.category.toLowerCase().includes(commandQuery.toLowerCase())
  );

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "AP";

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        notifDropdownRef.current &&
        !notifDropdownRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = (n) => {
    if (!n.read) {
      markAsRead(n.id);
    }
    if (n.link) {
      navigate(n.link);
      setShowNotifications(false);
    }
  };

  // Helper for human-readable time format
  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return "Just now";
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);
    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <div className="h-12 dark:bg-[#090b10] bg-white border-b dark:border-white/[0.08] border-slate-200 px-4 flex items-center justify-between select-none flex-shrink-0 relative z-20 transition-colors duration-200">
      {/* Left: Workspace Dropdown Switcher (Matching Screenshot 2) */}
      <div className="flex items-center gap-2">
        <WorkspaceDropdown />
      </div>

      {/* Center: Search Bar & AI Chats Pill */}
      <div className="hidden md:flex items-center gap-2 relative">
        {/* Search Command Trigger */}
        <div
          onClick={() => setShowSearchModal(true)}
          className="flex items-center gap-2 px-3 py-1 rounded-lg dark:bg-white/5 bg-slate-100 border dark:border-white/[0.08] border-slate-200 cursor-pointer hover:border-slate-300 dark:hover:border-white/20 transition-colors w-56 dark:text-slate-400 text-slate-500"
          title="Global Search & Quick Commands (⌘K)"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="text-nav-top">Search</span>
          <kbd className="ml-auto text-caption-meta dark:bg-white/10 bg-slate-200 px-1 py-0.2 rounded font-mono dark:text-slate-300 text-slate-600">
            ⌘K
          </kbd>
        </div>

        {/* AI Chats Pill */}
        <button
          onClick={() => navigate("/ai")}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg dark:bg-white/5 bg-slate-100 hover:bg-slate-200 dark:hover:bg-white/10 border dark:border-white/[0.08] border-slate-200 hover:border-indigo-500/30 text-nav-top dark:text-slate-300 text-slate-700 hover:text-slate-900 dark:hover:text-white transition-all group"
        >
          <span>AI Chats</span>
          <BrainFlowerIcon className="w-3.5 h-3.5 group-hover:rotate-45 transition-transform" />
        </button>

        {/* GitHub Integration Pill Button */}
        <button
          onClick={() => setShowGitModal(true)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg dark:bg-white/5 bg-slate-100 hover:bg-slate-200 dark:hover:bg-white/10 border dark:border-white/[0.08] border-slate-200 hover:border-indigo-500/30 text-nav-top dark:text-slate-300 text-slate-700 hover:text-slate-900 dark:hover:text-white transition-all group"
          title="GitHub Integration & Repositories"
        >
          <Github className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-400 transition-colors" />
          <span>Git Integration</span>
        </button>
      </div>

      {/* Global Command Palette Popover */}
      <AnimatePresence>
        {showSearchModal && (
          <div
            className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowSearchModal(false)}
          >
            <div
              className="w-full max-w-lg rounded-2xl dark:bg-[#121520] bg-white border dark:border-white/15 border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Input Header */}
              <div className="p-3.5 px-4 border-b dark:border-white/[0.08] border-slate-200 flex items-center gap-2.5">
                <Search className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Type a command, task, document or member..."
                  value={commandQuery}
                  onChange={(e) => setCommandQuery(e.target.value)}
                  className="w-full bg-transparent text-body-secondary dark:text-white text-slate-900 placeholder-slate-400 outline-none"
                />
                <kbd className="text-caption-meta dark:bg-white/10 bg-slate-200 px-1.5 py-0.5 rounded font-mono text-slate-400 flex-shrink-0">
                  ESC
                </kbd>
              </div>

              {/* Suggestions List */}
              <div className="max-h-80 overflow-y-auto p-2 space-y-1">
                <div className="px-2 py-1 text-metric-label uppercase font-bold tracking-wider text-slate-400">
                  Workspace Actions & Documents
                </div>

                {filteredCommands.length === 0 ? (
                  <div className="p-6 text-center text-task-metadata text-slate-400">
                    No matching commands found
                  </div>
                ) : (
                  filteredCommands.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        item.action();
                        setShowSearchModal(false);
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-xl dark:hover:bg-white/10 hover:bg-slate-100 text-left transition-colors group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-sm">{item.icon}</span>
                        <span className="text-card-title font-semibold dark:text-slate-200 text-slate-800 dark:group-hover:text-white group-hover:text-indigo-600 truncate">
                          {item.label}
                        </span>
                      </div>
                      <span className="text-badge-meta uppercase font-bold tracking-wider px-1.5 py-0.5 rounded dark:bg-white/5 bg-slate-200 text-slate-400">
                        {item.category}
                      </span>
                    </button>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="p-2.5 px-4 border-t dark:border-white/[0.06] border-slate-200 dark:bg-white/[0.02] bg-slate-50 flex items-center justify-between text-caption-meta text-slate-400 font-mono">
                <span>Navigate with click or ↵</span>
                <span>Pro Tip: Press ⌘K anywhere</span>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Mobile Git Integration button */}
        <button
          onClick={() => setShowGitModal(true)}
          className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center dark:text-slate-400 text-slate-600 dark:hover:text-white hover:text-slate-900 transition-colors hover:bg-white/5"
          title="GitHub Integration"
        >
          <Github className="w-4 h-4" />
        </button>

        {/* Sun / Moon Direct Theme Switcher Button */}
        <ThemeToggle tooltipPlacement="bottom" />

        {/* User Profile Avatar & Details Popover (Directly to the right of Dark/Light theme button) */}
        <div className="relative">
          <button
            onClick={() => setIsProfileOpen((prev) => !prev)}
            className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-caption-meta font-bold text-white relative hover:ring-2 hover:ring-indigo-500/50 transition-all shadow-sm flex-shrink-0 active:scale-95"
            title={user?.name ? `${user.name} Profile` : "Account Profile"}
          >
            <span>{initials}</span>
          </button>

          <AnimatePresence>
            {isProfileOpen && (
              <ProfilePopover
                user={user}
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
                onLogout={logout}
              />
            )}
          </AnimatePresence>
        </div>

        {/* In-App Notifications Bell */}
        <div className="relative" ref={notifDropdownRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              showNotifications
                ? "bg-white/10 text-white"
                : "hover:bg-white/5 text-slate-400 hover:text-slate-200"
            }`}
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 bg-pink-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg animate-pulse">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Flyout Dropdown (Apple-Level Frosted Glassmorphism) */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.18)] z-50 overflow-hidden flex flex-col border dark:border-white/[0.12] border-slate-200 dark:bg-[#0c0f18]/90 bg-white/95 backdrop-blur-3xl dark:text-slate-200 text-slate-800 animate-in fade-in zoom-in-95 duration-150">
              {/* Specular line */}
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />

              {/* Header */}
              <div className="p-3.5 px-4 border-b dark:border-white/[0.08] border-slate-200 flex items-center justify-between dark:bg-white/[0.02] bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-section-heading uppercase tracking-wider dark:text-white text-slate-900">
                    Notifications
                  </h4>
                  {unreadCount > 0 && (
                    <span className="text-badge-meta font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-task-metadata font-semibold text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors flex items-center gap-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              {/* Notification List */}
              <div className="max-h-80 overflow-y-auto divide-y dark:divide-white/[0.04] divide-slate-100">
                {loadingNotifs && notifications.length === 0 ? (
                  <div className="p-8 text-center text-task-metadata text-slate-400">
                    Loading notifications...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="py-10 px-4 text-center">
                    <Sparkles className="w-6 h-6 mx-auto mb-2 text-indigo-400 opacity-60" />
                    <p className="text-card-title font-semibold dark:text-white text-slate-900">
                      You're all caught up!
                    </p>
                    <p className="text-caption-meta text-slate-400 mt-0.5">
                      New alerts and workspace updates will appear here.
                    </p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`p-3.5 px-4 transition-colors cursor-pointer flex items-start gap-3 text-left ${
                        !n.read
                          ? "dark:bg-white/[0.05] bg-indigo-50/40 dark:hover:bg-white/[0.08] hover:bg-indigo-50/70"
                          : "dark:hover:bg-white/[0.02] hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                          !n.read
                            ? "bg-indigo-500 ring-4 ring-indigo-500/20"
                            : "bg-transparent"
                        }`}
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h5
                            className={`text-card-title truncate ${
                              !n.read
                                ? "font-bold dark:text-white text-slate-900"
                                : "font-medium dark:text-slate-300 text-slate-700"
                            }`}
                          >
                            {n.title}
                          </h5>
                          <span className="text-caption-meta text-slate-400 flex items-center gap-1 flex-shrink-0">
                            <Clock className="w-2.5 h-2.5" />
                            {formatTimeAgo(n.createdAt)}
                          </span>
                        </div>
                        <p className="text-task-metadata dark:text-slate-400 text-slate-500 mt-0.5 leading-snug line-clamp-2">
                          {n.message}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Video Call Button (Apple-grade Frosted Glass with Neon Aura) */}
        <button
          onClick={() => setIsMeetingOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600/90 to-purple-600/90 hover:from-indigo-500 hover:to-purple-500 border border-white/20 text-btn-refined font-bold text-white shadow-[0_0_18px_rgba(99,102,241,0.45)] backdrop-blur-md transition-all active:scale-95 group"
          title="Start or Join Workspace Video Meeting"
        >
          <Video className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline">Call</span>
        </button>
      </div>

      {/* Jitsi Video Meeting Modal */}
      <VideoMeetingModal
        isOpen={isMeetingOpen}
        onClose={() => setIsMeetingOpen(false)}
        currentProject={currentProject}
        user={user}
      />

      {/* GitHub Integration & Repositories Modal */}
      <GitIntegrationModal
        isOpen={showGitModal}
        onClose={() => setShowGitModal(false)}
      />
    </div>
  );
}