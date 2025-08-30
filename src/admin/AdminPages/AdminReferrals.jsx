// src/admin/AdminPages/AdminReferrals.jsx
import { useEffect, useState } from "react";
import { adminReferrals } from "../AdminApi";

export default function AdminReferrals() {
  const [items, setItems] = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingTop, setLoadingTop] = useState(true);
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

  async function loadTop() {
    setLoadingTop(true);
    try {
      const r = await adminReferrals.top({ limit: 50 }); // backend: GET /admin/referrals/top
      setTopItems(r.items || []);
    } catch {
      // silent; we still show the main table
    } finally {
      setLoadingTop(false);
    }
  }

  useEffect(() => { load(); loadTop(); /* eslint-disable-next-line */ }, []);

  return (
    <div className="relative space-y-6 bg-black text-yellow-300">
      {/* Background gold glows (decorative only) */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-32 h-[36rem] w-[36rem] rounded-full blur-3xl opacity-15 bg-[radial-gradient(closest-side,rgba(250,204,21,0.35),transparent)]" />
        <div className="absolute bottom-[-8rem] right-[-8rem] h-[32rem] w-[32rem] rounded-full blur-3xl opacity-10 bg-[radial-gradient(closest-side,rgba(234,179,8,0.35),transparent)]" />
      </div>

      {/* Header + search */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-300 to-amber-300 drop-shadow-[0_0_18px_rgba(250,204,21,0.45)]">
            Referrals
          </h1>
          <p className="text-sm text-yellow-300/85">Top referrers, stats, manual edits, exports.</p>
        </div>

        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name / username / code"
            className="bg-black/60 border border-yellow-500/30 rounded-lg px-3 py-2 text-sm w-64 text-yellow-100 placeholder:text-yellow-300/60 outline-none focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-300 transition"
          />
          <button
            onClick={load}
            className="px-3 py-2 rounded-lg text-sm text-black bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-200 hover:from-yellow-200 hover:to-amber-200 ring-1 ring-yellow-400/30 shadow-[0_0_18px_rgba(250,204,21,0.35)] hover:shadow-[0_0_26px_rgba(250,204,21,0.45)] active:translate-y-px transition"
          >
            Search
          </button>
          {/* Export button removed */}
        </div>
      </header>

      {/* All referrers (searchable) */}
      <div className="relative rounded-2xl border border-yellow-500/30 ring-1 ring-yellow-400/20 bg-zinc-950/90 overflow-hidden shadow-[0_0_26px_rgba(250,204,21,0.28)]">
        {/* inner glow */}
        <div className="pointer-events-none absolute inset-0 opacity-60 mix-blend-screen bg-[radial-gradient(120%_60%_at_50%_120%,rgba(250,204,21,0.08),transparent)]" />
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead className="bg-black/80">
            <tr className="[&>th]:text-left [&>th]:px-3 [&>th]:py-2 [&>th]:text-yellow-200 [&>th]:border-b [&>th]:border-yellow-500/40 [&>th:first-child]:border-l [&>th:last-child]:border-r [&>th]:border-yellow-500/30">
              <th>User</th>
              <th>Referrals</th>
              <th>Coins Awarded</th>
              <th>Last Activity</th>
            </tr>
          </thead>
          <tbody className="bg-black/40">
            {loading && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-yellow-300/80">Loading…</td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-yellow-300/80">No results.</td>
              </tr>
            )}

            {!loading && items.map((u) => (
              <tr
                key={u._id}
                className="[&>td]:px-3 [&>td]:py-2 [&>td]:border-b [&>td]:border-yellow-500/20 hover:bg-black/60 transition-colors"
              >
                <td className="text-sm border-l border-yellow-500/20">
                  <div className="font-medium text-yellow-100 drop-shadow-[0_0_6px_rgba(250,204,21,0.35)]">{u.displayName}</div>
                  <div className="text-yellow-300/70 text-xs">{u.referralCode ? `code: ${u.referralCode}` : "—"}</div>
                </td>
                <td>{u.referralCount ?? 0}</td>
                <td>{(u.coinsAwarded ?? 0).toFixed(4)}</td>
                <td className="border-r border-yellow-500/20">
                  {u.lastActivity ? new Date(u.lastActivity).toLocaleString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Top Referrers (no edits) */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-yellow-100 drop-shadow-[0_0_10px_rgba(250,204,21,0.45)]">Top Referrers</h2>
        <div className="relative rounded-2xl border border-yellow-500/30 ring-1 ring-yellow-400/20 bg-zinc-950/90 overflow-hidden shadow-[0_0_26px_rgba(250,204,21,0.28)]">
          {/* inner glow */}
          <div className="pointer-events-none absolute inset-0 opacity-60 mix-blend-screen bg-[radial-gradient(120%_60%_at_50%_120%,rgba(250,204,21,0.08),transparent)]" />
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead className="bg-black/80">
              <tr className="[&>th]:text-left [&>th]:px-3 [&>th]:py-2 [&>th]:text-yellow-200 [&>th]:border-b [&>th]:border-yellow-500/40 [&>th:first-child]:border-l [&>th:last-child]:border-r [&>th]:border-yellow-500/30">
                <th>User</th>
                <th>Referrals</th>
                <th>Coins</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody className="bg-black/40">
              {loadingTop && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-yellow-300/80">Loading…</td>
                </tr>
              )}
              {!loadingTop && topItems.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-yellow-300/80">No referrers yet.</td>
                </tr>
              )}
              {!loadingTop && topItems.map((u) => (
                <tr
                  key={u._id}
                  className="[&>td]:px-3 [&>td]:py-2 [&>td]:border-b [&>td]:border-yellow-500/20 hover:bg-black/60 transition-colors"
                >
                  <td className="text-sm border-l border-yellow-500/20">
                    <div className="font-medium text-yellow-100 drop-shadow-[0_0_6px_rgba(250,204,21,0.35)]">
                      {u.username ? `@${u.username}` : (u.firstName || u.lastName ? `${u.firstName || ""} ${u.lastName || ""}`.trim() : u._id)}
                    </div>
                    <div className="text-yellow-300/70 text-xs">{u.referralCode ? `code: ${u.referralCode}` : "—"}</div>
                  </td>
                  <td>{u.referralCount ?? 0}</td>
                  <td>{Number(u.coins ?? 0).toFixed(4)}</td>
                  <td className="border-r border-yellow-500/20">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {err && <div className="text-sm text-red-400">{err}</div>}
    </div>
  );
}
