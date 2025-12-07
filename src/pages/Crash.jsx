// // Crash.jsx — rounds with 5s bet window, manual cashout, Lottie-driven flight/crash.

// import React, { useEffect, useRef, useState } from "react";
// import { games, getBalance, telegramAuth, crashJoin, crashCashout } from "../api";

// import lottie from "lottie-web";
// // ⬇️ Keep these paths pointing to your actual files
// import girlAnim from "../assets/lottie/Girl1.json";
// import bgAnim from "../assets/lottie/Girl_background.json";
// // ⬇️ NEW: intermediate overlay animation (5s between rounds)
// import interAnim from "../assets/lottie/Intermediate_animation.json";
// // ⬇️ NEW: loading screen animation (plays once when user first opens this screen)
// import loadingAnim from "../assets/lottie/Loading_screen1.json";

// /************ utils ************/
// const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
// const round2 = (x) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : 0);
// const fmt = (n, dp = 2) =>
//   Number(n).toLocaleString(undefined, {
//     minimumFractionDigits: dp,
//     maximumFractionDigits: dp,
//   });

// /************ main ************/
// export default function Crash() {
//   // wallet
//   const [balance, setBalance] = useState(0);
//   const [loading, setLoading] = useState(true);
//   const [err, setErr] = useState("");

//   // inputs
//   const [bet, setBet] = useState(1);

//   // round machine: countdown -> running -> crashed/cashed -> countdown...
//   const [phase, setPhase] = useState("countdown"); // countdown|running|crashed|cashed
//   const [countdown, setCountdown] = useState(5); // seconds left to place bet
//   const [inBet, setInBet] = useState(false); // did user join this round?
//   const [lockedBet, setLockedBet] = useState(0); // frozen stake for current round

//   const [startAtMs, setStartAtMs] = useState(null); // server start time for joined round
//   const localCountdownEndRef = useRef(null);

//   // outcome
//   const [history, setHistory] = useState([]);
//   const [details, setDetails] = useState(null);

//   const [cashoutAt, setCashoutAt] = useState(null);
//   const [roundId, setRoundId] = useState(null);
//   const [bustPoint, setBustPoint] = useState(0); // crash multiplier
//   const serverSettledRef = useRef(false); // prevent client-side double credit

//   // animation refs
//   const rafRef = useRef(0);
//   const startTsRef = useRef(0);
//   const growthRateRef = useRef(0.22); // m(t) = exp(r t)
//   const tEndRef = useRef(5);

//   // live frame state
//   const [mult, setMult] = useState(1);
//   const [tNow, setTNow] = useState(0);

//   // Lottie (Girl1 handles rocket): idle → high-fly → straight crash
//   const lottieWrapRef = useRef(null);
//   const lottieAnimRef = useRef(null);

//   // Background Lottie (exact same size as Girl1 container)
//   const bgWrapRef = useRef(null);
//   const bgLottieRef = useRef(null);

//   // NEW: intermediate overlay Lottie (between rounds)
//   const interWrapRef = useRef(null);
//   const interLottieRef = useRef(null);

//   // NEW: loading-screen Lottie (plays once on first visit)
//   const loadingWrapRef = useRef(null);
//   const loadingLottieRef = useRef(null);
//   const [firstLoad, setFirstLoad] = useState(true);

//   // track when the crash segment is actively playing so we only hide
//   // the girl AFTER that segment fully completes (no early disappear).
//   const [crashPlaying, setCrashPlaying] = useState(false);

//   // track if we've switched into the "≥5x" 18-second animation phase
//   const highMultStartedRef = useRef(false);

//   // Segment map (frames).
//   // FLY_LOW: used from start until ~5x
//   // FLY_HIGH: special ~18s sub-animation used once multiplier passes 5x
//   const SEG = useRef({
//     IDLE: [0, 120],
//     FLY_LOW: [10, 2200],
//     FLY_HIGH: [2200, 3280],        // ~18s slice used after 5x
//     CRASH_STRAIGHT: [3300, 3600],  // straight + disappear only
//   });

//   // pretty toast for errors like "already-crashed"
//   const [toast, setToast] = useState(null); // { text:string, kind:'good'|'bad'|'info' }
//   const flashToast = (text, kind = "bad", ms = 1300) => {
//     setToast({ text, kind });
//     setTimeout(() => setToast(null), ms);
//   };

//   // Foreground (Girl1) Lottie init
//   useEffect(() => {
//     if (!lottieWrapRef.current) return;
//     const anim = lottie.loadAnimation({
//       container: lottieWrapRef.current,
//       renderer: "svg",
//       loop: false,
//       autoplay: false,
//       animationData: girlAnim,
//       rendererSettings: {
//         preserveAspectRatio: "xMidYMid slice",
//         progressiveLoad: true,
//       },
//     });
//     // default: don't loop segments; we control loop only when needed
//     anim.loop = false;
//     lottieAnimRef.current = anim;
//     anim.goToAndStop(SEG.current.IDLE[0], true);
//     return () => anim?.destroy();
//   }, []);

//   // Background Lottie init — always shown, exact same height/width as Girl1 area
//   useEffect(() => {
//     if (!bgWrapRef.current) return;
//     const anim = lottie.loadAnimation({
//       container: bgWrapRef.current,
//       renderer: "svg",
//       loop: true,
//       autoplay: true,
//       animationData: bgAnim,
//       rendererSettings: {
//         preserveAspectRatio: "xMidYMid slice",
//         progressiveLoad: true,
//       },
//     });
//     bgLottieRef.current = anim;
//     return () => anim?.destroy();
//   }, []);

//   // NEW: Intermediate overlay Lottie init
//   useEffect(() => {
//     if (!interWrapRef.current) return;
//     const anim = lottie.loadAnimation({
//       container: interWrapRef.current,
//       renderer: "svg",
//       loop: true,
//       autoplay: false, // we'll control when it plays
//       animationData: interAnim,
//       rendererSettings: {
//         preserveAspectRatio: "xMidYMid slice",
//         progressiveLoad: true,
//       },
//     });
//     interLottieRef.current = anim;
//     return () => anim?.destroy();
//   }, []);

//   // NEW: control intermediate overlay playback based on phase
//   useEffect(() => {
//     const anim = interLottieRef.current;
//     if (!anim) return;
//     if (phase === "countdown") {
//       // whenever we enter countdown, restart the overlay from the beginning
//       anim.goToAndPlay(0, true);
//     } else {
//       // stop overlay when flight is running or after crash/cashout
//       anim.stop();
//     }
//   }, [phase]);

//   // NEW: Loading-screen Lottie init (plays once on first load)
//   useEffect(() => {
//     if (!loadingWrapRef.current) return;
//     const anim = lottie.loadAnimation({
//       container: loadingWrapRef.current,
//       renderer: "svg",
//       loop: false,
//       autoplay: true,
//       animationData: loadingAnim,
//       rendererSettings: {
//         preserveAspectRatio: "xMidYMid slice",
//         progressiveLoad: true,
//       },
//     });
//     loadingLottieRef.current = anim;

//     // when loading animation completes -> hide forever
//     const handleComplete = () => {
//       setFirstLoad(false);
//     };
//     anim.addEventListener("complete", handleComplete);

//     return () => {
//       anim.removeEventListener("complete", handleComplete);
//       anim?.destroy();
//     };
//   }, []);

//   /************ auth + balance polling (unchanged) ************/
//   useEffect(() => {
//     let stopPolling = () => {};
//     (async () => {
//       try {
//         const u = await telegramAuth();
//         if (Number.isFinite(Number(u?.coins))) {
//           setBalance((p) => {
//             const v = Number(u.coins);
//             setErr("");
//             return v !== p ? v : p;
//           });
//         }
//         try {
//           const c = await getBalance();
//           if (Number.isFinite(c)) {
//             setBalance((p) => (c !== p ? c : p));
//             setErr("");
//           }
//         } catch {}
//         stopPolling = (() => {
//           let alive = true;
//           (function tick() {
//             setTimeout(async () => {
//               if (!alive) return;
//               try {
//                 const c = await getBalance();
//                 if (Number.isFinite(c)) {
//                   setBalance((p) => (c !== p ? c : p));
//                   setErr("");
//                 }
//               } catch {
//               } finally {
//                 if (alive) tick();
//               }
//             }, 4000);
//           })();
//           return () => {
//             alive = false;
//           };
//         })();
//       } catch (e) {
//         console.error("telegramAuth failed:", e);
//       }
//     })();
//     return () => {
//       stopPolling?.();
//     };
//   }, []);

