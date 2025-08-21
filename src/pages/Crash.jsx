// // src/pages/Crash.jsx
// import React, { useMemo, useEffect, useRef, useState } from "react";
// import { telegramAuth, getBalance, games } from "../api";
// import spinSfx from "../assets/diceRoll.mp3";
// import winSfx from "../assets/win.mp3";
// import loseSfx from "../assets/lose.mp3";

// function fmt(n, dp = 2) {
//   const x = Number(n);
//   if (!Number.isFinite(x)) return "0";
//   return x.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: dp });
// }
// function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

// export default function Crash() {
//   const [coins, setCoins] = useState(0);

//   const [bet, setBet] = useState(1);
//   const [targetX, setTargetX] = useState(1.8);

//   const [roundId, setRoundId] = useState("");
//   const [spinning, setSpinning] = useState(false);

//   const [currentX, setCurrentX] = useState(1.0);      // animated
//   const [crashAt, setCrashAt] = useState(null);       // from backend
//   const [payout, setPayout] = useState(0);            // profit-only returned to UI
//   const [result, setResult] = useState("");           // 'win' | 'loss' | ''

//   const [points, setPoints] = useState(() => [[0, 1.0]]); // sparkline points [time, x]
//   const startTimeRef = useRef(0);
//   const rafRef = useRef(0);

//   // ---- balance bootstrap (same pattern as your other pages) ----
//   useEffect(() => {
//     let stopPolling = () => {};
//     (async () => {
//       try {
//         const u = await telegramAuth();
//         if (Number.isFinite(Number(u?.coins))) setCoins(Number(u.coins));
//         try {
//           const c = await getBalance();
//           if (Number.isFinite(c)) setCoins(c);
//         } catch {}
//         stopPolling = (() => {
//           let alive = true;
//           (function tick() {
//             setTimeout(async () => {
//               if (!alive) return;
//               try {
//                 const c = await getBalance();
//                 if (Number.isFinite(c)) setCoins((prev) => (c !== prev ? c : prev));
//               } catch {} finally {
//                 if (alive) tick();
//               }
//             }, 4000);
//           })();
//           return () => { alive = false; };
//         })();
//       } catch (e) {
//         console.error("[Crash] telegramAuth failed:", e);
//       }
//     })();
//     return () => { stopPolling?.(); };
//   }, []);

//   // ---- animation curve ----
//   // We grow x(t) ~ e^(rate * t). Choose rate so it feels right (≈ reach 5–8x in a few secs).
//   const RATE = 0.55; // tune feel. Higher = faster.

//   function resetRoundUI() {
//     setCurrentX(1.0);
//     setPoints([[0, 1.0]]);
//     setCrashAt(null);
//     setPayout(0);
//     setResult("");
//     cancelAnimationFrame(rafRef.current);
//   }

//   async function startRound() {
//     if (spinning) return;
//     const stake = Math.max(1, Math.floor(Number(bet || 0)));
//     if (!Number.isFinite(stake) || stake <= 0) return alert("Enter a valid bet (>= 1).");
//     if (Number(coins) < stake) return alert("Not enough coins.");

//     resetRoundUI();
//     setSpinning(true);
//     try { new Audio(spinSfx).play().catch(() => {}); } catch {}

//     try {
//       const res = await games.crash(stake, Number(targetX) || 1.1);
//       setRoundId(res?.roundId || "");
//       setCrashAt(Number(res?.details?.crashAt || 1.0));
//       setPayout(Number(res?.payout || 0));
//       setResult(String(res?.result || ""));

//       if (Number.isFinite(res?.newBalance)) {
//         setCoins((prev) => (res.newBalance !== prev ? res.newBalance : prev));
//       }

//       // animate until we hit min(crashAt, targetX if win)
//       const endX = Math.min(
//         Number(res?.details?.crashAt || 1.0),
//         res?.result === "win" ? (Number(targetX) || 1.1) : Infinity
//       );

//       // start RAF loop
//       startTimeRef.current = performance.now();
//       const animate = (now) => {
//         const t = (now - startTimeRef.current) / 1000;   // seconds
//         const x = Math.exp(RATE * t);
//         const capped = Math.min(x, endX);

//         setCurrentX(capped);
//         setPoints((p) => {
//           const next = [...p, [t, capped]];
//           // keep last ~8s for the scrolling sparkline
//           while (next.length > 140) next.shift();
//           return next;
//         });

//         const crashed = x >= Number(res?.details?.crashAt || 1.0);
//         const cashed = capped >= (Number(targetX) || 1.1);

//         if (crashed || cashed) {
//           // end animation
//           cancelAnimationFrame(rafRef.current);

