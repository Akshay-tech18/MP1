import React, { useState, useRef, useEffect } from "react";
import useAuthStore from "../store/useAuthStore";
import useSocketStore from "../store/useSocketStore";
import useNotificationStore from "../store/useNotificationStore";
import VideoMeetingModal from "./VideoMeetingModal";
import {
  Search,
  Video,
  Bell,
  CheckCheck,
  ExternalLink,
  Clock,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const { user, currentProject } = useAuthStore();
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
  const notifDropdownRef = useRef(null);
  const navigate = useNavigate();

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
    <div className="h-14 glass-sidebar border-b px-5 flex items-center justify-between select-none flex-shrink-0 relative z-20">
      {/* Left: Space Breadcrumb */}
      <div className="flex items-center gap-2.5">
        <span className="font-display font-bold text-[15px] dark:text-dp-text-primary text-dp-text-light-primary tracking-tight">
          {currentProject ? currentProject.name : "DevPilot Workspace"}
        </span>
        {currentProject && (
          <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full dark:bg-dp-success/10 bg-dp-success/10 dark:text-dp-success text-dp-success">
            {currentProject.status?.toLowerCase()}
          </span>
        )}
      </div>

      {/* Center: Search Bar (Command Palette trigger placeholder) */}
      <div className="hidden md:flex items-center">
        <div className="relative group">
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl dark:bg-dp-dark-surface/60 bg-dp-light-bg-secondary/80 border dark:border-dp-dark-border-light/50 border-dp-light-border/80 cursor-pointer transition-all duration-200 dark:hover:border-dp-primary/30 hover:border-dp-primary/20 min-w-[260px]">
            <Search className="w-4 h-4 dark:text-dp-text-muted text-dp-text-light-muted" />
            <span className="text-[13px] dark:text-dp-text-muted text-dp-text-light-muted font-medium">
              Search workspace...
            </span>
            <div className="ml-auto flex items-center gap-1">
              <kbd className="text-[11px] dark:text-dp-text-muted text-dp-text-light-muted dark:bg-dp-dark-elevated/80 bg-dp-light-border/60 px-1.5 py-0.5 rounded font-mono">
                ⌘
              </kbd>
              <kbd className="text-[11px] dark:text-dp-text-muted text-dp-text-light-muted dark:bg-dp-dark-elevated/80 bg-dp-light-border/60 px-1.5 py-0.5 rounded font-mono">
                K
              </kbd>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* WebSocket Real-time Sync Indicator */}
        <div
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
          title={connected ? "Real-time sync active" : "Connecting..."}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              connected ? "bg-dp-success animate-pulse" : "bg-dp-warning"
            }`}
          />
          <span className="text-[12px] font-medium dark:text-dp-text-muted text-dp-text-light-muted hidden lg:inline">
            {connected ? "Live" : "Sync"}
          </span>
        </div>

        {/* ══════ In-App Notifications Bell ══════ */}
        <div className="relative" ref={notifDropdownRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`relative w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
              showNotifications
                ? "dark:bg-dp-primary/20 bg-dp-primary/10 text-dp-primary"
                : "dark:hover:bg-dp-dark-surface-hover hover:bg-dp-light-bg-secondary dark:text-dp-text-muted text-dp-text-light-muted hover:text-dp-primary"
            }`}
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-gradient-to-r from-dp-primary to-dp-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg animate-pulse">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Flyout Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 glass-card glossy-card rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col border dark:border-dp-dark-border-light border-dp-light-border animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="p-3.5 px-4 border-b dark:border-dp-dark-border-light/50 border-dp-light-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="font-display font-bold text-xs uppercase tracking-wider dark:text-dp-text-primary text-dp-text-light-primary">
                    Notifications
                  </h4>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-dp-primary/15 text-dp-primary">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[11px] font-semibold text-dp-primary hover:underline flex items-center gap-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              {/* Notification List */}
              <div className="max-h-80 overflow-y-auto divide-y dark:divide-dp-dark-border-light/30 divide-dp-light-border/50">
                {loadingNotifs && notifications.length === 0 ? (
                  <div className="p-8 text-center text-xs dark:text-dp-text-muted text-dp-text-light-muted">
                    Loading notifications...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="py-10 px-4 text-center">
                    <Sparkles className="w-6 h-6 mx-auto mb-2 text-dp-primary/60 opacity-60" />
                    <p className="text-xs font-semibold dark:text-dp-text-primary text-dp-text-light-primary">
                      You're all caught up!
                    </p>
                    <p className="text-[11px] dark:text-dp-text-muted text-dp-text-light-muted mt-0.5">
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
                          ? "dark:bg-dp-primary/5 bg-dp-primary/[0.03] dark:hover:bg-dp-primary/10 hover:bg-dp-primary/[0.06]"
                          : "dark:hover:bg-dp-dark-surface-hover hover:bg-dp-light-bg-secondary"
                      }`}
                    >
                      {/* Unread indicator bullet */}
                      <span
                        className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                          !n.read
                            ? "bg-dp-primary ring-4 ring-dp-primary/20"
                            : "bg-transparent"
                        }`}
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h5
                            className={`text-xs truncate ${
                              !n.read
                                ? "font-bold dark:text-dp-text-primary text-dp-text-light-primary"
                                : "font-medium dark:text-dp-text-secondary text-dp-text-light-secondary"
                            }`}
                          >
                            {n.title}
                          </h5>
                          <span className="text-[10px] dark:text-dp-text-muted text-dp-text-light-muted flex items-center gap-1 flex-shrink-0">
                            <Clock className="w-2.5 h-2.5" />
                            {formatTimeAgo(n.createdAt)}
                          </span>
                        </div>
                        <p className="text-[12px] dark:text-dp-text-muted text-dp-text-light-muted mt-0.5 leading-snug line-clamp-2">
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

        {/* ══════ Video Call Button (Jitsi Meet) ══════ */}
        <button
          onClick={() => setIsMeetingOpen(true)}
          className="btn-primary flex items-center gap-2 px-3.5 py-1.5 text-[13px]"
          title="Start or Join Workspace Video Meeting"
        >
          <Video className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Call</span>
        </button>
      </div>

      {/* ══════ Jitsi Video Meeting Modal ══════ */}
      <VideoMeetingModal
        isOpen={isMeetingOpen}
        onClose={() => setIsMeetingOpen(false)}
        currentProject={currentProject}
        user={user}
      />
    </div>
  );
}