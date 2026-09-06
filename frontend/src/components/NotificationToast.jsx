import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useNotificationStore from "../store/useNotificationStore";

export default function NotificationToast() {
  const { activeToast, dismissToast, markAsRead } = useNotificationStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      dismissToast();
    }, 6000);
    return () => clearTimeout(timer);
  }, [activeToast, dismissToast]);

  if (!activeToast) return null;

  const handleClick = () => {
    if (activeToast.id) {
      markAsRead(activeToast.id);
    }
    if (activeToast.link) {
      navigate(activeToast.link);
    }
    dismissToast();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.9 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-5 right-6 z-[99999] max-w-sm w-full"
      >
        <div
          onClick={handleClick}
          className="glass-card glossy-card p-4 rounded-2xl shadow-2xl border dark:border-dp-primary/30 border-dp-primary/20 flex items-start gap-3.5 cursor-pointer group hover:scale-[1.01] transition-transform"
        >
          <div className="w-9 h-9 rounded-xl bg-dp-primary/15 text-dp-primary flex items-center justify-center flex-shrink-0 mt-0.5">
            <Bell className="w-4 h-4 animate-bounce" />
          </div>

          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-1.5">
              <h5 className="font-display font-bold text-xs dark:text-dp-text-primary text-dp-text-light-primary truncate">
                {activeToast.title || "New Notification"}
              </h5>
              {activeToast.link && (
                <ExternalLink className="w-3 h-3 dark:text-dp-text-muted text-dp-text-light-muted opacity-60" />
              )}
            </div>
            <p className="text-[12px] dark:text-dp-text-muted text-dp-text-light-muted mt-0.5 leading-snug line-clamp-2">
              {activeToast.message}
            </p>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              dismissToast();
            }}
            className="w-6 h-6 rounded-lg flex items-center justify-center dark:hover:bg-dp-dark-surface-hover hover:bg-dp-light-bg-secondary dark:text-dp-text-muted text-dp-text-light-muted transition-colors flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
