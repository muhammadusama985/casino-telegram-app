// src/admin/AdminApi.js

// --- Base URL from env (no trailing slash). Fallback to your ngrok tunnel.
const BASE_URL =
  (import.meta.env.VITE_API ? import.meta.env.VITE_API.replace(/\/+$/, "") : "") ||
  "https://d16f8a6727da.ngrok-free.app";

// Detect if we're talking to an ngrok URL (so we can skip the warning page)
const IS_NGROK = BASE_URL.includes("ngrok");

const LS_ADMIN_TOKEN = "adminToken";

// ---------- token helpers ----------
export function getAdminToken() {
  return localStorage.getItem(LS_ADMIN_TOKEN) || "";
}
export function setAdminToken(t) {
  if (!t) localStorage.removeItem(LS_ADMIN_TOKEN);
  else localStorage.setItem(LS_ADMIN_TOKEN, t);
}

// ---------- headers ----------
function getHeaders(extra = {}) {
  const token = getAdminToken();

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };

  // For ngrok, bypass the browser interstitial
  if (IS_NGROK) headers["ngrok-skip-browser-warning"] = "1";

  // TEMP: show token once per reload (helps confirm it's sent)
  if (token && !window.__ADMIN_TOKEN_ALERTED__) {
    window.__ADMIN_TOKEN_ALERTED__ = true;
    alert(`Admin token (first 20 chars): ${token.slice(0, 20)}…`);
  }

  return headers;
}

// ---------- response handler ----------
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
    // TEMP while debugging:
    alert(`Admin API error: ${msg}`);
    const err = new Error(msg);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

// ---------- BONUSES (Daily + Referral) ----------
export const adminBonuses = {
  get() {
    return api('/admin/bonuses');
  },
  save(partial) {
    // partial can include { dailyBonusCoins } or { referralPer10Coins }
    return api('/admin/bonuses', { method: 'POST', body: partial });
  },
};


// ---------- generic API wrapper ----------
export async function api(path, { method = "GET", body, headers } = {}) {
  // Ensure leading slash in path
  const p = path.startsWith("/") ? path : `/${path}`;

  // For ngrok, add the skip param too (belt & suspenders)
  const url = IS_NGROK
    ? `${BASE_URL}${p}${p.includes("?") ? "&" : "?"}ngrok-skip-browser-warning=1`
    : `${BASE_URL}${p}`;

  const res = await fetch(url, {
    method,
    headers: getHeaders(headers),
    body: body ? JSON.stringify(body) : undefined,
  });
  return handle(res);
}

// ---------- AUTH ----------
export const adminAuth = {
  async login(password) {
    const email = import.meta.env.VITE_ADMIN_EMAIL || "admin@casino.local";
    const r = await api("/admin/auth/login", {
      method: "POST",
      body: { email, password },
    });
    if (!r?.token) throw new Error("no-token");
    setAdminToken(r.token);
    return r;
  },
  async me() {
    return api("/admin/me"); // make sure your backend exposes this behind requireAdmin
  },
  logout() {
    setAdminToken("");
  },
};

// ---------- USERS ----------
export const adminUsers = {
  /**
   * List users with optional search + pagination.
   * @param {Object} params
   * @param {string} [params.query=""]
   * @param {number} [params.page=1]
   * @param {number} [params.limit=20]
   */
  async list(params = {}) {
    const query = params.query ?? "";
    const page = Number.isFinite(params.page) ? params.page : 1;
    const limit = Number.isFinite(params.limit) ? params.limit : 20;
    const qs = new URLSearchParams({
      query,
      page: String(page),
      limit: String(limit),
    }).toString();
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

// --- at bottom of file ---
// in src/admin/AdminApi.js
export const adminReferrals = {
  list(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return api(`/admin/referrals/list${qs ? `?${qs}` : ""}`);
  },
  exportCSV(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return api(`/admin/referrals/export${qs ? `?${qs}` : ""}`);
  },
  top(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return api(`/admin/referrals/top${qs ? `?${qs}` : ""}`);
  },
};




// ---------- TRANSACTIONS ----------
export const adminTx = {
  list(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return api(`/admin/transactions${qs ? `?${qs}` : ""}`);
  },
  listBets(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return api(`/admin/gamebets${qs ? `?${qs}` : ""}`);
  },
};


// ---------- GAMES / RTP ----------
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

    list() {
    return api("/admin/rtp");
  },

  // Set global RTP for a game
  setGlobal(game, targetRTP) {
    return api("/admin/rtp", {
      method: "POST",
      body: { scope: "game", game, targetRTP },
    });
  },

  // Set per-user RTP override
  setUser(userId, game, targetRTP) {
    return api("/admin/rtp", {
      method: "POST",
      body: { scope: "user", userId, game, targetRTP },
    });
  },
};


// ---------- NOTIFICATIONS ----------
export const adminNotifications = {
  send({ segment, title, body }) {
    return api('/admin/notifications', { method: 'POST', body: { segment, title, body } });
  },
  status(id) {
    return api(`/admin/notifications/${id}`);
  },
};


// src/admin/AdminApi.js (add near other exports)
export const adminSecurity = {
  // audits already exist on backend as GET /admin/audits
  listAudits({ userId, limit = 100 } = {}) {
    const qs = new URLSearchParams({ ...(userId ? { userId } : {}), limit: String(limit) }).toString();
    return api(`/admin/audits${qs ? `?${qs}` : ""}`);
  },

  // 2FA (routes below in backend section)
  setup2FA() {
    return api("/admin/security/2fa/setup", { method: "POST" });
  },
  enable2FA({ token }) {
    return api("/admin/security/2fa/enable", { method: "POST", body: { token } });
  },
  reset2FA() {
    return api("/admin/security/2fa/reset", { method: "POST" });
  },
};

