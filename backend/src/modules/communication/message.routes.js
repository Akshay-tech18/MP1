const express = require("express");
const { protect } = require("../../middleware/auth.middleware");
const { checkProjectRole } = require("../../middleware/rbac.middleware");
const { sendMessage, getMessages } = require("./message.controller");

// mergeParams is required to capture the projectId from parent route definition /api/projects/:id/messages
const router = express.Router({ mergeParams: true });

router.use(protect);

// Only project members can access communication channels
router.use(checkProjectRole("MANAGER", "DEVELOPER", "QA_TESTER", "VIEWER"));

router.post("/", sendMessage);
router.get("/", getMessages);

module.exports = router;
