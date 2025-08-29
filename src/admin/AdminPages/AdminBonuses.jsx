import { useEffect, useState } from "react";
import { adminBonuses } from "../AdminApi";

export default function AdminBonuses() {
  const [daily, setDaily] = useState("0.1");
  const [refPer10, setRefPer10] = useState("1");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await adminBonuses.get();
        setDaily(String(r.dailyBonusCoins ?? "0.1"));
        setRefPer10(String(r.referralPer10Coins ?? "1"));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function saveDaily() {
    await adminBonuses.save({ dailyBonusCoins: Number(daily) });
    alert("Daily bonus saved");
  }
  async function saveRef() {
    await adminBonuses.save({ referralPer10Coins: Number(refPer10) });
    alert("Referral reward saved");
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Bonuses & Promotions</h1>
        <p className="text-sm opacity-70">Daily rewards and referrals.</p>
      </header>

      {/* Daily Bonus */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
        <div className="font-medium">Daily Bonus</div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <div className="text-xs opacity-70 mb-1">Amount (coins)</div>
            <input
              disabled={loading}
              value={daily}
              onChange={(e) => setDaily(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-gray-100 placeholder-gray-400"
              placeholder="0.1"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={saveDaily}
              disabled={loading}
              className="w-full px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm text-white"
            >
              Save
            </button>
          </div>
        </div>
      </section>

      {/* Referral Rewards */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
        <div className="font-medium">Referral Rewards</div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <div className="text-xs opacity-70 mb-1">Coins per 10 referrals</div>
            <input
              disabled={loading}
              value={refPer10}
              onChange={(e) => setRefPer10(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-gray-100 placeholder-gray-400"
              placeholder="1"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={saveRef}
              disabled={loading}
              className="w-full px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm text-white"
            >
              Save
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
