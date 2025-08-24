// src/admin/AdminPages/AdminUsers.jsx
import { useEffect, useState } from "react";
import { adminUsers } from "../AdminApi";

export default function AdminUsers() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [error, setError] = useState("");

  async function load({ query = q, pageNum = 1 } = {}) {
    setLoading(true);
    setError("");
    try {
      const res = await adminUsers.list({ query, page: pageNum, limit });
      setItems(res.items || []);
      setTotal(res.total || 0);
      setPage(res.page || 1);
    } catch (e) {
      setError(e?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load({ pageNum: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm opacity-70">
            Search, filter, adjust balances, and ban/unban.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by username, tgId, referral code"
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm w-64"
          />
          <button
            onClick={() => load({ query: q, pageNum: 1 })}
            className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm"
          >
            Search
          </button>
        </div>
      </header>

      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900/70">
            <tr className="[&>th]:text-left [&>th]:px-3 [&>th]:py-2">
              <th>User</th>
              <th>tgId</th>
              <th>Coins</th>
              <th>Referrals</th>
              <th>Status</th>
              <th className="w-48">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-800">
            {loading && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center opacity-70">
                  Loading…
                </td>
              </tr>
            )}

            {!loading && error && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-red-400">
                  {error}
                </td>
              </tr>
            )}

            {!loading && !error && items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center opacity-70">
                  No users found.
                </td>
              </tr>
            )}

            {!loading &&
              !error &&
              items.map((u) => (
                <tr key={u._id} className="[&>td]:px-3 [&>td]:py-2">
                  <td>
                    <div className="font-medium">
                      {u.username || `${u.firstName || ""} ${u.lastName || ""}`.trim() || "—"}
                    </div>
                    <div className="text-xs opacity-70">
                      ref: {u.referralCode || "—"}
                    </div>
                    <div className="text-xs opacity-70">
                      joined: {u.createdAt ? new Date(u.createdAt).toLocaleString() : "—"}
                    </div>
                  </td>
                  <td className="opacity-80">{u.tgId || "—"}</td>
                  <td className="opacity-80">{Number(u.coins ?? 0).toFixed(2)}</td>
                  <td className="opacity-80">{u.referralCount ?? 0}</td>
                  <td>
                    {u?.banned?.is ? (
                      <span className="text-red-400">banned</span>
                    ) : (
                      <span className="text-emerald-400">active</span>
                    )}
                  </td>
                  <td className="flex gap-2">
                    <button
                      onClick={() => alert("TODO: open Adjust Balance modal")}
                      className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700"
                    >
                      Adjust
                    </button>
                    {u?.banned?.is ? (
                      <button
                        onClick={() => alert("TODO: call unban API")}
                        className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700"
                      >
                        Unban
                      </button>
                    ) : (
                      <button
                        onClick={() => alert("TODO: call ban API")}
                        className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700"
                      >
                        Ban
                      </button>
                    )}
                    <button
                      onClick={() => alert("TODO: open logs drawer")}
                      className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700"
                    >
                      Logs
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* simple pagination */}
      <div className="flex items-center justify-between text-sm">
        <div className="opacity-70">
          Total: <b>{total}</b> • Page {page} / {pages}
        </div>
        <div className="flex gap-2">
          <button
            disabled={page <= 1}
            onClick={() => load({ query: q, pageNum: page - 1 })}
            className={`px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 ${
              page <= 1 ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            Prev
          </button>
          <button
            disabled={page >= pages}
            onClick={() => load({ query: q, pageNum: page + 1 })}
            className={`px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 ${
              page >= pages ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            Next
          </button>
        </div>
      </div>
      <details className="text-xs opacity-60 mt-3">
  <summary>Debug payload</summary>
  <pre className="whitespace-pre-wrap break-all">
    {JSON.stringify({ total, page, items }, null, 2)}
  </pre>
</details>

    </div>
  );
}
