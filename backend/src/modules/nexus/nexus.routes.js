const express = require("express");
const rateLimit = require("express-rate-limit");
const { protect } = require("../../middleware/auth.middleware");
const { chatWithNexus, approveAgentAction } = require("./nexus.controller");

const router = express.Router({ mergeParams: true });

// Prevent API spam burning Groq/HF limits (Max 20 chat requests per 5 minutes per user/IP)
const chatLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, 
  max: 20,
  message: { success: false, message: "Too many chat requests. Please take a breather and try again in 5 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(protect);

router.post("/chat", chatLimiter, chatWithNexus);
router.post("/approve", approveAgentAction);

module.exports = router;
