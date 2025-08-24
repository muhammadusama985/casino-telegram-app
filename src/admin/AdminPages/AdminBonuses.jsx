export default function AdminBonuses() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Bonuses & Promotions</h1>
        <p className="text-sm opacity-70">Daily rewards, referrals, and custom campaigns.</p>
      </header>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
        <div className="font-medium">Daily Bonus</div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <div className="text-xs opacity-70 mb-1">Amount (coins)</div>
            <input className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm" placeholder="0.1" />
          </div>
          <div className="flex items-end">
            <button className="w-full px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm">Save</button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
        <div className="font-medium">Referral Rewards</div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <div className="text-xs opacity-70 mb-1">Coins per 10 referrals</div>
            <input className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm" placeholder="1" />
          </div>
          <div className="flex items-end">
            <button className="w-full px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm">Save</button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
        <div className="font-medium">Custom Campaigns</div>
        <div className="grid sm:grid-cols-3 gap-3">
          <input className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm" placeholder="Campaign name" />
          <input className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm" placeholder="Bonus (coins)" />
          <button className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm">Create</button>
        </div>
        <div className="text-xs opacity-70">[List created campaigns here]</div>
      </section>
    </div>
  );
}
