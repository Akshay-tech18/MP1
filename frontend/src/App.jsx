import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import useAuthStore from "./store/useAuthStore";
import useSocketStore from "./store/useSocketStore";

// Components & Pages
import IconRail from "./components/IconRail";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Board from "./pages/Board";
import Chat from "./pages/Chat";
import Analytics from "./pages/Analytics";

import "./App.css";

/**
 * Initialise theme on app load (before React renders)
 */
function initTheme() {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("devpilot_theme") || "dark";
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(stored);
  }
}
initTheme();

/**
 * Route protection wrapper: Redirects to /login if unauthenticated.
 */
function ProtectedLayout() {
  const { user, loading } = useAuthStore();
  const { connectSocket, disconnectSocket } = useSocketStore();
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);

  useEffect(() => {
    if (user) {
      // Connect WebSocket namespace on auth success
      const accessToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("accessToken="))
        ?.split("=")[1];
      
      connectSocket(accessToken);
    }
    
    return () => {
      disconnectSocket();
    };
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center dark:bg-dp-dark-bg bg-dp-light-bg">
        <div className="spinner-gradient mb-3" />
        <span className="text-xs font-medium dark:text-dp-text-muted text-dp-text-light-muted">
          Loading Workspace...
        </span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden dark:bg-dp-dark-bg bg-dp-light-bg font-sans">
      {/* 1. Icon Rail (Always visible) */}
      <IconRail
        isSidePanelOpen={isSidePanelOpen}
        onToggleSidePanel={() => setIsSidePanelOpen(!isSidePanelOpen)}
      />

      {/* 2. Side Panel (Collapsible) */}
      <Sidebar isOpen={isSidePanelOpen} />

      {/* 3. Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <Navbar />
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <AnimatePresence mode="wait">
            <Outlet />
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/**
 * Animated Routes wrapper to capture location for AnimatePresence
 */
function AnimatedRoutes() {
  const location = useLocation();

  return (
    <Routes location={location} key={location.pathname}>
      {/* Public Route */}
      <Route path="/login" element={<Login />} />

      {/* Private Workspace Routes */}
      <Route element={<ProtectedLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/board" element={<Board />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/analytics" element={<Analytics />} />
        {/* Redirect index path to Dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  const { fetchMe, fetchProjects, user } = useAuthStore();

  useEffect(() => {
    fetchMe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  );
}