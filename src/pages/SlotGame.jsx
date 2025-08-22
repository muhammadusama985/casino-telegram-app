
// src/pages/SlotBonanza.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { telegramAuth, getBalance, games } from "../api";

import spinSfx from "../assets/diceRoll.mp3"; // reuse your sfx
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

// Fallback symbol → emoji map (used if server returns string keys)
// If server already returns emojis, we just render them as-is.
const SYMBOL_EMOJI = {
  banana: "🍌",
  grapes: "🍇",
  watermelon: "🍉",
  plum: "🍑",
  apple: "🍎",
  peach: "🍑",
  lemon: "🍋",
  candyBlue: "💠",
  candyGreen: "💚",
  candyRed: "❤️",
  candyPurple: "💜",
  diamond: "💎",
  clover: "🍀",

  // specials
  scatter: "🍭", // lollipop
  bomb: "💣",    // multiplier bomb
};

function asEmoji(val) {
  if (!val) return "🍬";
  if (typeof val === "string") {
    const key = val.trim();
    if (key.length === 1 || [...key].length === 1) return key; // already an emoji
    return SYMBOL_EMOJI[key] || "🍬";
  }
  return "🍬";
}

// simple color classes per “family”
function bgClassFor(sym) {
  const key = String(sym).toLowerCase();
  if (key.includes("💣") || key.includes("bomb")) return "from-amber-400 to-rose-400";
  if (key.includes("🍭") || key.includes("scatter") || key.includes("lollipop")) return "from-pink-400 to-rose-400";
  if (key.includes("🍇") || key.includes("grape")) return "from-violet-500 to-purple-500";
  if (key.includes("🍉") || key.includes("watermelon")) return "from-emerald-500 to-emerald-600";
  if (key.includes("🍌") || key.includes("🍋") || key.includes("banana") || key.includes("lemon")) return "from-yellow-400 to-amber-400";
  if (key.includes("🍎") || key.includes("🍒") || key.includes("apple") || key.includes("cherry") || key.includes("red")) return "from-rose-500 to-pink-500";
  if (key.includes("💎") || key.includes("diamond") || key.includes("blue")) return "from-sky-500 to-blue-600";
  return "from-indigo-500 to-blue-500";
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
  const [winToast, setWinToast] = useState("");
  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0);
  const [lastSpinWin, setLastSpinWin] = useState(0);
  const [sumBombs, setSumBombs] = useState(0); // Bonanza-style: SUM of multipliers within the spin

  // animation helpers
  const cascadeQueueRef = useRef([]);
  const cascadeTimerRef = useRef(null);

  // keep previous plain grid to detect NEW/CHANGED/MOVED tiles for fall animation
  const prevPlainGridRef = useRef(makeNullPlainGrid());
  // step tick so React keys change when tiles change → CSS animation retriggers
  const stepTickRef = useRef(0);

  // turbo (hold) affects cascade pacing only
  const turboHoldRef = useRef(false);

  // precompute whether we’re in bonus (display only)
  const inBonus = freeSpinsLeft > 0;

  /* ----------- bootstrap balance (like your Dice/Coinflip) ----------- */
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
        // polling
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

  /* ------------------- spin flow ------------------- */
  const spin = async () => {
    if (spinning) return;
    const stake = Math.max(1, Math.floor(Number(bet || 0)));
    if (!Number.isFinite(stake) || stake <= 0) return alert("Enter a valid bet (>= 1).");
    if (Number(coins) < stake) return alert("Not enough coins.");

    setSpinning(true);
    setWinToast("");
    setLastSpinWin(0);
    setSumBombs(0);

    try { new Audio(spinSfx).play().catch(() => {}); } catch {}

    try {
      // Server calculates results; we just animate and display
      const res = await games.slot(stake);

      // Update balance first if provided (server truth)
      if (Number.isFinite(res?.newBalance)) {
        setCoins((prev) => (res.newBalance !== prev ? res.newBalance : prev));
      }

      const d = res?.details || {};
      // cascades: [{ grid:[[]], cleared:[[r,c]...], stepWin:number, bombs:[2,5], multiplierForStep:number }]
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

      // total multiplier (within a single paid/free spin) – SUM of bombs (Bonanza behavior)
      if (Number.isFinite(d.multiplierTotal)) {
        setSumBombs(Number(d.multiplierTotal));
      } else if (Array.isArray(d.multipliersApplied)) {
        const sum = d.multipliersApplied.reduce((a, b) => a + Number(b || 0), 0);
        setSumBombs(sum);
      }

      // animate cascades sequentially
      cascadeQueueRef.current = cascades.slice(0);
      // reset prev grid so first frame of a new spin falls in
      prevPlainGridRef.current = makeNullPlainGrid();
      stepTickRef.current = 0;
      stepCascade();

      // outcome
      const gotWin = Number(res?.payout || 0) > 0;
      setLastSpinWin(Number(res?.payout || 0));

      if (gotWin) {
        const msg = `🎉 Spin Win +${fmt(res.payout)}`;
        setWinToast(msg);
        try { new Audio(winSfx).play().catch(() => {}); } catch {}
      } else {
        const msg = `🙈 No win`;
        setWinToast(msg);
        try { new Audio(loseSfx).play().catch(() => {}); } catch {}
      }

      // notify other screens to refresh
      window.dispatchEvent(new Event("balance:refresh"));
    } catch (e) {
      const msg = String(e?.message || "");
      if (msg.includes("insufficient-funds")) alert("Not enough coins.");
      else if (msg.includes("min-stake")) alert("Bet is below minimum.");
      else if (msg.includes("max-stake")) alert("Bet exceeds maximum.");
      else alert("Spin failed. Try again.");
    } finally {
      // let cascade animation complete before enabling again
      setTimeout(() => setSpinning(false), 400);
    }
  };

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

  // run each cascade step with a small delay & flash clears
  function stepCascade() {
    clearTimeout(cascadeTimerRef.current);
    const next = cascadeQueueRef.current.shift();
    if (!next) return;

    const gPlain = normalizeGrid(next.grid);
    const hadGrid = gPlain.length && gPlain[0].length;
    if (!hadGrid) {
      // if malformed, just skip to next
      cascadeTimerRef.current = setTimeout(stepCascade, 120);
      return;
    }

    // bump step tick so React keys can change for CHANGED/NEW/MOVED cells
    stepTickRef.current += 1;

    // mark cleared cells if provided, to animate fade
    const cleared = new Set((next.cleared || []).map(([r, c]) => `${r}:${c}`));

    // --- compute FALL flags (NEW or MOVED down, even if same symbol) & one-by-one order ---
    const prev = prevPlainGridRef.current || makeNullPlainGrid();
    const R = 5, C = 6;

    // Base mapping first (value + cleared + fall flag)
    const mapped = gPlain.map((row, r) =>
      row.map((cell, c) => {
        let v = cell;
        if (v && typeof v === "object") {
          if ("v" in v) v = v.v;
          else if ("sym" in v) v = v.sym; // e.g. { sym:'💣', mult:12 }
        }
        // default: value changed?
        const changed = (v !== (prev[r]?.[c] ?? null));
        return { v, cleared: cleared.has(`${r}:${c}`), fall: changed, spawnKey: 0, delayMs: 0 };
      })
    );

    // Column-aware movement detection (covers same-type movement):
    for (let c = 0; c < C; c++) {
      const prevCol = [];
      for (let r = 0; r < R; r++) prevCol.push(prev[r]?.[c] ?? null);

      // track previous non-null values with their original row indices
      const prevPairs = [];
      for (let r = 0; r < R; r++) if (prevCol[r] != null) prevPairs.push({ v: prevCol[r], rPrev: r });

      const k = prevPairs.length;
      const bottomStart = R - k;

      for (let r = 0; r < R; r++) {
        const cell = mapped[r][c];
        // top region -> definitely new spawns
        if (r < bottomStart) {
          cell.fall = true;
          continue;
        }
        // bottom region should be compacted prevPairs in-order
        const idx = r - bottomStart;
        const expected = prevPairs[idx];
        if (expected) {
          // if value matches expected but came from higher row, mark as falling (movement)
          if (cell.v === expected.v && expected.rPrev !== r) {
            cell.fall = true;
          }
        } else {
          // safety: if somehow missing, treat as falling
          cell.fall = true;
        }
      }
    }

    // Assign sequential delays left→right, top→bottom for cells that fall
    let order = 0;
    for (let c = 0; c < C; c++) {
      for (let r = 0; r < R; r++) {
        const cell = mapped[r][c];
        if (cell.fall) {
          cell.delayMs = order * 60; // 60ms per tile for a cascading feel
          cell.spawnKey = stepTickRef.current; // ensure key changes when animating
          order++;
        }
      }
    }

    setGrid(mapped);

    // update prev reference for next cascade step
    prevPlainGridRef.current = gPlain.map(row => row.map(cell => {
      if (cell && typeof cell === "object") {
        if ("v" in cell) return cell.v;
        if ("sym" in cell) return cell.sym;
      }
      return typeof cell === "string" ? cell : null;
    }));

    // accumulate multipliers shown during this cascade (if any) — Bonanza sums bombs
    if (Array.isArray(next.bombs) && next.bombs.length) {
      setSumBombs((s) => s + next.bombs.reduce((a, b) => a + Number(b || 0), 0));
    }

    // faster pacing when turbo is held
    const pace = turboHoldRef.current ? 180 : 420;
    cascadeTimerRef.current = setTimeout(stepCascade, pace);
  }

  // clear any pending timers on unmount
  useEffect(() => () => clearTimeout(cascadeTimerRef.current), []);

  /* ------------------- computed UI labels ------------------- */
  const betLabel = useMemo(() => `${fmt(bet)} `, [bet]);
  const bonusPill = inBonus ? (
    <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-amber-400/20 text-amber-200 border border-amber-300/30">
      FREE SPINS: {freeSpinsLeft}
    </span>
  ) : null;

  return (
    <div className="min-h-screen bg-[#0B1020] text-white flex flex-col items-stretch">
      {/* Coins header (like Dice/Coinflip) */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="text-sm">
              <BackButtonInline to="/" />
          <span className="opacity-70 mr-2">Coins:</span>
          <span className="font-bold">{fmt(coins)}</span>
          {bonusPill}
        </div>
        {sumBombs > 0 && (
          <div className="text-xs px-2 py-1 rounded-full bg-emerald-400/15 border border-emerald-300/30">
            Multiplier Sum: x{fmt(sumBombs)}
          </div>
        )}
      </div>

      {/* Slot frame */}
      <div className="max-w-md mx-auto px-4 w-full">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-[#0F1734] to-[#0B1020] p-3 shadow-xl">
          {/* grid 6x5 (responsive square cells) */}
          <div className="grid grid-cols-6 gap-2">
            {grid.flatMap((row, r) =>
              row.map((cell, c) => (
                <Cell
                  key={`${r}-${c}-${cell?.v ?? "x"}-${cell?.spawnKey ?? 0}`}
                  value={cell?.v}
                  cleared={cell?.cleared}
                  fall={cell?.fall}
                  delayMs={cell?.delayMs}
                />
              ))
            )}
          </div>

          {/* info row below grid */}
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <InfoCard label="Last Win" value={`+${fmt(lastSpinWin)}`} accent="emerald" />
            <InfoCard label="Free Spins" value={fmt(freeSpinsLeft)} accent="amber" />
            <InfoCard label="Bomb Sum" value={`x${fmt(sumBombs)}`} accent="fuchsia" />
          </div>
        </div>

        {/* === NEW: Bet amount + Spin UI to match the screenshot === */}
        <div className="mt-6 flex items-center justify-center gap-4 pb-10">
          {/* minus circle (bet down) */}
          <button
            onClick={() => setBet((b) => Math.max(1, Math.floor(Number(b || 0)) - 1))}
            aria-label="Decrease bet"
            className="w-12 h-12 rounded-full bg-black/40 border border-white/15 flex items-center justify-center text-2xl leading-none select-none"
          >
            –
          </button>

          {/* central spin ring with curved text + circular arrows */}
          <button
            onMouseDown={() => (turboHoldRef.current = true)}
            onMouseUp={() => (turboHoldRef.current = false)}
            onMouseLeave={() => (turboHoldRef.current = false)}
            onTouchStart={() => (turboHoldRef.current = true)}
            onTouchEnd={() => (turboHoldRef.current = false)}
            onClick={spin}
            disabled={spinning}
            className={`relative w-36 h-36 rounded-full shadow-2xl overflow-hidden select-none
                        ${spinning ? "opacity-80 cursor-not-allowed" : "hover:brightness-110 active:scale-[0.98]"}`}
          style={{
  background: "#FFFFE0", // full light yellow
  border: "1px solid rgba(255,255,255,0.15)"
}}
          >
            {/* ring SVG */}
            <svg viewBox="0 0 120 120" className="absolute inset-0 text-white">
              {/* curved label */}
              <defs>
                <path id="arcTop" d="M 20 60 A 40 40 0 1 1 100 60" />
              </defs>
            

              {/* arrow group (rotates when held) */}
              <g className={turboHoldRef.current ? "animate-rot" : ""} stroke="black" strokeWidth="7" strokeLinecap="round" fill="none">
                {/* clockwise arc + head */}
                <path d="M 46 28 A 38 38 0 0 1 92 60" />
                <polygon points="92,60 83,52 101,52" fill="white" />
                {/* counterclockwise arc + head */}
                <path d="M 74 92 A 38 38 0 0 1 28 60" />
                <polygon points="28,60 37,68 19,68" fill="white" />
              </g>

              {/* center dot for style */}
              <circle cx="60" cy="60" r="18" fill="rgba(255,255,255,0.08)" />
            </svg>

            {/* inner label (bet) */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <div className="text-[10px] opacity-80 font-bold tracking-wide text-black">BET</div>
              <div className="text-xl font-extrabold text-black">${betLabel}</div>
            </div>
          </button>

          {/* plus circle (bet up) */}
          <button
            onClick={() => setBet((b) => Math.max(1, Math.floor(Number(b || 0)) + 1))}
            aria-label="Increase bet"
            className="w-12 h-12 rounded-full bg-black/40 border border-white/15 flex items-center justify-center text-2xl leading-none select-none"
          >
            +
          </button>
        </div>

        {/* toast */}
        {winToast && (
          <div className="mb-6">
            <div
              className={`rounded-xl px-4 py-3 text-center font-semibold ${
                winToast.includes("Win")
                  ? "bg-emerald-600/30 text-emerald-200"
                  : "bg-slate-600/30 text-slate-200"
              }`}
            >
              {winToast}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------- subcomponents ------------- */

// Single grid cell with square aspect + tiny animation when “cleared”,
// and FALL animation (sequential) whenever the cell CHANGES or MOVES down.
// delayMs staggers the animation one-by-one.
function Cell({ value, cleared, fall, delayMs }) {
  const emoji = asEmoji(value);
  const bg = bgClassFor(String(value || ""));

  return (
    <div
      className={`relative w-full rounded-xl overflow-hidden border border-white/10
                  bg-gradient-to-br ${bg} shadow-inner
                  ${cleared ? "animate-ping-fast" : ""} ${fall ? "animate-fall-down" : ""}`}
      style={{
        paddingBottom: "100%", // square
        animationDelay: fall ? `${delayMs}ms` : undefined
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl md:text-3xl drop-shadow-[0_2px_0_rgba(0,0,0,0.25)]">
          {emoji}
        </span>
      </div>
      <style>{`
        @keyframes ping-fast {
          0% { transform: scale(1); opacity: 1; }
          70% { transform: scale(1.15); opacity: .6; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-ping-fast { animation: ping-fast 0.35s ease-in-out; }

        @keyframes fall-down {
          0%   { transform: translateY(-140px); opacity: 0.0; }
          60%  { opacity: 1.0; }
          100% { transform: translateY(0); opacity: 1.0; }
        }
        .animate-fall-down { animation: fall-down 0.28s ease-out forwards; }

        @keyframes rot360 {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .animate-rot { animation: rot360 1.2s linear infinite; }
      `}</style>
    </div>
  );
}

function InfoCard({ label, value, accent = "emerald" }) {
  const bg =
    accent === "emerald" ? "bg-emerald-400/15 border-emerald-300/30" :
    accent === "amber"   ? "bg-amber-400/15 border-amber-300/30"   :
                           "bg-fuchsia-400/15 border-fuchsia-300/30";
  return (
    <div className={`rounded-xl px-3 py-2 border ${bg}`}>
      <div className="text-[10px] uppercase tracking-wider opacity-70">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

/* ------------- grid helpers (defensive) ------------- */

function emptyGrid() {
  // 5 rows × 6 cols
  return Array.from({ length: 5 }, () =>
    Array.from({ length: 6 }, () => ({ v: null, cleared: false, fall: false, spawnKey: 0, delayMs: 0 }))
  );
}

function makeNullPlainGrid() {
  return Array.from({ length: 5 }, () => Array.from({ length: 6 }, () => null));
}

/**
 * Accepts many shapes from server:
 * - 2D strings/emoji
 * - 2D objects with { v: '🍌' } or { sym: 'bomb', mult: 10 } -> we use 'sym'/'v'
 * Returns a 2D array with plain values (emoji or key) or null.
 */
function normalizeGrid(g) {
  if (!Array.isArray(g) || !Array.isArray(g[0])) return makeNullPlainGrid();

  const R = 5, C = 6;
  const out = [];

  for (let r = 0; r < Math.min(R, g.length); r++) {
    const row = g[r] || [];
    const newRow = [];
    for (let c = 0; c < Math.min(C, row.length); c++) {
      let cell = row[c];

      if (cell && typeof cell === "object") {
        if ("v" in cell) cell = cell.v;
        else if ("sym" in cell) cell = cell.sym; // server bomb { sym:'💣' or 'bomb', mult }
      }
      newRow.push(typeof cell === "string" ? cell : null);
    }
    while (newRow.length < C) newRow.push(null);
    out.push(newRow);
  }
  while (out.length < R) out.push(Array.from({ length: C }, () => null));
  return out;
}

function randomGrid() {
  const EMOJIS = ["🍌","🍇","🍉","🍑","🍎","🍒","💎","🍭","💣"];
  return Array.from({ length: 5 }, () =>
    Array.from({ length: 6 }, () => EMOJIS[Math.floor(Math.random() * EMOJIS.length)])
  );
}
