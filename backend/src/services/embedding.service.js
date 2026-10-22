const crypto = require("crypto");
const prisma = require("../config/db");
const logger = require("../utils/logger");

const chunkText = (text, maxLength = 500) => {
  if (!text) return [];
  const paragraphs = text.split(/\n\n+/);
  const chunks = [];
  
  paragraphs.forEach(p => {
    const trimmed = p.trim();
    if (!trimmed) return;
    
    if (trimmed.length > maxLength) {
      const sentences = trimmed.match(/[^.!?]+[.!?]+/g) || [trimmed];
      let currentChunk = "";
      sentences.forEach(s => {
        if (currentChunk.length + s.length > maxLength) {
          chunks.push(currentChunk.trim());
          currentChunk = s;
        } else {
          currentChunk += " " + s;
        }
      });
      if (currentChunk.trim()) chunks.push(currentChunk.trim());
    } else {
      chunks.push(trimmed);
    }
  });
  
  return chunks;
};

const processDocumentChunks = async (documentId, content) => {
  try {
    const chunks = chunkText(content);
    if (chunks.length === 0) return;

    await prisma.documentChunk.deleteMany({ where: { documentId } });

    await prisma.documentChunk.createMany({
      data: chunks.map((chunk, index) => ({
        id: crypto.randomUUID(),
        documentId,
        content: chunk,
        chunkIndex: index
      }))
    });
    
    logger.info("Successfully chunked and indexed document %s (%d chunks)", documentId, chunks.length);
  } catch (error) {
    logger.error("Error chunking document %s: %o", documentId, error);
  }
};

module.exports = { processDocumentChunks, chunkText };
