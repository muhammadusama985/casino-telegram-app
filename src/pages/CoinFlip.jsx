

// // src/pages/Coinflip.jsx
// import { useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from "react";
// import { telegramAuth, getBalance, games } from "../api";

// import flipSound from "../assets/diceRoll.mp3"; // reuse SFX
// import winSound from "../assets/win.mp3";
// import loseSound from "../assets/lose.mp3";

// // format helpers
// const fmt = (n) =>
//   Number(n).toLocaleString(undefined, {
//     minimumFractionDigits: 0,
//     maximumFractionDigits: 2,
//   });
// function formatCoins(v) {
//   const n = Number(v);
//   if (!Number.isFinite(n)) return "0";
//   return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
// }

// const STREAK_BOOST_PER_WIN = 0.05;   // UI-only boost per consecutive win (must match backend cfg)
// const BASE_PAYOUT_PCT       = 0.90;  // 90% profit baseline (must match backend cfg)
// const PAYOUT_CAP            = 1.0;   // cap profit at 100% of stake (must match backend cfg)
// const TRAIL_LEN             = 10;

// export default function Coinflip() {
//   // balance
//   const [coins, setCoins] = useState(0);

//   // game state
//   const [bet, setBet] = useState(1);
//   const [baseCoef, setBaseCoef] = useState(1.95); // default shown coef
//   const [streak, setStreak] = useState(0);
//   const [round, setRound] = useState(1);
//   const [trail, setTrail] = useState(Array(TRAIL_LEN).fill("?"));
//   const [flipping, setFlipping] = useState(false);
//   const [resultMsg, setResultMsg] = useState("");
//   const [face, setFace] = useState("H"); // H->$, T->€

//   // coin animation API ref
//   const coinApiRef = useRef(null);

//   // coefficient shown: base when no streak; boosted when streak > 0
//   const effectiveCoef = useMemo(
//     () => Number((baseCoef * (1 + STREAK_BOOST_PER_WIN * Math.max(0, streak))).toFixed(2)),
//     [baseCoef, streak]
//   );

//   // EFFECTIVE payout% that will be CREDITED on win (matches backend: 0.90 * (1 + 0.05*streak), capped)
//   const effectivePayoutPct = useMemo(() => {
//     const boosted = BASE_PAYOUT_PCT * (1 + STREAK_BOOST_PER_WIN * Math.max(0, streak));
//     return Math.min(PAYOUT_CAP, Math.max(0.01, Number(boosted)));
//   }, [streak]);

//   // “Take” bar shows the PROFIT (not total return)
//   const potentialProfit = useMemo(() => {
//     const stake = Math.max(0, Number(bet || 0));
//     return Math.floor((stake * effectivePayoutPct + Number.EPSILON) * 100) / 100;
//   }, [bet, effectivePayoutPct]);

//   /* ---------- balance bootstrap ---------- */
//   useEffect(() => {
//     let stopPolling = () => {};
//     (async () => {
//       try {
//         const u = await telegramAuth();
//         if (Number.isFinite(+u?.coins)) setCoins((c) => (+u.coins !== c ? +u.coins : c));
//         try {
//           const b = await getBalance();
//           if (Number.isFinite(b)) setCoins((c) => (b !== c ? b : c));
//         } catch {}
//         stopPolling = (() => {
//           let alive = true;
//           (function tick() {
//             setTimeout(async () => {
//               if (!alive) return;
//               try {
//                 const b = await getBalance();
//                 if (Number.isFinite(b)) setCoins((c) => (b !== c ? b : c));
//               } catch {} finally {
//                 if (alive) tick();
//               }
//             }, 4000);
//           })();
//           return () => { alive = false; };
//         })();
//       } catch (e) {
//         console.error("[Coinflip] telegramAuth failed:", e);
//       }
//     })();
//     return () => { stopPolling?.(); };
//   }, []);

//   useEffect(() => {
//     const refresh = async () => {
//       try {
//         const b = await getBalance();
//         if (Number.isFinite(b)) setCoins((c) => (b !== c ? b : c));
//       } catch {}
//     };
//     const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
//     window.addEventListener("balance:refresh", refresh);
//     document.addEventListener("visibilitychange", onVisible);
//     return () => {
//       window.removeEventListener("balance:refresh", refresh);
//       document.removeEventListener("visibilitychange", onVisible);
//     };
//   }, []);

