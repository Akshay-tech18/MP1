import React, { useState, useEffect, useCallback } from "react";
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
  Trash2,
  AlertCircle,
  UserPlus,
} from "lucide-react";
import PageTransition from "../components/PageTransition";
import useAuthStore from "../store/useAuthStore";
import useSocketStore from "../store/useSocketStore";
import client from "../api/client";
import { SocketEvent } from "../config/constants";

export default function Teams() {
  const navigate = useNavigate();
  const { currentProject, user } = useAuthStore();
  const { socket } = useSocketStore();

  const [teamMembers, setTeamMembers] = useState([]);
  const [activeSprint, setActiveSprint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Invite modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("DEVELOPER");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState(false);

  // Load team data dynamically from the backend for the current workspace
  const loadTeamData = useCallback(async () => {
    if (!currentProject) {
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch project details (members, pending invites, owner)
      const projRes = await client.get(`/projects/${currentProject.id}`);
      const project = projRes.data?.data?.project;

      if (!project) return;

      // 2. Fetch tasks for workload calculation
      let tasks = [];
      try {
        const taskRes = await client.get(`/projects/${currentProject.id}/tasks`);
        tasks = taskRes.data?.data?.tasks || [];
      } catch (e) {
        // ignore non-blocking task error
      }

      // 3. Fetch sprints for active sprint name
      let sprints = [];
      try {
        const sprintRes = await client.get(`/projects/${currentProject.id}/sprints`);
        sprints = sprintRes.data?.data?.sprints || [];
      } catch (e) {
        // ignore non-blocking sprint error
      }

      const active = sprints.find((s) => s.status === "ACTIVE") || null;
      setActiveSprint(active);

      // Color palettes for member avatars
      const colorPalettes = [
        { bg: "from-blue-600 to-indigo-600", avatarBg: "bg-blue-600" },
        { bg: "from-pink-600 to-purple-600", avatarBg: "bg-pink-600" },
        { bg: "from-amber-600 to-orange-600", avatarBg: "bg-amber-600" },
        { bg: "from-emerald-600 to-teal-600", avatarBg: "bg-emerald-600" },
        { bg: "from-cyan-600 to-blue-600", avatarBg: "bg-cyan-600" },
        { bg: "from-purple-600 to-violet-600", avatarBg: "bg-purple-600" },
      ];

      // Map real members from the database
      const mappedMembers = (project.members || []).map((m, idx) => {
        const memberUser = m.user || {};
        const memberTasks = tasks.filter((t) => t.assigneeId === m.userId);
        const activeTask =
          memberTasks.find((t) => t.status !== "COMPLETED")?.title ||
          (memberTasks.length > 0 ? "All assigned tasks completed" : "Awaiting sprint onboarding");
        const memberEstimatedMins = memberTasks.reduce((acc, t) => acc + (t.estimatedTime || 0), 0);
        const hoursAllocated = memberEstimatedMins > 0
          ? Math.min(Math.round((memberEstimatedMins / 60) * 10) / 10, 60)
          : Math.min(memberTasks.length * 8, 40);

        let roleCategory = "dev";
        const roleUpper = (m.role || "DEVELOPER").toUpperCase();
        if (roleUpper === "MANAGER" || m.userId === project.ownerId) roleCategory = "lead";
        else if (roleUpper === "QA_TESTER") roleCategory = "qa";
        else if (roleUpper === "VIEWER") roleCategory = "pm";

        const palette = colorPalettes[idx % colorPalettes.length];
        const name = memberUser.name || (memberUser.email ? memberUser.email.split("@")[0] : "Team Member");
        const initials =
          name
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase() || "TM";

        return {
          id: m.userId,
          membershipId: m.id,
          name,
          email: memberUser.email || "",
          initials,
          avatar: memberUser.avatar,
          role: m.userId === project.ownerId ? "PROJECT OWNER" : m.role,
          rawRole: m.role,
          roleCategory,
          isOwner: m.userId === project.ownerId,
          isPending: false,
          status: "online",
          hoursAllocated,
          targetHours: 40,
          activeTask,
          taskCount: memberTasks.length,
          skills:
            roleCategory === "lead"
              ? ["System Design", "Sprint Planning", "Express"]
              : roleCategory === "qa"
              ? ["Jest", "Cypress", "Quality"]
              : ["Frontend", "Backend", "APIs"],
          ...palette,
        };
      });

      // Map pending invites for this workspace
      const mappedInvites = (project.pendingInvites || []).map((inv, idx) => {
        const name = inv.email.split("@")[0].toUpperCase();
        const initials = inv.email.slice(0, 2).toUpperCase();
        let roleCategory = "dev";
        if (inv.role === "MANAGER") roleCategory = "lead";
        else if (inv.role === "QA_TESTER") roleCategory = "qa";

        return {
          id: inv.id,
          membershipId: inv.id,
          name,
          email: inv.email,
          initials,
          avatar: null,
          role: `${inv.role} (PENDING)`,
          rawRole: inv.role,
          roleCategory,
          isOwner: false,
          isPending: true,
          status: "pending",
          hoursAllocated: 0,
          targetHours: 40,
          activeTask: "Invitation Pending — Awaiting user onboarding",
          taskCount: 0,
          skills: ["Pending Invite", "Awaiting Signup"],
          bg: "from-slate-700 to-slate-800",
          avatarBg: "bg-slate-700",
        };
      });

      setTeamMembers([...mappedMembers, ...mappedInvites]);
    } catch (err) {
      console.error("Error loading team data:", err);
    } finally {
      setLoading(false);
    }
  }, [currentProject]);

  useEffect(() => {
    setLoading(true);
    loadTeamData();
  }, [loadTeamData]);

  // Real-time synchronization
  useEffect(() => {
    if (!socket || !currentProject) return;

    const handleMemberUpdate = () => {
      loadTeamData();
    };

    socket.on(SocketEvent.MEMBER_ADDED, handleMemberUpdate);
    socket.on(SocketEvent.MEMBER_REMOVED, handleMemberUpdate);

    return () => {
      socket.off(SocketEvent.MEMBER_ADDED, handleMemberUpdate);
      socket.off(SocketEvent.MEMBER_REMOVED, handleMemberUpdate);
    };
  }, [socket, currentProject, loadTeamData]);

  // Filter members by role tab & search query
  const filteredMembers = teamMembers.filter((m) => {
    const matchRole = filterRole === "all" || m.roleCategory === filterRole;
    const matchSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.role.toLowerCase().includes(searchQuery.toLowerCase());
    return matchRole && matchSearch;
  });

  const totalAllocated = teamMembers.reduce((acc, m) => acc + m.hoursAllocated, 0);
  const totalCapacity = Math.max(teamMembers.length * 40, 40);
  const capacityPercent = Math.round((totalAllocated / totalCapacity) * 100);
  const onlineCount = teamMembers.filter((m) => !m.isPending).length;
  const pendingCount = teamMembers.filter((m) => m.isPending).length;

  // Invite member by email via backend API
  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !currentProject) return;

    setInviteLoading(true);
    setInviteError("");

    try {
      const res = await client.post(`/projects/${currentProject.id}/members`, {
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
      });

      if (res.data?.success) {
        setInviteSuccess(true);
        setTimeout(() => {
          setInviteSuccess(false);
          setShowInviteModal(false);
          setInviteEmail("");
          loadTeamData();
        }, 1000);
      } else {
        setInviteError(res.data?.message || "Failed to invite member");
      }
    } catch (err) {
      setInviteError(err.response?.data?.message || "Failed to invite member");
    } finally {
      setInviteLoading(false);
    }
  };

  // Remove member or cancel invitation
  const handleRemoveMember = async (member) => {
    if (!currentProject) return;

    const confirmText = member.isPending
      ? `Cancel pending invitation for ${member.email}?`
      : `Remove ${member.name} from ${currentProject.name}?`;

    if (!window.confirm(confirmText)) return;

    try {
      const targetId = member.isPending ? member.id : member.id;
      const res = await client.delete(`/projects/${currentProject.id}/members/${targetId}`);
      if (res.data?.success) {
        loadTeamData();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to remove member");
    }
  };

  if (!currentProject) {
    return (
      <PageTransition>
        <div className="flex-1 p-8 flex items-center justify-center select-none">
          <div className="max-w-md w-full text-center p-8 rounded-2xl dark:bg-white/[0.03] bg-white border dark:border-white/10 border-slate-200 shadow-xl">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-4">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-major-heading font-bold dark:text-white text-slate-900 mb-1">
              No Active Workspace
            </h3>
            <p className="text-body-secondary dark:text-slate-400 text-slate-500 leading-relaxed">
              Create or select a workspace from the workspace dropdown in the header to view team members and manage workloads.
            </p>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="flex-1 flex flex-col h-full overflow-y-auto dark:bg-[#080808] bg-[#f8fafc] dark:text-white text-slate-900 select-none p-6 lg:p-8 space-y-6 transition-colors duration-200">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b dark:border-white/[0.08] border-slate-200 pb-5 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 rounded-lg bg-indigo-500/15 text-indigo-500 flex items-center justify-center">
                <Users className="w-3.5 h-3.5" />
              </span>
              <h1 className="text-page-title dark:text-white text-slate-900">
                Team Workload & Members
              </h1>
            </div>
            <p className="text-body-secondary text-slate-500">
              Manage team allocations, sprint workload, and active contributors for{" "}
              <span className="font-semibold dark:text-slate-300 text-slate-700">
                {currentProject?.name || "your workspace"}
              </span>
              .
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setInviteError("");
                setShowInviteModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl dark:bg-white bg-slate-900 dark:text-slate-950 text-white hover:opacity-90 text-btn-refined transition-all shadow-sm active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Invite Member</span>
            </button>
          </div>
        </div>

        {/* Workload & Capacity Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-xl dark:bg-[#121214] bg-white border dark:border-white/[0.08] border-slate-200 shadow-sm micro-elevate">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span className="text-metric-label text-slate-400">Total Members</span>
              <span className="p-1 rounded-md bg-blue-500/10 text-blue-400">
                <Users className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-metric-val dark:text-white text-slate-900">
                {teamMembers.length}
              </div>
              <span className="text-[12px] font-semibold text-emerald-500">
                {onlineCount} active
              </span>
            </div>
            <span className="text-metric-support text-slate-400 mt-1 block">
              {pendingCount > 0 ? `${pendingCount} invite pending` : "All contributors joined"}
            </span>
          </div>

          <div className="p-4 rounded-xl dark:bg-[#121214] bg-white border dark:border-white/[0.08] border-slate-200 shadow-sm micro-elevate">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span className="text-metric-label text-slate-400">Workload Allocation</span>
              <span className="p-1 rounded-md bg-amber-500/10 text-amber-400">
                <Clock className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-metric-val dark:text-white text-slate-900">
                {capacityPercent}%
              </div>
              <span className="text-metric-support text-slate-400">
                utilization
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full dark:bg-white/10 bg-slate-200 overflow-hidden mt-2 flex">
              <div
                className={`h-full rounded-full transition-all ${
                  capacityPercent > 85 ? "bg-amber-500" : "bg-indigo-500"
                }`}
                style={{ width: `${Math.min(capacityPercent, 100)}%` }}
              />
            </div>
            <span className="text-metric-support text-slate-400 mt-1 block">
              {totalAllocated}h committed / {totalCapacity}h team max
            </span>
          </div>

          <div className="p-4 rounded-xl dark:bg-[#121214] bg-white border dark:border-white/[0.08] border-slate-200 shadow-sm micro-elevate">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span className="text-metric-label text-slate-400">Active Sprint</span>
              <span className="p-1 rounded-md bg-purple-500/10 text-purple-400">
                <Briefcase className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-metric-val dark:text-white text-slate-900 truncate">
              {activeSprint ? activeSprint.name : "Sprint 2"}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-metric-support font-semibold text-emerald-500">
                {activeSprint ? "In Progress" : "Sprint Active"}
              </span>
              <span className="text-metric-support text-slate-400">• 0 Blockers</span>
            </div>
          </div>

          <div className="p-4 rounded-xl dark:bg-[#121214] bg-white border dark:border-white/[0.08] border-slate-200 shadow-sm micro-elevate">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span className="text-metric-label text-slate-400">Team Velocity</span>
              <span className="p-1 rounded-md bg-emerald-500/10 text-emerald-400">
                <TrendingUp className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-metric-val dark:text-white text-slate-900">
                32 SP
              </div>
              <span className="text-[12px] font-bold text-emerald-500">+18%</span>
            </div>
            <span className="text-metric-support text-slate-400 mt-1 block">
              Optimal throughput pace
            </span>
          </div>
        </div>

        {/* Filter Bar & Search */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {[
              { id: "all", label: "All Members" },
              { id: "lead", label: "Managers & Leads" },
              { id: "dev", label: "Developers" },
              { id: "qa", label: "QA & Test" },
              { id: "pm", label: "Viewers / Product" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterRole(f.id)}
                className={`px-3 py-1 rounded-lg text-[13px] font-medium transition-colors ${
                  filterRole === f.id
                    ? "dark:bg-white/10 bg-slate-200 dark:text-white text-slate-900 font-semibold"
                    : "text-slate-400 dark:hover:text-slate-200 hover:text-slate-900 dark:hover:bg-white/5 hover:bg-slate-100"
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
              placeholder="Search team by name, email or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg dark:bg-white/5 bg-white border dark:border-white/[0.08] border-slate-200 text-[13px] dark:text-slate-200 text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 shadow-sm"
            />
          </div>
        </div>

        {/* Members Cards Grid */}
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="spinner-gradient mb-2" />
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="p-12 text-center border dark:border-white/[0.08] border-slate-200 rounded-2xl dark:bg-[#121214] bg-white space-y-3">
            <Users className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="text-section-heading dark:text-white text-slate-800">No members match your search</h3>
            <p className="text-body-secondary text-slate-500">Try adjusting your role filter or invite new colleagues.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMembers.map((member) => {
              const loadPercent = Math.min(
                Math.round((member.hoursAllocated / member.targetHours) * 100),
                100
              );
              const isOverloaded = loadPercent >= 85;
              const availableHours = Math.max(0, member.targetHours - member.hoursAllocated);

              return (
                <div
                  key={member.id}
                  className={`p-4 rounded-2xl dark:bg-[#121214] bg-white dark:hover:bg-[#161619] hover:bg-slate-50 border transition-all flex flex-col justify-between group shadow-sm relative micro-elevate ${
                    isOverloaded
                      ? "dark:border-amber-500/30 border-amber-500/40"
                      : "dark:border-white/[0.08] border-slate-200 dark:hover:border-white/[0.15] hover:border-slate-300"
                  }`}
                >
                  <div>
                    {/* Top info */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative flex-shrink-0">
                          {member.avatar ? (
                            <img
                              src={member.avatar}
                              alt={member.name}
                              className="w-10 h-10 rounded-xl object-cover ring-1 ring-white/10"
                            />
                          ) : (
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-[11.5px] shadow-md bg-gradient-to-br ${member.bg}`}
                            >
                              {member.initials}
                            </div>
                          )}
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 dark:ring-[#121214] ring-white ${
                              member.isPending
                                ? "bg-amber-500"
                                : member.status === "online"
                                ? "bg-emerald-500"
                                : "bg-slate-400"
                            }`}
                            title={member.isPending ? "Pending Invitation" : "Active Member"}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-card-title dark:text-white text-slate-900 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                              {member.name}
                            </h4>
                            {isOverloaded && (
                              <span className="px-1.5 py-0.2 rounded text-badge-meta font-bold uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                High Load
                              </span>
                            )}
                          </div>
                          <p className="text-[11.5px] text-slate-500 truncate">{member.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span
                          className={`px-1.5 py-0.5 rounded text-badge-meta font-semibold uppercase tracking-wider border ${
                            member.isPending
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : member.isOwner
                              ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                              : "dark:bg-white/5 bg-slate-100 dark:text-slate-400 text-slate-600 border-slate-200 dark:border-white/5"
                          }`}
                        >
                          {member.isOwner ? "OWNER" : member.rawRole || member.role}
                        </span>

                        {/* Remove or Cancel Invitation (allowed for owner/manager unless target is workspace owner) */}
                        {!member.isOwner && (
                          <button
                            onClick={() => handleRemoveMember(member)}
                            title={member.isPending ? "Cancel Invitation" : "Remove Member"}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Operational Relationships Bar */}
                    <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl dark:bg-white/[0.02] bg-slate-50/80 border dark:border-white/[0.04] border-slate-200/50 mb-3 text-[11.5px]">
                      <div>
                        <span className="text-slate-500 block text-[11px] uppercase font-semibold">Sprint</span>
                        <span className="font-bold text-[12px] dark:text-slate-200 text-slate-800 truncate block">
                          {activeSprint ? activeSprint.name : "Sprint 2"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px] uppercase font-semibold">Assigned</span>
                        <span className="font-bold text-[12px] dark:text-slate-200 text-slate-800 block">
                          {member.taskCount} {member.taskCount === 1 ? "task" : "tasks"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px] uppercase font-semibold">Blockers</span>
                        <span className="font-bold text-[12px] text-emerald-500 block">0</span>
                      </div>
                    </div>

                    {/* Active Task / Current Focus */}
                    <div className="p-2.5 rounded-xl dark:bg-white/[0.03] bg-slate-50 border dark:border-white/[0.04] border-slate-200/60 mb-3">
                      <div className="flex items-center gap-1.5 text-[11.5px] text-slate-400 font-semibold mb-0.5">
                        <Sparkles className="w-3 h-3 text-indigo-500" />
                        <span>Current Focus</span>
                      </div>
                      <p className="text-[13px] dark:text-slate-200 text-slate-700 line-clamp-1 font-medium">
                        {member.activeTask}
                      </p>
                    </div>

                    {/* Segmented Workload Capacity Visualization */}
                    <div className="space-y-1.5 mb-3">
                      <div className="flex items-center justify-between text-task-metadata">
                        <span className="text-metric-label text-slate-400">
                          Workload Capacity
                        </span>
                        <span className="dark:text-white text-slate-900 font-bold text-[13px]">
                          {member.hoursAllocated}h <span className="text-slate-500 font-normal">/ {member.targetHours}h ({loadPercent}%)</span>
                        </span>
                      </div>

                      {/* Segmented Bar: Committed vs Available */}
                      <div className="w-full h-2 rounded-full dark:bg-white/[0.07] bg-slate-200 overflow-hidden flex gap-0.5 p-0.5">
                        <div
                          className={`h-full rounded-l-full transition-all ${
                            isOverloaded ? "bg-amber-500" : "bg-indigo-500"
                          }`}
                          style={{ width: `${Math.max(loadPercent, 4)}%` }}
                          title={`Committed: ${member.hoursAllocated}h`}
                        />
                        <div
                          className="h-full rounded-r-full bg-slate-400/20 dark:bg-white/10 transition-all"
                          style={{ width: `${100 - loadPercent}%` }}
                          title={`Available: ${availableHours}h`}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[9px] text-slate-400 font-medium px-0.5">
                        <span className="flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${isOverloaded ? "bg-amber-500" : "bg-indigo-500"}`} />
                          Committed: {member.hoursAllocated}h
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400/40" />
                          Available: {availableHours}h
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Quick Actions */}
                  <div className="flex items-center justify-between pt-2.5 border-t dark:border-white/[0.06] border-slate-200 text-xs">
                    <div className="flex items-center gap-1">
                      {member.skills.slice(0, 2).map((s) => (
                        <span
                          key={s}
                          className="px-1.5 py-0.5 rounded text-[9px] dark:bg-white/5 bg-slate-100 dark:text-slate-400 text-slate-600 border dark:border-white/5 border-slate-200 font-medium"
                        >
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
        )}

        {/* Invite Member Modal */}
        <AnimatePresence>
          {showInviteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md rounded-2xl dark:bg-[#161619] bg-white border dark:border-white/10 border-slate-200 shadow-2xl p-6 dark:text-slate-200 text-slate-800"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold dark:text-white text-slate-900 flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-indigo-500" />
                    <span>Invite to {currentProject?.name || "Workspace"}</span>
                  </h3>
                  <button
                    onClick={() => setShowInviteModal(false)}
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {inviteSuccess ? (
                  <div className="p-6 text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
                      <Check className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold dark:text-white text-slate-900">Invite Sent!</h4>
                    <p className="text-xs text-slate-500">
                      Team member has been successfully added to this workspace.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleInvite} className="space-y-4">
                    {inviteError && (
                      <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{inviteError}</span>
                      </div>
                    )}

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
                        Workspace Role
                      </label>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl dark:bg-slate-900 bg-slate-50 border dark:border-white/10 border-slate-200 text-xs dark:text-white text-slate-900 outline-none focus:border-indigo-500"
                      >
                        <option value="DEVELOPER">DEVELOPER (Code, commits & task tracking)</option>
                        <option value="MANAGER">MANAGER (Manage sprints, members & settings)</option>
                        <option value="QA_TESTER">QA TESTER (Verify bugs & mark status)</option>
                        <option value="VIEWER">VIEWER (Read-only access)</option>
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
                        disabled={!inviteEmail.trim() || inviteLoading}
                        className="px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white shadow-sm flex items-center gap-1.5"
                      >
                        {inviteLoading ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Mail className="w-3.5 h-3.5" />
                        )}
                        <span>Send Invite</span>
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
