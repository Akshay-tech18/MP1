const { HfInference } = require("@huggingface/inference");
const prisma = require("../config/db");
const logger = require("../utils/logger");
const { withExponentialBackoff } = require("../utils/retry.utils");

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

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
    if (!process.env.HUGGINGFACE_API_KEY) {
      logger.warn("HUGGINGFACE_API_KEY is missing. Skipping vectorization for %s", documentId);
      return;
    }

    const chunks = chunkText(content);
    if (chunks.length === 0) return;

    await prisma.documentChunk.deleteMany({ where: { documentId } });

    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      
      const embeddingResponse = await withExponentialBackoff(async () => {
        return await hf.featureExtraction({
          model: "sentence-transformers/all-MiniLM-L6-v2",
          inputs: chunkText
        });
      }, 4, 2000); // Max 4 retries, starting at 2s
      
      const vectorStr = `[${embeddingResponse.join(",")}]`;

      await prisma.$executeRaw`
        INSERT INTO document_chunks (id, "documentId", content, "chunkIndex", embedding)
        VALUES (gen_random_uuid(), ${documentId}, ${chunkText}, ${i}, ${vectorStr}::vector)
      `;
    }
    
    logger.info("Successfully vectorized document %s (%d chunks)", documentId, chunks.length);
  } catch (error) {
    logger.error("Error vectorizing document %s: %o", documentId, error);
  }
};

module.exports = { processDocumentChunks };