//   /* ---------- actions ---------- */
//   const placeBet = async (side) => {
//     if (flipping) return;
//     const stake = Math.max(1, Math.floor(Number(bet || 0)));
//     if (!Number.isFinite(stake) || stake <= 0) return alert("Enter a valid bet (>= 1).");
//     if (Number(coins) < stake) return alert("Not enough coins.");

//     setFlipping(true);
//     setResultMsg("");

//     // 1) Start spin immediately (no message yet)
//     try { new Audio(flipSound).play().catch(() => {}); } catch {}
//     try { coinApiRef.current?.startWaiting(); } catch {}

//     try {
//       // 2) Ask backend
//       const res = await games.coinflip(stake, side === "H" ? "H" : "T", { streak });

//       // sync default coef from engine if provided (optional)
//       const m = Number(res?.details?.m);
//       if (Number.isFinite(m) && m > 0) setBaseCoef(m);

//       const landed = (res?.details?.landed === "T") ? "T" : "H";
//       setFace(landed); // update ARIA/semantics

//       // 3) Resolve the spin to the correct side, then show result/message
//       await (coinApiRef.current?.resolve(landed) ?? Promise.resolve());

//       if (Number.isFinite(res?.newBalance)) {
//         setCoins((prev) => (res.newBalance !== prev ? res.newBalance : prev));
//       }

//       setRound((r) => r + 1);

//       if (res?.result === "win") {
//         setTrail((prev) => [landed, ...prev].slice(0, TRAIL_LEN)); // fill bubble with result
//         setStreak((s) => s + 1);

//         const profit = Number(res?.payout || 0);
//         const msg = `🎉 You Win! +${fmt(profit)}`;
//         setResultMsg(msg);
//         try { new Audio(winSound).play().catch(() => {}); } catch {}
//         alert(msg);
//       } else {
//         setStreak(0);
//         setTrail(Array(TRAIL_LEN).fill("?"));

//         const msg = `❌ You Lose! -${fmt(stake)}`;
//         setResultMsg(msg);
//         try { new Audio(loseSound).play().catch(() => {}); } catch {}
//         alert(msg);
//       }

//       window.dispatchEvent(new Event("balance:refresh"));
//     } catch (e) {
//       // stop any waiting spin on error
//       try { coinApiRef.current?.stop(); } catch {}
//       const msg = String(e?.message || "");
//       if (msg.includes("insufficient-funds")) alert("Not enough coins.");
//       else if (msg.includes("min-stake")) alert("Bet is below minimum.");
//       else if (msg.includes("max-stake")) alert("Bet exceeds maximum.");
//       else alert("Bet failed. Try again.");
//     } finally {
//       setFlipping(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-[#0B1020] text-white flex flex-col items-stretch">
//       {/* Coins header (match Dice) */}
//    <div className="flex items-center justify-between px-4 py-3">
//   <div className="flex items-center gap-3">
//     <BackButtonInline to="/" />
//     <div className="text-sm">
//       <span className="opacity-70 mr-2">Coins: </span>
//       <span className="font-bold">{formatCoins(coins)}</span>
//     </div>
//   </div>
// </div>


//       {/* top bubbles */}
//       <div className="flex items-center justify-center gap-3 px-4 pt-2">
//         {trail.map((ch, i) => (
//           <div
//             key={i}
//             className={`w-8 h-8 rounded-full border-2 ${ch === "?" ? "border-dashed border-white/30" : "border-emerald-400/70"} flex items-center justify-center text-sm`}
//           >
//             <span className={`${ch === "?" ? "opacity-80" : "font-bold"}`}>
//               {ch === "?" ? "?" : ch === "T" ? "€" : "$"}
//             </span>
//           </div>
//         ))}
//       </div>

//       {/* coin + coef */}
//       <div className="flex items-center justify-between px-6 mt-4">
//         <div className="text-left">
//           <div className="text-2xl font-bold leading-none">{round}</div>
//           <div className="uppercase tracking-wider text-white/60 text-sm">Round</div>
//         </div>

//         {/* center coin: 3D CSS coin, same footprint */}
//         <div className="relative mx-4 flex items-center justify-center" style={{ width: 160, height: 160 }}>
//           <Coin3D ref={coinApiRef} ariaFace={face} />
//         </div>

