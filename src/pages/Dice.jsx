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

function toNum(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
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

  // ❗ Make base multiplier STICKY: compute once, not tied to over/under or slider
  // Default uses initial state: threshold=42, over => winChance ≈ 58% → ~1.60x with 7% edge
  const [baseMultiplier] = useState(() => {
    const initialWinChance = Math.max(1, Math.min(99, 100 - 42)); // 58
    return Number(((100 / initialWinChance) * 0.93).toFixed(2));  // ≈ 1.60
  });

  // win-streak boosted multiplier (+5% per consecutive win)
  const [streak, setStreak] = useState(0);
  const currentMultiplier = Number((baseMultiplier * (1 + 0.05 * streak)).toFixed(2));

  // UI payout display = 90% of bet (per request)
  const displayPayout = Number((bet * 0.90).toFixed(2));

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
      // keep original signature; pass mode/threshold as 3rd optional arg if your API supports it
      const guessForServer = sliderToGuess(threshold);
      const res = await games.dice(stake, guessForServer, { mode: modeOver ? "over" : "under", threshold });

      try { clearInterval(spin); } catch {}
      const final = Number(res?.details?.roll) || Math.floor(Math.random() * 6) + 1;
      setDice(final);

      if (Number.isFinite(res?.newBalance)) {
        setCoins((prev) => (res.newBalance !== prev ? res.newBalance : prev));
      }

      if (res?.result === "win") {
        setStreak((s) => s + 1);            // increase streak → multiplier grows
        setResult(`🎉 You Win! +${res.payout}`);
        try { new Audio(winSound).play().catch(() => {}); } catch {}
      } else {
        setStreak(0);                        // reset on loss → back to base multiplier
        setResult(`❌ You Lose! -${stake}`);
        try { new Audio(loseSound).play().catch(() => {}); } catch {}
      }
      window.dispatchEvent(new Event("balance:refresh"));
    } catch (e) {
      setStreak(0); // on error, also reset
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
    <div className="min-h-screen bg-[#08122B] text-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3">
        
      </div>

      <div className="max-w-md mx-auto px-4 pb-24">
        {/* Slider card (only one, fully functional) */}
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

            {/* click/drag overlay: invisible range makes the bar functional */}
            <input
              type="range"
              min={0}
              max={100}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />

            {/* labels 0 and 100 only (50 removed) */}
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
              <div className="text-[10px] uppercase tracking-wider opacity-60">Multiplier</div>
              <div className="text-lg font-semibold">
                {currentMultiplier.toFixed(2)}
                <span className="opacity-60 text-sm">x</span>
              </div>
              {streak > 0 && (
                <div className="mt-1 text-[10px] opacity-60">streak +{streak} (base {baseMultiplier.toFixed(2)}x)</div>
              )}
            </div>

            {/* Roll over/under toggle – no numeric value field */}
            <div className="rounded-lg bg-black/30 border border-white/10 p-3">
              <div className="text-[10px] uppercase tracking-wider opacity-60">
                {modeOver ? "Roll over to win" : "Roll under to win"}
              </div>
              <button
                onClick={() => setModeOver((v) => !v)}
                className="mt-2 rounded bg-[#133AA5] px-2 py-1 text-xs"
                title="Toggle over/under"
              >
                ↔ Change
              </button>
            </div>

            <div className="rounded-lg bg-black/30 border border-white/10 p-3">
              <div className="text-[10px] uppercase tracking-wider opacity-60">Win chance</div>
              <div className="text-lg font-semibold">
                {winChance.toFixed(2)}<span className="opacity-60 text-sm">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs (Auto disabled) */}
        <div className="mt-5 flex gap-6 border-b border-white/10">
          <button className="pb-2 text-sm font-semibold border-b-2 border-white">MANUAL</button>
          <button className="pb-2 text-sm opacity-50 cursor-not-allowed">AUTO</button>
        </div>

        {/* Bet amount card */}
        <div className="mt-4 rounded-2xl bg-[#0C1A3A] border border-white/10 p-4">
          <div className="text-xs opacity-70 mb-2">BET AMOUNT</div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setBet((b) => Math.max(1, b - 1))}
              className="w-12 h-12 rounded-md bg-black/30 border border-white/10 text-2xl leading-none"
            >−</button>
            <input
              type="number"
              min="1"
              value={bet}
              onChange={(e) => setBet(Math.max(1, Number(e.target.value || 1)))}
              className="flex-1 text-center text-2xl font-bold rounded-md bg-black/60 border border-white/10 py-2"
            />
            <button
              onClick={() => setBet((b) => b + 1)}
              className="w-12 h-12 rounded-md bg-black/30 border border-white/10 text-2xl leading-none"
            >+</button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs opacity-70 mb-1">MULTIPLY BET AMOUNT</div>
              <div className="flex items-center gap-2">
                <button onClick={() => setBet((b) => Math.max(1, b * 2))} className="px-3 py-2 rounded bg-black/40 border border-white/10 text-sm">2X</button>
                <button onClick={() => setBet((b) => Math.max(1, b * 5))} className="px-3 py-2 rounded bg-black/40 border border-white/10 text-sm">5X</button>
                <button onClick={() => setBet((b) => Math.max(1, Math.floor(coins)))} className="px-3 py-2 rounded bg-[#1F5EFF] text-white text-sm">MAX</button>
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
            className={`w-full max-w-xs py-4 rounded-xl text-xl font-bold shadow-md ${rolling ? "bg-green-300 text-black/80 cursor-not-allowed" : "bg-[#35D15E] text-white"}`}
          >
            {rolling ? "Rolling..." : "ROLL"}
          </button>
        </div>
      </div>
    </div>
  );
}
