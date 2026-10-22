const { ChatGroq } = require("@langchain/groq");
const { PromptTemplate } = require("@langchain/core/prompts");
const prisma = require("../config/db");
const logger = require("../utils/logger");
const { withExponentialBackoff } = require("../utils/retry.utils");

const chatGroq = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: process.env.GROQ_MODEL || "openai/gpt-oss-120b", 
  temperature: 0.1
});

const RAG_PROMPT = PromptTemplate.fromTemplate(`
You are DevPilot Nexus AI, an intelligent workspace assistant for software engineering teams.
Use the following pieces of internal workspace documents to answer the question at the end.
If the workspace documents contain the answer, prioritize them and cite the relevant sources.
If no workspace documents are relevant or uploaded, provide a helpful and accurate answer based on best engineering practices.
Keep your answers well-formatted, professional, and clear in Markdown.

Context Documents:
{context}

User Question: {question}
Answer:`);

const askNexus = async (projectId, question) => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("Missing GROQ_API_KEY. Please set GROQ_API_KEY in server environment.");
  }

  try {
    let searchResults = [];

    // 1. Code-based Search: PostgreSQL Full-Text Rank across document chunks
    try {
      const ftResults = await prisma.$queryRaw`
        SELECT c.content, d.title,
               ts_rank_cd(to_tsvector('english', c.content), plainto_tsquery('english', ${question})) AS rank
        FROM document_chunks c
        JOIN documents d ON c."documentId" = d.id
        WHERE d."projectId" = ${projectId}
          AND to_tsvector('english', c.content) @@ plainto_tsquery('english', ${question})
        ORDER BY rank DESC
        LIMIT 5;
      `;
      if (ftResults && ftResults.length > 0) {
        searchResults = ftResults;
      }
    } catch (ftErr) {
      logger.warn("PostgreSQL full-text chunk query failed (%s). Trying keyword fallback.", ftErr.message);
    }

    // 2. Keyword Search Fallback: Match individual query tokens across chunks
    if (!searchResults || searchResults.length === 0) {
      const keywords = (question || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s_-]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 3);

      if (keywords.length > 0) {
        try {
          const matchedChunks = await prisma.documentChunk.findMany({
            where: {
              document: { projectId },
              OR: keywords.slice(0, 4).map((kw) => ({
                content: { contains: kw, mode: "insensitive" }
              }))
            },
            include: {
              document: { select: { title: true } }
            },
            take: 5
          });

          if (matchedChunks && matchedChunks.length > 0) {
            searchResults = matchedChunks.map((c) => ({
              title: c.document?.title || "Document",
              content: c.content
            }));
          }
        } catch (kwErr) {
          logger.warn("Keyword chunk fallback failed: %s", kwErr.message);
        }
      }
    }

    // 3. Document-Level Fallback: Query workspace documents directly
    if (!searchResults || searchResults.length === 0) {
      const directDocs = await prisma.document.findMany({
        where: { projectId },
        select: { title: true, content: true },
        orderBy: { updatedAt: "desc" },
        take: 5,
      });

      if (directDocs && directDocs.length > 0) {
        searchResults = directDocs.map((d) => ({
          title: d.title,
          content: d.content,
        }));
      }
    }

    // 4. Format Context
    let contextStr = "";
    if (searchResults && searchResults.length > 0) {
      contextStr = searchResults.map((r) => `[Source: ${r.title}]\n${r.content}`).join("\n\n");
    } else {
      contextStr = "No internal documentation uploaded for this workspace yet. Answer the user's question politely using your general software engineering knowledge, mentioning that no workspace-specific docs are attached.";
    }

    // 5. Generate Answer via Groq LLM
    const chain = RAG_PROMPT.pipe(chatGroq);
    const response = await withExponentialBackoff(async () => {
      return await chain.invoke({
        context: contextStr,
        question: question,
      });
    }, 3, 1500);

    const sourceTitles = searchResults && searchResults.length > 0
      ? Array.from(new Set(searchResults.map((r) => r.title))).filter(Boolean)
      : [];

    return {
      answer: response.content,
      sources: sourceTitles,
    };
  } catch (error) {
    logger.error("Nexus RAG error: %o", error);
    throw error;
  }
};

module.exports = { askNexus };
