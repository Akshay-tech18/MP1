import React, { useState, useEffect, useCallback } from "react";
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
  Trash2,
  Save,
  Loader2,
  Sparkles,
} from "lucide-react";
import PageTransition from "../components/PageTransition";
import useAuthStore from "../store/useAuthStore";
import {
  fetchDocuments,
  fetchDocumentById,
  createDocument as apiCreateDocument,
  updateDocument as apiUpdateDocument,
  deleteDocuments as apiDeleteDocuments,
} from "../api/documents";

const STARTER_TEMPLATES = [
  {
    title: "DevPilot Architecture & Service Contracts",
    tags: ["Architecture", "API", "Backend"],
    content: `# DevPilot Architecture & Service Contracts

## 1. System Architecture Overview
DevPilot connects developers, project managers, and AI assistants in a unified real-time cockpit.

### Core Modules:
- **Auth Service**: JWT (24h token) with Google & GitHub OAuth.
- **Project & Sprint Service**: Real-time Kanban board with optimistic updates.
- **Workspace Documents**: Hierarchical markdown docs with pgvector embeddings.
- **Nexus AI**: RAG vector search & LangGraph agent with Human-in-the-Loop approval.
- **Communication Service**: Socket.IO channels & direct messaging.

## 2. Real-Time Events
- \`notification:new\` - Instant push notifications
- \`chat:message\` - Real-time channel and direct message streams`,
  },
  {
    title: "Working with Neon and Prisma",
    tags: ["Database", "Postgres", "Prisma"],
    content: `# Working with Neon and Prisma

## 1. Connection Strings Setup
Ensure that your database URL in \`.env\` includes the pooling parameters:
\`\`\`env
DATABASE_URL="postgresql://user:pass@ep-pooler.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://user:pass@ep.neon.tech/neondb?sslmode=require"
\`\`\`

## 2. Migrations & Vector Extensions
PostgreSQL pgvector extension is enabled for 384-dimensional dense semantic embeddings:
\`\`\`bash
npx prisma generate
\`\`\``,
  },
  {
    title: "Nexus AI RAG & LangGraph Implementation",
    tags: ["AI", "RAG", "LangGraph"],
    content: `# Nexus AI RAG & LangGraph Implementation

## 1. Vector Pipeline
- Documents are split into max 500-char chunks.
- Embeddings are generated using Hugging Face \`sentence-transformers/all-MiniLM-L6-v2\`.
- Embeddings are stored in \`document_chunks\` using PostgreSQL pgvector.

## 2. Human-in-the-Loop (HITL) Safety
When Nexus decides to perform destructive or stateful actions (like creating tasks), LangGraph interrupts execution and requests user confirmation via the \`/api/projects/:projectId/nexus/approve\` endpoint.`,
  },
];

