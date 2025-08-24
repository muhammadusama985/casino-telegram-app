// src/admin/adminApi.js

const BASE_URL =
  import.meta.env.VITE_API?.replace(/\/+$/, "") || "https://b33ff2158e32.ngrok-free.app"; // no space

const LS_ADMIN_TOKEN = "adminToken";

export function getAdminToken() {
  return localStorage.getItem(LS_ADMIN_TOKEN) || "";
}
export function setAdminToken(t) {
  if (!t) localStorage.removeItem(LS_ADMIN_TOKEN);
  else localStorage.setItem(LS_ADMIN_TOKEN, t);
}

function getHeaders(extra = {}) {
  const token = getAdminToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    // OPTIONAL: remove this unless you’ve whitelisted it server-side (see Fix 3)
    // "x-admin-origin": window.location.origin,
    ...extra,
  };
}

async function handle(res) {
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) {
    const msg = data?.error || data?.message || `HTTP ${res.status}`;
    const err = new Error(msg); err.status = res.status; err.payload = data;
    throw err;
  }
  return data;
}

export async function api(path, { method = "GET", body, headers } = {}) {
  const url = `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
  const res = await fetch(url, {
    method,
    headers: getHeaders(headers),
    body: body ? JSON.stringify(body) : undefined,
  });
  return handle(res);
}

export const adminAuth = {
  async login(password) {
    // use ADMIN_EMAIL from build-time env or fall back to your .env value
    const email = import.meta.env.VITE_ADMIN_EMAIL || "admin@casino.local";
    // ✅ Correct path and payload:
    const r = await api("/admin/auth/login", {
      method: "POST",
      body: { email, password },
    });
    if (!r?.token) throw new Error("no-token");
    setAdminToken(r.token);
    return r;
  },
  async me() {
    // Make sure your backend has /admin/me protected by requireAdmin
    return api("/admin/me");
  },
  logout() { setAdminToken(""); },
};

export const adminUsers = {
  list(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return api(`/admin/users${qs ? `?${qs}` : ""}`);
  },
  adjustBalance({ userId, delta, reason }) {
    return api(`/admin/users/${userId}/balance`, {
      method: "POST",
      body: { delta, reason },
    });
  },
  ban({ userId, is }) {
    return api(`/admin/users/${userId}/ban`, {
      method: "POST",
      body: { is },
    });
  },
  logs({ userId, limit = 50 }) {
    return api(`/admin/users/${userId}/logs?limit=${limit}`);
  },
};

async function handle(res) {
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) {
    const msg = data?.error || data?.message || `HTTP ${res.status}`;
    // TEMP: surface details while debugging
    alert(`Admin API error: ${msg}`);
    const err = new Error(msg);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}


export const adminTx = {
  list(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return api(`/admin/transactions${qs ? `?${qs}` : ""}`);
  },
};

export const adminGames = {
  getAll() { return api(`/admin/games`); },
  save(game, payload) {
    return api(`/admin/games/${game}`, { method: "POST", body: payload });
  },
  toggle(game, enabled) {
    return api(`/admin/games/${game}/toggle`, {
      method: "POST", body: { enabled },
    });
  },
};
