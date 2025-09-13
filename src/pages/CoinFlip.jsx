// src/pages/Coinflip.jsx
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { telegramAuth, getBalance, games } from "../api";

import Lottie from "lottie-react";
import bgAnim from "../assets/lottie/Flipcoin_background.json"; // looping ring
import coinAnim from "../assets/lottie/Flipcoin.json";          // coin lottie

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
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
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

  // toast bits (kept for parity even if you don't show them)
  const [resultMsg, setResultMsg] = useState("");
  const [toastBody, setToastBody] = useState("");
  const [resultKind, setResultKind] = useState(null);   // 'win' | 'lose' | null
  const [toastOpen, setToastOpen] = useState(false);

  const [face, setFace] = useState("H"); // semantic only (H → BTC, T → TON)

  // coin animation API ref
  const coinApiRef = useRef(null);

  // coefficient shown: base when no streak; boosted when streak > 0
  const effectiveCoef = useMemo(
    () =>
      Number(
        (baseCoef * (1 + STREAK_BOOST_PER_WIN * Math.max(0, streak))).toFixed(
          2
        )
      ),
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
      setFace(landed); // Set landed side immediately (either H or T)

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
        // WIN visual (glow 2s, then default frame)
        coinApiRef.current?.flashWin();
        try { new Audio(winSound).play().catch(() => {}); } catch {}
      } else {
        setStreak(0);
        setTrail(Array(TRAIL_LEN).fill("?"));

        setResultMsg("Oops! You lost 😕");
        setToastBody(`-${fmt(stake)} has been deducted from your balance.`);
        setResultKind("lose");
        // LOSS visual (grey 2s, then default frame)
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
    <div
      className="min-h-screen text-white flex flex-col items-stretch"
      style={{
        // full-screen gradient matched to the outer ring
        background:
          "radial-gradient(120% 120% at 50% 10%, rgb(83,47,255) 0%, rgb(60,1,218) 35%, rgb(39,0,149) 65%, rgb(28,0,113) 100%)",
        backgroundColor: "rgb(28,0,113)" // solid fallback to the outer rim color,
      }}
    >
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
            className={`w-8 h-8 rounded-full border-2 ${
              ch === "?"
                ? "border-dashed border-white/30"
                : "border-emerald-400/70"
            } flex items-center justify-center text-sm`}
          >
            <span className={`${ch === "?" ? "opacity-80" : "font-bold"}`}>
              {ch === "?" ? "?" : ch === "T" ? "€" : "$"}
            </span>
          </div>
        ))}
      </div>

      {/* coin + coef */}
      <div
        className="flex items-center justify-between px-6 mt-4 p-4"
        style={{ 
          background:
            "radial-gradient(120% 120% at 50% 10%, rgb(83,47,255) 0%, rgb(60,1,218) 35%, rgb(39,0,149) 65%, rgb(28,0,113) 100%)",
          backgroundColor: "rgb(28,0,113)", // solid fallback to the outer rim color
          borderRadius: "8px"
        }}
      >
        <div className="text-left">
          <div className="text-2xl font-bold leading-none">{round}</div>
          <div className="uppercase tracking-wider text-white/60 text-sm">
            Round
          </div>
        </div>

        {/* center coin: BG ring masked to circle + coin centered */}
        <div
          className="relative mx-4 flex items-center justify-center"
          style={{ width: "100%", height: 400, isolation: "isolate" }}
        >
          {/* Masked circle wrapper so the Lottie never overflows or shows a slab */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              overflow: "hidden",
              background:
                "radial-gradient(120% 120% at 50% 10%, rgb(83,47,255) 0%, rgb(60,1,218) 35%, rgb(39,0,149) 65%, rgb(28,0,113) 100%)",
              backgroundColor: "rgb(28,0,113)", // solid fallback to the outer rim color
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
              zIndex: 1,
              pointerEvents: "none",
            }}
          >
            {/* ABSOLUTE CENTER: ensures perfect center inside the ring */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, calc(-50% - 6px)) scale(0.95)",
                transformOrigin: "center",
              }}
            >
              <Coin3D ref={coinApiRef} ariaFace={face} />
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-extrabold leading-none">
            x{effectiveCoef.toFixed(2)}
          </div>
          <div className="uppercase tracking-wider text-white/60 text-sm">
            Coef
          </div>
        </div>
      </div>

      {/* choose H/T — force on top of any animation layers */}
      <div className="px-4 mt-6 grid grid-cols-2 gap-3 relative z-20">
        <button
          disabled={flipping}
          onClick={() => placeBet("H")}
          className={`rounded-2xl px-4 py-4 bg-[#23293B] text-left shadow-inner border border-white/10 ${
            flipping ? "opacity-60 cursor-not-allowed" : "active:scale-[0.98]"
          }`}
          style={{
            // Glassmorphism
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))",
            border: "1px solid rgba(255,255,255,0.18)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.18), 0 10px 28px rgba(0,0,0,0.40), 0 1px 0 rgba(255,255,255,0.06)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            transition: "transform 120ms ease, box-shadow 200ms ease, background 200ms ease",
          }}
        >
          <div className="flex items-center gap-3">
            <MiniCoin symbol="₿" />
            <span className="text-lg font-semibold tracking-wide">HEADS</span>
          </div>
        </button>
        <button
          disabled={flipping}
          onClick={() => placeBet("T")}
          className={`rounded-2xl px-4 py-4 bg-[#23293B] text-left shadow-inner border border-white/10 ${
            flipping ? "opacity-60 cursor-not-allowed" : "active:scale-[0.98]"
          }`}
          style={{
            // Glassmorphism
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))",
            border: "1px solid rgba(255,255,255,0.18)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.18), 0 10px 28px rgba(0,0,0,0.40), 0 1px 0 rgba(255,255,255,0.06)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            transition: "transform 120ms ease, box-shadow 200ms ease, background 200ms ease",
          }}
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
              onClick={() =>
                setBet((b) => Math.max(1, Math.floor(Number(b || 0)) - 1))
              }
              className="w-12 h-12 min-w-[44px] min-h-[44px] rounded-lg text-2xl leading-none hover:bg-white/5 active:scale-95"
            >
              −
            </button>

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
              onClick={() =>
                setBet((b) => Math.max(1, Math.floor(Number(b || 0)) + 1))
              }
              className="w-12 h-12 min-w-[44px] min-h-[44px] rounded-lg text-2xl leading-none hover:bg-white/5 active:scale-95"
            >
              +
            </button>
          </div>

          <div className="mt-4">
            <div
              className="w-full rounded-xl py-3 text-center font-semibold"
              style={{
                background:
                  "linear-gradient(90deg, rgba(255,165,0,0.25) 0%, rgba(255,120,0,0.35) 100%)",
              }}
            >
              <div className="text-lg">{fmt(potentialProfit)}</div>
              <div className="text-sm opacity-60 -mt-1">Take</div>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{ height: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}
      />
    </div>
  );
}

/* ===== UI bits ===== */
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
      <path d="M128 28c-14 0-26 5-36 15L42 93c-14 14-17 36-7 54l78 141c4 7 14 7 18 0l78-141c10-18 7-40-7-54l-50-50c-10-10-22-15-36-15zM76 100l52-52 52 52c8 8 9 21 3 31L128 214 73 131c-6-10-5-23 3-31z" />
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
        <path
          d="M15 18l-6-6 6-6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
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

  useImperativeHandle(
    ref,
    () => ({
      // Begin indefinite flip while waiting for backend
      startWaiting() {
        setGlow(false);
        lastUpRef.current = null;
        waitStartRef.current = Date.now(); // start timer for min spin
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

      // Win → glow for 2s, then return to default/start stage
      flashWin() {
        setGlow(true);
        setTimeout(() => {
          setGlow(false);
          goToDefault();
        }, 2000);
      },

      // Loss → play grey overlay for the landed face, hold 2s, then return
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
        }, 2000);
      },
    }),
    []
  );

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
      // coin size (kept large)
      style={{ width: 380, height: 380 }}
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
function CoinFace() {
  return null;
}
