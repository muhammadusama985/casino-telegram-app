// // src/pages/Coinflip.jsx
// import { useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from "react";
// import { telegramAuth, getBalance, games } from "../api";

// import Lottie from "lottie-react";
// import bgAnim from "../assets/lottie/Flipcoin_background.json"; // looping ring

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
// const BASE_PAYOUT_PCT = 0.90;  // 90% profit baseline (must match backend cfg)
// const PAYOUT_CAP = 1.0;   // cap profit at 100% of stake (must match backend cfg)
// const TRAIL_LEN = 10;

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

//   // Removed the toast state part (no win/loss notification)
//   const [resultMsg, setResultMsg] = useState("");       // title line
//   const [toastBody, setToastBody] = useState("");       // subtitle
//   const [resultKind, setResultKind] = useState(null);   // 'win' | 'lose' | null
//   const [toastOpen, setToastOpen] = useState(false);    // slide in/out

//   const [face, setFace] = useState("H"); // semantic only (H → BTC, T → TON)

//   // coin animation API ref
//   const coinApiRef = useRef(null);

//   // coefficient shown: base when no streak; boosted when streak > 0
//   const effectiveCoef = useMemo(
//     () => Number((baseCoef * (1 + STREAK_BOOST_PER_WIN * Math.max(0, streak))).toFixed(2)),
//     [baseCoef, streak]
//   );

//   // EFFECTIVE payout% that will be CREDITED on win
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

//   // Auto close after ~4s whenever the toast is shown
//   useEffect(() => {
//     if (!toastOpen) return;
//     const t = setTimeout(() => setToastOpen(false), 4000);
//     return () => clearTimeout(t);
//   }, [toastOpen]);

//   // After it slides out, clear the message so it unmounts
//   useEffect(() => {
//     if (toastOpen || !resultMsg) return;
//     const t = setTimeout(() => {
//       setResultMsg("");
//       setToastBody("");
//       setResultKind(null);
//     }, 300);
//     return () => clearTimeout(t);
//   }, [toastOpen, resultMsg]);

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
//     setToastBody("");
//     setResultKind(null);

//     // 1) Start spin only after user selects
//     try { new Audio(flipSound).play().catch(() => {}); } catch {}
//     try { coinApiRef.current?.startWaiting(); } catch {}

//     try {
//       // 2) Ask backend
//       const res = await games.coinflip(stake, side === "H" ? "H" : "T", { streak });

//       // sync default coef from engine if provided (optional)
//       const m = Number(res?.details?.m);
//       if (Number.isFinite(m) && m > 0) setBaseCoef(m);

//       const landed = (res?.details?.landed === "T") ? "T" : "H";
//       setFace(landed); // semantics only

//       // 3) resolve visual (CSS coin settles to backend side)
//       await (coinApiRef.current?.resolve(landed) ?? Promise.resolve());

//       if (Number.isFinite(res?.newBalance)) {
//         setCoins((prev) => (res.newBalance !== prev ? res.newBalance : prev));
//       }

//       setRound((r) => r + 1);

//       if (res?.result === "win") {
//         setTrail((prev) => [landed, ...prev].slice(0, TRAIL_LEN));
//         setStreak((s) => s + 1);

//         const profit = Number(res?.payout || 0);
//         setResultMsg("Hurrah! You won 🎉");
//         setToastBody(`+${fmt(profit)} has been credited to your balance.`);
//         setResultKind("win");
//         // WIN visual
//         coinApiRef.current?.flashWin();
//         try { new Audio(winSound).play().catch(() => {}); } catch {}
//       } else {
//         setStreak(0);
//         setTrail(Array(TRAIL_LEN).fill("?"));

//         setResultMsg("Oops! You lost 😕");
//         setToastBody(`-${fmt(stake)} has been deducted from your balance.`);
//         setResultKind("lose");
//         // LOSS visual (full grey)
//         coinApiRef.current?.flashLose();
//         try { new Audio(loseSound).play().catch(() => {}); } catch {}
//       }

//       window.dispatchEvent(new Event("balance:refresh"));
//     } catch (e) {
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
//       <div className="flex items-center justify-between px-4 py-3">
//         <div className="flex items-center gap-3">
//           <BackButtonInline to="/" />
//           <div className="text-sm">
//             <span className="opacity-70 mr-2">Coins: </span>
//             <span className="font-bold">{formatCoins(coins)}</span>
//           </div>
//         </div>
//       </div>

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
// <div className="flex items-center justify-between px-6 mt-4 p-4" style={{ backgroundColor: "#000080", borderRadius: "8px" }}>
//         <div className="text-left">
//           <div className="text-2xl font-bold leading-none">{round}</div>
//           <div className="uppercase tracking-wider text-white/60 text-sm">Round</div>
//         </div>