//           if (cashed) {
//             try { new Audio(winSfx).play().catch(() => {}); } catch {}
//           } else {
//             try { new Audio(loseSfx).play().catch(() => {}); } catch {}
//           }

//           setTimeout(() => setSpinning(false), 400);
//           return;
//         }

//         rafRef.current = requestAnimationFrame(animate);
//       };
//       rafRef.current = requestAnimationFrame(animate);
//     } catch (e) {
//       console.error(e);
//       alert("Round failed. Try again.");
//       setSpinning(false);
//     } finally {
//       // nothing — we stop in the RAF end conditions
//     }
//   }

//   // ---- derived labels ----
//   const betLabel = useMemo(() => `${fmt(bet)} 1WT`, [bet]);
//   const statusText = useMemo(() => {
//     if (!result && spinning) return `Flying… ${fmt(currentX, 2)}x`;
//     if (result === "win") return `Cashed at ${fmt(targetX, 2)}x  • +${fmt(payout)} `;
//     if (result === "loss") return `Crashed at ${fmt(crashAt, 2)}x  • +0`;
//     return "Ready";
//   }, [result, spinning, currentX, payout, targetX, crashAt]);

//   return (
//     <div className="min-h-screen bg-[#070A15] text-white flex flex-col">
//       {/* HUD */}
//       <div className="flex items-center justify-between px-4 py-3 sticky top-0 bg-[#070A15]/80 backdrop-blur-sm z-50">
//         <div className="text-sm">
//           <span className="opacity-70 mr-2">Coins:</span>
//           <span className="font-bold">{fmt(coins)}</span>
//         </div>
//         <div className="text-xs px-2 py-1 rounded-full bg-indigo-400/15 border border-indigo-300/30">
//           {statusText}
//         </div>
//       </div>

//       {/* Stage */}
//       <div className="flex-1 w-full flex items-center justify-center px-4">
//         <div className="w-full max-w-[640px]">
//           <div className="rounded-[28px] border border-white/10 bg-gradient-to-b from-[#0F1734] to-[#0B1020] p-6 shadow-2xl">
//             {/* Multiplier big readout */}
//             <div className="flex items-end justify-center">
//               <div className={`text-6xl leading-none font-extrabold ${spinning ? "animate-pulse" : ""}`}>
//                 {fmt(currentX, 2)}<span className="text-2xl font-bold">x</span>
//               </div>
//             </div>

//             {/* Sparkline */}
//             <div className="mt-6 h-40 md:h-48 w-full">
//               <Sparkline points={points} color="#7c3aed" />
//             </div>

//             {/* Info row */}
//             <div className="mt-6 grid grid-cols-3 gap-2 text-center">
//               <InfoCard label="Bet" value={betLabel} accent="amber" />
//               <InfoCard label="Target" value={`${fmt(targetX, 2)}x`} accent="emerald" />
//               <InfoCard label="Payout" value={`+${fmt(payout)}`} accent={payout > 0 ? "emerald" : "fuchsia"} />
//             </div>
//           </div>

//           {/* Controls */}
//           <div className="mt-5 rounded-2xl bg-[#12182B] border border-white/10 p-4">
//             <div className="text-xs opacity-70 mb-2">BET AMOUNT</div>
//             <div className="grid grid-cols-[auto,1fr,auto] items-center gap-3">
//               <button
//                 onClick={() => setBet((b) => Math.max(1, Math.floor(Number(b || 0)) - 1))}
//                 className="w-12 h-12 min-w-[44px] min-h-[44px] rounded-md bg-black/30 border border-white/10 text-2xl leading-none"
//                 aria-label="Decrease bet"
//               >−</button>
//               <div className="text-center">
//                 <span className="text-3xl font-extrabold">{betLabel}</span>
//               </div>
//               <button
//                 onClick={() => setBet((b) => Math.max(1, Math.floor(Number(b || 0)) + 1))}
//                 className="w-12 h-12 min-w-[44px] min-h-[44px] rounded-md bg-black/30 border border-white/10 text-2xl leading-none"
//                 aria-label="Increase bet"
//               >+</button>
//             </div>

//             <div className="mt-3 flex items-center gap-2 flex-wrap">
//               {[2,5,10,25].map((m) => (
//                 <button key={m} onClick={() => setBet((b) => Math.max(1, Math.floor(Number(b || 0)) * m))}
//                   className="px-3 py-2 rounded bg-black/40 border border-white/10 text-sm min-h-[40px]">{m}X</button>
//               ))}
//               <button onClick={() => setBet((_) => Math.max(1, Math.floor(coins)))}
//                 className="px-3 py-2 rounded bg-[#1F5EFF] text-white text-sm min-h-[40px]">MAX</button>
//             </div>

