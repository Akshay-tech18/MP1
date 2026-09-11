import { create } from "zustand";
import client from "../api/client";

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  loading: true,
  projects: [],
  currentProject: null,

  setToken: (token) => set({ token }),

  /**
   * Load active user profile on app start
   */
  fetchMe: async () => {
    set({ loading: true });
    try {
      const res = await client.get("/auth/me");
      if (res.data.success) {
        const user = res.data.data.user;
        const accessToken = res.data.data.accessToken || null;
        set({ user, token: accessToken });
        // Set default Authorization header if token returned
        if (accessToken) {
          client.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
        }
      }
    } catch (err) {
      set({ user: null, token: null });
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Mock login helper
   */
  mockLogin: async (email) => {
    set({ loading: true });
    try {
      const res = await client.post("/auth/mock-login", { email });
      if (res.data.success) {
        const { user, accessToken } = res.data.data;
        set({ user, token: accessToken });
        client.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
        return { success: true };
      }
      return { success: false, message: res.data.message };
    } catch (err) {
      const msg = err.response?.data?.message || "Login failed";
      return { success: false, message: msg };
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Clear session cookies and local state
   */
  logout: async () => {
    try {
      await client.post("/auth/logout");
    } catch (err) {
      // Proceed with state clearance regardless of HTTP status
    }
    set({ user: null, token: null, projects: [], currentProject: null });
    delete client.defaults.headers.common["Authorization"];
  },

  /**
   * Query projects the user is affiliated with
   */
  fetchProjects: async () => {
    try {
      const res = await client.get("/projects");
      if (res.data.success) {
        const projectsList = res.data.data.projects || [];
        set({ projects: projectsList });
        
        // Restore saved workspace from localStorage or refresh active workspace
        const savedId = localStorage.getItem("devpilot_active_project_id");
        const { currentProject } = get();

        if (projectsList.length === 0) {
          get().setCurrentProject(null);
        } else {
          const targetId = currentProject?.id || savedId;
          const matched = projectsList.find((p) => p.id === targetId);
          if (matched) {
            get().setCurrentProject(matched);
          } else {
            get().setCurrentProject(projectsList[0]);
          }
        }
      }
    } catch (err) {
      console.error("Error retrieving projects:", err);
    }
  },

  /**
   * Set the active project workspace
   */
  setCurrentProject: (project) => {
    set({ currentProject: project });
    if (project) {
      localStorage.setItem("devpilot_active_project_id", project.id);
    } else {
      localStorage.removeItem("devpilot_active_project_id");
    }
  },

  /**
   * Create a new project workspace with optional GitHub repo and invitees
   */
  createProject: async (nameOrData, maybeDesc) => {
    try {
      const payload = typeof nameOrData === "object" && nameOrData !== null
        ? nameOrData
        : { name: nameOrData, description: maybeDesc };

      const res = await client.post("/projects", payload);
      if (res.data.success) {
        const newProj = res.data.data.project;
        set((state) => ({ projects: [newProj, ...state.projects] }));
        get().setCurrentProject(newProj);
        return { 
          success: true, 
          project: newProj, 
          warnings: res.data.data?.warnings || [] 
        };
      }
    } catch (err) {
      const respData = err.response?.data;
      let msg = respData?.message || "Failed to create project";
      if (respData?.errors && Array.isArray(respData.errors) && respData.errors.length > 0) {
        msg = respData.errors
          .map((e) => (e.message ? `${e.field ? e.field + ": " : ""}${e.message}` : String(e)))
          .join(" • ");
      }
      return { success: false, message: msg, errors: respData?.errors };
    }
  },

  /**
   * Update an existing workspace
   */
  updateProject: async (projectId, updateData) => {
    try {
      const res = await client.patch(`/projects/${projectId}`, updateData);
      if (res.data.success) {
        const updated = res.data.data.project;
        set((state) => ({
          projects: state.projects.map((p) => (p.id === projectId ? { ...p, ...updated } : p)),
          currentProject: state.currentProject?.id === projectId ? { ...state.currentProject, ...updated } : state.currentProject,
        }));
        return { success: true, project: updated };
      }
      return { success: false, message: res.data.message || "Failed to update workspace" };
    } catch (err) {
      const respData = err.response?.data;
      let msg = respData?.message || "Failed to update workspace";
      if (respData?.errors && Array.isArray(respData.errors) && respData.errors.length > 0) {
        msg = respData.errors
          .map((e) => (e.message ? `${e.field ? e.field + ": " : ""}${e.message}` : String(e)))
          .join(" • ");
      }
      return { success: false, message: msg };
    }
  },

  /**
   * Delete a workspace permanently
   */
  deleteProject: async (projectId) => {
    try {
      const res = await client.delete(`/projects/${projectId}`);
      if (res.data.success) {
        const remaining = get().projects.filter((p) => p.id !== projectId);
        const nextActive = remaining.length > 0 ? remaining[0] : null;
        set({ projects: remaining });
        get().setCurrentProject(nextActive);
        return { success: true };
      }
      return { success: false, message: res.data.message || "Failed to delete workspace" };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || err.message || "Failed to delete workspace",
      };
    }
  }
}));

// Global event listener to log out user if a 401 fails to refresh
if (typeof window !== "undefined") {
  window.addEventListener("unauthorized", () => {
    useAuthStore.getState().logout();
  });

  window.addEventListener("token_refreshed", (e) => {
    if (e.detail?.token) {
      useAuthStore.getState().setToken(e.detail.token);
    }
  });
}

export default useAuthStore;
