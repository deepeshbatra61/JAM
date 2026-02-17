// ─── JAM API Service ──────────────────────────────────────────────────────────
// Replace VITE_API_URL in your .env with your Railway backend URL
// e.g. VITE_API_URL=https://jam-backend.railway.app

const BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

function getToken() {
  return localStorage.getItem("jam_token");
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

async function handleResponse(res) {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const auth = {
  loginUrl: () => `${BASE}/auth/google`,

  // Call this when Google redirects back with ?token=...
  handleCallback: (token, userId, name, email, avatar) => {
    localStorage.setItem("jam_token",  token);
    localStorage.setItem("jam_userId", userId);
    localStorage.setItem("jam_name",   name);
    localStorage.setItem("jam_email",  email);
    localStorage.setItem("jam_avatar", avatar);
  },

  getUser: () => ({
    id:     localStorage.getItem("jam_userId"),
    name:   localStorage.getItem("jam_name"),
    email:  localStorage.getItem("jam_email"),
    avatar: localStorage.getItem("jam_avatar"),
  }),

  isLoggedIn: () => !!localStorage.getItem("jam_token"),

  logout: async () => {
    await fetch(`${BASE}/auth/logout`, { method: "POST", headers: authHeaders() });
    ["jam_token","jam_userId","jam_name","jam_email","jam_avatar"]
      .forEach(k => localStorage.removeItem(k));
  },
};

// ── Applications ──────────────────────────────────────────────────────────────
export const api = {
  // Fetch all applications
  getApplications: async () => {
    const res = await fetch(`${BASE}/applications`, { headers: authHeaders() });
    const data = await handleResponse(res);
    return data.applications;
  },

  // Create new application
  createApplication: async (payload) => {
    const res = await fetch(`${BASE}/applications`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await handleResponse(res);
    return data.application;
  },

  // Update status or any field
  updateApplication: async (id, updates) => {
    const res = await fetch(`${BASE}/applications/${id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(updates),
    });
    const data = await handleResponse(res);
    return data.application;
  },

  // Delete
  deleteApplication: async (id) => {
    const res = await fetch(`${BASE}/applications/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    return handleResponse(res);
  },

  // Add timeline note
  addTimelineEvent: async (id, description, type = "note") => {
    const res = await fetch(`${BASE}/applications/${id}/timeline`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ description, type }),
    });
    const data = await handleResponse(res);
    return data.event;
  },

  // Get analytics stats
  getStats: async () => {
    const res = await fetch(`${BASE}/applications/meta/stats`, { headers: authHeaders() });
    return handleResponse(res);
  },

  // Trigger Gmail sync
  syncGmail: async () => {
    const res = await fetch(`${BASE}/sync/gmail`, {
      method: "POST",
      headers: authHeaders(),
    });
    return handleResponse(res);
  },
};
