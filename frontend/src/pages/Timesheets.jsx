import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Settings,
  Plus,
  Tag,
  DollarSign,
  Archive,
  ArrowRight,
  X,
  Check,
} from "lucide-react";
import useAuthStore from "../store/useAuthStore";
import PageTransition from "../components/PageTransition";

const INITIAL_MEMBERS = [
  { id: "m1", name: "Akshay R P", initials: "AP", bg: "bg-slate-700", target: "40h", hours: [0, 0, 0, 0, 0, 0, 0] },
  { id: "m2", name: "Gowtham Natraj", initials: "GN", bg: "bg-amber-600", target: "40h", hours: [0, 0, 0, 0, 0, 0, 0] },
  { id: "m3", name: "Harshaa J", initials: "HJ", bg: "bg-slate-700", target: "40h", hours: [0, 0, 0, 0, 0, 0, 0] },
  { id: "m4", name: "Pragathi K P", initials: "PP", bg: "bg-purple-600", target: "40h", hours: [0, 0, 0, 0, 0, 0, 0] },
  { id: "m5", name: "VARUN S", initials: "VS", bg: "bg-pink-600", target: "40h", hours: [0, 0, 0, 0, 0, 0, 0] },
  { id: "m6", name: "Vimalkumar B", initials: "VB", bg: "bg-blue-600", target: "40h", hours: [0, 0, 0, 0, 0, 0, 0] },
];

const DAYS = [
  { label: "Sun, Sep 6", short: "Sun" },
  { label: "Mon, Sep 7", short: "Mon" },
  { label: "Tue, Sep 8", short: "Tue" },
  { label: "Wed, Sep 9", short: "Wed" },
  { label: "Thu, Sep 10", short: "Thu" },
  { label: "Fri, Sep 11", short: "Fri" },
  { label: "Sat, Sep 12", short: "Sat" },
];

