const express = require("express");
const { protect } = require("../../middleware/auth.middleware");
const { checkProjectRole } = require("../../middleware/rbac.middleware");
const {
  createDocument,
  getDocuments,
  getDocumentById,
  updateDocument,
  deleteDocuments,
  uploadPdfDocument
} = require("./document.controller");

const router = express.Router({ mergeParams: true });

router.use(protect);

// Read access: any confirmed project member
router.get("/", checkProjectRole("MANAGER", "DEVELOPER", "QA_TESTER", "VIEWER"), getDocuments);
router.get("/:id", checkProjectRole("MANAGER", "DEVELOPER", "QA_TESTER", "VIEWER"), getDocumentById);

// Create and Edit: managers and developers
router.post("/", checkProjectRole("MANAGER", "DEVELOPER"), createDocument);
router.post("/upload-pdf", checkProjectRole("MANAGER", "DEVELOPER"), uploadPdfDocument);
router.patch("/:id", checkProjectRole("MANAGER", "DEVELOPER"), updateDocument);

// Bulk Delete: managers only
router.post("/bulk-delete", checkProjectRole("MANAGER"), deleteDocuments);

module.exports = router;
