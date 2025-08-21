// // src/pages/Coinflip.jsx
// import { useEffect, useMemo, useState } from "react";
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
//     setFace(side); // show chosen side while flipping
//     try { new Audio(flipSound).play().catch(() => {}); } catch {}

//     try {
//       // IMPORTANT: send streak so backend boosts payout (and credits more on win)
//     const res = await games.coinflip(stake, side === "H" ? "H" : "T", { streak });


//       // sync default coef from engine if provided (optional)
//       const m = Number(res?.details?.m);
//       if (Number.isFinite(m) && m > 0) setBaseCoef(m);

//       const landed = (res?.details?.landed === "T") ? "T" : "H";
//       setFace(landed);

//       if (Number.isFinite(res?.newBalance)) {
//         setCoins((prev) => (res.newBalance !== prev ? res.newBalance : prev));
//       }

//       setRound((r) => r + 1);

//       if (res?.result === "win") {
//         // put H/T into trail and grow streak
//         setTrail((prev) => [landed, ...prev].slice(0, TRAIL_LEN));
//         setStreak((s) => s + 1);

//         // Backend returns profit-only in res.payout (decimal-safe); show exactly that
//         const profit = Number(res?.payout || 0);
//         const msg = `🎉 You Win! +${fmt(profit)}`;
//         setResultMsg(msg);
//         try { new Audio(winSound).play().catch(() => {}); } catch {}
//         alert(msg);
//       } else {
//         // loss → reset streak (UI coef returns to base), clear trail
//         setStreak(0);
//         setTrail(Array(TRAIL_LEN).fill("?"));

//         const msg = `❌ You Lose! -${fmt(stake)}`;
//         setResultMsg(msg);
//         try { new Audio(loseSound).play().catch(() => {}); } catch {}
//         alert(msg);
//       }

//       window.dispatchEvent(new Event("balance:refresh"));
//     } catch (e) {
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
//         <div className="text-sm">
//           <span className="opacity-70 mr-2">Coins: </span>
//           <span className="font-bold">{formatCoins(coins)}</span>
//         </div>
//       </div>

//       {/* top bubbles */}
//       <div className="flex items-center justify-center gap-3 px-4 pt-2">
//         {trail.map((ch, i) => (
//           <div
//             key={i}
//             className={`w-8 h-8 rounded-full border-2 ${ch === "?" ? "border-dashed border-white/30" : "border-emerald-400/70"} flex items-center justify-center text-sm`}
//           >
//  <span className={`${ch === "?" ? "opacity-80" : "font-bold"}`}>
//    {ch === "?" ? "?" : ch === "T" ? "€" : "$"}
//  </span>          </div>
//         ))}
//       </div>

//       {/* coin + coef */}
//       <div className="flex items-center justify-between px-6 mt-4">
//         <div className="text-left">
//           <div className="text-2xl font-bold leading-none">{round}</div>
//           <div className="uppercase tracking-wider text-white/60 text-sm">Round</div>
//         </div>

//         {/* center coin: $ for H, € for T */}
//         <div
//           className={`relative w-40 h-40 rounded-full mx-4 flex items-center justify-center transition-transform duration-500 ${
//             flipping ? "animate-spin-slow" : ""
//           }`}
//           style={{
//             boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
//             background:
//               "radial-gradient(60% 60% at 50% 40%, #FFD76A 0%, #FFA928 55%, #E37B00 100%)",
//           }}
//         >
//           <div className="w-28 h-28 rounded-full bg-white/15 flex items-center justify-center">
//             <div className="text-5xl font-black text-[#FFDF86] drop-shadow-[0_2px_0_rgba(0,0,0,0.4)]">
//               {face === "T" ? "€" : "$"}
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
//               <span className="ml-2 opacity-60">1WT</span>
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
//                 {fmt(potentialProfit)} <span className="opacity-70">1WT</span>
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

//       <style>{`
//         @keyframes spin-slow { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }
//         .animate-spin-slow { animation: spin-slow 0.9s linear infinite; }
//       `}</style>
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


