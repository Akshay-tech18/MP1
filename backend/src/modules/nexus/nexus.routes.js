const express = require("express");
const rateLimit = require("express-rate-limit");
const { protect } = require("../../middleware/auth.middleware");
const { checkProjectRole } = require("../../middleware/rbac.middleware");
const { chatWithNexus, approveAgentAction } = require("./nexus.controller");

const router = express.Router({ mergeParams: true });

// Prevent API spam burning Groq/HF limits (Max 100 chat requests per 5 minutes per user/IP)
const chatLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, 
  max: 100,
  message: { success: false, message: "Too many chat requests. Please take a breather and try again in 5 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(protect);

// Project members can chat with Nexus RAG assistant
router.post("/chat", chatLimiter, checkProjectRole("MANAGER", "DEVELOPER", "QA_TESTER", "VIEWER"), chatWithNexus);

// Only managers and developers can approve automated agent actions
router.post("/approve", checkProjectRole("MANAGER", "DEVELOPER"), approveAgentAction);

module.exports = router;
