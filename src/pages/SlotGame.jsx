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
  scatter: "🍭",      // lollipop
  bomb: "💣",         // multiplier bomb
};

function asEmoji(sym) {
  if (!sym) return "🍬";

  // If we accidentally get objects, unwrap {sym}
  if (typeof sym === "object" && sym !== null) {
    if ("sym" in sym && typeof sym.sym === "string") return sym.sym;
    sym = String(sym);
  }

  const s = String(sym).trim();

  // Prefer a safe “known emoji” set over regex property escapes (some webviews choke)
  const KNOWN = new Set([
    "🍌","🍇","🍉","🍑","🍎","🍒","💎","🍭","💣",
    // also map fallbacks you defined
    "💠","💚","❤️","💜","🍀",
  ]);
  if (KNOWN.has(s)) return s;

  // If server sent our textual keys (banana, grapes, etc.)
  if (SYMBOL_EMOJI[s]) return SYMBOL_EMOJI[s];

  // Last resort: try to detect a pictograph (may fail in older engines)
  try {
    if (/\p{Extended_Pictographic}/u.test(s)) return s;
  } catch { /* ignore if engine lacks Unicode property escapes */ }

  return "🍬";
}



// simple color classes per “family”
function bgClassFor(sym) {
  const key = String(sym).toLowerCase();
  if (key.includes("bomb")) return "from-amber-400 to-rose-400";
  if (key.includes("scatter") || key.includes("lollipop")) return "from-pink-400 to-rose-400";
  if (key.includes("grape")) return "from-violet-500 to-purple-500";
  if (key.includes("watermelon")) return "from-emerald-500 to-emerald-600";
  if (key.includes("banana") || key.includes("lemon")) return "from-yellow-400 to-amber-400";
  if (key.includes("apple") || key.includes("cherry") || key.includes("red")) return "from-rose-500 to-pink-500";
  if (key.includes("diamond") || key.includes("blue")) return "from-sky-500 to-blue-600";
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
  const [sumBombs, setSumBombs] = useState(0);

  // animation helpers
  const cascadeQueueRef = useRef([]);
  const cascadeTimerRef = useRef(null);

  // precompute whether we’re in bonus (display only)
  const inBonus = freeSpinsLeft > 0;

  /* ----------- bootstrap balance (same pattern as other pages) ----------- */
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
      

      if (window.Telegram?.WebApp?.showAlert) {
  const d = res?.details || {};
  const row0 = d.cascades?.[0]?.grid?.[0] || [];
  window.Telegram.WebApp.showAlert(`Src: ${
    Array.isArray(d.cascades) && d.cascades[0]?.grid ? 'server' : 'fallback'
  }\nrow0: ${JSON.stringify(row0).slice(0, 180)}...`);
}


      // Update balance first if provided
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

      // total multiplier (within a single paid/free spin) – if server sends it
      if (Number.isFinite(d.multiplierTotal)) {
        setSumBombs(Number(d.multiplierTotal));
      } else if (Array.isArray(d.multipliersApplied)) {
        const sum = d.multipliersApplied.reduce((a, b) => a + Number(b || 0), 0);
        setSumBombs(sum);
      }

      // animate cascades sequentially
      cascadeQueueRef.current = cascades.slice(0);
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

  // run each cascade step with a small delay & flash clears
  function stepCascade() {
    clearTimeout(cascadeTimerRef.current);
    const next = cascadeQueueRef.current.shift();
    if (!next) return;

    const g = normalizeGrid(next.grid);
    const hadGrid = g.length && g[0].length;
    if (!hadGrid) {
      // if malformed, just skip to next
      cascadeTimerRef.current = setTimeout(stepCascade, 120);
      return;
    }

    // mark cleared cells if provided, to animate fade
    const cleared = new Set(
      (next.cleared || []).map(([r, c]) => `${r}:${c}`)
    );

    // render grid (with fade class for cleared)
    setGrid(g.map((row, r) => row.map((cell, c) => ({
      v: cell,
      cleared: cleared.has(`${r}:${c}`),
    }))));

    // accumulate multipliers shown during this cascade (if any)
    if (Array.isArray(next.bombs) && next.bombs.length) {
      setSumBombs((s) => s + next.bombs.reduce((a, b) => a + Number(b || 0), 0));
    }

    cascadeTimerRef.current = setTimeout(stepCascade, 420); // move to next cascade after a beat
  }

  // clear any pending timers on unmount
  useEffect(() => () => clearTimeout(cascadeTimerRef.current), []);

  /* ------------------- computed UI labels ------------------- */
  const betLabel = useMemo(() => `${fmt(bet)} 1WT`, [bet]);
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
                <Cell key={`${r}-${c}`} value={cell?.v} cleared={cell?.cleared} />
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
              spinning ? "bg-fuchsia-300 text-black/80 cursor-not-allowed" : "bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white hover:brightness-110 active:scale-[0.99]"
            }`}
          >
            {spinning ? "Spinning..." : "SPIN"}
          </button>
        </div>

        {/* toast */}
        {winToast && (
          <div className="mb-6">
            <div className={`rounded-xl px-4 py-3 text-center font-semibold ${
              winToast.includes("Win")
                ? "bg-emerald-600/30 text-emerald-200"
                : "bg-slate-600/30 text-slate-200"
            }`}>
              {winToast}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------- subcomponents ------------- */

// Single grid cell with square aspect + tiny animation when “cleared”
function Cell({ value, cleared }) {
  const emoji = asEmoji(value);
  const bg = bgClassFor(String(value || ""));

  return (
    <div className={`relative w-full rounded-xl overflow-hidden border border-white/10
                     bg-gradient-to-br ${bg} shadow-inner
                     ${cleared ? "animate-ping-fast" : ""}`}
         style={{ paddingBottom: "100%" /* square */ }}>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl md:text-3xl drop-shadow-[0_2px_0_rgba(0,0,0,0.25)]">
          {emoji}
        </span>
      </div>
      <style>{`
        @keyframes ping-fast { 0% { transform: scale(1); opacity: 1; } 70% { transform: scale(1.15); opacity: .6; } 100% { transform: scale(1); opacity: 1; } }
        .animate-ping-fast { animation: ping-fast 0.35s ease-in-out; }
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
    Array.from({ length: 6 }, () => ({ v: null, cleared: false }))
  );
}

