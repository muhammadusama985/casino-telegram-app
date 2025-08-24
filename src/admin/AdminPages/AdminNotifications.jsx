export default function AdminNotifications() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="text-sm opacity-70">Send broadcasts to segments (VIP, inactive, new).</p>
      </header>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <select className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm">
            <option value="all">All users</option>
            <option value="vip">VIP</option>
            <option value="inactive7">Inactive 7d</option>
            <option value="new3">New (3d)</option>
          </select>
          <input className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm" placeholder="Title" />
          <button className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm">Send</button>
        </div>
        <textarea
          rows={6}
          className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm"
          placeholder="Message body (supports templates)…"
        />
        <div className="text-xs opacity-70">[Template selector and preview here later]</div>
      </section>
    </div>
  );
}
