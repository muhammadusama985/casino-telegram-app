// src/admin/AdminPages/AdminTransactions.jsx
import { useEffect, useState } from "react";
import { adminTx } from "../AdminApi";

export default function AdminTransactions() {
  const [type, setType] = useState(""); // '', 'deposit', 'bet', 'payout', 'withdrawal'
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true);
    setErr("");
    try {
      let r;
      if (type === "bet") {
        // pull from gamebets collection (expects backend /admin/bets)
        r = await adminTx.listBets({ page: 1, limit: 50 });
      } else {
        // deposits / payouts / withdrawals from transactions collection
        r = await adminTx.list({ type, page: 1, limit: 50 });
      }
      setItems(r.items || []);
    } catch (e) {
      setErr(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const isBet = type === "bet";

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

      {/* Scrollable table container */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden max-h-[60vh]">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/70">
              {isBet ? (
                <tr className="[&>th]:text-left [&>th]:px-3 [&>th]:py-2">
                  <th>When</th>
                  <th>User Id</th>
                  <th>User Name</th>
                  <th>Game</th>
                  <th>Stake</th>
                  <th>Result</th>
                  <th>Profit</th>
                  <th>Payout</th>
                  <th>Round Id</th>
                </tr>
              ) : (
                <tr className="[&>th]:text-left [&>th]:px-3 [&>th]:py-2">
                  <th>When</th>
                  <th>User Id</th>
                  <th>User Name</th>
                  <th>Type</th>
                  <th>Direction</th>
                  <th>Amount</th>
                  <th>Currency</th>
                  <th>Tx Hash</th>
                </tr>
              )}
            </thead>

            <tbody className="divide-y divide-zinc-800">
              {loading && (
                <tr>
                  <td colSpan={isBet ? 9 : 8} className="px-3 py-6 text-center opacity-70">
                    Loading…
                  </td>
                </tr>
              )}

              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={isBet ? 9 : 8} className="px-3 py-6 text-center opacity-70">
                    No {isBet ? "bets" : "transactions"}.
                  </td>
                </tr>
              )}

              {!loading &&
                isBet &&
                items.map((b) => (
                  <tr key={b._id} className="[&>td]:px-3 [&>td]:py-2">
                    <td className="opacity-80">{new Date(b.createdAt).toLocaleString()}</td>
                    <td className="text-xs">{b.userId}</td>
                    <td className="text-xs">
                      {b.firstName || b.lastName ? `${b.firstName || ""} ${b.lastName || ""}`.trim() : b.userId}
                    </td>
                    <td className="uppercase">{b.game}</td>
                    <td>{b.stake}</td>
                    <td>{b.result}</td>
                    <td>{Number(b.profit ?? 0)}</td>
                    <td>{Number(b.payout ?? 0)}</td>
                    <td className="text-xs break-all">{b.roundId || "—"}</td>
                  </tr>
                ))}

              {!loading &&
                !isBet &&
                items.map((t) => (
                  <tr key={t._id} className="[&>td]:px-3 [&>td]:py-2">
                    <td className="opacity-80">{new Date(t.createdAt).toLocaleString()}</td>
                    <td className="text-xs">{t.userId}</td>
                    <td className="text-xs">
                      {t.firstName && t.lastName ? `${t.firstName} ${t.lastName}` : t.userId}
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
      </div>

      {err && <div className="text-sm text-red-400">{err}</div>}
    </div>
  );
}
