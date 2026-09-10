import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Plus,
  Search,
  Star,
  Clock,
  Archive,
  Lock,
  Users,
  Shield,
  Filter,
  ArrowUpDown,
  Tag,
  Download,
  MoreHorizontal,
  ChevronDown,
  X,
  BookOpen,
  Edit3,
  Check,
  Share2,
} from "lucide-react";
import PageTransition from "../components/PageTransition";

const INITIAL_DOCS = [
  {
    id: "doc-1",
    title: "Working with Neon and Prisma",
    location: "Team Space",
    tags: ["Backend", "Postgres"],
    updated: "Dec 19 2025",
    viewed: "Jan 19",
    content: `# Working with Neon and Prisma

## 1. Connection String Setup
Ensure that your database URL in \`.env\` includes the pooling parameters:
\`\`\`env
DATABASE_URL="postgresql://user:pass@ep-pooler.neon.tech/neondb?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://user:pass@ep.neon.tech/neondb?sslmode=require"
\`\`\`

## 2. Running Migrations
Use direct URL for migrations to bypass connection pool timeouts:
\`\`\`bash
npx prisma migrate dev
\`\`\``,
  },
  {
    id: "doc-2",
    title: "README for electron setup",
    location: "Team Space",
    tags: ["Desktop", "Packaging"],
    updated: "Jan 15",
    viewed: "Jan 16",
    content: `# README for Electron Setup

## Quick Start
1. Install Electron dependencies:
\`\`\`bash
npm install --save-dev electron electron-builder concurrently
\`\`\`
2. Run development wrapper with live-reload:
\`\`\`bash
npm run electron:dev
\`\`\``,
  },
  {
    id: "doc-3",
    title: "Phase 1 - API Contract",
    location: "Team Space",
    tags: ["API", "Specs"],
    updated: "Dec 24 2025",
    viewed: "Jan 15",
    content: `# Phase 1 - API Contract

## Authentication Endpoints
- \`POST /api/auth/register\`
- \`POST /api/auth/login\`
- \`GET /api/auth/me\`

## Real-Time Events (Socket.IO)
- \`notification:new\`
- \`task:updated\`
- \`timesheet:logged\``,
  },
  {
    id: "doc-4",
    title: "Cloud Database",
    location: "Team Space",
    tags: ["Infra"],
    updated: "Dec 16 2025",
    viewed: "Dec 24",
    content: `# Cloud Database Architecture

- Provider: Neon Serverless PostgreSQL
- Region: AWS ap-southeast-1
- Branching: Automated preview branches per PR`,
  },
  {
    id: "doc-5",
    title: "Cloud research (2)",
    location: "Team Space",
    tags: ["Research"],
    updated: "Dec 17 2025",
    viewed: "Dec 19",
    content: `# Cloud Research Notes

Benchmarked serverless PostgreSQL latency against RDS. Neon zero-scale cold starts averaged < 400ms.`,
  },
  {
    id: "doc-6",
    title: "Setting up the backend in your system",
    location: "Team Space",
    tags: ["DevOps"],
    updated: "Jan 12",
    viewed: "Dec 19",
    content: `# Backend Setup Guide

1. Clone repo
2. \`cd backend && npm install\`
3. Run migrations \`npx prisma migrate dev\`
4. Seed demo users \`npm run seed\`
5. Start dev server \`npm run dev\``,
  },
  {
    id: "doc-7",
    title: "database query (only for reference)",
    location: "Team Space",
    tags: ["SQL"],
    updated: "Dec 17 2025",
    viewed: "Dec 18",
    content: `# Useful Database Queries

\`\`\`sql
SELECT u.name, SUM(t.hours) as total_hours 
FROM "User" u 
JOIN "TimeEntry" t ON u.id = t."userId" 
GROUP BY u.name;
\`\`\``,
  },
  {
    id: "doc-8",
    title: "Database Schema",
    location: "Team Space",
    tags: ["Schema"],
    updated: "Dec 19 2025",
    viewed: "Dec 18",
    content: `# Complete Database Schema

Models: User, Workspace, Project, Task, Channel, Message, TimeEntry, Notification.`,
  },
  {
    id: "doc-9",
    title: "App installation Implementation",
    location: "Team Space",
    tags: ["Apps"],
    updated: "Dec 17 2025",
    viewed: "Dec 17",
    content: `# App Installation Spec

GitHub App integration OAuth token exchange with auto webhook setup.`,
  },
  {
    id: "doc-10",
    title: "Tech's and Software using",
    location: "Team Space",
    tags: ["Stack"],
    updated: "Dec 17 2025",
    viewed: "Dec 17",
    content: `# Technology Stack

- Frontend: React, Vite, TailwindCSS, Framer Motion, Lucide Icons
- Backend: Express, Prisma ORM, Neon PostgreSQL, Socket.IO`,
  },
  {
    id: "doc-11",
    title: "Electron",
    location: "Team Space",
    tags: ["Desktop"],
    updated: "Dec 18 2025",
    viewed: "Dec 16",
    content: `# Desktop Electron Configuration

Single instance lock and native tray notifications support.`,
  },
  {
    id: "doc-12",
    title: "biometric working",
    location: "+ Add Location",
    tags: [],
    updated: "Jan 24",
    viewed: "-",
    content: `# Biometric Working Spec

Hardware interface definitions for RFID and biometric fingerprint readers.`,
  },
  {
    id: "doc-13",
    title: "Frontend README",
    location: "-",
    tags: [],
    updated: "Dec 27 2025",
    viewed: "-",
    content: `# Frontend Architecture

DevPilot modern web dashboard UI matching ClickUp 3.0 dark mode specifications.`,
  },
];