//         <div className="text-right">
//           <div className="text-2xl font-extrabold leading-none">
//             x{effectiveCoef.toFixed(2)}
//           </div>
//           <div className="uppercase tracking-wider text-white/60 text-sm">Coef</div>
//         </div>
//       </div>

//       {/* choose H/T */}
//       <div className="px-4 mt-6 grid grid-cols-2 gap-3">
//         <button
//           disabled={flipping}
//           onClick={() => placeBet("H")}
//           className={`rounded-2xl px-4 py-4 bg-[#23293B] text-left shadow-inner border border-white/10 ${
//             flipping ? "opacity-60 cursor-not-allowed" : "active:scale-[0.98]"
//           }`}
//         >
//           <div className="flex items-center gap-3">
//             <MiniCoin symbol="$" />
//             <span className="text-lg font-semibold tracking-wide">HEADS</span>
//           </div>
//         </button>
//         <button
//           disabled={flipping}
//           onClick={() => placeBet("T")}
//           className={`rounded-2xl px-4 py-4 bg-[#23293B] text-left shadow-inner border border-white/10 ${
//             flipping ? "opacity-60 cursor-not-allowed" : "active:scale-[0.98]"
//           }`}
//         >
//           <div className="flex items-center gap-3">
//             <MiniCoin symbol="€" />
//             <span className="text-lg font-semibold tracking-wide">TAILS</span>
//           </div>
//         </button>
//       </div>

//       {/* bet + take */}
//       <div className="px-4 mt-6">
//         <div className="rounded-2xl bg-[#12182B] border border-white/10 p-4">
//           <div className="grid grid-cols-[auto,1fr,auto] items-center gap-3">
//             <button
//               onClick={() => setBet((b) => Math.max(1, Math.floor(Number(b || 0)) - 1))}
//               className="w-12 h-12 min-w-[44px] min-h-[44px] rounded-md bg-black/30 border border-white/10 text-2xl leading-none"
//             >−</button>
//             <div className="text-center">
//               <span className="text-3xl font-extrabold">{fmt(bet)}</span>
//             </div>
//             <button
//               onClick={() => setBet((b) => Math.max(1, Math.floor(Number(b || 0)) + 1))}
//               className="w-12 h-12 min-w-[44px] min-h-[44px] rounded-md bg-black/30 border border-white/10 text-2xl leading-none"
//             >+</button>
//           </div>

//           <div className="mt-4">
//             <div
//               className="w-full rounded-xl py-3 text-center font-semibold"
//               style={{
//                 background:
//                   "linear-gradient(90deg, rgba(255,165,0,0.25) 0%, rgba(255,120,0,0.35) 100%)",
//               }}
//             >
//               <div className="text-lg">
//                 {fmt(potentialProfit)} 
//               </div>
//               <div className="text-sm opacity-60 -mt-1">Take</div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* result toast */}
//       {resultMsg && (
//         <div className="px-4 mt-4">
//           <div
//             className={`rounded-xl px-4 py-3 text-center font-semibold ${
//               resultMsg.includes("Win")
//                 ? "bg-emerald-600/30 text-emerald-200"
//                 : "bg-rose-600/30 text-rose-200"
//             }`}
//           >
//             {resultMsg}
//           </div>
//         </div>
//       )}

//       <div style={{ height: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }} />
//     </div>
//   );
// }

// function MiniCoin({ symbol = "$" }) {
//   return (
//     <span
//       className="inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold"
//       style={{
//         background:
//           "radial-gradient(60% 60% at 50% 40%, #FFD76A 0%, #FFA928 55%, #E37B00 100%)",
//         boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
//         color: "#402A00",
//       }}
//       aria-hidden="true"
//     >
//       {symbol}
//     </span>
//   );
// }

// function BackButtonInline({ to = "/" }) {
//   const onClick = () => {
//     if (window.history.length > 1) {
//       window.history.back();
//     } else {
//       window.location.assign(to);
//     }
//   };

//   return (
//     <button
//       onClick={onClick}
//       aria-label="Go back"
//       className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-white/10 hover:bg-white/10 active:scale-95 text-white/80"
//       style={{ background: "rgba(255,255,255,0.04)" }}
//     >
//       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
//         <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2"
//               strokeLinecap="round" strokeLinejoin="round"/>
//       </svg>
//     </button>
//   );
// }


