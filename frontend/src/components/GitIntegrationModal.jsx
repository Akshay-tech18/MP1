import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Github,
  X,
  Check,
  Search,
  ExternalLink,
  KeyRound,
  RefreshCw,
  Lock,
  Globe,
  GitBranch,
  Star,
  CheckCircle2,
  AlertCircle,
  Link2,
  Unlink,
  Sparkles,
} from "lucide-react";
import client from "../api/client";
import useAuthStore from "../store/useAuthStore";

export default function GitIntegrationModal({ isOpen, onClose }) {
  const { currentProject, projects, createProject, fetchProjects, setCurrentProject, token } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [patToken, setPatToken] = useState("");
  const [showPatInput, setShowPatInput] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [gitStatus, setGitStatus] = useState({ connected: false, user: null });
  const [repositories, setRepositories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [linkingRepoName, setLinkingRepoName] = useState(null);

  // 1. Fetch GitHub Status and Repositories
  const fetchStatusAndRepos = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const statusRes = await client.get("/github/status");
      const statusData = statusRes.data?.data || statusRes.data;
      setGitStatus(statusData);

      if (statusData.connected) {
        // Fetch repositories
        try {
          const reposRes = await client.get("/github/repos");
          const reposData = reposRes.data?.data?.repositories || reposRes.data?.repositories || [];
          setRepositories(reposData);
        } catch (repoErr) {
          console.error("Failed to load repositories:", repoErr);
        }
      }
    } catch (err) {
      console.error("Error checking GitHub status:", err);
      setGitStatus({ connected: false, user: null });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchStatusAndRepos();
    }
  }, [isOpen, fetchStatusAndRepos]);

  if (!isOpen) return null;

  // Handle OAuth Redirect Flow
  const handleConnectOAuth = () => {
    const authUrl = `${client.defaults.baseURL || "http://localhost:5001/api"}/auth/github?token=${token || ""}`;
    window.location.href = authUrl;
  };

  // Handle Connecting via Personal Access Token
  const handleConnectPAT = async (e) => {
    e.preventDefault();
    if (!patToken.trim()) return;

    setConnecting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await client.post("/github/connect", { token: patToken.trim() });
      if (res.data?.success) {
        setSuccessMsg("GitHub connected successfully!");
        setPatToken("");
        setShowPatInput(false);
        fetchStatusAndRepos();
      } else {
        setErrorMsg(res.data?.message || "Failed to connect token");
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Invalid GitHub token. Please verify permissions.");
    } finally {
      setConnecting(false);
    }
  };

  // Handle Disconnect
  const handleDisconnect = async () => {
    if (!window.confirm("Are you sure you want to disconnect your GitHub account?")) return;

    try {
      await client.delete("/github/disconnect");
      setGitStatus({ connected: false, user: null });
      setRepositories([]);
      setSuccessMsg("Disconnected GitHub account");
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to disconnect");
    }
  };

  // Handle Linking a Repository to a Workspace (auto-creates workspace if none exists)
  const handleLinkRepo = async (repo) => {
    setLinkingRepoName(repo.fullName);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      let targetProject = currentProject;

      // 1. If user has NO workspace created yet in their account:
      if (!targetProject && (!projects || projects.length === 0)) {
        const rawName = (repo.name || repo.fullName.split("/")[1] || "Workspace").trim();
        const workspaceName = rawName.length < 2 ? `${rawName}-workspace` : rawName.slice(0, 100);
        const workspaceDesc = (repo.description || `Workspace for ${repo.fullName}`).slice(0, 500);

        const createRes = await createProject({
          name: workspaceName,
          description: workspaceDesc,
          repoName: repo.fullName,
        });

        if (createRes && createRes.success) {
          setSuccessMsg(`Created workspace "${workspaceName}" and linked ${repo.fullName}!`);
          // Mark as linked locally
          setRepositories((prev) =>
            prev.map((r) => (r.id === repo.id ? { ...r, isLinked: true } : r))
          );
          await fetchProjects();
          return;
        } else {
          setErrorMsg(createRes?.message || "Failed to create workspace for repository");
          return;
        }
      }

      // 2. If workspaces exist but none was currently active, default to first workspace:
      if (!targetProject && projects && projects.length > 0) {
        targetProject = projects[0];
        setCurrentProject(targetProject);
      }

      if (!targetProject) {
        setErrorMsg("Please select or create a workspace to link this repository.");
        return;
      }

      // 3. Link to target workspace
      const res = await client.post(`/projects/${targetProject.id}/repositories`, {
        repoName: repo.fullName,
      });

      if (res.data?.success) {
        setSuccessMsg(`Linked ${repo.fullName} to workspace "${targetProject.name}"!`);
        // Mark as linked locally
        setRepositories((prev) =>
          prev.map((r) => (r.id === repo.id ? { ...r, isLinked: true } : r))
        );
        await fetchProjects();
      } else {
        setErrorMsg(res.data?.message || "Failed to link repository");
      }
    } catch (err) {
      console.error("Link repo error:", err);
      setErrorMsg(err.response?.data?.message || err.message || "Failed to link repository");
    } finally {
      setLinkingRepoName(null);
    }
  };

  // Filter Repositories by search
  const filteredRepos = repositories.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.language && r.language.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-2xl max-h-[88vh] rounded-3xl dark:bg-[#0a0a0c]/95 bg-white/95 backdrop-blur-2xl border dark:border-white/[0.12] border-slate-200 dark:text-slate-200 text-slate-800 shadow-[0_25px_70px_rgba(0,0,0,0.65)] flex flex-col overflow-hidden z-10"
        >
          {/* Top Specular Line */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent pointer-events-none" />

          {/* Header */}
          <div className="p-5 px-6 border-b dark:border-white/[0.08] border-slate-200 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md border border-white/10 flex-shrink-0">
                <Github className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold dark:text-white text-slate-900 tracking-tight flex items-center gap-2">
                  <span>GitHub Integration</span>
                  {gitStatus.connected ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Connected
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      Not Linked
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sync repositories, automated PR reviews & webhook commit feeds with DevPilot.
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

          {/* Feedback Alerts */}
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

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-3">
                <div className="spinner-gradient mb-2" />
                <span className="text-xs font-medium">Checking GitHub connection...</span>
              </div>
            ) : !gitStatus.connected ? (
              /* ═════════ NOT CONNECTED STATE ═════════ */
              <div className="space-y-6 py-2">
                <div className="p-5 rounded-2xl dark:bg-white/[0.03] bg-slate-50 border dark:border-white/[0.06] border-slate-200 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-900 to-indigo-950 flex items-center justify-center mx-auto text-white shadow-xl border border-white/10">
                    <Github className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold dark:text-white text-slate-900">
                      Connect Your GitHub Account
                    </h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                      Link your repositories to inspect commits, track pull requests, and calculate bug risk with DevPilot's AI engine.
                    </p>
                  </div>

                  {/* Primary 1-Click OAuth Button */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      onClick={handleConnectOAuth}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-lg transition-all active:scale-95 border border-white/10 group"
                    >
                      <Github className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      <span>Connect with GitHub (OAuth)</span>
                    </button>

                    <button
                      onClick={() => setShowPatInput(!showPatInput)}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl dark:bg-white/5 bg-slate-200/80 hover:bg-slate-300 dark:hover:bg-white/10 dark:text-slate-200 text-slate-700 text-xs font-semibold transition-all border dark:border-white/5 border-slate-300"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Use Personal Token (PAT)</span>
                    </button>
                  </div>
                </div>

                {/* PAT Input Section */}
                {showPatInput && (
                  <form onSubmit={handleConnectPAT} className="p-4 rounded-2xl border dark:border-white/[0.08] border-slate-200 space-y-3 dark:bg-white/[0.02] bg-slate-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold dark:text-white text-slate-800 flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                        Enter GitHub Personal Access Token
                      </span>
                      <a
                        href="https://github.com/settings/tokens"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-indigo-500 hover:underline flex items-center gap-1"
                      >
                        <span>Generate Token</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>

                    <input
                      type="password"
                      value={patToken}
                      onChange={(e) => setPatToken(e.target.value)}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      required
                      className="w-full px-3 py-2 rounded-xl dark:bg-black/30 bg-white border dark:border-white/10 border-slate-200 text-xs dark:text-white text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 font-mono shadow-sm"
                    />

                    <div className="flex items-center justify-between pt-1">
                      <p className="text-[11px] text-slate-500">
                        Requires <code className="text-indigo-400 font-mono">repo</code> & <code className="text-indigo-400 font-mono">read:user</code> scopes.
                      </p>
                      <button
                        type="submit"
                        disabled={connecting}
                        className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                      >
                        {connecting ? "Validating..." : "Save & Connect"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              /* ═════════ CONNECTED STATE (REPO BROWSER) ═════════ */
              <div className="space-y-4">
                {/* Connected User Account Bar */}
                <div className="p-3 px-4 rounded-2xl dark:bg-white/[0.03] bg-slate-50 border dark:border-white/[0.06] border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {gitStatus.user?.avatarUrl ? (
                      <img
                        src={gitStatus.user.avatarUrl}
                        alt="GitHub Avatar"
                        className="w-8 h-8 rounded-xl object-cover ring-1 ring-white/10"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-white font-bold text-xs">
                        GH
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold dark:text-white text-slate-900">
                          {gitStatus.user?.name || gitStatus.user?.username}
                        </span>
                        <a
                          href={gitStatus.user?.profileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-indigo-400 hover:underline flex items-center gap-0.5"
                        >
                          @{gitStatus.user?.username}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {repositories.length} repositories available
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={fetchStatusAndRepos}
                      title="Refresh repositories"
                      className="p-1.5 rounded-lg dark:hover:bg-white/5 hover:bg-slate-200/80 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={handleDisconnect}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 text-[11px] font-medium transition-colors"
                    >
                      <Unlink className="w-3 h-3" />
                      <span>Disconnect</span>
                    </button>
                  </div>
                </div>

                {/* Filter and Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter repositories by name or language..."
                    className="w-full pl-8 pr-3 py-2 rounded-xl dark:bg-white/5 bg-white border dark:border-white/[0.08] border-slate-200 text-xs dark:text-slate-200 text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 shadow-sm"
                  />
                </div>

                {/* Repository List */}
                <div className="space-y-2 max-h-[46vh] overflow-y-auto pr-1 scrollbar-thin">
                  {filteredRepos.length === 0 ? (
                    <div className="p-8 text-center border dark:border-white/[0.06] border-slate-200 rounded-2xl dark:bg-white/[0.01] bg-slate-50 space-y-2">
                      <Github className="w-8 h-8 mx-auto text-slate-400 opacity-60" />
                      <p className="text-xs font-semibold dark:text-white text-slate-800">
                        No repositories found
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Make sure you have created repositories on GitHub with your account.
                      </p>
                    </div>
                  ) : (
                    filteredRepos.map((repo) => (
                      <div
                        key={repo.id}
                        className="p-3.5 rounded-2xl dark:bg-white/[0.03] bg-white hover:bg-slate-50 dark:hover:bg-white/[0.05] border dark:border-white/[0.06] border-slate-200 flex items-center justify-between gap-3 transition-all group shadow-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold dark:text-white text-slate-900 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {repo.fullName}
                            </span>
                            {repo.private ? (
                              <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                <Lock className="w-2.5 h-2.5" />
                                Private
                              </span>
                            ) : (
                              <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                <Globe className="w-2.5 h-2.5" />
                                Public
                              </span>
                            )}
                            <a
                              href={repo.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Open in GitHub"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>

                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {repo.description}
                          </p>

                          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                            {repo.language && (
                              <span className="flex items-center gap-1 font-mono">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                {repo.language}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <GitBranch className="w-2.5 h-2.5" />
                              {repo.defaultBranch}
                            </span>
                            {repo.stars > 0 && (
                              <span className="flex items-center gap-1">
                                <Star className="w-2.5 h-2.5 text-amber-400" />
                                {repo.stars}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Link Button */}
                        <div className="flex-shrink-0">
                          {repo.isLinked ? (
                            <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold shadow-sm">
                              <Check className="w-3.5 h-3.5" />
                              <span>Linked</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleLinkRepo(repo)}
                              disabled={linkingRepoName === repo.fullName}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
                            >
                              <Link2 className="w-3.5 h-3.5" />
                              <span>
                                {linkingRepoName === repo.fullName
                                  ? (!currentProject && (!projects || projects.length === 0)
                                      ? "Creating Space..."
                                      : "Linking...")
                                  : "Link to Space"}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-4 px-6 border-t dark:border-white/[0.08] border-slate-200 dark:bg-white/[0.02] bg-slate-50 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
              <span className="text-[11px] text-slate-500">Active Workspace:</span>
              {projects && projects.length > 0 ? (
                <select
                  value={currentProject?.id || (projects[0] ? projects[0].id : "")}
                  onChange={(e) => {
                    const found = projects.find((p) => p.id === e.target.value);
                    if (found) setCurrentProject(found);
                  }}
                  className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-xs font-semibold px-2.5 py-1 rounded-xl border dark:border-white/10 border-slate-300 outline-none cursor-pointer focus:border-indigo-500 shadow-sm"
                >
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.id} className="dark:bg-slate-900 dark:text-white text-slate-800">
                      {proj.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-[11px] font-medium text-amber-500 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                  None (Linking will auto-create workspace)
                </span>
              )}
            </div>

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
