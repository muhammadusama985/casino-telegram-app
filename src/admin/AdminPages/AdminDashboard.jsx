export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm opacity-70">Realtime overview of platform performance.</p>
      </header>

      {/* KPIs */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Deposits (TON)", value: "—" },
          { label: "Total Withdrawals (TON)", value: "—" },
          { label: "Active Users (24h)", value: "—" },
          { label: "House P/L (Coins)", value: "—" },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="text-xs opacity-70">{k.label}</div>
            <div className="text-xl font-semibold mt-1">{k.value}</div>
          </div>
        ))}
      </section>

      {/* Charts placeholders */}
      <section className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="font-medium mb-2">Deposits vs Withdrawals</div>
          <div className="h-56 grid place-items-center text-sm opacity-70">[chart]</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="font-medium mb-2">Game Profit/Loss (Last 7d)</div>
          <div className="h-56 grid place-items-center text-sm opacity-70">[chart]</div>
        </div>
      </section>
    </div>
  );
}
