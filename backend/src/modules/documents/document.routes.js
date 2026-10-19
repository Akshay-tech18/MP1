const express = require("express");
const { protect } = require("../../middleware/auth.middleware");
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

router.post("/", createDocument);
router.post("/upload-pdf", uploadPdfDocument);
router.post("/bulk-delete", deleteDocuments); // Using POST for bulk delete payload
router.get("/", getDocuments);
router.get("/:id", getDocumentById);
router.patch("/:id", updateDocument);

module.exports = router;
