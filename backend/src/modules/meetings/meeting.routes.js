const express = require("express");
const { protect } = require("../../middleware/auth.middleware");
const { checkProjectRole } = require("../../middleware/rbac.middleware");
const { validateBody } = require("../../middleware/validate.middleware");
const {
  createMeetingSchema,
  updateMeetingSchema,
} = require("./meeting.validator");
const {
  scheduleMeeting,
  listMeetings,
  getMeeting,
  updateMeeting,
  deleteMeeting,
} = require("./meeting.controller");

// mergeParams is required to capture the projectId from parent route definition /api/projects/:id/meetings
const router = express.Router({ mergeParams: true });

router.use(protect);

router.post(
  "/",
  checkProjectRole("MANAGER", "DEVELOPER", "QA_TESTER"),
  validateBody(createMeetingSchema),
  scheduleMeeting
);

router.get(
  "/",
  checkProjectRole("MANAGER", "DEVELOPER", "QA_TESTER", "VIEWER"),
  listMeetings
);

router.get(
  "/:meetingId",
  checkProjectRole("MANAGER", "DEVELOPER", "QA_TESTER", "VIEWER"),
  getMeeting
);

router.patch(
  "/:meetingId",
  checkProjectRole("MANAGER", "DEVELOPER", "QA_TESTER"),
  validateBody(updateMeetingSchema),
  updateMeeting
);

router.delete(
  "/:meetingId",
  checkProjectRole("MANAGER", "DEVELOPER", "QA_TESTER"),
  deleteMeeting
);

module.exports = router;