//         {/* center coin: BG ring masked to circle + CSS coin centered */}
//         <div className="relative mx-4 flex items-center justify-center" style={{ width: "100%", height: 400, isolation: "isolate" }}>
//           {/* Masked circle wrapper so the Lottie never overflows or show a slab */}
//           <div
//             style={{
//               position: "absolute",
//               inset: 0,
//               borderRadius: "50%",
//               overflow: "hidden",
//               background: "	#000080", // match page bg
//               zIndex: 0,
//             }}
//           >
//             <Lottie
//               animationData={bgAnim}
//               loop
//               autoplay
//               style={{
//                 width: "100%",
//                 height: "100%",
//                 pointerEvents: "none",
//                 transform: "translateY(-6px) scaleX(1.14) scaleY(1.08)",
//                 transformOrigin: "center",
//               }}
//               rendererSettings={{ preserveAspectRatio: "xMidYMid meet" }}
//             />
//           </div>

//           {/* Coin above the ring, hard-centered */}
//           <div
//             style={{
//               position: "absolute",
//               inset: 0,
//               display: "grid",
//               placeItems: "center",
//               zIndex: 1,
//               pointerEvents: "none",
//             }}
//           >
//             <div style={{ transform: "translateY(-6px) scale(0.70)", transformOrigin: "center" }}>
//               <Coin3D ref={coinApiRef} ariaFace={face} />
//             </div>
//           </div>
//         </div>

//         <div className="text-right">
//           <div className="text-2xl font-extrabold leading-none">
//             x{effectiveCoef.toFixed(2)}
//           </div>
//           <div className="uppercase tracking-wider text-white/60 text-sm">Coef</div>
//         </div>
//       </div>

//       {/* choose H/T — force on top of any animation layers */}
//       <div className="px-4 mt-6 grid grid-cols-2 gap-3 relative z-20">
//         <button
//           disabled={flipping}
//           onClick={() => placeBet("H")}
//           className={`rounded-2xl px-4 py-4 bg-[#23293B] text-left shadow-inner border border-white/10 ${flipping ? "opacity-60 cursor-not-allowed" : "active:scale-[0.98]"}`}
//         >
//           <div className="flex items-center gap-3">
//             <MiniCoin symbol="₿" />
//             <span className="text-lg font-semibold tracking-wide">HEADS</span>
//           </div>
//         </button>
//         <button
//           disabled={flipping}
//           onClick={() => placeBet("T")}
//           className={`rounded-2xl px-4 py-4 bg-[#23293B] text-left shadow-inner border border-white/10 ${flipping ? "opacity-60 cursor-not-allowed" : "active:scale-[0.98]"}`}
//         >
//           <div className="flex items-center gap-3">
//             <MiniCoin symbol="TON" />
//             <span className="text-lg font-semibold tracking-wide">TAILS</span>
//           </div>
//         </button>
//       </div>

//       {/* bet + take */}
//       <div className="px-4 mt-6">
//         <div className="rounded-2xl bg-[#12182B] border border-white/10 p-4">
//           <div className="flex items-center rounded-xl bg-black/30 border border-white/10 h-14 px-2">
//             {/* minus */}
//             <button
//               aria-label="Decrease bet"
//               onClick={() => setBet((b) => Math.max(1, Math.floor(Number(b || 0)) - 1))}
//               className="w-12 h-12 min-w-[44px] min-h-[44px] rounded-lg text-2xl leading-none hover:bg-white/5 active:scale-95"
//             >−</button>

//             {/* left divider */}
//             <span className="h-6 w-px bg-white/15 mx-2" />

//             {/* number (center) */}
//             <div className="flex-1 text-center">
//               <span className="text-3xl font-extrabold">{fmt(bet)}</span>
//             </div>

//             {/* right divider */}
//             <span className="h-6 w-px bg-white/15 mx-2" />

//             {/* plus */}
//             <button
//               aria-label="Increase bet"
//               onClick={() => setBet((b) => Math.max(1, Math.floor(Number(b || 0)) + 1))}
//               className="w-12 h-12 min-w-[44px] min-h-[44px] rounded-lg text-2xl leading-none hover:bg-white/5 active:scale-95"
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

//       <div style={{ height: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }} />
//     </div>
//   );
// }

