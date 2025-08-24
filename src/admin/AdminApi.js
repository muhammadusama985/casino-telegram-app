// src/admin/adminApi.js

const BASE_URL =
  import.meta.env.VITE_API?.replace(/\/+$/, "") || "https://b33ff2158e32.ngrok-free.app ";


// localStorage keys
const LS_ADMIN_TOKEN = "adminToken";

// ---- token helpers ----
export function getAdminToken() {
  return localStorage.getItem(LS_ADMIN_TOKEN) || "";
}
export function setAdminToken(t) {
  if (!t) localStorage.removeItem(LS_ADMIN_TOKEN);
  else localStorage.setItem(LS_ADMIN_TOKEN, t);
}

// ---- headers ----
function getHeaders(extra = {}) {
  const token = getAdminToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    // Optional: send origin so backend can restrict (you can enforce it server-side)
    "x-admin-origin": window.location.origin,
    ...extra,
  };
}

// ---- response handler ----
async function handle(res) {
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const msg = data?.error || data?.message || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

// ---- generic api ----
export async function api(path, { method = "GET", body, headers } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: getHeaders(headers),
    body: body ? JSON.stringify(body) : undefined,
  });
  return handle(res);
}

// ---- auth ----
export const adminAuth = {
  async login(password) {
    // your backend: POST /admin/login -> { token }
    const r = await api("/admin/login", {
      method: "POST",
      body: { password },
    });
    if (!r?.token) throw new Error("no-token");
    setAdminToken(r.token);
    return r;
  },
  async me() {
    // your backend: GET /admin/me -> { admin: {...} }
    return api("/admin/me");
  },
  logout() {
    setAdminToken("");
  },
};

// ---- stubs for later wiring ----
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

export const adminTx = {
  list(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return api(`/admin/transactions${qs ? `?${qs}` : ""}`);
  },
};

export const adminGames = {
  getAll() {
    return api(`/admin/games`);
  },
  save(game, payload) {
    return api(`/admin/games/${game}`, { method: "POST", body: payload });
  },
  toggle(game, enabled) {
    return api(`/admin/games/${game}/toggle`, {
      method: "POST",
      body: { enabled },
    });
  },
};
