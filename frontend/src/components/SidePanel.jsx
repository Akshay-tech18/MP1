import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Folder,
  ChevronDown,
  Search,
  Hash,
  PanelLeftClose,
  X
} from "lucide-react";
import useAuthStore from "../store/useAuthStore";

const CHANNELS = ["general-chat", "doubts", "announcements", "standups"];

/**
 * ClickUp-style secondary side panel listing Spaces, Channels & DMs.
 * Collapsible to give more workspace area.
 */
export default function SidePanel() {
  const { projects, currentProject, setCurrentProject, createProject } = useAuthStore();

  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const [openSpaces, setOpenSpaces] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjName, setNewProjName] = useState("");
  const [newProjDesc, setNewProjDesc] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  const toggleSpace = (id) =>
    setOpenSpaces((s) => ({ ...s, [id]: !s[id] }));

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

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="glass-sidebar w-10 flex flex-col items-center pt-4 text-ink-muted hover:text-ink transition flex-shrink-0 z-20"
        title="Expand panel"
      >
        <PanelLeftClose className="w-4 h-4 rotate-180" />
      </button>
    );
  }

  return (
    <div className="glass-sidebar w-64 flex flex-col h-screen flex-shrink-0 select-none z-20">
      {/* Header */}
      <div className="px-4 h-14 flex items-center justify-between border-b border-edge-soft">
        <span className="font-display font-bold text-sm text-ink">Spaces</span>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-muted transition"
          title="Collapse panel"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-3">
        <div className="relative glow-focus rounded-lg border border-edge-soft bg-surface-muted flex items-center">
          <Search className="w-3.5 h-3.5 text-ink-muted absolute left-2.5" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="w-full bg-transparent pl-8 pr-2 py-1.5 text-xs text-ink placeholder:text-ink-faint outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-4">
        {/* Spaces */}
        <div>
          <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider px-2 block mb-1">
            Spaces
          </span>
          <div className="space-y-0.5">
            {filtered.length === 0 && (
              <span className="text-[11px] text-ink-faint italic px-2 block py-1.5">
                No spaces found.
              </span>
            )}
            {filtered.map((proj) => {
              const expanded = openSpaces[proj.id];
              const active = currentProject?.id === proj.id;
              return (
                <div key={proj.id}>
                  <div
                    onClick={() => {
                      setCurrentProject(proj);
                      toggleSpace(proj.id);
                    }}
                    className={`group w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs cursor-pointer transition ${
                      active
                        ? "bg-accent/15 text-ink font-semibold"
                        : "text-ink-soft hover:bg-surface-muted"
                    }`}
                  >
                    <ChevronDown
                      className={`w-3 h-3 flex-shrink-0 transition-transform ${
                        expanded ? "" : "-rotate-90"
                      }`}
                    />
                    <Folder className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                    <span className="truncate flex-1">{proj.name}</span>
                  </div>
                  <AnimatePresence>
                    {expanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="ml-7 pl-2 border-l border-edge-soft space-y-0.5 my-0.5">
                          {["Board", "Chat", "Analytics"].map((child) => (
                            <div
                              key={child}
                              className="px-2 py-1 text-[11px] text-ink-faint hover:text-ink-soft cursor-pointer rounded"
                            >
                              {child}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        {/* Channels */}
        <div>
          <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider px-2 block mb-1">
            Channels
          </span>
          <div className="space-y-0.5">
            {CHANNELS.map((ch) => (
              <div
                key={ch}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-ink-soft hover:bg-surface-muted cursor-pointer transition"
              >
                <Hash className="w-3.5 h-3.5 text-ink-muted" />
                <span className="truncate">{ch}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* New Space button */}
      <div className="p-3 border-t border-edge-soft">
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-white bg-accent hover:bg-accent-strong transition shadow-glow-sm"
        >
          <Plus className="w-4 h-4" />
          New Space
        </button>
      </div>

      {/* Create Space Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 12 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="glass-card w-full max-w-md p-6 rounded-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-bold text-ink">Create a New Space</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-muted transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateProject} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">
                    Space Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mobile App Development"
                    value={newProjName}
                    onChange={(e) => setNewProjName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-edge-soft bg-surface-muted text-sm text-ink glow-focus"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">
                    Description
                  </label>
                  <textarea
                    rows="3"
                    placeholder="Add details about the objectives of this workspace."
                    value={newProjDesc}
                    onChange={(e) => setNewProjDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-edge-soft bg-surface-muted text-sm text-ink glow-focus resize-none"
                  />
                </div>

                {errorMsg && <p className="text-xs text-red-400 font-semibold">{errorMsg}</p>}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-sm text-ink-muted hover:bg-surface-muted rounded-lg transition font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm bg-accent hover:bg-accent-strong text-white rounded-lg transition font-semibold"
                  >
                    Create Space
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}