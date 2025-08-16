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
  console.log('[api] set userId:', id);
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
   * Low-level bet call. Use the helpers below in UI code.
   * @param {'dice'|'slot'|'crash'|'coinflip'} game
   * @param {number} stakeCoins
   * @param {Object} [input]
   */
  async bet({ game, stakeCoins, input }) {
    // sanitize stake on the client (server floors too, but this avoids surprises)
    const stake = Math.max(1, Math.floor(Number(stakeCoins || 0)));
    return api("/games/bet", { method: "POST", body: { game, stakeCoins: stake, input } });
  },

  // --- Convenience wrappers (use these in components) ---

  /** Coinflip: pick 'H' or 'T' */
  coinflip(stakeCoins, pick = "H") {
    return this.bet({ game: "coinflip", stakeCoins, input: { pick } });
  },

  /** Dice: pick 1..6 */
  dice(stakeCoins, pick = 3) {
    return this.bet({ game: "dice", stakeCoins, input: { pick } });
  },

  /** Slot: no input */
  slot(stakeCoins) {
    return this.bet({ game: "slot", stakeCoins });
  },

  /** Crash: choose a cashout multiplier (e.g. 1.8) */
  crash(stakeCoins, cashoutX = 1.8) {
    return this.bet({ game: "crash", stakeCoins, input: { cashoutX } });
  },

  /** Last 100 rounds for the user */
  history() {
    return api("/games/history");
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
// Poll AFTER login; do NOT call onUpdate if fetch fails
export function pollBalance(onUpdate, intervalMs = 4000) {
  let alive = true;

  async function tick() {
    try {
      const coins = await getBalance(); // number
      if (alive && Number.isFinite(coins)) onUpdate?.(coins);
    } catch {
      // swallow errors; don't push 0 into UI
    } finally {
      if (alive) setTimeout(tick, intervalMs);
    }
  }

  // caller will start this AFTER login
  return () => {
    // noop until started
  };
}

// --- Named exports expected by MainLayout.jsx ---
// Uses Telegram WebApp.initData, calls backend /auth/login, returns normalized user
export async function telegramAuth() {
  const tg = window.Telegram?.WebApp;
  const initData = tg?.initData || "";

  // auth.login sets localStorage userId for x-user-id header
  const data = await auth.login(initData, tg?.initDataUnsafe?.user || null);
  // Normalize to what MainLayout expects
  return {
    id: data._id,
    username: data.username || tg?.initDataUnsafe?.user?.username || "Guest",
    first_name: data.firstName || tg?.initDataUnsafe?.user?.first_name || "",
    last_name: data.lastName || tg?.initDataUnsafe?.user?.last_name || "",
    photo_url: data.photoUrl || tg?.initDataUnsafe?.user?.photo_url || "",
    coins: data.coins ?? 0,
  };
}

// replace your current getBalance with this numeric wrapper
export async function getBalance() {
  const res = await api("/wallet/balance");   // -> { coins: <number or string> }
  const num = Number(res?.coins);
  if (!Number.isFinite(num)) throw new Error("bad-balance");
  return num;                                  // <- ALWAYS a number
}




