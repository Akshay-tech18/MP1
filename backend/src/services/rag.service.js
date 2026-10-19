const { HfInference } = require("@huggingface/inference");
const { ChatGroq } = require("@langchain/groq");
const { PromptTemplate } = require("@langchain/core/prompts");
const prisma = require("../config/db");
const logger = require("../utils/logger");
const { withExponentialBackoff } = require("../utils/retry.utils");

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

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

    // 1. Try Hugging Face vector embedding if key is configured
    if (process.env.HUGGINGFACE_API_KEY) {
      try {
        const embeddingResponse = await withExponentialBackoff(async () => {
          return await hf.featureExtraction({
            model: "sentence-transformers/all-MiniLM-L6-v2",
            inputs: question,
          });
        }, 1, 500); // 1 quick try; if credit error or network error, fallback immediately

        if (embeddingResponse && Array.isArray(embeddingResponse)) {
          const vectorStr = `[${embeddingResponse.join(",")}]`;
          const vectorResults = await prisma.$queryRaw`
            SELECT c.content, d.title 
            FROM document_chunks c
            JOIN documents d ON c."documentId" = d.id
            WHERE d."projectId" = ${projectId}
            ORDER BY c.embedding <=> ${vectorStr}::vector
            LIMIT 5;
          `;
          if (vectorResults && vectorResults.length > 0) {
            searchResults = vectorResults;
          }
        }
      } catch (hfErr) {
        logger.warn(
          "Hugging Face embedding unavailable (%s). Falling back to direct workspace document context.",
          hfErr.message
        );
      }
    }

    // 2. Resilient Fallback: If vector search had no matches or HF had no credits, query workspace documents directly
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

    // 3. Format Context
    let contextStr = "";
    if (searchResults && searchResults.length > 0) {
      contextStr = searchResults.map((r) => `[Source: ${r.title}]\n${r.content}`).join("\n\n");
    } else {
      contextStr = "No internal documentation uploaded for this workspace yet. Answer the user's question politely using your general software engineering knowledge, mentioning that no workspace-specific docs are attached.";
    }

    // 4. Generate Answer via Groq LLM
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
