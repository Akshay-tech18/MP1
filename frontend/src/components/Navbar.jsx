import React, { useState } from "react";
import ReactDOM from "react-dom";
import useAuthStore from "../store/useAuthStore";
import useSocketStore from "../store/useSocketStore";
import { Search, Video, Bell, AlertTriangle, X, Command } from "lucide-react";

export default function Navbar() {
  const { currentProject } = useAuthStore();
  const { connected } = useSocketStore();
  const [showZegoAlert, setShowZegoAlert] = useState(false);

  return (
    <div className="h-14 glass-sidebar border-b px-5 flex items-center justify-between select-none flex-shrink-0 relative z-10">
      {/* Left: Breadcrumb */}
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

      {/* Center: Search Bar */}
      <div className="hidden md:flex items-center">
        <div className="relative group">
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl dark:bg-dp-dark-surface/60 bg-dp-light-bg-secondary/80 border dark:border-dp-dark-border-light/50 border-dp-light-border/80 cursor-pointer transition-all duration-200 dark:hover:border-dp-primary/30 hover:border-dp-primary/20 min-w-[260px]">
            <Search className="w-4 h-4 dark:text-dp-text-muted text-dp-text-light-muted" />
            <span className="text-[13px] dark:text-dp-text-muted text-dp-text-light-muted font-medium">
              Search...
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
        {/* WebSocket Sync Indicator */}
        <div
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
          title={connected ? "Real-time sync active" : "Syncing..."}
        >
          <span className={`w-2 h-2 rounded-full ${
            connected ? "bg-dp-success animate-pulse" : "bg-dp-warning"
          }`} />
          <span className="text-[12px] font-medium dark:text-dp-text-muted text-dp-text-light-muted hidden lg:inline">
            {connected ? "Live" : "Sync"}
          </span>
        </div>

        {/* Notifications placeholder */}
        <button className="relative w-8 h-8 rounded-xl flex items-center justify-center dark:hover:bg-dp-dark-surface-hover hover:bg-dp-light-bg-secondary transition-colors dark:text-dp-text-muted text-dp-text-light-muted hover:text-dp-primary">
          <Bell className="w-4 h-4" />
        </button>

        {/* Video Call Button */}
        <button
          onClick={() => setShowZegoAlert(true)}
          className="btn-primary flex items-center gap-2 px-4 py-2 text-[13px]"
        >
          <Video className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Call</span>
        </button>
      </div>

      {/* ══════ ZegoCloud Alert Modal ══════ */}
      {showZegoAlert && ReactDOM.createPortal(
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-[9999]"
             onClick={() => setShowZegoAlert(false)}>
          <div className="glass-card glossy-card w-[420px] p-8 text-center relative z-10"
               onClick={(e) => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-2xl bg-dp-primary/10 text-dp-primary flex items-center justify-center mx-auto mb-4">
              <Video className="w-7 h-7" />
            </div>

            <h4 className="font-display font-bold dark:text-dp-text-primary text-dp-text-light-primary text-base">
              ZegoCloud UIKit Integration
            </h4>
            <p className="text-[13px] dark:text-dp-text-muted text-dp-text-light-muted mt-2.5 leading-relaxed">
              Video and audio conferencing via WebRTC is configured on the backend. Client integration is under development.
            </p>

            <div className="mt-4 dark:bg-dp-warning/10 bg-dp-warning/5 dark:text-amber-300 text-amber-700 border dark:border-amber-500/20 border-amber-200 p-3.5 rounded-xl text-[12px] text-left flex items-start gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Coming Soon: WebRTC group calls and direct voice handshakes are planned in Module 10.</span>
            </div>

            <button
              onClick={() => setShowZegoAlert(false)}
              className="mt-5 btn-primary w-full text-sm"
            >
              Acknowledge
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}