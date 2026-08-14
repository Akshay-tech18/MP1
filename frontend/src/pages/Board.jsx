import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { motion, AnimatePresence } from "framer-motion";
import useAuthStore from "../store/useAuthStore";
import useSocketStore from "../store/useSocketStore";
import client from "../api/client";
import PageTransition from "../components/PageTransition";
import {
  Plus,
  MessageSquare,
  User,
  X,
  Send,
} from "lucide-react";
import { TaskStatus, TaskPriority, SocketEvent } from "../config/constants";

const COLUMNS = ["TODO", "IN_PROGRESS", "IN_REVIEW", "COMPLETED", "BLOCKED"];

const COLUMN_CONFIG = {
  TODO: { label: "To Do", dot: "bg-slate-400", badge: "dark:bg-slate-500/10 bg-slate-100 dark:text-slate-400 text-slate-600 dark:border-slate-500/20 border-slate-200" },
  IN_PROGRESS: { label: "In Progress", dot: "bg-blue-400", badge: "dark:bg-blue-500/10 bg-blue-50 dark:text-blue-400 text-blue-600 dark:border-blue-500/20 border-blue-200" },
  IN_REVIEW: { label: "In Review", dot: "bg-purple-400", badge: "dark:bg-purple-500/10 bg-purple-50 dark:text-purple-400 text-purple-600 dark:border-purple-500/20 border-purple-200" },
  COMPLETED: { label: "Completed", dot: "bg-emerald-400", badge: "dark:bg-emerald-500/10 bg-emerald-50 dark:text-emerald-400 text-emerald-600 dark:border-emerald-500/20 border-emerald-200" },
  BLOCKED: { label: "Blocked", dot: "bg-red-400", badge: "dark:bg-red-500/10 bg-red-50 dark:text-red-400 text-red-600 dark:border-red-500/20 border-red-200" },
};

const PRIORITY_STYLES = {
  CRITICAL: "dark:bg-red-500/10 bg-red-50 text-red-400 dark:border-red-500/20 border-red-200",
  HIGH: "dark:bg-amber-500/10 bg-amber-50 text-amber-400 dark:border-amber-500/20 border-amber-200",
  MEDIUM: "dark:bg-blue-500/10 bg-blue-50 text-blue-400 dark:border-blue-500/20 border-blue-200",
  LOW: "dark:bg-dp-dark-elevated bg-dp-light-bg-secondary dark:text-dp-text-muted text-dp-text-light-muted dark:border-dp-dark-border-light border-dp-light-border",
};

