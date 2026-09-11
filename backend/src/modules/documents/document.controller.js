const prisma = require("../../config/db");
const { sendSuccess, sendError } = require("../../utils/response.utils");
const logger = require("../../utils/logger");
const { processDocumentChunks } = require("../../services/embedding.service");

// Helper to calculate read time in minutes
const calculateReadTime = (content) => {
  if (!content) return 0;
  const wordCount = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / 200));
};

const createDocument = async (req, res) => {
  const { projectId } = req.params;
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
  const { projectId } = req.params;
  const { search, tags, sortBy = "updatedAt", order = "desc" } = req.query;

  try {
    const where = { projectId };

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

  try {
    const doc = await prisma.document.findUnique({
      where: { id },
      include: {
        author: { select: { name: true, avatar: true } },
        parent: { select: { title: true, id: true } },
        children: { select: { id: true, title: true } }
      }
    });

    if (!doc) return sendError(res, 404, "Document not found");

    return sendSuccess(res, 200, "Document retrieved", { document: doc });
  } catch (err) {
    logger.error("Get Document error: %o", err);
    return sendError(res, 500, "Failed to retrieve document");
  }
};

const updateDocument = async (req, res) => {
  const { id } = req.params;
  const { title, content, tags, parentId } = req.body;

  try {
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
      // Simple circular check - block if setting parent to an existing child
      if (parentId) {
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
  const { projectId } = req.params;
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

module.exports = {
  createDocument,
  getDocuments,
  getDocumentById,
  updateDocument,
  deleteDocuments
};
