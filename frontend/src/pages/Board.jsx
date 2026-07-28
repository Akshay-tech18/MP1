import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import useAuthStore from "../store/useAuthStore";
import useSocketStore from "../store/useSocketStore";
import client from "../api/client";
import {
  Plus,
  MessageSquare,
  Paperclip,
  CheckSquare,
  AlertTriangle,
  User,
  Calendar,
  X,
  Send,
  MoreHorizontal,
  Info
} from "lucide-react";
import { TaskStatus, TaskPriority, SocketEvent } from "../config/constants";

const COLUMNS = ["TODO", "IN_PROGRESS", "IN_REVIEW", "COMPLETED", "BLOCKED"];

const COLUMN_COLORS = {
  TODO: "bg-slate-200 text-slate-700 border-slate-350",
  IN_PROGRESS: "bg-blue-50 text-blue-600 border-blue-100",
  IN_REVIEW: "bg-purple-50 text-purple-600 border-purple-100",
  COMPLETED: "bg-emerald-50 text-emerald-600 border-emerald-100",
  BLOCKED: "bg-red-50 text-red-600 border-red-100"
};

export default function Board() {
  const { user, currentProject } = useAuthStore();
  const { socket } = useSocketStore();
  
  const [tasks, setTasks] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedSprintId, setSelectedSprintId] = useState("all");
  
  // Modals / Details states
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [taskDetails, setTaskDetails] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  
  // Create Task states
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
        // Fetch project metadata (to get members)
        const projRes = await client.get(`/projects/${currentProject.id}`);
        if (projRes.data.success) {
          setMembers(projRes.data.data.project.members);
        }

        // Fetch sprints
        const sprintsRes = await client.get(`/projects/${currentProject.id}/sprints`);
        if (sprintsRes.data.success) {
          setSprints(sprintsRes.data.data.sprints);
        }

        // Fetch tasks
        await fetchTasks();
      } catch (err) {
        console.error("Error loading board:", err);
      } finally {
        setLoading(false);
      }
    }

    loadBoard();
  }, [currentProject]);

  // Fetch tasks filtered by active sprint
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
    if (currentProject) {
      fetchTasks();
    }
  }, [selectedSprintId]);

  // 2. Setup Socket event listeners for real-time Kanban sync
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

      // If active detailed task is updated, reload details
      if (selectedTaskId === updatedTask.id) {
        loadTaskDetails(updatedTask.id);
      }
    });

    socket.on(SocketEvent.TASK_DELETED, (data) => {
      setTasks((prev) => prev.filter((t) => t.id !== data.id));
      if (selectedTaskId === data.id) {
        setSelectedTaskId(null);
        setTaskDetails(null);
      }
    });

    socket.on(SocketEvent.TASK_REORDERED, () => {
      // Re-query tasks to capture updated sequence from server
      fetchTasks();
    });

    socket.on(SocketEvent.TASK_COMMENT_ADDED, (data) => {
      if (selectedTaskId === data.taskId) {
        setComments((prev) => [...prev, data.comment]);
      }
    });

    return () => {
      socket.off(SocketEvent.TASK_CREATED);
      socket.off(SocketEvent.TASK_UPDATED);
      socket.off(SocketEvent.TASK_DELETED);
      socket.off(SocketEvent.TASK_REORDERED);
      socket.off(SocketEvent.TASK_COMMENT_ADDED);
    };
  }, [socket, currentProject, selectedTaskId, selectedSprintId]);

  // Load selected task details and comments thread
  const loadTaskDetails = async (taskId) => {
    try {
      const res = await client.get(`/projects/${currentProject.id}/tasks/${taskId}`);
      if (res.data.success) {
        setTaskDetails(res.data.data.task);
        setComments(res.data.data.task.comments);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (selectedTaskId) {
      loadTaskDetails(selectedTaskId);
      
      // Emit editing lock trigger
      if (socket && currentProject) {
        socket.emit(SocketEvent.TASK_EDITING, { projectId: currentProject.id, taskId: selectedTaskId });
      }
    } else {
      // Release editing lock
      if (socket && currentProject && selectedTaskId) {
        socket.emit(SocketEvent.TASK_EDITING_DONE, { projectId: currentProject.id, taskId: selectedTaskId });
      }
      setTaskDetails(null);
      setComments([]);
    }
  }, [selectedTaskId]);

  // 3. Kanban Drag-and-Drop calculation
  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const sourceCol = source.droppableId;
    const destCol = destination.droppableId;
    
    // Get list of tasks currently in the target column
    const destTasks = tasks.filter(t => t.status === destCol).sort((a, b) => a.orderIndex - b.orderIndex);

    let newOrderIndex = 1000.0;

    if (destTasks.length === 0) {
      newOrderIndex = 1000.0;
    } else if (destination.index === 0) {
      // Dropped at top of column
      newOrderIndex = destTasks[0].orderIndex / 2;
    } else if (destination.index >= destTasks.length) {
      // Dropped at bottom of column
      newOrderIndex = destTasks[destTasks.length - 1].orderIndex + 1000.0;
    } else {
      // Dropped in between two tasks
      const prevTask = destTasks[destination.index - 1];
      const nextTask = destTasks[destination.index];
      newOrderIndex = (prevTask.orderIndex + nextTask.orderIndex) / 2;
    }

    // Optimistic Local State Update
    const originalTasks = [...tasks];
    const updatedTasks = tasks.map(t => {
      if (t.id === draggableId) {
        return { ...t, status: destCol, orderIndex: newOrderIndex };
      }
      return t;
    }).sort((a, b) => a.orderIndex - b.orderIndex);
    
    setTasks(updatedTasks);

    // Call REST endpoint to save
    try {
      const res = await client.patch(`/projects/${currentProject.id}/tasks/reorder`, {
        updates: [
          {
            id: draggableId,
            orderIndex: newOrderIndex,
            status: destCol
          }
        ]
      });

      if (!res.data.success) {
        throw new Error();
      }
    } catch (e) {
      // Revert state if reorder fails
      setTasks(originalTasks);
    }
  };

  // Create task trigger
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const res = await client.post(`/projects/${currentProject.id}/tasks`, {
        title: newTaskTitle,
        description: newTaskDesc,
        priority: newTaskPriority,
        status: createColumnTarget,
        assigneeId: newTaskAssignee || null,
        sprintId: newTaskSprint || null
      });

      if (res.data.success) {
        setNewTaskTitle("");
        setNewTaskDesc("");
        setNewTaskAssignee("");
        setNewTaskSprint("");
        setShowCreateModal(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit comment trigger
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedTaskId) return;

    try {
      const res = await client.post(`/projects/${currentProject.id}/tasks/${selectedTaskId}/comments`, {
        content: newComment
      });
      if (res.data.success) {
        setNewComment("");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update task property directly from drawer dropdowns
  const handleUpdateTaskField = async (field, value) => {
    if (!selectedTaskId) return;
    try {
      await client.patch(`/projects/${currentProject.id}/tasks/${selectedTaskId}`, {
        [field]: value === "" ? null : value
      });
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 bg-clickup-light p-8 flex items-center justify-center select-none">
        <div className="flex flex-col items-center gap-2 font-medium text-slate-500 text-sm">
          <div className="w-8 h-8 border-4 border-clickup-primary border-t-transparent rounded-full animate-spin"></div>
          Loading Kanban Board...
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-clickup-light flex flex-col h-screen overflow-hidden select-none">
      
      {/* Board Subheader: Sprint Filters */}
      <div className="h-14 bg-white border-b border-clickup-light-border px-6 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sprint Scope:</span>
          
          <select
            value={selectedSprintId}
            onChange={(e) => setSelectedSprintId(e.target.value)}
            className="px-3 py-1 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded text-xs font-medium text-slate-700 outline-none transition cursor-pointer"
          >
            <option value="all">All Sprints & Backlog</option>
            <option value="backlog">Project Backlog Only</option>
            {sprints.map(sprint => (
              <option key={sprint.id} value={sprint.id}>{sprint.name} ({sprint.status.toLowerCase()})</option>
            ))}
          </select>
        </div>
        
        <button
          onClick={() => {
            setCreateColumnTarget("TODO");
            setShowCreateModal(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-clickup-primary hover:bg-clickup-primary/95 rounded transition"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Task
        </button>
      </div>

      {/* Main DragDrop Context Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 items-start h-full">
            {COLUMNS.map((colName) => {
              const colTasks = tasks.filter((t) => t.status === colName);
              return (
                <div key={colName} className="w-72 bg-slate-100 rounded-lg border border-slate-250 flex flex-col max-h-full">
                  
                  {/* Column Header */}
                  <div className="p-3 border-b border-slate-250 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${COLUMN_COLORS[colName]}`}>
                        {colName.replace("_", " ")}
                      </span>
                      <span className="text-xs text-slate-400 font-bold font-mono">{colTasks.length}</span>
                    </div>
                    
                    <button
                      onClick={() => {
                        setCreateColumnTarget(colName);
                        setShowCreateModal(true);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Tasks Cards Droppable List */}
                  <Droppable droppableId={colName}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 overflow-y-auto p-2 space-y-2 kanban-column-drop ${
                          snapshot.isDraggingOver ? "bg-slate-200/50" : ""
                        }`}
                      >
                        {colTasks.map((taskItem, index) => (
                          <Draggable key={taskItem.id} draggableId={taskItem.id} index={index}>
                            {(draggableProvided, draggableSnapshot) => (
                              <div
                                ref={draggableProvided.innerRef}
                                {...draggableProvided.draggableProps}
                                {...draggableProvided.dragHandleProps}
                                onClick={() => setSelectedTaskId(taskItem.id)}
                                className={`p-3 bg-white border rounded shadow-xs cursor-grab active:cursor-grabbing hover:border-clickup-primary/45 transition select-none flex flex-col gap-3 ${
                                  draggableSnapshot.isDragging ? "shadow-lg rotate-1 border-clickup-primary/80" : "border-clickup-light-border"
                                }`}
                              >
                                {/* Card Title */}
                                <h4 className="text-xs font-semibold text-slate-800 leading-normal line-clamp-2">
                                  {taskItem.title}
                                </h4>

                                {/* Card Metadata Footer */}
                                <div className="flex items-center justify-between mt-1 text-[9px] text-slate-400">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-400 font-mono">TASK-{taskItem.taskNumber}</span>
                                    <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded border ${
                                      taskItem.priority === "CRITICAL" ? "bg-red-50 text-red-500 border-red-100" :
                                      taskItem.priority === "HIGH" ? "bg-amber-50 text-amber-600 border-amber-100" :
                                      taskItem.priority === "MEDIUM" ? "bg-blue-50 text-blue-500 border-blue-100" :
                                      "bg-slate-50 text-slate-500 border-slate-200"
                                    }`}>
                                      {taskItem.priority[0]}
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    {taskItem._count?.comments > 0 && (
                                      <span className="flex items-center gap-0.5">
                                        <MessageSquare className="w-2.5 h-2.5" />
                                        {taskItem._count.comments}
                                      </span>
                                    )}
                                    
                                    {taskItem.assignee ? (
                                      <img
                                        src={taskItem.assignee.avatar}
                                        alt={taskItem.assignee.name}
                                        className="w-5 h-5 rounded-full border border-slate-100 bg-slate-50"
                                        title={`Assignee: ${taskItem.assignee.name}`}
                                      />
                                    ) : (
                                      <div className="w-5 h-5 rounded-full bg-slate-50 text-slate-400 border border-dashed border-slate-300 flex items-center justify-center" title="Unassigned">
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

      {/* 4. Task Details Drawer (Opens from right side) */}
      {selectedTaskId && taskDetails && (
        <div className="fixed inset-y-0 right-0 w-xl bg-white shadow-2xl border-l border-clickup-light-border z-50 flex flex-col animate-in slide-in-from-right duration-250">
          
          {/* Drawer Header */}
          <div className="p-4 border-b border-clickup-light-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 font-mono">TASK-{taskDetails.taskNumber}</span>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${COLUMN_COLORS[taskDetails.status]}`}>
                {taskDetails.status.replace("_", " ")}
              </span>
            </div>
            <button
              onClick={() => setSelectedTaskId(null)}
              className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Body Scroll */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Title & Description */}
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-snug">{taskDetails.title}</h3>
              <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-3 rounded leading-relaxed border border-slate-100">
                {taskDetails.description || "No description provided."}
              </p>
            </div>

            {/* Task Meta Properties Grid */}
            <div className="grid grid-cols-2 gap-4 border-t border-b border-clickup-light-border py-4 text-xs">
              
              {/* Priority */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Priority</span>
                <select
                  value={taskDetails.priority}
                  onChange={(e) => handleUpdateTaskField("priority", e.target.value)}
                  className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-xs font-medium text-slate-800 outline-none transition cursor-pointer"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Status</span>
                <select
                  value={taskDetails.status}
                  onChange={(e) => handleUpdateTaskField("status", e.target.value)}
                  className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-xs font-medium text-slate-800 outline-none transition cursor-pointer"
                >
                  {COLUMNS.map(col => (
                    <option key={col} value={col}>{col.replace("_", " ")}</option>
                  ))}
                </select>
              </div>

              {/* Assignee */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assignee</span>
                <select
                  value={taskDetails.assigneeId || ""}
                  onChange={(e) => handleUpdateTaskField("assigneeId", e.target.value)}
                  className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-xs font-medium text-slate-800 outline-none transition cursor-pointer w-full"
                >
                  <option value="">Unassigned</option>
                  {members.map(member => (
                    <option key={member.userId} value={member.userId}>{member.user.name}</option>
                  ))}
                </select>
              </div>

              {/* Sprint */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sprint Scope</span>
                <select
                  value={taskDetails.sprintId || ""}
                  onChange={(e) => handleUpdateTaskField("sprintId", e.target.value)}
                  className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-xs font-medium text-slate-800 outline-none transition cursor-pointer w-full"
                >
                  <option value="">Project Backlog</option>
                  {sprints.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

            </div>

            {/* Commits linked feed (Agile Sync logs) */}
            {taskDetails.commits && taskDetails.commits.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Linked Git Development (commits)</span>
                <div className="space-y-2">
                  {taskDetails.commits.map(commit => (
                    <div key={commit.id} className="p-2 border border-slate-200 rounded bg-slate-50 text-[11px] font-medium leading-relaxed font-mono">
                      <div className="flex justify-between font-bold text-slate-700">
                        <span>sha: {commit.sha.slice(0, 7)}</span>
                        <span>{commit.authorName}</span>
                      </div>
                      <p className="text-slate-500 mt-1">{commit.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comments Thread Section */}
            <div className="space-y-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Comments Thread</span>
              
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {comments.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">No comments posted yet.</p>
                ) : (
                  comments.map(comment => (
                    <div key={comment.id} className="flex gap-2.5 text-xs items-start p-2 rounded bg-slate-50/50 border border-slate-100">
                      <img
                        src={comment.user.avatar}
                        alt=""
                        className="w-6 h-6 rounded-full bg-slate-100 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{comment.user.name}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{new Date(comment.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-slate-700 mt-1 leading-relaxed">{comment.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Submit Comment form */}
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Post a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-slate-350 rounded text-xs focus:outline-none focus:border-clickup-primary focus:ring-1 focus:ring-clickup-primary"
                />
                <button
                  type="submit"
                  className="p-2 bg-slate-800 text-white hover:bg-slate-950 rounded transition flex-shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

          </div>
        </div>
      )}

      {/* 5. Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 text-slate-850">
          <div className="bg-white rounded-lg shadow-2xl w-lg p-6 animate-in fade-in zoom-in-95 duration-100">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-clickup-primary" />
              Create Task in "{createColumnTarget.replace("_", " ")}"
            </h3>
            
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  placeholder="What needs to be done?"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-350 rounded text-xs focus:outline-none focus:border-clickup-primary focus:ring-1 focus:ring-clickup-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows="3"
                  placeholder="Add details, notes, or instructions."
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-350 rounded text-xs focus:outline-none focus:border-clickup-primary focus:ring-1 focus:ring-clickup-primary"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                
                {/* Priority */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Priority
                  </label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-xs font-semibold text-slate-700 outline-none transition cursor-pointer"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>

                {/* Assignee */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Assignee
                  </label>
                  <select
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-xs font-semibold text-slate-700 outline-none transition cursor-pointer"
                  >
                    <option value="">Unassigned</option>
                    {members.map(m => (
                      <option key={m.userId} value={m.userId}>{m.user.name}</option>
                    ))}
                  </select>
                </div>

                {/* Sprint */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Sprint
                  </label>
                  <select
                    value={newTaskSprint}
                    onChange={(e) => setNewTaskSprint(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-xs font-semibold text-slate-700 outline-none transition cursor-pointer"
                  >
                    <option value="">Backlog (No Sprint)</option>
                    {sprints.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewTaskTitle("");
                    setNewTaskDesc("");
                    setNewTaskAssignee("");
                    setNewTaskSprint("");
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-clickup-primary hover:bg-clickup-primary/95 rounded transition"
                >
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