export default function Board() {
  const { user, currentProject } = useAuthStore();
  const { socket } = useSocketStore();
  
  const [tasks, setTasks] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedSprintId, setSelectedSprintId] = useState("all");
  
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [taskDetails, setTaskDetails] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createColumnTarget, setCreateColumnTarget] = useState("TODO");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("MEDIUM");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");
  const [newTaskSprint, setNewTaskSprint] = useState("");

  const [loading, setLoading] = useState(true);

  // 1. Fetch Board initial states
  useEffect(() => {
    async function loadBoard() {
      if (!currentProject) return;
      setLoading(true);
      try {
        const projRes = await client.get(`/projects/${currentProject.id}`);
        if (projRes.data.success) {
          setMembers(projRes.data.data.project.members);
        }
        const sprintsRes = await client.get(`/projects/${currentProject.id}/sprints`);
        if (sprintsRes.data.success) {
          setSprints(sprintsRes.data.data.sprints);
        }
        await fetchTasks();
      } catch (err) {
        console.error("Error loading board:", err);
      } finally {
        setLoading(false);
      }
    }
    loadBoard();
  }, [currentProject]);

  const fetchTasks = async () => {
    if (!currentProject) return;
    try {
      const params = {};
      if (selectedSprintId !== "all") {
        params.sprintId = selectedSprintId === "backlog" ? "null" : selectedSprintId;
      }
      const res = await client.get(`/projects/${currentProject.id}/tasks`, { params });
      if (res.data.success) {
        setTasks(res.data.data.tasks);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (currentProject) fetchTasks();
  }, [selectedSprintId]);

  // 2. Socket event listeners
  useEffect(() => {
    if (!socket || !currentProject) return;

    socket.on(SocketEvent.TASK_CREATED, (newTask) => {
      setTasks((prev) => [...prev, newTask].sort((a, b) => a.orderIndex - b.orderIndex));
    });
    socket.on(SocketEvent.TASK_UPDATED, (updatedTask) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t))
            .sort((a, b) => a.orderIndex - b.orderIndex)
      );
      if (selectedTaskId === updatedTask.id) loadTaskDetails(updatedTask.id);
    });
    socket.on(SocketEvent.TASK_DELETED, (data) => {
      setTasks((prev) => prev.filter((t) => t.id !== data.id));
      if (selectedTaskId === data.id) { setSelectedTaskId(null); setTaskDetails(null); }
    });
    socket.on(SocketEvent.TASK_REORDERED, () => fetchTasks());
    socket.on(SocketEvent.TASK_COMMENT_ADDED, (data) => {
      if (selectedTaskId === data.taskId) setComments((prev) => [...prev, data.comment]);
    });

    return () => {
      socket.off(SocketEvent.TASK_CREATED);
      socket.off(SocketEvent.TASK_UPDATED);
      socket.off(SocketEvent.TASK_DELETED);
      socket.off(SocketEvent.TASK_REORDERED);
      socket.off(SocketEvent.TASK_COMMENT_ADDED);
    };
  }, [socket, currentProject, selectedTaskId, selectedSprintId]);

  const loadTaskDetails = async (taskId) => {
    try {
      const res = await client.get(`/projects/${currentProject.id}/tasks/${taskId}`);
      if (res.data.success) {
        setTaskDetails(res.data.data.task);
        setComments(res.data.data.task.comments);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (selectedTaskId) {
      loadTaskDetails(selectedTaskId);
      if (socket && currentProject) {
        socket.emit(SocketEvent.TASK_EDITING, { projectId: currentProject.id, taskId: selectedTaskId });
      }
    } else {
      if (socket && currentProject && selectedTaskId) {
        socket.emit(SocketEvent.TASK_EDITING_DONE, { projectId: currentProject.id, taskId: selectedTaskId });
      }
      setTaskDetails(null);
      setComments([]);
    }
  }, [selectedTaskId]);

  // 3. Drag-and-Drop
  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const destCol = destination.droppableId;
    const destTasks = tasks.filter(t => t.status === destCol).sort((a, b) => a.orderIndex - b.orderIndex);

    let newOrderIndex = 1000.0;
    if (destTasks.length === 0) newOrderIndex = 1000.0;
    else if (destination.index === 0) newOrderIndex = destTasks[0].orderIndex / 2;
    else if (destination.index >= destTasks.length) newOrderIndex = destTasks[destTasks.length - 1].orderIndex + 1000.0;
    else newOrderIndex = (destTasks[destination.index - 1].orderIndex + destTasks[destination.index].orderIndex) / 2;

    const originalTasks = [...tasks];
    setTasks(tasks.map(t => t.id === draggableId ? { ...t, status: destCol, orderIndex: newOrderIndex } : t)
      .sort((a, b) => a.orderIndex - b.orderIndex));

    try {
      const res = await client.patch(`/projects/${currentProject.id}/tasks/reorder`, {
        updates: [{ id: draggableId, orderIndex: newOrderIndex, status: destCol }]
      });
      if (!res.data.success) throw new Error();
    } catch (e) { setTasks(originalTasks); }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try {
      const res = await client.post(`/projects/${currentProject.id}/tasks`, {
        title: newTaskTitle, description: newTaskDesc, priority: newTaskPriority,
        status: createColumnTarget, assigneeId: newTaskAssignee || null, sprintId: newTaskSprint || null
      });
      if (res.data.success) {
        setNewTaskTitle(""); setNewTaskDesc(""); setNewTaskAssignee(""); setNewTaskSprint(""); setShowCreateModal(false);
      }
    } catch (err) { console.error(err); }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedTaskId) return;
    try {
      const res = await client.post(`/projects/${currentProject.id}/tasks/${selectedTaskId}/comments`, { content: newComment });
      if (res.data.success) setNewComment("");
    } catch (err) { console.error(err); }
  };

  const handleUpdateTaskField = async (field, value) => {
    if (!selectedTaskId) return;
    try { await client.patch(`/projects/${currentProject.id}/tasks/${selectedTaskId}`, { [field]: value === "" ? null : value }); }
    catch (err) { console.error(err); }
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="flex-1 p-8 flex items-center justify-center select-none">
          <div className="flex flex-col items-center gap-3">
            <div className="spinner-gradient" />
            <span className="text-xs font-medium dark:text-dp-text-muted text-dp-text-light-muted">Loading Kanban Board...</span>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="flex-1 flex flex-col h-full overflow-hidden select-none">
        
        {/* Board Subheader */}
        <div className="h-11 glass-sidebar border-b px-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold dark:text-dp-text-muted text-dp-text-light-muted uppercase tracking-wider">Sprint:</span>
            <select value={selectedSprintId} onChange={(e) => setSelectedSprintId(e.target.value)} className="glass-select">
              <option value="all">All Sprints & Backlog</option>
              <option value="backlog">Backlog Only</option>
              {sprints.map(sprint => (
                <option key={sprint.id} value={sprint.id}>{sprint.name} ({sprint.status.toLowerCase()})</option>
              ))}
            </select>
          </div>
          <button onClick={() => { setCreateColumnTarget("TODO"); setShowCreateModal(true); }} className="btn-primary flex items-center gap-1.5 py-1.5 text-[11px]">
            <Plus className="w-3.5 h-3.5" /> Add Task
          </button>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-3 items-start h-full">
              {COLUMNS.map((colName) => {
                const colTasks = tasks.filter((t) => t.status === colName);
                const config = COLUMN_CONFIG[colName];
                return (
                  <div key={colName} className="w-[272px] flex-shrink-0 rounded-xl flex flex-col max-h-full dark:bg-dp-dark-surface/40 bg-dp-light-bg-secondary/60 border dark:border-dp-dark-border-light/30 border-dp-light-border/60">
                    
                    {/* Column Header */}
                    <div className="p-3 flex items-center justify-between flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${config.dot}`} />
                        <span className={`status-badge ${config.badge}`}>{config.label}</span>
                        <span className="text-[10px] dark:text-dp-text-muted text-dp-text-light-muted font-bold font-mono">{colTasks.length}</span>
                      </div>
                      <button onClick={() => { setCreateColumnTarget(colName); setShowCreateModal(true); }}
                        className="w-6 h-6 rounded-md flex items-center justify-center dark:text-dp-text-muted text-dp-text-light-muted dark:hover:bg-dp-dark-surface-hover hover:bg-dp-light-surface-hover hover:text-dp-primary transition-colors">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Droppable Column */}
                    <Droppable droppableId={colName}>
                      {(provided, snapshot) => (
                        <div ref={provided.innerRef} {...provided.droppableProps}
                          className={`flex-1 overflow-y-auto px-2 pb-2 space-y-2 kanban-column-drop transition-colors duration-200 ${
                            snapshot.isDraggingOver ? "dark:bg-dp-primary/5 bg-dp-primary/5" : ""
                          }`}>
                          {colTasks.map((taskItem, index) => (
                            <Draggable key={taskItem.id} draggableId={taskItem.id} index={index}>
                              {(dp, ds) => (
                                <div ref={dp.innerRef} {...dp.draggableProps} {...dp.dragHandleProps}
                                  onClick={() => setSelectedTaskId(taskItem.id)}
                                  className={`p-3 rounded-lg cursor-grab active:cursor-grabbing transition-all duration-150 select-none flex flex-col gap-2 border glow-border ${
                                    ds.isDragging
                                      ? "dragging-card dark:bg-dp-dark-surface bg-white dark:border-dp-primary/40 border-dp-primary/30"
                                      : "dark:bg-dp-dark-surface/80 bg-white dark:border-dp-dark-border-light/30 border-dp-light-border/60 dark:hover:bg-dp-dark-surface hover:bg-dp-light-surface-hover"
                                  }`}>
                                  <h4 className="text-[12px] font-semibold dark:text-dp-text-primary text-dp-text-light-primary leading-normal line-clamp-2">
                                    {taskItem.title}
                                  </h4>
                                  <div className="flex items-center justify-between text-[9px] dark:text-dp-text-muted text-dp-text-light-muted">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold font-mono">TASK-{taskItem.taskNumber}</span>
                                      <span className={`status-badge text-[8px] ${PRIORITY_STYLES[taskItem.priority]}`}>
                                        {taskItem.priority[0]}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {taskItem._count?.comments > 0 && (
                                        <span className="flex items-center gap-0.5"><MessageSquare className="w-2.5 h-2.5" />{taskItem._count.comments}</span>
                                      )}
                                      {taskItem.assignee ? (
                                        <img src={taskItem.assignee.avatar} alt={taskItem.assignee.name}
                                          className="w-5 h-5 rounded-full border dark:border-dp-dark-border-light border-dp-light-border" title={`Assignee: ${taskItem.assignee.name}`} />
                                      ) : (
                                        <div className="w-5 h-5 rounded-full dark:bg-dp-dark-elevated bg-dp-light-bg-secondary dark:text-dp-text-muted text-dp-text-light-muted border border-dashed dark:border-dp-dark-border-light border-dp-light-border flex items-center justify-center" title="Unassigned">
                                          <User className="w-2.5 h-2.5" />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </DragDropContext>
        </div>

        {/* ══════ Task Details Drawer ══════ */}
        <AnimatePresence>
          {selectedTaskId && taskDetails && (
            <motion.div
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-y-0 right-0 w-[480px] max-w-full glass-sidebar border-l z-50 flex flex-col shadow-2xl"
            >
              {/* Drawer Header */}
              <div className="p-4 border-b dark:border-dp-dark-border-light/50 border-dp-light-border flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold dark:text-dp-text-muted text-dp-text-light-muted font-mono">TASK-{taskDetails.taskNumber}</span>
                  <span className={`status-badge ${COLUMN_CONFIG[taskDetails.status]?.badge}`}>{taskDetails.status.replace("_", " ")}</span>
                </div>
                <button onClick={() => setSelectedTaskId(null)} className="w-7 h-7 rounded-lg flex items-center justify-center dark:hover:bg-dp-dark-surface-hover hover:bg-dp-light-bg-secondary dark:text-dp-text-muted text-dp-text-light-muted transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Title & Description */}
                <div>
                  <h3 className="text-base font-display font-bold dark:text-dp-text-primary text-dp-text-light-primary leading-snug">{taskDetails.title}</h3>
                  <p className="text-xs dark:text-dp-text-muted text-dp-text-light-muted mt-2 dark:bg-dp-dark-surface/60 bg-dp-light-bg-secondary p-3 rounded-lg leading-relaxed border dark:border-dp-dark-border-light/30 border-dp-light-border/60">
                    {taskDetails.description || "No description provided."}
                  </p>
                </div>

                {/* Properties Grid */}
                <div className="grid grid-cols-2 gap-3 border-t border-b dark:border-dp-dark-border-light/30 border-dp-light-border/60 py-4 text-xs">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold dark:text-dp-text-muted text-dp-text-light-muted uppercase tracking-wider block">Priority</span>
                    <select value={taskDetails.priority} onChange={(e) => handleUpdateTaskField("priority", e.target.value)} className="glass-select w-full">
                      <option value="LOW">LOW</option><option value="MEDIUM">MEDIUM</option><option value="HIGH">HIGH</option><option value="CRITICAL">CRITICAL</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold dark:text-dp-text-muted text-dp-text-light-muted uppercase tracking-wider block">Status</span>
                    <select value={taskDetails.status} onChange={(e) => handleUpdateTaskField("status", e.target.value)} className="glass-select w-full">
                      {COLUMNS.map(col => (<option key={col} value={col}>{col.replace("_", " ")}</option>))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold dark:text-dp-text-muted text-dp-text-light-muted uppercase tracking-wider block">Assignee</span>
                    <select value={taskDetails.assigneeId || ""} onChange={(e) => handleUpdateTaskField("assigneeId", e.target.value)} className="glass-select w-full">
                      <option value="">Unassigned</option>
                      {members.map(member => (<option key={member.userId} value={member.userId}>{member.user.name}</option>))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold dark:text-dp-text-muted text-dp-text-light-muted uppercase tracking-wider block">Sprint</span>
                    <select value={taskDetails.sprintId || ""} onChange={(e) => handleUpdateTaskField("sprintId", e.target.value)} className="glass-select w-full">
                      <option value="">Backlog</option>
                      {sprints.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                    </select>
                  </div>
                </div>

                {/* Linked Commits */}
                {taskDetails.commits && taskDetails.commits.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold dark:text-dp-text-muted text-dp-text-light-muted uppercase tracking-wider block">Linked Commits</span>
                    {taskDetails.commits.map(commit => (
                      <div key={commit.id} className="p-2.5 border dark:border-dp-dark-border-light/30 border-dp-light-border/60 rounded-lg dark:bg-dp-dark-surface/40 bg-dp-light-bg-secondary text-[11px] font-mono">
                        <div className="flex justify-between font-bold dark:text-dp-text-secondary text-dp-text-light-secondary">
                          <span>sha: {commit.sha.slice(0, 7)}</span><span>{commit.authorName}</span>
                        </div>
                        <p className="dark:text-dp-text-muted text-dp-text-light-muted mt-1">{commit.message}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Comments */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold dark:text-dp-text-muted text-dp-text-light-muted uppercase tracking-wider block">Comments ({comments.length})</span>
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {comments.length === 0 ? (
                      <p className="text-xs dark:text-dp-text-muted text-dp-text-light-muted italic text-center py-4">No comments yet.</p>
                    ) : (
                      comments.map(comment => (
                        <div key={comment.id} className="flex gap-2 text-xs items-start p-2.5 rounded-lg dark:bg-dp-dark-surface/40 bg-dp-light-bg-secondary border dark:border-dp-dark-border-light/20 border-dp-light-border/40">
                          <img src={comment.user.avatar} alt="" className="w-6 h-6 rounded-full flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-bold dark:text-dp-text-primary text-dp-text-light-primary">{comment.user.name}</span>
                              <span className="text-[10px] dark:text-dp-text-muted text-dp-text-light-muted">{new Date(comment.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="dark:text-dp-text-secondary text-dp-text-light-secondary mt-1 leading-relaxed">{comment.content}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <form onSubmit={handleAddComment} className="flex gap-2">
                    <input type="text" placeholder="Post a comment..." value={newComment} onChange={(e) => setNewComment(e.target.value)} className="glass-input flex-1" />
                    <button type="submit" className="btn-primary p-2 flex-shrink-0"><Send className="w-3.5 h-3.5" /></button>
                  </form>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══════ Create Task Modal ══════ */}
        <AnimatePresence>
          {showCreateModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 modal-overlay flex items-center justify-center z-50"
              onClick={() => setShowCreateModal(false)}>
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="glass-card w-[480px] max-w-[95vw] p-6 relative z-10"
                onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-bold text-sm dark:text-dp-text-primary text-dp-text-light-primary flex items-center gap-2">
                    <Plus className="w-4 h-4 text-dp-primary" />
                    Create Task in "{COLUMN_CONFIG[createColumnTarget]?.label}"
                  </h3>
                  <button onClick={() => setShowCreateModal(false)} className="w-7 h-7 rounded-lg flex items-center justify-center dark:hover:bg-dp-dark-surface-hover hover:bg-dp-light-bg-secondary dark:text-dp-text-muted text-dp-text-light-muted transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <form onSubmit={handleCreateTask} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold dark:text-dp-text-muted text-dp-text-light-muted uppercase tracking-wider mb-1">Title</label>
                    <input type="text" placeholder="What needs to be done?" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} className="glass-input w-full" required autoFocus />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold dark:text-dp-text-muted text-dp-text-light-muted uppercase tracking-wider mb-1">Description</label>
                    <textarea rows="3" placeholder="Add details..." value={newTaskDesc} onChange={(e) => setNewTaskDesc(e.target.value)} className="glass-input w-full resize-none" />
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold dark:text-dp-text-muted text-dp-text-light-muted uppercase tracking-wider mb-1">Priority</label>
                      <select value={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.value)} className="glass-select w-full">
                        <option value="LOW">LOW</option><option value="MEDIUM">MEDIUM</option><option value="HIGH">HIGH</option><option value="CRITICAL">CRITICAL</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold dark:text-dp-text-muted text-dp-text-light-muted uppercase tracking-wider mb-1">Assignee</label>
                      <select value={newTaskAssignee} onChange={(e) => setNewTaskAssignee(e.target.value)} className="glass-select w-full">
                        <option value="">Unassigned</option>
                        {members.map(m => (<option key={m.userId} value={m.userId}>{m.user.name}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold dark:text-dp-text-muted text-dp-text-light-muted uppercase tracking-wider mb-1">Sprint</label>
                      <select value={newTaskSprint} onChange={(e) => setNewTaskSprint(e.target.value)} className="glass-select w-full">
                        <option value="">Backlog</option>
                        {sprints.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={() => { setShowCreateModal(false); setNewTaskTitle(""); setNewTaskDesc(""); setNewTaskAssignee(""); setNewTaskSprint(""); }} className="btn-ghost">Cancel</button>
                    <button type="submit" className="btn-primary">Add Task</button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}