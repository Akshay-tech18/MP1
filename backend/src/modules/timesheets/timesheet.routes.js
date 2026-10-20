const express = require("express");
const { protect } = require("../../middleware/auth.middleware");
const { checkProjectRole } = require("../../middleware/rbac.middleware");
const { getTimesheets, logHours } = require("./timesheet.controller");

const router = express.Router({ mergeParams: true });

router.use(protect);
router.use(checkProjectRole("MANAGER", "DEVELOPER", "QA_TESTER", "VIEWER"));

// GET /api/projects/:id/timesheets
router.get("/", getTimesheets);

// POST /api/projects/:id/timesheets
router.post("/", checkProjectRole("MANAGER", "DEVELOPER", "QA_TESTER"), logHours);

module.exports = router;
