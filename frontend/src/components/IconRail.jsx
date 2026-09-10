import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  KanbanSquare,
  MessageSquare,
  BarChart3,
  Settings,
  ChevronsRight,
  Zap,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import Avatar from "./Avatar";
import ProfilePopover from "./ProfilePopover";
import useAuthStore from "../store/useAuthStore";

const NAV_ITEMS = [
  { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/board", icon: KanbanSquare, label: "Board" },
  { path: "/chat", icon: MessageSquare, label: "Chat" },
  { path: "/analytics", icon: BarChart3, label: "Analytics" },
];

export default function IconRail({ isSidePanelOpen, onToggleSidePanel }) {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  return (
    <div className="w-[64px] glass-sidebar border-r flex flex-col items-center py-4 select-none flex-shrink-0 relative z-30">
      
      {/* Logo */}
      <div className="mb-5 flex flex-col items-center">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center relative group cursor-pointer magnetic-btn logo-glow iridescent-hover"
             style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}>
          <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
          <div className="absolute inset-0 rounded-xl animate-pulse-glow opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* Expand / Collapse Side Panel Toggle */}
      <button
        onClick={onToggleSidePanel}
        className="w-9 h-9 rounded-xl flex items-center justify-center mb-4 transition-all duration-200 group"
      >
        <ChevronsRight
          className={`w-4.5 h-4.5 transition-transform duration-300 ${isSidePanelOpen ? "rotate-180" : ""}`}
          style={{ color: "var(--icon-muted)" }}
        />
        <span className="tooltip-text">
          {isSidePanelOpen ? "Collapse" : "Expand"} Panel
        </span>
      </button>

      {/* Separator */}
      <div className="w-7 h-px bg-dp-dark-border-light dark:bg-dp-dark-border-light mb-3 opacity-40" />

      {/* Navigation Icons */}
      <nav className="flex-1 flex flex-col items-center gap-1.5 w-full px-2 overflow-y-auto min-h-0 scrollbar-hidden">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`relative group w-full flex items-center justify-center py-3 rounded-xl transition-all duration-200 magnetic-btn ${
                active
                  ? "text-dp-primary"
                  : "text-dp-text-muted hover:text-dp-text-secondary dark:hover:text-dp-text-secondary"
              }`}
            >
              {/* Active Indicator Bar */}
              {active && (
                <span className="nav-active-indicator" />
              )}

              {/* Icon */}
              <span className={`relative z-10 flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 ${
                active
                  ? "bg-dp-primary/10 dark:bg-dp-primary/15 shadow-glow"
                  : "group-hover:bg-dp-dark-surface-hover dark:group-hover:bg-dp-dark-surface-hover group-hover:bg-dp-light-bg-secondary"
              }`}>
                <Icon className="w-[20px] h-[20px]" strokeWidth={active ? 2.2 : 1.8} />
              </span>

              {/* Tooltip */}
              <span className="tooltip-text">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="flex flex-col items-center gap-2.5 mt-auto pt-3 flex-shrink-0">
        {/* Separator */}
        <div className="w-7 h-px bg-dp-dark-border-light dark:bg-dp-dark-border-light opacity-40 mb-1" />

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Profile Avatar & Popover Trigger */}
        {user && (
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen((prev) => !prev)}
              className="group relative flex items-center justify-center p-0.5 rounded-full transition-all duration-150
                         hover:ring-2 hover:ring-indigo-500/50"
              title={user.name}
            >
              <Avatar
                src={user.avatar}
                name={user.name}
                size="lg"
                className="transition-transform duration-150 group-hover:scale-105"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 dark:border-dp-dark-bg border-white" />
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
        )}
      </div>
    </div>
  );
}