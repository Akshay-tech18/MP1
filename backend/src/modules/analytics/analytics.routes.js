const express = require("express");
const { protect } = require("../../middleware/auth.middleware");
const { checkProjectRole } = require("../../middleware/rbac.middleware");
const {
  getDashboardMetrics,
  getSprintReport,
  getBugRiskReport
} = require("./analytics.controller");

// mergeParams is required to capture the projectId from parent route definition /api/projects/:id/analytics
const router = express.Router({ mergeParams: true });

router.use(protect);

// Apply project membership check on all analytics endpoints
router.use(checkProjectRole("MANAGER", "DEVELOPER", "QA_TESTER", "VIEWER"));

router.get("/dashboard", getDashboardMetrics);
router.get("/sprints/:sprintId", getSprintReport);
router.get("/bug-risk", getBugRiskReport);

module.exports = router;
