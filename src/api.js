

// src/api.js
const BASE_URL = import.meta.env.VITE_API?.replace(/\/+$/, "") || "http://localhost:8080";

const LS_USER_ID = "userId";
const LS_TG_PROFILE = "tgProfile";

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
    "Content-Type": "application/json", "ngrok-skip-browser-warning": "true", 
    ...(uid ? { "x-user-id": uid } : {}),
    ...extra,
  };
}

async function handle(res) {
  const text = await res.text();
  const trimmed = text.trim().toLowerCase();

  // Catch HTML/doctype early
  if (trimmed.startsWith("<!doctype") || trimmed.startsWith("<html")) {
    const snippet = text.slice(0, 200).replace(/\s+/g, " ");
    const err = new Error(`Non-JSON response. Snippet: ${snippet}`);
    err.status = res.status;
    err.payload = { raw: snippet };
    throw err;
  }

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
    console.error("[api.handle] Error:", err.status, err.message, err.payload);
    throw err;
  }
  return data;
}

export async function crashJoin(stakeCoins) {
  const res = await fetch('/crash/join', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-user-id': window.userId },
    body: JSON.stringify({ stakeCoins })
  });
  if (!res.ok) throw new Error((await res.json().catch(()=>({}))).error || 'join-failed');
  return res.json(); // { ok, roundId, crashAt, newBalance }
}

export async function crashCashout(roundId, atMult) {
  const res = await fetch('/crash/cashout', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-user-id': window.userId },
    body: JSON.stringify({ roundId, atMult })
  });
  if (!res.ok) throw new Error((await res.json().catch(()=>({}))).error || 'cashout-failed');
  return res.json(); // { ok, roundId, result, payout, newBalance, details }
}



export async function api(path, { method = "GET", body, headers } = {}) {
  console.log('[api] request:', method, BASE_URL + path, body || null);
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: getHeaders(headers),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await handle(res);
  console.log('[api] response:', data);
  return data;
}

// ---------- Auth ----------
export const auth = {
  async login(initData, tgProfileCache = null) {
    console.log('[auth.login] initData length:', (initData || '').length);
    const data = await api("/auth/login", {
      method: "POST",
      body: { initData },
    });
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

// ---------- Rewards ----------
export const rewards = {
  dailyClaim() {
    console.log('[rewards.dailyClaim] POST /rewards/daily-claim');
    return api("/rewards/daily-claim", { method: "POST" });
  },
};

// ---------- Referrals ----------
// src/api.js
// src/api.js (only this part)
// src/api.js (replace the referrals export with this)
// in src/api.js
// ---------- Referrals ----------
export const referrals = {
  async summary() {
    const data = await api("/referrals/summary");
    const u = data?.user ? data.user : data || {};
    const link = u.referralLink || u.referralLinkCached || "";
    return { ...u, referralLink: link };
  },

  link() {
    return api("/referrals/link");
  },

  // NEW: fetch by user id (explicit button flow)
  async getLink(userId) {
    console.log('[referrals.getLink] POST /referrals/get-link userId=', userId);
    const r = await api("/referrals/get-link", {
      method: "POST",
      body: { userId },
    });
    // normalize shape for UI convenience
    const link = r?.referralLink || r?.referralLinkCached || "";
    return { ...r, referralLink: link };
  },
    // NEW: enter someone else's referral code once
  async applyCode(code) {
    return api("/referrals/apply-code", {
      method: "POST",
      body: { code },
    });
  },

};

// ---------- Users ----------
export const users = {
  getUserId,

  getCachedTelegramProfile() {
    const raw = localStorage.getItem(LS_TG_PROFILE);
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  },

  async me() {
    const r = await api("/users/me"); // -> { user: {...} }
    if (!r || !r.user) {
      throw new Error("no-user");
    }
    const u = r.user || {};
    const link = u.referralLink || u.referralLinkCached || "";
    if (!link) {
    }
    const normalized = { ...u, referralLink: link };
    try { console.log?.("[api.users.me] normalized:", normalized); } catch {}
    return normalized;
  },
};

// Helpers
export async function telegramAuth() {
  const tg = window.Telegram?.WebApp;
  const initData = tg?.initData || "";
  const data = await auth.login(initData, tg?.initDataUnsafe?.user || null);

  const link = data.referralLink || data.referralLinkCached || "";

  return {
    id: data._id,
    username: data.username || tg?.initDataUnsafe?.user?.username || "Guest",
    first_name: data.firstName || tg?.initDataUnsafe?.user?.first_name || "",
    last_name: data.lastName || tg?.initDataUnsafe?.user?.last_name || "",
    photo_url: data.photoUrl || tg?.initDataUnsafe?.user?.photo_url || "",
    coins: data.coins ?? 0,
    referralCode: data.referralCode,
    referralLink: link,               // normalized here too
    referralLinkCached: data.referralLinkCached,
    referredBy: data.referredBy,
    referralCount: data.referralCount,
  };
}







// ---------- Wallet ----------
export const wallet = {
  async connect(address) {
    return api("/wallet/connect", { method: "POST", body: { address } });
  },
  async getBalance() {
    return api("/wallet/balance");
  },
  async getHistory() {
    return api("/wallet/history");
  },
};



// ---------- Games ----------
export const games = {
  async bet({ game, stakeCoins, input }) {
    const stake = Math.max(1, Math.floor(Number(stakeCoins || 0)));
    return api("/games/bet", { method: "POST", body: { game, stakeCoins: stake, input } });
  },
  coinflip(stakeCoins, pick = "H", extraInput = {}) {
    return this.bet({ game: "coinflip", stakeCoins, input: { pick, ...extraInput } });
  },
  dice(stakeCoins, a2, a3) {
    const input = {};
    if (a2 && typeof a2 === "object") Object.assign(input, a2);
    else if (a2 !== undefined) input.pick = a2;
    if (a3 && typeof a3 === "object") Object.assign(input, a3);
    return this.bet({ game: "dice", stakeCoins, input });
  },
  slot(stakeCoins) {
    return this.bet({ game: "slot", stakeCoins });
  },
  crash(stakeCoins, cashoutX = 1.8) {
    return this.bet({ game: "crash", stakeCoins, input: { cashoutX } });
  },
  history() {
    return api("/games/history");
  },
};

// ---------- Users ----------


  /**
   * GET /users/me
   * Always returns a user object where `referralLink` is guaranteed:
   *   referralLink := user.referralLink || user.referralLinkCached || ""
   */


// Helpers
// in src/api.js


export async function getBalance() {
  const res = await api("/wallet/balance");
  const num = Number(res?.coins);
  if (!Number.isFinite(num)) {
    throw new Error("bad-balance");
  }
  return num;
}



// ---------- Sports ----------
export const sports = {
  // Football via your backend proxy to football-data.org
  football(status = "LIVE") {
    // status: LIVE | IN_PLAY | SCHEDULED | FINISHED ...
    return api(`/api/sports/live?status=${encodeURIComponent(status)}`);
  },

  // NBA via your backend proxy to balldontlie live box scores
  nba() {
    return api(`/api/sports/nba/live`);
  },

  // Cricket via your backend proxy to CricketData currentMatches
  cricket() {
    return api(`/api/sports/cricket/live`);
  },

  // Helper: try LIVE -> IN_PLAY -> SCHEDULED (handy for UI)
  async footballBest() {
    const order = ["LIVE", "IN_PLAY", "SCHEDULED"];
    for (const st of order) {
      try {
        const r = await this.football(st);
        if (r?.matches?.length) return r;
      } catch {
        /* try next */
      }
    }
    return { matches: [], count: 0 };
  },
};
