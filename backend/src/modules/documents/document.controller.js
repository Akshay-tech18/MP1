const prisma = require("../../config/db");
const { sendSuccess, sendError } = require("../../utils/response.utils");
const logger = require("../../utils/logger");
const { processDocumentChunks } = require("../../services/embedding.service");
const { PDFParse } = require("pdf-parse");

// Helper to calculate read time in minutes
const calculateReadTime = (content) => {
  if (!content) return 0;
  const wordCount = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / 200));
};

const createDocument = async (req, res) => {
  const projectId = req.params.projectId || req.params.id;
  const { title, content, tags, parentId } = req.body;
  const authorId = req.user.id;

  if (!title || !content) {
    return sendError(res, 400, "Title and content are required");
  }

  try {
    const readTime = calculateReadTime(content);

    const doc = await prisma.document.create({
      data: {
        title,
        content,
        readTime,
        tags: tags || [],
        authorId,
        projectId,
        parentId: parentId || null
      }
    });

    // Fire and forget chunking background process
    processDocumentChunks(doc.id, doc.content).catch(err => {
      logger.error("Background vectorization failed: %o", err);
    });

    return sendSuccess(res, 201, "Document created", { document: doc });
  } catch (err) {
    logger.error("Create Document error: %o", err);
    return sendError(res, 500, "Failed to create document");
  }
};

const getDocuments = async (req, res) => {
  const projectId = req.params.projectId || req.params.id;
  const { search, tags, scope, sortBy = "updatedAt", order = "desc" } = req.query;

  try {
    const where = { projectId };

    // Scope filter: 'my' (authored by current user) vs 'workspace' (all docs in project)
    if (scope === "my") {
      where.authorId = req.user.id;
    }
    // When scope is 'workspace' or omitted, all documents in the project are returned

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { author: { name: { contains: search, mode: "insensitive" } } }
      ];
    }

    if (tags) {
      const tagArray = tags.split(",").map((t) => t.trim());
      if (tagArray.length > 0) {
        where.tags = { hasSome: tagArray };
      }
    }

    const documents = await prisma.document.findMany({
      where,
      select: {
        id: true,
        title: true,
        readTime: true,
        tags: true,
        authorId: true,
        projectId: true,
        parentId: true,
        createdAt: true,
        updatedAt: true,
        author: { select: { name: true, avatar: true } },
        parent: { select: { title: true } }
      },
      orderBy: { [sortBy]: order === "asc" ? "asc" : "desc" }
    });

    return sendSuccess(res, 200, "Documents retrieved", { documents });
  } catch (err) {
    logger.error("Get Documents error: %o", err);
    return sendError(res, 500, "Failed to retrieve documents");
  }
};

const getDocumentById = async (req, res) => {
  const { id } = req.params;
  const projectId = req.params.projectId || req.params.id;

  try {
    const doc = await prisma.document.findFirst({
      where: { id, projectId },
      include: {
        author: { select: { name: true, avatar: true } },
        parent: { select: { title: true, id: true } },
        children: { select: { id: true, title: true } }
      }
    });

    if (!doc) return sendError(res, 404, "Document not found in this workspace");

    return sendSuccess(res, 200, "Document retrieved", { document: doc });
  } catch (err) {
    logger.error("Get Document error: %o", err);
    return sendError(res, 500, "Failed to retrieve document");
  }
};

const updateDocument = async (req, res) => {
  const { id } = req.params;
  const projectId = req.params.projectId || req.params.id;
  const { title, content, tags, parentId } = req.body;

  try {
    const existing = await prisma.document.findFirst({
      where: { id, projectId }
    });

    if (!existing) {
      return sendError(res, 404, "Document not found in this workspace");
    }

    const data = {};
    if (title) data.title = title;
    if (tags) data.tags = tags;
    
    if (content !== undefined) {
      data.content = content;
      data.readTime = calculateReadTime(content);
    }

    if (parentId !== undefined) {
      if (parentId === id) {
        return sendError(res, 400, "Document cannot be its own parent");
      }
      // Validate parent belongs to the same workspace
      if (parentId) {
        const parentDoc = await prisma.document.findFirst({
          where: { id: parentId, projectId }
        });
        if (!parentDoc) {
          return sendError(res, 400, "Parent document not found in this workspace");
        }

        // Circular check - block if setting parent to an existing child
        const checkChild = await prisma.document.findFirst({
          where: { id: parentId, parentId: id }
        });
        if (checkChild) {
          return sendError(res, 400, "Circular dependency detected: Parent is already a child");
        }
      }
      data.parentId = parentId;
    }

    const updatedDoc = await prisma.document.update({
      where: { id },
      data
    });

    // If content changed, re-run vectorization
    if (content !== undefined) {
      processDocumentChunks(updatedDoc.id, updatedDoc.content).catch(err => {
        logger.error("Background vectorization failed: %o", err);
      });
    }

    return sendSuccess(res, 200, "Document updated", { document: updatedDoc });
  } catch (err) {
    logger.error("Update Document error: %o", err);
    return sendError(res, 500, "Failed to update document");
  }
};

