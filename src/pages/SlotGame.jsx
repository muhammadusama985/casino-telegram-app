// src/pages/SlotBonanza.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { telegramAuth, getBalance, games } from "../api";

import spinSfx from "../assets/diceRoll.mp3";
import winSfx from "../assets/win.mp3";
import loseSfx from "../assets/lose.mp3";

/* ----------------- helpers ----------------- */
function toNum(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function fmt(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "0";
  return x.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
function asEmoji(val) {
  // after normalization, cells are always strings or null
  return typeof val === "string" ? val : "🍬";
}

/* ------------- main component ------------- */
export default function SlotBonanza() {
  // balance
  const [coins, setCoins] = useState(0);

  // betting
  const [bet, setBet] = useState(1);

  // spin state
  const [spinning, setSpinning] = useState(false);
  const [grid, setGrid] = useState(() => emptyGrid());
  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0);
  const [sumBombs, setSumBombs] = useState(0);

  // win states
  const [lastSpinWin, setLastSpinWin] = useState(0);             // actual final payout
  const [lastSpinWinDisplay, setLastSpinWinDisplay] = useState(0); // animated counter
  const [winBump, setWinBump] = useState(false);                   // small glow when ticking
  const [showConfetti, setShowConfetti] = useState(false);
  const [bigWinPulse, setBigWinPulse] = useState(false);

  // animation helpers
  const cascadeQueueRef = useRef([]);
  const cascadeTimerRef = useRef(null);

  // counter animation refs
  const counterFromRef = useRef(0);
  const counterToRef = useRef(0);
  const counterRAF = useRef(0);

  const inBonus = freeSpinsLeft > 0;

  /* ----------- bootstrap balance ----------- */
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
        console.error("[SlotBonanza] telegramAuth failed:", e);
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

  // stop counter animation on unmount
  useEffect(() => () => cancelAnimationFrame(counterRAF.current), []);

  /* ------------------- spin flow ------------------- */
  const spin = async () => {
    if (spinning) return;
    const stake = Math.max(1, Math.floor(Number(bet || 0)));
    if (!Number.isFinite(stake) || stake <= 0) return alert("Enter a valid bet (>= 1).");
    if (Number(coins) < stake) return alert("Not enough coins.");

    setSpinning(true);
    setLastSpinWin(0);
    setLastSpinWinDisplay(0);  // reset counter at spin start
    setWinBump(false);
    setBigWinPulse(false);
    setShowConfetti(false);
    setSumBombs(0);

    try { new Audio(spinSfx).play().catch(() => {}); } catch {}

    try {
      const res = await games.slot(stake);

      if (Number.isFinite(res?.newBalance)) {
        setCoins((prev) => (res.newBalance !== prev ? res.newBalance : prev));
      }

      const d = res?.details || {};
      const cascades = Array.isArray(d.cascades) && d.cascades.length > 0
        ? d.cascades
        : [{ grid: d.grid || randomGrid(), stepWin: res?.payout || 0 }];

      // free spins: track if awarded / remaining
      if (Number.isFinite(d.freeSpinsAwarded) && d.freeSpinsAwarded > 0) {
        setFreeSpinsLeft((x) => x + Number(d.freeSpinsAwarded || 0));
      }
      if (Number.isFinite(d.freeSpinsLeft)) {
        setFreeSpinsLeft(Number(d.freeSpinsLeft));
      }

      // total multiplier within this spin
      if (Number.isFinite(d.multiplierTotal)) {
        setSumBombs(Number(d.multiplierTotal));
      } else if (Array.isArray(d.multipliersApplied)) {
        const sum = d.multipliersApplied.reduce((a, b) => a + Number(b || 0), 0);
        setSumBombs(sum);
      }

      // animate cascades sequentially
      cascadeQueueRef.current = cascades.slice(0);
      stepCascade();

      // final outcome
      const winAmt = Number(res?.payout || 0);
      const gotWin = winAmt > 0;
      setLastSpinWin(winAmt);

      // reconcile the running counter to the final payout after cascades settle
      setTimeout(() => {
        animateCounterTo(winAmt, 500);
      }, 450);

      if (gotWin) {
        haptic("impact");
        try { new Audio(winSfx).play().catch(() => {}); } catch {}
        const bigWin = winAmt >= 50 * stake; // tweak threshold if you like
        if (bigWin) {
          setBigWinPulse(true);
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 1800);
        }
      } else {
        haptic("notification");
        try { new Audio(loseSfx).play().catch(() => {}); } catch {}
      }

      window.dispatchEvent(new Event("balance:refresh"));
    } catch (e) {
      const msg = String(e?.message || "");
      if (msg.includes("insufficient-funds")) alert("Not enough coins.");
      else if (msg.includes("min-stake")) alert("Bet is below minimum.");
      else if (msg.includes("max-stake")) alert("Bet exceeds maximum.");
      else alert("Spin failed. Try again.");
    } finally {
      setTimeout(() => setSpinning(false), 400);
    }
  };

  // animate the displayed last win to a target
  function animateCounterTo(target, duration = 320) {
    cancelAnimationFrame(counterRAF.current);
    const start = (counterFromRef.current = Number(lastSpinWinDisplay) || 0);
    const end = (counterToRef.current = Number(target) || 0);
    const t0 = performance.now();

    const tick = (now) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - (1 - t) * (1 - t); // easeOutQuad
      const v = start + (end - start) * eased;
      setLastSpinWinDisplay(v);
      if (t < 1) counterRAF.current = requestAnimationFrame(tick);
    };
    counterRAF.current = requestAnimationFrame(tick);
  }

  // run each cascade step:
  // 1) flash cleared cells
  // 2) after a short delay, show next grid with drop-in animation
  function stepCascade() {
    clearTimeout(cascadeTimerRef.current);
    const next = cascadeQueueRef.current.shift();
    if (!next) return;

    const normalized = normalizeGrid(next.grid);

    // 1) mark cleared cells for flash/pop
    const cleared = new Set((next.cleared || []).map(([r, c]) => `${r}:${c}`));

    // bump the counter by this step's win immediately
    const stepWin = Number(next.stepWin || 0);
    if (stepWin > 0) {
      const current = Number(counterToRef.current || lastSpinWinDisplay || 0);
      animateCounterTo(current + stepWin, 260);
      // small glow bump on the card
      setWinBump(true);
      setTimeout(() => setWinBump(false), 180);
    }

    // show "clearing" state on cells that are being removed
    setGrid((old) => {
      const g = (old && old.length) ? old : normalized;
      return g.map((row, r) =>
        row.map((cell, c) => ({
          v: g[r][c]?.v ?? null,
          mult: g[r][c]?.mult ?? 0,
          state: cleared.has(`${r}:${c}`) ? "clearing" : "idle",
        }))
      );
    });

    // accumulate bombs for HUD if server provided `bombs` array
    if (Array.isArray(next.bombs) && next.bombs.length) {
      setSumBombs((s) => s + next.bombs.reduce((a, b) => a + Number(b || 0), 0));
    }

    // 2) after a beat, reveal the next grid with drop-in animation
    cascadeTimerRef.current = setTimeout(() => {
      setGrid(normalized.map((row) =>
        row.map((cell) => ({
          v: cell.v,
          mult: cell.mult || 0,
          state: "drop",
        }))
      ));

      // move to next cascade after a beat
      cascadeTimerRef.current = setTimeout(stepCascade, 440);
    }, 300);
  }

  /* ------------------- computed UI labels ------------------- */
  const betLabel = useMemo(() => `${fmt(bet)} 1WT`, [bet]);

  return (
    <div className="min-h-screen bg-[#070A15] text-white flex flex-col overflow-hidden">
      {/* HUD */}
      <div className="flex items-center justify-between px-4 py-3 sticky top-0 bg-[#070A15]/80 backdrop-blur-sm z-50">
        <div className="text-sm">
          <span className="opacity-70 mr-2">Coins:</span>
          <span className="font-bold">{fmt(coins)}</span>
          {inBonus && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-amber-400/20 text-amber-200 border border-amber-300/30">
              FREE SPINS: {freeSpinsLeft}
            </span>
          )}
        </div>
        {sumBombs > 0 && (
          <div className="text-xs px-2 py-1 rounded-full bg-emerald-400/15 border border-emerald-300/30">
            Multiplier Sum: x{fmt(sumBombs)}
          </div>
        )}
      </div>

      {/* Board */}
      <div className="flex-1 w-full flex items-center justify-center px-3">
        <div className={`w-full max-w-[520px] transition-transform ${spinning ? "translate-y-0.5" : ""}`}>
          <div className={`rounded-[28px] border border-white/10 bg-gradient-to-b from-[#0F1734] to-[#0B1020] p-3 shadow-2xl ${bigWinPulse ? "ring-2 ring-amber-300/60 shadow-amber-400/20" : ""}`}>
            <div className="grid grid-cols-6 gap-2">
              {grid.flatMap((row, r) =>
                row.map((cell, c) => (
                  <Cell key={`${r}-${c}`} value={cell?.v} mult={cell?.mult} state={cell?.state} />
                ))
              )}
            </div>

            {/* info row below grid */}
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <InfoCard
                label="Last Win"
                value={`+${fmt(lastSpinWinDisplay)}`}
                accent="emerald"
                bump={winBump}
              />
              <InfoCard label="Free Spins" value={fmt(freeSpinsLeft)} accent="amber" />
              <InfoCard label="Bomb Sum" value={`x${fmt(sumBombs)}`} accent="fuchsia" />
            </div>
          </div>

          {/* bet controls */}
          <div className="mt-5 rounded-2xl bg-[#12182B] border border-white/10 p-4">
            <div className="text-xs opacity-70 mb-2">BET AMOUNT</div>

            <div className="grid grid-cols-[auto,1fr,auto] items-center gap-3">
              <button
                onClick={() => setBet((b) => Math.max(1, Math.floor(Number(b || 0)) - 1))}
                className="w-12 h-12 min-w-[44px] min-h-[44px] rounded-md bg-black/30 border border-white/10 text-2xl leading-none"
                aria-label="Decrease bet"
              >−</button>

              <div className="text-center">
                <span className="text-3xl font-extrabold">{betLabel}</span>
              </div>

              <button
                onClick={() => setBet((b) => Math.max(1, Math.floor(Number(b || 0)) + 1))}
                className="w-12 h-12 min-w-[44px] min-h-[44px] rounded-md bg-black/30 border border-white/10 text-2xl leading-none"
                aria-label="Increase bet"
              >+</button>
            </div>

            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <button onClick={() => setBet((b) => Math.max(1, Math.floor(Number(b || 0)) * 2))}
                className="px-3 py-2 rounded bg-black/40 border border-white/10 text-sm min-h-[40px]">2X</button>
              <button onClick={() => setBet((b) => Math.max(1, Math.floor(Number(b || 0)) * 5))}
                className="px-3 py-2 rounded bg-black/40 border border-white/10 text-sm min-h-[40px]">5X</button>
              <button onClick={() => setBet((_) => Math.max(1, Math.floor(coins)))}
                className="px-3 py-2 rounded bg-[#1F5EFF] text-white text-sm min-h-[40px]">MAX</button>
            </div>
          </div>

          {/* Spin button */}
          <div className="mt-6 flex justify-center pb-10">
            <button
              onClick={spin}
              disabled={spinning}
              className={`w-full max-w-xs py-4 rounded-xl text-xl font-bold shadow-md min-h-[48px] ${
                spinning
                  ? "bg-fuchsia-300 text-black/80 cursor-not-allowed"
                  : "bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white hover:brightness-110 active:scale-[0.99]"
              }`}
            >
              {spinning ? "Spinning..." : "SPIN"}
            </button>
          </div>
        </div>
      </div>

      {/* Confetti Overlay */}
      {showConfetti && <ConfettiOverlay />}

      {/* CSS animations */}
      <style>{`
        @keyframes clear-pop {
          0% { transform: scale(1); filter: brightness(1); }
          40% { transform: scale(1.15); filter: brightness(1.4); }
          100% { transform: scale(1); filter: brightness(1); }
        }
        @keyframes drop-in {
          0% { transform: translateY(-18%); opacity: 0; }
          100% { transform: translateY(0%); opacity: 1; }
        }
        .cell-clearing { animation: clear-pop 260ms ease-out forwards; }
        .cell-drop { animation: drop-in 260ms ease-out forwards; }

        @keyframes confetti-fall {
          0% { transform: translateY(-110vh) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/* ------------- subcomponents ------------- */

// Single grid cell with square aspect + animations + bomb badge
function Cell({ value, mult = 0, state = "idle" }) {
  const emoji = asEmoji(value);
  const isBomb = emoji === "💣";
  const showBadge = isBomb && Number(mult) > 0;

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden border border-white/10
                  bg-gradient-to-br from-blue-500 to-indigo-500 shadow-inner
                  ${state === "clearing" ? "cell-clearing" : ""}
                  ${state === "drop" ? "cell-drop" : ""}`}
      style={{ paddingBottom: "100%" }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl md:text-3xl drop-shadow-[0_2px_0_rgba(0,0,0,0.25)]">
          {emoji}
        </span>
      </div>

      {showBadge && (
        <div className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded-md bg-amber-400 text-black font-bold shadow">
          x{mult}
        </div>
      )}
    </div>
  );
}