// /* ===================== 3D CSS COIN with WAIT->RESOLVE flow (H/T faces) ===================== */
// const Coin3D = forwardRef(function Coin3D({ ariaFace = "H" }, ref) {
//   const coinRef = useRef(null);
//   const waitTimerRef = useRef(null);

//   function clearTimers() {
//     if (waitTimerRef.current) {
//       clearTimeout(waitTimerRef.current);
//       waitTimerRef.current = null;
//     }
//   }

//   useImperativeHandle(ref, () => ({
//     // Begin indefinite spin while waiting for backend
//     startWaiting() {
//       const el = coinRef.current;
//       if (!el) return;
//       clearTimers();
//       el.classList.remove("coinflip-anim");
//       // reflow
//       // eslint-disable-next-line no-unused-expressions
//       el.offsetWidth;
//       el.classList.add("coinflip-wait");
//     },
//     // Resolve to 'H' or 'T' and return a Promise that fulfills after the animation ends
//     resolve(desired) {
//       const el = coinRef.current;
//       if (!el) return Promise.resolve();

//       // remove waiting loop
//       el.classList.remove("coinflip-wait");

//       const spins = Math.floor(3 + Math.random() * 3); // slightly shorter final settle
//       const yawStart = (Math.random() * 18 - 9).toFixed(2) + "deg";
//       const yawEnd = (Math.random() * 24 - 12).toFixed(2) + "deg";
//       const duration = Math.floor(950 + Math.random() * 450); // ~1.0–1.4s
//       const half = desired === "T" ? 0.5 : 0;

//       el.style.setProperty("--spins", String(spins));
//       el.style.setProperty("--half", String(half));
//       el.style.setProperty("--duration", duration + "ms");
//       el.style.setProperty("--yawStart", yawStart);
//       el.style.setProperty("--yawEnd", yawEnd);

//       // trigger final deterministic flip
//       el.classList.remove("coinflip-anim");
//       // eslint-disable-next-line no-unused-expressions
//       el.offsetWidth;
//       el.classList.add("coinflip-anim");

//       return new Promise((resolve) => {
//         waitTimerRef.current = setTimeout(() => {
//           resolve();
//         }, duration + 60);
//       });
//     },
//     // Stop any animation (used on error)
//     stop() {
//       const el = coinRef.current;
//       if (!el) return;
//       clearTimers();
//       el.classList.remove("coinflip-wait");
//       el.classList.remove("coinflip-anim");
//     },
//   }), []);

//   return (
//     <div className="coinflip-scene" style={{ perspective: "1200px" }}>
//       <div
//         ref={coinRef}
//         className="coinflip-coin"
//         role="img"
//         aria-label={ariaFace === "H" ? "Heads" : "Tails"}
//         style={{
//           ['--size']: '160px',
//           ['--thickness']: '12px',
//         }}
//       >
//         {/* FRONT → Heads = H */}
//         <div className="coinflip-face coinflip-front"><CoinFace symbol="H" front /></div>
//         {/* BACK → Tails = T */}
//         <div className="coinflip-face coinflip-back"><CoinFace symbol="T" /></div>
//         <div className="coinflip-shadow" aria-hidden />
//       </div>

//       {/* coin styles */}
//       <style>{`
//         :root {
//           --coin-gold-1: #f4e3b1;
//           --coin-gold-2: #d9ba73;
//           --coin-gold-3: #b7913a;
//           --coin-gold-4: #8e6b24;
//         }

//         .coinflip-coin {
//           width: var(--size);
//           height: var(--size);
//           position: relative;
//           transform-style: preserve-3d;
//           user-select: none;
//         }

//         /* Waiting loop: smooth, continuous flipping */
//         .coinflip-wait {
//           animation: coinflip-wait 0.9s linear infinite;
//         }
//         @keyframes coinflip-wait {
//           0% {
//             transform:
//               rotateX(0turn)
//               rotateY(-6deg)
//               rotateZ(0deg);
//           }
//           100% {
//             transform:
//               rotateX(1turn)
//               rotateY(6deg)
//               rotateZ(3deg);
//           }
//         }

//         /* Final settle animation (deterministic) */
//         .coinflip-coin.coinflip-anim {
//           animation: coinflip-spin var(--duration) cubic-bezier(.2,.7,.2,1) forwards;
//         }
//         @keyframes coinflip-spin {
//           0% {
//             transform:
//               rotateX(0turn)
//               rotateY(var(--yawStart))
//               rotateZ(0deg);
//           }
//           100% {
//             transform:
//               rotateX(calc((var(--spins) + var(--half)) * 1turn))
//               rotateY(var(--yawEnd))
//               rotateZ(3deg);
//           }
//         }

