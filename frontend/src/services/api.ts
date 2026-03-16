import axios from "axios";

const rawApiUrl = import.meta.env.VITE_API_URL?.trim();
const apiBaseUrl = rawApiUrl ? rawApiUrl.replace(/\/+$/, "") : "/api";

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10_000,
});

export default api;
