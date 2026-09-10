import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Search,
  Plus,
  Mail,
  CheckCircle2,
  Clock,
  Shield,
  MessageSquare,
  Sparkles,
  ArrowRight,
  X,
  Check,
  Briefcase,
  TrendingUp,
} from "lucide-react";
import PageTransition from "../components/PageTransition";
import useAuthStore from "../store/useAuthStore";

const INITIAL_TEAM = [
  {
    id: "t1",
    name: "Akshay R P",
    initials: "AP",
    email: "akshay@devpilot.com",
    role: "LEAD ARCHITECT",
    roleCategory: "lead",
    bg: "from-blue-600 to-indigo-600",
    avatarBg: "bg-blue-600",
    status: "online",
    hoursAllocated: 38,
    targetHours: 40,
    activeTask: "OAuth2 GitHub Webhook & App integration",
    skills: ["System Design", "Prisma", "Express"],
  },
  {
    id: "t2",
    name: "Varun S",
    initials: "VS",
    email: "varun@devpilot.com",
    role: "TECH LEAD",
    roleCategory: "lead",
    bg: "from-pink-600 to-purple-600",
    avatarBg: "bg-pink-600",
    status: "online",
    hoursAllocated: 36,
    targetHours: 40,
    activeTask: "ClickUp 3.0 UI Architecture & Real-Time Sync",
    skills: ["React 19", "Vite", "Nexus AI"],
  },
  {
    id: "t3",
    name: "Gowtham Natraj",
    initials: "GN",
    email: "gowtham@devpilot.com",
    role: "BACKEND ENGINEER",
    roleCategory: "dev",
    bg: "from-amber-600 to-orange-600",
    avatarBg: "bg-amber-600",
    status: "online",
    hoursAllocated: 32,
    targetHours: 40,
    activeTask: "Prisma query optimization & Neon pooling",
    skills: ["PostgreSQL", "Neon", "Redis"],
  },
  {
    id: "t4",
    name: "Harshaa J",
    initials: "HJ",
    email: "harshaa@devpilot.com",
    role: "FRONTEND ENGINEER",
    roleCategory: "dev",
    bg: "from-emerald-600 to-teal-600",
    avatarBg: "bg-emerald-600",
    status: "online",
    hoursAllocated: 30,
    targetHours: 40,
    activeTask: "Timesheets matrix grid & approval flow",
    skills: ["TailwindCSS", "Framer Motion"],
  },
  {
    id: "t5",
    name: "Pragathi K P",
    initials: "PP",
    email: "pragathi@devpilot.com",
    role: "QA & AUTOMATION",
    roleCategory: "qa",
    bg: "from-purple-600 to-violet-600",
    avatarBg: "bg-purple-600",
    status: "online",
    hoursAllocated: 26,
    targetHours: 40,
    activeTask: "Cypress end-to-end sprint regression tests",
    skills: ["Jest", "Cypress", "CI/CD"],
  },
  {
    id: "t6",
    name: "Vimalkumar B",
    initials: "VB",
    email: "vimal@devpilot.com",
    role: "PRODUCT MANAGER",
    roleCategory: "pm",
    bg: "from-cyan-600 to-blue-600",
    avatarBg: "bg-cyan-600",
    status: "idle",
    hoursAllocated: 22,
    targetHours: 40,
    activeTask: "Sprint 3 backlog refinement & roadmap sync",
    skills: ["Scrum", "Roadmapping", "Agile"],
  },
];