// function MiniCoin({ symbol = "₿" }) {
//   const isTON = symbol === "TON";
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
//       {isTON ? <TonGlyph /> : symbol}
//     </span>
//   );
// }

// // Minimal TON glyph (inline SVG); sized to fit inside MiniCoin
// function TonGlyph() {
//   return (
//     <svg
//       viewBox="0 0 256 256"
//       width="16"
//       height="16"
//       fill="currentColor"
//       aria-hidden="true"
//       focusable="false"
//       style={{ display: "block" }}
//     >
//       {/* Outer kite/triangle outline */}
//       <path d="M128 28c-14 0-26 5-36 15L42 93c-14 14-17 36-7 54l78 141c4 7 14 7 18 0l78-141c10-18 7-40-7-54l-50-50c-10-10-22-15-36-15zM76 100l52-52c0 0 0 0 0 0l52 52c8 8 9 21 3 31L128 214 73 131c-6-10-5-23 3-31z" />
//       {/* Inner V mark */}
//       <path d="M96 84h64c6 0 9 7 5 12l-37 51c-2 3-7 3-9 0l-37-51c-4-5-1-12 5-12z" />
//     </svg>
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
//           strokeLinecap="round" strokeLinejoin="round" />
//       </svg>
//     </button>
//   );
// }

// /* ===================== 3D CSS COIN with WAIT->RESOLVE flow (H/T faces) ===================== */
// const Coin3D = forwardRef(function Coin3D({ ariaFace = "H" }, ref) {
//   const coinRef = useRef(null);
//   const waitTimerRef = useRef(null);
//   const effectTimerRef = useRef(null);

//   function clearTimers() {
//     if (waitTimerRef.current) {
//       clearTimeout(waitTimerRef.current);
//       waitTimerRef.current = null;
//     }
//     if (effectTimerRef.current) {
//       clearTimeout(effectTimerRef.current);
//       effectTimerRef.current = null;
//     }
//   }
//   function clearEffects() {
//     const el = coinRef.current;
//     if (!el) return;
//     el.classList.remove("coinflip-win", "coinflip-lose");
//   }

//   useImperativeHandle(ref, () => ({
//     // Begin indefinite spin while waiting for backend
//     startWaiting() {
//       const el = coinRef.current;
//       if (!el) return;
//       clearTimers();
//       clearEffects();
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

//       const spins = Math.floor(3 + Math.random() * 3); // ~3–5 flips
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
//       clearEffects();
//       el.classList.remove("coinflip-wait");
//       el.classList.remove("coinflip-anim");
//     },

//     // Effects
//     flashWin() {
//       const el = coinRef.current;
//       if (!el) return;
//       clearEffects();
//       el.classList.add("coinflip-win");
//       effectTimerRef.current = setTimeout(() => {
//         el.classList.remove("coinflip-win");
//       }, 1000);
//     },
//     flashLose() {
//       const el = coinRef.current;
//       if (!el) return;
//       clearEffects();
//       el.classList.add("coinflip-lose");
//       effectTimerRef.current = setTimeout(() => {
//         el.classList.remove("coinflip-lose");
//       }, 1200);
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
//           ['--size']: '160px',        // base footprint (shrinked by wrapper scale)
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

//         .coinface { position: absolute; inset: 0; border-radius: 50%; }
//         .coinface-rim {
//           position: absolute; inset: 0; border-radius: 50%;
//           background: linear-gradient(145deg, #ffe07a 0%, #ffc447 38%, #ee9f1b 62%, #bf7306 100%);
//           box-shadow: inset 0 6px 10px rgba(255,255,255,0.35),
//                       inset 0 -10px 16px rgba(0,0,0,0.35),
//                       0 6px 14px rgba(0,0,0,0.25);
//         }
//         .coinface-ring {
//           position: absolute; inset: 8%; border-radius: 50%;
//           background: linear-gradient(145deg, #ffeaa3 0%, #ffd268 45%, #eca425 80%, #c0790a 100%);
//           box-shadow: inset 0 3px 6px rgba(255,255,255,0.55),
//                       inset 0 -6px 10px rgba(0,0,0,0.28);
//         }
//         .coinface-core {
//           position: absolute; inset: 18%; border-radius: 50%;
//           background:
//             radial-gradient(60% 60% at 40% 35%, #fff1b5 0%, rgba(255,241,181,0.85) 20%, transparent 55%),
//             radial-gradient(55% 55% at 65% 70%, rgba(0,0,0,0.15), transparent 65%),
//             linear-gradient(145deg, #ffe38f 0%, #ffc24a 40%, #f0a22c 70%, #cb7e0f 100%);
//           box-shadow: inset 0 3px 7px rgba(255,255,255,0.6),
//                       inset 0 -10px 14px rgba(0,0,0,0.28);
//         }
//         .coinface-symbol {
//           position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
//           font-weight: 900; letter-spacing: 1px; font-size: clamp(34px, 7.2vw, 58px);
//           color: #d97800;
//           text-shadow: 0 2px 0 rgba(255,255,255,0.35), 0 2px 6px rgba(0,0,0,0.25);
//         }
//         .coinface-gloss { position: absolute; inset: 0; border-radius: 50%; pointer-events: none; mix-blend-mode: screen; }
//         .coinface-gloss.front {
//           background: radial-gradient(ellipse at 32% 28%, rgba(255,255,255,0.55) 0%,
//                                       rgba(255,255,255,0.18) 18%, rgba(255,255,255,0) 46%);
//         }
//         .coinface-gloss.back  {
//           background: radial-gradient(ellipse at 68% 72%, rgba(255,255,255,0.55) 0%,
//                                       rgba(255,255,255,0.18) 18%, rgba(255,255,255,0) 46%);
//         }