//             <div className="mt-6 text-xs opacity-70 mb-2">CASHOUT TARGET</div>
//             <div className="flex items-center gap-2 flex-wrap">
//               {[1.5,1.8,2,3,5,10].map((x) => (
//                 <button key={x} onClick={() => setTargetX(x)}
//                   className={`px-3 py-2 rounded border min-h-[40px] ${Math.abs(targetX - x) < 1e-9
//                     ? "bg-emerald-500 text-black border-emerald-400"
//                     : "bg-black/30 text-white border-white/10"}`}>
//                   {x}x
//                 </button>
//               ))}
//             </div>
//             <input
//               type="range"
//               min={1.1}
//               max={50}
//               step={0.1}
//               value={targetX}
//               onChange={(e) => setTargetX(clamp(Number(e.target.value), 1.1, 50))}
//               className="w-full mt-3"
//             />
//           </div>

//           {/* Start button */}
//           <div className="mt-6 flex justify-center pb-10">
//             <button
//               onClick={startRound}
//               disabled={spinning}
//               className={`w-full max-w-xs py-4 rounded-xl text-xl font-bold shadow-md min-h-[48px] ${
//                 spinning
//                   ? "bg-fuchsia-300 text-black/80 cursor-not-allowed"
//                   : "bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white hover:brightness-110 active:scale-[0.99]"
//               }`}
//             >
//               {spinning ? "Running..." : "START"}
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// function InfoCard({ label, value, accent = "emerald" }) {
//   const bg =
//     accent === "emerald" ? "bg-emerald-400/15 border-emerald-300/30" :
//     accent === "amber"   ? "bg-amber-400/15 border-amber-300/30"   :
//     "bg-fuchsia-400/15 border-fuchsia-300/30";
//   return (
//     <div className={`rounded-xl px-3 py-2 border ${bg}`}>
//       <div className="text-[10px] uppercase tracking-wider opacity-70">{label}</div>
//       <div className="text-lg font-semibold">{value}</div>
//     </div>
//   );
// }

// /** Sparkline — live path (no dash tricks), sliding grid, anchored tail, curved + wavy lift.
//  *  Drop-in; uses your `points` [time, multiplier].
//  */
// function Sparkline({ points, color = "#7c3aed" }) {
//   if (!points?.length) return null;

//   // Viewbox
//   const W = 600;
//   const H = 200;      // taller so 50x+ stays clear of the base
//   const pad = 10;
//   const WINDOW_SEC = 8;

//   // Background grid slide (parallax)
//   const gridGap = 14;
//   const slideRate = 36; // px/sec

//   // Safety floor to avoid hugging the base
//   const FLOOR = 30;

//   // Arc + wave styling (for that “video” feel)
//   const ARC_BASE = 24;
//   const ARC_PER_X = 2.2;
//   const ARC_MAX = H * 0.45;
//   const WAVE_FREQ = 1.15;
//   const WAVE_AMP_MIN = 6;
//   const WAVE_AMP_MAX = 14;

//   const maxT = Math.max(...points.map(p => p[0]), 0);
//   const t0 = Math.max(0, maxT - WINDOW_SEC);

//   function sampleAt(tTarget) {
//     const all = points;
//     const tMin = all[0][0], tMax2 = all[all.length - 1][0];
//     if (tTarget <= tMin) return { t: tMin, x: all[0][1] };
//     if (tTarget >= tMax2) return { t: tMax2, x: all[all.length - 1][1] };
//     let i = 1;
//     while (i < all.length && all[i][0] < tTarget) i++;
//     const [t1, v1] = all[i - 1], [t2, v2] = all[i];
//     const a = (tTarget - t1) / Math.max(1e-6, (t2 - t1));
//     return { t: tTarget, x: v1 + a * (v2 - v1) };
//   }

//   const sx = (t) => {
//     const u = (t - t0) / Math.max(1e-6, WINDOW_SEC);
//     return pad + (W - 2 * pad) * Math.min(1, Math.max(0, u));
//   };

//   const visible = points.filter(([t]) => t >= t0 - 0.25);
//   const visVals = visible.map(([, v]) => Math.max(1.00001, v));
//   const vMin = Math.min(...visVals);
//   const vMax = Math.max(...visVals);
//   const logMin = Math.log(vMin);
//   const logMax = Math.log(Math.max(vMin + 1e-6, vMax));
//   const syLog = (m) => {
//     const lx = Math.log(Math.max(1.00001, m));
//     const ny = (lx - logMin) / Math.max(1e-6, (logMax - logMin));
//     const y = H - pad - (H - 2 * pad) * Math.min(1, Math.max(0, ny));
//     return Math.min(y, H - pad - FLOOR);
//   };

