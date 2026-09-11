const { HfInference } = require("@huggingface/inference");
const { ChatGroq } = require("@langchain/groq");
const { PromptTemplate } = require("@langchain/core/prompts");
const prisma = require("../config/db");
const logger = require("../utils/logger");
const { withExponentialBackoff } = require("../utils/retry.utils");

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

const chatGroq = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  modelName: "llama3-70b-8192", 
  temperature: 0.1
});

const RAG_PROMPT = PromptTemplate.fromTemplate(`
You are DevPilot Nexus AI, an intelligent workspace assistant.
Use the following pieces of internal workspace documents to answer the question at the end.
If you don't know the answer or if it's not in the context, just say that you don't know, don't try to make up an answer.
Keep your answers concise and well-formatted in Markdown.

Context Documents:
{context}

User Question: {question}
Answer:`);

const askNexus = async (projectId, question) => {
  if (!process.env.HUGGINGFACE_API_KEY || !process.env.GROQ_API_KEY) {
    throw new Error("Missing AI API Keys. Please set HUGGINGFACE_API_KEY and GROQ_API_KEY.");
  }

  try {
    // 1. Embed with retry
    const embeddingResponse = await withExponentialBackoff(async () => {
      return await hf.featureExtraction({
        model: "sentence-transformers/all-MiniLM-L6-v2",
        inputs: question
      });
    }, 3, 1000);
    const vectorStr = `[${embeddingResponse.join(",")}]`;

    // 2. Search DB
    const searchResults = await prisma.$queryRaw`
      SELECT c.content, d.title 
      FROM document_chunks c
      JOIN documents d ON c."documentId" = d.id
      WHERE d."projectId" = ${projectId}
      ORDER BY c.embedding <=> ${vectorStr}::vector
      LIMIT 5;
    `;

    // 3. Format
    let contextStr = "";
    if (searchResults && searchResults.length > 0) {
      contextStr = searchResults.map(r => `[Source: ${r.title}]\n${r.content}`).join("\n\n");
    } else {
      contextStr = "No relevant documents found in this workspace.";
    }

    // 4. Generate Answer with retry
    const chain = RAG_PROMPT.pipe(chatGroq);
    const response = await withExponentialBackoff(async () => {
      return await chain.invoke({
        context: contextStr,
        question: question
      });
    }, 3, 2000);

    return {
      answer: response.content,
      sources: searchResults.map(r => r.title)
    };
  } catch (error) {
    logger.error("Nexus RAG error: %o", error);
    throw error;
  }
};

module.exports = { askNexus };