//         .coinflip-coin {
//           width: var(--size); height: var(--size); position: relative;
//           transform-style: preserve-3d; user-select: none; transition: filter .25s ease;
//         }

//         /* Waiting loop */
//         .coinflip-wait { animation: coinflip-wait 0.9s linear infinite; }
//         @keyframes coinflip-wait {
//           0% { transform: rotateX(0turn) rotateY(-6deg) rotateZ(0deg); }
//           100% { transform: rotateX(1turn) rotateY(6deg) rotateZ(3deg); }
//         }

//         /* Final settle */
//         .coinflip-coin.coinflip-anim { animation: coinflip-spin var(--duration) cubic-bezier(.2,.7,.2,1) forwards; }
//         @keyframes coinflip-spin {
//           0% { transform: rotateX(0turn) rotateY(var(--yawStart)) rotateZ(0deg); }
//           100% { transform: rotateX(calc((var(--spins) + var(--half)) * 1turn)) rotateY(var(--yawEnd)) rotateZ(3deg); }
//         }

//         .coinflip-face {
//           position: absolute; inset: 0; border-radius: 50%; backface-visibility: hidden;
//           display: grid; place-items: center; overflow: hidden;
//           box-shadow: 0 2px 1px rgba(0,0,0,.25) inset, 0 10px 24px rgba(0,0,0,.35);
//         }
//         .coinflip-front {
//           transform: translateZ(calc(var(--thickness) / 2));
//           background:
//             radial-gradient(circle at 35% 30%, rgba(255,255,255,.45), rgba(255,255,255,0) 40%),
//             radial-gradient(circle at 65% 70%, rgba(0,0,0,.18), rgba(0,0,0,0) 60%),
//             linear-gradient(135deg, var(--coin-gold-1), var(--coin-gold-2) 38%, var(--coin-gold-3) 62%, var(--coin-gold-4));
//         }
//         .coinflip-back {
//           transform: rotateX(180deg) translateZ(calc(var(--thickness) / 2));
//           background:
//             radial-gradient(circle at 65% 30%, rgba(255,255,255,.35), rgba(255,255,255,0) 40%),
//             radial-gradient(circle at 35% 70%, rgba(0,0,0,.22), rgba(0,0,0,0) 60%),
//             linear-gradient(225deg, var(--coin-gold-1), var(--coin-gold-2) 38%, var(--coin-gold-3) 62%, var(--coin-gold-4));
//         }

//         /* ridged edge illusion */
//         .coinflip-coin::before {
//           content: ""; position: absolute; inset: 2.5%; border-radius: 50%;
//           background: repeating-conic-gradient(from 0deg, rgba(0,0,0,.18) 0deg 6deg, rgba(255,255,255,.18) 6deg 12deg);
//           filter: blur(.3px); transform: translateZ(calc(var(--thickness) * -0.5)); opacity: .45; pointer-events: none;
//         }

//         .coinflip-shadow {
//           position: absolute; left: 50%; bottom: -22%; width: 60%; height: 16%; transform: translateX(-50%);
//           background: radial-gradient(ellipse at center, rgba(0,0,0,.35), rgba(0,0,0,0)); filter: blur(4px); opacity: .7; pointer-events: none;
//         }

//         /* ===== Effects ===== */

