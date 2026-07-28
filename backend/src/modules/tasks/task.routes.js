const express = require("express");
const { protect } = require("../../middleware/auth.middleware");
const { checkProjectRole } = require("../../middleware/rbac.middleware");
const { validateBody } = require("../../middleware/validate.middleware");
const {
  createTaskSchema,
  updateTaskSchema,
  reorderTasksSchema,
  createCommentSchema
} = require("./task.validator");
const {
  createTask,
  listTasks,
  getTask,
  updateTask,
  deleteTask,
  reorderTasks,
  addComment,
  listComments
} = require("./task.controller");

// mergeParams is required to capture project ID from prefix route /api/projects/:id/tasks
const router = express.Router({ mergeParams: true });

router.use(protect);

router.post(
  "/",
  checkProjectRole("MANAGER", "DEVELOPER"),
  validateBody(createTaskSchema),
  createTask
);

router.get(
  "/",
  checkProjectRole("MANAGER", "DEVELOPER", "QA_TESTER", "VIEWER"),
  listTasks
);

// Declare /reorder route BEFORE /:taskId parameter route to prevent routing collisions
router.patch(
  "/reorder",
  checkProjectRole("MANAGER", "DEVELOPER", "QA_TESTER"),
  validateBody(reorderTasksSchema),
  reorderTasks
);

router.get(
  "/:taskId",
  checkProjectRole("MANAGER", "DEVELOPER", "QA_TESTER", "VIEWER"),
  getTask
);

router.patch(
  "/:taskId",
  checkProjectRole("MANAGER", "DEVELOPER", "QA_TESTER"),
  validateBody(updateTaskSchema),
  updateTask
);

router.delete(
  "/:taskId",
  checkProjectRole("MANAGER"),
  deleteTask
);

// Task Comments routes
router.post(
  "/:taskId/comments",
  checkProjectRole("MANAGER", "DEVELOPER", "QA_TESTER", "VIEWER"),
  validateBody(createCommentSchema),
  addComment
);

router.get(
  "/:taskId/comments",
  checkProjectRole("MANAGER", "DEVELOPER", "QA_TESTER", "VIEWER"),
  listComments
);

module.exports = router;
