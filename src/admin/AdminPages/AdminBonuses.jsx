// src/admin/AdminPages/AdminBonuses.jsx
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
    <div className="relative space-y-6 bg-black text-yellow-300">
      {/* subtle background glows (small + light so no scroll vibes) */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-[26rem] w-[26rem] rounded-full blur-3xl opacity-10 bg-[radial-gradient(closest-side,rgba(250,204,21,0.35),transparent)]" />
        <div className="absolute bottom-[-6rem] right-[-6rem] h-[22rem] w-[22rem] rounded-full blur-3xl opacity-8 bg-[radial-gradient(closest-side,rgba(234,179,8,0.35),transparent)]" />
      </div>

      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-300 to-amber-300 drop-shadow-[0_0_14px_rgba(250,204,21,0.45)]">
          Bonuses & Promotions
        </h1>
        <p className="text-sm text-yellow-300/85">Daily rewards and referrals.</p>
      </header>

      {/* Daily Bonus — medium card, visible borders */}
      <section
        className="relative overflow-hidden rounded-2xl p-5 md:p-6 min-h-[220px]
                   bg-zinc-950/90
                   border border-yellow-500/30 ring-1 ring-yellow-400/20
                   shadow-[0_0_22px_rgba(250,204,21,0.25)]"
      >
        <div className="pointer-events-none absolute inset-0 opacity-50 mix-blend-screen bg-[radial-gradient(100%_50%_at_50%_110%,rgba(250,204,21,0.08),transparent)]" />
        <div className="font-semibold text-xl text-yellow-100 drop-shadow-[0_0_8px_rgba(250,204,21,0.45)] mb-3">
          Daily Bonus
        </div>

        <div
          className="grid sm:grid-cols-3 gap-0 rounded-xl overflow-hidden
                     border border-yellow-500/30"
        >
          <div className="p-3 border-b sm:border-b-0 sm:border-r border-yellow-500/30">
            <div className="text-xs text-yellow-300/80 mb-1.5">Amount (coins)</div>
            <input
              disabled={loading}
              value={daily}
              onChange={(e) => setDaily(e.target.value)}
              placeholder="0.1"
              className="w-full bg-black/60 border border-yellow-500/35 rounded-lg px-3 py-2.5 text-sm text-yellow-100 placeholder-yellow-300/60 outline-none focus:ring-2 focus:ring-yellow-400/30 focus:border-yellow-300 transition"
            />
          </div>

          <div className="hidden sm:block border-r border-yellow-500/30" />

          <div className="p-3 flex items-end">
            <button
              onClick={saveDaily}
              disabled={loading}
              className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold text-black
                         bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-200
                         hover:from-yellow-200 hover:to-amber-200
                         ring-1 ring-yellow-400/30
                         shadow-[0_0_16px_rgba(250,204,21,0.35)] hover:shadow-[0_0_22px_rgba(250,204,21,0.45)]
                         active:translate-y-px transition disabled:opacity-60"
            >
              Save
            </button>
          </div>
        </div>
      </section>

      {/* Referral Rewards — medium card, visible borders */}
      <section
        className="relative overflow-hidden rounded-2xl p-5 md:p-6 min-h-[220px]
                   bg-zinc-950/90
                   border border-yellow-500/30 ring-1 ring-yellow-400/20
                   shadow-[0_0_22px_rgba(250,204,21,0.25)]"
      >
        <div className="pointer-events-none absolute inset-0 opacity-50 mix-blend-screen bg-[radial-gradient(100%_50%_at_50%_110%,rgba(250,204,21,0.08),transparent)]" />
        <div className="font-semibold text-xl text-yellow-100 drop-shadow-[0_0_8px_rgba(250,204,21,0.45)] mb-3">
          Referral Rewards
        </div>

        <div
          className="grid sm:grid-cols-3 gap-0 rounded-xl overflow-hidden
                     border border-yellow-500/30"
        >
          <div className="p-3 border-b sm:border-b-0 sm:border-r border-yellow-500/30">
            <div className="text-xs text-yellow-300/80 mb-1.5">Coins per 10 referrals</div>
            <input
              disabled={loading}
              value={refPer10}
              onChange={(e) => setRefPer10(e.target.value)}
              placeholder="1"
              className="w-full bg-black/60 border border-yellow-500/35 rounded-lg px-3 py-2.5 text-sm text-yellow-100 placeholder-yellow-300/60 outline-none focus:ring-2 focus:ring-yellow-400/30 focus:border-yellow-300 transition"
            />
          </div>

          <div className="hidden sm:block border-r border-yellow-500/30" />

          <div className="p-3 flex items-end">
            <button
              onClick={saveRef}
              disabled={loading}
              className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold text-black
                         bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-200
                         hover:from-yellow-200 hover:to-amber-200
                         ring-1 ring-yellow-400/30
                         shadow-[0_0_16px_rgba(250,204,21,0.35)] hover:shadow-[0_0_22px_rgba(250,204,21,0.45)]
                         active:translate-y-px transition disabled:opacity-60"
            >
              Save
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