//         /* WIN: glow + sweeping white shine */
//         .coinflip-coin.coinflip-win { filter: drop-shadow(0 0 14px rgba(255,212,128,0.65)); }
//         .coinflip-coin.coinflip-win::after {
//           content: ""; position: absolute; inset: -30%; border-radius: 50%; pointer-events: none;
//           background: linear-gradient(120deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.70) 48%, rgba(255,255,255,0) 70%);
//           transform: translateX(-120%) rotate(25deg);
//           animation: coinflip-shine 900ms ease-out forwards;
//         }
//         @keyframes coinflip-shine { to { transform: translateX(120%) rotate(25deg); } }

//         /* LOSS: FULL GREY coin (rim, ring, core, faces, symbol) */
//         .coinflip-coin.coinflip-lose {
//           --coin-gold-1: #e3e3e3;
//           --coin-gold-2: #cfcfcf;
//           --coin-gold-3: #b9b9b9;
//           --coin-gold-4: #9f9f9f;
//           filter: grayscale(1) brightness(0.97);
//         }
//         .coinflip-coin.coinflip-lose .coinface-rim {
//           background: linear-gradient(145deg, #eeeeee 0%, #dcdcdc 38%, #bfbfbf 62%, #a1a1a1 100%);
//           box-shadow: inset 0 6px 10px rgba(255,255,255,0.25),
//                       inset 0 -10px 16px rgba(0,0,0,0.28),
//                       0 6px 14px rgba(0,0,0,0.20);
//         }
//         .coinflip-coin.coinflip-lose .coinface-ring {
//           background: linear-gradient(145deg, #f5f5f5 0%, #e5e5e5 45%, #cfcfcf 80%, #b3b3b3 100%);
//           box-shadow: inset 0 3px 6px rgba(255,255,255,0.35),
//                       inset 0 -6px 10px rgba(0,0,0,0.22);
//         }
//         .coinflip-coin.coinflip-lose .coinface-core {
//           background:
//             radial-gradient(60% 60% at 40% 35%, #fafafa 0%, rgba(250,250,250,0.85) 20%, transparent 55%),
//             radial-gradient(55% 55% at 65% 70%, rgba(0,0,0,0.10), transparent 65%),
//             linear-gradient(145deg, #ededed 0%, #d8d8d8 40%, #bfbfbf 70%, #a5a5a5 100%);
//           box-shadow: inset 0 3px 7px rgba(255,255,255,0.40),
//                       inset 0 -10px 14px rgba(0,0,0,0.20);
//         }
//         .coinflip-coin.coinflip-lose .coinface-symbol {
//           color: #6f6f6f;
//           text-shadow: 0 1px 0 rgba(255,255,255,.25), 0 2px 4px rgba(0,0,0,.18);
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
//     <div className="coinface">
//       <div className="coinface-rim" />
//       <div className="coinface-ring" />
//       <div className="coinface-core">
//         <span className="coinface-symbol">{symbol}</span>
//       </div>
//       {/* soft gloss; flips bias based on front/back */}
//       <div className={`coinface-gloss ${front ? "front" : "back"}`} />
//     </div>
//   );
// }



