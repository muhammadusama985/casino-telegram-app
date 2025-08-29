// src/pages/Earn.jsx
import { useEffect, useMemo, useState } from "react";
import side from "../assets/side.jpg";                 // ← hero background
import referralHero from "../assets/side.jpg";         // ← right artwork

function CopyField({ label, value, onCopy }) {
  return (
    <div className="mt-4">
      {label ? <div className="text-sm text-zinc-400 mb-2">{label}</div> : null}
      <div className="flex items-stretch bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <input
          value={value}
          readOnly
          className="flex-1 bg-transparent px-4 py-3 text-white outline-none"
        />
        <button
          onClick={onCopy}
          className="px-3 bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
          title="Copy"
        >
          📋
        </button>
      </div>
    </div>
  );
}

function PeriodTabs({ period, setPeriod }) {
  const Btn = ({ v, children }) => (
    <button
      onClick={() => setPeriod(v)}
      className={
        "h-10 px-4 rounded-2xl border text-sm font-medium " +
        (period === v
          ? "bg-yellow-500/20 text-yellow-400 border-yellow-600"
          : "bg-zinc-900 text-zinc-200 border-zinc-800")
      }
    >
      {children}
    </button>
  );
  return (
    <div className="mt-4 flex items-center gap-2">
      <Btn v="month">This month</Btn>
      <Btn v="last">Last month</Btn>
      <Btn v="all">All time</Btn>
    </div>
  );
}

function StatRow({ icon = "👥", label, value = "0" }) {
  return (
    <div className="mt-3 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="h-7 w-7 grid place-items-center rounded-full bg-zinc-800">{icon}</span>
        <span className="text-zinc-300">{label}</span>
      </div>
      <div className="text-white">{value}</div>
    </div>
  );
}

export default function Earn() {
  const [period, setPeriod] = useState("month");

  // Affiliate link + stats you already show
  const [affiliate, setAffiliate] = useState("t.me/yourbot/?start=Q0xKb2sxN0s");
  const [invitedCount, setInvitedCount] = useState(0);
  const [referralsWagered, setReferralsWagered] = useState(0);
  const [commission, setCommission] = useState(0);

  // 🔴 New: dynamic bonus values
  const [dailyBonusCoins, setDailyBonusCoins] = useState(null);
  const [referralPer10, setReferralPer10] = useState(null);

  // Load affiliate + invited count
  useEffect(() => {
    const BASE = (import.meta.env?.VITE_API || "").replace(/\/+$/, "");
    const userId =
      localStorage.getItem("userId") ||
      localStorage.getItem("_id") ||
      "";

    if (!BASE || !userId) return;

    (async () => {
      try {
        const res = await fetch(`${BASE}/referrals/summary`, {
          headers: { "Content-Type": "application/json", "x-user-id": userId },
        });
        const data = await res.json();
        if (res.ok && data) {
          const link = data.referralLink || data.referralLinkCached || affiliate;
          setAffiliate(link);
          setInvitedCount(Number(data.referralCount || 0));
          // If you add these later, fill them in:
          // setReferralsWagered(Number(data.totalReferredWager || 0));
          // setCommission(Number(data.totalCommission || 0));
        }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔴 Load bonus config (daily + referral per 10)
  useEffect(() => {
    const BASE = (import.meta.env?.VITE_API || "").replace(/\/+$/, "");
    if (!BASE) return;

    (async () => {
      try {
        const res = await fetch(`${BASE}/rewards/config`, {
          headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        if (res.ok && data) {
          if (typeof data.dailyBonusCoins === "number") {
            setDailyBonusCoins(data.dailyBonusCoins);
          }
          if (typeof data.referralPer10 === "number") {
            setReferralPer10(data.referralPer10);
          }
        }
      } catch {}
    })();
  }, []);

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  const fmtMoney = (n) =>
    (Number(n || 0)).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="bg-[#0e0e10] text-white">
      <div className="px-4 pb-28">
        {/* Hero */}
        <div className="rounded-2xl overflow-hidden bg-gradient-to-r from-zinc-900 to-zinc-950 relative">
          <div className="absolute inset-0 opacity-20">
            <img src={side} alt="" className="w-full h-full object-cover" />
          </div>

          <div className="relative z-10 p-5">
            <div className="text-left">
              <div className="text-2xl font-extrabold leading-tight">Referral system</div>
              <div className="mt-1 text-lg text-zinc-200 font-semibold">
                Earn 25% commission on all
                <br /> invited users!
              </div>
            </div>
          </div>

          <div className="absolute right-0 bottom-0 w-40 md:w-48 z-10">
            <img
              src={referralHero}
              alt=""
              className="w-full object-contain opacity-95 pointer-events-none select-none"
            />
          </div>
        </div>

        {/* Affiliate link */}
        <CopyField label="Your affiliate link" value={affiliate} onCopy={() => copy(affiliate)} />

        {/* Statistics */}
        <div className="mt-5">
          <div className="text-zinc-300 font-semibold">Statistics</div>
          <PeriodTabs period={period} setPeriod={setPeriod} />
        </div>

        {/* Stat rows (unchanged) */}
        <StatRow icon="👥" label="Invited users:" value={String(invitedCount)} />
        <StatRow icon="💲" label="Referrals wagered:" value={`${fmtMoney(referralsWagered)} €`} />
        <StatRow icon="🏦" label="Your commission:" value={`${fmtMoney(commission)} €`} />

        {/* Commission strip (unchanged) */}
        <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-7 w-7 grid place-items-center rounded-full bg-zinc-800">✚</span>
            <span className="text-zinc-300">Your commission:</span>
          </div>
          <div className="text-white">{fmtMoney(commission)} €</div>
        </div>

        {/* Notes — just two extra lines with your live values */}
        <div className="mt-4 text-sm text-zinc-400 space-y-2">
          {dailyBonusCoins != null && (
            <p>Daily bonus: {dailyBonusCoins} coins.</p>
          )}
          {referralPer10 != null && (
            <p>Referral milestone: {referralPer10} coins per 10 invites.</p>
          )}

          <p>Earnings are paid monthly to your account in USDT.</p>
          <p>You earn 25% from house edge from all invited players.</p>
          <p>You do not earn from bonus balance wagering.</p>
        </div>

        {/* Footer (unchanged) */}
        <div className="mt-8 text-xs text-zinc-400 space-y-2">
          <p>
            18+ only | Play responsibly | <span className="underline">Terms apply</span> v1.2.0
          </p>
          <p>Support: help@example.com @yoursupportbot</p>
          <p className="pt-2">
            <strong>18+ GAMBLE RESPONSIBLY</strong>
          </p>
          <p className="leading-relaxed">
            Yourbrand.com is owned and operated by Example Ventures SRL. Registration number:
            3-102-880024, registered address: City, Country. Licensed and regulated by the Government
            of the Autonomous Island of Anjouan, Union of Comoros and operates under License No.
            ALSI-1423 | 1005-FI2.
          </p>
        </div>
      </div>
    </div>
  );
}
