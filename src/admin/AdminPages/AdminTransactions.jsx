// src/admin/AdminPages/AdminTransactions.jsx
import { useEffect, useState } from "react";
import { adminTx } from "../AdminApi";

export default function AdminTransactions() {
  const [type, setType] = useState(""); // '', 'deposit', 'bet', 'withdrawal'
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
        // deposits / withdrawals from transactions collection
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
    <div className="relative space-y-4 bg-black text-yellow-300">
      {/* Background gold glows (visual only) */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-32 h-[36rem] w-[36rem] rounded-full blur-3xl opacity-15 bg-[radial-gradient(closest-side,rgba(250,204,21,0.35),transparent)] motion-safe:animate-[pulse_3.5s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-8rem] right-[-8rem] h-[32rem] w-[32rem] rounded-full blur-3xl opacity-10 bg-[radial-gradient(closest-side,rgba(234,179,8,0.35),transparent)] motion-safe:animate-[pulse_4s_ease-in-out_infinite]" />
      </div>

      <header className="flex items-center gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-300 to-amber-300 drop-shadow-[0_0_18px_rgba(250,204,21,0.45)]">
          Transactions
        </h1>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="bg-black/60 border border-yellow-500/25 rounded-lg px-3 py-2 text-sm text-yellow-100 outline-none focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-300 transition"
        >
          <option value="">All</option>
          <option value="deposit">Deposit</option>
          <option value="bet">Bet</option>
          <option value="withdrawal">Withdrawal</option>
        </select>
      </header>

      {/* Scrollable table container */}
      <div className="relative rounded-2xl border border-yellow-500/30 ring-1 ring-yellow-400/20 bg-zinc-950/90 overflow-hidden max-h-[60vh] shadow-[0_0_30px_rgba(250,204,21,0.28)]">
        {/* inner glow */}
        <div className="pointer-events-none absolute inset-0 opacity-60 mix-blend-screen bg-[radial-gradient(120%_60%_at_50%_120%,rgba(250,204,21,0.08),transparent)]" />
        <div className="overflow-auto">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead className="bg-black/80">
              {isBet ? (
                <tr className="[&>th]:text-left [&>th]:px-3 [&>th]:py-2 [&>th]:text-yellow-200 [&>th]:border-b [&>th]:border-yellow-500/40 [&>th:first-child]:border-l [&>th:last-child]:border-r [&>th]:border-yellow-500/30">
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
                <tr className="[&>th]:text-left [&>th]:px-3 [&>th]:py-2 [&>th]:text-yellow-200 [&>th]:border-b [&>th]:border-yellow-500/40 [&>th:first-child]:border-l [&>th:last-child]:border-r [&>th]:border-yellow-500/30">
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

            <tbody className="bg-black/40">
              {loading && (
                <tr>
                  <td colSpan={isBet ? 9 : 8} className="px-3 py-6 text-center text-yellow-300/80">
                    Loading…
                  </td>
                </tr>
              )}

              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={isBet ? 9 : 8} className="px-3 py-6 text-center text-yellow-300/80">
                    No {isBet ? "bets" : "transactions"}.
                  </td>
                </tr>
              )}

              {!loading &&
                isBet &&
                items.map((b) => (
                  <tr
                    key={b._id}
                    className="[&>td]:px-3 [&>td]:py-2 [&>td]:border-b [&>td]:border-yellow-500/20 hover:bg-black/60 transition-colors"
                  >
                    <td className="opacity-80 border-l border-yellow-500/20">
                      {new Date(b.createdAt).toLocaleString()}
                    </td>
                    <td className="text-xs">{b.userId}</td>
                    <td className="text-xs">
                      {b.firstName || b.lastName
                        ? `${b.firstName || ""} ${b.lastName || ""}`.trim()
                        : b.userId}
                    </td>
                    <td className="uppercase">{b.game}</td>
                    <td>{b.stake}</td>
                    <td>{b.result}</td>
                    <td>{Number(b.profit ?? 0)}</td>
                    <td>{Number(b.payout ?? 0)}</td>
                    <td className="text-xs break-all border-r border-yellow-500/20">
                      {b.roundId || "—"}
                    </td>
                  </tr>
                ))}

              {!loading &&
                !isBet &&
                items.map((t) => (
                  <tr
                    key={t._id}
                    className="[&>td]:px-3 [&>td]:py-2 [&>td]:border-b [&>td]:border-yellow-500/20 hover:bg-black/60 transition-colors"
                  >
                    <td className="opacity-80 border-l border-yellow-500/20">
                      {new Date(t.createdAt).toLocaleString()}
                    </td>
                    <td className="text-xs">{t.userId}</td>
                    <td className="text-xs">
                      {t.firstName && t.lastName ? `${t.firstName} ${t.lastName}` : t.userId}
                    </td>
                    <td>{t.type}</td>
                    <td>{t.direction}</td>
                    <td>{t.amount}</td>
                    <td>{t.currency}</td>
                    <td className="break-all text-xs border-r border-yellow-500/20">
                      {t.chainTxHash || "—"}
                    </td>
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