//   useEffect(() => {
//     (async () => {
//       try {
//         setLoading(true);
//         const bal = await getBalance();
//         setBalance(round2(bal));
//         setErr("");
//       } catch (e) {
//         setErr("Failed to load balance. Make sure you're logged in.");
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, []);

//   async function refreshBalanceSoft() {
//     try {
//       const bal = await getBalance();
//       if (Number.isFinite(bal)) {
//         setBalance(round2(bal));
//         setErr("");
//       }
//     } catch {}
//   }

//   /************ round engine ************/
//   const resetRoundVisuals = () => {
//     setMult(1);
//     setTNow(0);
//     setCashoutAt(null);
//     setBustPoint(0);
//     setDetails(null);
//     setCrashPlaying(false);
//     highMultStartedRef.current = false;
//     serverSettledRef.current = false;
//   };

//   // Heavy-tailed sim for spectators
//   const randomCrash = () => {
//     const u = Math.random();
//     const x = 1 / (1 - u);
//     return clamp(x, 1.02, 50);
//   };

//   // Lottie helpers
//   const playSegment = (range, forceBegin = true) => {
//     const anim = lottieAnimRef.current;
//     if (!anim) return;
//     anim.playSegments([range[0], range[1]], forceBegin);
//   };
//   const goToFrame = (f) => lottieAnimRef.current?.goToAndStop(f, true);
//   const pause = () => lottieAnimRef.current?.pause();

//   // Start the flight (after countdown hits 0)
//   const startFlight = async () => {
//     resetRoundVisuals();
//     setPhase("running");

//     // Use backend-provided crashAt if joined; otherwise simulate
//     const crashAt =
//       inBet && Number.isFinite(bustPoint) && bustPoint > 1.01 ? bustPoint : randomCrash();
//     setBustPoint(crashAt);

//     // Kick Lottie into the "low" flight segment initially
//     const anim = lottieAnimRef.current;
//     if (anim) anim.loop = false; // low segment just plays forward
//     playSegment(SEG.current.FLY_LOW, true);

//     // Animate until crash or cashout
//     const r = growthRateRef.current;
//     const tCrash = Math.log(Math.max(crashAt, 1.0001)) / r; // seconds to reach crash multiplier
//     tEndRef.current = Math.max(0.25, tCrash);
//     beginAnimation();
//   };

//   const beginAnimation = () => {
//     cancelAnimationFrame(rafRef.current);
//     startTsRef.current = performance.now();
//     rafRef.current = requestAnimationFrame(tick);
//   };

//   function tick(ts) {
//     const r = growthRateRef.current;
//     const elapsed = (ts - startTsRef.current) / 1000;
//     const tEnd = tEndRef.current;

//     // === CRASH MOMENT ===
//     if (elapsed >= tEnd - 1e-6) {
//       if (bustPoint && Number.isFinite(bustPoint)) {
//         setTNow(tEnd);
//         setMult(bustPoint);
//       }

//       // On crash: play ONLY the straight-exit slice (3300..3600)
//       const anim = lottieAnimRef.current;
//       if (anim) {
//         anim.loop = false; // crash segment should not loop
//         setCrashPlaying(true);
//         const onComplete = () => {
//           setCrashPlaying(false);
//           anim.removeEventListener("complete", onComplete);
//         };
//         anim.removeEventListener("complete", onComplete);
//         anim.addEventListener("complete", onComplete);
//       }
//       playSegment(SEG.current.CRASH_STRAIGHT, true);

//       endRound("crashed");
//       return;
//     }

//     // === NORMAL FLIGHT FRAME ===
//     const tClamped = clamp(elapsed, 0, tEnd);
//     const m = Math.exp(r * tClamped);

//     setTNow(tClamped);
//     setMult(m);

//     // 🚀 When multiplier crosses 5x → switch to the special 18s HIGH_FLY animation
//     if (!highMultStartedRef.current && m >= 5) {
//       highMultStartedRef.current = true;
//       const anim = lottieAnimRef.current;
//       if (anim) {
//         anim.loop = true; // keep that 18s section running smoothly until crash
//         playSegment(SEG.current.FLY_HIGH, true);
//       }
//     }

//     // === CASHOUT ===
//     if (phase === "running" && cashoutAt != null) {
//       // freeze animation on current flight frame
//       pause();
//       endRound("cashed");
//       return;
//     }

//     rafRef.current = requestAnimationFrame(tick);
//   }

//   function endRound(kind) {
//     cancelAnimationFrame(rafRef.current);
//     if (kind === "crashed") {
//       if (bustPoint && Number.isFinite(bustPoint)) {
//         setMult(bustPoint);
//         setTNow(tEndRef.current || 0);
//       }
//       setPhase("crashed");
//       setHistory((h) => [round2(bustPoint), ...h].slice(0, 14));
//     } else {
//       setPhase("cashed");
//       setHistory((h) => [round2(cashoutAt), ...h].slice(0, 14));
//       refreshBalanceSoft();
//     }

//     // Schedule next round’s countdown
//     setTimeout(() => {
//       setInBet(false);
//       setLockedBet(0);
//       setCashoutAt(null);
//       setStartAtMs(null);
//       localCountdownEndRef.current = null;
//       resetRoundVisuals();
//       setCountdown(5);
//       setPhase("countdown");
//       // return to idle pose
//       goToFrame(SEG.current.IDLE[0]);
//     }, 800);
//   }

//   // Countdown loop
//   useEffect(() => {
//     if (phase !== "countdown") return;
//     setCashoutAt(null);
//     setBustPoint(0);
//     let id = 0;

//     if (!startAtMs) {
//       localCountdownEndRef.current = Date.now() + 5000;
//     }

//     const step = () => {
//       const now = Date.now();
//       const target = startAtMs ?? localCountdownEndRef.current ?? now;
//       const leftMs = Math.max(0, target - now);
//       setCountdown((prev) => Math.min(prev ?? 999, Math.ceil(leftMs / 1000)));
//       if (leftMs <= 0) {
//         startFlight();
//       } else {
//         id = requestAnimationFrame(step);
//       }
//     };
//     id = requestAnimationFrame(step);
//     return () => cancelAnimationFrame(id);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [phase, startAtMs]);

//   // Place bet during countdown
//   const placeBet = async () => {
//     if (phase !== "countdown" || inBet) return;
//     const stake = Math.max(1, Math.floor(Number(bet || 0)));
//     if (!Number.isFinite(stake) || stake < 1) return alert("Enter a valid bet amount.");

//     try {
//       const resp = await crashJoin(stake);
//       if (Number.isFinite(Number(resp?.newBalance))) setBalance(Number(resp.newBalance));
//       setLockedBet(stake);
//       setRoundId(resp.roundId);
//       setBustPoint(Number(resp.crashAt) || 0);
//       if (Number.isFinite(Number(resp?.startAt))) {
//         const srv = Number(resp.startAt);
//         setStartAtMs((prev) => (prev ? Math.min(prev, srv) : srv));
//       }
//       setInBet(true);
//     } catch (e) {
//       alert(e.message || "Join failed");
//     }
//   };

//   // Cash out during flight (server-settled)
//   const cashoutNow = async () => {
//     if (phase !== "running" || !inBet || cashoutAt != null) return;
//     if (startAtMs && Date.now() < startAtMs) return; // not started yet on server