function normalizeGrid(g) {
  // Accept array of arrays of:
  //  - strings (emoji),
  //  - objects like { sym:"💣", mult:12 }, or
  //  - already-wrapped { v: ... , cleared? }
  if (!Array.isArray(g) || !Array.isArray(g[0])) return emptyGrid();

  const R = 5, C = 6;
  const out = [];

  for (let r = 0; r < Math.min(R, g.length); r++) {
    const row = g[r] || [];
    const newRow = [];
    for (let c = 0; c < Math.min(C, row.length); c++) {
      const cell = row[c];

      // Already in {v, cleared} form
      if (cell && typeof cell === "object" && "v" in cell) {
        newRow.push({ v: cell.v, cleared: !!cell.cleared });
        continue;
      }

      // Server-style bomb/scatter/regular: { sym, mult? }
      if (cell && typeof cell === "object" && "sym" in cell) {
        newRow.push({ v: cell.sym, cleared: false }); // we only render the emoji
        continue;
      }

      // Plain emoji string
      if (typeof cell === "string") {
        newRow.push({ v: cell, cleared: false });
        continue;
      }

      // Fallback
      newRow.push({ v: null, cleared: false });
    }

    // pad if row is short
    while (newRow.length < C) newRow.push({ v: null, cleared: false });
    out.push(newRow);
  }

  // pad if total rows < R
  while (out.length < R) out.push(Array.from({ length: C }, () => ({ v: null, cleared: false })));

  return out;
}


function randomGrid() {
  const EMOJIS = ["🍌","🍇","🍉","🍑","🍎","🍒","💎","🍭","💣"];
  return Array.from({ length: 5 }, () =>
    Array.from({ length: 6 }, () => EMOJIS[Math.floor(Math.random() * EMOJIS.length)])
  );
}