export default function Docs() {
  const { currentProject, projects, user } = useAuthStore();
  const projectId = currentProject?.id || (projects[0] ? projects[0].id : null);

  const [activeCategory, setActiveCategory] = useState("all");
  const [docsList, setDocsList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);
  const [hoveredDoc, setHoveredDoc] = useState(null);
  const [selectedDocIds, setSelectedDocIds] = useState(new Set());

  // Create Doc Modal State
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocContent, setNewDocContent] = useState("");
  const [newDocTags, setNewDocTags] = useState("");
  const [isSubmittingDoc, setIsSubmittingDoc] = useState(false);

  // Edit Doc State inside Reader
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Load documents for current project
  const loadDocuments = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const params = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (selectedTag) params.tags = selectedTag;

      const res = await fetchDocuments(projectId, params);
      if (res.success && res.data?.documents) {
        setDocsList(res.data.documents);
      }
    } catch (err) {
      console.error("Failed to load documents:", err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, searchQuery, selectedTag]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Open Document and load full content
  const handleSelectDoc = async (doc) => {
    if (!projectId || !doc?.id) return;
    setIsLoadingDoc(true);
    try {
      const res = await fetchDocumentById(projectId, doc.id);
      if (res.success && res.data?.document) {
        const fullDoc = res.data.document;
        setSelectedDoc(fullDoc);
        setEditTitle(fullDoc.title || "");
        setEditContent(fullDoc.content || "");
        setIsEditing(false);
      }
    } catch (err) {
      console.error("Failed to fetch full document:", err);
      setSelectedDoc(doc);
    } finally {
      setIsLoadingDoc(false);
    }
  };

  // Create Document Handler
  const handleCreateDoc = async (e) => {
    e.preventDefault();
    if (!newDocTitle.trim() || !projectId) return;

    setIsSubmittingDoc(true);
    try {
      const tags = newDocTags
        ? newDocTags.split(",").map((t) => t.trim()).filter(Boolean)
        : ["Workspace"];
      const content =
        newDocContent.trim() ||
        `# ${newDocTitle.trim()}\n\nStart typing notes or press \`/\` for commands...`;

      const res = await apiCreateDocument(projectId, {
        title: newDocTitle.trim(),
        content,
        tags,
      });

      if (res.success && res.data?.document) {
        setNewDocTitle("");
        setNewDocContent("");
        setNewDocTags("");
        setIsCreatingDoc(false);
        await loadDocuments();
        handleSelectDoc(res.data.document);
      }
    } catch (err) {
      console.error("Failed to create document:", err);
    } finally {
      setIsSubmittingDoc(false);
    }
  };

  // Save edits inside Reader
  const handleSaveEdit = async () => {
    if (!projectId || !selectedDoc) return;
    setIsSavingEdit(true);
    try {
      const res = await apiUpdateDocument(projectId, selectedDoc.id, {
        title: editTitle.trim() || selectedDoc.title,
        content: editContent,
      });
      if (res.success && res.data?.document) {
        setSelectedDoc(res.data.document);
        setIsEditing(false);
        await loadDocuments();
      }
    } catch (err) {
      console.error("Failed to save document changes:", err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete single document
  const handleDeleteDoc = async (docId, e) => {
    if (e) e.stopPropagation();
    if (!projectId || !docId) return;
    if (!window.confirm("Are you sure you want to delete this document?")) return;

    try {
      await apiDeleteDocuments(projectId, [docId]);
      if (selectedDoc?.id === docId) setSelectedDoc(null);
      await loadDocuments();
    } catch (err) {
      console.error("Failed to delete document:", err);
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (!projectId || selectedDocIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedDocIds.size} selected documents?`)) return;

    try {
      await apiDeleteDocuments(projectId, Array.from(selectedDocIds));
      setSelectedDocIds(new Set());
      await loadDocuments();
    } catch (err) {
      console.error("Failed to bulk delete documents:", err);
    }
  };

  // Toggle selection
  const toggleDocSelection = (docId, e) => {
    e.stopPropagation();
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  };

  // Toggle select all
  const toggleSelectAll = () => {
    if (selectedDocIds.size === docsList.length) {
      setSelectedDocIds(new Set());
    } else {
      setSelectedDocIds(new Set(docsList.map((d) => d.id)));
    }
  };

  // Seed Starter Templates
  const handleSeedDocs = async () => {
    if (!projectId) return;
    setIsSeeding(true);
    try {
      for (const tpl of STARTER_TEMPLATES) {
        await apiCreateDocument(projectId, tpl);
      }
      await loadDocuments();
    } catch (err) {
      console.error("Failed to seed docs:", err);
    } finally {
      setIsSeeding(false);
    }
  };

  // Available unique tags from docs
  const allTags = Array.from(
    new Set(docsList.flatMap((d) => d.tags || []))
  );

  return (
    <PageTransition>
      <div className="flex-1 flex h-full overflow-hidden dark:bg-[#080808] bg-[#f8fafc] dark:text-white text-slate-900 select-none transition-colors duration-200">
        
        {/* ══════ Left Docs Sub-Sidebar ══════ */}
        <div className="w-60 dark:bg-[#0d0d10] bg-slate-50 border-r dark:border-white/[0.08] border-slate-200 flex flex-col h-full flex-shrink-0 transition-colors">
          {/* Header */}
          <div className="p-3.5 border-b dark:border-white/[0.06] border-slate-200 flex items-center justify-between">
            <h2 className="text-section-heading dark:text-white text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>Docs</span>
            </h2>
            <button
              onClick={() => setIsCreatingDoc(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg dark:bg-white/5 bg-slate-200/80 dark:hover:bg-white/10 hover:bg-slate-300/70 text-btn-refined dark:text-slate-200 text-slate-800 border dark:border-white/5 border-slate-200 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create</span>
            </button>
          </div>

          {/* Nav Categories */}
          <div className="p-2 space-y-0.5 border-b dark:border-white/[0.06] border-slate-200">
            <button
              onClick={() => setActiveCategory("all")}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-nav-secondary transition-colors ${
                activeCategory === "all"
                  ? "dark:bg-white/10 bg-slate-200/80 dark:text-white text-slate-900 font-semibold"
                  : "text-slate-500 dark:hover:text-slate-200 hover:text-slate-900 dark:hover:bg-white/5 hover:bg-slate-100"
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>All Docs</span>
              </div>
              <span className="text-caption-meta text-slate-400">{docsList.length}</span>
            </button>

            <button
              onClick={() => setActiveCategory("my")}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-nav-secondary transition-colors ${
                activeCategory === "my"
                  ? "dark:bg-white/10 bg-slate-200/80 dark:text-white text-slate-900 font-semibold"
                  : "text-slate-500 dark:hover:text-slate-200 hover:text-slate-900 dark:hover:bg-white/5 hover:bg-slate-100"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-slate-700 flex items-center justify-center text-[9px] font-bold text-white">
                  {user?.name ? user.name[0].toUpperCase() : "U"}
                </span>
                <span>My Docs</span>
              </div>
              <span className="text-caption-meta text-slate-400">
                {docsList.filter((d) => d.authorId === user?.id).length}
              </span>
            </button>

            <button
              onClick={() => setActiveCategory("shared")}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-nav-secondary transition-colors ${
                activeCategory === "shared"
                  ? "dark:bg-white/10 bg-slate-200/80 dark:text-white text-slate-900 font-semibold"
                  : "text-slate-500 dark:hover:text-slate-200 hover:text-slate-900 dark:hover:bg-white/5 hover:bg-slate-100"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Workspace Docs</span>
            </button>
          </div>

          {/* Quick Tags in Sidebar */}
          {allTags.length > 0 && (
            <div className="p-3 border-b dark:border-white/[0.06] border-slate-200">
              <span className="text-metric-label text-slate-400 block mb-2">
                Filter by Tag
              </span>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setSelectedTag("")}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    selectedTag === ""
                      ? "bg-indigo-600 text-white"
                      : "dark:bg-white/5 bg-slate-100 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  All
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(selectedTag === tag ? "" : tag)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      selectedTag === tag
                        ? "bg-indigo-600 text-white"
                        : "dark:bg-white/5 bg-slate-100 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Favorites Card */}
          <div className="p-3 border-b dark:border-white/[0.06] border-slate-200">
            <span className="text-metric-label text-slate-400 block mb-2">
              Workspace Grounding
            </span>
            <div className="p-3 rounded-xl dark:bg-white/[0.02] bg-white border border-dashed dark:border-white/[0.08] border-slate-200 text-center shadow-xs">
              <Sparkles className="w-5 h-5 text-indigo-400 mx-auto mb-1.5" />
              <p className="text-[11.5px] dark:text-slate-300 text-slate-700 font-medium">
                RAG Vector Indexed
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                Docs are automatically vectorized for Nexus² AI queries.
              </p>
            </div>
          </div>
        </div>

        {/* ══════ Right Main Area ══════ */}
        <div className="flex-1 flex flex-col h-full overflow-y-auto min-w-0">
          
          {/* Top Sticky Header */}
          <div className="p-4 border-b dark:border-white/[0.08] border-slate-200 flex items-center justify-between dark:bg-[#080808]/90 bg-white/90 backdrop-blur sticky top-0 z-10 transition-colors">
            <div className="flex items-center gap-3">
              <h1 className="text-major-heading dark:text-white text-slate-900 flex items-center gap-2">
                <span>Workspace Docs</span>
                {currentProject && (
                  <span className="text-[12px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-normal">
                    {currentProject.name}
                  </span>
                )}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              {selectedDocIds.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-all shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Selected ({selectedDocIds.size})</span>
                </button>
              )}

              <button
                onClick={() => setIsCreatingDoc(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-btn-refined shadow-sm shadow-indigo-600/20 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Doc</span>
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="p-6 space-y-6">
            
            {/* Top Quick Featured Cards */}
            {docsList.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {docsList.slice(0, 3).map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => handleSelectDoc(doc)}
                    className="p-3.5 rounded-xl dark:bg-[#121214] bg-white dark:hover:bg-[#18181b] hover:bg-slate-50 border dark:border-white/[0.06] border-slate-200 hover:border-indigo-500/30 transition-all cursor-pointer group shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="text-badge-meta font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {doc.tags?.[0] || "Doc"}
                      </span>
                      <span className="text-[11.5px] text-slate-400 font-medium">
                        {doc.readTime || 1}m read
                      </span>
                    </div>
                    <h4 className="text-card-title dark:text-slate-200 text-slate-800 group-hover:text-indigo-500 dark:group-hover:text-white transition-colors truncate">
                      {doc.title}
                    </h4>
                    <div className="flex items-center justify-between text-task-metadata text-slate-400 pt-2 mt-2 border-t dark:border-white/[0.04] border-slate-100">
                      <span className="truncate">{doc.author?.name || user?.name || "Author"}</span>
                      <span className="text-[11px]">
                        {new Date(doc.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Filter & Search Toolbar */}
            <div className="flex items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                  <span>Showing {docsList.length} documents</span>
                </div>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search docs or authors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg dark:bg-white/5 bg-white border dark:border-white/[0.08] border-slate-200 text-[13px] dark:text-slate-200 text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 w-56 shadow-sm transition-all"
                />
              </div>
            </div>

            {/* Empty State when no docs found */}
            {docsList.length === 0 && !isLoading && (
              <div className="rounded-2xl border border-dashed dark:border-white/10 border-slate-300 p-12 text-center flex flex-col items-center justify-center dark:bg-white/[0.01] bg-slate-50/50">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-3 border border-indigo-500/20">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold dark:text-white text-slate-900 mb-1">
                  No documents found
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mb-5 leading-relaxed">
                  Start writing internal documentation, architecture specs, and notes. Nexus² will use them for intelligent grounding.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsCreatingDoc(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create First Document</span>
                  </button>
                  <button
                    onClick={handleSeedDocs}
                    disabled={isSeeding}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl dark:bg-white/5 bg-white border dark:border-white/10 border-slate-200 dark:hover:bg-white/10 hover:bg-slate-100 text-xs font-semibold dark:text-slate-200 text-slate-800 shadow-sm transition-all"
                  >
                    {isSeeding ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <span>Generate Starter Docs</span>
                  </button>
                </div>
              </div>
            )}

            {/* Docs Table View */}
            {docsList.length > 0 && (
              <div className="rounded-xl border dark:border-white/[0.08] border-slate-200 overflow-hidden dark:bg-[#101013] bg-white shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b dark:border-white/[0.08] border-slate-200 dark:bg-[#141417] bg-slate-50 text-slate-500 font-semibold text-[12px]">
                      <th className="py-2.5 px-4 w-10">
                        <input
                          type="checkbox"
                          checked={selectedDocIds.size === docsList.length && docsList.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded bg-white/10 border-white/20 accent-indigo-500 cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-4 w-36">Author</th>
                      <th className="py-2.5 px-4 w-32">Tags</th>
                      <th className="py-2.5 px-4 w-32">Date updated</th>
                      <th className="py-2.5 px-4 w-24">Read time</th>
                      <th className="py-2.5 px-4 w-16 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-white/[0.04] divide-slate-100">
                    {docsList.map((doc) => (
                      <tr
                        key={doc.id}
                        onClick={() => handleSelectDoc(doc)}
                        className="dark:hover:bg-white/[0.04] hover:bg-slate-50/70 transition-colors cursor-pointer group"
                      >
                        <td className="py-2 px-4" onClick={(e) => toggleDocSelection(doc.id, e)}>
                          <input
                            type="checkbox"
                            checked={selectedDocIds.has(doc.id)}
                            onChange={(e) => toggleDocSelection(doc.id, e)}
                            className="rounded bg-white/10 border-white/20 accent-indigo-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2.5">
                            <span className="w-5 h-5 rounded flex items-center justify-center bg-cyan-600/20 text-cyan-500 flex-shrink-0">
                              <FileText className="w-3.5 h-3.5" />
                            </span>
                            <div className="min-w-0">
                              <span className="text-card-title dark:text-slate-100 text-slate-900 dark:group-hover:text-indigo-400 group-hover:text-indigo-600 transition-colors truncate block font-medium">
                                {doc.title}
                              </span>
                              {doc.parent?.title && (
                                <span className="text-[11px] text-slate-400 truncate block">
                                  ↳ Sub-doc of: {doc.parent.title}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-slate-400 font-medium text-[12.5px]">
                          {doc.author?.name || user?.name || "Aditya"}
                        </td>
                        <td className="py-2.5 px-4 text-slate-400">
                          {doc.tags && doc.tags.length > 0 ? (
                            <div className="flex items-center gap-1 flex-wrap">
                              {doc.tags.map((t) => (
                                <span
                                  key={t}
                                  className="px-1.5 py-0.5 rounded dark:bg-white/5 bg-slate-100 text-badge-meta dark:text-slate-400 text-slate-600 border dark:border-transparent border-slate-200"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[12px]">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-slate-400 text-[12px]">
                          {new Date(doc.updatedAt).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-2.5 px-4 text-slate-400 text-[12px]">
                          {doc.readTime || 1}m read
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            onClick={(e) => handleDeleteDoc(doc.id, e)}
                            title="Delete document"
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

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
                className="w-full max-w-3xl max-h-[85vh] rounded-2xl dark:bg-[#121214] bg-white border dark:border-white/10 border-slate-200 shadow-2xl flex flex-col overflow-hidden dark:text-slate-200 text-slate-800"
              >
                {/* Reader Header */}
                <div className="p-4 border-b dark:border-white/[0.08] border-slate-200 flex items-center justify-between dark:bg-[#161619] bg-slate-50">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0 mr-3">
                    <span className="w-7 h-7 rounded-lg bg-cyan-600/20 text-cyan-500 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full text-base font-bold dark:bg-slate-900 bg-white border dark:border-white/20 border-slate-300 rounded-lg px-2.5 py-1 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                        />
                      ) : (
                        <h3 className="text-major-heading dark:text-white text-slate-900 leading-tight truncate">
                          {selectedDoc.title}
                        </h3>
                      )}
                      <p className="text-task-metadata text-slate-400 mt-0.5">
                        By {selectedDoc.author?.name || user?.name || "Author"} • Read time: {selectedDoc.readTime || 1}m • Updated: {new Date(selectedDoc.updatedAt || Date.now()).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <button
                        onClick={handleSaveEdit}
                        disabled={isSavingEdit}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all"
                      >
                        {isSavingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        <span>Save</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg dark:hover:bg-white/10 hover:bg-slate-200 text-slate-400 dark:hover:text-white hover:text-slate-800 text-xs font-medium transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteDoc(selectedDoc.id)}
                      className="p-1.5 rounded-lg dark:hover:bg-rose-500/20 hover:bg-rose-100 text-slate-400 hover:text-rose-500 transition-colors"
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setSelectedDoc(null)}
                      className="p-1.5 rounded-lg dark:hover:bg-white/10 hover:bg-slate-100 text-slate-400 dark:hover:text-white hover:text-slate-800 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Tags in Reader */}
                {selectedDoc.tags && selectedDoc.tags.length > 0 && (
                  <div className="px-6 py-2 border-b dark:border-white/[0.06] border-slate-200 dark:bg-white/[0.01] bg-slate-50 flex items-center gap-2 text-xs">
                    <span className="text-[12px] text-slate-400 font-semibold">Tags:</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {selectedDoc.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-md dark:bg-white/5 bg-slate-200/60 text-[11.5px] dark:text-indigo-300 text-indigo-600 font-medium"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reader Body / Editor */}
                <div className="p-6 overflow-y-auto text-xs leading-relaxed space-y-4 font-mono dark:bg-[#080808] bg-slate-50 flex-1">
                  {isLoadingDoc ? (
                    <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                      <span>Loading document content...</span>
                    </div>
                  ) : isEditing ? (
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={18}
                      className="w-full p-4 rounded-xl dark:bg-slate-900 bg-white border dark:border-white/10 border-slate-300 text-[13px] font-mono leading-relaxed outline-none focus:border-indigo-500 dark:text-slate-200 text-slate-800 resize-none shadow-inner"
                      placeholder="Write markdown content here..."
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap font-sans text-[13.5px] dark:text-slate-300 text-slate-700 leading-relaxed">
                      {selectedDoc.content || "No content in this document."}
                    </pre>
                  )}
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
                className="w-full max-w-lg rounded-2xl dark:bg-[#161619] bg-white border dark:border-white/10 border-slate-200 shadow-2xl p-5 dark:text-slate-200 text-slate-800"
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
                      Document Title *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Architecture Overview, API Spec..."
                      value={newDocTitle}
                      onChange={(e) => setNewDocTitle(e.target.value)}
                      autoFocus
                      required
                      className="w-full px-3 py-2 rounded-xl dark:bg-slate-900 bg-slate-50 border dark:border-white/10 border-slate-200 text-xs dark:text-white text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                      Tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Backend, Postgres, Architecture"
                      value={newDocTags}
                      onChange={(e) => setNewDocTags(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl dark:bg-slate-900 bg-slate-50 border dark:border-white/10 border-slate-200 text-xs dark:text-white text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                      Markdown Content
                    </label>
                    <textarea
                      rows={6}
                      placeholder="# Write your rich documentation in Markdown..."
                      value={newDocContent}
                      onChange={(e) => setNewDocContent(e.target.value)}
                      className="w-full p-3 rounded-xl dark:bg-slate-900 bg-slate-50 border dark:border-white/10 border-slate-200 text-xs font-mono dark:text-white text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-500 resize-none"
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
                      disabled={!newDocTitle.trim() || isSubmittingDoc}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white shadow-sm transition-all"
                    >
                      {isSubmittingDoc && <Loader2 className="w-3 h-3 animate-spin" />}
                      <span>Create Doc</span>
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
