import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("devpilot_theme");
      if (stored === "light" || stored === "dark") return stored;
      return document.documentElement.classList.contains("light") ? "light" : "dark";
    }
    return "dark";
  });

  // Apply theme to document and localStorage immediately
  const applyTheme = (newTheme) => {
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(newTheme);
    try {
      localStorage.setItem("devpilot_theme", newTheme);
    } catch (e) {
      console.error("Failed to save theme in localStorage", e);
    }
    setTheme(newTheme);
  };

  useEffect(() => {
    // Ensure document reflects current saved theme on mount
    const stored =
      localStorage.getItem("devpilot_theme") ||
      (document.documentElement.classList.contains("light") ? "light" : "dark");
    applyTheme(stored);

    const handleSync = (e) => {
      const syncedTheme =
        e?.detail ||
        localStorage.getItem("devpilot_theme") ||
        (document.documentElement.classList.contains("light") ? "light" : "dark");
      setTheme(syncedTheme);
      const root = document.documentElement;
      if (!root.classList.contains(syncedTheme)) {
        root.classList.remove("dark", "light");
        root.classList.add(syncedTheme);
      }
    };

    window.addEventListener("devpilot_theme_change", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("devpilot_theme_change", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    window.dispatchEvent(new CustomEvent("devpilot_theme_change", { detail: nextTheme }));
  };

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className="group relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 magnetic-btn dark:hover:bg-white/10 hover:bg-slate-200/80 text-slate-400 hover:text-slate-800 dark:hover:text-white"
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {theme === "dark" ? (
          <motion.div
            key="moon"
            initial={{ rotate: -90, scale: 0, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 90, scale: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            <Moon className="w-4 h-4 text-slate-400 group-hover:text-amber-400 transition-colors" />
          </motion.div>
        ) : (
          <motion.div
            key="sun"
            initial={{ rotate: 90, scale: 0, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: -90, scale: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            <Sun className="w-4 h-4 text-amber-500 group-hover:text-amber-600 transition-colors" />
          </motion.div>
        )}
      </AnimatePresence>
      <span className="tooltip-text">
        {theme === "dark" ? "Light Mode" : "Dark Mode"}
      </span>
    </button>
  );
}