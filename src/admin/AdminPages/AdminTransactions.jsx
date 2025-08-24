import { useState } from "react";

export default function AdminTransactions() {
  const [type, setType] = useState("all");
  return (
    <div className="space-y-4">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Transactions</h1>
          <p className="text-sm opacity-70">Deposits, withdrawals, bets, payouts — with filters.</p>
        </div>
        <div className="flex gap-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="deposit">Deposits</option>
            <option value="withdrawal">Withdrawals</option>
            <option value="bet">Bets</option>
            <option value="payout">Payouts</option>
          </select>
          <button className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm">
            Apply
          </button>
        </div>
      </header>

      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900/70">
            <tr className="[&>th]:text-left [&>th]:px-3 [&>th]:py-2">
              <th>Time</th>
              <th>User</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Currency</th>
              <th>Direction</th>
              <th>Tx Hash / Intent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            <tr className="[&>td]:px-3 [&>td]:py-2">
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td className="truncate max-w-[200px]">—</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
