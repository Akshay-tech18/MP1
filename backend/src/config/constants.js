/**
 * System and Business Logic Constants
 */

module.exports = {
  // User Roles at System Level
  SystemRole: {
    ADMIN: "ADMIN",
    MANAGER: "MANAGER",
    DEVELOPER: "DEVELOPER",
    QA_TESTER: "QA_TESTER",
  },

  // Project Level Roles
  ProjectRole: {
    MANAGER: "MANAGER",
    DEVELOPER: "DEVELOPER",
    QA_TESTER: "QA_TESTER",
    VIEWER: "VIEWER",
  },

  // Project Lifecycles
  ProjectStatus: {
    PLANNING: "PLANNING",
    ACTIVE: "ACTIVE",
    ON_HOLD: "ON_HOLD",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED",
  },

  // Sprint Lifecycles
  SprintStatus: {
    PLANNED: "PLANNED",
    ACTIVE: "ACTIVE",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED",
  },

  // Task Priorities
  TaskPriority: {
    LOW: "LOW",
    MEDIUM: "MEDIUM",
    HIGH: "HIGH",
    CRITICAL: "CRITICAL",
  },

  // Task Priority Weights for Progress Calculation
  TaskPriorityWeight: {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 4,
  },

  // Task Lifecycles
  TaskStatus: {
    TODO: "TODO",
    IN_PROGRESS: "IN_PROGRESS",
    IN_REVIEW: "IN_REVIEW",
    COMPLETED: "COMPLETED",
    BLOCKED: "BLOCKED",
  },

  // PR States
  PullRequestState: {
    OPEN: "OPEN",
    CLOSED: "CLOSED",
    MERGED: "MERGED",
  },

  // Bug Risk Levels
  RiskLevel: {
    LOW: "LOW",
    MEDIUM: "MEDIUM",
    HIGH: "HIGH",
    CRITICAL: "CRITICAL",
  },

  // Activity Log Event Types
  ActivityType: {
    TASK_CREATED: "TASK_CREATED",
    TASK_STATUS_CHANGED: "TASK_STATUS_CHANGED",
    TASK_ASSIGNEE_CHANGED: "TASK_ASSIGNEE_CHANGED",
    COMMIT_LINKED: "COMMIT_LINKED",
    MEMBER_ADDED: "MEMBER_ADDED",
    MEMBER_REMOVED: "MEMBER_REMOVED",
    PROJECT_UPDATED: "PROJECT_UPDATED",
    SPRINT_CREATED: "SPRINT_CREATED",
    SPRINT_UPDATED: "SPRINT_UPDATED",
    SPRINT_COMPLETED: "SPRINT_COMPLETED",
  },

  // Socket.IO Event Catalogue
  SocketEvent: {
    // Rooms
    JOIN_PROJECT: "join_project",
    LEAVE_PROJECT: "leave_project",

    // Project Events
    PROJECT_UPDATED: "project:updated",
    MEMBER_ADDED: "project:member_added",
    MEMBER_REMOVED: "project:member_removed",

    // Sprint Events
    SPRINT_CREATED: "sprint:created",
    SPRINT_UPDATED: "sprint:updated",
    SPRINT_COMPLETED: "sprint:completed",

    // Task Events
    TASK_CREATED: "task:created",
    TASK_UPDATED: "task:updated",
    TASK_DELETED: "task:deleted",
    TASK_REORDERED: "task:reordered",
    TASK_COMMENT_ADDED: "task:comment_added",
    TASK_EDITING: "task:editing",
    TASK_EDITING_DONE: "task:editing_done",

    // GitHub Events
    GITHUB_COMMIT: "github:commit",
    GITHUB_PULL_REQUEST: "github:pull_request",

    // Chat Events
    CHAT_MESSAGE: "chat:message",
    CHAT_TYPING: "chat:typing",

    // ML Predictions
    ML_PREDICTION: "ml:prediction",
    ML_BATCH_PREDICTION: "ml:batch_prediction",

    // User Presence
    USER_OFFLINE: "user:offline",
  }
};
