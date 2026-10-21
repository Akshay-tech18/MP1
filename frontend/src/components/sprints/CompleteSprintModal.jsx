import React, { useState } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, AlertTriangle, ArrowRight, Trophy, AlertCircle } from "lucide-react";
import client from "../../api/client";

export default function CompleteSprintModal({
  isOpen,
  onClose,
  sprint,
  tasks = [],
  availableSprints = [],
  projectId,
  onSprintCompleted
}) {
  const [rolloverTarget, setRolloverTarget] = useState("backlog"); // "backlog" | sprintId
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !sprint) return null;

  const sprintTasks = tasks.filter((t) => t.sprintId === sprint.id);
  const completedTasks = sprintTasks.filter((t) => t.status === "COMPLETED");
  const incompleteTasks = sprintTasks.filter((t) => t.status !== "COMPLETED");

  const plannedSprints = availableSprints.filter(
    (s) => s.id !== sprint.id && s.status === "PLANNED"
  );

  const handleComplete = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const targetSprintId = rolloverTarget === "backlog" ? null : rolloverTarget;
      const res = await client.post(`/projects/${projectId}/sprints/${sprint.id}/complete`, {
        targetSprintId
      });

      if (res.data?.success) {
        if (onSprintCompleted) {
          onSprintCompleted(res.data.data);
        }
        onClose();
      } else {
        setError(res.data?.message || "Failed to complete sprint");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to complete sprint");
    } finally {
      setLoading(false);
    }
  };

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
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">Complete {sprint.name}</h3>
                <p className="text-[11px] text-slate-400">Finalize sprint accomplishments and distribute remaining tasks</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleComplete} className="p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Accomplishment Stats Box */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div>
                  <div className="text-lg font-black text-emerald-300">{completedTasks.length}</div>
                  <div className="text-[11px] text-emerald-400/80 font-medium">Tasks Completed</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <div>
                  <div className="text-lg font-black text-amber-300">{incompleteTasks.length}</div>
                  <div className="text-[11px] text-amber-400/80 font-medium">Tasks Incomplete</div>
                </div>
              </div>
            </div>

            {/* Incomplete Task Rollover Picker */}
            {incompleteTasks.length > 0 ? (
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Where should the {incompleteTasks.length} incomplete tasks go?</span>
                </label>

                <div className="space-y-2">
                  <label
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      rolloverTarget === "backlog"
                        ? "bg-indigo-500/15 border-indigo-500/50 text-white"
                        : "bg-[#17171c] border-white/5 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="rollover"
                        value="backlog"
                        checked={rolloverTarget === "backlog"}
                        onChange={() => setRolloverTarget("backlog")}
                        className="text-indigo-600 focus:ring-0"
                      />
                      <div>
                        <div className="text-xs font-semibold text-slate-200">Move to Backlog</div>
                        <div className="text-[10px] text-slate-400">Tasks will be unassigned from sprint and stay in project backlog</div>
                      </div>
                    </div>
                  </label>

                  {plannedSprints.map((ps) => (
                    <label
                      key={ps.id}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        rolloverTarget === ps.id
                          ? "bg-indigo-500/15 border-indigo-500/50 text-white"
                          : "bg-[#17171c] border-white/5 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="rollover"
                          value={ps.id}
                          checked={rolloverTarget === ps.id}
                          onChange={() => setRolloverTarget(ps.id)}
                          className="text-indigo-600 focus:ring-0"
                        />
                        <div>
                          <div className="text-xs font-semibold text-slate-200">Roll over to {ps.name}</div>
                          <div className="text-[10px] text-slate-400">Push directly into the upcoming planned sprint</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400">Planned</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-center text-xs text-slate-400">
                🎉 All tasks in this sprint were completed! No rollover required.
              </div>
            )}

            {/* Actions */}
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
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-sm"
              >
                {loading ? "Completing..." : "Complete Sprint"}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
