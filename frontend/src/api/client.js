import axios from "axios";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

function normalizeHostname(hostname) {
  return String(hostname || "")
    .trim()
    .replace(/\.+$/, "")
    .toLowerCase();
}

function isLocalhostHostname(hostname) {
  return LOOPBACK_HOSTS.has(normalizeHostname(hostname));
}

function isLocalhostUrl(urlValue) {
  try {
    const parsed = new URL(urlValue);
    return isLocalhostHostname(parsed.hostname);
  } catch {
    return false;
  }
}

function getDefaultApiBaseUrl() {
  if (typeof window === "undefined") {
    return "/api";
  }

  const { hostname, port } = window.location;

  // When port 5173 is served by containerized Nginx instead of Vite proxy,
  // /api requests can fail. Use direct backend URL on localhost in that case.
  if (isLocalhostHostname(hostname) && port === "5173") {
    return "http://localhost:4000/api";
  }

  return "/api";
}

function resolveApiBaseUrl(configuredValue) {
  const defaultApiBaseUrl = getDefaultApiBaseUrl();
  const trimmed = configuredValue?.trim();
  if (!trimmed) {
    return defaultApiBaseUrl;
  }

  const normalized = trimmed.replace(/\/+$/, "");
  if (typeof window === "undefined") {
    return normalized;
  }

  const currentHost = window.location.hostname;
  const shouldUseProxy = isLocalhostUrl(normalized) && !isLocalhostHostname(currentHost);

  return shouldUseProxy ? defaultApiBaseUrl : normalized;
}

export function resolveSocketUrl(configuredValue) {
  const trimmed = configuredValue?.trim();
  if (!trimmed) {
    return typeof window !== "undefined" ? window.location.origin : "http://localhost:4000";
  }

  const normalized = trimmed.replace(/\/+$/, "");
  if (typeof window === "undefined") {
    return normalized;
  }

  const currentHost = window.location.hostname;
  const shouldUseProxy = isLocalhostUrl(normalized) && !isLocalhostHostname(currentHost);

  return shouldUseProxy ? window.location.origin : normalized;
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL)
});

let refreshInFlight = null;

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const url = originalRequest?.url || "";
    const isAuthEndpoint =
      url.includes("/auth/login") ||
      url.includes("/auth/register") ||
      url.includes("/auth/refresh") ||
      url.includes("/auth/forgot-password") ||
      url.includes("/auth/reset-password");

    if (error.response?.status !== 401 || originalRequest?._retry || isAuthEndpoint) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    const refreshToken = localStorage.getItem("refreshToken");

    if (!refreshToken) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      return Promise.reject(error);
    }

    if (!refreshInFlight) {
      refreshInFlight = api
        .post("/auth/refresh", { refreshToken })
        .then((res) => {
          localStorage.setItem("accessToken", res.data.accessToken);
          localStorage.setItem("refreshToken", res.data.refreshToken);
          return res.data.accessToken;
        })
        .finally(() => {
          refreshInFlight = null;
        });
    }

    try {
      const newToken = await refreshInFlight;
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      return Promise.reject(refreshError);
    }
  }
);

export default api;
