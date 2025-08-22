// src/pages/Dice.jsx
import { useEffect, useState } from "react";
import { telegramAuth, getBalance, games } from "../api";

import diceRollSound from "../assets/diceRoll.mp3";
import winSound from "../assets/win.mp3";
import loseSound from "../assets/lose.mp3";

import dice1 from "../assets/1.jpg";
import dice2 from "../assets/2.jpg";
import dice3 from "../assets/3.jpg";
import dice4 from "../assets/4.jpg";
import dice5 from "../assets/5.jpg";
import dice6 from "../assets/6.jpg";

const diceImages = [dice1, dice2, dice3, dice4, dice5, dice6];

// Base payout% on win (matches your server default unless you change it there)
const BASE_PAYOUT_PCT = 0.90;
const BOOST_PER_WIN   = 0.05;
const PAYOUT_CAP      = 1.0;

// ---- helpers ----
function toNum(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function formatCoins(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
function calcEffectivePayoutPct(streak) {
  const s = Math.max(0, Number(streak) || 0);
  const pct = Math.min(PAYOUT_CAP, BASE_PAYOUT_PCT * (1 + BOOST_PER_WIN * s));
  return Number(pct.toFixed(4));
}

export default function Dice() {
  // ----- balance (unchanged) --------------------------------------------------
  const [coins, setCoins] = useState(0);

  // ----- game state -----------------------------------------------------------
  const [dice, setDice] = useState(1);
  const [bet, setBet] = useState(1);
  const [result, setResult] = useState("");
  const [rolling, setRolling] = useState(false);

  // UI slider (0–100) and mode toggle (over/under)
  const [threshold, setThreshold] = useState(42);
  const [modeOver, setModeOver] = useState(true); // true = over, false = under

  // win chance (for display only)
  const winChance = Math.max(1, Math.min(99, modeOver ? 100 - threshold : threshold));

  // STICKY base multiplier (unchanged)
  const [baseMultiplier] = useState(() => {
    const initialWinChance = Math.max(1, Math.min(99, 100 - 42)); // 58
    return Number(((100 / initialWinChance) * 0.93).toFixed(2));  // ≈ 1.60
  });

  // win-streak boosted multiplier (+5% per consecutive win)
  const [streak, setStreak] = useState(0);
  const currentMultiplier = Number((baseMultiplier * (1 + 0.05 * streak)).toFixed(2));

  // Use effective payout % for the card (derived from streak)
  const effectivePayoutPct = calcEffectivePayoutPct(streak);
  const displayPayout = Number((bet * effectivePayoutPct).toFixed(2));

  // keep your previous 1–6 mapping so server stays happy
  const sliderToGuess = (t) => {
    if (t <= 16) return 1;
    if (t <= 33) return 2;
    if (t <= 50) return 3;
    if (t <= 66) return 4;
    if (t <= 83) return 5;
    return 6;
  };

  // ---------- balance bootstrap (unchanged) -----------------------------------
  useEffect(() => {
    let stopPolling = () => {};
    (async () => {
      try {
        const u = await telegramAuth();
        if (Number.isFinite(Number(u?.coins))) {
          const initial = toNum(u.coins);
          setCoins((prev) => (initial !== prev ? initial : prev));
        }
        try {
          const c = await getBalance();
          if (Number.isFinite(c)) setCoins((prev) => (c !== prev ? c : prev));
        } catch {}
        stopPolling = (() => {
          let alive = true;
          (function tick() {
            setTimeout(async () => {
              if (!alive) return;
              try {
                const c = await getBalance();
                if (Number.isFinite(c)) setCoins((prev) => (c !== prev ? c : prev));
              } catch {} finally {
                if (alive) tick();
              }
            }, 4000);
          })();
          return () => { alive = false; };
        })();
      } catch (e) {
        console.error("[Dice] telegramAuth failed:", e);
      }
    })();
    return () => { stopPolling?.(); };
  }, []);

  useEffect(() => {
    const refresh = async () => {
      try {
        const c = await getBalance();
        if (Number.isFinite(c)) setCoins((prev) => (c !== prev ? c : prev));
      } catch {}
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("balance:refresh", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("balance:refresh", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const clampInt = (v, min, max) => {
    const n = Math.floor(Number(v || 0));
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max ?? n, n));
  };

  // ---------- roll / bet ------------------------------------------------------
  const rollDice = async () => {
    const stake = clampInt(bet, 1);
    if (stake <= 0) return alert("Enter a valid bet (>= 1).");
    if (Number(coins) < stake) return alert("Not enough coins.");

    setResult("");
    setRolling(true);

    try { new Audio(diceRollSound).play().catch(() => {}); } catch {}
    let frames = 0;
    const spin = setInterval(() => {
      setDice(Math.floor(Math.random() * 6) + 1);
      if (++frames >= 10) clearInterval(spin);
    }, 90);

    try {
      // send mode/threshold/streak so backend uses new dice path with streak boost
      const guessForServer = sliderToGuess(threshold);
      const res = await games.dice(
        stake,
        guessForServer,
        { mode: modeOver ? "over" : "under", threshold, streak }
      );

      try { clearInterval(spin); } catch {}
      const final = Number(res?.details?.roll) || Math.floor(Math.random() * 6) + 1;
      setDice(final);

      if (Number.isFinite(res?.newBalance)) {
        setCoins((prev) => (res.newBalance !== prev ? res.newBalance : prev));
      }

      if (res?.result === "win") {
        setStreak((s) => s + 1);
        const msg = `🎉 You Win! +${res.payout}`;
        setResult(msg);
        try { new Audio(winSound).play().catch(() => {}); } catch {}
        alert(msg);
      } else {
        setStreak(0);
        const msg = `❌ You Lose! -${stake}`;
        setResult(msg);
        try { new Audio(loseSound).play().catch(() => {}); } catch {}
        alert(msg);
      }
      window.dispatchEvent(new Event("balance:refresh"));
    } catch (e) {
      setStreak(0);
      const msg = String(e?.message || "");
      if (msg.includes("insufficient-funds")) alert("Not enough coins.");
      else if (msg.includes("min-stake")) alert("Bet is below minimum.");
      else if (msg.includes("max-stake")) alert("Bet exceeds maximum.");
      else alert("Bet failed. Try again.");
    } finally {
      setRolling(false);
    }
  };

  // ---------- UI --------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#08122B] text-white overflow-x-hidden">
      {/* Top bar with Back button on left of Coins */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <BackButtonInline />
          <div className="text-sm">
            <span className="opacity-70 mr-2">Coins: </span>
            <span className="font-bold">{formatCoins(coins)}</span>
          </div>
        </div>
      </div>

      <div
        className="max-w-md mx-auto px-4 pb-24 w-full"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 96px)" }}
      >
        {/* Slider card */}
        <div className="mt-2 rounded-2xl bg-[#0C1A3A] border border-white/10 p-4 relative">
          {/* visual track */}
          <div className="relative">
            <div className="h-3 w-full rounded-full bg-gradient-to-r from-red-500 via-red-500 to-green-500" />

            {/* thumb */}
            <div
              className="absolute -top-2"
              style={{ left: `calc(${threshold}% - 14px)` }}
            >
              <div className="w-7 h-7 rounded-md bg-[#FFB800] border-2 border-yellow-300 shadow" />
            </div>

            {/* click/drag overlay */}
            <input
              type="range"
              min={0}
              max={100}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              aria-label="Win range slider"
              className="absolute left-0 right-0 top-[-8px] bottom-[-8px] opacity-0 cursor-pointer"
            />

            <div className="mt-2 flex justify-between text-xs opacity-70">
              <span>0</span><span>100</span>
            </div>
          </div>

          {/* blue pill showing number */}
          <div className="mt-2 flex justify-center">
            <div className="px-3 py-1 text-sm rounded-full bg-[#133AA5]">{threshold}</div>
          </div>

          {/* info row */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-black/30 border border-white/10 p-3">
              <div className="text-[10px] sm:text-xs uppercase tracking-wider opacity-60">Multiplier</div>
              <div className="text-lg sm:text-xl font-semibold">
                {currentMultiplier.toFixed(2)}
                <span className="opacity-60 text-sm">x</span>
              </div>
              {streak > 0 && (
                <div className="mt-1 text-[10px] sm:text-xs opacity-60">
                  streak +{streak} (base {baseMultiplier.toFixed(2)}x)
                </div>
              )}
            </div>

            {/* Roll over/under toggle */}
            <div className="rounded-lg bg-black/30 border border-white/10 p-3">
              <div className="text-[10px] sm:text-xs uppercase tracking-wider opacity-60">
                {modeOver ? "Roll over to win" : "Roll under to win"}
              </div>
              <button
                onClick={() => setModeOver((v) => !v)}
                className="mt-2 rounded bg-[#133AA5] px-3 py-2 text-xs sm:text-sm min-h-[40px]"
                title="Toggle over/under"
              >
                ↔ Change
              </button>
            </div>

            <div className="rounded-lg bg-black/30 border border-white/10 p-3">
              <div className="text-[10px] sm:text-xs uppercase tracking-wider opacity-60">Win chance</div>
              <div className="text-lg sm:text-xl font-semibold">
                {winChance.toFixed(2)}<span className="opacity-60 text-sm">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bet amount card (UPDATED: smaller input left→middle, +/− stacked right) */}
        <div className="mt-4 rounded-2xl bg-[#0C1A3A] border border-white/10 p-4">
          <div className="text-xs opacity-70 mb-2">BET AMOUNT</div>

          {/* Smaller input on the left, + on top / − below on the right */}
<div className="grid grid-cols-[1fr,auto] items-start gap-3">
  <div className="justify-self-start">
    <input
      type="number"
      inputMode="numeric"
      min="1"
      value={bet}
      onChange={(e) => setBet(Math.max(1, Number(e.target.value || 1)))}
      className="w-32 sm:w-40 md:w-48 text-center text-2xl font-bold rounded-md bg-black/60 border border-white/10 py-2 px-3"
      aria-label="Bet amount"
    />
  </div>

  {/* raise buttons to align with the input’s placeholder line */}
  <div className="flex items-center gap-2 justify-self-end self-start -mt-15">
    <button
      onClick={() => setBet((b) => b + 1)}
      className="w-12 h-12 min-w-[44px] min-h-[44px] rounded-md bg-black/30 border border-white/10 text-2xl leading-none"
      aria-label="Increase bet"
    >+</button>
    <button
      onClick={() => setBet((b) => Math.max(1, b - 1))}
      className="w-12 h-12 min-w-[44px] min-h-[44px] rounded-md bg-black/30 border border-white/10 text-2xl leading-none"
      aria-label="Decrease bet"
    >−</button>
  </div>
</div>



          {/* Row for multiplier actions and payout on win (unchanged semantics) */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs opacity-70 mb-1">MULTIPLY BET AMOUNT</div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setBet((b) => Math.max(1, b * 2))}
                  className="px-3 py-2 rounded bg-black/40 border border-white/10 text-sm min-h-[40px]"
                >2X</button>
                <button
                  onClick={() => setBet((b) => Math.max(1, b * 5))}
                  className="px-3 py-2 rounded bg-black/40 border border-white/10 text-sm min-h-[40px]"
                >5X</button>
                <button
                  onClick={() => setBet((b) => Math.max(1, Math.floor(coins)))}
                  className="px-3 py-2 rounded bg-[#1F5EFF] text-white text-sm min-h-[40px]"
                >MAX</button>
              </div>
            </div>
            <div>
              <div className="text-xs opacity-70 mb-1">PAYOUT ON WIN</div>
              <div className="px-3 py-2 rounded bg-black/60 border border-white/10 text-sm font-semibold">
                {displayPayout.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        

        {/* ROLL button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={rollDice}
            disabled={rolling}
            className={`w-full max-w-xs py-4 rounded-xl text-xl font-bold shadow-md min-h-[48px] ${
              rolling ? "bg-green-300 text-black/80 cursor-not-allowed" : "bg-[#35D15E] text-white"
            }`}
            aria-label="Roll"
          >
            {rolling ? "Rolling..." : "ROLL"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Back button (left of Coins) ---------- */
function BackButtonInline({ to = "/" }) {
  const onClick = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.assign(to);
    }
  };
  return (
    <button
      onClick={onClick}
      aria-label="Go back"
      className="inline-flex items-center justify-center w-8 h-8 pr-2 mr-3 rounded-lg border border-white/10 hover:bg-white/10 active:scale-95 text-white/80"
      style={{ background: "rgba(255,255,255,0.04)" }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}

