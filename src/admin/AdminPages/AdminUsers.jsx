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

  const [sys, setSys] = useState(null);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  const [adjustUser, setAdjustUser] = useState(null);
  const [delta, setDelta] = useState("");
  const [banUser, setBanUser] = useState(null);
  const [banReason, setBanReason] = useState("");

  async function fetchList({ query = q, pageNum = page } = {}) {
    setLoading(true);
    setErr("");
    try {
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
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function doAdjust() {
    try {
      const amt = Number(delta);
      if (!Number.isFinite(amt) || amt === 0) return alert("Enter a non-zero number");
      await adminUsers.adjustBalance({ userId: adjustUser._id, delta: amt, reason: "manual" });
      setAdjustUser(null);
      setDelta("");
      await fetchList();
    } catch (e) {
      alert(e?.message || "Adjust failed");
    }
  }

  async function doBan(is) {
    try {
      await adminUsers.ban({ userId: banUser._id, is, reason: banReason });
      setBanUser(null);
      setBanReason("");
      await fetchList();
    } catch (e) {
      alert(e?.message || "Ban/unban failed");
    }
  }

  function onSearch() {
    setPage(1);
    fetchList({ query: q, pageNum: 1 });
  }

  return (
    <div className="space-y-4">
      {/* Header + search */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm opacity-70">Search, filter, adjust balances, and ban/unban.</p>
        </div>
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            placeholder="Search by username, tgId, referralCode…"
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm w-64 text-white"
          />
          <button
            onClick={onSearch}
            className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm text-white"
          >
            Search
          </button>
        </div>
      </header>

      {/* Table */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900/70">
            <tr className="[&>th]:text-left [&>th]:px-3 [&>th]:py-2">
              <th>User</th>
              <th>tgId</th>
              <th>Coins</th>
              <th>Referrals</th>
              <th>Ref Code</th>
              <th>Status</th>
              <th className="w-56">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {loading && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center opacity-70">
                  Loading…
                </td>
              </tr>
            )}

            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center opacity-70">
                  No users found.
                </td>
              </tr>
            )}

            {!loading &&
              rows.map((u) => (
                <tr key={u._id} className="[&>td]:px-3 [&>td]:py-2">
                  <td>
                    <div className="font-medium">
                      {u.username ||
                        `${u.firstName || ""} ${u.lastName || ""}`.trim() ||
                        "—"}
                    </div>
                    <div className="text-xs opacity-70">{u._id}</div>
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
                  <td className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setAdjustUser(u)}
                      className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white"
                    >
                      Adjust
                    </button>
                    {u?.banned?.is ? (
                      <button
                        onClick={() => {
                          setBanUser(u);
                          setBanReason("");
                        }}
                        className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white"
                      >
                        Unban
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setBanUser(u);
                          setBanReason("");
                        }}
                        className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white"
                      >
                        Ban
                      </button>
                    )}
                    <button
                      onClick={() => alert("Logs modal TODO")}
                      className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white"
                    >
                      Logs
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Footer row: counts & pagination */}
      <div className="flex items-center justify-between">
        <div className="text-xs opacity-60">
          total: {total} • page: {page}/{pages}
        </div>

        {pages > 1 && (
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => fetchList({ pageNum: page - 1 })}
              className="px-3 py-1 rounded bg-zinc-800 disabled:opacity-50 text-white"
            >
              Prev
            </button>
            <button
              disabled={page >= pages}
              onClick={() => fetchList({ pageNum: page + 1 })}
              className="px-3 py-1 rounded bg-zinc-800 disabled:opacity-50 text-white"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {err && <div className="text-sm text-red-400">{err}</div>}

      {/* Debug inspector */}
      <details className="text-xs opacity-60">
        <summary>Debug</summary>
        <pre className="whitespace-pre-wrap break-all">
{JSON.stringify(
  {
    base: import.meta.env.VITE_API || "(no VITE_API)",
    sys,
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Adjust Balance</h3>
              <button
                onClick={() => { setAdjustUser(null); setDelta(""); }}
                className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-white"
              >
                ✕
              </button>
            </div>

            <div className="text-sm mb-3">
              <div className="opacity-70">User</div>
              <div className="font-medium">
                {adjustUser.username || `${adjustUser.firstName || ""} ${adjustUser.lastName || ""}`.trim() || "—"}
              </div>
              <div className="text-xs opacity-60">{adjustUser._id}</div>
            </div>

            <label className="text-sm opacity-70">Delta (use negative to remove)</label>
            <input
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              placeholder="+100 or -100"
              className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => { setAdjustUser(null); setDelta(""); }}
                className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-white"
              >
                Cancel
              </button>
              <button
                onClick={doAdjust}
                className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm text-white"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ban / Unban Modal */}
      {banUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">{banUser?.banned?.is ? "Unban User" : "Ban User"}</h3>
              <button
                onClick={() => { setBanUser(null); setBanReason(""); }}
                className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-white"
              >
                ✕
              </button>
            </div>

            <div className="text-sm mb-3">
              <div className="opacity-70">User</div>
              <div className="font-medium">
                {banUser.username || `${banUser.firstName || ""} ${banUser.lastName || ""}`.trim() || "—"}
              </div>
              <div className="text-xs opacity-60">{banUser._id}</div>
            </div>

            {!banUser?.banned?.is && (
              <>
                <label className="text-sm opacity-70">Reason</label>
                <textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Reason (optional)"
                  className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm h-24 text-white"
                />
              </>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => { setBanUser(null); setBanReason(""); }}
                className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-white"
              >
                Cancel
              </button>

              {banUser?.banned?.is ? (
                <button
                  onClick={() => doBan(false)}
                  className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm text-white"
                >
                  Unban
                </button>
              ) : (
                <button
                  onClick={() => doBan(true)}
                  className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-sm text-white"
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
