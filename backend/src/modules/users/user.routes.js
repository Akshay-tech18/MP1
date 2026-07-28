const express = require("express");
const { protect, checkRole } = require("../../middleware/auth.middleware");
const { validateBody } = require("../../middleware/validate.middleware");
const { updateMeSchema, changeRoleSchema } = require("./user.validator");
const {
  updateMe,
  searchUsers,
  getMeStats,
  changeSystemRole
} = require("./user.controller");

const router = express.Router();

// Apply protect middleware to all routes in this module
router.use(protect);

router.patch("/me", validateBody(updateMeSchema), updateMe);
router.get("/search", searchUsers);
router.get("/me/stats", getMeStats);

// Admin-only role management
router.patch("/:id/role", checkRole("ADMIN"), validateBody(changeRoleSchema), changeSystemRole);

module.exports = router;
