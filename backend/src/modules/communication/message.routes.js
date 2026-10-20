const express = require("express");
const { protect } = require("../../middleware/auth.middleware");
const { checkProjectRole } = require("../../middleware/rbac.middleware");
const {
  sendMessage,
  getMessages,
  getChannels,
  createChannel,
  deleteChannelMessages
} = require("./message.controller");

const { sendMessageSchema } = require("./message.validator");
const { validateBody } = require("../../middleware/validate.middleware");

// mergeParams is required to capture the projectId from parent route definition /api/projects/:id/messages
const router = express.Router({ mergeParams: true });

router.use(protect);

// Only project members can access communication channels
router.use(checkProjectRole("MANAGER", "DEVELOPER", "QA_TESTER", "VIEWER"));

// Channel management
router.get("/channels", getChannels);
router.post("/channels", checkProjectRole("MANAGER", "DEVELOPER"), createChannel);

// Messages
router.post("/", validateBody(sendMessageSchema), sendMessage);
router.get("/", getMessages);
router.delete("/channels/:channelId", checkProjectRole("MANAGER"), deleteChannelMessages);

module.exports = router;
