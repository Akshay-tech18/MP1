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

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response Interceptor to intercept 401 Unauthorized errors and refresh tokens
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 and hasn't been retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Exclude auth routes themselves to prevent loops
      if (
        originalRequest.url.includes("/auth/mock-login") ||
        originalRequest.url.includes("/auth/refresh") ||
        originalRequest.url.includes("/auth/me")
      ) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers["Authorization"] = `Bearer ${token}`;
            return client(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshRes = await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        
        const { accessToken } = refreshRes.data.data;
        
        // Update client default headers and original request headers
        client.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
        originalRequest.headers["Authorization"] = `Bearer ${accessToken}`;

        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("token_refreshed", { detail: { token: accessToken } }));
        }

        processQueue(null, accessToken);
        isRefreshing = false;
        
        return client(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        isRefreshing = false;
        
        // Refresh failed (refresh token expired/invalid) - trigger logout event
        window.dispatchEvent(new Event("unauthorized"));
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export default client;
