import React, { useState } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import useAuthStore from "../store/useAuthStore";
import {
  Plus,
  Folder,
  ChevronDown,
  ChevronRight,
  Search,
  Hash,
  Users,
  X,
} from "lucide-react";

export default function SidePanel({ isOpen }) {
  const { projects, currentProject, setCurrentProject, createProject } = useAuthStore();
  const [expandedSpaces, setExpandedSpaces] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjName, setNewProjName] = useState("");
  const [newProjDesc, setNewProjDesc] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const toggleExpand = (id) => {
    setExpandedSpaces((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    if (!newProjName.trim()) {
      setErrorMsg("Space name is required");
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

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 260, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="glass-sidebar border-r flex flex-col h-full overflow-hidden select-none flex-shrink-0 relative z-20"
        >
          {/* Header */}
          <div className="p-4 pb-3 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[12px] font-bold uppercase tracking-widest dark:text-dp-text-muted text-dp-text-light-muted">
                Spaces
              </h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150 dark:hover:bg-dp-dark-surface-hover hover:bg-dp-light-bg-secondary dark:text-dp-text-muted text-dp-text-light-muted hover:text-dp-primary"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 dark:text-dp-text-muted text-dp-text-light-muted" />
              <input
                type="text"
                placeholder="Search spaces..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="glass-input w-full pl-8 py-2 text-[13px]"
              />
            </div>
          </div>

          {/* Spaces List */}
          <div className="flex-1 overflow-y-auto px-2.5 py-1 space-y-0.5">
            {filteredProjects.length === 0 ? (
              <div className="px-2 py-10 text-center">
                <Folder className="w-7 h-7 mx-auto mb-2.5 dark:text-dp-text-muted text-dp-text-light-muted opacity-50" />
                <p className="text-[12px] dark:text-dp-text-muted text-dp-text-light-muted">
                  {searchQuery ? "No spaces found" : "Create your first space"}
                </p>
              </div>
            ) : (
              filteredProjects.map((proj) => {
                const isSelected = currentProject?.id === proj.id;
                const isExpanded = expandedSpaces[proj.id];

                return (
                  <div key={proj.id}>
                    {/* Space Item */}
                    <button
                      onClick={() => {
                        setCurrentProject(proj);
                        toggleExpand(proj.id);
                      }}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 group ${
                        isSelected
                          ? "dark:bg-dp-primary/10 bg-dp-primary/5 text-dp-primary dark:text-dp-primary-light"
                          : "dark:text-dp-text-secondary text-dp-text-light-secondary dark:hover:bg-dp-dark-surface-hover hover:bg-dp-light-bg-secondary"
                      }`}
                    >
                      {/* Expand Arrow */}
                      <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </span>

                      {/* Folder Icon */}
                      <span className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 text-[11px] font-bold ${
                        isSelected
                          ? "bg-dp-primary text-white"
                          : "dark:bg-dp-dark-elevated bg-dp-light-bg-secondary dark:text-dp-text-muted text-dp-text-light-muted"
                      }`}>
                        {proj.name.charAt(0).toUpperCase()}
                      </span>

                      {/* Name */}
                      <span className="truncate flex-1 text-left font-semibold">{proj.name}</span>

                      {/* Status dot */}
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        proj.status === "ACTIVE"
                          ? "bg-dp-success"
                          : "dark:bg-dp-text-muted bg-dp-text-light-muted opacity-40"
                      }`} />
                    </button>

                    {/* Nested items */}
                    <AnimatePresence>
                      {isExpanded && isSelected && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          className="overflow-hidden"
                        >
                          <div className="ml-7 pl-3 border-l dark:border-dp-dark-border-light border-dp-light-border py-1.5 space-y-0.5">
                            <div className="flex items-center gap-2.5 px-2.5 py-1.5 text-[13px] dark:text-dp-text-muted text-dp-text-light-muted rounded cursor-default">
                              <Hash className="w-3.5 h-3.5" />
                              <span>General</span>
                            </div>
                            <div className="flex items-center gap-2.5 px-2.5 py-1.5 text-[13px] dark:text-dp-text-muted text-dp-text-light-muted rounded cursor-default">
                              <Users className="w-3.5 h-3.5" />
                              <span>Members</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </div>

          {/* New Space Button */}
          <div className="p-3 flex-shrink-0">
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150 dark:text-dp-text-muted text-dp-text-light-muted dark:hover:bg-dp-dark-surface-hover hover:bg-dp-light-bg-secondary hover:text-dp-primary"
            >
              <Plus className="w-4 h-4" />
              New Space
            </button>
          </div>

          {/* ══════ Create Space Modal ══════ */}
          <AnimatePresence>
            {showCreateModal && ReactDOM.createPortal(
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 modal-overlay flex items-center justify-center z-[9999]"
                onClick={() => setShowCreateModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 10 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="glass-card glossy-card w-[460px] p-8 relative z-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal Header */}
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-display font-bold dark:text-dp-text-primary text-dp-text-light-primary">
                      Create a New Space
                    </h3>
                    <button
                      onClick={() => { setShowCreateModal(false); setNewProjName(""); setNewProjDesc(""); setErrorMsg(""); }}
                      className="w-8 h-8 rounded-xl flex items-center justify-center dark:hover:bg-dp-dark-surface-hover hover:bg-dp-light-bg-secondary dark:text-dp-text-muted text-dp-text-light-muted transition-colors"
                    >
                      <X className="w-4.5 h-4.5" />
                    </button>
                  </div>

                  <form onSubmit={handleCreateProject} className="space-y-5">
                    <div>
                      <label className="block text-[12px] font-bold uppercase tracking-wider dark:text-dp-text-muted text-dp-text-light-muted mb-2">
                        Space Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Mobile App Development"
                        value={newProjName}
                        onChange={(e) => setNewProjName(e.target.value)}
                        className="glass-input w-full"
                        required
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="block text-[12px] font-bold uppercase tracking-wider dark:text-dp-text-muted text-dp-text-light-muted mb-2">
                        Description
                      </label>
                      <textarea
                        rows="3"
                        placeholder="Add details about this workspace..."
                        value={newProjDesc}
                        onChange={(e) => setNewProjDesc(e.target.value)}
                        className="glass-input w-full resize-none"
                      />
                    </div>

                    {errorMsg && (
                      <p className="text-sm text-dp-danger font-semibold">{errorMsg}</p>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => { setShowCreateModal(false); setNewProjName(""); setNewProjDesc(""); setErrorMsg(""); }}
                        className="btn-ghost"
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn-primary">
                        Create Space
                      </button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>,
              document.body
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