// src/pages/Coinflip.jsx
import { useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { telegramAuth, getBalance, games } from "../api";

import Lottie from "lottie-react";
import bgAnim from "../assets/lottie/Flipcoin_background.json"; // looping ring
import coinAnim from "../assets/lottie/Flipcoin.json";          // <<< coin lottie

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
const BASE_PAYOUT_PCT = 0.90;        // 90% profit baseline (must match backend cfg)
const PAYOUT_CAP = 1.0;              // cap profit at 100% of stake (must match backend cfg)
const TRAIL_LEN = 10;

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

  // Removed the toast state part (no win/loss notification)
  const [resultMsg, setResultMsg] = useState("");       // title line
  const [toastBody, setToastBody] = useState("");       // subtitle
  const [resultKind, setResultKind] = useState(null);   // 'win' | 'lose' | null
  const [toastOpen, setToastOpen] = useState(false);    // slide in/out

  const [face, setFace] = useState("H"); // semantic only (H → BTC, T → TON)

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

  // Auto close after ~4s whenever the toast is shown
  useEffect(() => {
    if (!toastOpen) return;
    const t = setTimeout(() => setToastOpen(false), 4000);
    return () => clearTimeout(t);
  }, [toastOpen]);

  // After it slides out, clear the message so it unmounts
  useEffect(() => {
    if (toastOpen || !resultMsg) return;
    const t = setTimeout(() => {
      setResultMsg("");
      setToastBody("");
      setResultKind(null);
    }, 300);
    return () => clearTimeout(t);
  }, [toastOpen, resultMsg]);

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
    setToastBody("");
    setResultKind(null);

    // 1) Start flip only after user selects
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

      // 3) resolve visual (coin settles to backend side)
      await (coinApiRef.current?.resolve(landed) ?? Promise.resolve());

      if (Number.isFinite(res?.newBalance)) {
        setCoins((prev) => (res.newBalance !== prev ? res.newBalance : prev));
      }

      setRound((r) => r + 1);

      if (res?.result === "win") {
        setTrail((prev) => [landed, ...prev].slice(0, TRAIL_LEN));
        setStreak((s) => s + 1);

        const profit = Number(res?.payout || 0);
        setResultMsg("Hurrah! You won 🎉");
        setToastBody(`+${fmt(profit)} has been credited to your balance.`);
        setResultKind("win");
        // WIN visual (glow 5s, then default frame)
        coinApiRef.current?.flashWin();
        try { new Audio(winSound).play().catch(() => {}); } catch {}
      } else {
        setStreak(0);
        setTrail(Array(TRAIL_LEN).fill("?"));

        setResultMsg("Oops! You lost 😕");
        setToastBody(`-${fmt(stake)} has been deducted from your balance.`);
        setResultKind("lose");
        // LOSS visual (grey 5s, then default frame)
        coinApiRef.current?.flashLose();
        try { new Audio(loseSound).play().catch(() => {}); } catch {}
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
      // IMPORTANT: this runs after resolve() finishes => buttons re-enable
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
      <div className="flex items-center justify-between px-6 mt-4 p-4" style={{ backgroundColor: "#000080", borderRadius: "8px" }}>
        <div className="text-left">
          <div className="text-2xl font-bold leading-none">{round}</div>
          <div className="uppercase tracking-wider text-white/60 text-sm">Round</div>
        </div>

        {/* center coin: BG ring masked to circle + coin centered */}
        <div className="relative mx-4 flex items-center justify-center" style={{ width: "100%", height: 400, isolation: "isolate" }}>
          {/* Masked circle wrapper so the Lottie never overflows or show a slab */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              overflow: "hidden",
              background: "	#000080", // match page bg
              zIndex: 0,
            }}
          >
            <Lottie
              animationData={bgAnim}
              loop
              autoplay
              style={{
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                transform: "translateY(-6px) scaleX(1.14) scaleY(1.08)",
                transformOrigin: "center",
              }}
              rendererSettings={{ preserveAspectRatio: "xMidYMid meet" }}
            />
          </div>

          {/* Coin above the ring, hard-centered */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              zIndex: 1,
              pointerEvents: "none",
            }}
          >
            <div style={{ transform: "translateY(-6px) scale(0.70)", transformOrigin: "center" }}>
              <Coin3D ref={coinApiRef} ariaFace={face} />
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-extrabold leading-none">
            x{effectiveCoef.toFixed(2)}
          </div>
          <div className="uppercase tracking-wider text-white/60 text-sm">Coef</div>
        </div>
      </div>

      {/* choose H/T — force on top of any animation layers */}
      <div className="px-4 mt-6 grid grid-cols-2 gap-3 relative z-20">
        <button
          disabled={flipping}
          onClick={() => placeBet("H")}
          className={`rounded-2xl px-4 py-4 bg-[#23293B] text-left shadow-inner border border-white/10 ${flipping ? "opacity-60 cursor-not-allowed" : "active:scale-[0.98]"}`}
        >
          <div className="flex items-center gap-3">
            <MiniCoin symbol="₿" />
            <span className="text-lg font-semibold tracking-wide">HEADS</span>
          </div>
        </button>
        <button
          disabled={flipping}
          onClick={() => placeBet("T")}
          className={`rounded-2xl px-4 py-4 bg-[#23293B] text-left shadow-inner border border-white/10 ${flipping ? "opacity-60 cursor-not-allowed" : "active:scale-[0.98]"}`}
        >
          <div className="flex items-center gap-3">
            <MiniCoin symbol="TON" />
            <span className="text-lg font-semibold tracking-wide">TAILS</span>
          </div>
        </button>
      </div>

      {/* bet + take */}
      <div className="px-4 mt-6">
        <div className="rounded-2xl bg-[#12182B] border border-white/10 p-4">
          <div className="flex items-center rounded-xl bg-black/30 border border-white/10 h-14 px-2">
            {/* minus */}
            <button
              aria-label="Decrease bet"
              onClick={() => setBet((b) => Math.max(1, Math.floor(Number(b || 0)) - 1))}
              className="w-12 h-12 min-w-[44px] min-h-[44px] rounded-lg text-2xl leading-none hover:bg-white/5 active:scale-95"
            >−</button>

            {/* left divider */}
            <span className="h-6 w-px bg-white/15 mx-2" />

            {/* number (center) */}
            <div className="flex-1 text-center">
              <span className="text-3xl font-extrabold">{fmt(bet)}</span>
            </div>

            {/* right divider */}
            <span className="h-6 w-px bg-white/15 mx-2" />

            {/* plus */}
            <button
              aria-label="Increase bet"
              onClick={() => setBet((b) => Math.max(1, Math.floor(Number(b || 0)) + 1))}
              className="w-12 h-12 min-w-[44px] min-h-[44px] rounded-lg text-2xl leading-none hover:bg-white/5 active:scale-95"
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

      <div style={{ height: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }} />
    </div>
  );
}

