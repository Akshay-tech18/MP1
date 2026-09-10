import React, { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { LogOut } from "lucide-react";
import Avatar from "./Avatar";

export default function ProfilePopover({ user, isOpen, onClose, onLogout }) {
  const popoverRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  return (
    <motion.div
      ref={popoverRef}
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.96 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="fixed bottom-4 left-[72px] z-50 w-72 rounded-2xl p-4 shadow-2xl border select-none
                 dark:bg-dp-dark-surface/95 bg-white/95 backdrop-blur-xl
                 dark:border-white/10 border-slate-200"
    >
      {/* User Info Header */}
      <div className="flex items-center gap-3">
        <Avatar src={user.avatar} name={user.name} size="lg" />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold dark:text-dp-text-primary text-dp-text-light-primary truncate leading-tight">
            {user.name}
          </h4>
          <p className="text-xs dark:text-dp-text-muted text-dp-text-light-muted truncate mt-0.5">
            {user.email}
          </p>
          {user.role && (
            <span className="inline-block mt-1.5 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full
                             dark:bg-dp-dark-elevated dark:text-dp-text-muted bg-slate-100 text-slate-600 border dark:border-white/5 border-slate-200">
              {user.role.replace("_", " ")}
            </span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px dark:bg-white/10 bg-slate-200 my-3" />

      {/* Logout Action */}
      <button
        onClick={() => {
          onClose();
          onLogout();
        }}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold
                   text-red-500 hover:text-red-600 dark:hover:bg-red-500/10 hover:bg-red-50 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        Log Out
      </button>
    </motion.div>
  );
}
