/**
 * Core API Client for AI Workspace Platform
 * - Uses native Fetch API (no axios)
 * - Automatic JWT header injection
 * - Automatic 401 token refresh queue & retry
 * - Works smoothly in both client and server contexts
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

// Storage keys
const ACCESS_TOKEN_KEY = "ai_workspace_access_token";
const REFRESH_TOKEN_KEY = "ai_workspace_refresh_token";

/**
 * Cookie and Storage helpers
 */
export function getTokens() {
  if (typeof window === "undefined") {
    return { access: null, refresh: null };
  }

  // 1. Try localStorage
  let access = localStorage.getItem(ACCESS_TOKEN_KEY);
  let refresh = localStorage.getItem(REFRESH_TOKEN_KEY);

  // 2. Fallback to document.cookie if not in localStorage
  if (!access || !refresh) {
    const cookies = document.cookie.split(";").reduce((acc, c) => {
      const [key, val] = c.trim().split("=");
      if (key && val) acc[key] = decodeURIComponent(val);
      return acc;
    }, {});
    access = access || cookies[ACCESS_TOKEN_KEY] || null;
    refresh = refresh || cookies[REFRESH_TOKEN_KEY] || null;
  }

  return { access, refresh };
}

export function setTokens({ access, refresh }) {
  if (typeof window === "undefined") return;

  if (access) {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    document.cookie = `${ACCESS_TOKEN_KEY}=${encodeURIComponent(
      access
    )}; path=/; max-age=86400; SameSite=Lax`;
  }
  if (refresh) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
    document.cookie = `${REFRESH_TOKEN_KEY}=${encodeURIComponent(
      refresh
    )}; path=/; max-age=604800; SameSite=Lax`;
  }
}

export function clearTokens() {
  if (typeof window === "undefined") return;

  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  document.cookie = `${ACCESS_TOKEN_KEY}=; path=/; max-age=0`;
  document.cookie = `${REFRESH_TOKEN_KEY}=; path=/; max-age=0`;
}

// Queue mechanism for handling concurrent refresh requests
let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb);
}

function onRefreshed(newAccessToken) {
  refreshSubscribers.forEach((cb) => cb(newAccessToken));
  refreshSubscribers = [];
}

/**
 * Perform token refresh with the backend
 */
async function refreshAccessToken() {
  const { refresh } = getTokens();
  if (!refresh) {
    throw new Error("No refresh token available");
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh }),
  });

  if (!response.ok) {
    clearTokens();
    throw new Error("Session expired. Please log in again.");
  }

  const data = await response.json();
  const newAccess = data.access;
  const newRefresh = data.refresh || refresh; // In case rotate refresh token is used
  setTokens({ access: newAccess, refresh: newRefresh });
  return newAccess;
}

/**
 * Universal fetch wrapper with error handling and automatic retry on 401
 */
export async function apiFetch(endpoint, options = {}) {
  const { access } = getTokens();
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const headers = new Headers(options.headers || {});

  // Set default JSON Content-Type if not sending FormData
  const isFormData = options.body instanceof FormData;
  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Inject Authorization Bearer token if present
  if (access && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${access}`);
  }

  const config = {
    ...options,
    headers,
  };

  try {
    let response = await fetch(url, config);

    // If 401 Unauthorized, attempt refresh unless this is already the refresh/login endpoint
    const isAuthEndpoint =
      endpoint.includes("/api/v1/auth/login/") ||
      endpoint.includes("/api/v1/auth/refresh/") ||
      endpoint.includes("/api/v1/auth/register/");

    if (response.status === 401 && !isAuthEndpoint) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const newAccess = await refreshAccessToken();
          isRefreshing = false;
          onRefreshed(newAccess);
        } catch (refreshErr) {
          isRefreshing = false;
          refreshSubscribers = [];
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("auth:logout"));
          }
          throw refreshErr;
        }
      }

      // Wait for refresh to complete if another call started it
      const newAccessToken = await new Promise((resolve) => {
        subscribeTokenRefresh((token) => resolve(token));
      });

      // Retry request with new token
      headers.set("Authorization", `Bearer ${newAccessToken}`);
      response = await fetch(url, { ...config, headers });
    }

    // Handle No Content (204)
    if (response.status === 204) {
      return null;
    }

    // Parse JSON or text
    const contentType = response.headers.get("content-type") || "";
    let data;
    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const error = new Error(
        (data && (data.detail || data.message || JSON.stringify(data))) ||
          `Request failed with status ${response.status}`
      );
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Authentication Endpoints
 */
export const authApi = {
  async register({ username, password }) {
    return apiFetch("/api/v1/auth/register/", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  async login({ username, password }) {
    const data = await apiFetch("/api/v1/auth/login/", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    if (data.access && data.refresh) {
      setTokens(data);
    }
    return data;
  },

  async me() {
    return apiFetch("/api/v1/auth/me/", {
      method: "GET",
    });
  },

  async refresh(refreshToken) {
    return apiFetch("/api/v1/auth/refresh/", {
      method: "POST",
      body: JSON.stringify({ refresh: refreshToken }),
    });
  },

  async logout() {
    const { refresh } = getTokens();
    try {
      if (refresh) {
        await apiFetch("/api/v1/auth/logout/", {
          method: "POST",
          body: JSON.stringify({ refresh }),
        });
      }
    } finally {
      clearTokens();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("auth:logout"));
      }
    }
  },
};

/**
 * Workspace Endpoints
 */
export const workspaceApi = {
  async list() {
    return apiFetch("/api/v1/workspaces/", {
      method: "GET",
    });
  },

  async create({ name }) {
    return apiFetch("/api/v1/workspaces/", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },

  async get(id) {
    return apiFetch(`/api/v1/workspaces/${id}/`, {
      method: "GET",
    });
  },

  async createInvite(workspaceId, { expires_at, max_uses = 1 }) {
    const payload = { max_uses: Number(max_uses) };
    if (expires_at) {
      payload.expires_at = new Date(expires_at).toISOString();
    }
    return apiFetch(`/api/v1/workspaces/${workspaceId}/invites/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async join(token) {
    return apiFetch(`/api/v1/workspaces/join/${encodeURIComponent(token)}/`, {
      method: "POST",
    });
  },
};

/**
 * Documents & AI RAG Endpoints
 */
export const documentsApi = {
  async list(workspaceId) {
    return apiFetch(`/api/v1/workspaces/${workspaceId}/documents/`, {
      method: "GET",
    });
  },

  async upload(workspaceId, file) {
    const formData = new FormData();
    formData.append("file", file);
    return apiFetch(`/api/v1/workspaces/${workspaceId}/documents/`, {
      method: "POST",
      body: formData,
    });
  },

  async delete(workspaceId, docId) {
    return apiFetch(`/api/v1/workspaces/${workspaceId}/documents/${docId}/`, {
      method: "DELETE",
    });
  },

  async ask(workspaceId, { question, excluded_document_ids = [] }) {
    return apiFetch(`/api/v1/workspaces/${workspaceId}/ask/`, {
      method: "POST",
      body: JSON.stringify({
        question,
        excluded_document_ids,
      }),
    });
  },

  async requests(workspaceId) {
    return apiFetch(`/api/v1/workspaces/${workspaceId}/requests/`, {
      method: "GET",
    });
  },

  async requestDetail(workspaceId, requestId) {
    return apiFetch(`/api/v1/workspaces/${workspaceId}/requests/${requestId}/`, {
      method: "GET",
    });
  },

  async usage() {
    return apiFetch("/api/v1/usage/", {
      method: "GET",
    });
  },
};