//   const headT = visible[visible.length - 1][0];
//   const head = sampleAt(headT);
//   const arcPixels = Math.min(ARC_MAX, ARC_BASE + ARC_PER_X * Math.max(0, head.x - 1));
//   const easeQuad = (u) => u * u;

//   const sy = (t, m) => {
//     let y = syLog(m);
//     const u = (t - t0) / Math.max(1e-6, WINDOW_SEC);
//     y -= arcPixels * easeQuad(Math.min(1, Math.max(0, u)));
//     const ampFactor = Math.min((Math.max(1, m) - 1) / 20, 1);
//     const amp = WAVE_AMP_MIN + (WAVE_AMP_MAX - WAVE_AMP_MIN) * ampFactor;
//     const phase = 2 * Math.PI * WAVE_FREQ * (t - t0);
//     y -= amp * Math.sin(phase + 0.6);
//     return Math.min(y, H - pad - FLOOR);
//   };

//   const inWin = points.filter(([t]) => t >= t0);
//   const mapped = inWin.map(([t, m]) => [sx(t), sy(t, m)]);

//   const start = sampleAt(t0);
//   const startX = pad;
//   const startY = sy(t0, start.x);

//   let d = `M${startX},${startY}`;
//   if (mapped.length) {
//     const [x1, y1] = mapped[0];
//     const c1x = startX + (x1 - startX) * 0.18;
//     const c1y = Math.min(startY - Math.max(12, arcPixels * 0.6), H - pad - FLOOR - 2);
//     const c2x = startX + (x1 - startX) * 0.55;
//     const c2y = Math.min(y1 - Math.max(8, arcPixels * 0.25), H - pad - FLOOR - 2);
//     d += ` C${c1x},${c1y} ${c2x},${c2y} ${x1},${y1}`;

//     // Catmull–Rom → Bezier for silky curve
//     for (let i = 1; i < mapped.length - 1; i++) {
//       const p0 = mapped[i - 1];
//       const p1 = mapped[i];
//       const p2 = mapped[i + 1];
//       const p3 = mapped[Math.min(mapped.length - 1, i + 2)];
//       const c1x2 = p1[0] + (p2[0] - (p0?.[0] ?? p1[0])) / 6;
//       const c1y2 = p1[1] + (p2[1] - (p0?.[1] ?? p1[1])) / 6;
//       const c2x2 = p2[0] - ((p3?.[0] ?? p2[0]) - p1[0]) / 6;
//       const c2y2 = p2[1] - ((p3?.[1] ?? p2[1]) - p1[1]) / 6;
//       d += ` C${c1x2},${c1y2} ${c2x2},${c2y2} ${p2[0]},${p2[1]}`;
//     }
//   }

//   const planeX = sx(head.t);
//   const planeY = sy(head.t, head.x);
//   const prev = sampleAt(Math.max(t0, head.t - WINDOW_SEC / 140));
//   const prevX = sx(prev.t);
//   const prevY = sy(prev.t, prev.x);
//   const angleDeg = (Math.atan2(planeY - prevY, planeX - prevX) * 180) / Math.PI;

//   // Scale plane with multiplier (dramatic but capped)
//   const baseSize = 24;
//   const scale = 1 + Math.min(head.x / 50, 1.4);
//   const planeSize = baseSize * scale;

//   const slideY = (slideRate * Math.max(0, head.t - t0)) % gridGap;

//   const gradId = "spark-grad";
//   const glowId = "spark-glow";

//   return (
//     <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
//       <defs>
//         <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
//           <feGaussianBlur stdDeviation="6" result="blur" />
//           <feMerge>
//             <feMergeNode in="blur" />
//             <feMergeNode in="SourceGraphic" />
//           </feMerge>
//         </filter>
//         <linearGradient id={gradId} x1="0%" y1="0%" x2="100%">
//           <stop offset="0%"  stopColor={color} stopOpacity="0.45" />
//           <stop offset="60%" stopColor={color} stopOpacity="0.95" />
//           <stop offset="100%" stopColor={color} stopOpacity="1" />
//         </linearGradient>
//         <pattern id="bg-grid" width="10" height={gridGap} patternUnits="userSpaceOnUse">
//           <line x1="0" y1={gridGap - 0.5} x2="10" y2={gridGap - 0.5} stroke="white" strokeOpacity="0.12" strokeWidth="1" />
//         </pattern>
//       </defs>

