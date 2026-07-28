export const SocketEvent = {
  JOIN_PROJECT: "join_project",
  LEAVE_PROJECT: "leave_project",

  PROJECT_UPDATED: "project:updated",
  MEMBER_ADDED: "project:member_added",
  MEMBER_REMOVED: "project:member_removed",

  SPRINT_CREATED: "sprint:created",
  SPRINT_UPDATED: "sprint:updated",
  SPRINT_COMPLETED: "sprint:completed",

  TASK_CREATED: "task:created",
  TASK_UPDATED: "task:updated",
  TASK_DELETED: "task:deleted",
  TASK_REORDERED: "task:reordered",
  TASK_COMMENT_ADDED: "task:comment_added",
  TASK_EDITING: "task:editing",
  TASK_EDITING_DONE: "task:editing_done",

  GITHUB_COMMIT: "github:commit",
  GITHUB_PULL_REQUEST: "github:pull_request",

  CHAT_MESSAGE: "chat:message",
  CHAT_TYPING: "chat:typing",

  ML_PREDICTION: "ml:prediction",
  ML_BATCH_PREDICTION: "ml:batch_prediction",

  USER_OFFLINE: "user:offline",
};

export const TaskPriority = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL"
};

export const TaskStatus = {
  TODO: "TODO",
  IN_PROGRESS: "IN_PROGRESS",
  IN_REVIEW: "IN_REVIEW",
  COMPLETED: "COMPLETED",
  BLOCKED: "BLOCKED"
};
