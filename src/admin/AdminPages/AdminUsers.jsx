// src/admin/AdminPages/AdminUsers.jsx
import { useEffect, useMemo, useState } from "react";
import { adminUsers } from "../AdminApi";

export default function AdminUsers() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [data, setData] = useState({ items: [], total: 0, page: 1, limit });

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((data?.total || 0) / (data?.limit || limit))),
    [data, limit]
  );

  async function fetchList({ query = q, pageNum = page } = {}) {
    try {
      setLoading(true);
      setErr("");
      const res = await adminUsers.list({ query, page: pageNum, limit });
      // BE returns { items, total, page, limit }
      setData(res);
    } catch (e) {
      setErr(e?.message || "Failed to load users");
      setData({ items: [], total: 0, page: 1, limit });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSearch() {
    setPage(1);
    fetchList({ query: q, pageNum: 1 });
  }

  function onKeyDown(e) {
    if (e.key === "Enter") onSearch();
  }

  function goto(p) {
    const pClamped = Math.min(Math.max(1, p), totalPages);
    setPage(pClamped);
    fetchList({ query: q, pageNum: pClamped });
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm opacity-70">Search, filter, adjust balances, ban/unban.</p>
        </div>
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search by username, tgId, referral code…"
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm w-64"
          />
          <button
            onClick={onSearch}
            className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm"
            disabled={loading}
          >
            {loading ? "Searching…" : "Search"}
          </button>
        </div>
      </header>

      {err && (
        <div className="rounded-lg border border-red-900/40 bg-red-900/20 px-3 py-2 text-sm text-red-300">
          {err}
        </div>
      )}

      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900/70">
            <tr className="[&>th]:text-left [&>th]:px-3 [&>th]:py-2">
              <th>User</th>
              <th>tgId</th>
              <th>Coins</th>
              <th>Referrals</th>
              <th>Status</th>
              <th>Created</th>
              <th className="w-48">Actions</th>
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

            {!loading && (data.items || []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center opacity-70">
                  No users found.
                </td>
              </tr>
            )}

            {!loading &&
              (data.items || []).map((u) => (
                <tr key={u._id} className="[&>td]:px-3 [&>td]:py-2">
                  <td>
                    <div className="font-medium">
                      {u.username || `${u.firstName || ""} ${u.lastName || ""}`.trim() || "(no name)"}
                    </div>
                    <div className="text-xs opacity-70">{u.referralCode || "—"}</div>
                  </td>
                  <td className="opacity-80">{u.tgId || "—"}</td>
                  <td className="font-semibold">{Number(u.coins || 0).toFixed(2)}</td>
                  <td>{u.referralCount ?? 0}</td>
                  <td>
                    {u?.banned?.is ? (
                      <span className="text-red-400">banned</span>
                    ) : (
                      <span className="text-emerald-400">active</span>
                    )}
                  </td>
                  <td className="opacity-70">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700">
                        Adjust
                      </button>
                      <button className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700">
                        {u?.banned?.is ? "Unban" : "Ban"}
                      </button>
                      <button className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700">
                        Logs
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-xs opacity-70">
          Total: {data.total} • Page {data.page} / {totalPages}
        </div>
        <div className="flex gap-2">
          <button
            className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50"
            onClick={() => goto(page - 1)}
            disabled={page <= 1 || loading}
          >
            Prev
          </button>
          <button
            className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50"
            onClick={() => goto(page + 1)}
            disabled={page >= totalPages || loading}
          >
            Next
          </button>
        </div>
      </div>

      {/* Optional: inline debug */}
      {/* <pre className="text-xs opacity-60">{JSON.stringify(data, null, 2)}</pre> */}
    </div>
  );
}