//       {/* sliding background grid */}
//       <g transform={`translate(0, ${slideY})`}>
//         <rect x="0" y={-gridGap} width={W} height={H + gridGap * 2} fill="url(#bg-grid)" />
//       </g>

//       {/* trail */}
//       <path
//         d={d}
//         fill="none"
//         stroke={`url(#${gradId})`}
//         strokeWidth={7}
//         strokeLinecap="round"
//         strokeLinejoin="round"
//         filter={`url(#${glowId})`}
//       />

//       {/* head dot */}
//       <circle cx={planeX} cy={planeY} r={7.5} fill={color} opacity="0.98" />

//       {/* plane */}
//       <text
//         transform={`translate(${planeX}, ${planeY - 12}) rotate(${angleDeg})`}
//         fontSize={planeSize}
//         textAnchor="middle"
//         dominantBaseline="central"
//         style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.8))" }}
//       >
//         ✈️
//       </text>
//     </svg>
//   );
// }


// Crash.jsx — plain JavaScript (JSX), integrated with your src/api.js
// Uses games.crash(stakeCoins, cashoutX) and getBalance() from ./api
// Plane nose is pinned to the path tip; the line draws LIVE as it flies (no dash hacks)

import React, { useEffect, useMemo, useRef, useState } from "react";
import { games, getBalance } from "../api";

/******************** UTILS ********************/
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const round2 = (x) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : 0);
const fmt = (n, dp = 2) => Number(n).toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });

