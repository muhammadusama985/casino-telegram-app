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
    <div className="relative space-y-8 bg-black text-yellow-300">
      {/* background glows (decorative only) */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-40 h-[44rem] w-[44rem] rounded-full blur-3xl opacity-15 bg-[radial-gradient(closest-side,rgba(250,204,21,0.35),transparent)] motion-safe:animate-[pulse_3.5s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-10rem] right-[-10rem] h-[40rem] w-[40rem] rounded-full blur-3xl opacity-10 bg-[radial-gradient(closest-side,rgba(234,179,8,0.35),transparent)] motion-safe:animate-[pulse_4s_ease-in-out_infinite]" />
      </div>

      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-300 to-amber-300 drop-shadow-[0_0_20px_rgba(250,204,21,0.55)]">
          Bonuses & Promotions
        </h1>
        <p className="text-sm text-yellow-300/85">Daily rewards and referrals.</p>
      </header>

      {/* Daily Bonus (BIG CARD + VISIBLE BORDERS + GLOW) */}
      <section className="relative overflow-hidden rounded-3xl p-6 md:p-8 min-h-[300px]
                          bg-zinc-950/90
                          border-2 border-yellow-500/40 ring-2 ring-yellow-400/20
                          shadow-[0_0_55px_rgba(250,204,21,0.35)] hover:shadow-[0_0_80px_rgba(250,204,21,0.45)]
                          transition">
        <div className="pointer-events-none absolute inset-0 opacity-70 mix-blend-screen bg-[radial-gradient(120%_60%_at_50%_120%,rgba(250,204,21,0.10),transparent)]" />
        <div className="font-bold text-2xl text-yellow-100 drop-shadow-[0_0_12px_rgba(250,204,21,0.55)] mb-5">
          Daily Bonus
        </div>

        {/* Table-like grid with visible borders */}
        <div className="grid sm:grid-cols-3 gap-0 rounded-2xl overflow-hidden
                        border border-yellow-500/30">
          {/* Amount cell */}
          <div className="p-4 border-b sm:border-b-0 sm:border-r border-yellow-500/30">
            <div className="text-xs text-yellow-300/80 mb-2">Amount (coins)</div>
            <input
              disabled={loading}
              value={daily}
              onChange={(e) => setDaily(e.target.value)}
              className="w-full bg-black/60 border-2 border-yellow-500/40 rounded-xl px-4 py-3 text-sm md:text-base text-yellow-100 placeholder-yellow-300/60 outline-none focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-300 transition"
              placeholder="0.1"
            />
          </div>

          {/* Spacer/empty cell to keep 3-col layout roomy */}
          <div className="hidden sm:block border-r border-yellow-500/30" />

          {/* Save cell */}
          <div className="p-4 flex items-end">
            <button
              onClick={saveDaily}
              disabled={loading}
              className="w-full px-5 py-3 rounded-xl text-sm md:text-base font-semibold text-black
                         bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-200
                         hover:from-yellow-200 hover:to-amber-200
                         ring-1 ring-yellow-400/40
                         shadow-[0_0_24px_rgba(250,204,21,0.45)] hover:shadow-[0_0_34px_rgba(250,204,21,0.55)]
                         active:translate-y-px transition disabled:opacity-60"
            >
              Save
            </button>
          </div>
        </div>
      </section>

      {/* Referral Rewards (BIG CARD + VISIBLE BORDERS + GLOW) */}
      <section className="relative overflow-hidden rounded-3xl p-6 md:p-8 min-h-[300px]
                          bg-zinc-950/90
                          border-2 border-yellow-500/40 ring-2 ring-yellow-400/20
                          shadow-[0_0_55px_rgba(250,204,21,0.35)] hover:shadow-[0_0_80px_rgba(250,204,21,0.45)]
                          transition">
        <div className="pointer-events-none absolute inset-0 opacity-70 mix-blend-screen bg-[radial-gradient(120%_60%_at_50%_120%,rgba(250,204,21,0.10),transparent)]" />
        <div className="font-bold text-2xl text-yellow-100 drop-shadow-[0_0_12px_rgba(250,204,21,0.55)] mb-5">
          Referral Rewards
        </div>

        {/* Table-like grid with visible borders */}
        <div className="grid sm:grid-cols-3 gap-0 rounded-2xl overflow-hidden
                        border border-yellow-500/30">
          {/* Coins per 10 referrals */}
          <div className="p-4 border-b sm:border-b-0 sm:border-r border-yellow-500/30">
            <div className="text-xs text-yellow-300/80 mb-2">Coins per 10 referrals</div>
            <input
              disabled={loading}
              value={refPer10}
              onChange={(e) => setRefPer10(e.target.value)}
              className="w-full bg-black/60 border-2 border-yellow-500/40 rounded-xl px-4 py-3 text-sm md:text-base text-yellow-100 placeholder-yellow-300/60 outline-none focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-300 transition"
              placeholder="1"
            />
          </div>

          {/* Spacer/empty cell to keep 3-col layout roomy */}
          <div className="hidden sm:block border-r border-yellow-500/30" />

          {/* Save cell */}
          <div className="p-4 flex items-end">
            <button
              onClick={saveRef}
              disabled={loading}
              className="w-full px-5 py-3 rounded-xl text-sm md:text-base font-semibold text-black
                         bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-200
                         hover:from-yellow-200 hover:to-amber-200
                         ring-1 ring-yellow-400/40
                         shadow-[0_0_24px_rgba(250,204,21,0.45)] hover:shadow-[0_0_34px_rgba(250,204,21,0.55)]
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