function InfoCard({ label, value, accent = "emerald", bump = false }) {
  const bg =
    accent === "emerald" ? "bg-emerald-400/15 border-emerald-300/30" :
    accent === "amber"   ? "bg-amber-400/15 border-amber-300/30"   :
    "bg-fuchsia-400/15 border-fuchsia-300/30";
  return (
    <div className={`rounded-xl px-3 py-2 border ${bg} ${bump ? "ring-1 ring-emerald-300/60" : ""}`}>
      <div className="text-[10px] uppercase tracking-wider opacity-70">{label}</div>
      <div className={`text-lg font-semibold transition-transform duration-150 ${bump ? "scale-[1.03]" : ""}`}>
        {value}
      </div>
    </div>
  );
}

/* ------------- Confetti Overlay ------------- */
function ConfettiOverlay({ count = 90 }) {
  const pieces = Array.from({ length: count }, (_, i) => {
    const left = Math.random() * 100;      // vw
    const delay = Math.random() * 0.2;     // s
    const dur = 1.2 + Math.random() * 0.9; // s
    const size = 6 + Math.random() * 8;    // px
    const br = Math.random() > 0.5 ? 2 : 8;
    return { id: i, left, delay, dur, size, br };
  });

  const palette = ["#ffd166", "#ef476f", "#06d6a0", "#118ab2", "#a78bfa", "#f4a261"];

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {pieces.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            top: "-10vh",
            left: `${p.left}vw`,
            width: p.size,
            height: p.size,
            background: palette[p.id % palette.length],
            borderRadius: p.br,
            opacity: 0,
            animation: `confetti-fall ${p.dur}s ease-in forwards`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ------------- grid helpers (defensive) ------------- */

/**
 * Internal render grid shape:
 * [{v:string|null, mult:number, state:'idle'|'clearing'|'drop'}] × 5 × 6
 */
function emptyGrid() {
  return Array.from({ length: 5 }, () =>
    Array.from({ length: 6 }, () => ({ v: null, mult: 0, state: "idle" }))
  );
}

/**
 * Normalize a server cascade grid (which may contain strings and {sym,mult})
 * to a 5x6 array of { v:string|null, mult:number, state:'idle' } for rendering.
 */
function normalizeGrid(g) {
  const R = 5, C = 6;
  const out = [];

  if (!Array.isArray(g) || !Array.isArray(g[0])) {
    return randomGrid();
  }

  for (let r = 0; r < Math.min(R, g.length); r++) {
    const row = g[r] || [];
    const newRow = [];
    for (let c = 0; c < Math.min(C, row.length); c++) {
      let cell = row[c];
      let v = null, mult = 0;

      if (typeof cell === "string") {
        v = cell;
      } else if (cell && typeof cell === "object") {
        if ("v" in cell && typeof cell.v === "string") {
          v = cell.v;
          mult = Number(cell.mult || 0);
        } else if ("sym" in cell && typeof cell.sym === "string") {
          v = cell.sym;
          mult = Number(cell.mult || 0);
        }
      }

      newRow.push({ v, mult, state: "idle" });
    }
    while (newRow.length < C) newRow.push({ v: null, mult: 0, state: "idle" });
    out.push(newRow);
  }
  while (out.length < R) out.push(Array.from({ length: C }, () => ({ v: null, mult: 0, state: "idle" })));
  return out;
}

function randomGrid() {
  const EMOJIS = ["🍌","🍇","🍉","🍑","🍎","🍒","💎","🍭"]; // 💣 appears in FS only
  return Array.from({ length: 5 }, () =>
    Array.from({ length: 6 }, () => ({ v: EMOJIS[Math.floor(Math.random() * EMOJIS.length)], mult: 0, state: "idle" }))
  );
}

/* ------------- haptics ------------- */
function haptic(kind = "impact") {
  try {
    const H = window.Telegram?.WebApp?.HapticFeedback;
    if (!H) return;
    if (kind === "impact") H.impactOccurred("medium");
    else if (kind === "notification") H.notificationOccurred("warning");
  } catch {}
}