//     const x = round2(mult);
//     try {
//       const resp = await crashCashout({ roundId, x });
//       if (resp?.ok) {
//         serverSettledRef.current = true;
//         setCashoutAt(x);
//         if (Number.isFinite(Number(resp?.newBalance))) {
//           setBalance(Number(resp.newBalance));
//         } else {
//           refreshBalanceSoft();
//         }
//         pause(); // pause at current flight frame
//       } else {
//         const code = resp?.error || "";
//         if (code === "already-crashed" || code === "too-late") {
//           flashToast("Already crashed!", "bad");
//           playSegment(SEG.current.CRASH_STRAIGHT, true);
//           endRound("crashed");
//           return;
//         }
//         alert(code || "Cashout failed");
//       }
//     } catch (e) {
//       console.warn("cashout error", e);
//       alert(e?.message || "Cashout error");
//     }
//   };

//   /************ derived ************/
//   const running = phase === "running";
//   const crashed = phase === "crashed";
//   const cashed = phase === "cashed";

//   const canPlaceBet = phase === "countdown" && !inBet && !loading && bet >= 1;
//   const canCashout = phase === "running" && inBet && cashoutAt == null;

//   /************ render ************/
//   // Keep Girl visible while either RUNNING or while CRASH segment is still playing.
//   const showGirl = running || crashPlaying;
//   const showIntermediate = phase === "countdown"; // overlay between rounds
//   // hide multipliers during countdown
//   const showMult = phase !== "countdown";

//   return (
//     <div className="crash-root">
//       {/* FULLSCREEN LOADING SCREEN — shows ONLY on first entry */}
//      {firstLoad && (
//   <div className="loading-screen">
//     <div className="loading-lottie" ref={loadingWrapRef} />
//   </div>
// )}


//       <TopBar balance={balance} />

//       <div className="wrap">
//         {/* GRAPH (now: LOTTIE-ONLY AREA) */}
//         <div className="graph-card">
//           {/* <div className="graph-title">
//             <div className="status">
//               {loading && <span className="muted">Loading…</span>}
//               {!loading && phase === "countdown" && (
//                 <span className="muted">Place your bet — round starts in {countdown}s</span>
//               )}
//               {running && <span className="pulse">In flight…</span>}
//               {crashed && <span className="bad">Busted at {fmt(bustPoint)}×</span>}
//               {cashed && <span className="good">Cashed at {fmt(cashoutAt)}×</span>}
//             </div>
//             {showMult && <div className="mult">{fmt(mult)}×</div>}
//           </div> */}

//           <div className="graph-area">
//             {/* Background Lottie: exact same size as foreground */}
//             <div className="bg-lottie" ref={bgWrapRef} aria-hidden="true" />

//             {/* NEW: Intermediate overlay, covers full area during countdown */}
//             <div
//               className="inter-lottie"
//               ref={interWrapRef}
//               aria-hidden="true"
//               style={{ opacity: showIntermediate ? 1 : 0 }}
//             />

//             {/* Top-left multiplier HUD over the Lottie area (larger) */}
//             {showMult && <div className="mult-hud">{fmt(mult)}×</div>}

//             {/* Foreground Girl1 Lottie — hides ONLY after crash segment fully finishes */}
//             <div
//               className="lottie-only"
//               ref={lottieWrapRef}
//               aria-label="Flight animation"
//               style={{ visibility: showGirl ? "visible" : "hidden" }}
//             />

//             {toast && <div className={`toast ${toast.kind}`}>{toast.text}</div>}
//           </div>
//         </div>

//         {/* CONTROLS */}
//         <div className="panel">
//           <div className="card">
//             <div className="bet-ui">
//               <div className="bet-left">
//                 <div className="amount-wrap">
//                   <button
//                     className="step minus"
//                     onClick={() => setBet((b) => Math.max(1, b - 1))}
//                     disabled={phase !== "countdown" || inBet}
//                   >
//                     −
//                   </button>

//                   <input
//                     className="amount-input"
//                     type="number"
//                     min={1}
//                     step="1"
//                     value={inBet ? lockedBet : bet}
//                     disabled={phase !== "countdown" || inBet}
//                     onChange={(e) => setBet(Math.max(1, Math.floor(Number(e.target.value || 0))))}
//                   />

//                   <button
//                     className="step plus"
//                     onClick={() => setBet((b) => b + 1)}
//                     disabled={phase !== "countdown" || inBet}
//                   >
//                     +
//                   </button>
//                 </div>

//                 <div className="quick-row">
//                   <button
//                     className="quick"
//                     disabled={phase !== "countdown" || inBet}
//                     onClick={() => setBet((b) => Math.max(1, Math.floor(b / 2)))}
//                   >
//                     /2
//                   </button>
//                   <button
//                     className="quick"
//                     disabled={phase !== "countdown" || inBet}
//                     onClick={() => setBet((b) => Math.max(1, Math.floor(b * 2)))}
//                   >
//                     x2
//                   </button>
//                 </div>

//                 <div className="balance-line">
//                   Balance: <b>{fmt(balance)}</b>
//                 </div>
//               </div>

//               <div className="bet-right">
//                 {phase === "countdown" && !inBet && (
//                   <button
//                     className={`bet-cta ${!canPlaceBet ? "disabled" : ""}`}
//                     disabled={!canPlaceBet}
//                     onClick={placeBet}
//                   >
//                     Place Bet
//                   </button>
//                 )}
//                 {phase === "countdown" && inBet && (
//                   <button className="bet-cta disabled" disabled>
//                     Joined (starts in {countdown}s)
//                   </button>
//                 )}
//                 {running && (
//                   <button
//                     className={`bet-cta ${!canCashout ? "disabled" : ""}`}
//                     disabled={!canCashout}
//                     onClick={cashoutNow}
//                   >
//                     Cash Out @ {fmt(mult)}×
//                   </button>
//                 )}
//                 {(crashed || cashed) && (
//                   <button className="bet-cta disabled" disabled>
//                     Next round in 5s…
//                   </button>
//                 )}
//               </div>
//             </div>

//             {(crashed || cashed) && (
//               <div className={`round-result ${crashed ? "bad" : "good"}`}>
//                 {crashed ? (
//                   <>
//                     Busted at <b>{fmt(bustPoint)}×</b>.
//                     {!inBet ? " You didn’t join this round." : " Your stake was lost."}
//                   </>
//                 ) : (
//                   <>
//                     Cashed at <b>{fmt(cashoutAt)}×</b>. Payout credited.
//                   </>
//                 )}
//               </div>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* Minimal CSS additions that your existing `css` string may not have */}
//       <style>{`
//         .countdown-main { fill:#ffffffdd; font-size:80px; font-weight:900; filter:url(#softGlow); }
//         .countdown-sub { fill:#ffffff99; font-size:20px; font-weight:600; }
//         .bet-cta.disabled { opacity:0.6; cursor:not-allowed; }

//          :root { 
//   color-scheme: dark; 
// }

// * { 
//   box-sizing: border-box; 
// }

// html, body, #root { 
//   height: 100%; 
//   background:#080A0F; 
// }

// .crash-root { 
//   color:#E5E7EB; 
//   font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial; 
// }

// .topbar { 
//   position:sticky; 
//   top:0; 
//   z-index:10; 
//   display:flex; 
//   justify-content:space-between; 
//   align-items:center;
//   padding:14px 22px; 
//   border-bottom:1px solid #161B26; 
//   background:linear-gradient(180deg,#0E1220,#0A0D14 65%); 
// }

// .brand { 
//   display:flex; 
//   align-items:center; 
//   gap:10px; 
//   font-weight:800; 
// }

// .brand .dot { 
//   width:10px; 
//   height:10px; 
//   border-radius:9999px; 
//   background:#7C3AED; 
//   box-shadow:0 0 16px #7C3AEDAA; 
// }

// .wallet { 
//   color:#BAC7E3; 
// }