export default function Timesheets() {
  const { currentProject } = useAuthStore();
  const [activeSubTab, setActiveSubTab] = useState("all"); // "timesheets" | "my" | "all" | "approvals"
  const [members, setMembers] = useState(INITIAL_MEMBERS);
  const [selectedMember, setSelectedMember] = useState(null);
  const [logHoursModal, setLogHoursModal] = useState(false);
  const [logForm, setLogForm] = useState({ memberId: "m1", dayIndex: 1, hours: 4, note: "" });

  const handleOpenLogModal = (member) => {
    setSelectedMember(member);
    setLogForm({ memberId: member.id, dayIndex: 1, hours: 4, note: "" });
    setLogHoursModal(true);
  };

  const handleSaveHours = (e) => {
    e.preventDefault();
    const h = parseFloat(logForm.hours) || 0;
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id === logForm.memberId) {
          const updatedHours = [...m.hours];
          updatedHours[logForm.dayIndex] += h;
          return { ...m, hours: updatedHours };
        }
        return m;
      })
    );
    setLogHoursModal(false);
  };

  return (
    <PageTransition>
      <div className="flex-1 flex flex-col h-full overflow-hidden dark:bg-[#0c0e14] bg-[#f8fafc] dark:text-white text-slate-900 select-none transition-colors duration-200">
        
        {/* Top ClickUp-style Subnav Tabs Bar */}
        <div className="h-11 border-b dark:border-white/[0.08] border-slate-200 px-6 flex items-center gap-6 dark:bg-[#0f121a] bg-white flex-shrink-0 text-xs transition-colors">
          <button
            onClick={() => setActiveSubTab("timesheets")}
            className={`h-full flex items-center gap-1.5 font-medium transition-colors ${
              activeSubTab === "timesheets" ? "dark:text-white text-indigo-600 border-b-2 dark:border-white border-indigo-600 font-bold" : "text-slate-500 dark:hover:text-slate-200 hover:text-slate-900"
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            Timesheets
          </button>
          <button
            onClick={() => setActiveSubTab("my")}
            className={`h-full flex items-center font-medium transition-colors ${
              activeSubTab === "my" ? "dark:text-white text-indigo-600 border-b-2 dark:border-white border-indigo-600 font-bold" : "text-slate-500 dark:hover:text-slate-200 hover:text-slate-900"
            }`}
          >
            My timesheet
          </button>
          <button
            onClick={() => setActiveSubTab("all")}
            className={`h-full flex items-center font-semibold transition-colors ${
              activeSubTab === "all" ? "dark:text-white text-indigo-600 border-b-2 dark:border-white border-indigo-600 font-bold" : "text-slate-500 dark:hover:text-slate-200 hover:text-slate-900"
            }`}
          >
            All timesheets
          </button>
          <button
            onClick={() => setActiveSubTab("approvals")}
            className={`h-full flex items-center font-medium transition-colors ${
              activeSubTab === "approvals" ? "dark:text-white text-indigo-600 border-b-2 dark:border-white border-indigo-600 font-bold" : "text-slate-500 dark:hover:text-slate-200 hover:text-slate-900"
            }`}
          >
            Approvals
          </button>
        </div>

        {/* Subheader Controls matching Screenshot 6 */}
        <div className="p-4 px-6 border-b dark:border-white/[0.06] border-slate-200 flex flex-wrap items-center justify-between gap-3 dark:bg-[#0c0e14] bg-white flex-shrink-0 text-xs transition-colors">
          {/* Left: Date range navigator & filter chips */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Week date navigator */}
            <div className="flex items-center gap-1">
              <button className="p-1 rounded dark:hover:bg-white/10 hover:bg-slate-100 text-slate-400 dark:hover:text-white hover:text-slate-800 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button className="p-1 rounded dark:hover:bg-white/10 hover:bg-slate-100 text-slate-400 dark:hover:text-white hover:text-slate-800 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
              <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold dark:text-white text-slate-800 dark:hover:bg-white/5 hover:bg-slate-100 transition-colors">
                <span>Sep 6 - Sep 12</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>

            <div className="h-4 w-px dark:bg-white/10 bg-slate-200" />

            {/* Filter chips from Screenshot 6 */}
            <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg dark:bg-[#151924] bg-slate-100 dark:hover:bg-[#1c2130] hover:bg-slate-200/80 text-[11px] dark:text-slate-300 text-slate-700 border dark:border-white/5 border-slate-200 transition-colors">
              <DollarSign className="w-3 h-3 text-slate-400" />
              <span>Billable status</span>
            </button>
            <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg dark:bg-[#151924] bg-slate-100 dark:hover:bg-[#1c2130] hover:bg-slate-200/80 text-[11px] dark:text-slate-300 text-slate-700 border dark:border-white/5 border-slate-200 transition-colors">
              <Tag className="w-3 h-3 text-slate-400" />
              <span>Tag</span>
            </button>
            <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg dark:bg-[#151924] bg-slate-100 dark:hover:bg-[#1c2130] hover:bg-slate-200/80 text-[11px] dark:text-slate-300 text-slate-700 border dark:border-white/5 border-slate-200 transition-colors">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>Tracked time</span>
            </button>
            <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg dark:bg-[#151924] bg-slate-100 dark:hover:bg-[#1c2130] hover:bg-slate-200/80 text-[11px] dark:text-slate-300 text-slate-700 border dark:border-white/5 border-slate-200 transition-colors">
              <Archive className="w-3 h-3 text-slate-400" />
              <span>Archived tasks</span>
            </button>
          </div>

          {/* Right: Member filter dropdown */}
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg dark:bg-[#151924] bg-slate-100 dark:hover:bg-[#1c2130] hover:bg-slate-200/80 text-xs dark:text-slate-300 text-slate-700 border dark:border-white/5 border-slate-200 transition-colors">
              <span>All members</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Matrix Grid Table matching Screenshot 6 */}
        <div className="flex-1 overflow-auto p-6">
          <div className="rounded-xl border dark:border-white/[0.08] border-slate-200 dark:bg-[#11141e] bg-white overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs border-collapse min-w-[840px]">
              <thead>
                <tr className="border-b dark:border-white/[0.08] border-slate-200 dark:bg-[#141824] bg-slate-50 text-slate-500 text-[11px]">
                  <th className="p-3.5 pl-4 font-semibold w-72">
                    People ({members.length})
                  </th>
                  {DAYS.map((d, idx) => (
                    <th key={idx} className="p-3 text-center font-medium">
                      {d.label}
                    </th>
                  ))}
                  <th className="p-3.5 pr-4 text-center font-semibold dark:text-slate-300 text-slate-700 w-24">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-white/[0.05] divide-slate-100">
                {members.map((member) => {
                  const total = member.hours.reduce((a, b) => a + b, 0);
                  return (
                    <tr
                      key={member.id}
                      className="dark:hover:bg-white/[0.02] hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* People Column */}
                      <td className="p-3 pl-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] text-white flex-shrink-0 ${member.bg}`}
                            >
                              {member.initials}
                            </span>
                            <div className="truncate">
                              <span className="font-semibold block truncate dark:text-slate-200 text-slate-800">
                                {member.name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {member.target}
                              </span>
                            </div>
                          </div>

                          {/* Open Button from screenshot */}
                          <button
                            onClick={() => handleOpenLogModal(member)}
                            className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 rounded dark:bg-white/5 bg-slate-100 dark:hover:bg-white/10 hover:bg-slate-200 text-[11px] dark:text-slate-300 text-slate-700 font-mono transition-all mr-2"
                          >
                            <span>Open</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* 7 Days Columns */}
                      {member.hours.map((h, dIdx) => (
                        <td
                          key={dIdx}
                          onClick={() => {
                            setSelectedMember(member);
                            setLogForm({ memberId: member.id, dayIndex: dIdx, hours: 2, note: "" });
                            setLogHoursModal(true);
                          }}
                          className="p-3 text-center font-mono cursor-pointer dark:hover:bg-white/5 hover:bg-slate-100 transition-colors"
                        >
                          <span
                            className={`${
                              h > 0
                                ? "px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-500 font-bold border border-indigo-500/30"
                                : "text-slate-400"
                            }`}
                          >
                            {h}h
                          </span>
                        </td>
                      ))}

                      {/* Total Column */}
                      <td className="p-3.5 pr-4 text-center font-mono font-bold dark:text-slate-300 text-slate-700">
                        {total}h
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Log Hours Modal */}
        {logHoursModal && selectedMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-md rounded-2xl dark:bg-[#131622] bg-white border dark:border-white/10 border-slate-200 p-6 shadow-2xl space-y-4 text-slate-800 dark:text-white"
            >
              <div className="flex items-center justify-between pb-3 border-b dark:border-white/10 border-slate-200">
                <div className="flex items-center gap-2">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white ${selectedMember.bg}`}>
                    {selectedMember.initials}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold dark:text-white text-slate-900">Log Hours — {selectedMember.name}</h3>
                    <p className="text-[10px] text-slate-400">Weekly allocation entry</p>
                  </div>
                </div>
                <button
                  onClick={() => setLogHoursModal(false)}
                  className="w-7 h-7 rounded-lg dark:hover:bg-white/10 hover:bg-slate-100 text-slate-400 dark:hover:text-white hover:text-slate-800 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveHours} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-500 mb-1.5 font-medium">Day of the Week</label>
                  <select
                    value={logForm.dayIndex}
                    onChange={(e) => setLogForm({ ...logForm, dayIndex: parseInt(e.target.value) })}
                    className="w-full p-2.5 rounded-xl dark:bg-[#1b2030] bg-slate-50 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    {DAYS.map((d, i) => (
                      <option key={i} value={i}>{d.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1.5 font-medium">Hours to Log</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="24"
                    value={logForm.hours}
                    onChange={(e) => setLogForm({ ...logForm, hours: e.target.value })}
                    className="w-full p-2.5 rounded-xl dark:bg-[#1b2030] bg-slate-50 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-1.5 font-medium">Activity / Task Note (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Electron setup, API contract review..."
                    value={logForm.note}
                    onChange={(e) => setLogForm({ ...logForm, note: e.target.value })}
                    className="w-full p-2.5 rounded-xl dark:bg-[#1b2030] bg-slate-50 border dark:border-white/10 border-slate-200 dark:text-white text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t dark:border-white/10 border-slate-200">
                  <button
                    type="button"
                    onClick={() => setLogHoursModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors shadow-sm"
                  >
                    Save Hours
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
