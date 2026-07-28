import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import useAuthStore from "./store/useAuthStore";
import useSocketStore from "./store/useSocketStore";

// Components & Pages
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Board from "./pages/Board";
import Chat from "./pages/Chat";
import Analytics from "./pages/Analytics";

/**
 * Route protection wrapper: Redirects to /login if unauthenticated.
 */
function ProtectedLayout() {
  const { user, loading } = useAuthStore();
  const { connectSocket, disconnectSocket } = useSocketStore();

  useEffect(() => {
    if (user) {
      // Connect WebSocket namespace on auth success
      const accessToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("accessToken="))
        ?.split("=")[1];
      
      // Zustand auth state holds access token common default, we can connect with it
      connectSocket(accessToken);
    }
    
    return () => {
      // Clean connection on logout / unmount
      disconnectSocket();
    };
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-clickup-light flex flex-col items-center justify-center font-medium text-slate-500 text-sm">
        <div className="w-8 h-8 border-4 border-clickup-primary border-t-transparent rounded-full animate-spin mb-2"></div>
        Loading Workspace...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-clickup-light font-sans">
      {/* 1. Left Side Navigation */}
      <Sidebar />

      {/* 2. Right Side Content Panel */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Navbar />
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { fetchMe, fetchProjects, user } = useAuthStore();

  useEffect(() => {
    // Check session on start
    fetchMe();
  }, []);

  useEffect(() => {
    if (user) {
      // Fetch projects list if logged in
      fetchProjects();
    }
  }, [user]);

  return (
    <BrowserRouter>
      <Routes>
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
    </BrowserRouter>
  );
}