//         .coinflip-face {
//           position: absolute;
//           inset: 0;
//           border-radius: 50%;
//           backface-visibility: hidden;
//           display: grid;
//           place-items: center;
//           overflow: hidden;
//           box-shadow: 0 2px 1px rgba(0,0,0,.25) inset,
//                       0 10px 24px rgba(0,0,0,.35);
//         }
//         .coinflip-front {
//           background: radial-gradient(circle at 35% 30%, rgba(255,255,255,.45), rgba(255,255,255,0) 40%),
//                       radial-gradient(circle at 65% 70%, rgba(0,0,0,.18), rgba(0,0,0,0) 60%),
//                       linear-gradient(135deg, var(--coin-gold-1), var(--coin-gold-2) 38%, var(--coin-gold-3) 62%, var(--coin-gold-4));
//           transform: translateZ(calc(var(--thickness) / 2));
//         }
//         .coinflip-back {
//           background: radial-gradient(circle at 65% 30%, rgba(255,255,255,.35), rgba(255,255,255,0) 40%),
//                       radial-gradient(circle at 35% 70%, rgba(0,0,0,.22), rgba(0,0,0,0) 60%),
//                       linear-gradient(225deg, var(--coin-gold-1), var(--coin-gold-2) 38%, var(--coin-gold-3) 62%, var(--coin-gold-4));
//           transform: rotateX(180deg) translateZ(calc(var(--thickness) / 2));
//         }

//         /* ridged edge illusion */
//         .coinflip-coin::before {
//           content: "";
//           position: absolute;
//           inset: 2.5%;
//           border-radius: 50%;
//           background: repeating-conic-gradient(
//             from 0deg,
//             rgba(0,0,0,.18) 0deg 6deg,
//             rgba(255,255,255,.18) 6deg 12deg
//           );
//           filter: blur(.3px);
//           transform: translateZ(calc(var(--thickness) * -0.5));
//           opacity: .45;
//           pointer-events: none;
//         }

//         .coinflip-shadow {
//           position: absolute;
//           left: 50%;
//           bottom: -22%;
//           width: 60%;
//           height: 16%;
//           transform: translateX(-50%);
//           background: radial-gradient(ellipse at center, rgba(0,0,0,.35), rgba(0,0,0,0));
//           filter: blur(4px);
//           opacity: .7;
//           pointer-events: none;
//         }

//         @media (prefers-reduced-motion: reduce) {
//           .coinflip-wait { animation-duration: 0.01ms; }
//           .coinflip-coin.coinflip-anim { animation-duration: 0.01ms; }
//         }
//       `}</style>
//     </div>
//   );
// });

// function CoinFace({ symbol = "H", front = false }) {
//   return (
//     <div
//       className="rounded-full grid place-items-center"
//       style={{
//         width: "78%",
//         height: "78%",
//         border: "2px solid rgba(255,255,255,.35)",
//         boxShadow: "0 0 0 6px rgba(0,0,0,.12) inset",
//         background: front
//           ? "radial-gradient(circle at 40% 35%, rgba(255,255,255,.8), rgba(255,255,255,0) 55%)"
//           : "radial-gradient(circle at 60% 65%, rgba(255,255,255,.8), rgba(255,255,255,0) 55%)",
//       }}
//     >
//       <span
//         style={{
//           fontSize: "clamp(36px, 8vw, 64px)",
//           fontWeight: 800,
//           letterSpacing: "2px",
//           textShadow: "0 2px 2px rgba(0,0,0,.35)",
//           color: "#FFDF86",
//         }}
//       >
//         {symbol}
//       </span>
//     </div>
//   );
// }


