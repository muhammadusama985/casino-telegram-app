// src/api.js
// Central API client for your Telegram Casino frontend (Vite)

// ---------- config ----------
const BASE_URL = import.meta.env.VITE_API?.replace(/\/+$/, "") || "http://localhost:8080";

// localStorage keys
const LS_USER_ID = "userId";          // Mongo _id from /auth/login
const LS_TG_PROFILE = "tgProfile";    // Optional cache of Telegram user profile

// ---------- internal helpers ----------
function getUserId() {
  return localStorage.getItem(LS_USER_ID) || "";
}

function setUserId(id) {
  if (!id) return localStorage.removeItem(LS_USER_ID);
  localStorage.setItem(LS_USER_ID, id);
}

function setTgProfile(obj) {
  if (!obj) return localStorage.removeItem(LS_TG_PROFILE);
  localStorage.setItem(LS_TG_PROFILE, JSON.stringify(obj));
}

function getHeaders(extra = {}) {
  const uid = getUserId();
  return {
    "Content-Type": "application/json",
    ...(uid ? { "x-user-id": uid } : {}),
    ...extra,
  };
}

async function handle(res) {
  // Normalize errors
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) {
    const msg = data?.error || data?.message || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

// Generic request (exported for one-off calls if needed)
export async function api(path, { method = "GET", body, headers } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: getHeaders(headers),
    body: body ? JSON.stringify(body) : undefined,
  });
  return handle(res);
}

// ---------- Auth ----------
export const auth = {
  /**
   * Telegram WebApp login: pass window.Telegram.WebApp.initData (string)
   * Returns user: { _id, tgId, username, photoUrl, coins, wallets }
   */
  async login(initData, tgProfileCache = null) {
    const data = await api("/auth/login", {
      method: "POST",
      body: { initData },
    });
    // Persist Mongo userId for x-user-id header
    setUserId(data._id);
    if (tgProfileCache) setTgProfile(tgProfileCache);
    return data;
  },

  logout() {
    setUserId("");
    setTgProfile(null);
  },

  getUserId,
};

// ---------- Deposits ----------
export const deposits = {
  /**
   * Create a unique deposit intent → returns { adminAddress, comment, minAmountTon }
   * Requires x-user-id (after login)
   */
  async createIntent() {
    return api("/deposits/intent", { method: "POST" });
  },
};

// ---------- Wallet ----------
export const wallet = {
  /**
   * Link a user's TON address (Tonkeeper address string)
   */
  async connect(address) {
    return api("/wallet/connect", { method: "POST", body: { address } });
  },

  /**
   * Get current in-app coin balance
   */
  async getBalance() {
    return api("/wallet/balance");
  },

  /**
   * Get last N transactions (server returns latest 100)
   */
  async getHistory() {
    return api("/wallet/history");
  },
};

// ---------- Games ----------
export const games = {
  /**
   * Place a bet
   * @param {Object} p
   * @param {'dice'|'slot'|'crash'|'coinflip'} p.game
   * @param {number} p.stakeCoins
   * @param {Object} [p.input] - game-specific input (e.g., { pick: 3 } for dice)
   */
  async bet({ game, stakeCoins, input }) {
    return api("/games/bet", { method: "POST", body: { game, stakeCoins, input } });
  },
};

// ---------- Transactions / Users (optional expansion) ----------
export const tx = {
  async list() {
    const r = await wallet.getHistory();
    return r?.list || [];
  },
};

export const users = {
  getUserId,
  getCachedTelegramProfile() {
    const raw = localStorage.getItem(LS_TG_PROFILE);
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  },
};

// ---------- Convenience: polling helpers ----------
/**
 * Poll user balance every `intervalMs` and invoke `onUpdate(coins)`
 * Returns a stop function.
 */
export function pollBalance(onUpdate, intervalMs = 5000) {
  let alive = true;

  async function tick() {
    try {
      const { coins } = await wallet.getBalance();
      if (alive) onUpdate?.(coins);
    } catch (e) {
      // swallow or surface as toast
      // console.warn("pollBalance error:", e.message);
    } finally {
      if (alive) setTimeout(tick, intervalMs);
    }
  }

  tick();
  return () => { alive = false; };
}