const deleteDocuments = async (req, res) => {
  const projectId = req.params.projectId || req.params.id;
  const { documentIds } = req.body; // Array of IDs

  if (!documentIds || !Array.isArray(documentIds)) {
    return sendError(res, 400, "documentIds array is required");
  }

  try {
    await prisma.document.deleteMany({
      where: { 
        id: { in: documentIds },
        projectId 
      }
    });

    return sendSuccess(res, 200, "Documents deleted successfully");
  } catch (err) {
    logger.error("Delete Documents error: %o", err);
    return sendError(res, 500, "Failed to delete documents");
  }
};

/**
 * Upload and extract text from a PDF, store as document, and index for RAG
 */
const uploadPdfDocument = async (req, res) => {
  const projectId = req.params.projectId || req.params.id;
  const { title, fileData, fileBase64, tags } = req.body;
  const authorId = req.user.id;
  const rawFile = fileData || fileBase64;

  if (!rawFile) {
    return sendError(res, 400, "PDF file data is required (base64)");
  }

  try {
    // 1. Convert base64 data to Buffer
    let base64Content = rawFile;
    if (rawFile.includes(",")) {
      base64Content = rawFile.split(",")[1];
    }
    const pdfBuffer = Buffer.from(base64Content, "base64");

    if (pdfBuffer.length === 0) {
      return sendError(res, 400, "Invalid or empty PDF file");
    }

    if (pdfBuffer.length > 25 * 1024 * 1024) {
      return sendError(res, 400, "PDF file exceeds the maximum allowed limit of 25MB.");
    }

    // 2. Extract text from PDF using pdf-parse v2 API
    let extractedText = "";
    let numPages = 1;
    let extractedTitle = null;
    let parser = null;
    try {
      parser = new PDFParse({ data: pdfBuffer });
      const parsedData = await parser.getText();
      extractedText = (parsedData?.text || "").trim();
      numPages = parsedData?.total || (Array.isArray(parsedData?.pages) ? parsedData.pages.length : 1);

      try {
        const infoData = await parser.getInfo();
        extractedTitle = infoData?.info?.Title || null;
      } catch (_) {
        // info extraction is optional
      }
    } catch (parseErr) {
      logger.error("PDF parsing error: %o", parseErr);
      return sendError(res, 400, "Failed to parse PDF document. It may be password-protected or corrupted.");
    } finally {
      if (parser) {
        try { await parser.destroy(); } catch (_) {}
      }
    }

    if (!extractedText) {
      return sendError(res, 400, "No readable text could be extracted from this PDF. Please ensure the PDF contains selectable text (not scanned images).");
    }

    // 3. Clean up title
    const docTitle = title && title.trim()
      ? title.trim()
      : (extractedTitle && extractedTitle.trim()) || "Uploaded PDF Document";

    // 4. Calculate reading time
    const readTime = calculateReadTime(extractedText);

    // 5. Build tags
    const docTags = Array.isArray(tags) ? [...tags] : [];
    if (!docTags.some(t => t.toLowerCase() === "pdf")) {
      docTags.push("PDF");
    }

    // 6. Persist to database
    const doc = await prisma.document.create({
      data: {
        title: docTitle,
        content: extractedText,
        readTime,
        tags: docTags,
        authorId,
        projectId
      },
      include: {
        author: { select: { name: true, avatar: true } }
      }
    });

    // 7. Background chunking for RAG
    processDocumentChunks(doc.id, doc.content).catch((err) => {
      logger.error("Background chunking failed for uploaded PDF: %o", err);
    });

    logger.info(`PDF Document '${doc.title}' uploaded and processed for workspace ${projectId} (${numPages} pages, ${extractedText.length} chars)`);

    return sendSuccess(res, 201, "PDF uploaded and indexed successfully", {
      document: doc,
      pages: numPages
    });
  } catch (error) {
    logger.error("Upload PDF error: %o", error);
    return sendError(res, 500, "Failed to upload and process PDF: " + error.message);
  }
};

module.exports = {
  createDocument,
  getDocuments,
  getDocumentById,
  updateDocument,
  deleteDocuments,
  uploadPdfDocument
};
