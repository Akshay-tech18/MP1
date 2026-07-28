const express = require("express");
const { protect } = require("../../middleware/auth.middleware");
const { checkProjectRole } = require("../../middleware/rbac.middleware");
const { validateBody } = require("../../middleware/validate.middleware");
const {
  createProjectSchema,
  updateProjectSchema,
  addMemberSchema
} = require("./project.validator");
const {
  createProject,
  listProjects,
  getProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
  getProgress
} = require("./project.controller");

const router = express.Router();

router.use(protect);

router.post("/", validateBody(createProjectSchema), createProject);
router.get("/", listProjects);

// Project member access
router.get(
  "/:id",
  checkProjectRole("MANAGER", "DEVELOPER", "QA_TESTER", "VIEWER"),
  getProject
);

router.get(
  "/:id/progress",
  checkProjectRole("MANAGER", "DEVELOPER", "QA_TESTER", "VIEWER"),
  getProgress
);

// Project Manager access
router.patch(
  "/:id",
  checkProjectRole("MANAGER"),
  validateBody(updateProjectSchema),
  updateProject
);

router.delete(
  "/:id",
  deleteProject // Ownership verified inside controller
);

router.post(
  "/:id/members",
  checkProjectRole("MANAGER"),
  validateBody(addMemberSchema),
  addMember
);

router.delete(
  "/:id/members/:userId",
  checkProjectRole("MANAGER"),
  removeMember
);

module.exports = router;
