import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import {
  Home,
  Calendar,
  Users,
  FileText,
  BarChart3,
  Clock,
  Grid,
  UserPlus,
  ArrowUp,
  ChevronsRight,
} from "lucide-react";
import ProfilePopover from "./ProfilePopover";
import useAuthStore from "../store/useAuthStore";

// Official DevPilot Brand Emblem with iridescent gradient and ambient aura
function DevPilotBrandLogo({ className = "w-8 h-8" }) {
  return (
    <div className="relative group cursor-pointer">
      <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-pink-500 opacity-40 group-hover:opacity-100 blur-[4px] transition-opacity duration-300" />
      <div className="relative w-8 h-8 rounded-xl dark:bg-[#0e121d] bg-white dark:border-white/20 border-slate-200 flex items-center justify-center shadow-lg transition-transform group-hover:scale-105 group-active:scale-95">
        <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none">
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
function BrainFlowerIcon({ className = "w-4 h-4" }) {
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
  const { user, logout } = useAuthStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

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
      label: "AI",
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
      label: "Dashboa..",
      fullLabel: "Dashboards",
    },
    {
      id: "timesheets",
      path: "/timesheets",
      icon: Clock,
      label: "Timeshe..",
      fullLabel: "Timesheets",
    },
    {
      id: "more",
      path: "/chat",
      icon: Grid,
      label: "More",
      fullLabel: "More Channels & Apps",
    },
  ];

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "AP";

  return (
    <div className="w-[60px] dark:bg-[#090b10] bg-slate-100 border-r dark:border-white/[0.08] border-slate-200 flex flex-col items-center py-2 select-none flex-shrink-0 relative z-30 justify-between h-full overflow-hidden transition-colors duration-200">
      
      {/* Brand App Logo & Collapse Action */}
      <div className="w-full flex flex-col items-center gap-1.5 mb-1.5 flex-shrink-0 pt-0.5">
        <Link to="/dashboard" title="DevPilot Workspace Platform">
          <DevPilotBrandLogo />
        </Link>
        <button
          onClick={onToggleSidePanel}
          title={isSidePanelOpen ? "Collapse sidebar" : "Expand sidebar"}
          className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 dark:hover:text-white hover:text-slate-800 dark:hover:bg-white/5 hover:bg-slate-200/80 transition-colors"
        >
          <ChevronsRight
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isSidePanelOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {/* Navigation Items (Sized precisely so all 8 items fit comfortably without being cut off) */}
      <div className="flex-1 flex flex-col items-center gap-0.5 w-full overflow-y-auto overflow-x-hidden min-h-0 py-0.5 scrollbar-thin">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              to={item.path}
              title={item.fullLabel || item.label}
              className={`w-full flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all group relative flex-shrink-0 ${
                active ? "dark:text-white text-indigo-600 font-semibold" : "text-slate-400 dark:hover:text-slate-200 hover:text-slate-800"
              }`}
            >
              {/* Icon Container */}
              <div className="relative w-7 h-7 flex items-center justify-center rounded-lg transition-all">
                {/* Home item gradient aura orb */}
                {item.hasAura && active && (
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-rose-500 via-purple-500 to-cyan-400 opacity-80 blur-[5px] animate-pulse" />
                )}

                {/* AI flower glowing background */}
                {item.hasGlow && (
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-400 via-pink-400 to-purple-500 opacity-20 group-hover:opacity-60 blur-[3px] transition-opacity" />
                )}

                {/* Active pill background */}
                {active && !item.hasAura && (
                  <div className="absolute inset-0 rounded-lg dark:bg-white/10 bg-indigo-50 border dark:border-transparent border-indigo-200/60" />
                )}

                {/* Render Icon */}
                <span className="relative z-10">
                  {item.isCustomIcon ? (
                    <item.customIcon className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" strokeWidth={active ? 2.2 : 1.7} />
                  )}
                </span>
              </div>

              {/* Text label underneath */}
              <span
                className={`text-[9px] font-medium tracking-tight mt-0.5 truncate max-w-[52px] text-center leading-none ${
                  active ? "dark:text-white text-indigo-600 font-semibold" : "text-slate-400 dark:group-hover:text-slate-200 group-hover:text-slate-800"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Bottom Pinned Section (Invite, Upgrade, User Avatar) */}
      <div className="flex flex-col items-center gap-1 pt-1.5 border-t dark:border-white/[0.06] border-slate-200 w-full flex-shrink-0 dark:bg-[#090b10] bg-slate-100 transition-colors">
        {/* Invite */}
        <button
          title="Invite Members"
          className="w-full flex flex-col items-center justify-center py-0.5 text-slate-400 dark:hover:text-slate-200 hover:text-slate-800 transition-colors group"
        >
          <div className="w-6 h-6 rounded-md flex items-center justify-center dark:group-hover:bg-white/5 group-hover:bg-slate-200/80">
            <UserPlus className="w-3.5 h-3.5 text-slate-400 dark:group-hover:text-white group-hover:text-slate-900" />
          </div>
          <span className="text-[9px] text-slate-400 dark:group-hover:text-white group-hover:text-slate-900 font-medium mt-0.5 leading-none">
            Invite
          </span>
        </button>

        {/* Upgrade with gradient arrow */}
        <button
          title="Upgrade Plan"
          className="w-full flex flex-col items-center justify-center py-0.5 text-slate-400 dark:hover:text-slate-200 hover:text-slate-800 transition-colors group"
        >
          <div className="w-6 h-6 rounded-md flex items-center justify-center dark:group-hover:bg-white/5 group-hover:bg-slate-200/80 relative">
            <ArrowUp className="w-3.5 h-3.5 text-transparent bg-clip-text bg-gradient-to-t from-cyan-400 via-pink-400 to-amber-400" strokeWidth={2.8} />
          </div>
          <span className="text-[9px] font-semibold dark:text-white text-slate-800 mt-0.5 leading-none">
            Upgrade
          </span>
        </button>

        {/* User Profile Avatar */}
        <div className="relative mt-0.5">
          <button
            onClick={() => setIsProfileOpen((prev) => !prev)}
            className="w-7 h-7 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-[11px] font-bold text-white relative hover:ring-2 hover:ring-indigo-500/50 transition-all shadow-sm"
          >
            <span>{initials}</span>
          </button>

          {/* Profile Details Popover */}
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
      </div>

    </div>
  );
}