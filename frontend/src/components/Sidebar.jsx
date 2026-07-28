import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";
import {
  LayoutDashboard,
  KanbanSquare,
  MessageSquare,
  BarChart3,
  Plus,
  LogOut,
  Folder,
  ChevronDown,
  User,
  Users
} from "lucide-react";

export default function Sidebar() {
  const { user, projects, currentProject, setCurrentProject, createProject, logout } = useAuthStore();
  const location = useLocation();
  const [showProjDropdown, setShowProjDropdown] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjName, setNewProjName] = useState("");
  const [newProjDesc, setNewProjDesc] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const isActive = (path) => location.pathname === path;

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    if (!newProjName.trim()) {
      setErrorMsg("Project name is required");
      return;
    }
    const res = await createProject(newProjName, newProjDesc);
    if (res.success) {
      setNewProjName("");
      setNewProjDesc("");
      setShowCreateModal(false);
    } else {
      setErrorMsg(res.message);
    }
  };

  return (
    <div className="w-60 bg-clickup-dark-sidebar border-r border-clickup-dark-border text-slate-300 flex flex-col h-screen select-none">
      {/* 1. App Logo / ClickUp style header */}
      <div className="p-4 border-b border-clickup-dark-border flex items-center justify-between">
        <span className="font-bold text-lg text-white flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-clickup-pink animate-pulse"></span>
          DevPilot
        </span>
        <span className="text-[10px] bg-clickup-primary/20 text-clickup-primary border border-clickup-primary/40 px-1.5 py-0.5 rounded font-medium">
          Workspace
        </span>
      </div>

      {/* 2. Project / Space Switcher */}
      <div className="relative p-3 border-b border-clickup-dark-border">
        <div
          onClick={() => setShowProjDropdown(!showProjDropdown)}
          className="flex items-center justify-between p-2 rounded bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 cursor-pointer transition"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <Folder className="w-4 h-4 text-clickup-primary flex-shrink-0" />
            <span className="truncate text-sm font-medium text-white">
              {currentProject ? currentProject.name : "Select Space..."}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
        </div>

        {showProjDropdown && (
          <div className="absolute left-3 right-3 mt-1 bg-slate-800 border border-slate-700 rounded shadow-xl z-50 py-1">
            <div className="max-h-48 overflow-y-auto">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  onClick={() => {
                    setCurrentProject(proj);
                    setShowProjDropdown(false);
                  }}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-slate-700 transition flex items-center gap-2 ${
                    currentProject?.id === proj.id ? "text-white bg-slate-700/50 font-medium" : ""
                  }`}
                >
                  <Folder className="w-3.5 h-3.5 text-clickup-primary" />
                  <span className="truncate">{proj.name}</span>
                </div>
              ))}
            </div>
            
            <div className="border-t border-slate-700 mt-1 pt-1">
              <button
                onClick={() => {
                  setShowCreateModal(true);
                  setShowProjDropdown(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-clickup-primary hover:bg-slate-700 flex items-center gap-2 transition"
              >
                <Plus className="w-4 h-4" />
                Create Space
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Navigation Links */}
      <div className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        <span className="px-3 text-[10px] font-bold text-slate-500 tracking-wider uppercase block mb-2">
          Views
        </span>

        <Link
          to="/dashboard"
          className={`flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition ${
            isActive("/dashboard") ? "bg-slate-800 text-white font-semibold" : "hover:bg-slate-800/50 text-slate-400 hover:text-slate-200"
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </Link>

        <Link
          to="/board"
          className={`flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition ${
            isActive("/board") ? "bg-slate-800 text-white font-semibold" : "hover:bg-slate-800/50 text-slate-400 hover:text-slate-200"
          }`}
        >
          <KanbanSquare className="w-4 h-4" />
          Board (Kanban)
        </Link>

        <Link
          to="/chat"
          className={`flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition ${
            isActive("/chat") ? "bg-slate-800 text-white font-semibold" : "hover:bg-slate-800/50 text-slate-400 hover:text-slate-200"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Chat Room
        </Link>

        <Link
          to="/analytics"
          className={`flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition ${
            isActive("/analytics") ? "bg-slate-800 text-white font-semibold" : "hover:bg-slate-800/50 text-slate-400 hover:text-slate-200"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Analytics
        </Link>
      </div>

      {/* 4. User Profile Panel */}
      {user && (
        <div className="p-3 border-t border-clickup-dark-border bg-slate-850 flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <img
              src={user.avatar}
              alt="Avatar"
              className="w-8 h-8 rounded-full border border-slate-700 bg-slate-800"
            />
            <div className="overflow-hidden flex flex-col">
              <span className="text-xs font-semibold text-white truncate">{user.name}</span>
              <span className="text-[10px] text-slate-500 capitalize">{user.role.toLowerCase().replace("_", " ")}</span>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 5. Create Space Modal Dialog */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 text-slate-800">
          <div className="bg-white rounded-lg shadow-2xl w-md p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Create a New Space</h3>
            
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Space Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mobile App Development"
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-350 rounded text-sm focus:outline-none focus:border-clickup-primary focus:ring-1 focus:ring-clickup-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows="3"
                  placeholder="Add details about the objectives of this workspace."
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-350 rounded text-sm focus:outline-none focus:border-clickup-primary focus:ring-1 focus:ring-clickup-primary"
                />
              </div>

              {errorMsg && <p className="text-xs text-red-500 font-semibold">{errorMsg}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewProjName("");
                    setNewProjDesc("");
                    setErrorMsg("");
                  }}
                  className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-clickup-primary hover:bg-clickup-primary/95 text-white rounded transition font-semibold"
                >
                  Create Space
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