function MiniCoin({ symbol = "₿" }) {
  const isTON = symbol === "TON";
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
      {isTON ? <TonGlyph /> : symbol}
    </span>
  );
}

// Minimal TON glyph (inline SVG); sized to fit inside MiniCoin
function TonGlyph() {
  return (
    <svg
      viewBox="0 0 256 256"
      width="16"
      height="16"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block" }}
    >
      {/* Outer kite/triangle outline */}
      <path d="M128 28c-14 0-26 5-36 15L42 93c-14 14-17 36-7 54l78 141c4 7 14 7 18 0l78-141c10-18 7-40-7-54l-50-50c-10-10-22-15-36-15zM76 100l52-52c0 0 0 0 0 0l52 52c8 8 9 21 3 31L128 214 73 131c-6-10-5-23 3-31z" />
      {/* Inner V mark */}
      <path d="M96 84h64c6 0 9 7 5 12l-37 51c-2 3-7 3-9 0l-37-51c-4-5-1-12 5-12z" />
    </svg>
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
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

/* =========================================================================
   LOTTIE-BASED COIN (BTC=heads, TON=tails)
   Keeps the SAME imperative API used by parent: startWaiting → resolve → flashWin/flashLose
   ========================================================================= */
const Coin3D = forwardRef(function Coin3D({ ariaFace = "H" }, ref) {
  const lottieRef = useRef(null);
  const [glow, setGlow] = useState(false);

  // Keep state of waiting + last landed face
  const waitingRef = useRef(false);
  const lastUpRef = useRef(null); // 'H' | 'T'
  const onCompleteRef = useRef(null);

  // Track when waiting started to enforce a minimum fast-spin time
  const waitStartRef = useRef(0);

  // Absolute frame windows (file has 1140 frames @ 60fps)
  const FRAMES = {
    LOOP_START: 0,
    LOOP_END: 420,             // continuous flipping visually (shows both faces)
    SETTLE_BTC_START: 420,     // lands BTC-up
    SETTLE_BTC_END: 510,
    SETTLE_TON_START: 780,     // lands TON-up
    SETTLE_TON_END: 870,
    BTC_GREY_ON: 450,          // grey visible 450–495 (off by 510)
    BTC_GREY_HOLD: 495,
    BTC_GREY_OFF: 510,
    TON_GREY_ON: 810,          // grey visible 810–855 (off by 870)
    TON_GREY_HOLD: 855,
    TON_GREY_OFF: 870,
  };

  // About ~1.2s at fast speed ≈ 3–4 visible flips
  const MIN_WAIT_MS = 1200;

  // helper: play a segment and resolve when Lottie fires "complete"
  const playSegment = (from, to, speed = 1.0) =>
    new Promise((resolve) => {
      const item = lottieRef.current?.animationItem;
      if (!item) return resolve();

      // clean any previous listener
      if (onCompleteRef.current) {
        item.removeEventListener("complete", onCompleteRef.current);
        onCompleteRef.current = null;
      }

      item.loop = false;
      item.setSpeed(speed);
      item.setDirection(from <= to ? 1 : -1);

      onCompleteRef.current = () => {
        item.removeEventListener("complete", onCompleteRef.current);
        onCompleteRef.current = null;
        resolve();
      };

      item.addEventListener("complete", onCompleteRef.current);
      item.playSegments([from, to], true);
    });

  // manual loop for waiting state: replay the LOOP segment on every "complete"
  const startWaitingLoop = () => {
    const item = lottieRef.current?.animationItem;
    if (!item) return;

    waitingRef.current = true;

    // remove any previous listener
    if (onCompleteRef.current) {
      item.removeEventListener("complete", onCompleteRef.current);
      onCompleteRef.current = null;
    }

    onCompleteRef.current = () => {
      if (!waitingRef.current) return;
      item.playSegments([FRAMES.LOOP_START, FRAMES.LOOP_END], true);
    };

    item.addEventListener("complete", onCompleteRef.current);
    item.setSpeed(2.5);       // fast spin while waiting
    item.setDirection(1);
    item.loop = false;        // loop manually over the segment
    item.playSegments([FRAMES.LOOP_START, FRAMES.LOOP_END], true);
  };

  const stopWaitingLoop = () => {
    const item = lottieRef.current?.animationItem;
    waitingRef.current = false;
    if (item && onCompleteRef.current) {
      item.removeEventListener("complete", onCompleteRef.current);
      onCompleteRef.current = null;
    }
  };

  // Default/start stage (idle pose)
  const goToDefault = () => {
    const item = lottieRef.current?.animationItem;
    if (!item) return;
    item.goToAndStop(FRAMES.LOOP_START, true);
  };

  useImperativeHandle(ref, () => ({
    // Begin indefinite flip while waiting for backend
    startWaiting() {
      setGlow(false);
      lastUpRef.current = null;
      waitStartRef.current = Date.now();     // start timer for min spin
      startWaitingLoop();
    },

    // Resolve to H (BTC) or T (TON) and fulfill when it settles
    async resolve(desired) {
      setGlow(false);

      // enforce a minimum “fast-spin” duration (~3–4 flips)
      const elapsed = Date.now() - (waitStartRef.current || 0);
      const remaining = Math.max(0, MIN_WAIT_MS - elapsed);
      if (remaining > 0) {
        await new Promise((r) => setTimeout(r, remaining));
      }

      // now stop the loop and settle to the backend side
      stopWaitingLoop();

      const item = lottieRef.current?.animationItem;
      if (!item) return;

      if (desired === "H") {
        await playSegment(FRAMES.SETTLE_BTC_START, FRAMES.SETTLE_BTC_END, 1.1);
        lastUpRef.current = "H";
        item.goToAndStop(FRAMES.SETTLE_BTC_END, true); // BTC (heads) up
      } else {
        await playSegment(FRAMES.SETTLE_TON_START, FRAMES.SETTLE_TON_END, 1.1);
        lastUpRef.current = "T";
        item.goToAndStop(FRAMES.SETTLE_TON_END, true); // TON (tails) up
      }
    },

    // Stop any animation (used on error)
    stop() {
      stopWaitingLoop();
      const item = lottieRef.current?.animationItem;
      item?.stop();
      setGlow(false);
      lastUpRef.current = null;
    },

    // Win → glow for 5s, then return to default/start stage
    flashWin() {
      setGlow(true);
      setTimeout(() => {
        setGlow(false);
        goToDefault();
      }, 5000);
    },

    // Loss → play grey overlay for the landed face, hold 5s, then return to default/start stage
    async flashLose() {
      setGlow(false);
      const item = lottieRef.current?.animationItem;
      if (!item) return;

      if (lastUpRef.current === "H") {
        await playSegment(FRAMES.BTC_GREY_ON, FRAMES.BTC_GREY_OFF, 1.0);
        item.goToAndStop(FRAMES.BTC_GREY_HOLD, true);
      } else {
        await playSegment(FRAMES.TON_GREY_ON, FRAMES.TON_GREY_OFF, 1.0);
        item.goToAndStop(FRAMES.TON_GREY_HOLD, true);
      }

      setTimeout(() => {
        goToDefault();
      }, 5000);
    },
  }), []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWaitingLoop();
      lottieRef.current?.animationItem?.stop();
    };
  }, []);

  return (
    <div
      className={`relative select-none ${glow ? "coin-win-glow" : ""}`}
      style={{ width: 320, height: 320 }}
      role="img"
      aria-label={ariaFace === "H" ? "Heads (BTC)" : "Tails (TON)"}
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={coinAnim}
        autoplay={false}
        loop={false}
        style={{ width: "100%", height: "100%" }}
        rendererSettings={{ preserveAspectRatio: "xMidYMid meet" }}
      />
      <style>
        {`
          .coin-win-glow {
            filter: drop-shadow(0 0 18px rgba(255, 220, 140, 0.7))
                    drop-shadow(0 0 42px rgba(255, 190, 90, 0.35));
            transition: filter 180ms ease;
          }
        `}
      </style>
    </div>
  );
});

// no-op to keep parity (unused in Lottie mode)
function CoinFace() { return null; }

