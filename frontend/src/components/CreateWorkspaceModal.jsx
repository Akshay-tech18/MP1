import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import client from "../api/client";
import useAuthStore from "../store/useAuthStore";
import {
  X,
  Plus,
  Github,
  Users,
  Search,
  ChevronDown,
  Check,
  AlertCircle,
  FolderPlus,
  Trash2,
  Lock,
  Globe,
} from "lucide-react";

const AVAILABLE_ROLES = [
  { value: "DEVELOPER", label: "Developer", desc: "Can manage tasks, view code risks and chats" },
  { value: "QA_TESTER", label: "QA Tester", desc: "Can test cards, mark blocked, comment" },
  { value: "MANAGER", label: "Manager", desc: "Can manage sprints, members, and settings" },
  { value: "VIEWER", label: "Viewer", desc: "Read-only access to boards and metrics" },
];

export default function CreateWorkspaceModal({ isOpen, onClose }) {
  const { createProject } = useAuthStore();

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  
  // GitHub Repositories
  const [repos, setRepos] = useState([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [githubError, setGithubError] = useState("");
  const [selectedRepo, setSelectedRepo] = useState("");
  const [repoDropdownOpen, setRepoDropdownOpen] = useState(false);
  const [repoSearch, setRepoSearch] = useState("");

  // Member Invites
  const [invitees, setInvitees] = useState([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("DEVELOPER");
  const [inviteError, setInviteError] = useState("");

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [warningMsg, setWarningMsg] = useState("");

  // Fetch GitHub repositories when modal is opened
  useEffect(() => {
    if (!isOpen) return;

    async function fetchRepos() {
      setLoadingRepos(true);
      setGithubError("");
      try {
        const res = await client.get("/github/repos");
        const repoList = res.data?.data?.repositories || res.data?.data?.repos;
        if (res.data?.success && Array.isArray(repoList)) {
          setRepos(repoList);
        }
      } catch (err) {
        const msg = err.response?.data?.message || "Connect your GitHub account to link repositories.";
        setGithubError(msg);
      } finally {
        setLoadingRepos(false);
      }
    }

    fetchRepos();
  }, [isOpen]);

  // Reset form when modal closes
  const handleClose = () => {
    setName("");
    setDescription("");
    setSelectedRepo("");
    setInvitees([]);
    setInviteEmail("");
    setInviteRole("DEVELOPER");
    setErrorMsg("");
    setWarningMsg("");
    setGithubError("");
    setRepoSearch("");
    setRepoDropdownOpen(false);
    onClose();
  };

  // Add an invitee to list
  const handleAddInvitee = (e) => {
    e.preventDefault();
    setInviteError("");

    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;

    // Simple email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setInviteError("Please enter a valid email address.");
      return;
    }

    if (invitees.some((inv) => inv.email === email)) {
      setInviteError("This user is already added to the invite list.");
      return;
    }

    setInvitees([...invitees, { email, role: inviteRole }]);
    setInviteEmail("");
  };

  // Remove invitee
  const handleRemoveInvitee = (index) => {
    setInvitees(invitees.filter((_, i) => i !== index));
  };

  // Submit complete workspace creation payload
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setWarningMsg("");

    if (!name.trim()) {
      setErrorMsg("Workspace name is required");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        repoName: selectedRepo.trim() || undefined,
        invitees: invitees.length > 0 ? invitees : undefined,
      };

      const res = await createProject(payload);
      if (res.success) {
        if (res.warnings && res.warnings.length > 0) {
          // If there were non-blocking warnings (e.g. repo linking note)
          setWarningMsg(res.warnings.join(" "));
          setTimeout(() => {
            handleClose();
          }, 1800);
        } else {
          handleClose();
        }
      } else {
        setErrorMsg(res.message || "Failed to create workspace");
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to create workspace");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter repos for searchable dropdown
  const filteredRepos = repos.filter((r) =>
    r.name.toLowerCase().includes(repoSearch.toLowerCase())
  );

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 modal-overlay flex items-center justify-center z-[9999] p-4 select-none overflow-y-auto"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="glass-card glossy-card w-full max-w-xl p-6 sm:p-7 relative z-10 max-h-[90vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b dark:border-dp-dark-border-light/50 border-dp-light-border flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-dp-primary/10 text-dp-primary flex items-center justify-center">
                <FolderPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-display font-bold dark:text-dp-text-primary text-dp-text-light-primary tracking-tight">
                  Create Workspace Wizard
                </h3>
                <p className="text-[12px] dark:text-dp-text-muted text-dp-text-light-muted">
                  Set up a new space, link your GitHub repository, and invite team members.
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center dark:hover:bg-dp-dark-surface-hover hover:bg-dp-light-bg-secondary dark:text-dp-text-muted text-dp-text-light-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Form Body */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-5 space-y-6 pr-1">
            {/* 1. Basic Details */}
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider dark:text-dp-text-muted text-dp-text-light-muted mb-1.5">
                  Workspace Name <span className="text-dp-danger">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Core Engine & Mobile Apps"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="glass-input w-full text-sm"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider dark:text-dp-text-muted text-dp-text-light-muted mb-1.5">
                  Description
                </label>
                <textarea
                  rows="2"
                  placeholder="Brief summary of projects, architecture, and goals..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="glass-input w-full text-sm resize-none"
                />
              </div>
            </div>

            {/* 2. GitHub Repository Integration */}
            <div className="pt-2 border-t dark:border-dp-dark-border-light/40 border-dp-light-border/60">
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider dark:text-dp-text-muted text-dp-text-light-muted">
                  <Github className="w-3.5 h-3.5 text-dp-primary" />
                  Link GitHub Repository
                  <span className="text-[10px] font-normal lowercase dark:text-dp-text-muted opacity-80">(optional)</span>
                </label>
                {selectedRepo && (
                  <button
                    type="button"
                    onClick={() => setSelectedRepo("")}
                    className="text-[11px] text-dp-danger hover:underline font-medium"
                  >
                    Clear selection
                  </button>
                )}
              </div>

              {/* Repo Selector UI */}
              <div className="relative">
                <div
                  onClick={() => setRepoDropdownOpen(!repoDropdownOpen)}
                  className={`glass-input w-full flex items-center justify-between cursor-pointer text-sm ${
                    selectedRepo ? "border-dp-primary/40 dark:border-dp-primary/40" : ""
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Github className="w-4 h-4 dark:text-dp-text-muted text-dp-text-light-muted flex-shrink-0" />
                    <span className={selectedRepo ? "font-semibold dark:text-dp-text-primary text-dp-text-light-primary" : "dark:text-dp-text-muted text-dp-text-light-muted"}>
                      {selectedRepo || (loadingRepos ? "Loading your repositories..." : "Select a GitHub repository...")}
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 dark:text-dp-text-muted text-dp-text-light-muted transition-transform ${repoDropdownOpen ? "rotate-180" : ""}`} />
                </div>

                {/* Dropdown Menu */}
                {repoDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 glass-card glossy-card z-50 p-2 shadow-2xl max-h-56 overflow-hidden flex flex-col border dark:border-dp-dark-border-light border-dp-light-border">
                    <div className="relative mb-2">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 dark:text-dp-text-muted text-dp-text-light-muted" />
                      <input
                        type="text"
                        placeholder="Search repos..."
                        value={repoSearch}
                        onChange={(e) => setRepoSearch(e.target.value)}
                        className="glass-input w-full pl-8 py-1.5 text-xs"
                        autoFocus
                      />
                    </div>

                    <div className="overflow-y-auto space-y-1 flex-1">
                      {/* Allow custom repository entry */}
                      {repoSearch.trim() && (
                        <div
                          onClick={() => {
                            setSelectedRepo(repoSearch.trim());
                            setRepoDropdownOpen(false);
                          }}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-xs font-semibold dark:bg-dp-primary/10 bg-dp-primary/5 text-dp-primary dark:hover:bg-dp-primary/20 hover:bg-dp-primary/10 transition-colors border border-dashed border-dp-primary/30"
                        >
                          <Plus className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">Use repository: <strong className="font-mono">{repoSearch.trim()}</strong></span>
                        </div>
                      )}

                      {loadingRepos ? (
                        <div className="p-4 text-center text-xs dark:text-dp-text-muted text-dp-text-light-muted">
                          Fetching repositories from GitHub...
                        </div>
                      ) : (
                        <>
                          {githubError && (
                            <div className="p-2.5 text-center text-xs dark:text-amber-400 text-amber-600 bg-amber-500/10 rounded-lg space-y-1">
                              <div>{githubError}</div>
                              <div className="text-[11px] opacity-80">Type <code className="font-mono font-bold">owner/repo</code> above to link manually.</div>
                            </div>
                          )}

                          {filteredRepos.length === 0 && !githubError && !repoSearch.trim() && (
                            <div className="p-4 text-center text-xs dark:text-dp-text-muted text-dp-text-light-muted">
                              No repositories found for this account.
                            </div>
                          )}

                          {filteredRepos.map((repo) => {
                            const isSelected = selectedRepo === repo.name;
                            return (
                              <div
                                key={repo.id || repo.name}
                                onClick={() => {
                                  setSelectedRepo(repo.name);
                                  setRepoDropdownOpen(false);
                                }}
                                className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs transition-colors ${
                                  isSelected
                                    ? "bg-dp-primary text-white"
                                    : "dark:hover:bg-dp-dark-surface-hover hover:bg-dp-light-bg-secondary dark:text-dp-text-primary text-dp-text-light-primary"
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  {repo.private ? (
                                    <Lock className="w-3.5 h-3.5 opacity-70 flex-shrink-0" />
                                  ) : (
                                    <Globe className="w-3.5 h-3.5 opacity-70 flex-shrink-0" />
                                  )}
                                  <span className="font-medium truncate">{repo.name}</span>
                                </div>
                                {isSelected && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <p className="text-[11px] dark:text-dp-text-muted text-dp-text-light-muted mt-1.5">
                Automatically tracks commits, links pull requests, and activates bug risk prediction.
              </p>
            </div>

            {/* 3. Team Member Invitations */}
            <div className="pt-2 border-t dark:border-dp-dark-border-light/40 border-dp-light-border/60">
              <label className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider dark:text-dp-text-muted text-dp-text-light-muted mb-2">
                <Users className="w-3.5 h-3.5 text-dp-primary" />
                Invite Team Members
                <span className="text-[10px] font-normal lowercase dark:text-dp-text-muted opacity-80">(optional)</span>
              </label>

              {/* Dynamic Add Invitee Row */}
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => {
                    setInviteEmail(e.target.value);
                    if (inviteError) setInviteError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddInvitee(e);
                    }
                  }}
                  className="glass-input flex-1 text-xs"
                />

                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="glass-input sm:w-36 text-xs dark:bg-dp-dark-surface bg-white"
                >
                  {AVAILABLE_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleAddInvitee}
                  className="btn-primary flex items-center justify-center gap-1 px-3 py-2 text-xs flex-shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>

              {inviteError && (
                <p className="text-[11px] text-dp-danger font-medium mt-1.5">{inviteError}</p>
              )}

              {/* Invitees List Badges */}
              {invitees.length > 0 && (
                <div className="mt-3 space-y-1.5 max-h-32 overflow-y-auto">
                  {invitees.map((inv, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-3 py-1.5 rounded-lg dark:bg-dp-dark-surface/80 bg-dp-light-bg-secondary border dark:border-dp-dark-border-light border-dp-light-border text-xs"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="font-medium dark:text-dp-text-primary text-dp-text-light-primary truncate">
                          {inv.email}
                        </span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full dark:bg-dp-primary/15 bg-dp-primary/10 text-dp-primary">
                          {inv.role.replace("_", " ")}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveInvitee(idx)}
                        className="text-dp-text-muted hover:text-dp-danger transition-colors p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Error and Warning Messages */}
            {errorMsg && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-dp-danger/10 border border-dp-danger/20 text-dp-danger text-xs font-semibold">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {warningMsg && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-medium">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{warningMsg}</span>
              </div>
            )}
          </form>

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t dark:border-dp-dark-border-light/50 border-dp-light-border flex items-center justify-end gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="btn-ghost text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !name.trim()}
              className="btn-primary text-xs flex items-center gap-2"
            >
              {submitting ? "Creating Workspace..." : "Create Workspace"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
