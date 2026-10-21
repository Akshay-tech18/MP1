const { sendSuccess, sendError } = require("../../utils/response.utils");
const logger = require("../../utils/logger");
const { askNexus } = require("../../services/rag.service");
const { agentGraph } = require("../../services/agent.service");

// Note: Simple in-memory thread tracking for demo purposes.
// In production, this would be tied to the User ID in a DB.

const chatWithNexus = async (req, res) => {
  const projectId = req.params.projectId || req.params.id;
  const { message, threadId, useAgent } = req.body;

  if (!message) {
    return sendError(res, 400, "Message is required");
  }

  try {
    // If simple RAG chat is requested
    if (!useAgent) {
      const result = await askNexus(projectId, message);
      return sendSuccess(res, 200, "Nexus response generated", result);
    }

    // --- Agent Flow (LangGraph) ---
    const activeThreadId = threadId || `thread-${req.user.id}-${Date.now()}`;
    const config = { configurable: { thread_id: activeThreadId } };

    // Pass the projectId in the context so the LLM knows it
    const promptMessage = `[Current Project ID: ${projectId}]\nUser: ${message}`;

    await agentGraph.invoke({ 
      messages: [{ role: "user", content: promptMessage }] 
    }, config);

    const state = await agentGraph.getState(config);
    const lastMessage = state.values.messages[state.values.messages.length - 1];

    // Check if the graph interrupted before running tools
    if (state.next.includes("tools")) {
      return sendSuccess(res, 200, "Approval required for agent action", {
        status: "approval_required",
        threadId: activeThreadId,
        toolCalls: lastMessage.tool_calls
      });
    }

    return sendSuccess(res, 200, "Agent response generated", {
      status: "completed",
      threadId: activeThreadId,
      answer: lastMessage.content
    });
  } catch (err) {
    logger.error("Nexus chat error: %o", err);
    return sendError(res, 500, err.message || "Failed to chat with Nexus");
  }
};

const approveAgentAction = async (req, res) => {
  const projectId = req.params.projectId || req.params.id;
  const { threadId, approved } = req.body;

  if (!threadId) return sendError(res, 400, "threadId is required");

  try {
    const config = { configurable: { thread_id: threadId } };
    const state = await agentGraph.getState(config);

    if (!state.next.includes("tools")) {
      return sendError(res, 400, "No pending actions to approve in this thread");
    }

    // Security Guard (C5): Enforce that pending tool calls match the current project
    const lastMsg = state.values?.messages?.[state.values.messages.length - 1];
    if (lastMsg?.tool_calls && Array.isArray(lastMsg.tool_calls)) {
      for (const call of lastMsg.tool_calls) {
        if (call.args?.projectId && call.args.projectId !== projectId) {
          logger.warn(`Rejected cross-project agent action: target=${call.args.projectId}, current=${projectId}`);
          return sendError(res, 403, "Agent action targets an unauthorized workspace");
        }
      }
    }

    if (!approved) {
      // If user rejects, we inject a tool error message and resume so the LLM knows it was rejected
      // Actually, simplest way in LangGraph is just to not invoke it and clear it, 
      // but for now we'll just throw an error response
      return sendSuccess(res, 200, "Agent action rejected by user", { status: "rejected" });
    }

    // Resume the graph by invoking with null
    await agentGraph.invoke(null, config);
    
    // Get the final state after tool execution and LLM summary
    const finalState = await agentGraph.getState(config);
    const lastMessage = finalState.values.messages[finalState.values.messages.length - 1];

    return sendSuccess(res, 200, "Agent action executed", {
      status: "completed",
      answer: lastMessage.content
    });
  } catch (err) {
    logger.error("Agent approval error: %o", err);
    return sendError(res, 500, "Failed to execute agent action");
  }
};

module.exports = {
  chatWithNexus,
  approveAgentAction
};
