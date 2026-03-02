import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Attach admin key
    const adminKey = import.meta.env.VITE_ADMIN_API_KEY;
    if (adminKey) {
      config.headers["x-admin-key"] = adminKey;
    }

    // Attach JWT token if exists
    const token = localStorage.getItem("adminToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default api;