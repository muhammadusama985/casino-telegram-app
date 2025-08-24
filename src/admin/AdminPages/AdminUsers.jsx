import { useState } from "react";

export default function AdminUsers() {
  const [q, setQ] = useState("");
  return (
    <div className="space-y-4">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm opacity-70">Search, filter, adjust balances, and ban/unban.</p>
        </div>
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by username, tgId, address"
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm w-64"
          />
          <button className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm">
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
            {/* Row sample (replace with map over data) */}
            <tr className="[&>td]:px-3 [&>td]:py-2">
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td><span className="text-amber-400">active</span></td>
              <td className="flex gap-2">
                <button className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700">Adjust</button>
                <button className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700">Ban</button>
                <button className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700">Logs</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Modal stubs: balance adjust, ban/unban, logs — implement when wiring API */}
    </div>
  );
}
