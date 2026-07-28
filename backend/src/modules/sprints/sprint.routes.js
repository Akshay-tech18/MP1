const express = require("express");
const { protect } = require("../../middleware/auth.middleware");
const { checkProjectRole } = require("../../middleware/rbac.middleware");
const { validateBody } = require("../../middleware/validate.middleware");
const {
  createSprintSchema,
  updateSprintSchema,
  moveTasksSchema
} = require("./sprint.validator");
const {
  createSprint,
  listSprints,
  getSprint,
  updateSprint,
  completeSprint,
  moveTasksToSprint,
  deleteSprint
} = require("./sprint.controller");

// mergeParams is required to capture the projectId from parent route definition /api/projects/:id/sprints
const router = express.Router({ mergeParams: true });

router.use(protect);

router.post(
  "/",
  checkProjectRole("MANAGER"),
  validateBody(createSprintSchema),
  createSprint
);

router.get(
  "/",
  checkProjectRole("MANAGER", "DEVELOPER", "QA_TESTER", "VIEWER"),
  listSprints
);

router.get(
  "/:sprintId",
  checkProjectRole("MANAGER", "DEVELOPER", "QA_TESTER", "VIEWER"),
  getSprint
);

router.patch(
  "/:sprintId",
  checkProjectRole("MANAGER"),
  validateBody(updateSprintSchema),
  updateSprint
);

router.post(
  "/:sprintId/complete",
  checkProjectRole("MANAGER"),
  completeSprint
);

router.post(
  "/:sprintId/tasks",
  checkProjectRole("MANAGER"),
  validateBody(moveTasksSchema),
  moveTasksToSprint
);

router.delete(
  "/:sprintId",
  checkProjectRole("MANAGER"),
  deleteSprint
);

module.exports = router;
