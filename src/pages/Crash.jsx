




// Crash.jsx — JS/JSX (no TS). Uses src/api.js: games.crash() + getBalance() + telegramAuth().
// Live-growing line behind a nose-locked plane. Bet UI per your screenshot.


import React, { useEffect, useMemo, useRef, useState } from "react";
import { games, getBalance, telegramAuth } from "../api";

// --- LOTTIE (background under graph) ---
import lottie from "lottie-web";
import girlBg from "../assets/lottie/Girl_background.json"; 
import girlPlane from "../assets/games/girlPlane.png"; 

/******************** UTILS ********************/
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const round2 = (x) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : 0);
const fmt = (n, dp = 2) =>
  Number(n).toLocaleString(undefined, {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/******************** MAIN ********************/
export default function Crash() {
  // wallet (server truth)
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // user inputs
  const [bet, setBet] = useState(1); 
  const [autoCashout, setAutoCashout] = useState("1.80"); 

  // round state
  const [phase, setPhase] = useState("idle"); 
  const [cashoutAt, setCashoutAt] = useState(null); 
  const [bustPoint, setBustPoint] = useState(0); 
  const [history, setHistory] = useState([]);
  const [details, setDetails] = useState(null); 

  // animation refs
  const rafRef = useRef(0);
  const startTsRef = useRef(0);
  const growthRateRef = useRef(0.22); 
  const tEndRef = useRef(50); // <- increased so animation continues until bet

  // live frame state
  const [mult, setMult] = useState(1);
  const [tNow, setTNow] = useState(0);

  // graph sizing
  const graphRef = useRef(null);
  const [graphSize, setGraphSize] = useState({ w: 860, h: 340, pad: 24 });

  // Lottie background container
  const lottieRef = useRef(null);

  // ---------- New: Start flight animation on mount ----------
  useEffect(() => {
    startFlightAnimation();
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  function startFlightAnimation() {
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
      if (cashoutAt != null) setPhase("cashed");
      else if (phase === "running" || phase === "idle") setPhase("crashed");
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  /******************** REST OF ORIGINAL CODE BELOW ********************/
  // graph sizing ResizeObserver
  useEffect(() => {
    const el = graphRef.current; if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setGraphSize({ w: Math.max(320, r.width), h: Math.max(220, r.height), pad: 24 });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Lottie background
  useEffect(() => {
    if (!lottieRef.current) return;
    const anim = lottie.loadAnimation({
      container: lottieRef.current,
      renderer: "svg",
      loop: true,
      autoplay: true,
      animationData: girlBg,
      rendererSettings: { preserveAspectRatio: "xMidYMid meet", progressiveLoad: true },
    });
    return () => anim?.destroy();
  }, []);

  // Telegram auth + polling
  useEffect(() => {
    let stopPolling = () => { };
    (async () => {
      try {
        const u = await telegramAuth();
        if (Number.isFinite(Number(u?.coins))) {
          const initial = toNum(u.coins);
          setBalance((prev) => (initial !== prev ? initial : prev));
          setErr("");
        }
        try {
          const c = await getBalance();
          if (Number.isFinite(c)) {
            setBalance((prev) => (c !== prev ? c : prev));
            setErr("");
          }
        } catch { }
        stopPolling = (() => {
          let alive = true;
          (function tick() {
            setTimeout(async () => {
              if (!alive) return;
              try {
                const c = await getBalance();
                if (Number.isFinite(c)) {
                  setBalance((prev) => (c !== prev ? c : prev));
                  setErr("");
                }
              } catch { } finally { if (alive) tick(); }
            }, 4000);
          })();
          return () => { alive = false; };
        })();
      } catch (e) { console.error(" telegramAuth failed:", e); }
    })();
    return () => { stopPolling?.(); };
  }, []);

  // Initial balance load
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const bal = await getBalance();
        setBalance(round2(bal));
        setErr("");
      } catch (e) { setErr("Failed to load balance. Make sure you're logged in."); }
      finally { setLoading(false); }
    })();
  }, []);

  async function refreshBalanceSoft() {
    try {
      const bal = await getBalance();
      if (Number.isFinite(bal)) setBalance(round2(bal));
    } catch { }
  }

  const resetRound = () => {
    setMult(1); setTNow(0); setCashoutAt(null); setBustPoint(0); setDetails(null);
  };

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
      const resp = await games.crash(stake, cashX);
      if (Number.isFinite(Number(resp?.newBalance))) {
        const nb = Number(resp.newBalance);
        setBalance((prev) => (nb !== prev ? nb : prev));
        window.dispatchEvent(new CustomEvent("balance:refresh"));
      }

      const outcome = resp?.outcome ?? resp;
      const result = outcome?.result;
      const d = outcome?.details || {};
      setDetails(d);

      const crashAt = Number(d?.crashAt ?? d?.bust ?? d?.crash ?? cashX);
      const r = growthRateRef.current;
      const tCash = Math.log(Math.max(cashX, 1.0001)) / r;
      const tCrash = Math.log(Math.max(crashAt, 1.0001)) / r;

      const tEnd = result === "win" ? tCash : tCrash;
      tEndRef.current = Math.max(0.25, tEnd);

      setBustPoint(crashAt);
      setCashoutAt(result === "win" ? cashX : null);

      resetAnimation();
      setPhase("running");

      refreshBalanceSoft();
    } catch (e) { console.error(e); setErr(String(e?.message || e)); setPhase("idle"); }
  };

  function resetAnimation() {
    cancelAnimationFrame(rafRef.current);
    startTsRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
  }

  const nextRound = () => { setPhase("idle"); resetRound(); };

  // Derived states
  const canStart = phase === "idle" && !loading && bet >= 1 && Number(autoCashout) >= 1.1;
  const running = phase === "running";
  const crashed = phase === "crashed";
  const cashed = phase === "cashed";

  const { w, h, pad } = graphSize;
  const innerW = w - 2 * pad;
  const innerH = h - 2 * pad;
  const tEnd = Math.max(0.5, tEndRef.current || 5);

const yFromMult = (t) => {
  const midY = pad + innerH / 2;        // mid-height of graph
  const progress = clamp(t / tEnd, 0, 1);

  if (progress < 0.5) {                 // first half = diagonal
    return h - pad - (innerH / 2) * (progress / 0.5);
  } else {                               // second half = horizontal
    return midY;
  }
};




const pathD = useMemo(() => {
  const N = 140;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * tNow;
    const x = pad + (innerW * t) / tEnd;    // X linear
    const y = yFromMult(t);                 // Y matches plane
    pts.push([x, y]);
  }
  if (!pts.length) return `M ${pad} ${h - pad}`;
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) d += ` L ${pts[i][0]} ${pts[i][1]}`;
  return d;
}, [tNow, tEnd, pad, innerW, h, innerH]);