/******************** MAIN ********************/
export default function Crash() {
  // wallet (server truth)
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // user inputs
  const [bet, setBet] = useState(10);
  const [autoCashout, setAutoCashout] = useState("1.80"); // REQUIRED for server-driven crash

  // round state
  const [phase, setPhase] = useState("idle"); // idle|arming|running|crashed|cashed
  const [cashoutAt, setCashoutAt] = useState(null); // number or null
  const [bustPoint, setBustPoint] = useState(0);    // server crashAt (loss) or > cashoutX (win)
  const [history, setHistory] = useState([]);
  const [details, setDetails] = useState(null);     // server outcome.details for debug

  // animation refs
  const rafRef = useRef(0);
  const startTsRef = useRef(0);
  const growthRateRef = useRef(0.22);   // m(t) = exp(r t) ; 2x ≈ 3.1s
  const tEndRef = useRef(5);            // duration to animate (cashout or crash)

  // live frame state
  const [mult, setMult] = useState(1);
  const [tNow, setTNow] = useState(0);

  // graph sizing
  const graphRef = useRef(null);
  const [graphSize, setGraphSize] = useState({ w: 860, h: 340, pad: 24 });
  useEffect(() => {
    const el = graphRef.current; if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setGraphSize({ w: Math.max(320, r.width), h: Math.max(220, r.height), pad: 24 });
    });
    ro.observe(el); return () => ro.disconnect();
  }, []);

  // initial balance
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const bal = await getBalance();
        setBalance(round2(bal));
      } catch (e) {
        setErr("Failed to load balance. Make sure you're logged in.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function refreshBalanceSoft() {
    try {
      const bal = await getBalance();
      if (Number.isFinite(bal)) setBalance(round2(bal));
    } catch { /* ignore */ }
  }

  /******************** ROUND CONTROL ********************/
  const resetRound = () => { setMult(1); setTNow(0); setCashoutAt(null); setBustPoint(0); setDetails(null); };

  const startRound = async () => {
    if (phase !== "idle") return;
    const stake = Math.max(1, Math.floor(Number(bet || 0)));
    const cashXRaw = Number(autoCashout);
    const cashX = clamp(cashXRaw, 1.1, 50);
    if (!Number.isFinite(stake) || stake < 1) return alert("Enter a valid bet amount.");
    if (!Number.isFinite(cashXRaw)) return alert("Set Auto cash-out (e.g. 1.80).");

    try {
      setPhase("arming");
      setErr("");

      // hit your backend via src/api.js
      const resp = await games.crash(stake, cashX);

      // Accept either flat or nested outcome shape
      const outcome = resp?.outcome ?? resp;
      const result = outcome?.result;            // 'win' | 'loss'
      const payout = Number(outcome?.payout ?? 0);
      const d = outcome?.details || {};
      setDetails(d);

      // server crash/bust point (may be a bit above cashoutX on win)
      const crashAt = Number(d?.crashAt ?? d?.bust ?? d?.crash ?? cashX);

      const r = growthRateRef.current;
      const tCash = Math.log(Math.max(cashX, 1.0001)) / r;
      const tCrash = Math.log(Math.max(crashAt, 1.0001)) / r;

      // Animate only up to the actual outcome event.
      const tEnd = result === "win" ? tCash : tCrash;
      tEndRef.current = Math.max(0.25, tEnd);

      setBustPoint(crashAt);
      setCashoutAt(result === "win" ? cashX : null);

      resetAnimation();
      setPhase("running");

      // Reconcile balance from server after the bet
      refreshBalanceSoft();
    } catch (e) {
      console.error(e);
      setErr(String(e?.message || e));
      setPhase("idle");
    }
  };

  function resetAnimation() {
    cancelAnimationFrame(rafRef.current);
    startTsRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
  }

  function tick(ts) {
    const r = growthRateRef.current;
    const elapsed = (ts - startTsRef.current) / 1000;
    const tEnd = tEndRef.current;

    const tClamped = clamp(elapsed, 0, tEnd);
    const m = Math.exp(r * tClamped);

    setTNow(tClamped);
    setMult(m);

    if (elapsed >= tEnd - 1e-6) {
      cancelAnimationFrame(rafRef.current);
      if (cashoutAt != null) {
        setPhase("cashed");
      } else {
        setPhase("crashed");
      }
      setHistory((h) => [round2(cashoutAt ?? bustPoint), ...h].slice(0, 14));
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  const nextRound = () => { setPhase("idle"); resetRound(); };

  /******************** DERIVED ********************/
  const canStart = phase === "idle" && !loading && bet >= 1 && Number(autoCashout) >= 1.1;
  const running = phase === "running";
  const crashed = phase === "crashed";
  const cashed = phase === "cashed";

  // geometry
  const { w, h, pad } = graphSize;
  const innerW = w - 2 * pad;
  const innerH = h - 2 * pad;
  const tEnd = Math.max(0.5, tEndRef.current || 5);

  const yFromMult = (m) => {
    const maxM = Math.max(1.0001, bustPoint || 2);
    const frac = (m - 1) / (maxM - 1);
    return h - pad - clamp(frac, 0, 1) * innerH;
  };

  // Build path from t=0 .. t=tNow (robust; no dash tricks)
  const pathD = useMemo(() => {
    const r = growthRateRef.current;
    const N = 140;
    const tEndLocal = clamp(tNow, 0, tEnd);
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * tEndLocal;
      const m = Math.min(Math.exp(r * t), bustPoint || 2);
      const x = pad + (innerW * t) / tEnd; // fills width by tEnd
      const y = yFromMult(m);
      pts.push([x, y]);
    }
    if (!pts.length) return `M ${pad} ${h - pad}`;
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) d += ` L ${pts[i][0]} ${pts[i][1]}`;
    return d;
  }, [tNow, tEnd, bustPoint, pad, innerW, h, innerH]);

  // plane pose: tip at current tNow
  const planePose = useMemo(() => {
    const r = growthRateRef.current;
    const t2 = clamp(tNow, 0, tEnd);
    const t1 = Math.max(0, t2 - tEnd / 160);
    const m1 = Math.min(Math.exp(r * t1), bustPoint || 2);
    const m2 = Math.min(Math.exp(r * t2), bustPoint || 2);
    const x1 = pad + (innerW * t1) / tEnd, y1 = yFromMult(m1);
    const x2 = pad + (innerW * t2) / tEnd, y2 = yFromMult(m2);
    const dx = x2 - x1, dy = y2 - y1;
    const deg = (Math.atan2(dy, dx) * 180) / Math.PI;
    return { x: x2, y: y2, deg };
  }, [tNow, tEnd, bustPoint, pad, innerW, h, innerH]);

  /******************** RENDER ********************/
  return (
    <div className="crash-root">
      <TopBar balance={balance} />

      <div className="wrap">
        {/* GRAPH */}
        <div className="graph-card">
          <div className="graph-title">
            <div className="status">
              {loading && <span className="muted">Loading…</span>}
              {!loading && phase === "idle" && <span className="muted">Ready for takeoff</span>}
              {phase === "arming" && <span className="pulse">Arming round…</span>}
              {running && <span className="pulse">In flight…</span>}
              {crashed && <span className="bad">Busted at {fmt(bustPoint)}×</span>}
              {cashed && <span className="good">Cashed at {fmt(cashoutAt)}×</span>}
            </div>
            <div className="mult">{fmt(mult)}×</div>
          </div>

          <div className="graph-area" ref={graphRef}>
            <svg className="fg-svg" width="100%" height="100%" viewBox={`0 0 ${w} ${h}`}>
              <defs>
                <pattern id="grid" width="38" height="38" patternUnits="userSpaceOnUse">
                  <path d="M 38 0 L 0 0 0 38" className="grid-line" />
                </pattern>
                <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6EE7F9" />
                  <stop offset="60%" stopColor="#7C3AED" />
                  <stop offset="100%" stopColor="#F472B6" />
                </linearGradient>
                <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="4" result="blur"/>
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>

              {/* grid & frame */}
              <rect x="0" y="0" width={w} height={h} fill="url(#grid)" />
              <rect x={pad} y={pad} width={innerW} height={innerH} className="frame" />

              {/* live path */}
              <path d={pathD} className={`trail ${crashed ? "crash" : "run"}`} />

              {/* plane — nose at (0,0). rotate around nose, then translate to tip */}
              <g transform={`translate(${planePose.x}, ${planePose.y})`}>
                <g transform={`rotate(${planePose.deg})`}>
                  <AirplaneNoseAtOrigin />
                </g>
              </g>
            </svg>
          </div>

          {/* server details (debug) */}
          <div className="seeds">
            <div><label>cashoutX</label><code>{Number(autoCashout) || "—"}</code></div>
            <div><label>server crashAt</label><code>{details?.crashAt ?? "—"}</code></div>
            <div><label>pWin</label><code>{details?.pWin ? fmt(details.pWin, 3) : "—"}</code></div>
          </div>

          {err && <div className="errorline">{String(err)}</div>}
        </div>

        {/* CONTROLS */}
        <div className="panel">
          <div className="card">
            <div className="row">
              <label>Bet</label>
              <div className="betbox">
                <button onClick={() => setBet((b) => Math.max(1, round2(b / 2)))}>½</button>
                <input type="number" min={1} step="1" value={bet}
                       onChange={(e) => setBet(Math.max(1, Math.floor(Number(e.target.value || 0))))} />
                <button onClick={() => setBet((b) => round2(Math.max(1, b * 2)))}>2×</button>
                <button onClick={() => setBet(balance)}>Max</button>
              </div>
            </div>

            <div className="row">
              <label>Auto cash-out (required)</label>
              <input type="number" placeholder="e.g. 1.80" step="0.01" value={autoCashout}
                     onChange={(e) => setAutoCashout(e.target.value)} />
            </div>

            <div className="row actions">
              {phase === "idle" && (
                <button className={`primary ${!canStart ? "disabled" : ""}`} disabled={!canStart} onClick={startRound}>
                  Take off ✈️
                </button>
              )}
              {phase === "arming" && (
                <button className="primary disabled" disabled>Arming…</button>
              )}
              {running && (
                <button className="primary disabled" disabled>Live…</button>
              )}
              {(crashed || cashed) && (
                <button className="primary" onClick={nextRound}>Next round</button>
              )}
            </div>

            {(crashed || cashed) && (
              <div className={`round-result ${crashed ? "bad" : "good"}`}>
                {crashed ? (
                  <>Busted at <b>{fmt(bustPoint)}×</b>. (Auto cash-out was <b>{fmt(Number(autoCashout))}×</b>)</>
                ) : (
                  <>Cashed at <b>{fmt(cashoutAt)}×</b>. Payout credited server-side.</>
                )}
              </div>
            )}
          </div>

          <div className="card">
            <div className="history-title">Recent results</div>
            <div className="history">
              {history.map((m, i) => (
                <span key={i} className={`chip ${m <= 1.2 ? "low" : m <= 2 ? "mid" : "high"}`}>
                  {fmt(m)}×
                </span>
              ))}
            </div>
          </div>

          <div className="tip">This build uses your <b>src/api.js</b> → <code>games.crash</code> and <code>getBalance</code>.</div>
        </div>
      </div>

      <style>{css}</style>
    </div>
  );
}

