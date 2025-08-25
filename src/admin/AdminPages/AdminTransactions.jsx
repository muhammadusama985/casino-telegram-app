import { useEffect, useState } from "react";
import { adminTx } from "../AdminApi";

export default function AdminTransactions() {
  const [type, setType] = useState(""); // '', 'deposit', 'bet', 'payout', 'withdrawal'
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true); setErr("");
    try {
      const r = await adminTx.list({ type, page: 1, limit: 50 });
      setItems(r.items || []);
    } catch (e) {
      setErr(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [type]);

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">Transactions</h1>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All</option>
          <option value="deposit">Deposit</option>
          <option value="bet">Bet</option>
          <option value="payout">Payout</option>
          <option value="withdrawal">Withdrawal</option>
        </select>
      </header>

      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900/70">
            <tr className="[&>th]:text-left [&>th]:px-3 [&>th]:py-2">
              <th>When</th>
              <th>User</th>
              <th>Type</th>
              <th>Direction</th>
              <th>Amount</th>
              <th>Currency</th>
              <th>Tx Hash</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {loading && (
              <tr><td colSpan={7} className="px-3 py-6 text-center opacity-70">Loading…</td></tr>
            )}
            {!loading && items.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center opacity-70">No transactions.</td></tr>
            )}
            {!loading && items.map((t) => (
              <tr key={t._id} className="[&>td]:px-3 [&>td]:py-2">
                <td className="opacity-80">{new Date(t.createdAt).toLocaleString()}</td>
                <td className="text-xs">{t.userId}</td>
                <td className="text-xs">
                  {t.firstName && t.lastName
                    ? `${t.firstName} ${t.lastName}`
                    : t.userId}
                </td>

                <td>{t.type}</td>
                <td>{t.direction}</td>
                <td>{t.amount}</td>
                <td>{t.currency}</td>
                <td className="break-all text-xs">{t.chainTxHash || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {err && <div className="text-sm text-red-400">{err}</div>}
    </div>
  );
}
