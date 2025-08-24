export default function AdminGames() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Game Settings</h1>
        <p className="text-sm opacity-70">RTP, bet limits, enable/disable per game.</p>
      </header>

      <section className="grid gap-3 lg:grid-cols-2">
        {["coinflip","dice","slot","crash"].map((g) => (
          <div key={g} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-medium uppercase">{g}</div>
              <label className="text-xs flex items-center gap-2">
                <span>Enabled</span>
                <input type="checkbox" className="accent-emerald-500" defaultChecked />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs opacity-70 mb-1">Target RTP</div>
                <input className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm" placeholder="0.90" />
              </div>
              <div>
                <div className="text-xs opacity-70 mb-1">Max Stake</div>
                <input className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm" placeholder="100000" />
              </div>
              <div>
                <div className="text-xs opacity-70 mb-1">Min Stake</div>
                <input className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm" placeholder="1" />
              </div>
              <div className="flex items-end">
                <button className="w-full px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm">
                  Save
                </button>
              </div>
            </div>

            {g === "dice" && (
              <div className="text-xs opacity-70">
                For new dice, payout% and streak boost are also available in config (wire later).
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
