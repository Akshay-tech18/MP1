import { create } from "zustand";
import client from "../api/client";

const useAuthStore = create((set, get) => ({
  user: null,
  loading: true,
  projects: [],
  currentProject: null,

  /**
   * Load active user profile on app start
   */
  fetchMe: async () => {
    set({ loading: true });
    try {
      const res = await client.get("/auth/me");
      if (res.data.success) {
        set({ user: res.data.data.user });
        // Set default Authorization header if token returned
        if (res.data.data.accessToken) {
          client.defaults.headers.common["Authorization"] = `Bearer ${res.data.data.accessToken}`;
        }
      }
    } catch (err) {
      set({ user: null });
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
        set({ user });
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
    set({ user: null, projects: [], currentProject: null });
    delete client.defaults.headers.common["Authorization"];
  },

  /**
   * Query projects the user is affiliated with
   */
  fetchProjects: async () => {
    try {
      const res = await client.get("/projects");
      if (res.data.success) {
        const projectsList = res.data.data.projects;
        set({ projects: projectsList });
        
        // Auto-select first project if none is active
        const { currentProject } = get();
        if (projectsList.length > 0 && !currentProject) {
          get().setCurrentProject(projectsList[0]);
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
      return { success: false, message: res.data.message };
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to create project";
      return { success: false, message: msg };
    }
  }
}));

// Global event listener to log out user if a 401 fails to refresh
if (typeof window !== "undefined") {
  window.addEventListener("unauthorized", () => {
    useAuthStore.getState().logout();
  });
}

export default useAuthStore;