const FEATURED_CARDS = [
  {
    id: "fc1",
    title: "Prisma Change Log",
    desc: "Sync schema updates",
  },
  {
    id: "fc2",
    title: "Dev Workflow Guide",
    desc: "Standardize PRs",
  },
  {
    id: "fc3",
    title: "IoT Data Specs",
    desc: "Centralize telemetry",
  },
  {
    id: "fc4",
    title: "Communication Rules",
    desc: "Fix team alignment",
  },
];

export default function Docs() {
  const [activeCategory, setActiveCategory] = useState("all"); // all | my | shared | private | meetings | archived
  const [docsList, setDocsList] = useState(INITIAL_DOCS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");

  const filteredDocs = docsList.filter((doc) => {
    return (
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const handleCreateDoc = (e) => {
    e.preventDefault();
    if (!newDocTitle.trim()) return;

    const newDoc = {
      id: `doc-${Date.now()}`,
      title: newDocTitle.trim(),
      location: "Team Space",
      tags: ["Workspace"],
      updated: "Just now",
      viewed: "Just now",
      content: `# ${newDocTitle.trim()}\n\nStart typing notes or press \`/\` for commands...`,
    };

    setDocsList([newDoc, ...docsList]);
    setSelectedDoc(newDoc);
    setNewDocTitle("");
    setIsCreatingDoc(false);
  };

  return (
    <PageTransition>
      <div className="flex-1 flex h-full overflow-hidden dark:bg-[#0c0e14] bg-[#f8fafc] dark:text-white text-slate-900 select-none transition-colors duration-200">
        
        {/* ══════ Left Docs Sub-Sidebar (Matching Screenshot 7) ══════ */}
        <div className="w-60 dark:bg-[#0f121a] bg-slate-50 border-r dark:border-white/[0.08] border-slate-200 flex flex-col h-full flex-shrink-0 transition-colors">
          {/* Header */}
          <div className="p-3.5 border-b dark:border-white/[0.06] border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-bold dark:text-white text-slate-900">Docs</h2>
            <button
              onClick={() => setIsCreatingDoc(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg dark:bg-white/5 bg-slate-200/80 dark:hover:bg-white/10 hover:bg-slate-300/70 text-xs font-semibold dark:text-slate-200 text-slate-800 border dark:border-white/5 border-slate-200 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create</span>
            </button>
          </div>

          {/* Nav Categories */}
          <div className="p-2 space-y-0.5 border-b dark:border-white/[0.06] border-slate-200">
            <button
              onClick={() => setActiveCategory("all")}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeCategory === "all"
                  ? "dark:bg-white/10 bg-slate-200/80 dark:text-white text-slate-900 font-semibold"
                  : "text-slate-500 dark:hover:text-slate-200 hover:text-slate-900 dark:hover:bg-white/5 hover:bg-slate-100"
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>All Docs</span>
              </div>
            </button>

            <button
              onClick={() => setActiveCategory("my")}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeCategory === "my"
                  ? "dark:bg-white/10 bg-slate-200/80 dark:text-white text-slate-900 font-semibold"
                  : "text-slate-500 dark:hover:text-slate-200 hover:text-slate-900 dark:hover:bg-white/5 hover:bg-slate-100"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-slate-700 flex items-center justify-center text-[9px] font-bold text-white">
                  A
                </span>
                <span>My Docs</span>
              </div>
              <span className="text-[11px] text-slate-400">6</span>
            </button>

            <button
              onClick={() => setActiveCategory("shared")}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeCategory === "shared"
                  ? "dark:bg-white/10 bg-slate-200/80 dark:text-white text-slate-900 font-semibold"
                  : "text-slate-500 dark:hover:text-slate-200 hover:text-slate-900 dark:hover:bg-white/5 hover:bg-slate-100"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Shared with me</span>
            </button>

            <button
              onClick={() => setActiveCategory("private")}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeCategory === "private"
                  ? "dark:bg-white/10 bg-slate-200/80 dark:text-white text-slate-900 font-semibold"
                  : "text-slate-500 dark:hover:text-slate-200 hover:text-slate-900 dark:hover:bg-white/5 hover:bg-slate-100"
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Private</span>
            </button>

            <button
              onClick={() => setActiveCategory("meetings")}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeCategory === "meetings"
                  ? "dark:bg-white/10 bg-slate-200/80 dark:text-white text-slate-900 font-semibold"
                  : "text-slate-500 dark:hover:text-slate-200 hover:text-slate-900 dark:hover:bg-white/5 hover:bg-slate-100"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Meeting Notes</span>
            </button>

            <button
              onClick={() => setActiveCategory("archived")}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeCategory === "archived"
                  ? "dark:bg-white/10 bg-slate-200/80 dark:text-white text-slate-900 font-semibold"
                  : "text-slate-500 dark:hover:text-slate-200 hover:text-slate-900 dark:hover:bg-white/5 hover:bg-slate-100"
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Archived</span>
            </button>
          </div>

          {/* Favorites Empty State Card */}
          <div className="p-3 border-b dark:border-white/[0.06] border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Favorites
            </span>
            <div className="p-3 rounded-xl dark:bg-white/[0.02] bg-white border border-dashed dark:border-white/[0.08] border-slate-200 text-center shadow-xs">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500/20 mx-auto mb-1.5" />
              <p className="text-[11px] text-slate-400">Star a Doc to see it here</p>
            </div>
          </div>

          {/* Recent Pages List */}
          <div className="p-3 flex-1 overflow-y-auto space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Recent Pages
            </span>
            {docsList.slice(0, 5).map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedDoc(d)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs text-slate-500 dark:hover:text-slate-200 hover:text-slate-900 dark:hover:bg-white/5 hover:bg-slate-200/60 transition-colors truncate"
              >
                <FileText className="w-3 h-3 flex-shrink-0 text-slate-400" />
                <span className="truncate">{d.title}</span>
              </button>
            ))}
          </div>

          {/* Popular Wikis Box */}
          <div className="p-3 border-t dark:border-white/[0.06] border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Popular Wikis
            </span>
            <div className="p-3 rounded-xl dark:bg-white/[0.02] bg-white border dark:border-white/[0.05] border-slate-200 text-center shadow-xs">
              <Shield className="w-4 h-4 text-emerald-500 mx-auto mb-1 opacity-70" />
              <p className="text-[10px] text-slate-400 leading-snug">
                Most viewed and active Wikis appear here
              </p>
            </div>
          </div>
        </div>

        {/* ══════ Right Main Table View (Matching Screenshot 7) ══════ */}
        <div className="flex-1 flex flex-col h-full overflow-y-auto dark:bg-[#0c0e14] bg-[#f8fafc]">
          {/* Main Top Header */}
          <div className="h-14 border-b dark:border-white/[0.08] border-slate-200 px-6 flex items-center justify-between flex-shrink-0 dark:bg-[#0c0e14] bg-white transition-colors">
            <h1 className="text-base font-bold dark:text-white text-slate-900">All Docs</h1>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg dark:bg-white/5 bg-slate-100 dark:hover:bg-white/10 hover:bg-slate-200/80 text-xs font-medium dark:text-slate-300 text-slate-700 border dark:border-white/5 border-slate-200 transition-colors">
                <Download className="w-3.5 h-3.5" />
                <span>Import</span>
              </button>
              <button
                onClick={() => setIsCreatingDoc(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl dark:bg-white bg-slate-900 dark:text-slate-900 text-white hover:opacity-90 text-xs font-bold transition-all shadow-sm active:scale-95"
              >
                <span>New Doc</span>
                <ChevronDown className="w-3 h-3 dark:text-slate-700 text-slate-300" />
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="p-6 space-y-6">
            
            {/* Top 4 Quick Featured Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {FEATURED_CARDS.map((fc) => (
                <div
                  key={fc.id}
                  onClick={() => {
                    const match = docsList.find((d) => d.title.includes(fc.title.split(" ")[0]));
                    if (match) setSelectedDoc(match);
                  }}
                  className="p-3.5 rounded-xl dark:bg-[#121520] bg-white dark:hover:bg-[#181c2b] hover:bg-slate-50 border dark:border-white/[0.06] border-slate-200 hover:border-indigo-500/30 transition-all cursor-pointer group shadow-sm"
                >
                  <h4 className="text-xs font-bold dark:text-slate-200 text-slate-800 group-hover:text-indigo-600 dark:group-hover:text-white transition-colors truncate">
                    {fc.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                    {fc.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Filter & Search Toolbar */}
            <div className="flex items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg dark:bg-white/5 bg-slate-100 dark:hover:bg-white/10 hover:bg-slate-200/80 text-xs dark:text-slate-300 text-slate-700 border dark:border-white/5 border-slate-200 transition-colors">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filters</span>
                </button>
                <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg dark:bg-white/5 bg-slate-100 dark:hover:bg-white/10 hover:bg-slate-200/80 text-xs dark:text-slate-300 text-slate-700 border dark:border-white/5 border-slate-200 transition-colors">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span>Sort</span>
                </button>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <span>Tags:</span>
                </div>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg dark:bg-white/5 bg-white border dark:border-white/[0.08] border-slate-200 text-xs dark:text-slate-200 text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 w-48 shadow-sm transition-all"
                />
              </div>
            </div>

            {/* Docs Table View (Matching Screenshot 7) */}
            <div className="rounded-xl border dark:border-white/[0.08] border-slate-200 overflow-hidden dark:bg-[#10131d] bg-white shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b dark:border-white/[0.08] border-slate-200 dark:bg-[#141724] bg-slate-50 text-slate-500 font-semibold text-[11px]">
                    <th className="py-2.5 px-4 w-10">
                      <input type="checkbox" className="rounded bg-white/10 border-white/20 accent-indigo-500" />
                    </th>
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-4 w-44">Location</th>
                    <th className="py-2.5 px-4 w-32">Tags</th>
                    <th className="py-2.5 px-4 w-28">Date updated</th>
                    <th className="py-2.5 px-4 w-28">Date viewed</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-white/[0.04] divide-slate-100">
                  {filteredDocs.map((doc) => (
                    <tr
                      key={doc.id}
                      onClick={() => setSelectedDoc(doc)}
                      className="dark:hover:bg-white/[0.04] hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    >
                      <td className="py-2 px-4" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" className="rounded bg-white/10 border-white/20 accent-indigo-500" />
                      </td>
                      <td className="py-2 px-3 font-medium dark:text-slate-200 text-slate-800 dark:group-hover:text-white group-hover:text-slate-900 flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded flex items-center justify-center bg-cyan-600/20 text-cyan-500 flex-shrink-0">
                          <FileText className="w-3.5 h-3.5" />
                        </span>
                        <span className="truncate">{doc.title}</span>
                      </td>
                      <td className="py-2 px-4 text-slate-400">
                        {doc.location === "Team Space" ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-500 text-[11px] font-medium">
                            <Users className="w-3 h-3" />
                            <span>Team Space</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">{doc.location}</span>
                        )}
                      </td>
                      <td className="py-2 px-4 text-slate-400">
                        {doc.tags && doc.tags.length > 0 ? (
                          <div className="flex items-center gap-1">
                            {doc.tags.map((t) => (
                              <span key={t} className="px-1.5 py-0.5 rounded dark:bg-white/5 bg-slate-100 text-[10px] dark:text-slate-400 text-slate-600 border dark:border-transparent border-slate-200">
                                {t}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-2 px-4 text-slate-400 text-[11px]">{doc.updated}</td>
                      <td className="py-2 px-4 text-slate-400 text-[11px]">{doc.viewed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </div>

        {/* ══════ Document Reader Modal ══════ */}
        <AnimatePresence>
          {selectedDoc && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-3xl max-h-[85vh] rounded-2xl dark:bg-[#121520] bg-white border dark:border-white/10 border-slate-200 shadow-2xl flex flex-col overflow-hidden dark:text-slate-200 text-slate-800"
              >
                {/* Reader Header */}
                <div className="p-4 border-b dark:border-white/[0.08] border-slate-200 flex items-center justify-between dark:bg-[#151926] bg-slate-50">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-cyan-600/20 text-cyan-500 flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold dark:text-white text-slate-900 leading-tight">
                        {selectedDoc.title}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Location: {selectedDoc.location} • Last updated {selectedDoc.updated}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-1.5 rounded-lg dark:hover:bg-white/10 hover:bg-slate-100 text-slate-400 dark:hover:text-white hover:text-slate-800 transition-colors">
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setSelectedDoc(null)}
                      className="p-1.5 rounded-lg dark:hover:bg-white/10 hover:bg-slate-100 text-slate-400 dark:hover:text-white hover:text-slate-800 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Reader Body */}
                <div className="p-6 overflow-y-auto text-xs leading-relaxed space-y-4 font-mono dark:bg-[#0c0e14] bg-slate-50">
                  <pre className="whitespace-pre-wrap font-sans text-sm dark:text-slate-300 text-slate-700 leading-relaxed">
                    {selectedDoc.content}
                  </pre>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ══════ Create Doc Modal ══════ */}
        <AnimatePresence>
          {isCreatingDoc && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md rounded-2xl dark:bg-[#151926] bg-white border dark:border-white/10 border-slate-200 shadow-2xl p-5 dark:text-slate-200 text-slate-800"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold dark:text-white text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-500" />
                    <span>Create New Document</span>
                  </h3>
                  <button onClick={() => setIsCreatingDoc(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleCreateDoc} className="space-y-4">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                      Document Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Architecture Overview, API Spec..."
                      value={newDocTitle}
                      onChange={(e) => setNewDocTitle(e.target.value)}
                      autoFocus
                      className="w-full px-3 py-2 rounded-xl dark:bg-slate-900 bg-slate-50 border dark:border-white/10 border-slate-200 text-xs dark:text-white text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCreatingDoc(false)}
                      className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!newDocTitle.trim()}
                      className="px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white shadow-sm"
                    >
                      Create Doc
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </PageTransition>
  );
}
