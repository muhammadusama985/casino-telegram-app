// src/admin/AdminApi.js

const BASE_URL =
  import.meta.env.VITE_API?.replace(/\/+$/, "") || "https://b33ff2158e32.ngrok-free.app";

const LS_ADMIN_TOKEN = "adminToken";

export function getAdminToken() {
  return localStorage.getItem(LS_ADMIN_TOKEN) || "";
}
export function setAdminToken(t) {
  if (!t) {
    localStorage.removeItem(LS_ADMIN_TOKEN);
  } else {
    localStorage.setItem(LS_ADMIN_TOKEN, t);
    // 🔔 Alert once when the token is stored
    alert("🔑 Admin token saved in localStorage:\n\n" + t);
    console.log("[AdminAPI] token saved:", t);
  }
}

// ---- DEBUG FLAGS (so we don’t alert a thousand times) ----
let __lastTokenShown = null;

function getHeaders(extra = {}) {
  const token = getAdminToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };

  if (token && token !== __lastTokenShown) {
    __lastTokenShown = token;
    // 🔔 Alert whenever token is actually attached to a request
    alert("🚀 Sending request with token:\n\n" + token);
    console.log("[AdminAPI] attaching Authorization header:", "Bearer " + token);
  }

  if (!token) {
    console.warn("[AdminAPI] no admin token present; /admin/* calls will 401.");
  }

  return headers;
}

async function handle(res) {
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) {
    const msg = data?.error || data?.message || `HTTP ${res.status}`;
    alert(`❌ Admin API error: ${msg}`);
    const err = new Error(msg);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

export async function api(path, { method = "GET", body, headers } = {}) {
  const url = `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
  const hdrs = getHeaders(headers);

  console.log("[AdminAPI] fetch", method, url, {
    hasAuth: !!hdrs.Authorization,
    body,
  });

  const res = await fetch(url, {
    method,
    headers: hdrs,
    body: body ? JSON.stringify(body) : undefined,
  });
  return handle(res);
}

// ---- auth ----
export const adminAuth = {
  async login(password) {
    const email = import.meta.env.VITE_ADMIN_EMAIL || "admin@casino.local";
    const r = await api("/admin/auth/login", {
      method: "POST",
      body: { email, password },
    });
    if (!r?.token) throw new Error("no-token");
    setAdminToken(r.token); // 🔔 this will alert the token saved
    return r;
  },
  async me() {
    return api("/admin/me"); // backend must have this route
  },
  logout() { setAdminToken(""); },
};

// ---- users ----
export const adminUsers = {
  async list(params = {}) {
    const query = params.query ?? "";
    const page  = Number.isFinite(params.page)  ? params.page  : 1;
    const limit = Number.isFinite(params.limit) ? params.limit : 20;
    const qs = new URLSearchParams({ query, page: String(page), limit: String(limit) }).toString();
    return api(`/admin/users?${qs}`);
  },
  adjustBalance({ userId, delta, reason }) {
    return api(`/admin/users/${userId}/balance`, {
      method: "POST",
      body: { delta, reason },
    });
  },
  ban({ userId, is, reason = "" }) {
    return api(`/admin/users/${userId}/ban`, {
      method: "POST",
      body: { is, reason },
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
