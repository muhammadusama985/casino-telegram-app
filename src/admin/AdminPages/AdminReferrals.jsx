export default function AdminReferrals() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Referrals</h1>
          <p className="text-sm opacity-70">Top referrers, stats, manual edits, exports.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm">Export CSV</button>
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
            <tr className="[&>td]:px-3 [&>td]:py-2">
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td>
                <button className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700">Edit Bonus</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