// src/pages/Coinflip.jsx
import { useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { telegramAuth, getBalance, games } from "../api";

import Lottie from "lottie-react";
import bgAnim from "../assets/lottie/Flipcoin_background.json"; // ring background
import coinAnim from "../assets/lottie/Flip_coin.json";         // the coin itself

import flipSound from "../assets/diceRoll.mp3"; // reuse SFX
import winSound from "../assets/win.mp3";
import loseSound from "../assets/lose.mp3";

// format helpers
const fmt = (n) =>
  Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
function formatCoins(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

const STREAK_BOOST_PER_WIN = 0.05;   // UI-only boost per consecutive win (must match backend cfg)
const BASE_PAYOUT_PCT       = 0.90;  // 90% profit baseline (must match backend cfg)
const PAYOUT_CAP            = 1.0;   // cap profit at 100% of stake (must match backend cfg)
const TRAIL_LEN             = 10;

export default function Coinflip() {
  // balance
  const [coins, setCoins] = useState(0);

  // game state
  const [bet, setBet] = useState(1);
  const [baseCoef, setBaseCoef] = useState(1.95); // default shown coef
  const [streak, setStreak] = useState(0);
  const [round, setRound] = useState(1);
  const [trail, setTrail] = useState(Array(TRAIL_LEN).fill("?"));
  const [flipping, setFlipping] = useState(false);
  const [resultMsg, setResultMsg] = useState("");
  const [face, setFace] = useState("H"); // semantic only

  // coin animation API ref
  const coinApiRef = useRef(null);

  // coefficient shown: base when no streak; boosted when streak > 0
  const effectiveCoef = useMemo(
    () => Number((baseCoef * (1 + STREAK_BOOST_PER_WIN * Math.max(0, streak))).toFixed(2)),
    [baseCoef, streak]
  );

  // EFFECTIVE payout% that will be CREDITED on win
  const effectivePayoutPct = useMemo(() => {
    const boosted = BASE_PAYOUT_PCT * (1 + STREAK_BOOST_PER_WIN * Math.max(0, streak));
    return Math.min(PAYOUT_CAP, Math.max(0.01, Number(boosted)));
  }, [streak]);

  // “Take” bar shows the PROFIT (not total return)
  const potentialProfit = useMemo(() => {
    const stake = Math.max(0, Number(bet || 0));
    return Math.floor((stake * effectivePayoutPct + Number.EPSILON) * 100) / 100;
  }, [bet, effectivePayoutPct]);

  /* ---------- balance bootstrap ---------- */
  useEffect(() => {
    let stopPolling = () => {};
    (async () => {
      try {
        const u = await telegramAuth();
        if (Number.isFinite(+u?.coins)) setCoins((c) => (+u.coins !== c ? +u.coins : c));
        try {
          const b = await getBalance();
          if (Number.isFinite(b)) setCoins((c) => (b !== c ? b : c));
        } catch {}
        stopPolling = (() => {
          let alive = true;
          (function tick() {
            setTimeout(async () => {
              if (!alive) return;
              try {
                const b = await getBalance();
                if (Number.isFinite(b)) setCoins((c) => (b !== c ? b : c));
              } catch {} finally {
                if (alive) tick();
              }
            }, 4000);
          })();
          return () => { alive = false; };
        })();
      } catch (e) {
        console.error("[Coinflip] telegramAuth failed:", e);
      }
    })();
    return () => { stopPolling?.(); };
  }, []);

  useEffect(() => {
    const refresh = async () => {
      try {
        const b = await getBalance();
        if (Number.isFinite(b)) setCoins((c) => (b !== c ? b : c));
      } catch {}
    };
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("balance:refresh", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("balance:refresh", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  /* ---------- actions ---------- */
  const placeBet = async (side) => {
    if (flipping) return;
    const stake = Math.max(1, Math.floor(Number(bet || 0)));
    if (!Number.isFinite(stake) || stake <= 0) return alert("Enter a valid bet (>= 1).");
    if (Number(coins) < stake) return alert("Not enough coins.");

    setFlipping(true);
    setResultMsg("");

    // 1) Start spin immediately (no message yet)
    try { new Audio(flipSound).play().catch(() => {}); } catch {}
    try { coinApiRef.current?.startWaiting(); } catch {}

    try {
      // 2) Ask backend
      const res = await games.coinflip(stake, side === "H" ? "H" : "T", { streak });

      // sync default coef from engine if provided (optional)
      const m = Number(res?.details?.m);
      if (Number.isFinite(m) && m > 0) setBaseCoef(m);

      const landed = (res?.details?.landed === "T") ? "T" : "H";
      setFace(landed); // semantics only

      // 3) resolve visual
      await (coinApiRef.current?.resolve(landed) ?? Promise.resolve());

      if (Number.isFinite(res?.newBalance)) {
        setCoins((prev) => (res.newBalance !== prev ? res.newBalance : prev));
      }

      setRound((r) => r + 1);

      if (res?.result === "win") {
        setTrail((prev) => [landed, ...prev].slice(0, TRAIL_LEN));
        setStreak((s) => s + 1);

        const profit = Number(res?.payout || 0);
        const msg = `🎉 You Win! +${fmt(profit)}`;
        setResultMsg(msg);
        try { new Audio(winSound).play().catch(() => {}); } catch {}
        alert(msg);
      } else {
        setStreak(0);
        setTrail(Array(TRAIL_LEN).fill("?"));

        const msg = `❌ You Lose! -${fmt(stake)}`;
        setResultMsg(msg);
        try { new Audio(loseSound).play().catch(() => {}); } catch {}
        alert(msg);
      }

      window.dispatchEvent(new Event("balance:refresh"));
    } catch (e) {
      try { coinApiRef.current?.stop(); } catch {}
      const msg = String(e?.message || "");
      if (msg.includes("insufficient-funds")) alert("Not enough coins.");
      else if (msg.includes("min-stake")) alert("Bet is below minimum.");
      else if (msg.includes("max-stake")) alert("Bet exceeds maximum.");
      else alert("Bet failed. Try again.");
    } finally {
      setFlipping(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1020] text-white flex flex-col items-stretch">
      {/* Coins header (match Dice) */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <BackButtonInline to="/" />
          <div className="text-sm">
            <span className="opacity-70 mr-2">Coins: </span>
            <span className="font-bold">{formatCoins(coins)}</span>
          </div>
        </div>
      </div>

      {/* top bubbles */}
      <div className="flex items-center justify-center gap-3 px-4 pt-2">
        {trail.map((ch, i) => (
          <div
            key={i}
            className={`w-8 h-8 rounded-full border-2 ${ch === "?" ? "border-dashed border-white/30" : "border-emerald-400/70"} flex items-center justify-center text-sm`}
          >
            <span className={`${ch === "?" ? "opacity-80" : "font-bold"}`}>
              {ch === "?" ? "?" : ch === "T" ? "€" : "$"}
            </span>
          </div>
        ))}
      </div>

      {/* coin + coef */}
      <div className="flex items-center justify-between px-6 mt-4">
        <div className="text-left">
          <div className="text-2xl font-bold leading-none">{round}</div>
          <div className="uppercase tracking-wider text-white/60 text-sm">Round</div>
        </div>

        {/* center coin: Lottie ring behind + Lottie coin perfectly centered */}
        <div
          className="relative mx-4 flex items-center justify-center"
          style={{ width: 160, height: 160 }}
        >
          {/* Background ring animation (loop) */}
          <Lottie
            animationData={bgAnim}
            loop
            autoplay
            style={{
              position: "absolute",
              inset: 0,
              transform: "scale(0.9)", // fit ring inside the 160×160 square
            }}
            rendererSettings={{
              viewBoxOnly: true,
              preserveAspectRatio: "xMidYMid slice",
            }}
          />

          {/* Coin from JSON (no CSS coin at all) */}
          <div style={{ position: "relative", zIndex: 1, width: 160, height: 160 }}>
            <LottieCoin ref={coinApiRef} />
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-extrabold leading-none">
            x{effectiveCoef.toFixed(2)}
          </div>
          <div className="uppercase tracking-wider text-white/60 text-sm">Coef</div>
        </div>
      </div>

      {/* choose H/T */}
      <div className="px-4 mt-6 grid grid-cols-2 gap-3">
        <button
          disabled={flipping}
          onClick={() => placeBet("H")}
          className={`rounded-2xl px-4 py-4 bg-[#23293B] text-left shadow-inner border border-white/10 ${
            flipping ? "opacity-60 cursor-not-allowed" : "active:scale-[0.98]"
          }`}
        >
          <div className="flex items-center gap-3">
            <MiniCoin symbol="$" />
            <span className="text-lg font-semibold tracking-wide">HEADS</span>
          </div>
        </button>
        <button
          disabled={flipping}
          onClick={() => placeBet("T")}
          className={`rounded-2xl px-4 py-4 bg-[#23293B] text-left shadow-inner border border-white/10 ${
            flipping ? "opacity-60 cursor-not-allowed" : "active:scale-[0.98]"
          }`}
        >
          <div className="flex items-center gap-3">
            <MiniCoin symbol="€" />
            <span className="text-lg font-semibold tracking-wide">TAILS</span>
          </div>
        </button>
      </div>

      {/* bet + take */}
      <div className="px-4 mt-6">
        <div className="rounded-2xl bg-[#12182B] border border-white/10 p-4">
          <div className="grid grid-cols-[auto,1fr,auto] items-center gap-3">
            <button
              onClick={() => setBet((b) => Math.max(1, Math.floor(Number(b || 0)) - 1))}
              className="w-12 h-12 min-w-[44px] min-h-[44px] rounded-md bg-black/30 border border-white/10 text-2xl leading-none"
            >−</button>
            <div className="text-center">
              <span className="text-3xl font-extrabold">{fmt(bet)}</span>
            </div>
            <button
              onClick={() => setBet((b) => Math.max(1, Math.floor(Number(b || 0)) + 1))}
              className="w-12 h-12 min-w-[44px] min-h-[44px] rounded-md bg-black/30 border border-white/10 text-2xl leading-none"
            >+</button>
          </div>

          <div className="mt-4">
            <div
              className="w-full rounded-xl py-3 text-center font-semibold"
              style={{
                background:
                  "linear-gradient(90deg, rgba(255,165,0,0.25) 0%, rgba(255,120,0,0.35) 100%)",
              }}
            >
              <div className="text-lg">
                {fmt(potentialProfit)} 
              </div>
              <div className="text-sm opacity-60 -mt-1">Take</div>
            </div>
          </div>
        </div>
      </div>

      {/* result toast */}
      {resultMsg && (
        <div className="px-4 mt-4">
          <div
            className={`rounded-xl px-4 py-3 text-center font-semibold ${
              resultMsg.includes("Win")
                ? "bg-emerald-600/30 text-emerald-200"
                : "bg-rose-600/30 text-rose-200"
            }`}
          >
            {resultMsg}
          </div>
        </div>
      )}

      <div style={{ height: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }} />
    </div>
  );
}

/* -------------------- LottieCoin (replaces CSS coin) -------------------- */
const LottieCoin = forwardRef(function LottieCoin(_, ref) {
  const animRef = useRef(null);
  const settleTimer = useRef(null);

  useImperativeHandle(ref, () => ({
    startWaiting() {
      if (!animRef.current) return;
      try {
        animRef.current.setSpeed?.(1);
        animRef.current.setDirection?.(1);
        animRef.current.play?.();
        animRef.current.loop = true;
      } catch {}
    },
    resolve(/* desired = 'H'|'T' (visual is neutral) */) {
      if (!animRef.current) return Promise.resolve();
      // brief settle burst: speed up for ~1s, then stop at current frame
      animRef.current.loop = false;
      try { animRef.current.setSpeed?.(1.6); } catch {}
      try { animRef.current.play?.(); } catch {}
      return new Promise((res) => {
        clearTimeout(settleTimer.current);
        settleTimer.current = setTimeout(() => {
          try { animRef.current.pause?.(); } catch {}
          res();
        }, 1000);
      });
    },
    stop() {
      clearTimeout(settleTimer.current);
      if (!animRef.current) return;
      try {
        animRef.current.stop?.();
        animRef.current.loop = false;
      } catch {}
    },
  }), []);

  return (
    <Lottie
      lottieRef={animRef}
      animationData={coinAnim}
      loop
      autoplay
      style={{
        position: "absolute",
        inset: 0,
        // Fit exactly inside the inner circle of the background:
        // tweak scale 0.88–0.96 if your background ring stroke is thick/thin
        transform: "scale(0.92)",
        pointerEvents: "none",
      }}
      rendererSettings={{
        viewBoxOnly: true,
        preserveAspectRatio: "xMidYMid slice",
      }}
    />
  );
});

function MiniCoin({ symbol = "$" }) {
  return (
    <span
      className="inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold"
      style={{
        background:
          "radial-gradient(60% 60% at 50% 40%, #FFD76A 0%, #FFA928 55%, #E37B00 100%)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
        color: "#402A00",
      }}
      aria-hidden="true"
    >
      {symbol}
    </span>
  );
}

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
      className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-white/10 hover:bg-white/10 active:scale-95 text-white/80"
      style={{ background: "rgba(255,255,255,0.04)" }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}
