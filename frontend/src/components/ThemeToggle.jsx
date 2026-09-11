import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle({
  className = "",
  tooltipPlacement = "bottom",
}) {
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

  // Tooltip placement styles
  const getTooltipClasses = () => {
    if (tooltipPlacement === "bottom-right") {
      return "top-full mt-2.5 right-0 translate-y-[-3px] group-hover:translate-y-0";
    }
    if (tooltipPlacement === "bottom-left") {
      return "top-full mt-2.5 left-0 translate-y-[-3px] group-hover:translate-y-0";
    }
    if (tooltipPlacement === "left") {
      return "right-full mr-2.5 top-1/2 -translate-y-1/2 translate-x-[3px] group-hover:translate-x-0";
    }
    if (tooltipPlacement === "right") {
      return "left-full ml-2.5 top-1/2 -translate-y-1/2 translate-x-[-3px] group-hover:translate-x-0";
    }
    // Default: centered cleanly underneath the button
    return "top-full mt-2.5 left-1/2 -translate-x-1/2 translate-y-[-3px] group-hover:translate-y-0";
  };

  const getArrowClasses = () => {
    if (tooltipPlacement === "bottom-right") {
      return "-top-1 right-3";
    }
    if (tooltipPlacement === "bottom-left") {
      return "-top-1 left-3";
    }
    return "-top-1 left-1/2 -translate-x-1/2";
  };

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={`group relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 magnetic-btn dark:hover:bg-white/10 hover:bg-slate-200/80 text-slate-400 hover:text-slate-800 dark:hover:text-white ${className}`}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
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

      {/* Floating Tooltip Label (Positioned cleanly below to avoid overlapping adjacent elements) */}
      {tooltipPlacement !== "none" && (
        <span
          className={`pointer-events-none absolute z-[100] px-2.5 py-1 text-[11px] font-semibold rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-150 select-none shadow-xl border dark:bg-[#131316] dark:text-slate-100 dark:border-white/10 bg-slate-900 text-white border-slate-800 ${getTooltipClasses()}`}
        >
          {/* Subtle connecting caret for bottom placements */}
          {tooltipPlacement.startsWith("bottom") && (
            <span
              className={`absolute w-2 h-2 rotate-45 border-t border-l dark:bg-[#131316] dark:border-white/10 bg-slate-900 border-slate-800 ${getArrowClasses()}`}
            />
          )}
          <span className="relative z-10">
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </span>
        </span>
      )}
    </button>
  );
}