import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  X,
  Trash2,
  Save,
  GitBranch,
  Github,
  Users,
  Shield,
  AlertTriangle,
  RefreshCw,
  Unlink,
  Plus,
  Mail,
  UserMinus,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  Activity,
  Archive,
  Sparkles,
  Layers,
  FolderGit2,
} from "lucide-react";
import client from "../api/client";
import useAuthStore from "../store/useAuthStore";

const STATUS_OPTIONS = [
  { value: "PLANNING", label: "Planning", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  { value: "ACTIVE", label: "Active", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  { value: "ON_HOLD", label: "On Hold", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  { value: "COMPLETED", label: "Completed", color: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  { value: "ARCHIVED", label: "Archived", color: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
];

const ROLE_OPTIONS = [
  { value: "MANAGER", label: "Manager (Full Access)" },
  { value: "DEVELOPER", label: "Developer" },
  { value: "QA_TESTER", label: "QA Tester" },
  { value: "VIEWER", label: "Viewer (Read Only)" },
];

export default function WorkspaceSettingsModal({
  isOpen,
  onClose,
  targetProjectId = null,
}) {
  const {
    currentProject,
    projects,
    updateProject,
    deleteProject,
    fetchProjects,
    setCurrentProject,
    user: currentUser,
  } = useAuthStore();

  // Active workspace being managed
  const activeProjectId = targetProjectId || currentProject?.id || (projects[0] ? projects[0].id : null);
  const [selectedProjectId, setSelectedProjectId] = useState(activeProjectId);

  // Tab State: 'general' | 'repositories' | 'members' | 'metrics' | 'danger'
  const [activeTab, setActiveTab] = useState("general");

  // Project details loaded from backend
  const [projectData, setProjectData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form states for General
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("PLANNING");
  const [copiedId, setCopiedId] = useState(false);

  // Repositories
  const [repositories, setRepositories] = useState([]);
  const [syncingRepoId, setSyncingRepoId] = useState(null);
  const [unlinkingRepoId, setUnlinkingRepoId] = useState(null);
  const [newRepoInput, setNewRepoInput] = useState("");
  const [linkingRepo, setLinkingRepo] = useState(false);

  // Members & Invitations
  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("DEVELOPER");
  const [inviting, setInviting] = useState(false);
  const [removingUserId, setRemovingUserId] = useState(null);

  // Danger Zone Deletion Confirmation
  const [confirmName, setConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Sync selectedProjectId when modal opens or targetProjectId changes
  useEffect(() => {
    if (targetProjectId) {
      setSelectedProjectId(targetProjectId);
    } else if (currentProject?.id) {
      setSelectedProjectId(currentProject.id);
    } else if (projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [targetProjectId, currentProject, projects]);

  // Load project details
  const fetchProjectDetails = useCallback(async (projId) => {
    if (!projId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await client.get(`/projects/${projId}`);
      if (res.data?.success) {
        const proj = res.data.data.project;
        setProjectData(proj);
        setName(proj.name || "");
        setDescription(proj.description || "");
        setStatus(proj.status || "PLANNING");
        setMembers(proj.members || []);
        setRepositories(proj.repositories || []);
      } else {
        setErrorMsg(res.data?.message || "Failed to load workspace details");
      }
    } catch (err) {
      console.error("Error loading workspace settings:", err);
      setErrorMsg(err.response?.data?.message || "Failed to load workspace details");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && selectedProjectId) {
      fetchProjectDetails(selectedProjectId);
    }
  }, [isOpen, selectedProjectId, fetchProjectDetails]);

  if (!isOpen) return null;

  // Check if current user is manager/owner of this workspace
  const isOwner = projectData?.ownerId === currentUser?.id;
  const isManager =
    isOwner ||
    currentUser?.role === "ADMIN" ||
    projectData?.members?.some((m) => m.userId === currentUser?.id && m.role === "MANAGER");

  // 1. Handle Update / Rename
  const handleSaveGeneral = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Workspace name cannot be empty.");
      return;
    }

    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await updateProject(selectedProjectId, {
        name: name.trim(),
        description: description.trim(),
        status,
      });

      if (res.success) {
        setSuccessMsg("Workspace updated successfully!");
        await fetchProjects();
      } else {
        setErrorMsg(res.message || "Failed to update workspace");
      }
    } catch (err) {
      setErrorMsg(err.message || "Failed to update workspace");
    } finally {
      setSaving(false);
    }
  };

  // Copy Workspace ID
  const handleCopyId = () => {
    if (!projectData?.id) return;
    navigator.clipboard.writeText(projectData.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // 2. Handle Repository Actions
  const handleSyncCommits = async (repoId) => {
    setSyncingRepoId(repoId);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await client.post(`/projects/${selectedProjectId}/repositories/${repoId}/sync`);
      if (res.data?.success) {
        setSuccessMsg(res.data.message || "Commits synced successfully!");
        fetchProjectDetails(selectedProjectId);
      } else {
        setErrorMsg(res.data?.message || "Failed to sync commits");
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || "Failed to sync commits");
    } finally {
      setSyncingRepoId(null);
    }
  };

  const handleUnlinkRepo = async (repoId, repoName) => {
    if (!window.confirm(`Are you sure you want to unlink repository "${repoName}" from this workspace?`)) return;

    setUnlinkingRepoId(repoId);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await client.delete(`/projects/${selectedProjectId}/repositories/${repoId}`);
      if (res.data?.success) {
        setSuccessMsg(`Unlinked repository "${repoName}" successfully!`);
        setRepositories((prev) => prev.filter((r) => r.id !== repoId));
        fetchProjectDetails(selectedProjectId);
      } else {
        setErrorMsg(res.data?.message || "Failed to unlink repository");
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || "Failed to unlink repository");
    } finally {
      setUnlinkingRepoId(null);
    }
  };

  const handleLinkNewRepo = async (e) => {
    e.preventDefault();
    if (!newRepoInput.trim()) return;

    setLinkingRepo(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await client.post(`/projects/${selectedProjectId}/repositories`, {
        repoName: newRepoInput.trim(),
      });

      if (res.data?.success) {
        setSuccessMsg(`Repository "${newRepoInput.trim()}" linked successfully!`);
        setNewRepoInput("");
        fetchProjectDetails(selectedProjectId);
      } else {
        setErrorMsg(res.data?.message || "Failed to link repository");
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || "Failed to link repository");
    } finally {
      setLinkingRepo(false);
    }
  };

  // 3. Handle Members Actions
  const handleInviteMember = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await client.post(`/projects/${selectedProjectId}/members`, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });

      if (res.data?.success) {
        setSuccessMsg(`Invited ${inviteEmail.trim()} as ${inviteRole}!`);
        setInviteEmail("");
        fetchProjectDetails(selectedProjectId);
      } else {
        setErrorMsg(res.data?.message || "Failed to invite member");
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || "Failed to invite member");
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (userId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName || "this member"} from the workspace?`)) return;

    setRemovingUserId(userId);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await client.delete(`/projects/${selectedProjectId}/members/${userId}`);
      if (res.data?.success) {
        setSuccessMsg("Member removed successfully!");
        setMembers((prev) => prev.filter((m) => m.userId !== userId));
      } else {
        setErrorMsg(res.data?.message || "Failed to remove member");
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || "Failed to remove member");
    } finally {
      setRemovingUserId(null);
    }
  };

  // 4. Handle Deletion
  const handleDeleteWorkspace = async () => {
    if (confirmName !== projectData?.name) {
      setErrorMsg(`Please type exactly "${projectData?.name}" to confirm deletion.`);
      return;
    }

    setDeleting(true);
    setErrorMsg("");

    try {
      const res = await deleteProject(selectedProjectId);
      if (res.success) {
        await fetchProjects();
        onClose();
      } else {
        setErrorMsg(res.message || "Failed to delete workspace");
      }
    } catch (err) {
      setErrorMsg(err.message || "Failed to delete workspace");
    } finally {
      setDeleting(false);
    }
  };

  return ReactDOM.createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-md"
        />

        {/* Modal Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-4xl max-h-[90vh] rounded-3xl dark:bg-[#0d1019]/95 bg-white/95 backdrop-blur-2xl border dark:border-white/[0.12] border-slate-200 dark:text-slate-200 text-slate-800 shadow-[0_30px_90px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden z-10"
        >
          {/* Top Specular Line */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent pointer-events-none" />

          {/* Header */}
          <div className="p-5 px-6 border-b dark:border-white/[0.08] border-slate-200 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md flex-shrink-0">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold dark:text-white text-slate-900 tracking-tight">
                    Workspace Management
                  </h3>
                  {projects.length > 1 && (
                    <select
                      value={selectedProjectId || ""}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="bg-slate-100 dark:bg-white/10 text-xs font-semibold px-2 py-0.5 rounded-lg border dark:border-white/10 border-slate-300 dark:text-white text-slate-800 outline-none cursor-pointer"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id} className="dark:bg-slate-900 text-slate-800 dark:text-white">
                          {p.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage configuration, linked Git repos, team access, and lifecycle for{" "}
                  <strong className="dark:text-slate-300 text-slate-700">{projectData?.name || "this workspace"}</strong>.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 dark:hover:bg-white/5 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Alerts */}
          {errorMsg && (
            <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Main Body (Split into Left Tabs and Right Content) */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-[420px]">
            {/* Left Nav Tabs */}
            <div className="w-full md:w-56 p-4 border-b md:border-b-0 md:border-r dark:border-white/[0.08] border-slate-200 flex-shrink-0 space-y-1 dark:bg-white/[0.01] bg-slate-50/50">
              <button
                onClick={() => setActiveTab("general")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === "general"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 dark:hover:text-white hover:text-slate-900"
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>General & Overview</span>
              </button>

              <button
                onClick={() => setActiveTab("repositories")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === "repositories"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 dark:hover:text-white hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Github className="w-4 h-4" />
                  <span>Git Repositories</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-white/20">
                  {repositories.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("members")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === "members"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 dark:hover:text-white hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4" />
                  <span>Team & Roles</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-white/20">
                  {members.length || 1}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("metrics")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === "metrics"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 dark:hover:text-white hover:text-slate-900"
                }`}
              >
                <Activity className="w-4 h-4" />
                <span>Health & Metrics</span>
              </button>

              <div className="pt-3 my-2 border-t dark:border-white/[0.08] border-slate-200" />

              <button
                onClick={() => setActiveTab("danger")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === "danger"
                    ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
                    : "text-rose-500 hover:bg-rose-500/10"
                }`}
              >
                <Trash2 className="w-4 h-4" />
                <span>Danger Zone</span>
              </button>
            </div>

            {/* Right Pane Content */}
            <div className="flex-1 p-6 overflow-y-auto max-h-[60vh] scrollbar-thin">
              {loading ? (
                <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-3">
                  <div className="spinner-gradient mb-2" />
                  <span className="text-xs font-medium">Loading workspace settings...</span>
                </div>
              ) : (
                <>
                  {/* ════════════ TAB 1: GENERAL & OVERVIEW ════════════ */}
                  {activeTab === "general" && (
                    <form onSubmit={handleSaveGeneral} className="space-y-5">
                      <div>
                        <h4 className="text-sm font-bold dark:text-white text-slate-900">
                          Workspace Identity & Status
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Configure the workspace display name, operational status, and description.
                        </p>
                      </div>

                      {/* Workspace ID & Metadata pill */}
                      <div className="p-3.5 rounded-2xl dark:bg-white/[0.03] bg-slate-50 border dark:border-white/[0.06] border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">Workspace ID:</span>
                          <code className="font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded text-[11px]">
                            {projectData?.id}
                          </code>
                          <button
                            type="button"
                            onClick={handleCopyId}
                            className="p-1 rounded text-slate-400 hover:text-slate-200 transition-colors"
                            title="Copy ID"
                          >
                            {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500">
                          <span>Owner: <strong className="dark:text-slate-300 text-slate-700">{projectData?.owner?.name || "You"}</strong></span>
                          <span>•</span>
                          <span>Created: {new Date(projectData?.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Name field */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold dark:text-slate-200 text-slate-700">
                          Workspace Name
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Core Engineering Platform"
                          required
                          className="w-full px-3.5 py-2.5 rounded-xl dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 text-xs dark:text-white text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-500 shadow-sm"
                        />
                      </div>

                      {/* Description field */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold dark:text-slate-200 text-slate-700">
                          Description & Purpose
                        </label>
                        <textarea
                          rows={3}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Describe the goals, deliverables, or team scope for this space..."
                          className="w-full px-3.5 py-2 rounded-xl dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 text-xs dark:text-white text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-500 shadow-sm resize-none"
                        />
                      </div>

                      {/* Status Selector */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold dark:text-slate-200 text-slate-700">
                          Workspace Lifecycle Status
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {STATUS_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setStatus(opt.value)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                                status === opt.value
                                  ? `${opt.color} ring-2 ring-indigo-500/30 scale-105 shadow-sm`
                                  : "dark:bg-white/5 bg-slate-100 dark:text-slate-400 text-slate-600 border-transparent hover:border-slate-300 dark:hover:border-white/10"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="pt-2 flex justify-end">
                        <button
                          type="submit"
                          disabled={saving}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{saving ? "Saving Changes..." : "Save Workspace Settings"}</span>
                        </button>
                      </div>
                    </form>
                  )}

                  {/* ════════════ TAB 2: GIT REPOSITORIES ════════════ */}
                  {activeTab === "repositories" && (
                    <div className="space-y-5">
                      <div>
                        <h4 className="text-sm font-bold dark:text-white text-slate-900">
                          Linked GitHub Repositories
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Manage connected repositories, trigger commit syncs, or unlink codebases.
                        </p>
                      </div>

                      {/* Repositories List */}
                      {repositories.length === 0 ? (
                        <div className="p-8 text-center border dark:border-white/[0.06] border-slate-200 rounded-2xl dark:bg-white/[0.01] bg-slate-50 space-y-2">
                          <FolderGit2 className="w-8 h-8 mx-auto text-slate-400 opacity-60" />
                          <p className="text-xs font-semibold dark:text-white text-slate-800">
                            No repositories linked yet
                          </p>
                          <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                            Link a GitHub repository to track commits, PR velocity, and run AI code review in this workspace.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {repositories.map((repo) => (
                            <div
                              key={repo.id}
                              className="p-3.5 rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/[0.06] border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-sm"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center border border-white/10 flex-shrink-0">
                                  <Github className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold dark:text-white text-slate-900">
                                      {repo.name}
                                    </span>
                                    <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                      Active
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                                    <span>Owner: {repo.owner || "GitHub"}</span>
                                    <span>•</span>
                                    <span>Linked: {new Date(repo.createdAt).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleSyncCommits(repo.id)}
                                  disabled={syncingRepoId === repo.id}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg dark:bg-white/5 bg-slate-100 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-medium dark:text-slate-200 text-slate-700 transition-colors disabled:opacity-50"
                                  title="Sync commits from GitHub API"
                                >
                                  <RefreshCw className={`w-3 h-3 ${syncingRepoId === repo.id ? "animate-spin" : ""}`} />
                                  <span>{syncingRepoId === repo.id ? "Syncing..." : "Sync Now"}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleUnlinkRepo(repo.id, repo.name)}
                                  disabled={unlinkingRepoId === repo.id}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 text-xs font-medium transition-colors"
                                  title="Unlink from workspace"
                                >
                                  <Unlink className="w-3 h-3" />
                                  <span>Unlink</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Quick Link Additional Repository Form */}
                      <form onSubmit={handleLinkNewRepo} className="p-4 rounded-2xl border dark:border-white/[0.08] border-slate-200 dark:bg-white/[0.02] bg-slate-50 space-y-3">
                        <span className="text-xs font-bold dark:text-white text-slate-800 flex items-center gap-1.5">
                          <Plus className="w-3.5 h-3.5 text-indigo-400" />
                          Link Another Repository (owner/repo)
                        </span>

                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={newRepoInput}
                            onChange={(e) => setNewRepoInput(e.target.value)}
                            placeholder="e.g. facebook/react or your-username/repo-name"
                            className="flex-1 px-3 py-2 rounded-xl dark:bg-black/30 bg-white border dark:border-white/10 border-slate-200 text-xs dark:text-white text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 font-mono shadow-sm"
                          />
                          <button
                            type="submit"
                            disabled={linkingRepo || !newRepoInput.trim()}
                            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                          >
                            {linkingRepo ? "Linking..." : "Attach Repo"}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* ════════════ TAB 3: TEAM & ROLES (RBAC) ════════════ */}
                  {activeTab === "members" && (
                    <div className="space-y-5">
                      <div>
                        <h4 className="text-sm font-bold dark:text-white text-slate-900">
                          Workspace Members & Permissions
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Invite teammates and assign roles (Manager, Developer, QA, Viewer).
                        </p>
                      </div>

                      {/* Members List */}
                      <div className="space-y-2">
                        {members.length === 0 ? (
                          <div className="p-4 rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/[0.06] border-slate-200 flex items-center justify-between">
                            <span className="text-xs font-medium dark:text-slate-300 text-slate-700">
                              {projectData?.owner?.name || currentUser?.name} (Owner)
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400">
                              MANAGER
                            </span>
                          </div>
                        ) : (
                          members.map((m) => (
                            <div
                              key={m.userId || m.id}
                              className="p-3 px-4 rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/[0.06] border-slate-200 flex items-center justify-between gap-3 shadow-sm"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                                  {m.user?.name ? m.user.name[0].toUpperCase() : "U"}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold dark:text-white text-slate-900 truncate">
                                      {m.user?.name || "Member"}
                                    </span>
                                    {m.userId === projectData?.ownerId && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                        Owner
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-slate-500 truncate block">
                                    {m.user?.email}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/10 dark:text-slate-300 text-slate-700 border dark:border-white/10 border-slate-200">
                                  {m.role}
                                </span>

                                {m.userId !== projectData?.ownerId && isManager && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMember(m.userId, m.user?.name)}
                                    disabled={removingUserId === m.userId}
                                    className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                                    title="Remove member"
                                  >
                                    <UserMinus className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Add Member Form */}
                      {isManager && (
                        <form onSubmit={handleInviteMember} className="p-4 rounded-2xl border dark:border-white/[0.08] border-slate-200 dark:bg-white/[0.02] bg-slate-50 space-y-3">
                          <span className="text-xs font-bold dark:text-white text-slate-800 flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-indigo-400" />
                            Invite Member by Email
                          </span>

                          <div className="flex flex-col sm:flex-row items-center gap-2">
                            <input
                              type="email"
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                              placeholder="colleague@company.com"
                              required
                              className="w-full sm:flex-1 px-3 py-2 rounded-xl dark:bg-black/30 bg-white border dark:border-white/10 border-slate-200 text-xs dark:text-white text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 shadow-sm"
                            />

                            <select
                              value={inviteRole}
                              onChange={(e) => setInviteRole(e.target.value)}
                              className="w-full sm:w-auto px-3 py-2 rounded-xl dark:bg-black/30 bg-white border dark:border-white/10 border-slate-200 text-xs dark:text-white text-slate-800 outline-none cursor-pointer shadow-sm"
                            >
                              {ROLE_OPTIONS.map((r) => (
                                <option key={r.value} value={r.value} className="dark:bg-slate-900 text-slate-800 dark:text-white">
                                  {r.label}
                                </option>
                              ))}
                            </select>

                            <button
                              type="submit"
                              disabled={inviting || !inviteEmail.trim()}
                              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                            >
                              {inviting ? "Inviting..." : "Send Invite"}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}

                  {/* ════════════ TAB 4: HEALTH & METRICS ════════════ */}
                  {activeTab === "metrics" && (
                    <div className="space-y-5">
                      <div>
                        <h4 className="text-sm font-bold dark:text-white text-slate-900">
                          Workspace Activity & Health
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          High-level velocity and resource metrics across this workspace.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="p-4 rounded-2xl dark:bg-white/[0.03] bg-slate-50 border dark:border-white/[0.06] border-slate-200">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">
                            Total Tasks
                          </span>
                          <span className="text-xl font-extrabold dark:text-white text-slate-900">
                            {projectData?._count?.tasks ?? 0}
                          </span>
                        </div>

                        <div className="p-4 rounded-2xl dark:bg-white/[0.03] bg-slate-50 border dark:border-white/[0.06] border-slate-200">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">
                            Team Size
                          </span>
                          <span className="text-xl font-extrabold dark:text-white text-slate-900">
                            {members.length || 1}
                          </span>
                        </div>

                        <div className="p-4 rounded-2xl dark:bg-white/[0.03] bg-slate-50 border dark:border-white/[0.06] border-slate-200">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">
                            Git Repositories
                          </span>
                          <span className="text-xl font-extrabold text-indigo-400">
                            {repositories.length}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl dark:bg-white/[0.02] bg-slate-50 border dark:border-white/[0.06] border-slate-200 flex items-center justify-between">
                        <div>
                          <h5 className="text-xs font-bold dark:text-white text-slate-900">
                            Real-Time Commit Feeds & Bug Risk
                          </h5>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Detailed weekly velocity and ML bug risk predictions are active for this space.
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          Healthy
                        </span>
                      </div>
                    </div>
                  )}

                  {/* ════════════ TAB 5: DANGER ZONE ════════════ */}
                  {activeTab === "danger" && (
                    <div className="space-y-5">
                      <div>
                        <h4 className="text-sm font-bold text-rose-500 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4" />
                          Danger Zone
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Irreversible actions for this workspace. Proceed with extreme caution.
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/5 space-y-3">
                        <div>
                          <h5 className="text-xs font-bold text-rose-400">
                            Delete This Workspace Permanently
                          </h5>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Once deleted, all sprints, tasks, document attachments, and repository bindings for{" "}
                            <strong className="text-rose-300">"{projectData?.name}"</strong> will be permanently wiped.
                          </p>
                        </div>

                        <div className="space-y-2 pt-1">
                          <label className="text-[11px] text-slate-400 block">
                            Type <code className="text-rose-400 font-mono font-bold">{projectData?.name}</code> to confirm:
                          </label>
                          <input
                            type="text"
                            value={confirmName}
                            onChange={(e) => setConfirmName(e.target.value)}
                            placeholder={projectData?.name}
                            className="w-full px-3 py-2 rounded-xl dark:bg-black/40 bg-white border border-rose-500/30 text-xs dark:text-white text-slate-900 placeholder-slate-500 outline-none focus:border-rose-500 font-mono shadow-sm"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleDeleteWorkspace}
                          disabled={confirmName !== projectData?.name || deleting}
                          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-rose-600/20"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>{deleting ? "Deleting Workspace..." : "Permanently Delete Workspace"}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 px-6 border-t dark:border-white/[0.08] border-slate-200 dark:bg-white/[0.02] bg-slate-50 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Status: <strong className="dark:text-slate-200 text-slate-700">{status}</strong>
            </span>

            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl dark:bg-white/5 bg-slate-200 hover:bg-slate-300 dark:hover:bg-white/10 dark:text-slate-300 text-slate-700 font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