// .wrap { 
//   max-width:1200px; 
//   margin:0 auto; 
//   padding:10px; 
//   display:grid; 
//   gap:1px; 
//   grid-template-columns:1.25fr 0.75fr; 
// }

// @media (max-width:980px){ 
//   .wrap { 
//     grid-template-columns:1fr; 
//     padding:10px; 
//   } 
// }

// .graph-card { 
//   border:1px solid #182033; 
//   border-radius:18px; 
//   overflow:hidden; 
//   background:radial-gradient(1200px 400px at 20% 0%, #0F1322 0%, #0A0D14 60%); 
// }

// .graph-title { 
//   display:flex; 
//   align-items:center; 
//   justify-content:space-between; 
//   padding:14px 16px; 
//   border-bottom:1px solid #161B26; 
// }

// .graph-title .mult { 
//   font-size:30px; 
//   font-weight:900; 
//   color:#E5FF8A; 
//   text-shadow:0 0 18px #E5FF8A44; 
// }

// .graph-title .muted { 
//   color:#92A1C5; 
// }

// .graph-title .pulse { 
//   color:#9AE6FF; 
//   animation:pulse 1.4s ease-in-out infinite; 
// }

// .graph-title .bad { 
//   color:#FF7D8C; 
// }

// .graph-title .good { 
//   color:#B7F7BD; 
// }

// @keyframes pulse { 
//   0%{opacity:.6} 
//   50%{opacity:1} 
//   100%{opacity:.6} 
// }

// .graph-area { 
//   position:relative; 
//   height:600px; 
// }

// @media (max-width:600px){ 
//   .graph-area { 
//     height:360px; 
//   } 
// }

// /* Background Lottie layer matches foreground exactly */
// .bg-lottie {
//   position:absolute;
//   inset:0;
//   z-index:0;
//   pointer-events:none;
// }
// .bg-lottie > svg, .bg-lottie > canvas {
//   width:100% !important;
//   height:100% !important;
//   display:block;
// }

// /* NEW: intermediate overlay Lottie – covers everything during countdown */
// .inter-lottie {
//   position:absolute;
//   inset:0;
//   z-index:2;
//   pointer-events:none;
//   transition:opacity .2s ease;
// }
// .inter-lottie > svg, .inter-lottie > canvas {
//   width:100% !important;
//   height:100% !important;
//   display:block;
// }

// /* Foreground Girl1 Lottie fills the graph area; hidden only when not running and crash segment has finished */
// .lottie-only { 
//   position:absolute; 
//   inset:0; 
//   z-index:1; 
//   pointer-events:none; 
// }
// .lottie-only > svg, .lottie-only > canvas {
//   width:100% !important;
//   height:100% !important;
//   display:block;
// }

// /* Top-left HUD for the live multiplier over the Lottie area — a bit larger */
// .mult-hud{
//   position:absolute;
//   left:12px;
//   top:12px;
//   z-index:3;
//   padding:8px 14px;
//   border-radius:12px;
//   border:1px solid transparent;
//   background: transparent;
//   backdrop-filter: none;
//   font-weight:900;
//   font-size:30px;
//   color:#E5FF8A;
//   text-shadow:0 0 12px rgba(229,255,138,.45);
//   pointer-events:none;
// }

// .fg-svg { 
//   position:absolute; 
//   inset:0; 
//   z-index:1; 
// }

// .grid-line { 
//   display:none; 
// } /* hide the repeating boxes grid */

// .frame { 
//   fill:transparent; 
//   stroke:#22304A; 
//   stroke-width:1.2; 
// }

// .trail { 
//   fill:none; 
//   stroke-width:3.2; 
//   stroke:url(#glow); 
//   stroke-linecap:round; 
//   stroke-linejoin:round;
//   filter: drop-shadow(0 0 6px rgba(124,58,237,.5)); 
// }

// .plane { 
//   transform-origin: 0 0; 
// } /* rotate around NOSE */

// .seeds { 
//   display:grid; 
//   grid-template-columns:1fr 1fr 1fr; 
//   gap:12px; 
//   padding:12px 16px; 
//   border-top:1px solid #161B26; 
//   font-size:12px; 
//   color:#98A6C8; 
// }

// @media (max-width:600px){ 
//   .seeds { 
//     grid-template-columns:1fr; 
//   } 
// }

// .seeds label { 
//   font-size:11px; 
//   opacity:.8; 
//   margin-bottom:4px; 
//   display:block; 
// }

// .seeds code { 
//   display:block; 
//   padding:6px 8px; 
//   border:1px dashed #22304A; 
//   border-radius:8px; 
//   color:#C7D2FE; 
//   overflow:hidden; 
//   text-overflow:ellipsis; 
//   white-space:nowrap; 
// }

// .errorline { 
//   color:#FF8A98; 
//   padding:10px 16px; 
//   border-top:1px solid #2A1520; 
//   background:#140D11; 
// }

// /* === Bet UI (screenshot style) === */
// .panel { 
//   display:flex; 
//   flex-direction:column; 
//   gap:13px; 
// }

// .card { 
//   border:1px solid #182033; 
//   border-radius:18px; 
//   padding:10px;
//   background:radial-gradient(800px 300px at 20% -40%, #10162A 0%, #0A0D14 60%); 
// }

// .row { 
//   display:grid; 
//   gap:8px; 
//   margin-bottom:12px; 
// }

// .row label { 
//   font-size:13px; 
//   color:#A8B3C9; 
// }

// .row.actions { 
//   margin-top:10px; 
// }

// .bet-ui { 
//   display:grid; 
//   grid-template-columns: 1fr 220px; 
//   gap:16px; 
//   align-items:stretch; 
// }

// @media (max-width:600px){ 
//   .bet-ui { 
//     grid-template-columns:1fr; 
//     gap:10px; 
//   } 
// }

// .bet-left { 
//   display:flex; 
//   flex-direction:column; 
//   gap:8px; 
// }

// .amount-wrap {
//   display: flex;
//   justify-content: space-between; 
//   align-items: center;
//   background: #2A2E35;
//   border: 1px solid #22304A;
//   border-radius: 16px;
//   padding: 12px 14px;
// }

// @media (max-width:600px){ 
//   .amount-wrap { 
//     grid-template-columns: 1fr 56px 1fr; 
//     padding:10px 12px; 
//   } 
// }

// .amount-input { 
//   width:100%; 
//   background:transparent; 
//   border:0; 
//   color:#E8EEFB; 
//   font-weight:800; 
//   font-size:18px; 
//   outline:none; 
//   text-align: center;
//   letter-spacing:.2px; 
// }

// @media (max-width:600px){ 
//   .amount-input { 
//     font-size:16px; 
//   } 
// }

// .unit { 
//   align-self:center; 
//   justify-self:end; 
//   color:#9AA6BD; 
//   font-weight:700; 
//   opacity:.85; 
// }

// .stepper { 
//   position:absolute; 
//   right:10px; 
//   top:50%; 
//   transform:translateY(-50%); 
//   display:flex; 
//   gap:12px; 
// }

// .step { 
//   width:36px; 
//   height:36px; 
//   border-radius:12px; 
//   border:1px solid #394355; 
//   background:#1C222C; 
//   color:#D5DEEF; 
//   font-size:18px; 
//   font-weight:900; 
//   line-height:1;
//   display:flex; 
//   align-items:center; 
//   justify-content:center; 
//   cursor:pointer; 
// }

// .step:hover { 
//   background:#242C38; 
// }

// @media (max-width:600px){ 
//   .step { 
//   width:32px; 
//   height:32px; 
//   } 
// }

// .quick-row { 
//   display:grid; 
//   grid-template-columns: 1fr 1fr; 
//   gap:12px; 
// }

// .quick { 
//   padding:12px 0; 
//   border-radius:14px; 
//   border:1px solid #22304A; 
//   background:#1B2029; 
//   color:#C7D2FE; 
//   font-weight:700; 
// }

// .quick:hover { 
//   background:#222938; 
// }

// .balance-line { 
//   font-size:12px; 
//   color:#9AA6BD; 
// }

