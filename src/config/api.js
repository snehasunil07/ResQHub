/**
 * ResQHub API Configuration
 * Supports both local development (Vite proxy) and cloud deployment (Vercel / Render)
 */
export const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

/**
 * Helper to construct full API URL
 * @param {string} path - Endpoint path (e.g. "/api/volunteers/leaderboard")
 * @returns {string} Fully qualified or proxied URL
 */
export const apiUrl = (path) => {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

export default {
  API_BASE_URL,
  apiUrl,
};
