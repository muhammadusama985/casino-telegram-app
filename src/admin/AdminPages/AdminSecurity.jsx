export default function AdminSecurity() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Security & Control</h1>
        <p className="text-sm opacity-70">Admin 2FA, activity logs, and access control.</p>
      </header>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
        <div className="font-medium">Two-Factor Authentication</div>
        <div className="flex items-center gap-3">
          <button className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm">
            Enable 2FA
          </button>
          <button className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm">
            Reset 2FA
          </button>
        </div>
        <div className="text-xs opacity-70">
          When enabled, admin login requires OTP. You’ll wire this to your backend later.
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 overflow-hidden">
        <div className="p-4 font-medium border-b border-zinc-800 bg-zinc-900/70">Admin Activity Logs</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="[&>th]:text-left [&>th]:px-3 [&>th]:py-2">
              <th>Time</th>
              <th>Admin</th>
              <th>Action</th>
              <th>Target</th>
              <th>Meta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            <tr className="[&>td]:px-3 [&>td]:py-2">
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td className="truncate max-w-[240px]">—</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
