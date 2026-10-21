import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Flag, Zap, Clock, AlertCircle } from "lucide-react";
import client from "../../api/client";

const formatDateToInput = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function CreateSprintModal({
  isOpen,
  onClose,
  projectId,
  onSprintCreated,
  existingSprintsCount = 0
}) {
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [preset, setPreset] = useState("2w"); // "1w" | "2w" | "4w" | "custom"
  const [startDate, setStartDate] = useState(() => formatDateToInput(new Date()));
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return formatDateToInput(d);
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setName(`Sprint ${existingSprintsCount + 1}`);
      setGoal("");
      setPreset("2w");
      const start = new Date();
      const end = new Date();
      end.setDate(start.getDate() + 14);
      setStartDate(formatDateToInput(start));
      setEndDate(formatDateToInput(end));
      setError(null);
    }
  }, [isOpen, existingSprintsCount]);

  const handlePresetChange = (selectedPreset) => {
    setPreset(selectedPreset);
    const start = new Date(startDate || new Date());
    const end = new Date(start);

    if (selectedPreset === "1w") {
      end.setDate(start.getDate() + 7);
      setEndDate(formatDateToInput(end));
    } else if (selectedPreset === "2w") {
      end.setDate(start.getDate() + 14);
      setEndDate(formatDateToInput(end));
    } else if (selectedPreset === "4w") {
      end.setDate(start.getDate() + 28);
      setEndDate(formatDateToInput(end));
    }
  };

  const handleStartDateChange = (newStart) => {
    setStartDate(newStart);
    if (preset !== "custom") {
      const start = new Date(newStart);
      const end = new Date(start);
      const days = preset === "1w" ? 7 : preset === "2w" ? 14 : 28;
      end.setDate(start.getDate() + days);
      setEndDate(formatDateToInput(end));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Sprint name is required");
      return;
    }

    if (new Date(endDate) <= new Date(startDate)) {
      setError("End date must be after start date");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await client.post(`/projects/${projectId}/sprints`, {
        name: name.trim(),
        goal: goal.trim() || null,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString()
      });

      if (res.data?.success && res.data?.data?.sprint) {
        if (onSprintCreated) {
          onSprintCreated(res.data.data.sprint);
        }
        onClose();
      } else {
        setError(res.data?.message || "Failed to create sprint");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to create sprint");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-lg rounded-2xl bg-[#0f0f12] border border-white/[0.1] shadow-2xl overflow-hidden text-slate-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-white/[0.02]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">Create New Sprint</h3>
                <p className="text-[11px] text-slate-400">Timebox your engineering tasks into an agile delivery cycle</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Sprint Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Sprint Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sprint 1 - Authentication & Core Boards"
                className="w-full px-3.5 py-2 rounded-xl bg-[#17171c] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                autoFocus
                required
              />
            </div>

            {/* Duration Presets */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Duration Cycle Presets</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: "1w", label: "1 Week", desc: "Fast-paced" },
                  { id: "2w", label: "2 Weeks", desc: "Standard" },
                  { id: "4w", label: "4 Weeks", desc: "Monthly" },
                  { id: "custom", label: "Custom", desc: "Flexible" }
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePresetChange(p.id)}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      preset === p.id
                        ? "bg-indigo-500/20 border-indigo-500 text-white font-bold shadow-[0_0_12px_rgba(99,102,241,0.25)]"
                        : "bg-[#17171c] border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/10"
                    }`}
                  >
                    <div className="text-xs">{p.label}</div>
                    <div className="text-[10px] text-slate-500">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Date Pickers */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>Start Date</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#17171c] border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>End Date</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPreset("custom");
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[#17171c] border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  required
                />
              </div>
            </div>

            {/* Sprint Goal */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5 text-amber-400" />
                <span>Sprint Goal (Optional)</span>
              </label>
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="What is the primary deliverable or outcome of this sprint?"
                rows={2}
                className="w-full px-3.5 py-2 rounded-xl bg-[#17171c] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-sm"
              >
                {loading ? "Creating..." : "Create Sprint"}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