export default function Teams() {
  const navigate = useNavigate();
  const { currentProject } = useAuthStore();
  const [teamMembers, setTeamMembers] = useState(INITIAL_TEAM);
  const [filterRole, setFilterRole] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("DEVELOPER");
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const filteredMembers = teamMembers.filter((m) => {
    const matchRole = filterRole === "all" || m.roleCategory === filterRole;
    const matchSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.role.toLowerCase().includes(searchQuery.toLowerCase());
    return matchRole && matchSearch;
  });

  const totalAllocated = teamMembers.reduce((acc, m) => acc + m.hoursAllocated, 0);
  const totalCapacity = teamMembers.length * 40;
  const capacityPercent = Math.round((totalAllocated / totalCapacity) * 100);

  const handleInvite = (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    const newMember = {
      id: `t-${Date.now()}`,
      name: inviteEmail.split("@")[0].toUpperCase(),
      initials: inviteEmail.slice(0, 2).toUpperCase(),
      email: inviteEmail.trim(),
      role: inviteRole,
      roleCategory: inviteRole === "DEVELOPER" ? "dev" : "pm",
      bg: "from-indigo-600 to-purple-600",
      avatarBg: "bg-indigo-600",
      status: "online",
      hoursAllocated: 0,
      targetHours: 40,
      activeTask: "Awaiting sprint onboarding",
      skills: ["General"],
    };

    setTeamMembers([...teamMembers, newMember]);
    setInviteSuccess(true);
    setTimeout(() => {
      setInviteSuccess(false);
      setShowInviteModal(false);
      setInviteEmail("");
    }, 1200);
  };

  return (
    <PageTransition>
      <div className="flex-1 flex flex-col h-full overflow-y-auto dark:bg-[#0c0e14] bg-[#f8fafc] dark:text-white text-slate-900 select-none p-6 lg:p-8 space-y-6 transition-colors duration-200">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b dark:border-white/[0.08] border-slate-200 pb-5 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 rounded-lg bg-indigo-500/15 text-indigo-500 flex items-center justify-center">
                <Users className="w-3.5 h-3.5" />
              </span>
              <h1 className="text-xl font-extrabold dark:text-white text-slate-900 tracking-tight">
                Team Workload & Members
              </h1>
            </div>
            <p className="text-xs text-slate-500">
              Manage team allocations, sprint workload, and active engineering tasks for {currentProject?.name || "your workspace"}.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl dark:bg-white bg-slate-900 dark:text-slate-950 text-white hover:opacity-90 text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Invite Member</span>
            </button>
          </div>
        </div>

        {/* Workload & Capacity Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-xl dark:bg-[#121520] bg-white border dark:border-white/[0.08] border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Total Members</span>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold dark:text-white text-slate-900 tracking-tight">{teamMembers.length}</div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Active contributors</span>
          </div>

          <div className="p-4 rounded-xl dark:bg-[#121520] bg-white border dark:border-white/[0.08] border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Workload Allocation</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold dark:text-white text-slate-900 tracking-tight">{capacityPercent}%</div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">{totalAllocated}h / {totalCapacity}h target</span>
          </div>

          <div className="p-4 rounded-xl dark:bg-[#121520] bg-white border dark:border-white/[0.08] border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Active Sprints</span>
              <Briefcase className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-2xl font-bold dark:text-white text-slate-900 tracking-tight">Phase 2 Sprint</div>
            <span className="text-[11px] text-emerald-500 mt-0.5 block font-medium">On track (86% done)</span>
          </div>

          <div className="p-4 rounded-xl dark:bg-[#121520] bg-white border dark:border-white/[0.08] border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Team Status</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold dark:text-white text-slate-900 tracking-tight">5 Online</div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">1 in sync / idle</span>
          </div>
        </div>

        {/* Filter Bar & Search */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {[
              { id: "all", label: "All Members" },
              { id: "lead", label: "Leads" },
              { id: "dev", label: "Developers" },
              { id: "qa", label: "QA & Test" },
              { id: "pm", label: "Product" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterRole(f.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  filterRole === f.id
                    ? "dark:bg-white/10 bg-slate-200 dark:text-white text-slate-900 font-semibold"
                    : "text-slate-500 dark:hover:text-slate-200 hover:text-slate-900 dark:hover:bg-white/5 hover:bg-slate-100"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg dark:bg-white/5 bg-white border dark:border-white/[0.08] border-slate-200 text-xs dark:text-slate-200 text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 shadow-sm"
            />
          </div>
        </div>

        {/* Members Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member) => {
            const loadPercent = Math.min(Math.round((member.hoursAllocated / member.targetHours) * 100), 100);
            return (
              <div
                key={member.id}
                className="p-4 rounded-2xl dark:bg-[#121520] bg-white dark:hover:bg-[#151926] hover:bg-slate-50 border dark:border-white/[0.08] border-slate-200 dark:hover:border-white/[0.15] hover:border-slate-300 transition-all flex flex-col justify-between group shadow-sm"
              >
                <div>
                  {/* Top info */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-xs shadow-md bg-gradient-to-br ${member.bg}`}
                        >
                          {member.initials}
                        </div>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 dark:ring-[#121520] ring-white ${
                            member.status === "online" ? "bg-emerald-500" : "bg-amber-500"
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold dark:text-white text-slate-900 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                          {member.name}
                        </h4>
                        <p className="text-[10px] text-slate-500 truncate">{member.email}</p>
                      </div>
                    </div>

                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider dark:bg-white/5 bg-slate-100 dark:text-slate-400 text-slate-600 border dark:border-white/5 border-slate-200">
                      {member.role.split(" ")[0]}
                    </span>
                  </div>

                  {/* Active Task */}
                  <div className="p-2.5 rounded-xl dark:bg-white/[0.03] bg-slate-50 border dark:border-white/[0.04] border-slate-200/60 mb-3">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold mb-0.5">
                      <Sparkles className="w-3 h-3 text-indigo-500" />
                      <span>Current Focus</span>
                    </div>
                    <p className="text-xs dark:text-slate-200 text-slate-700 line-clamp-1 font-medium">
                      {member.activeTask}
                    </p>
                  </div>

                  {/* Workload Progress Bar */}
                  <div className="space-y-1 mb-3">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Weekly Capacity</span>
                      <span className="dark:text-white text-slate-900 font-semibold">{member.hoursAllocated}h / {member.targetHours}h</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full dark:bg-white/10 bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          loadPercent > 85 ? "bg-amber-500" : "bg-indigo-500"
                        }`}
                        style={{ width: `${loadPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom Quick Actions */}
                <div className="flex items-center justify-between pt-2 border-t dark:border-white/[0.06] border-slate-200 text-xs">
                  <div className="flex items-center gap-1">
                    {member.skills.slice(0, 2).map((s) => (
                      <span key={s} className="px-1.5 py-0.5 rounded text-[9px] dark:bg-white/5 bg-slate-100 dark:text-slate-400 text-slate-600 border dark:border-white/5 border-slate-200">
                        {s}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => navigate("/chat")}
                      title="Direct Message"
                      className="p-1 rounded-lg dark:hover:bg-white/10 hover:bg-slate-100 text-slate-400 dark:hover:text-white hover:text-slate-800 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => navigate("/timesheets")}
                      title="View Timesheet"
                      className="p-1 rounded-lg dark:hover:bg-white/10 hover:bg-slate-100 text-slate-400 dark:hover:text-white hover:text-slate-800 transition-colors"
                    >
                      <Clock className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => navigate("/board")}
                      title="View on Kanban Board"
                      className="p-1 rounded-lg dark:hover:bg-white/10 hover:bg-slate-100 text-slate-400 dark:hover:text-white hover:text-slate-800 transition-colors"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Invite Member Modal */}
        <AnimatePresence>
          {showInviteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md rounded-2xl dark:bg-[#151926] bg-white border dark:border-white/10 border-slate-200 shadow-2xl p-6 dark:text-slate-200 text-slate-800"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold dark:text-white text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-500" />
                    <span>Invite Team Member</span>
                  </h3>
                  <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {inviteSuccess ? (
                  <div className="p-6 text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
                      <Check className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold dark:text-white text-slate-900">Invite Sent!</h4>
                    <p className="text-xs text-slate-500">Team member was added to this workspace.</p>
                  </div>
                ) : (
                  <form onSubmit={handleInvite} className="space-y-4">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="colleague@company.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        autoFocus
                        required
                        className="w-full px-3 py-2 rounded-xl dark:bg-slate-900 bg-slate-50 border dark:border-white/10 border-slate-200 text-xs dark:text-white text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                        Role
                      </label>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl dark:bg-slate-900 bg-slate-50 border dark:border-white/10 border-slate-200 text-xs dark:text-white text-slate-900 outline-none focus:border-indigo-500"
                      >
                        <option value="DEVELOPER">DEVELOPER (Code & Tasks)</option>
                        <option value="MANAGER">MANAGER (Sprints & Workload)</option>
                        <option value="QA_TESTER">QA TESTER (Verify & Review)</option>
                        <option value="LEAD">TECH LEAD (Full Access)</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowInviteModal(false)}
                        className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!inviteEmail.trim()}
                        className="px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white shadow-sm"
                      >
                        Send Invite
                      </button>
                    </div>
                  </form>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </PageTransition>
  );
}
