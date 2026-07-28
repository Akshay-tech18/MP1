const express = require("express");
const { protect } = require("../../middleware/auth.middleware");
const { checkProjectRole } = require("../../middleware/rbac.middleware");
const { scanRepository, checkMLHealth } = require("./ml.controller");

// mergeParams is required to capture project ID from parent route definition /api/projects/:id/ml
const router = express.Router({ mergeParams: true });

router.use(protect);

router.post(
  "/scan/:repoId",
  checkProjectRole("MANAGER"),
  scanRepository
);

router.get(
  "/health",
  checkProjectRole("MANAGER", "DEVELOPER", "QA_TESTER", "VIEWER"),
  checkMLHealth
);

module.exports = router;