// src/pages/Coinflip.jsx
import { useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { telegramAuth, getBalance, games } from "../api";

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
  const [face, setFace] = useState("H"); // H->$, T->€

  // coin animation API ref
  const coinApiRef = useRef(null);

  // coefficient shown: base when no streak; boosted when streak > 0
  const effectiveCoef = useMemo(
    () => Number((baseCoef * (1 + STREAK_BOOST_PER_WIN * Math.max(0, streak))).toFixed(2)),
    [baseCoef, streak]
  );

  // EFFECTIVE payout% that will be CREDITED on win (matches backend: 0.90 * (1 + 0.05*streak), capped)
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
    setFace(side); // show chosen side while flipping
    try { new Audio(flipSound).play().catch(() => {}); } catch {}

    // START: spin while waiting (non-deterministic show)
    try { coinApiRef.current?.flip(null); } catch {}

    try {
      // IMPORTANT: send streak so backend boosts payout (and credits more on win)
      const res = await games.coinflip(stake, side === "H" ? "H" : "T", { streak });

      // sync default coef from engine if provided (optional)
      const m = Number(res?.details?.m);
      if (Number.isFinite(m) && m > 0) setBaseCoef(m);

      const landed = (res?.details?.landed === "T") ? "T" : "H";
      setFace(landed);

      // RESOLVE: deterministic finish to the server result
      try { coinApiRef.current?.flip(landed); } catch {}

      if (Number.isFinite(res?.newBalance)) {
        setCoins((prev) => (res.newBalance !== prev ? res.newBalance : prev));
      }

      setRound((r) => r + 1);

      if (res?.result === "win") {
        // put H/T into trail and grow streak
        setTrail((prev) => [landed, ...prev].slice(0, TRAIL_LEN));
        setStreak((s) => s + 1);

        // Backend returns profit-only in res.payout (decimal-safe); show exactly that
        const profit = Number(res?.payout || 0);
        const msg = `🎉 You Win! +${fmt(profit)}`;
        setResultMsg(msg);
        try { new Audio(winSound).play().catch(() => {}); } catch {}
        alert(msg);
      } else {
        // loss → reset streak (UI coef returns to base), clear trail
        setStreak(0);
        setTrail(Array(TRAIL_LEN).fill("?"));

        const msg = `❌ You Lose! -${fmt(stake)}`;
        setResultMsg(msg);
        try { new Audio(loseSound).play().catch(() => {}); } catch {}
        alert(msg);
      }

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

  return (
    <div className="min-h-screen bg-[#0B1020] text-white flex flex-col items-stretch">
      {/* Coins header (match Dice) */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="text-sm">
          <span className="opacity-70 mr-2">Coins: </span>
          <span className="font-bold">{formatCoins(coins)}</span>
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

        {/* center coin replaced with 3D CSS coin (keeps same size footprint) */}
        <div className="relative mx-4 flex items-center justify-center" style={{ width: 160, height: 160 }}>
          <Coin3D ref={coinApiRef} ariaFace={face} />
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
              <span className="ml-2 opacity-60">1WT</span>
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
                {fmt(potentialProfit)} <span className="opacity-70">1WT</span>
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

/* ===================== 3D CSS COIN ===================== */
/* Minimal, component-scoped version of the previously shared coin */
const Coin3D = forwardRef(function Coin3D({ ariaFace = "H" }, ref) {
  const coinRef = useRef(null);

  useImperativeHandle(ref, () => ({
    /**
     * Flip the coin.
     * desired: 'H' | 'T' | null
     *   - null => random-looking spin (used while waiting for server)
     *   - 'H' or 'T' => deterministic finish to that side
     */
    flip(desired = null) {
      const el = coinRef.current;
      if (!el) return;

      // choose spins and final side
      const spins = Math.floor(5 + Math.random() * 5); // 5–9 full turns
      const yawStart = (Math.random() * 18 - 9).toFixed(2) + "deg";
      const yawEnd = (Math.random() * 32 - 16).toFixed(2) + "deg";
      const duration = Math.floor(1100 + Math.random() * 500); // 1.1–1.6s

      const half = desired
        ? desired === "T" ? 0.5 : 0
        : Math.random() < 0.5 ? 0 : 0.5; // 0=heads, 0.5=tails

      el.style.setProperty("--spins", String(spins));
      el.style.setProperty("--half", String(half));
      el.style.setProperty("--duration", duration + "ms");
      el.style.setProperty("--yawStart", yawStart);
      el.style.setProperty("--yawEnd", yawEnd);

      el.classList.remove("coinflip-anim");
      // reflow to restart animation
      // eslint-disable-next-line no-unused-expressions
      el.offsetWidth;
      el.classList.add("coinflip-anim");
    },
  }), []);

  return (
    <div className="coinflip-scene" style={{ perspective: "1200px" }}>
      <div
        ref={coinRef}
        className="coinflip-coin"
        role="img"
        aria-label={ariaFace === "H" ? "Heads" : "Tails"}
        style={{
          // size/thickness tuned to your 160×160 slot
          ['--size']: '160px',
          ['--thickness']: '12px',
        }}
      >
        <div className="coinflip-face coinflip-front"><CoinFace symbol="$" front /></div>
        <div className="coinflip-face coinflip-back"><CoinFace symbol="€" /></div>
        <div className="coinflip-shadow" aria-hidden />
      </div>

      {/* Styles local to coin */}
      <style>{`
        :root {
          --coin-gold-1: #f4e3b1;
          --coin-gold-2: #d9ba73;
          --coin-gold-3: #b7913a;
          --coin-gold-4: #8e6b24;
        }

        .coinflip-coin {
          width: var(--size);
          height: var(--size);
          position: relative;
          transform-style: preserve-3d;
          user-select: none;
        }
        .coinflip-coin.coinflip-anim {
          animation: coinflip-spin var(--duration) cubic-bezier(.2,.7,.2,1) forwards;
        }
        @keyframes coinflip-spin {
          0% {
            transform:
              rotateX(0turn)
              rotateY(var(--yawStart))
              rotateZ(0deg);
          }
          100% {
            transform:
              rotateX(calc((var(--spins) + var(--half)) * 1turn))
              rotateY(var(--yawEnd))
              rotateZ(3deg);
          }
        }

        .coinflip-face {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          backface-visibility: hidden;
          display: grid;
          place-items: center;
          overflow: hidden;
          box-shadow: 0 2px 1px rgba(0,0,0,.25) inset,
                      0 10px 24px rgba(0,0,0,.35);
        }
        .coinflip-front {
          background: radial-gradient(circle at 35% 30%, rgba(255,255,255,.45), rgba(255,255,255,0) 40%),
                      radial-gradient(circle at 65% 70%, rgba(0,0,0,.18), rgba(0,0,0,0) 60%),
                      linear-gradient(135deg, var(--coin-gold-1), var(--coin-gold-2) 38%, var(--coin-gold-3) 62%, var(--coin-gold-4));
          transform: translateZ(calc(var(--thickness) / 2));
        }
        .coinflip-back {
          background: radial-gradient(circle at 65% 30%, rgba(255,255,255,.35), rgba(255,255,255,0) 40%),
                      radial-gradient(circle at 35% 70%, rgba(0,0,0,.22), rgba(0,0,0,0) 60%),
                      linear-gradient(225deg, var(--coin-gold-1), var(--coin-gold-2) 38%, var(--coin-gold-3) 62%, var(--coin-gold-4));
          transform: rotateX(180deg) translateZ(calc(var(--thickness) / 2));
        }
        /* ridged edge illusion */
        .coinflip-coin::before {
          content: "";
          position: absolute;
          inset: 2.5%;
          border-radius: 50%;
          background: repeating-conic-gradient(
            from 0deg,
            rgba(0,0,0,.18) 0deg 6deg,
            rgba(255,255,255,.18) 6deg 12deg
          );
          filter: blur(.3px);
          transform: translateZ(calc(var(--thickness) * -0.5));
          opacity: .45;
          pointer-events: none;
        }
        .coinflip-shadow {
          position: absolute;
          left: 50%;
          bottom: -22%;
          width: 60%;
          height: 16%;
          transform: translateX(-50%);
          background: radial-gradient(ellipse at center, rgba(0,0,0,.35), rgba(0,0,0,0));
          filter: blur(4px);
          opacity: .7;
          pointer-events: none;
        }

        @media (prefers-reduced-motion: reduce) {
          .coinflip-coin.coinflip-anim { animation-duration: 0.01ms; }
        }
      `}</style>
    </div>
  );
});

function CoinFace({ symbol = "$", front = false }) {
  return (
    <div
      className="rounded-full grid place-items-center"
      style={{
        width: "78%",
        height: "78%",
        border: "2px solid rgba(255,255,255,.35)",
        boxShadow: "0 0 0 6px rgba(0,0,0,.12) inset",
        background: front
          ? "radial-gradient(circle at 40% 35%, rgba(255,255,255,.8), rgba(255,255,255,0) 55%)"
          : "radial-gradient(circle at 60% 65%, rgba(255,255,255,.8), rgba(255,255,255,0) 55%)",
      }}
    >
      <span
        style={{
          fontSize: "clamp(36px, 8vw, 64px)",
          fontWeight: 800,
          letterSpacing: "2px",
          textShadow: "0 2px 2px rgba(0,0,0,.35)",
          color: "#FFDF86",
        }}
      >
        {symbol}
      </span>
    </div>
  );
}
