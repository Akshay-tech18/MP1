import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [theme, setTheme] = React.useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("devpilot_theme") || "dark";
    }
    return "dark";
  });

  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(theme);
    localStorage.setItem("devpilot_theme", theme);
  }, [theme]);

  React.useEffect(() => {
    const handleSync = () => {
      const stored = localStorage.getItem("devpilot_theme") || "dark";
      setTheme(stored);
    };
    window.addEventListener("devpilot_theme_change", handleSync);
    return () => window.removeEventListener("devpilot_theme_change", handleSync);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    window.dispatchEvent(new Event("devpilot_theme_change"));
  };

  return (
    <button
      onClick={toggleTheme}
      className="group relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 magnetic-btn dark:hover:bg-white/10 hover:bg-slate-200/80 text-slate-400 hover:text-slate-800 dark:hover:text-white"
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      <AnimatePresence mode="wait">
        {theme === "dark" ? (
          <motion.div
            key="moon"
            initial={{ rotate: -90, scale: 0, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 90, scale: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <Moon className="w-4 h-4 text-dp-text-muted group-hover:text-amber-400 transition-colors" />
          </motion.div>
        ) : (
          <motion.div
            key="sun"
            initial={{ rotate: 90, scale: 0, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: -90, scale: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <Sun className="w-4 h-4 text-dp-text-light-muted group-hover:text-amber-500 transition-colors" />
          </motion.div>
        )}
      </AnimatePresence>
      <span className="tooltip-text">
        {theme === "dark" ? "Light Mode" : "Dark Mode"}
      </span>
    </button>
  );
}