// .bet-right { 
//   display:flex; 
// }

// .bet-cta { 
//   width:100%; 
//   height:60px; 
//   border-radius:20px; 
//   border:none; 
//   cursor:pointer; 
//   font-weight:900; 
//   font-size:22px; 
//   color:#fff;
//   background:#0B75FF; 
//   box-shadow:0 8px 20px rgba(11,117,255,.35), inset 0 0 0 1px rgba(255,255,255,.1); 
//   transition:transform .06s ease, filter .2s; 
// }

// .bet-cta:hover { 
//   filter:brightness(1.06); 
// }

// .bet-cta:active { 
//   transform:translateY(1px); 
// }

// .bet-cta.disabled { 
//   opacity:.45; 
//   cursor:not-allowed; 
// }

// @media (max-width:600px){ 
//   .bet-cta { 
//     height:72px; 
//     font-size:20px; 
//   } 
// }

// .chev { 
//   margin-left:8px; 
//   opacity:.9; 
//   text-shadow:0 1px 0 rgba(255,255,255,.35); 
// }

// .history-title { 
//   font-size:13px; 
//   color:#A8B3C9; 
//   margin-bottom:8px; 
// }

// .history { 
//   display:flex; 
//   flex-wrap:wrap; 
//   gap:8px; 
// }

// .chip { 
//   border-radius:9999px; 
//   padding:6px 10px; 
//   font-weight:800; 
//   font-size:12px; 
//   border:1px solid #23314B; 
//   background:#0B1018; 
// }

// .chip.low { 
//   color:#FF9EA8; 
// } 

// .chip.mid { 
//   color:#FFD28A; 
// } 

// .chip.high { 
//   color:#B7F7BD; 
// }

// .backBtn{
//   display:flex; 
//   align-items:center; 
//   justify-content:center;
//   width:36px; 
//   height:36px; 
//   margin-right:8px;
//   border-radius:10px; 
//   border:1px solid #22304A;
//   background:#131826; 
//   color:#C7D2FE; 
//   cursor:pointer;
//   transition:filter .15s ease, background .15s ease;
// }

// .backBtn:hover{ 
//   background:#1A2030; 
//   filter:brightness(1.05); 
// }

// .backBtn:active{ 
//   transform:translateY(1px); 
// }

// .backBtn svg{ 
//   display:block; 
// }

// .tip { 
//   font-size:12px; 
//   color:#9AA6BD; 
// }

// @media (max-width:600px){ 
//   .graph-title .mult { 
//     font-size:24px; 
//   } 
// }

//  .crash-label {
//    fill:#FFCBD3; 
//    font-size:12px; 
//    font-weight:700; 
//    paint-order: stroke; 
//    stroke: rgba(0,0,0,.5);
//    stroke-width: 2px;
// }
//    +/* Pretty toast – small, eye-catching, matches your glassy look */
// .toast {
//   position:absolute;
//   right:16px;
//   top:16px;
//   padding:10px 14px;
//   border-radius:12px;
//   font-weight:800;
//   letter-spacing:.2px;
//   backdrop-filter: blur(6px);
//   background: radial-gradient(120px 40px at 20% 0%, rgba(31,41,72,.9) 0%, rgba(10,13,20,.85) 70%);
//   box-shadow:0 8px 24px rgba(0,0,0,.35), inset 0 0 0 1px rgba(255,255,255,.06);
//   border:1px solid #22304A;
//   z-index: 4;
// }
// .toast.bad { color:#FFB3BC; }
// .toast.good { color:#B7F7BD; }
// .toast.info { color:#9AE6FF; }

// .crash-main {
//   fill:#ffffffdd;
//   font-size:56px;   
//   font-weight:900;
//   filter:url(#softGlow);
// }

// .backBtn:disabled{
//   opacity:.5;
//   cursor:not-allowed;
// }

// /* NEW: FULLSCREEN LOADING ANIMATION (covers everything on first load) */
// .loading-screen{
//   position:fixed;
//   inset:0;
//   background:#080A0F;
//   z-index:9999;
//   display:flex;
//   justify-content:center;
//   align-items:center;
// }

// .loading-lottie > svg,
// .loading-lottie > canvas{
//   width:280px !important;
//   height:280px !important;
//   display:block;
// }

// /* FULLSCREEN LOADING ANIMATION – fully responsive on mobile & desktop */
// .loading-screen{
//   position:fixed;
//   inset:0;
//   width:100vw;
//   height:100vh;
//   background:#080A0F;
//   z-index:9999;
//   display:flex;
//   justify-content:center;
//   align-items:center;
// }

// /* Lottie scales with viewport, but keeps decent size on desktop */
// .loading-lottie > svg,
// .loading-lottie > canvas{
//   width: min(320px, 80vw) !important;
//   height: auto !important;
//   max-height:80vh !important;
//   display:block;
// }

//       `}</style>
//     </div>
//   );
// }

// /************ stub TopBar (assumed present in your project) ************/
// function TopBar({ balance }) {
//   const [usedBack, setUsedBack] = React.useState(false);

//   const goBackOnce = () => {
//     if (usedBack) return;
//     setUsedBack(true);
//     if (window.history.length > 1) {
//       window.history.back();
//     } else {
//       // Optional fallback: do nothing or route home if you have a router
//       // window.location.href = '/';
//     }
//   };

//   return (
//     <div className="topbar">
//       <div className="brand">
//         <button
//           className="backBtn"
//           onClick={goBackOnce}
//           disabled={usedBack}
//           aria-label="Back"
//           title="Back"
//         >
//           <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
//             <path
//               d="M15 6l-6 6 6 6"
//               stroke="currentColor"
//               strokeWidth="2"
//               strokeLinecap="round"
//               strokeLinejoin="round"
//             />
//           </svg>
//         </button>
//         <div className="logo">✈️ Crash</div>
//       </div>
//       <div className="wallet">Balance: {fmt(balance)}</div>
//     </div>
//   );
// }





// Crash.jsx — rounds with 5s bet window, manual cashout, Lottie-driven flight/crash.

import React, { useEffect, useRef, useState } from "react";
import { games, getBalance, telegramAuth, crashJoin, crashCashout } from "../api";

import lottie from "lottie-web";
// ⬇️ Keep these paths pointing to your actual files
import girlAnim from "../assets/lottie/Girl1.json";
import bgAnim from "../assets/lottie/Girl_background.json";
// ⬇️ NEW: intermediate overlay animation (5s between rounds)
import interAnim from "../assets/lottie/Intermediate_animation.json";
// ⬇️ NEW: loading screen animation (plays once when user first opens this screen)
import loadingAnim from "../assets/lottie/Loading_screen1.json";

/************ utils ************/
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const round2 = (x) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : 0);
const fmt = (n, dp = 2) =>
  Number(n).toLocaleString(undefined, {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });

/************ main ************/
export default function Crash() {
  // wallet
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // inputs
  const [bet, setBet] = useState(1);

  // round machine: countdown -> running -> crashed/cashed -> countdown...
  const [phase, setPhase] = useState("countdown"); // countdown|running|crashed|cashed
  const [countdown, setCountdown] = useState(5); // seconds left to place bet
  const [inBet, setInBet] = useState(false); // did user join this round?
  const [lockedBet, setLockedBet] = useState(0); // frozen stake for current round

  const [startAtMs, setStartAtMs] = useState(null); // server start time for joined round
  const localCountdownEndRef = useRef(null);

  // outcome
  const [history, setHistory] = useState([]);
  const [details, setDetails] = useState(null);

  const [cashoutAt, setCashoutAt] = useState(null);
  const [roundId, setRoundId] = useState(null);
  const [bustPoint, setBustPoint] = useState(0); // crash multiplier
  const serverSettledRef = useRef(false); // prevent client-side double credit

  // animation refs
  const rafRef = useRef(0);
  const startTsRef = useRef(0);
  const growthRateRef = useRef(0.22); // m(t) = exp(r t)
  const tEndRef = useRef(5);

  // live frame state
  const [mult, setMult] = useState(1);
  const [tNow, setTNow] = useState(0);

  // Lottie (Girl1 handles rocket): idle → high-fly → straight crash
  const lottieWrapRef = useRef(null);
  const lottieAnimRef = useRef(null);

  // Background Lottie (exact same size as Girl1 container)
  const bgWrapRef = useRef(null);
  const bgLottieRef = useRef(null);

  // NEW: intermediate overlay Lottie (between rounds)
  const interWrapRef = useRef(null);
  const interLottieRef = useRef(null);

  // NEW: loading-screen Lottie (plays once on first visit)
  const loadingWrapRef = useRef(null);
  const loadingLottieRef = useRef(null);
  const [firstLoad, setFirstLoad] = useState(true);

  // track when the crash segment is actively playing so we only hide
  // the girl AFTER that segment fully completes (no early disappear).
  const [crashPlaying, setCrashPlaying] = useState(false);

  // track if we've switched into the "≥5x" 18-second animation phase
  const highMultStartedRef = useRef(false);

  // Segment map (frames).
  // FLY_LOW: used from start until ~5x
  // FLY_HIGH: special ~18s sub-animation used once multiplier passes 5x
  const SEG = useRef({
    IDLE: [0, 120],
    FLY_LOW: [10, 2200],
    FLY_HIGH: [2200, 3280],        // ~18s slice used after 5x
    CRASH_STRAIGHT: [3300, 3600],  // straight + disappear only
  });

  // Background segments: ORANGE/YELLOW until ~18s, then PURPLE.
  const BG_SEG = useRef({
    ORANGE: [0, 1080],    // pre-purple phase (0–18s at 60fps)
    PURPLE: [1080, 3600], // purple phase (from 18s onward)
  });

  // pretty toast for errors like "already-crashed"
  const [toast, setToast] = useState(null); // { text:string, kind:'good'|'bad'|'info' }
  const flashToast = (text, kind = "bad", ms = 1300) => {
    setToast({ text, kind });
    setTimeout(() => setToast(null), ms);
  };

  // Foreground (Girl1) Lottie init
  useEffect(() => {
    if (!lottieWrapRef.current) return;
    const anim = lottie.loadAnimation({
      container: lottieWrapRef.current,
      renderer: "svg",
      loop: false,
      autoplay: false,
      animationData: girlAnim,
      rendererSettings: {
        preserveAspectRatio: "xMidYMid slice",
        progressiveLoad: true,
      },
    });
    // default: don't loop segments; we control loop only when needed
    anim.loop = false;
    lottieAnimRef.current = anim;
    anim.goToAndStop(SEG.current.IDLE[0], true);
    return () => anim?.destroy();
  }, []);

  // Background Lottie init — always shown, exact same height/width as Girl1 area
  useEffect(() => {
    if (!bgWrapRef.current) return;
    const anim = lottie.loadAnimation({
      container: bgWrapRef.current,
      renderer: "svg",
      loop: false,
      autoplay: false,
      animationData: bgAnim,
      rendererSettings: {
        preserveAspectRatio: "xMidYMid slice",
        progressiveLoad: true,
      },
    });
    bgLottieRef.current = anim;

    // Start in orange/yellow phase
    anim.goToAndStop(BG_SEG.current.ORANGE[0], true);
    // loop orange segment until we explicitly switch to purple
    const seg = BG_SEG.current.ORANGE;
    anim.loop = true;
    anim.playSegments([seg[0], seg[1]], true);

    return () => anim?.destroy();
  }, []);

  // NEW: Intermediate overlay Lottie init
  useEffect(() => {
    if (!interWrapRef.current) return;
    const anim = lottie.loadAnimation({
      container: interWrapRef.current,
      renderer: "svg",
      loop: true,
      autoplay: false, // we'll control when it plays
      animationData: interAnim,
      rendererSettings: {
        preserveAspectRatio: "xMidYMid slice",
        progressiveLoad: true,
      },
    });
    interLottieRef.current = anim;
    return () => anim?.destroy();
  }, []);

  // NEW: control intermediate overlay playback based on phase
  useEffect(() => {
    const anim = interLottieRef.current;
    if (!anim) return;
    if (phase === "countdown") {
      // whenever we enter countdown, restart the overlay from the beginning
      anim.goToAndPlay(0, true);
    } else {
      // stop overlay when flight is running or after crash/cashout
      anim.stop();
    }
  }, [phase]);

  // NEW: Loading-screen Lottie init (plays once on first load)
  useEffect(() => {
    if (!loadingWrapRef.current) return;
    const anim = lottie.loadAnimation({
      container: loadingWrapRef.current,
      renderer: "svg",
      loop: false,
      autoplay: true,
      animationData: loadingAnim,
      rendererSettings: {
        preserveAspectRatio: "xMidYMid slice",
        progressiveLoad: true,
      },
    });
    loadingLottieRef.current = anim;

    // when loading animation completes -> hide forever
    const handleComplete = () => {
      setFirstLoad(false);
    };
    anim.addEventListener("complete", handleComplete);

    return () => {
      anim.removeEventListener("complete", handleComplete);
      anim?.destroy();
    };
  }, []);

  /************ auth + balance polling (unchanged) ************/
  useEffect(() => {
    let stopPolling = () => {};
    (async () => {
      try {
        const u = await telegramAuth();
        if (Number.isFinite(Number(u?.coins))) {
          setBalance((p) => {
            const v = Number(u.coins);
            setErr("");
            return v !== p ? v : p;
          });
        }
        try {
          const c = await getBalance();
          if (Number.isFinite(c)) {
            setBalance((p) => (c !== p ? c : p));
            setErr("");
          }
        } catch {}
        stopPolling = (() => {
          let alive = true;
          (function tick() {
            setTimeout(async () => {
              if (!alive) return;
              try {
                const c = await getBalance();
                if (Number.isFinite(c)) {
                  setBalance((p) => (c !== p ? c : p));
                  setErr("");
                }
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
        console.error("telegramAuth failed:", e);
      }
    })();
    return () => {
      stopPolling?.();
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const bal = await getBalance();
        setBalance(round2(bal));
        setErr("");
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
      if (Number.isFinite(bal)) {
        setBalance(round2(bal));
        setErr("");
      }
    } catch {}
  }

  /************ round engine ************/
  const resetRoundVisuals = () => {
    setMult(1);
    setTNow(0);
    setCashoutAt(null);
    setBustPoint(0);
    setDetails(null);
    setCrashPlaying(false);
    highMultStartedRef.current = false;
    serverSettledRef.current = false;

    // reset background to orange/yellow for the new round
    const seg = BG_SEG.current.ORANGE;
    const bgAnimInst = bgLottieRef.current;
    if (bgAnimInst) {
      bgAnimInst.loop = true;
      bgAnimInst.playSegments([seg[0], seg[1]], true);
    }
  };

  // Heavy-tailed sim for spectators
  const randomCrash = () => {
    const u = Math.random();
    const x = 1 / (1 - u);
    return clamp(x, 1.02, 50);
  };

  // Lottie helpers
  const playSegment = (range, forceBegin = true) => {
    const anim = lottieAnimRef.current;
    if (!anim) return;
    anim.playSegments([range[0], range[1]], forceBegin);
  };
  const goToFrame = (f) => lottieAnimRef.current?.goToAndStop(f, true);
  const pause = () => lottieAnimRef.current?.pause();

  const playBgSegment = (range, forceBegin = true, loop = true) => {
    const anim = bgLottieRef.current;
    if (!anim) return;
    anim.loop = loop;
    anim.playSegments([range[0], range[1]], forceBegin);
  };

  // Start the flight (after countdown hits 0)
  const startFlight = async () => {
    resetRoundVisuals();
    setPhase("running");

    // Use backend-provided crashAt if joined; otherwise simulate
    const crashAt =
      inBet && Number.isFinite(bustPoint) && bustPoint > 1.01 ? bustPoint : randomCrash();
    setBustPoint(crashAt);

    // Kick Lottie into the "low" flight segment initially
    const anim = lottieAnimRef.current;
    if (anim) anim.loop = false; // low segment just plays forward
    playSegment(SEG.current.FLY_LOW, true);

    // Animate until crash or cashout
    const r = growthRateRef.current;
    const tCrash = Math.log(Math.max(crashAt, 1.0001)) / r; // seconds to reach crash multiplier
    tEndRef.current = Math.max(0.25, tCrash);
    beginAnimation();
  };

  const beginAnimation = () => {
    cancelAnimationFrame(rafRef.current);
    startTsRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
  };

  function tick(ts) {
    const r = growthRateRef.current;
    const elapsed = (ts - startTsRef.current) / 1000;
    const tEnd = tEndRef.current;

    // === CRASH MOMENT ===
    if (elapsed >= tEnd - 1e-6) {
      if (bustPoint && Number.isFinite(bustPoint)) {
        setTNow(tEnd);
        setMult(bustPoint);
      }

      // On crash: play ONLY the straight-exit slice (3300..3600)
      const anim = lottieAnimRef.current;
      if (anim) {
        anim.loop = false; // crash segment should not loop
        setCrashPlaying(true);
        const onComplete = () => {
          setCrashPlaying(false);
          anim.removeEventListener("complete", onComplete);
        };
        anim.removeEventListener("complete", onComplete);
        anim.addEventListener("complete", onComplete);
      }
      playSegment(SEG.current.CRASH_STRAIGHT, true);

      endRound("crashed");
      return;
    }

    // === NORMAL FLIGHT FRAME ===
    const tClamped = clamp(elapsed, 0, tEnd);
    const m = Math.exp(r * tClamped);

    setTNow(tClamped);
    setMult(m);

    // 🚀 When multiplier crosses 5x → switch to the special 18s HIGH_FLY animation
    if (!highMultStartedRef.current && m >= 5) {
      highMultStartedRef.current = true;
      const anim = lottieAnimRef.current;
      if (anim) {
        anim.loop = true; // keep that 18s section running smoothly until crash
        playSegment(SEG.current.FLY_HIGH, true);
      }
      // sync background to purple exactly when Girl1 enters purple/high phase
      playBgSegment(BG_SEG.current.PURPLE, true, true);
    }

    // === CASHOUT ===
    if (phase === "running" && cashoutAt != null) {
      // freeze animation on current flight frame
      pause();
      endRound("cashed");
      return;
    }

    rafRef.current = requestAnimationFrame(tick);
  }

  function endRound(kind) {
    cancelAnimationFrame(rafRef.current);
    if (kind === "crashed") {
      if (bustPoint && Number.isFinite(bustPoint)) {
        setMult(bustPoint);
        setTNow(tEndRef.current || 0);
      }
      setPhase("crashed");
      setHistory((h) => [round2(bustPoint), ...h].slice(0, 14));
    } else {
      setPhase("cashed");
      setHistory((h) => [round2(cashoutAt), ...h].slice(0, 14));
      refreshBalanceSoft();
    }

    // Schedule next round’s countdown
    setTimeout(() => {
      setInBet(false);
      setLockedBet(0);
      setCashoutAt(null);
      setStartAtMs(null);
      localCountdownEndRef.current = null;
      resetRoundVisuals();
      setCountdown(5);
      setPhase("countdown");
      // return to idle pose
      goToFrame(SEG.current.IDLE[0]);
    }, 800);
  }

  // Countdown loop
  useEffect(() => {
    if (phase !== "countdown") return;
    setCashoutAt(null);
    setBustPoint(0);
    let id = 0;

    if (!startAtMs) {
      localCountdownEndRef.current = Date.now() + 5000;
    }

    const step = () => {
      const now = Date.now();
      const target = startAtMs ?? localCountdownEndRef.current ?? now;
      const leftMs = Math.max(0, target - now);
      setCountdown((prev) => Math.min(prev ?? 999, Math.ceil(leftMs / 1000)));
      if (leftMs <= 0) {
        startFlight();
      } else {
        id = requestAnimationFrame(step);
      }
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, startAtMs]);

  // Place bet during countdown
  const placeBet = async () => {
    if (phase !== "countdown" || inBet) return;
    const stake = Math.max(1, Math.floor(Number(bet || 0)));
    if (!Number.isFinite(stake) || stake < 1) return alert("Enter a valid bet amount.");

    try {
      const resp = await crashJoin(stake);
      if (Number.isFinite(Number(resp?.newBalance))) setBalance(Number(resp.newBalance));
      setLockedBet(stake);
      setRoundId(resp.roundId);
      setBustPoint(Number(resp.crashAt) || 0);
      if (Number.isFinite(Number(resp?.startAt))) {
        const srv = Number(resp.startAt);
        setStartAtMs((prev) => (prev ? Math.min(prev, srv) : srv));
      }
      setInBet(true);
    } catch (e) {
      alert(e.message || "Join failed");
    }
  };

  // Cash out during flight (server-settled)
  const cashoutNow = async () => {
    if (phase !== "running" || !inBet || cashoutAt != null) return;
    if (startAtMs && Date.now() < startAtMs) return; // not started yet on server

    const x = round2(mult);
    try {
      const resp = await crashCashout({ roundId, x });
      if (resp?.ok) {
        serverSettledRef.current = true;
        setCashoutAt(x);
        if (Number.isFinite(Number(resp?.newBalance))) {
          setBalance(Number(resp.newBalance));
        } else {
          refreshBalanceSoft();
        }
        pause(); // pause at current flight frame
      } else {
        const code = resp?.error || "";
        if (code === "already-crashed" || code === "too-late") {
          flashToast("Already crashed!", "bad");
          playSegment(SEG.current.CRASH_STRAIGHT, true);
          endRound("crashed");
          return;
        }
        alert(code || "Cashout failed");
      }
    } catch (e) {
      console.warn("cashout error", e);
      alert(e?.message || "Cashout error");
    }
  };

  /************ derived ************/
  const running = phase === "running";
  const crashed = phase === "crashed";
  const cashed = phase === "cashed";

  const canPlaceBet = phase === "countdown" && !inBet && !loading && bet >= 1;
  const canCashout = phase === "running" && inBet && cashoutAt == null;

  /************ render ************/
  // Keep Girl visible while either RUNNING or while CRASH segment is still playing.
  const showGirl = running || crashPlaying;
  const showIntermediate = phase === "countdown"; // overlay between rounds
  // hide multipliers during countdown
  const showMult = phase !== "countdown";

  return (
    <div className="crash-root">
      {/* FULLSCREEN LOADING SCREEN — shows ONLY on first entry */}
     {firstLoad && (
  <div className="loading-screen">
    <div className="loading-lottie" ref={loadingWrapRef} />
  </div>
)}


      <TopBar balance={balance} />

      <div className="wrap">
        {/* GRAPH (now: LOTTIE-ONLY AREA) */}
        <div className="graph-card">
          {/* <div className="graph-title">
            <div className="status">
              {loading && <span className="muted">Loading…</span>}
              {!loading && phase === "countdown" && (
                <span className="muted">Place your bet — round starts in {countdown}s</span>
              )}
              {running && <span className="pulse">In flight…</span>}
              {crashed && <span className="bad">Busted at {fmt(bustPoint)}×</span>}
              {cashed && <span className="good">Cashed at {fmt(cashoutAt)}×</span>}
            </div>
            {showMult && <div className="mult">{fmt(mult)}×</div>}
          </div> */}

          <div className="graph-area">
            {/* Background Lottie: exact same size as foreground */}
            <div className="bg-lottie" ref={bgWrapRef} aria-hidden="true" />

            {/* NEW: Intermediate overlay, covers full area during countdown */}
            <div
              className="inter-lottie"
              ref={interWrapRef}
              aria-hidden="true"
              style={{ opacity: showIntermediate ? 1 : 0 }}
            />

            {/* Top-left multiplier HUD over the Lottie area (larger) */}
            {showMult && <div className="mult-hud">{fmt(mult)}×</div>}

            {/* Foreground Girl1 Lottie — hides ONLY after crash segment fully finishes */}
            <div
              className="lottie-only"
              ref={lottieWrapRef}
              aria-label="Flight animation"
              style={{ visibility: showGirl ? "visible" : "hidden" }}
            />

            {toast && <div className={`toast ${toast.kind}`}>{toast.text}</div>}
          </div>
        </div>

        {/* CONTROLS */}
        <div className="panel">
          <div className="card">
            <div className="bet-ui">
              <div className="bet-left">
                <div className="amount-wrap">
                  <button
                    className="step minus"
                    onClick={() => setBet((b) => Math.max(1, b - 1))}
                    disabled={phase !== "countdown" || inBet}
                  >
                    −
                  </button>

                  <input
                    className="amount-input"
                    type="number"
                    min={1}
                    step="1"
                    value={inBet ? lockedBet : bet}
                    disabled={phase !== "countdown" || inBet}
                    onChange={(e) => setBet(Math.max(1, Math.floor(Number(e.target.value || 0))))}
                  />

                  <button
                    className="step plus"
                    onClick={() => setBet((b) => b + 1)}
                    disabled={phase !== "countdown" || inBet}
                  >
                    +
                  </button>
                </div>

                <div className="quick-row">
                  <button
                    className="quick"
                    disabled={phase !== "countdown" || inBet}
                    onClick={() => setBet((b) => Math.max(1, Math.floor(b / 2)))}
                  >
                    /2
                  </button>
                  <button
                    className="quick"
                    disabled={phase !== "countdown" || inBet}
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
                {phase === "countdown" && !inBet && (
                  <button
                    className={`bet-cta ${!canPlaceBet ? "disabled" : ""}`}
                    disabled={!canPlaceBet}
                    onClick={placeBet}
                  >
                    Place Bet
                  </button>
                )}
                {phase === "countdown" && inBet && (
                  <button className="bet-cta disabled" disabled>
                    Joined (starts in {countdown}s)
                  </button>
                )}
                {running && (
                  <button
                    className={`bet-cta ${!canCashout ? "disabled" : ""}`}
                    disabled={!canCashout}
                    onClick={cashoutNow}
                  >
                    Cash Out @ {fmt(mult)}×
                  </button>
                )}
                {(crashed || cashed) && (
                  <button className="bet-cta disabled" disabled>
                    Next round in 5s…
                  </button>
                )}
              </div>
            </div>

            {(crashed || cashed) && (
              <div className={`round-result ${crashed ? "bad" : "good"}`}>
                {crashed ? (
                  <>
                    Busted at <b>{fmt(bustPoint)}×</b>.
                    {!inBet ? " You didn’t join this round." : " Your stake was lost."}
                  </>
                ) : (
                  <>
                    Cashed at <b>{fmt(cashoutAt)}×</b>. Payout credited.
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Minimal CSS additions that your existing `css` string may not have */}
      <style>{`
        .countdown-main { fill:#ffffffdd; font-size:80px; font-weight:900; filter:url(#softGlow); }
        .countdown-sub { fill:#ffffff99; font-size:20px; font-weight:600; }
        .bet-cta.disabled { opacity:0.6; cursor:not-allowed; }

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
  height:600px; 
}

@media (max-width:600px){ 
  .graph-area { 
    height:360px; 
  } 
}

/* Background Lottie layer matches foreground exactly */
.bg-lottie {
  position:absolute;
  inset:0;
  z-index:0;
  pointer-events:none;
}
.bg-lottie > svg, .bg-lottie > canvas {
  width:100% !important;
  height:100% !important;
  display:block;
}

/* NEW: intermediate overlay Lottie – covers everything during countdown */
.inter-lottie {
  position:absolute;
  inset:0;
  z-index:2;
  pointer-events:none;
  transition:opacity .2s ease;
}
.inter-lottie > svg, .inter-lottie > canvas {
  width:100% !important;
  height:100% !important;
  display:block;
}

/* Foreground Girl1 Lottie fills the graph area; hidden only when not running and crash segment has finished */
.lottie-only { 
  position:absolute; 
  inset:0; 
  z-index:1; 
  pointer-events:none; 
}
.lottie-only > svg, .lottie-only > canvas {
  width:100% !important;
  height:100% !important;
  display:block;
}

/* Top-left HUD for the live multiplier over the Lottie area — a bit larger */
.mult-hud{
  position:absolute;
  left:12px;
  top:12px;
  z-index:3;
  padding:8px 14px;
  border-radius:12px;
  border:1px solid transparent;
  background: transparent;
  backdrop-filter: none;
  font-weight:900;
  font-size:30px;
  color:#E5FF8A;
  text-shadow:0 0 12px rgba(229,255,138,.45);
  pointer-events:none;
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
    grid-template-columns:1fr; 
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
  justify-content: space-between; 
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

 .crash-label {
   fill:#FFCBD3; 
   font-size:12px; 
   font-weight:700; 
   paint-order: stroke; 
   stroke: rgba(0,0,0,.5);
   stroke-width: 2px;
}
   +/* Pretty toast – small, eye-catching, matches your glassy look */
.toast {
  position:absolute;
  right:16px;
  top:16px;
  padding:10px 14px;
  border-radius:12px;
  font-weight:800;
  letter-spacing:.2px;
  backdrop-filter: blur(6px);
  background: radial-gradient(120px 40px at 20% 0%, rgba(31,41,72,.9) 0%, rgba(10,13,20,.85) 70%);
  box-shadow:0 8px 24px rgba(0,0,0,.35), inset 0 0 0 1px rgba(255,255,255,.06);
  border:1px solid #22304A;
  z-index: 4;
}
.toast.bad { color:#FFB3BC; }
.toast.good { color:#B7F7BD; }
.toast.info { color:#9AE6FF; }

.crash-main {
  fill:#ffffffdd;
  font-size:56px;   
  font-weight:900;
  filter:url(#softGlow);
}

.backBtn:disabled{
  opacity:.5;
  cursor:not-allowed;
}

/* NEW: FULLSCREEN LOADING ANIMATION (covers everything on first load) */
.loading-screen{
  position:fixed;
  inset:0;
  background:#080A0F;
  z-index:9999;
  display:flex;
  justify-content:center;
  align-items:center;
}

.loading-lottie > svg,
.loading-lottie > canvas{
  width:280px !important;
  height:280px !important;
  display:block;
}

/* FULLSCREEN LOADING ANIMATION – fully responsive on mobile & desktop */
.loading-screen {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  background: #080A0F;
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* Lottie scales with viewport, but keeps decent size on desktop */
.loading-lottie > svg,
.loading-lottie > canvas {
  width: min(320px, 80vw) !important;
  height: auto !important;
  max-height: 80vh !important;
  display: block;
}

/* ✅ On MOBILE: make the loading Lottie fill full screen */
@media (max-width: 600px) {
  .loading-lottie > svg,
  .loading-lottie > canvas {
    width: 100vw !important;
    height: 100vh !important;
    max-height: 100vh !important;
  }
}

      `}</style>
    </div>
  );
}

/************ stub TopBar (assumed present in your project) ************/
function TopBar({ balance }) {
  const [usedBack, setUsedBack] = React.useState(false);

  const goBackOnce = () => {
    if (usedBack) return;
    setUsedBack(true);
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // Optional fallback: do nothing or route home if you have a router
      // window.location.href = '/';
    }
  };

  return (
    <div className="topbar">
      <div className="brand">
        <button
          className="backBtn"
          onClick={goBackOnce}
          disabled={usedBack}
          aria-label="Back"
          title="Back"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M15 6l-6 6 6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div className="logo">✈️ Crash</div>
      </div>
      <div className="wallet">Balance: {fmt(balance)}</div>
    </div>
  );
}
