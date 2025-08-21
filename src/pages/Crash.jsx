// src/pages/Crash.jsx
import React, { useMemo,useEffect, useRef, useState } from "react";

import { telegramAuth, getBalance, games } from "../api";
import spinSfx from "../assets/diceRoll.mp3";
import winSfx from "../assets/win.mp3";
import loseSfx from "../assets/lose.mp3";

function fmt(n, dp = 2) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "0";
  return x.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: dp });
}
function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

export default function Crash() {
  const [coins, setCoins] = useState(0);

  const [bet, setBet] = useState(1);
  const [targetX, setTargetX] = useState(1.8);

  const [roundId, setRoundId] = useState("");
  const [spinning, setSpinning] = useState(false);

  const [currentX, setCurrentX] = useState(1.0);      // animated
  const [crashAt, setCrashAt] = useState(null);       // from backend
  const [payout, setPayout] = useState(0);            // profit-only returned to UI (per your games.js)
  const [result, setResult] = useState("");           // 'win' | 'loss' | ''

  const [points, setPoints] = useState(() => [[0, 1.0]]); // sparkline points [time, x]
  const startTimeRef = useRef(0);
  const rafRef = useRef(0);

  // ---- balance bootstrap (same pattern as your other pages) ----
  useEffect(() => {
    let stopPolling = () => {};
    (async () => {
      try {
        const u = await telegramAuth();
        if (Number.isFinite(Number(u?.coins))) setCoins(Number(u.coins));
        try {
          const c = await getBalance();
          if (Number.isFinite(c)) setCoins(c);
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
        console.error("[Crash] telegramAuth failed:", e);
      }
    })();
    return () => { stopPolling?.(); };
  }, []);

  // ---- animation curve ----
  // We grow x(t) ~ e^(rate * t). Choose rate so it feels right (≈ reach 5–8x in a few secs).
  const RATE = 0.55; // tune feel. Higher = faster.

  function resetRoundUI() {
    setCurrentX(1.0);
    setPoints([[0, 1.0]]);
    setCrashAt(null);
    setPayout(0);
    setResult("");
    cancelAnimationFrame(rafRef.current);
  }

  async function startRound() {
    if (spinning) return;
    const stake = Math.max(1, Math.floor(Number(bet || 0)));
    if (!Number.isFinite(stake) || stake <= 0) return alert("Enter a valid bet (>= 1).");
    if (Number(coins) < stake) return alert("Not enough coins.");

    resetRoundUI();
    setSpinning(true);
    try { new Audio(spinSfx).play().catch(() => {}); } catch {}

    try {
      const res = await games.crash(stake, Number(targetX) || 1.1);
      setRoundId(res?.roundId || "");
      setCrashAt(Number(res?.details?.crashAt || 1.0));
      setPayout(Number(res?.payout || 0));
      setResult(String(res?.result || ""));

      if (Number.isFinite(res?.newBalance)) {
        setCoins((prev) => (res.newBalance !== prev ? res.newBalance : prev));
      }

      // animate until we hit min(crashAt, targetX if win)
      const endX = Math.min(
        Number(res?.details?.crashAt || 1.0),
        res?.result === "win" ? (Number(targetX) || 1.1) : Infinity
      );

      // start RAF loop
      startTimeRef.current = performance.now();
      const animate = (now) => {
        const t = (now - startTimeRef.current) / 1000;   // seconds
        const x = Math.exp(RATE * t);
        const capped = Math.min(x, endX);

        setCurrentX(capped);
        setPoints((p) => {
          const next = [...p, [t, capped]];
          // keep last ~7s for a compact sparkline
          while (next.length > 120) next.shift();
          return next;
        });

        const crashed = x >= Number(res?.details?.crashAt || 1.0);
        const cashed = capped >= (Number(targetX) || 1.1);

        if (crashed || cashed) {
          // end animation
          cancelAnimationFrame(rafRef.current);

          if (cashed) {
            try { new Audio(winSfx).play().catch(() => {}); } catch {}
          } else {
            try { new Audio(loseSfx).play().catch(() => {}); } catch {}
          }

          setTimeout(() => setSpinning(false), 400);
          return;
        }

        rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);
    } catch (e) {
      console.error(e);
      alert("Round failed. Try again.");
      setSpinning(false);
    } finally {
      // nothing — we stop in the RAF end conditions
    }
  }

  // ---- derived labels ----
  const betLabel = useMemo(() => `${fmt(bet)} 1WT`, [bet]);
  const statusText = useMemo(() => {
    if (!result && spinning) return `Flying… ${fmt(currentX, 2)}x`;
    if (result === "win") return `Cashed at ${fmt(targetX, 2)}x  • +${fmt(payout)} `;
    if (result === "loss") return `Crashed at ${fmt(crashAt, 2)}x  • +0`;
    return "Ready";
  }, [result, spinning, currentX, payout, targetX, crashAt]);

  return (
    <div className="min-h-screen bg-[#070A15] text-white flex flex-col">
      {/* HUD */}
      <div className="flex items-center justify-between px-4 py-3 sticky top-0 bg-[#070A15]/80 backdrop-blur-sm z-50">
        <div className="text-sm">
          <span className="opacity-70 mr-2">Coins:</span>
          <span className="font-bold">{fmt(coins)}</span>
        </div>
        <div className="text-xs px-2 py-1 rounded-full bg-indigo-400/15 border border-indigo-300/30">
          {statusText}
        </div>
      </div>

      {/* Stage */}
      <div className="flex-1 w-full flex items-center justify-center px-4">
        <div className="w-full max-w-[640px]">
          <div className="rounded-[28px] border border-white/10 bg-gradient-to-b from-[#0F1734] to-[#0B1020] p-6 shadow-2xl">
            {/* Multiplier big readout */}
            <div className="flex items-end justify-center">
              <div className={`text-6xl leading-none font-extrabold ${spinning ? "animate-pulse" : ""}`}>
                {fmt(currentX, 2)}<span className="text-2xl font-bold">x</span>
              </div>
            </div>

            {/* Sparkline */}
            <div className="mt-6 h-24 w-full">
              <Sparkline points={points} color="#7c3aed" />
            </div>

            {/* Info row */}
            <div className="mt-6 grid grid-cols-3 gap-2 text-center">
              <InfoCard label="Bet" value={betLabel} accent="amber" />
              <InfoCard label="Target" value={`${fmt(targetX, 2)}x`} accent="emerald" />
              <InfoCard label="Payout" value={`+${fmt(payout)}`} accent={payout > 0 ? "emerald" : "fuchsia"} />
            </div>
          </div>

          {/* Controls */}
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
              {[2,5,10,25].map((m) => (
                <button key={m} onClick={() => setBet((b) => Math.max(1, Math.floor(Number(b || 0)) * m))}
                  className="px-3 py-2 rounded bg-black/40 border border-white/10 text-sm min-h-[40px]">{m}X</button>
              ))}
              <button onClick={() => setBet((_) => Math.max(1, Math.floor(coins)))}
                className="px-3 py-2 rounded bg-[#1F5EFF] text-white text-sm min-h-[40px]">MAX</button>
            </div>

            <div className="mt-6 text-xs opacity-70 mb-2">CASHOUT TARGET</div>
            <div className="flex items-center gap-2 flex-wrap">
              {[1.5,1.8,2,3,5,10].map((x) => (
                <button key={x} onClick={() => setTargetX(x)}
                  className={`px-3 py-2 rounded border min-h-[40px] ${Math.abs(targetX - x) < 1e-9
                    ? "bg-emerald-500 text-black border-emerald-400"
                    : "bg-black/30 text-white border-white/10"}`}>
                  {x}x
                </button>
              ))}
            </div>
            <input
              type="range"
              min={1.1}
              max={50}
              step={0.1}
              value={targetX}
              onChange={(e) => setTargetX(clamp(Number(e.target.value), 1.1, 50))}
              className="w-full mt-3"
            />
          </div>

          {/* Start button */}
          <div className="mt-6 flex justify-center pb-10">
            <button
              onClick={startRound}
              disabled={spinning}
              className={`w-full max-w-xs py-4 rounded-xl text-xl font-bold shadow-md min-h-[48px] ${
                spinning
                  ? "bg-fuchsia-300 text-black/80 cursor-not-allowed"
                  : "bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white hover:brightness-110 active:scale-[0.99]"
              }`}
            >
              {spinning ? "Running..." : "START"}
            </button>
          </div>
        </div>
      </div>
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

/** very lightweight SVG sparkline */
/** Stylish, scrolling SVG sparkline with a start-plane and glow */
function Sparkline({ points, color = "#7c3aed" }) {
  if (!points?.length) return null;

  const W = 600, H = 96;
  const pad = 2;
  const WINDOW_SEC = 8;

  // camera window (no scroll until filled)
  const maxT = Math.max(...points.map(p => p[0]), 0);
  const t0 = Math.max(0, maxT - WINDOW_SEC);

  // visible slice (+tiny buffer)
  const visible = points.filter(([t]) => t >= t0 - 0.25);
  if (!visible.length) return <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" />;

  // y-scale from current visible values (log to use height nicely)
  const visVals = visible.map(p => Math.max(1.00001, p[1]));
  const vMin = Math.min(...visVals);
  const vMax = Math.max(...visVals);
  const logMin = Math.log(vMin);
  const logMax = Math.log(Math.max(vMin + 1e-6, vMax));

  const sx = (t) => {
    const u = (t - t0) / Math.max(1e-6, WINDOW_SEC);
    return pad + (W - 2 * pad) * Math.min(1, Math.max(0, u));
  };
  const syRaw = (x) => {
    const lx = Math.log(Math.max(1.00001, x));
    const ny = (lx - logMin) / Math.max(1e-6, (logMax - logMin));
    return H - pad - (H - 2 * pad) * Math.min(1, Math.max(0, ny));
  };

  // sample value at any time (linear) using full history
  function sampleAt(tTarget) {
    const all = points;
    const tMin = all[0][0], tMax2 = all[all.length - 1][0];
    if (tTarget <= tMin) return { t: tMin, x: all[0][1] };
    if (tTarget >= tMax2) return { t: tMax2, x: all[all.length - 1][1] };
    let i = 1;
    while (i < all.length && all[i][0] < tTarget) i++;
    const [t1, v1] = all[i - 1], [t2, v2] = all[i];
    const a = (tTarget - t1) / Math.max(1e-6, (t2 - t1));
    return { t: tTarget, x: v1 + a * (v2 - v1) };
  }

  // plane at the head of the visible window
  const tHead = visible[visible.length - 1][0];
  const head = sampleAt(tHead);
  const planeX = sx(head.t);
  const planeY = syRaw(head.x);

  // 🚫 baseline fix:
  //   start X stays at left edge,
  //   start Y is the value *at the current left boundary* (t0),
  //   so the path lifts immediately instead of running flat.
  const startAtLeft = sampleAt(t0);
  const startX = pad;
  const startY = syRaw(startAtLeft.x);

  // draw only points within the window (t ≥ t0) up to the plane
  const ptsInWin = points.filter(([t]) => t >= t0 && t <= head.t + 1e-6);
  const pathPts = [
    [startX, startY],
    ...ptsInWin.map(([t, x]) => [sx(t), syRaw(x)]),
  ];

  // smooth curve (Catmull–Rom → cubic Bézier); pad ends to keep anchor rigid
  function toSmoothPath(pts) {
    if (pts.length < 2) return "";
    if (pts.length === 2) return `M${pts[0][0]},${pts[0][1]} L${pts[1][0]},${pts[1][1]}`;
    const p = [pts[0], ...pts, pts[pts.length - 1]];
    let d = `M${p[0][0]},${p[0][1]}`;
    for (let i = 0; i < p.length - 2; i++) {
      const p0 = p[Math.max(0, i - 1)];
      const p1 = p[i];
      const p2 = p[i + 1];
      const p3 = p[i + 2];
      const c1x = p1[0] + (p2[0] - p0[0]) / 6;
      const c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      const c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
    }
    return d;
  }
  const d = toSmoothPath(pathPts);

  // plane banking angle (based on local slope)
  const prev = sampleAt(Math.max(t0, head.t - 0.08));
  const dx = sx(head.t) - sx(prev.t);
  const dy = syRaw(head.x) - syRaw(prev.x);
  const angleDeg = (Math.atan2(-(dy), dx) * 180) / Math.PI;

  const gradId = "spark-grad";
  const glowId = "spark-glow";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
      <defs>
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%">
          <stop offset="0%"  stopColor={color} stopOpacity="0.45" />
          <stop offset="60%" stopColor={color} stopOpacity="0.95" />
          <stop offset="100%" stopColor={color} stopOpacity="1" />
        </linearGradient>
      </defs>

      {/* curved, glow trail (starts at left edge; no flat baseline) */}
      <path
        d={d}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth={7}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${glowId})`}
      />

      {/* head marker + plane */}
      <circle cx={planeX} cy={planeY} r={7.5} fill={color} opacity="0.98" />
      <text
        transform={`translate(${planeX}, ${planeY - 13}) rotate(${angleDeg})`}
        fontSize={34}
        textAnchor="middle"
        dominantBaseline="central"
        style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.8))" }}
      >
        ✈️
      </text>
    </svg>
  );
}



