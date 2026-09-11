import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

const client = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 25000,
  headers: {
    "Content-Type": "application/json"
  }
});

// Response Interceptor to intercept 401 Unauthorized errors and gracefully logout
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;

    // Check if error is 401
    if (error.response?.status === 401) {
      // Ignore 401s from the mock login itself to avoid false triggers
      if (originalRequest.url.includes("/auth/mock-login")) {
        return Promise.reject(error);
      }

      // If we get a 401 anywhere else, our 24-hour token is truly expired.
      // Dispatch unauthorized event to log the user out on the frontend.
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("unauthorized"));
      }
    }

    return Promise.reject(error);
  }
);

export default client;