const planePose = useMemo(() => {
  const t2 = clamp(tNow, 0, tEnd);
  const x2 = pad + (innerW * t2) / tEnd;
  const y2 = yFromMult(t2);

  // Plane angle: 45° during diagonal, 0° horizontal after mid
  const deg = y2 === pad + innerH / 2 ? 0 : 0;

  return { x: x2, y: y2, deg };
}, [tNow, tEnd, pad, innerW, h, innerH]);







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
            {/* Lottie background layer — sits *under* the SVG */}
            <div className="lottie-bg" ref={lottieRef} aria-hidden="true" />
            <svg className="fg-svg" width="100%" height="100%" viewBox={`0 0 ${w} ${h}`}>
              <defs>
                <pattern id="grid" width="38" height="38" patternUnits="userSpaceOnUse">
                  <path d="M 38 0 L 0 0 0 38" className="grid-line" />
                </pattern>
                <linearGradient id="glow" x1="0%" y1="0%" x2="100%">
                  <stop offset="0%" stopColor="#6EE7F9" />
                  <stop offset="60%" stopColor="#7C3AED" />
                  <stop offset="100%" stopColor="#F472B6" />
                </linearGradient>
                <filter id="softGlow" x="-30%" y="-30%" width="160%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>

              {/* grid & frame */}
              <rect x="0" y="0" width={w} height={h} fill="url(#grid)" />
              <rect x={pad} y={pad} width={innerW} height={innerH} className="frame" />

              {/* NEW: Multiplier overlay on background (top-left, above grid/Lottie) */}
              <text
                x={pad + 10}
                y={pad + 40}
                fill="#FFFFFF22"
                fontSize="46"
                fontWeight="900"
              >
                {fmt(mult)}×
              </text>

              {/* live path */}
              <path d={pathD} className={`trail ${crashed ? "crash" : "run"}`} />

              {/* NEW: Plane image (replaces SVG arrow). Rotates around "nose" at current tip */}
              <g transform={`translate(${planePose.x}, ${planePose.y}) rotate(${planePose.deg})`}>
                <image
                  href={girlPlane}
                  x="-60"   /* tweak these four numbers to fine-align */
                  y="-50"
                  width="120"
                  height="100"
                  preserveAspectRatio="xMidYMid meet"
                />
              </g>
            </svg>
          </div>



        </div>

        {/* CONTROLS */}
        <div className="panel">
          <div className="card">
            {/* === New Bet UI (screenshot style) === */}
            <div className="bet-ui">
              <div className="bet-left">
                <div className="amount-wrap">
                  <button
                    className="step minus"
                    onClick={() => setBet((b) => Math.max(1, b - 1))}
                  >
                    −
                  </button>

                  <input
                    className="amount-input"
                    type="number"
                    min={1}
                    step="1"
                    value={bet}
                    onChange={(e) =>
                      setBet(Math.max(1, Math.floor(Number(e.target.value || 0))))
                    }
                  />

                  <button className="step plus" onClick={() => setBet((b) => b + 1)}>
                    +
                  </button>
                </div>


                <div className="quick-row">
                  <button
                    className="quick"
                    onClick={() => setBet((b) => Math.max(1, Math.floor(b / 2)))}
                  >
                    /2
                  </button>
                  <button
                    className="quick"
                    onClick={() => setBet((b) => Math.max(1, Math.floor(b * 2)))}
                  >
                    x2
                  </button>
                </div>

                <div className="balance-line">
                  Balance: <b>{fmt(balance)}</b>
                </div>
              </div>

              <div className="bet-right">
                {phase === "idle" && (
                  <button
                    className={`bet-cta ${!canStart ? "disabled" : ""}`}
                    disabled={!canStart}
                    onClick={startRound}
                  >
                    Bet <span className="chev">»</span>
                  </button>
                )}
                {phase === "arming" && (
                  <button className="bet-cta disabled" disabled>Arming…</button>
                )}
                {running && (
                  <button className="bet-cta disabled" disabled>Live…</button>
                )}
                {(crashed || cashed) && (
                  <button className="bet-cta" onClick={nextRound}>Next</button>
                )}
              </div>
            </div>

            {/* Auto cash-out row (unchanged) */}
            <div className="row" style={{ marginTop: 14 }}>
              <label>Auto cash-out (required)</label>
              <input
                type="number"
                placeholder="e.g. 1.80"
                step="0.01"
                value={autoCashout}
                onChange={(e) => setAutoCashout(e.target.value)}
              />
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
        </div>
      </div>

      <style>{css}</style>
    </div>
  );
}

