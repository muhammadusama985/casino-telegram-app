// src/admin/AdminPages/AdminReferrals.jsx
import { useEffect, useState } from "react";
import { adminReferrals, adminUsers } from "../AdminApi";

export default function AdminReferrals() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [query, setQuery] = useState("");

  async function load() {
    setLoading(true); setErr("");
    try {
      const r = await adminReferrals.list({ query, page: 1, limit: 50 });
      setItems(r.items || []);
    } catch (e) {
      setErr(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function handleExport() {
    try {
      const csv = await adminReferrals.exportCSV({ query });
      // download as file
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "referrals.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e?.message || "Export failed");
    }
  }

  async function handleEditBonus(u) {
    const val = prompt(`Add coins to ${u.displayName} (can be negative):`, "1");
    if (val == null) return;
    const delta = Number(val);
    if (!Number.isFinite(delta) || delta === 0) return alert("Enter a non-zero number.");
    try {
      await adminUsers.adjustBalance({ userId: u._id, delta, reason: "manual referral bonus" });
      alert("Updated.");
      load();
    } catch (e) {
      alert(e?.message || "Failed to update");
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Referrals</h1>
          <p className="text-sm opacity-70">Top referrers, stats, manual edits, exports.</p>
        </div>

        <div className="flex items-center gap-2">
          {/* readable input on dark bg */}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name / username / code"
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-400"
          />
          <button
            onClick={load}
            className="px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-sm"
          >
            Search
          </button>
          <button
            onClick={handleExport}
            className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm"
          >
            Export CSV
          </button>
        </div>
      </header>

      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900/70">
            <tr className="[&>th]:text-left [&>th]:px-3 [&>th]:py-2">
              <th>User</th>
              <th>Referrals</th>
              <th>Coins Awarded</th>
              <th>Last Activity</th>
              <th className="w-40">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {loading && (
              <tr><td colSpan={5} className="px-3 py-6 text-center opacity-70">Loading…</td></tr>
            )}
            {!loading && items.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center opacity-70">No results.</td></tr>
            )}

            {!loading && items.map((u) => (
              <tr key={u._id} className="[&>td]:px-3 [&>td]:py-2">
                <td className="text-sm">
                  <div className="font-medium">{u.displayName}</div>
                  <div className="opacity-70 text-xs">{u.referralCode ? `code: ${u.referralCode}` : "—"}</div>
                </td>
                <td>{u.referralCount ?? 0}</td>
                <td>{(u.coinsAwarded ?? 0).toFixed(4)}</td>
                <td>{u.lastActivity ? new Date(u.lastActivity).toLocaleString() : "—"}</td>
                <td>
                  <button
                    onClick={() => handleEditBonus(u)}
                    className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500"
                  >
                    Edit Bonus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {err && <div className="text-sm text-red-400">{err}</div>}
    </div>
  );
}
