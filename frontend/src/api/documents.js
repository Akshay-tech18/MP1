import client from "./client";

/**
 * Fetch workspace documents for a project (lightweight for table list)
 */
export const fetchDocuments = async (projectId, params = {}) => {
  const response = await client.get(`/projects/${projectId}/documents`, { params });
  return response.data;
};

/**
 * Fetch single document by ID (includes content, parent, children)
 */
export const fetchDocumentById = async (projectId, id) => {
  const response = await client.get(`/projects/${projectId}/documents/${id}`);
  return response.data;
};

/**
 * Create a new document in the workspace
 */
export const createDocument = async (projectId, data) => {
  const response = await client.post(`/projects/${projectId}/documents`, data);
  return response.data;
};

/**
 * Update an existing document
 */
export const updateDocument = async (projectId, id, data) => {
  const response = await client.patch(`/projects/${projectId}/documents/${id}`, data);
  return response.data;
};

/**
 * Bulk delete documents
 */
export const deleteDocuments = async (projectId, documentIds) => {
  const response = await client.post(`/projects/${projectId}/documents/bulk-delete`, {
    documentIds,
  });
  return response.data;
};
