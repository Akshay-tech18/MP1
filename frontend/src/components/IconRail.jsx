import React from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Home,
  Calendar,
  Users,
  FileText,
  BarChart3,
  Clock,
  Grid,
  ChevronsRight,
} from "lucide-react";

// Official DevPilot Brand Emblem with iridescent gradient and ambient aura
function DevPilotBrandLogo({ className = "w-9 h-9" }) {
  return (
    <div className="relative group cursor-pointer">
      <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-pink-500 opacity-40 group-hover:opacity-100 blur-[5px] transition-opacity duration-300" />
      <div className="relative w-9 h-9 rounded-xl dark:bg-[#0c0c0e] bg-white dark:border-white/20 border-slate-200 flex items-center justify-center shadow-lg transition-transform group-hover:scale-105 group-active:scale-95">
        <svg viewBox="0 0 32 32" className="w-5.5 h-5.5" fill="none">
          <defs>
            <linearGradient id="dp-rail-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
          <path
            d="M7 8C7 6.89543 7.89543 6 9 6H16C21.5228 6 26 10.4772 26 16C26 21.5228 21.5228 26 16 26H9C7.89543 26 7 25.1046 7 24V8Z"
            stroke="url(#dp-rail-grad)"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <path
            d="M13 12L19 16L13 20V12Z"
            fill="url(#dp-rail-grad)"
          />
        </svg>
      </div>
    </div>
  );
}

// Flower SVG icon matching ClickUp Brain / Nexus
function BrainFlowerIcon({ className = "w-5 h-5" }) {
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

export default function IconRail({ isSidePanelOpen, onToggleSidePanel }) {
  const location = useLocation();

  const isActive = (path) => {
    if (path === "/team" && location.pathname.startsWith("/team")) return true;
    return location.pathname === path;
  };

  const NAV_ITEMS = [
    {
      id: "home",
      path: "/dashboard",
      icon: Home,
      label: "Home",
      hasAura: true,
    },
    {
      id: "planner",
      path: "/board",
      icon: Calendar,
      label: "Planner",
    },
    {
      id: "ai",
      path: "/ai",
      isCustomIcon: true,
      customIcon: BrainFlowerIcon,
      label: "Nexus AI",
      hasGlow: true,
    },
    {
      id: "teams",
      path: "/team",
      icon: Users,
      label: "Teams",
    },
    {
      id: "docs",
      path: "/docs",
      icon: FileText,
      label: "Docs",
    },
    {
      id: "dashboards",
      path: "/analytics",
      icon: BarChart3,
      label: "Dashboards",
    },
    {
      id: "timesheets",
      path: "/timesheets",
      icon: Clock,
      label: "Timesheets",
    },
    {
      id: "more",
      path: "/chat",
      icon: Grid,
      label: "More Channels",
    },
  ];

  return (
    <div className="w-[64px] dark:bg-[#050505] bg-slate-100 border-r dark:border-white/[0.08] border-slate-200 flex flex-col items-center py-3 select-none flex-shrink-0 relative z-30 justify-between h-full overflow-visible transition-colors duration-200">
      
      {/* Brand App Logo & Collapse Action */}
      <div className="w-full flex flex-col items-center gap-2 mb-3 flex-shrink-0 pt-0.5">
        <Link to="/dashboard" title="DevPilot Workspace Platform">
          <DevPilotBrandLogo />
        </Link>
        <button
          onClick={onToggleSidePanel}
          title={isSidePanelOpen ? "Collapse sidebar" : "Expand sidebar"}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 dark:hover:text-white hover:text-slate-800 dark:hover:bg-white/5 hover:bg-slate-200/80 transition-colors"
        >
          <ChevronsRight
            className={`w-4 h-4 transition-transform duration-200 ${
              isSidePanelOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {/* Navigation Items (Prominent, minimal viewing with sleek hover tooltips) */}
      <div className="flex-1 flex flex-col items-center gap-1.5 w-full overflow-visible min-h-0 py-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              to={item.path}
              className={`group relative flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-200 flex-shrink-0 ${
                active
                  ? "dark:bg-white/[0.12] bg-slate-200/90 dark:text-white text-indigo-600 shadow-sm"
                  : "text-slate-400 dark:hover:text-white hover:text-slate-900 dark:hover:bg-white/[0.06] hover:bg-slate-200/60"
              }`}
            >
              {/* Active vertical edge indicator on left */}
              {active && (
                <motion.span
                  layoutId="activeRailIndicator"
                  className="absolute -left-1 w-1 h-5 rounded-r-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]"
                  transition={{ type: "spring", stiffness: 450, damping: 30 }}
                />
              )}

              {/* Ambient aura for Home / AI */}
              {item.hasAura && active && (
                <div className="absolute inset-1.5 rounded-xl bg-gradient-to-tr from-rose-500 via-purple-500 to-cyan-400 opacity-60 blur-[6px] pointer-events-none" />
              )}
              {item.hasGlow && (
                <div className="absolute inset-1.5 rounded-xl bg-gradient-to-tr from-cyan-400 via-pink-400 to-purple-500 opacity-20 group-hover:opacity-60 blur-[4px] transition-opacity pointer-events-none" />
              )}

              {/* Render Enlarged Icon */}
              <span className="relative z-10 flex items-center justify-center">
                {item.isCustomIcon ? (
                  <item.customIcon className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" strokeWidth={active ? 2.2 : 1.8} />
                )}
              </span>

              {/* Sleek Floating Glass Tooltip on Hover */}
              <div className="absolute left-full ml-3 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-150 shadow-2xl border dark:border-white/10 border-slate-200 dark:bg-[#121214]/95 bg-slate-900/95 backdrop-blur-xl text-white z-50 flex items-center gap-2 translate-x-[-4px] group-hover:translate-x-0">
                <span>{item.label}</span>
                {active && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-500/30 text-indigo-300 font-mono font-normal">
                    Current
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}