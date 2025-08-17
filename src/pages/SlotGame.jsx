// src/pages/Slot.jsx
import { useEffect, useMemo, useState } from "react";
import { telegramAuth, getBalance, games } from "../api";

// ---------- helpers ----------
function toNum(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
const fmtCoins = (n) =>
  Number.isFinite(Number(n)) ? Number(n).toLocaleString("en-US") : "0";
const clampInt = (v, min, max) => {
  const n = Math.floor(Number(v || 0));
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max ?? n, n));
};

export default function Slot() {
  // ---- coins managed with the SAME logic you use elsewhere ----
  const [coins, setCoins] = useState(0);

  // ---- slot UI state ----
  const symbols = useMemo(() => ["🍒", "🍋", "🔔", "⭐", "7️⃣", "💎", "🍀", "🍇"], []);
  const [bet, setBet] = useState(10);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(""); // UI text: win/lose
  const [payout, setPayout] = useState(0);
  const [lastMult, setLastMult] = useState(null); // e.g., 2x, 10x, etc.

  // reels: each is an array of 3 visible symbols
  const [reelA, setReelA] = useState(["🍒", "🍋", "🔔"]);
  const [reelB, setReelB] = useState(["⭐", "7️⃣", "💎"]);
  const [reelC, setReelC] = useState(["🍀", "🍇", "🍒"]);

  // ---------- BALANCE BOOTSTRAP (same flow as your MainLayout) ----------
  useEffect(() => {
    let stopPolling = () => {};

    (async () => {
      try {
        // 1) Login
        const u = await telegramAuth();
        if (Number.isFinite(Number(u?.coins))) {
          const initial = toNum(u.coins);
          setCoins((prev) => (initial !== prev ? initial : prev));
        }

        // 2) Confirm from backend once
        try {
          const c = await getBalance();
          if (Number.isFinite(c)) setCoins((prev) => (c !== prev ? c : prev));
        } catch {}

        // 3) Start polling
        stopPolling = (() => {
          let alive = true;
          (function tick() {
            setTimeout(async () => {
              if (!alive) return;
              try {
                const c = await getBalance();
                if (Number.isFinite(c)) setCoins((prev) => (c !== prev ? c : prev));
              } catch {
              } finally {
                if (alive) tick();
              }
            }, 4000);
          })();
          return () => {
            alive = false;
          };
        })();
      } catch (e) {
        console.error("[Slot] telegramAuth failed:", e);
      }
    })();

    return () => {
      stopPolling?.();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 🔔 Same refresh hooks as elsewhere (event + tab visibility)
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

  // ---------- reel helpers ----------
  const randSymbol = () => symbols[Math.floor(Math.random() * symbols.length)];
  const randomColumn = () => [randSymbol(), randSymbol(), randSymbol()];

  // simulate reel spin visuals while backend decides result
  const startSpinVisual = () => {
    setResult("");
    setPayout(0);
    setLastMult(null);
    setSpinning(true);
  };
  const stopSpinVisualWithRandoms = () => {
    setReelA(randomColumn());
    setReelB(randomColumn());
    setReelC(randomColumn());
    setSpinning(false);
  };

  // ---------- spin / bet ----------
  const onSpin = async () => {
    const stake = clampInt(bet, 1);
    if (stake <= 0) return alert("Enter a valid bet (>= 1).");
    if (Number(coins) < stake) return alert("Not enough coins.");

    startSpinVisual();

    // keep the reels "moving" by just refreshing symbols periodically
    let visualTimer = setInterval(() => {
      setReelA(randomColumn());
      setReelB(randomColumn());
      setReelC(randomColumn());
    }, 90);

    const startedAt = Date.now();
    try {
      // Server outcome (RTP aware). Expect: { result, payout, newBalance, details:{ multiplier, factor, eM } }
      // Use games.slot(stake) helper if you added it; otherwise: games.bet({game:'slot', stakeCoins: stake})
      const res = (typeof games.slot === "function")
        ? await games.slot(stake)
        : await games.bet({ game: "slot", stakeCoins: stake });

      // Ensure minimum spin time for feel
      const minMs = 1000;
      const elapsed = Date.now() - startedAt;
      if (elapsed < minMs) {
        await new Promise((r) => setTimeout(r, minMs - elapsed));
      }

      try { clearInterval(visualTimer); } catch {}
      visualTimer = null;

      // Land reels visually (random, purely cosmetic)
      stopSpinVisualWithRandoms();

      // Update balance from server
      if (Number.isFinite(res?.newBalance)) {
        setCoins((prev) => (res.newBalance !== prev ? res.newBalance : prev));
      }

      // Show result text and payout/multiplier if any
      const mult = Number(res?.details?.multiplier);
      if (res?.result === "win" && Number.isFinite(res?.payout) && res.payout > 0) {
        setPayout(res.payout);
        if (Number.isFinite(mult) && mult > 0) setLastMult(mult);
        setResult(`🎉 WIN +${res.payout}${Number.isFinite(mult) ? `  (x${mult})` : ""}`);
      } else {
        setResult(`❌ Lose -${stake}`);
      }

      // Notify app-wide listeners
      window.dispatchEvent(new Event("balance:refresh"));
    } catch (e) {
      console.error("[Slot] spin error:", e);
      const msg = String(e?.message || "");
      if (msg.includes("insufficient-funds")) alert("Not enough coins.");
      else if (msg.includes("min-stake")) alert("Bet is below minimum.");
      else if (msg.includes("max-stake")) alert("Bet exceeds maximum.");
      else alert("Spin failed. Try again.");
    } finally {
      try { clearInterval(visualTimer); } catch {}
      setSpinning(false);
    }
  };

  // ---------- UI ----------
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black px-4 py-10 text-white">
      <style>{`
        .reel {
          background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
          border-radius: 1rem;
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: inset 0 0 24px rgba(0,0,0,0.35);
        }
        .cell {
          height: 74px;
          display: grid;
          place-items: center;
          font-size: 2rem;
        }
        .panel {
          background: linear-gradient(180deg, rgba(250,204,21,0.12), rgba(250,204,21,0.02));
          border: 1px solid rgba(250,204,21,0.25);
          border-radius: 1rem;
        }
      `}</style>

      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-extrabold mb-2 text-center">
          🎰 <span className="text-yellow-400">Slots</span>
        </h1>
        <p className="text-center text-zinc-400 mb-6">
          Spin the reels. Server enforces RTP. Payouts are credited automatically.
        </p>

        {/* Balance */}
        <div className="text-2xl mb-6 text-center font-mono text-zinc-300">
          Balance: <span className="text-yellow-500">{fmtCoins(toNum(coins))} COIN</span>
        </div>

        {/* Reels */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="reel p-2">
            {reelA.map((s, i) => (
              <div key={`a-${i}`} className="cell">{s}</div>
            ))}
          </div>
          <div className="reel p-2">
            {reelB.map((s, i) => (
              <div key={`b-${i}`} className="cell">{s}</div>
            ))}
          </div>
          <div className="reel p-2">
            {reelC.map((s, i) => (
              <div key={`c-${i}`} className="cell">{s}</div>
            ))}
          </div>
        </div>

        {/* Bet panel */}
        <div className="panel p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="text-sm font-semibold text-zinc-300 mb-2">Bet (coins)</div>
              <input
                type="number"
                min="1"
                value={bet}
                onChange={(e) => setBet(clampInt(e.target.value, 1))}
                className="text-black w-full px-3 py-2 rounded bg-white font-bold"
              />
            </div>
            <div className="flex gap-2">
              {[10, 50, 100].map((n) => (
                <button
                  key={n}
                  onClick={() => setBet(n)}
                  className="px-3 py-2 rounded-lg bg-zinc-800 text-zinc-200 hover:bg-zinc-700 text-sm"
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setBet(Math.max(1, Math.floor(coins)))}
                className="px-3 py-2 rounded-lg bg-zinc-800 text-zinc-200 hover:bg-zinc-700 text-sm"
              >
                MAX
              </button>
            </div>
          </div>
        </div>

        {/* Spin button */}
        <div className="text-center">
          <button
            onClick={onSpin}
            disabled={spinning}
            className={`px-6 py-3 rounded-2xl font-bold text-lg shadow-md transition-all duration-200 ${
              spinning
                ? "bg-yellow-300 text-black opacity-70 cursor-not-allowed"
                : "bg-gradient-to-r from-yellow-500 to-amber-400 hover:from-yellow-400 hover:to-amber-300 text-black"
            }`}
          >
            {spinning ? "Spinning..." : "Spin"}
          </button>
        </div>

        {/* Result banner */}
        {result && (
          <div
            className={`mt-6 px-6 py-4 text-center rounded-xl font-semibold text-lg ${
              result.startsWith("🎉")
                ? "bg-green-600 text-white shadow-lg"
                : "bg-red-600 text-white shadow-lg"
            }`}
          >
            {result}
          </div>
        )}

        {/* Footer hint */}
        <div className="mt-6 text-center text-xs text-zinc-500">
          Results & multiplier come from server. Visual reels are cosmetic.
        </div>
      </div>
    </div>
  );
}