/******************** PLANE (NOSE at 0,0) ********************/
/* Kept for reference; no longer used after switching to image */
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
  const goBack = () => {
    if (window.history.length > 1) window.history.back();
    else window.location.href = "/"; // fallback if no history
  };

  return (
    <div className="topbar">
      <div className="brand">
        <button className="backBtn" onClick={goBack} aria-label="Back">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span className="dot" />
        Crash Arcade
      </div>
      <div className="wallet">Balance: <b>{fmt(balance)}</b></div>
    </div>
  );
}

/******************** CSS ********************/
const css = `
:root { 
  color-scheme: dark; 
}

* { 
  box-sizing: border-box; 
}

html, body, #root { 
  height: 100%; 
  background:#080A0F; 
}

.crash-root { 
  color:#E5E7EB; 
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial; 
}

.topbar { 
  position:sticky; 
  top:0; 
  z-index:10; 
  display:flex; 
  justify-content:space-between; 
  align-items:center;
  padding:14px 22px; 
  border-bottom:1px solid #161B26; 
  background:linear-gradient(180deg,#0E1220,#0A0D14 65%); 
}

.brand { 
  display:flex; 
  align-items:center; 
  gap:10px; 
  font-weight:800; 
}

.brand .dot { 
  width:10px; 
  height:10px; 
  border-radius:9999px; 
  background:#7C3AED; 
  box-shadow:0 0 16px #7C3AEDAA; 
}

.wallet { 
  color:#BAC7E3; 
}

.wrap { 
  max-width:1200px; 
  margin:0 auto; 
  padding:10px; 
  display:grid; 
  gap:1px; 
  grid-template-columns:1.25fr 0.75fr; 
}

@media (max-width:980px){ 
  .wrap { 
    grid-template-columns:1fr; 
    padding:10px; 
  } 
}

.graph-card { 
  border:1px solid #182033; 
  border-radius:18px; 
  overflow:hidden; 
  background:radial-gradient(1200px 400px at 20% 0%, #0F1322 0%, #0A0D14 60%); 
}

.graph-title { 
  display:flex; 
  align-items:center; 
  justify-content:space-between; 
  padding:14px 16px; 
  border-bottom:1px solid #161B26; 
}

.graph-title .mult { 
  font-size:30px; 
  font-weight:900; 
  color:#E5FF8A; 
  text-shadow:0 0 18px #E5FF8A44; 
}

.graph-title .muted { 
  color:#92A1C5; 
}

.graph-title .pulse { 
  color:#9AE6FF; 
  animation:pulse 1.4s ease-in-out infinite; 
}

.graph-title .bad { 
  color:#FF7D8C; 
}

.graph-title .good { 
  color:#B7F7BD; 
}

@keyframes pulse { 
  0%{opacity:.6} 
  50%{opacity:1} 
  100%{opacity:.6} 
}

.graph-area { 
  position:relative; 
  height:360px; 
}

@media (max-width:600px){ 
  .graph-area { 
    height:260px; 
  } 
}

/* Lottie sits underneath the SVG and renders full-size */
.lottie-bg { 
  position:absolute; 
  inset:0; 
  z-index:0; 
  pointer-events:none; 
  opacity:1; 
  width:100%; 
  height:100%; 
  transform: scaleX(3);   /* widen 4×, height unchanged */
  transform-origin: center; 
}

.fg-svg { 
  position:absolute; 
  inset:0; 
  z-index:1; 
}

.grid-line { 
  display:none; 
} /* hide the repeating boxes grid */

.frame { 
  fill:transparent; 
  stroke:#22304A; 
  stroke-width:1.2; 
}

.trail { 
  fill:none; 
  stroke-width:3.2; 
  stroke:url(#glow); 
  stroke-linecap:round; 
  stroke-linejoin:round;
  filter: drop-shadow(0 0 6px rgba(124,58,237,.5)); 
}

.plane { 
  transform-origin: 0 0; 
} /* rotate around NOSE */

.seeds { 
  display:grid; 
  grid-template-columns:1fr 1fr 1fr; 
  gap:12px; 
  padding:12px 16px; 
  border-top:1px solid #161B26; 
  font-size:12px; 
  color:#98A6C8; 
}

@media (max-width:600px){ 
  .seeds { 
    grid-template-columns:1fr; 
  } 
}

.seeds label { 
  font-size:11px; 
  opacity:.8; 
  margin-bottom:4px; 
  display:block; 
}

.seeds code { 
  display:block; 
  padding:6px 8px; 
  border:1px dashed #22304A; 
  border-radius:8px; 
  color:#C7D2FE; 
  overflow:hidden; 
  text-overflow:ellipsis; 
  white-space:nowrap; 
}

.errorline { 
  color:#FF8A98; 
  padding:10px 16px; 
  border-top:1px solid #2A1520; 
  background:#140D11; 
}

/* === Bet UI (screenshot style) === */
.panel { 
  display:flex; 
  flex-direction:column; 
  gap:13px; 
}

.card { 
  border:1px solid #182033; 
  border-radius:18px; 
  padding:10px;
  background:radial-gradient(800px 300px at 20% -40%, #10162A 0%, #0A0D14 60%); 
}

.row { 
  display:grid; 
  gap:8px; 
  margin-bottom:12px; 
}

.row label { 
  font-size:13px; 
  color:#A8B3C9; 
}

.row.actions { 
  margin-top:10px; 
}

.bet-ui { 
  display:grid; 
  grid-template-columns: 1fr 220px; 
  gap:16px; 
  align-items:stretch; 
}

@media (max-width:600px){ 
  .bet-ui { 
    grid-template-columns: 1fr; 
    gap:10px; 
  } 
}

.bet-left { 
  display:flex; 
  flex-direction:column; 
  gap:8px; 
}

.amount-wrap {
  display: flex;
  justify-content: space-between; /* Space between minus, input, and plus */
  align-items: center;
  background: #2A2E35;
  border: 1px solid #22304A;
  border-radius: 16px;
  padding: 12px 14px;
}

@media (max-width:600px){ 
  .amount-wrap { 
    grid-template-columns: 1fr 56px 1fr; 
    padding:10px 12px; 
  } 
}

.amount-input { 
  width:100%; 
  background:transparent; 
  border:0; 
  color:#E8EEFB; 
  font-weight:800; 
  font-size:18px; 
  outline:none; 
  text-align: center;
  letter-spacing:.2px; 
}

@media (max-width:600px){ 
  .amount-input { 
    font-size:16px; 
  } 
}

.unit { 
  align-self:center; 
  justify-self:end; 
  color:#9AA6BD; 
  font-weight:700; 
  opacity:.85; 
}

.stepper { 
  position:absolute; 
  right:10px; 
  top:50%; 
  transform:translateY(-50%); 
  display:flex; 
  gap:12px; 
}

.step { 
  width:36px; 
  height:36px; 
  border-radius:12px; 
  border:1px solid #394355; 
  background:#1C222C; 
  color:#D5DEEF; 
  font-size:18px; 
  font-weight:900; 
  line-height:1;
  display:flex; 
  align-items:center; 
  justify-content:center; 
  cursor:pointer; 
}

.step:hover { 
  background:#242C38; 
}

@media (max-width:600px){ 
  .step { 
    width:32px; 
    height:32px; 
  } 
}

.quick-row { 
  display:grid; 
  grid-template-columns: 1fr 1fr; 
  gap:12px; 
}

.quick { 
  padding:12px 0; 
  border-radius:14px; 
  border:1px solid #22304A; 
  background:#1B2029; 
  color:#C7D2FE; 
  font-weight:700; 
}

.quick:hover { 
  background:#222938; 
}

.balance-line { 
  font-size:12px; 
  color:#9AA6BD; 
}

.bet-right { 
  display:flex; 
}

.bet-cta { 
  width:100%; 
  height:60px; 
  border-radius:20px; 
  border:none; 
  cursor:pointer; 
  font-weight:900; 
  font-size:22px; 
  color:#fff;
  background:#0B75FF; 
  box-shadow:0 8px 20px rgba(11,117,255,.35), inset 0 0 0 1px rgba(255,255,255,.1); 
  transition:transform .06s ease, filter .2s; 
}

.bet-cta:hover { 
  filter:brightness(1.06); 
}

.bet-cta:active { 
  transform:translateY(1px); 
}

.bet-cta.disabled { 
  opacity:.45; 
  cursor:not-allowed; 
}

@media (max-width:600px){ 
  .bet-cta { 
    height:72px; 
    font-size:20px; 
  } 
}

.chev { 
  margin-left:8px; 
  opacity:.9; 
  text-shadow:0 1px 0 rgba(255,255,255,.35); 
}

.history-title { 
  font-size:13px; 
  color:#A8B3C9; 
  margin-bottom:8px; 
}

.history { 
  display:flex; 
  flex-wrap:wrap; 
  gap:8px; 
}

.chip { 
  border-radius:9999px; 
  padding:6px 10px; 
  font-weight:800; 
  font-size:12px; 
  border:1px solid #23314B; 
  background:#0B1018; 
}

.chip.low { 
  color:#FF9EA8; 
} 

.chip.mid { 
  color:#FFD28A; 
} 

.chip.high { 
  color:#B7F7BD; 
}

.backBtn{
  display:flex; 
  align-items:center; 
  justify-content:center;
  width:36px; 
  height:36px; 
  margin-right:8px;
  border-radius:10px; 
  border:1px solid #22304A;
  background:#131826; 
  color:#C7D2FE; 
  cursor:pointer;
  transition:filter .15s ease, background .15s ease;
}

.backBtn:hover{ 
  background:#1A2030; 
  filter:brightness(1.05); 
}

.backBtn:active{ 
  transform:translateY(1px); 
}

.backBtn svg{ 
  display:block; 
}

.tip { 
  font-size:12px; 
  color:#9AA6BD; 
}

@media (max-width:600px){ 
  .graph-title .mult { 
    font-size:24px; 
  } 
}

`;
