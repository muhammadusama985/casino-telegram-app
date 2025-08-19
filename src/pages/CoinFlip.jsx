// src/pages/Coinflip.jsx
import { useEffect, useMemo, useState } from "react";
import { telegramAuth, getBalance, games } from "../api";

import flipSound from "../assets/diceRoll.mp3"; // reuse
import winSound from "../assets/win.mp3";
import loseSound from "../assets/lose.mp3";

// helpers
const fmt = (n) =>
  Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
function formatCoins(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// === Streak boost config (UI-only multiplier behavior) ===
const STREAK_BOOST_PER_WIN = 0.05;   // +5% per consecutive win
const TRAIL_LEN = 10;

export default function Coinflip() {
  // ----- session / balance -----
  const [coins, setCoins] = useState(0);

  // ----- UI / game state -----
  const [bet, setBet] = useState(1);

  // Base coef (server multiplier). We boost visually based on streak.
  const [baseCoef, setBaseCoef] = useState(1.95);

  // Effective coef shown = baseCoef * (1 + 0.05*streak)
  const [streak, setStreak] = useState(0);
  const effectiveCoef = useMemo(
    () => Number((baseCoef * (1 + STREAK_BOOST_PER_WIN * streak)).toFixed(2)),
    [baseCoef, streak]
  );

  const [round, setRound] = useState(1);
  const [trail, setTrail] = useState(Array(TRAIL_LEN).fill("?")); // top row bubbles
  const [flipping, setFlipping] = useState(false);
  const [resultMsg, setResultMsg] = useState("");

  // potential profit shown in the orange "Take" bar (UI-only; uses effectiveCoef)
  const potentialProfit = useMemo(() => {
    const p = Math.max(0, Number(bet || 0)) * Math.max(0, effectiveCoef - 1);
    return Math.floor(p * 100) / 100;
  }, [bet, effectiveCoef]);

  // ---------- balance bootstrap ----------
  useEffect(() => {
    let stopPolling = () => {};
    (async () => {
      try {
        const u = await telegramAuth();
        if (Number.isFinite(+u?.coins)) setCoins((c) => (+u.coins !== c ? +u.coins : c));
        try {
          const b = await getBalance();
          if (Number.isFinite(b)) setCoins((c) => (b !== c ? b : c));
        } catch {}
        stopPolling = (() => {
          let alive = true;
          (function tick() {
            setTimeout(async () => {
              if (!alive) return;
              try {
                const b = await getBalance();
                if (Number.isFinite(b)) setCoins((c) => (b !== c ? b : c));
              } catch {} finally {
                if (alive) tick();
              }
            }, 4000);
          })();
          return () => { alive = false; };
        })();
      } catch (e) {
        console.error("[Coinflip] telegramAuth failed:", e);
      }
    })();
    return () => { stopPolling?.(); };
  }, []);

  useEffect(() => {
    const refresh = async () => {
      try {
        const b = await getBalance();
        if (Number.isFinite(b)) setCoins((c) => (b !== c ? b : c));
      } catch {}
    };
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("balance:refresh", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("balance:refresh", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // ---------- actions ----------
  const placeBet = async (side) => {
    if (flipping) return;
    const stake = Math.max(1, Math.floor(Number(bet || 0)));
    if (!Number.isFinite(stake) || stake <= 0) return alert("Enter a valid bet (>= 1).");
    if (Number(coins) < stake) return alert("Not enough coins.");

    setFlipping(true);
    setResultMsg("");
    try { new Audio(flipSound).play().catch(() => {}); } catch {}

    try {
const res = await games.coinflip(stake, side === "H" ? "H" : "T", { streak });

      // Sync base coef from engine if it reports details.m (so "default" is accurate)
      const m = Number(res?.details?.m);
      if (Number.isFinite(m) && m > 0) setBaseCoef(m);

      if (Number.isFinite(res?.newBalance)) {
        setCoins((prev) => (res.newBalance !== prev ? res.newBalance : prev));
      }

      // Use landed from backend to paint bubbles with 'H' or 'T'
      const landed = (res?.details?.landed === "T") ? "T" : "H";

      // advance round number
      setRound((r) => r + 1);

      if (res?.result === "win") {
        // fill bubbles with H/T for consecutive wins
        setTrail((prev) => {
          const next = [landed, ...prev];
          return next.slice(0, TRAIL_LEN);
        });
        // increase streak -> raises shown multiplier
        setStreak((s) => s + 1);

        const profit = Math.max(0, (res.payout ?? 0) - stake);
        const msg = `🎉 You Win! +${fmt(profit)}`;
        setResultMsg(msg);
        try { new Audio(winSound).play().catch(() => {}); } catch {}
        alert(msg);
      } else {
        // reset on loss: multiplier back to default and clear bubbles
        setStreak(0);
        setTrail(Array(TRAIL_LEN).fill("?"));

        const msg = `❌ You Lose! -${fmt(stake)}`;
        setResultMsg(msg);
        try { new Audio(loseSound).play().catch(() => {}); } catch {}
        alert(msg);
      }

      window.dispatchEvent(new Event("balance:refresh"));
    } catch (e) {
      const msg = String(e?.message || "");
      if (msg.includes("insufficient-funds")) alert("Not enough coins.");
      else if (msg.includes("min-stake")) alert("Bet is below minimum.");
      else if (msg.includes("max-stake")) alert("Bet exceeds maximum.");
      else alert("Bet failed. Try again.");
    } finally {
      setFlipping(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1020] text-white flex flex-col items-stretch">
      {/* ===== Coins header (same as Dice) ===== */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="text-sm">
          <span className="opacity-70 mr-2">Coins: </span>
          <span className="font-bold">{formatCoins(coins)}</span>
        </div>
      </div>

      {/* top progress bubbles: show '?' or 'H'/'T' for win streak */}
      <div className="flex items-center justify-center gap-3 px-4 pt-2">
        {trail.map((ch, i) => (
          <div
            key={i}
            className={`w-8 h-8 rounded-full border-2 ${ch === "?" ? "border-dashed border-white/30" : "border-emerald-400/70"} flex items-center justify-center text-sm`}
          >
            <span className={`${ch === "?" ? "opacity-80" : "font-bold"}`}>{ch}</span>
          </div>
        ))}
      </div>

      {/* main coin / coef row */}
      <div className="flex items-center justify-between px-6 mt-4">
        <div className="text-left">
          <div className="text-2xl font-bold leading-none">{round}</div>
          <div className="uppercase tracking-wider text-white/60 text-sm">Round</div>
        </div>

        {/* center coin */}
        <div
          className={`relative w-40 h-40 rounded-full mx-4 flex items-center justify-center transition-transform duration-500 ${
            flipping ? "animate-spin-slow" : ""
          }`}
          style={{
            boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
            background:
              "radial-gradient(60% 60% at 50% 40%, #FFD76A 0%, #FFA928 55%, #E37B00 100%)",
          }}
        >
          <div className="w-28 h-28 rounded-full bg-white/15 flex items-center justify-center">
            <div className="text-5xl font-black text-[#FFDF86] drop-shadow-[0_2px_0_rgba(0,0,0,0.4)]">$</div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-extrabold leading-none">x{effectiveCoef.toFixed(2)}</div>
          <div className="uppercase tracking-wider text-white/60 text-sm">Coef</div>
        </div>
      </div>

      {/* buttons: Heads / Tails */}
      <div className="px-4 mt-6 grid grid-cols-2 gap-3">
        <button
          disabled={flipping}
          onClick={() => placeBet("H")}
          className={`rounded-2xl px-4 py-4 bg-[#23293B] text-left shadow-inner border border-white/10 ${
            flipping ? "opacity-60 cursor-not-allowed" : "active:scale-[0.98]"
          }`}
        >
          <div className="flex items-center gap-3">
            <MiniCoin />
            <span className="text-lg font-semibold tracking-wide">HEADS</span>
          </div>
        </button>
        <button
          disabled={flipping}
          onClick={() => placeBet("T")}
          className={`rounded-2xl px-4 py-4 bg-[#23293B] text-left shadow-inner border border-white/10 ${
            flipping ? "opacity-60 cursor-not-allowed" : "active:scale-[0.98]"
          }`}
        >
          <div className="flex items-center gap-3">
            <MiniCoin />
            <span className="text-lg font-semibold tracking-wide">TAILS</span>
          </div>
        </button>
      </div>

      {/* bet row */}
      <div className="px-4 mt-6">
        <div className="rounded-2xl bg-[#12182B] border border-white/10 p-4">
          <div className="grid grid-cols-[auto,1fr,auto] items-center gap-3">
            <button
              onClick={() => setBet((b) => Math.max(1, Math.floor(Number(b || 0)) - 1))}
              className="w-12 h-12 min-w-[44px] min-h-[44px] rounded-md bg-black/30 border border-white/10 text-2xl leading-none"
            >−</button>
            <div className="text-center">
              <span className="text-3xl font-extrabold">{fmt(bet)}</span>
             
            </div>
            <button
              onClick={() => setBet((b) => Math.max(1, Math.floor(Number(b || 0)) + 1))}
              className="w-12 h-12 min-w-[44px] min-h-[44px] rounded-md bg-black/30 border border-white/10 text-2xl leading-none"
            >+</button>
          </div>

          {/* orange take bar */}
          <div className="mt-4">
            <div
              className="w-full rounded-xl py-3 text-center font-semibold"
              style={{
                background:
                  "linear-gradient(90deg, rgba(255,165,0,0.25) 0%, rgba(255,120,0,0.35) 100%)",
              }}
            >
              <div className="text-lg">
                {fmt(potentialProfit)} 
              </div>
              <div className="text-sm opacity-60 -mt-1">Take</div>
            </div>
          </div>
        </div>
      </div>

      {/* result toast */}
      {resultMsg && (
        <div className="px-4 mt-4">
          <div
            className={`rounded-xl px-4 py-3 text-center font-semibold ${
              resultMsg.includes("Win")
                ? "bg-emerald-600/30 text-emerald-200"
                : "bg-rose-600/30 text-rose-200"
            }`}
          >
            {resultMsg}
          </div>
        </div>
      )}

      {/* safe area spacer */}
      <div style={{ height: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }} />

      {/* slow spin keyframe */}
      <style>{`
        @keyframes spin-slow { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }
        .animate-spin-slow { animation: spin-slow 0.9s linear infinite; }
      `}</style>
    </div>
  );
}

/* little gradient coin used on the buttons */
function MiniCoin() {
  return (
    <span
      className="inline-block w-7 h-7 rounded-full"
      style={{
        background:
          "radial-gradient(60% 60% at 50% 40%, #FFD76A 0%, #FFA928 55%, #E37B00 100%)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
      }}
    />
  );
}
