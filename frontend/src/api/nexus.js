import client from "./client";

/**
 * Send chat message to Nexus AI assistant (supports RAG and LangGraph agent) 
 * 
 * 
 * hbsdshgdvc
 */
export const chatWithNexus = async (projectId, { message, useAgent = true, threadId = null }) => {
  const response = await client.post(`/projects/${projectId}/nexus/chat`, {
    message,
    useAgent,
    threadId,
  });
  return response.data;
};

/**
 * Approve or reject a pending Human-in-the-Loop agent action
 */
export const approveAgentAction = async (projectId, { threadId, approved = true }) => {
  const response = await client.post(`/projects/${projectId}/nexus/approve`, {
    threadId,
    approved,
  });
  return response.data;
};
