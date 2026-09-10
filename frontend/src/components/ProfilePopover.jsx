import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut,
  BellOff,
  Settings,
  Command,
  Moon,
  Sun,
} from "lucide-react";

export default function ProfilePopover({ user, isOpen, onClose, onLogout }) {
  const [isMuted, setIsMuted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(
    document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleSync = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };
    window.addEventListener("devpilot_theme_change", handleSync);
    return () => window.removeEventListener("devpilot_theme_change", handleSync);
  }, []);

  if (!isOpen || !user) return null;

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "AP";

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains("dark");
    if (isDark) {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      localStorage.setItem("devpilot_theme", "light");
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      localStorage.setItem("devpilot_theme", "dark");
      setIsDarkMode(true);
    }
    window.dispatchEvent(new Event("devpilot_theme_change"));
  };

  return ReactDOM.createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] pointer-events-none">
        {/* Invisible Click-outside Backdrop */}
        <div
          className="fixed inset-0 pointer-events-auto"
          onClick={onClose}
        />

        {/* Profile Popover Floating Window (Apple-Level Frosted Glassmorphism with Light & Dark support) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 10 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="fixed bottom-4 left-[72px] pointer-events-auto w-80 rounded-3xl p-4 shadow-[0_25px_60px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.2)] border dark:border-white/[0.14] border-slate-200 dark:bg-[#0c0f18]/90 bg-white/95 backdrop-blur-3xl dark:text-slate-200 text-slate-800 select-none text-xs flex flex-col overflow-hidden"
        >
          {/* Top specular highlight line */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

          {/* 1. User Header */}
          <div className="flex items-center justify-between p-3 rounded-2xl dark:bg-white/[0.04] bg-slate-100 dark:border-white/[0.06] border-slate-200 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center font-bold text-white text-sm shadow-md flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <h4 className="font-bold dark:text-white text-slate-900 text-sm truncate leading-tight">
                  {user.name}
                </h4>
                <p className="text-[11px] dark:text-slate-400 text-slate-500 truncate mt-0.5 font-mono">
                  {user.email || "developer@devpilot.com"}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex-shrink-0">
              {user.role || "Lead"}
            </span>
          </div>

          {/* 2. Core Actions & Preferences */}
          <div className="space-y-1 pr-0.5">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl dark:text-slate-300 text-slate-700 dark:hover:text-white hover:text-slate-900 dark:hover:bg-white/[0.06] hover:bg-slate-100 transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <BellOff className="w-4 h-4 text-slate-400 group-hover:text-amber-400 transition-colors" />
                <span>Mute Notifications</span>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                  isMuted
                    ? "bg-rose-500/20 text-rose-300"
                    : "dark:bg-white/5 bg-slate-200 dark:text-slate-400 text-slate-600"
                }`}
              >
                {isMuted ? "Muted" : "Active"}
              </span>
            </button>

            <button
              onClick={toggleTheme}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl dark:text-slate-300 text-slate-700 dark:hover:text-white hover:text-slate-900 dark:hover:bg-white/[0.06] hover:bg-slate-100 transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                {isDarkMode ? (
                  <Moon className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-500 group-hover:text-amber-600 transition-colors" />
                )}
                <span>Color Theme</span>
              </div>
              <span className="text-[10px] dark:text-slate-400 text-slate-600 font-mono font-semibold capitalize dark:bg-white/5 bg-slate-200 px-2 py-0.5 rounded-full">
                {isDarkMode ? "Dark" : "Light"}
              </span>
            </button>

            <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl dark:text-slate-300 text-slate-700 dark:hover:text-white hover:text-slate-900 dark:hover:bg-white/[0.06] hover:bg-slate-100 transition-colors group">
              <Command className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 transition-colors" />
              <span>Keyboard Shortcuts</span>
              <kbd className="ml-auto text-[10px] dark:bg-white/10 bg-slate-200 px-1.5 py-0.5 rounded font-mono dark:text-slate-300 text-slate-600">
                ⌘K
              </kbd>
            </button>

            <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl dark:text-slate-300 text-slate-700 dark:hover:text-white hover:text-slate-900 dark:hover:bg-white/[0.06] hover:bg-slate-100 transition-colors group">
              <Settings className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 transition-colors" />
              <span>Workspace Settings</span>
            </button>
          </div>

          {/* 3. Bottom Pinned Section: PROMINENT LOGOUT (Always fully visible!) */}
          <div className="pt-2.5 mt-2.5 border-t border-white/[0.08] flex-shrink-0">
            <button
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <LogOut className="w-4 h-4 text-rose-400 group-hover:-translate-x-0.5 transition-transform" />
                <span>Log Out</span>
              </div>
              <span className="text-[10px] text-rose-400/80 font-mono font-normal">
                End Session
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
