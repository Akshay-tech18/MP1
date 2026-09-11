const { ChatGroq } = require("@langchain/groq");
const { StateGraph, MessagesAnnotation, MemorySaver } = require("@langchain/langgraph");
const { DynamicStructuredTool } = require("@langchain/core/tools");
const { z } = require("zod");
const prisma = require("../config/db");
const logger = require("../utils/logger");

const memory = new MemorySaver();

const chatGroq = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: process.env.GROQ_MODEL || "openai/gpt-oss-120b", 
  temperature: 0,
});

// 1. Define Tools
const createTaskTool = new DynamicStructuredTool({
  name: "create_task",
  description: "Creates a new task in the workspace. Use this when the user asks you to create a task, ticket, or issue.",
  schema: z.object({
    projectId: z.string().describe("The ID of the project to create the task in"),
    title: z.string().describe("The title of the task"),
    description: z.string().optional().describe("Detailed description of the task"),
  }),
  func: async ({ projectId, title, description }) => {
    try {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) return "Error: Project not found.";

      const task = await prisma.task.create({
        data: {
          title,
          description,
          projectId,
          reporterId: project.ownerId, // Fallback to owner
          orderIndex: Date.now()
        }
      });
      return `Task created successfully with ID: ${task.id}`;
    } catch (err) {
      logger.error("Tool execution error: %o", err);
      return `Failed to create task: ${err.message}`;
    }
  },
});

const tools = [createTaskTool];
const modelWithTools = chatGroq.bindTools(tools);

// 2. Define Nodes
const agentNode = async (state) => {
  const { messages } = state;
  
  // Provide system context
  const systemMessage = {
    role: "system",
    content: "You are DevPilot AI. You help manage the workspace. You can create tasks. If you don't know the project ID, ask the user or use the one provided in the context."
  };
  
  const response = await modelWithTools.invoke([systemMessage, ...messages]);
  return { messages: [response] };
};

const toolNode = async (state) => {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];
  
  const results = [];
  for (const toolCall of lastMessage.tool_calls) {
    const tool = tools.find((t) => t.name === toolCall.name);
    if (tool) {
      const result = await tool.invoke(toolCall.args);
      results.push({
        role: "tool",
        tool_call_id: toolCall.id,
        name: tool.name,
        content: String(result),
      });
    }
  }
  return { messages: results };
};

// 3. Build Graph
const workflow = new StateGraph(MessagesAnnotation)
  .addNode("agent", agentNode)
  .addNode("tools", toolNode)
  .addEdge("__start__", "agent")
  .addConditionalEdges("agent", (state) => {
    const lastMessage = state.messages[state.messages.length - 1];
    if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
      return "tools";
    }
    return "__end__";
  })
  .addEdge("tools", "agent");

// Compile with Human-in-the-loop interruption
const agentGraph = workflow.compile({ 
  checkpointer: memory, 
  interruptBefore: ["tools"] 
});

module.exports = { agentGraph };
