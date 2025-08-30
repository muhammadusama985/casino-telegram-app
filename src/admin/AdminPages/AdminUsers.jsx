// src/admin/AdminPages/AdminUsers.jsx
import { useEffect, useMemo, useState } from "react";
import { adminUsers, api as adminApiRaw } from "../AdminApi"; // <-- uses your AdminApi.js

export default function AdminUsers() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // small on-screen debug to verify you're hitting the correct server
  const [sys, setSys] = useState(null);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  // --- modal state (2 & 2a) ---
  const [adjustUser, setAdjustUser] = useState(null); // { _id, username, ... }
  const [delta, setDelta] = useState("");
  const [banUser, setBanUser] = useState(null);       // { _id, username, banned, ... }
  const [banReason, setBanReason] = useState("");

  async function fetchList({ query = q, pageNum = page } = {}) {
    setLoading(true);
    setErr("");
    try {
      // Debug ping: confirms FE talks to the same backend (shows dbName & totalUsers)
      try {
        const s = await adminApiRaw("/admin/debug/system");
        setSys(s);
      } catch {
        setSys(null);
      }

      const res = await adminUsers.list({ query, page: pageNum, limit });
      setRows(res.items || []);
      setTotal(res.total || 0);
      setPage(res.page || 1);
    } catch (e) {
      setErr(e?.message || "Failed to load users");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchList(); // initial load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- handlers for modals -----
  async function doAdjust() {
    try {
      const amt = Number(delta);
      if (!Number.isFinite(amt) || amt === 0) return alert("Enter a non-zero number");
      await adminUsers.adjustBalance({ userId: adjustUser._id, delta: amt, reason: "manual" });
      setAdjustUser(null);
      setDelta("");
      await fetchList(); // refresh
    } catch (e) {
      alert(e?.message || "Adjust failed");
    }
  }

  async function doBan(is) {
    try {
      await adminUsers.ban({ userId: banUser._id, is, reason: banReason });
      setBanUser(null);
      setBanReason("");
      await fetchList(); // refresh
    } catch (e) {
      alert(e?.message || "Ban/unban failed");
    }
  }

  function onSearch() {
    setPage(1);
    fetchList({ query: q, pageNum: 1 });
  }

  return (
    <div className="relative space-y-4 bg-black text-yellow-300">
      {/* Background gold glows (purely decorative) */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-32 h-[36rem] w-[36rem] rounded-full blur-3xl opacity-15 bg-[radial-gradient(closest-side,rgba(250,204,21,0.35),transparent)] motion-safe:animate-[pulse_3.5s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-8rem] right-[-8rem] h-[32rem] w-[32rem] rounded-full blur-3xl opacity-10 bg-[radial-gradient(closest-side,rgba(234,179,8,0.35),transparent)] motion-safe:animate-[pulse_4s_ease-in-out_infinite]" />
      </div>

      {/* Header + search */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-300 to-amber-300 drop-shadow-[0_0_18px_rgba(250,204,21,0.45)]">
            Users
          </h1>
          <p className="text-sm text-yellow-300/85">Search, filter, adjust balances, and ban/unban.</p>
        </div>
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            placeholder="Search by username, tgId, referralCode…"
            className="bg-black/60 border border-yellow-500/25 rounded-lg px-3 py-2 text-sm w-64 text-yellow-100 placeholder:text-yellow-300/60 outline-none focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-300 transition"
          />
          <button
            onClick={onSearch}
            className="px-3 py-2 rounded-lg text-sm text-black bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-200 hover:from-yellow-200 hover:to-amber-200 ring-1 ring-yellow-400/30 shadow-[0_0_20px_rgba(250,204,21,0.35)] hover:shadow-[0_0_28px_rgba(250,204,21,0.45)] active:translate-y-px transition"
          >
            Search
          </button>
        </div>
      </header>

      {/* Table */}
      <div className="relative rounded-2xl border border-yellow-500/30 ring-1 ring-yellow-400/20 bg-zinc-950/90 overflow-hidden shadow-[0_0_30px_rgba(250,204,21,0.28)]">
        {/* subtle inner glow */}
        <div className="pointer-events-none absolute inset-0 opacity-60 mix-blend-screen bg-[radial-gradient(120%_60%_at_50%_120%,rgba(250,204,21,0.08),transparent)]" />
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead className="bg-black/80">
            <tr className="[&>th]:text-left [&>th]:px-3 [&>th]:py-2 [&>th]:text-yellow-200 [&>th]:border-b [&>th]:border-yellow-500/40 [&>th:first-child]:border-l [&>th:last-child]:border-r [&>th]:border-yellow-500/30">
              <th>User</th>
              <th>tgId</th>
              <th>Coins</th>
              <th>Referrals</th>
              <th>Ref Code</th>
              <th>Status</th>
              <th className="w-56">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-black/40">
            {loading && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-yellow-300/80">
                  Loading…
                </td>
              </tr>
            )}

            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-yellow-300/80">
                  No users found.
                </td>
              </tr>
            )}

            {!loading &&
              rows.map((u) => (
                <tr
                  key={u._id}
                  className="[&>td]:px-3 [&>td]:py-2 [&>td]:border-b [&>td]:border-yellow-500/20 hover:bg-black/60 transition-colors"
                >
                  <td className="border-l border-yellow-500/20">
                    <div className="font-medium text-yellow-100 drop-shadow-[0_0_6px_rgba(250,204,21,0.35)]">
                      {u.username ||
                        `${u.firstName || ""} ${u.lastName || ""}`.trim() ||
                        "—"}
                    </div>
                    <div className="text-xs text-yellow-300/70">{u._id}</div>
                  </td>
                  <td>{u.tgId || "—"}</td>
                  <td>{Number(u.coins || 0).toFixed(2)}</td>
                  <td>{u.referralCount ?? 0}</td>
                  <td>{u.referralCode || "—"}</td>
                  <td>
                    {u?.banned?.is ? (
                      <span className="text-red-400">banned</span>
                    ) : (
                      <span className="text-emerald-400">active</span>
                    )}
                  </td>
                  <td className="flex gap-2 flex-wrap border-r border-yellow-500/20">
                    <button
                      onClick={() => setAdjustUser(u)}
                      className="px-2 py-1 rounded bg-black/60 hover:bg-black/80 text-yellow-200 ring-1 ring-yellow-500/30 shadow-[0_0_12px_rgba(250,204,21,0.25)] transition"
                    >
                      Adjust
                    </button>
                    {u?.banned?.is ? (
                      <button
                        onClick={() => {
                          setBanUser(u);
                          setBanReason("");
                        }}
                        className="px-2 py-1 rounded bg-black/60 hover:bg-black/80 text-yellow-200 ring-1 ring-yellow-500/30 shadow-[0_0_12px_rgba(250,204,21,0.25)] transition"
                      >
                        Unban
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setBanUser(u);
                          setBanReason("");
                        }}
                        className="px-2 py-1 rounded bg-red-600/80 hover:bg-red-500 text-white ring-1 ring-red-400/40 shadow-[0_0_14px_rgba(239,68,68,0.35)] transition"
                      >
                        Ban
                      </button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Footer row: counts & pagination */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-yellow-300/70">
          total: {total} • page: {page}/{pages}
        </div>

        {pages > 1 && (
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => fetchList({ pageNum: page - 1 })}
              className="px-3 py-1 rounded bg-black/60 hover:bg-black/80 disabled:opacity-50 text-yellow-200 ring-1 ring-yellow-500/30 shadow-[0_0_12px_rgba(250,204,21,0.25)] transition"
            >
              Prev
            </button>
            <button
              disabled={page >= pages}
              onClick={() => fetchList({ pageNum: page + 1 })}
              className="px-3 py-1 rounded bg-black/60 hover:bg-black/80 disabled:opacity-50 text-yellow-200 ring-1 ring-yellow-500/30 shadow-[0_0_12px_rgba(250,204,21,0.25)] transition"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {err && <div className="text-sm text-red-400">{err}</div>}

      {/* Debug inspector (helps confirm the FE base URL & backend match) */}
      <details className="text-xs text-yellow-300/70">
        <summary>Debug</summary>
        <pre className="whitespace-pre-wrap break-all">
{JSON.stringify(
  {
    base: import.meta.env.VITE_API || "(no VITE_API)",
    sys,                           // { ok, dbName, totalUsers } if reachable
    total,
    rowsLen: rows.length,
  },
  null,
  2
)}
        </pre>
      </details>

      {/* =========================
          MODALS
         ========================= */}

      {/* Adjust Balance Modal */}
      {adjustUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="w-full max-w-md rounded-2xl border border-yellow-500/30 ring-1 ring-yellow-400/20 bg-zinc-950 p-4 shadow-[0_0_30px_rgba(250,204,21,0.28)]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-yellow-100 drop-shadow-[0_0_12px_rgba(250,204,21,0.55)]">Adjust Balance</h3>
              <button
                onClick={() => { setAdjustUser(null); setDelta(""); }}
                className="px-2 py-1 rounded bg-black/60 hover:bg-black/80 text-xs text-yellow-200 ring-1 ring-yellow-500/30 transition"
              >
                ✕
              </button>
            </div>

            <div className="text-sm mb-3">
              <div className="text-yellow-300/85">User</div>
              <div className="font-medium text-yellow-100">
                {adjustUser.username || `${adjustUser.firstName || ""} ${adjustUser.lastName || ""}`.trim() || "—"}
              </div>
              <div className="text-xs text-yellow-300/70">{adjustUser._id}</div>
            </div>

            <label className="text-sm text-yellow-300/85">Delta (use negative to remove)</label>
            <input
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              placeholder="+100 or -100"
              className="w-full mt-1 bg-black/60 border border-yellow-500/25 rounded-lg px-3 py-2 text-sm text-yellow-100 placeholder:text-yellow-300/60 outline-none focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-300 transition"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => { setAdjustUser(null); setDelta(""); }}
                className="px-3 py-2 rounded-lg bg-black/60 hover:bg-black/80 text-sm text-yellow-200 ring-1 ring-yellow-500/30 shadow-[0_0_12px_rgba(250,204,21,0.25)] transition"
              >
                Cancel
              </button>
              <button
                onClick={doAdjust}
                className="px-3 py-2 rounded-lg text-sm text-black bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-200 hover:from-yellow-200 hover:to-amber-200 ring-1 ring-yellow-400/30 shadow-[0_0_20px_rgba(250,204,21,0.35)] hover:shadow-[0_0_26px_rgba(250,204,21,0.45)] active:translate-y-px transition"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ban / Unban Modal */}
      {banUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="w-full max-w-md rounded-2xl border border-yellow-500/30 ring-1 ring-yellow-400/20 bg-zinc-950 p-4 shadow-[0_0_30px_rgba(250,204,21,0.28)]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-yellow-100 drop-shadow-[0_0_12px_rgba(250,204,21,0.55)]">{banUser?.banned?.is ? "Unban User" : "Ban User"}</h3>
              <button
                onClick={() => { setBanUser(null); setBanReason(""); }}
                className="px-2 py-1 rounded bg-black/60 hover:bg-black/80 text-xs text-yellow-200 ring-1 ring-yellow-500/30 transition"
              >
                ✕
              </button>
            </div>

            <div className="text-sm mb-3">
              <div className="text-yellow-300/85">User</div>
              <div className="font-medium text-yellow-100">
                {banUser.username || `${banUser.firstName || ""} ${banUser.lastName || ""}`.trim() || "—"}
              </div>
              <div className="text-xs text-yellow-300/70">{banUser._id}</div>
            </div>

            {!banUser?.banned?.is && (
              <>
                <label className="text-sm text-yellow-300/85">Reason</label>
                <textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Reason (optional)"
                  className="w-full mt-1 bg-black/60 border border-yellow-500/25 rounded-lg px-3 py-2 text-sm h-24 text-yellow-100 placeholder:text-yellow-300/60 outline-none focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-300 transition"
                />
              </>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => { setBanUser(null); setBanReason(""); }}
                className="px-3 py-2 rounded-lg bg-black/60 hover:bg-black/80 text-sm text-yellow-200 ring-1 ring-yellow-500/30 shadow-[0_0_12px_rgba(250,204,21,0.25)] transition"
              >
                Cancel
              </button>

              {banUser?.banned?.is ? (
                <button
                  onClick={() => doBan(false)}
                  className="px-3 py-2 rounded-lg text-sm text-black bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-200 hover:from-yellow-200 hover:to-amber-200 ring-1 ring-yellow-400/30 shadow-[0_0_20px_rgba(250,204,21,0.35)] hover:shadow-[0_0_26px_rgba(250,204,21,0.45)] active:translate-y-px transition"
                >
                  Unban
                </button>
              ) : (
                <button
                  onClick={() => doBan(true)}
                  className="px-3 py-2 rounded-lg bg-red-600/80 hover:bg-red-500 text-sm text-white ring-1 ring-red-400/40 shadow-[0_0_18px_rgba(239,68,68,0.40)] transition"
                >
                  Ban
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