/******************** PLANE (NOSE at 0,0) ********************/
function AirplaneNoseAtOrigin() {
  return (
    <g className="plane" filter="url(#softGlow)">
      {/* fuselage arrow (nose at 0,0) */}
      <polygon points="0,0 -18,6 -18,-6" fill="#E5FF8A" />
      {/* cabin */}
      <rect x="-18" y="-4" width="10" height="8" rx="2" fill="#C7F9FF" />
      {/* wings */}
      <polygon points="-10,0 -20,10 -16,10 -6,3" fill="#B4A1FF" />
      <polygon points="-10,0 -20,-10 -16,-10 -6,-3" fill="#B4A1FF" />
      {/* exhaust glow */}
      <circle cx="-21" cy="0" r="2.4" fill="#FFD28A" />
    </g>
  );
}

/******************** TOP BAR ********************/
function TopBar({ balance }) {
  return (
    <div className="topbar">
      <div className="brand"><span className="dot" /> Crash Arcade</div>
      <div className="wallet">Balance: <b>{fmt(balance)}</b></div>
    </div>
  );
}

/******************** CSS ********************/
const css = `
:root { color-scheme: dark; }
* { box-sizing: border-box; }
html, body, #root { height: 100%; background:#080A0F; }
.crash-root { color:#E5E7EB; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial; }

.topbar { position:sticky; top:0; z-index:10; display:flex; justify-content:space-between; align-items:center;
  padding:14px 22px; border-bottom:1px solid #161B26; background:linear-gradient(180deg,#0E1220,#0A0D14 65%); }
.brand { display:flex; align-items:center; gap:10px; font-weight:800; }
.brand .dot { width:10px; height:10px; border-radius:9999px; background:#7C3AED; box-shadow:0 0 16px #7C3AEDAA; }
.wallet { color:#BAC7E3; }

.wrap { max-width:1200px; margin:0 auto; padding:20px; display:grid; gap:18px; grid-template-columns:1.25fr 0.75fr; }
@media (max-width:980px){ .wrap { grid-template-columns:1fr; } }

.graph-card { border:1px solid #182033; border-radius:18px; overflow:hidden; background:radial-gradient(1200px 400px at 20% 0%, #0F1322 0%, #0A0D14 60%); }
.graph-title { display:flex; align-items:center; justify-content:space-between; padding:14px 16px; border-bottom:1px solid #161B26; }
.graph-title .mult { font-size:30px; font-weight:900; color:#E5FF8A; text-shadow:0 0 18px #E5FF8A44; }
.graph-title .muted { color:#92A1C5; }
.graph-title .pulse { color:#9AE6FF; animation:pulse 1.4s ease-in-out infinite; }
.graph-title .bad { color:#FF7D8C; }
.graph-title .good { color:#B7F7BD; }
@keyframes pulse { 0%{opacity:.6} 50%{opacity:1} 100%{opacity:.6} }

.graph-area { position:relative; height:360px; }
.fg-svg { position:absolute; inset:0; }
.grid-line { stroke:#141A28; stroke-width:1; opacity:0.9; }
.frame { fill:transparent; stroke:#22304A; stroke-width:1.2; }

.trail { fill:none; stroke-width:3.2; stroke:url(#glow); stroke-linecap:round; stroke-linejoin:round; filter: drop-shadow(0 0 6px rgba(124,58,237,.5)); }

.plane { transform-origin: 0 0; } /* rotate around NOSE */

.seeds { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; padding:12px 16px; border-top:1px solid #161B26; font-size:12px; color:#98A6C8; }
.seeds label { font-size:11px; opacity:.8; margin-bottom:4px; display:block; }
.seeds code { display:block; padding:6px 8px; border:1px dashed #22304A; border-radius:8px; color:#C7D2FE; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.errorline { color:#FF8A98; padding:10px 16px; border-top:1px solid #2A1520; background:#140D11; }

.panel { display:flex; flex-direction:column; gap:18px; }
.card { border:1px solid #182033; border-radius:18px; padding:16px; background:radial-gradient(800px 300px at 20% -40%, #10162A 0%, #0A0D14 60%); }
.row { display:grid; gap:8px; margin-bottom:12px; }
.row label { font-size:13px; color:#A8B3C9; }
.row.actions { margin-top:10px; }

.betbox { display:grid; grid-template-columns:56px 1fr 56px 72px; gap:8px; }
.betbox input, .row input { width:100%; padding:12px; border-radius:12px; border:1px solid #22304A; background:#0B1018; color:#E8EEFB; }
.betbox button { border:1px solid #22304A; background:#0B1018; color:#D2DBF0; border-radius:12px; padding:12px 0; cursor:pointer; font-weight:700; }
.betbox button:hover { background:#101828; }

.primary { width:100%; padding:14px 16px; border-radius:14px; cursor:pointer; border:1px solid transparent; font-weight:800; letter-spacing:.3px; background:linear-gradient(90deg,#7C3AED,#4F46E5); color:#fff; }
.primary:hover { filter:brightness(1.06); }
.primary.disabled { opacity:.45; cursor:not-allowed; }

.round-result { margin-top:10px; font-size:14px; }
.round-result.good { color:#B7F7BD; }
.round-result.bad { color:#FF8A98; }

.history-title { font-size:13px; color:#A8B3C9; margin-bottom:8px; }
.history { display:flex; flex-wrap:wrap; gap:8px; }
.chip { border-radius:9999px; padding:6px 10px; font-weight:800; font-size:12px; border:1px solid #23314B; background:#0B1018; }
.chip.low { color:#FF9EA8; } .chip.mid { color:#FFD28A; } .chip.high { color:#B7F7BD; }

.tip { font-size:12px; color:#9AA6BD; }
`;
