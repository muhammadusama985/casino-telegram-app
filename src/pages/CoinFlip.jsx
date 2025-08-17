// src/pages/FlipCoin.jsx
import { useEffect, useState } from "react";
import { telegramAuth, getBalance, games } from "../api"; // same trio you use in MainLayout

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

export default function FlipCoin() {
  // ---- coins managed with the EXACT logic you use in MainLayout ----
  const [coins, setCoins] = useState(0);

  // ---- UI state ----
  const [bet, setBet] = useState(1);
  const [pick, setPick] = useState("H"); // 'H' or 'T'
  const [result, setResult] = useState("");
  const [flipping, setFlipping] = useState(false);

  // coin visual state
  const [animating, setAnimating] = useState(false);
  const [face, setFace] = useState("H"); // which side is facing front at rest

  // ---------- BALANCE BOOTSTRAP (same flow as your MainLayout) ----------
  useEffect(() => {
    let stopPolling = () => {};

    (async () => {
      try {
        // 1) Login → returns user object (u)
        const u = await telegramAuth();

        // Show DB coins from login payload ONLY if provided as a finite number
        if (Number.isFinite(Number(u?.coins))) {
          const initial = toNum(u.coins);
          setCoins((prev) => (initial !== prev ? initial : prev));
        }

        // 2) Confirm from backend once (now that x-user-id is set)
        try {
          const c = await getBalance(); // returns a Number
          if (Number.isFinite(c)) setCoins((prev) => (c !== prev ? c : prev));
        } catch {
          /* ignore single bad read */
        }

        // 3) Start polling ONLY AFTER login succeeded
        stopPolling = (() => {
          let alive = true;
          (function tick() {
            setTimeout(async () => {
              if (!alive) return;
              try {
                const c = await getBalance();
                if (Number.isFinite(c)) setCoins((prev) => (c !== prev ? c : prev));
              } catch {
                /* ignore failed poll; do not set 0 */
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
        console.error("[FlipCoin] telegramAuth failed:", e);
      }
    })();

    return () => {
      stopPolling?.();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 🔔 Same refresh hooks as MainLayout (event + tab visibility)
  useEffect(() => {
    const refresh = async () => {
      try {
        const c = await getBalance();
        if (Number.isFinite(c)) setCoins((prev) => (c !== prev ? c : prev));
      } catch {
        /* ignore errors so we don't overwrite with 0 */
      }
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

  // ---------- flip / bet ----------
  const onFlip = async () => {
    const stake = clampInt(bet, 1);
    if (stake <= 0) return alert("Enter a valid bet (>= 1).");
    if (Number(coins) < stake) return alert("Not enough coins.");

    setResult("");
    setFlipping(true);
    setAnimating(true); // start CSS animation

    const start = Date.now();
    try {
      // Server decides outcome (RTP-aware) and updates Mongo balance
      const res = await games.coinflip(stake, pick); // { result, payout, newBalance, details:{pick, landed, pWin, m} }

      // ensure animation feels good (at least ~900ms)
      const minMs = 900;
      const elapsed = Date.now() - start;
      if (elapsed < minMs) {
        await new Promise((r) => setTimeout(r, minMs - elapsed));
      }

      // stop animation and show the actual landed side
      const landed = res?.details?.landed === "T" ? "T" : "H";
      setAnimating(false);
      setFace(landed);

      // Apply server truth immediately
      if (Number.isFinite(res?.newBalance)) {
        setCoins((prev) => (res.newBalance !== prev ? res.newBalance : prev));
      }

      // Outcome UI
      if (res?.result === "win") {
        setResult(`🎉 You Win! +${res.payout}`);
      } else {
        setResult(`❌ You Lose! -${stake}`);
      }

      // Notify the rest of the app to refresh too
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

  // ---------- UI ----------
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black px-4 py-10 text-white">
      {/* local styles for the coin flip */}
      <style>{`
        .coin-scene { perspective: 900px; }
        .coin {
          width: 120px; height: 120px;
          position: relative;
          transform-style: preserve-3d;
          border-radius: 9999px;
        }
        .coin.animate {
          animation: coinflip 0.6s linear infinite;
        }
        @keyframes coinflip {
          0%   { transform: rotateY(0deg) }
          100% { transform: rotateY(1800deg) }
        }
        .coin-face {
          position: absolute; inset: 0;
          display: grid; place-items: center;
          border-radius: 9999px;
          backface-visibility: hidden;
          font-weight: 800; font-size: 2rem; letter-spacing: 0.04em;
        }
        .coin-front {
          background: radial-gradient(circle at 30% 30%, #fde68a, #d97706 60%, #92400e 95%);
          color: #111827;
          transform: rotateY(0deg) translateZ(1px);
          box-shadow: inset 0 0 20px rgba(0,0,0,0.25);
        }
        .coin-back {
          background: radial-gradient(circle at 30% 30%, #a7f3d0, #059669 60%, #065f46 95%);
          color: #081016;
          transform: rotateY(180deg) translateZ(1px);
          box-shadow: inset 0 0 20px rgba(0,0,0,0.25);
        }
      `}</style>

      <div className="max-w-xl mx-auto">
        <h1 className="text-4xl font-extrabold mb-2 text-center">
          🪙 Flip&nbsp;<span className="text-yellow-400">Coin</span>
        </h1>
        <p className="text-center text-zinc-400 mb-6">
          Pick Heads or Tails, set your stake, and flip. RTP tuned server-side.
        </p>

        <div className="text-2xl mb-6 text-center font-mono text-zinc-300">
          Balance: <span className="text-yellow-500">{fmtCoins(toNum(coins))} COIN</span>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Pick */}
          <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 shadow-inner">
            <div className="text-sm font-semibold text-zinc-300 mb-2">Your Pick</div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPick("H")}
                className={`h-12 rounded-xl font-semibold transition ${
                  pick === "H"
                    ? "bg-yellow-500 text-black shadow"
                    : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                }`}
              >
                Heads
              </button>
              <button
                onClick={() => setPick("T")}
                className={`h-12 rounded-xl font-semibold transition ${
                  pick === "T"
                    ? "bg-emerald-500 text-black shadow"
                    : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                }`}
              >
                Tails
              </button>
            </div>
          </div>

          {/* Bet */}
          <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 shadow-inner md:col-span-2">
            <div className="text-sm font-semibold text-zinc-300 mb-2">Bet (coins)</div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                value={bet}
                onChange={(e) => setBet(clampInt(e.target.value, 1))}
                className="text-black w-full px-3 py-2 rounded bg-white font-bold"
              />
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
        </div>

        {/* Coin visual */}
        <div className="coin-scene mx-auto mb-8 grid place-items-center">
          <div
            className={`coin ${animating ? "animate" : ""}`}
            style={{
              transform:
                animating
                  ? undefined
                  : face === "H"
                  ? "rotateY(0deg)"
                  : "rotateY(180deg)",
              transition: animating ? "none" : "transform 340ms ease-out",
            }}
          >
            <div className="coin-face coin-front">H</div>
            <div className="coin-face coin-back">T</div>
          </div>
        </div>

        {/* Flip button */}
        <div className="text-center">
          <button
            onClick={onFlip}
            disabled={flipping}
            className={`px-6 py-3 rounded-2xl font-bold text-lg shadow-md transition-all duration-200 ${
              flipping
                ? "bg-yellow-300 text-black opacity-70 cursor-not-allowed"
                : "bg-gradient-to-r from-yellow-500 to-amber-400 hover:from-yellow-400 hover:to-amber-300 text-black"
            }`}
          >
            {flipping ? "Flipping..." : `Flip ${pick === "H" ? "Heads" : "Tails"}`}
          </button>
        </div>

        {/* Result */}
        {result && (
          <div
            className={`mt-6 px-6 py-4 text-center rounded-xl font-semibold text-lg ${
              result.includes("Win")
                ? "bg-green-600 text-white shadow-lg"
                : result.includes("Lose")
                ? "bg-red-600 text-white shadow-lg"
                : "bg-zinc-800 text-white"
            }`}
          >
            {result}
          </div>
        )}

        {/* Hints */}
        <div className="mt-6 text-center text-xs text-zinc-500">
          Multiplier & RTP are enforced server-side. Outcomes are decided on the backend.
        </div>
      </div>
    </div>
  );
}
