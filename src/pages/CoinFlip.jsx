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

// >>> coin faces (adjust paths only if yours differ)
import coinFaceTONColor from "../assets/coin/coin_face_colored_A.png"; // TON (tails) colored
import coinFaceBTCColor from "../assets/coin/coin_face_colored_B.png"; // BTC (heads) colored
import coinFaceTONGrey  from "../assets/coin/coin_face_grey_A.png";    // TON (tails) grey
import coinFaceBTCGrey  from "../assets/coin/coin_face_grey_B.png";    // BTC (heads) grey
// <<<

import flipSound from "../assets/diceRoll.mp3";
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

const STREAK_BOOST_PER_WIN = 0.05;
const BASE_PAYOUT_PCT = 0.90;
const PAYOUT_CAP = 1.0;
const TRAIL_LEN = 10;

export default function Coinflip() {
  // balance
  const [coins, setCoins] = useState(0);

  // game state
  const [bet, setBet] = useState(1);
  const [baseCoef, setBaseCoef] = useState(1.95);
  const [streak, setStreak] = useState(0);
  const [round, setRound] = useState(1);
  const [trail, setTrail] = useState(Array(TRAIL_LEN).fill("?"));
  const [flipping, setFlipping] = useState(false);

  // toast bits (kept for parity)
  const [resultMsg, setResultMsg] = useState("");
  const [toastBody, setToastBody] = useState("");
  const [resultKind, setResultKind] = useState(null);
  const [toastOpen, setToastOpen] = useState(false);

  const [face, setFace] = useState("H"); // semantic only

  // coin animation API ref
  const coinApiRef = useRef(null);

  // coefficient shown
  const effectiveCoef = useMemo(
    () =>
      Number(
        (baseCoef * (1 + STREAK_BOOST_PER_WIN * Math.max(0, streak))).toFixed(2)
      ),
    [baseCoef, streak]
  );

  // EFFECTIVE payout% that will be CREDITED on win
  const effectivePayoutPct = useMemo(() => {
    const boosted = BASE_PAYOUT_PCT * (1 + STREAK_BOOST_PER_WIN * Math.max(0, streak));
    return Math.min(PAYOUT_CAP, Math.max(0.01, Number(boosted)));
  }, [streak]);

  // “Take” bar shows the PROFIT
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
      setFace(landed); // semantic only

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
        background:
          "radial-gradient(120% 120% at 50% 10%, rgb(83,47,255) 0%, rgb(60,1,218) 35%, rgb(39,0,149) 65%, rgb(28,0,113) 100%)",
        backgroundColor: "rgb(28,0,113)"
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
              ch === "?" ? "border-dashed border-white/30" : "border-emerald-400/70"
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
          backgroundColor: "rgb(28,0,113)",
          borderRadius: "8px"
        }}
      >
        <div className="text-left">
          <div className="text-2xl font-bold leading-none">{round}</div>
          <div className="uppercase tracking-wider text-white/60 text-sm">Round</div>
        </div>

        {/* center coin: BG ring masked to circle + coin centered */}
        <div
          className="relative mx-4 flex items-center justify-center"
          style={{ width: "100%", height: 350, isolation: "isolate" }}
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
              backgroundColor: "rgb(28,0,113)",
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
            {/* ABSOLUTE CENTER */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, calc(-50% - 6px)) scale(0.55)",
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
          <div className="uppercase tracking-wider text-white/60 text-sm">Coef</div>
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

      <div style={{ height: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }} />
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

// Minimal TON glyph
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
      <path d="M128 28c-14 0-26 5-36 15L42 93c-14 14-17 36-7 54l78 141c4 7 14 7 18 0l78-141c10-18 7-40-7-54l-50-50c-10-10-22-15-36-15zM76 100l52-52 52 52c8 8 9 21 3 31L128 214 73 131c-6-10-5-23 3-31z" />
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
   IMAGE-BASED COIN (BTC=heads, TON=tails)
   Preserves the same imperative API: startWaiting → resolve → flashWin/flashLose
   ========================================================================= */
const Coin3D = forwardRef(function Coin3D({ ariaFace = "H" }, ref) {
  const coinRef = useRef(null);
  const [glow, setGlow] = useState(false);

  // Which side is greyed right now (null | 'H' | 'T')
  const [greySide, setGreySide] = useState(null);

  // Keep state of waiting + last landed face
  const waitingRef = useRef(false);
  const lastUpRef = useRef(null); // 'H' | 'T'
  const waitStartRef = useRef(0);

  // About ~1.2s at fast speed ≈ 3–4 visible flips
  const MIN_WAIT_MS = 1200;

  // Helpers
  const startSpin = () => {
    waitingRef.current = true;
    waitStartRef.current = Date.now();
    const el = coinRef.current;
    if (!el) return;
    el.style.transition = "none";
    el.style.animation = "coinFlipSpin 300ms linear infinite"; // fast
  };

  const stopSpin = () => {
    waitingRef.current = false;
    const el = coinRef.current;
    if (!el) return;
    el.style.animation = "none";
  };

  // Robust settle with transitionend + fallback timer
  const settleTo = (desired /* 'H' | 'T' */) =>
    new Promise((resolve) => {
      const el = coinRef.current;
      if (!el) return resolve();

      // Freeze current frame so we can transition from it
      const cur = window.getComputedStyle(el).transform;
      el.style.animation = "none";
      el.style.transition = "none";
      el.style.transform = cur === "none" ? el.style.transform || "rotateY(0deg)" : cur;

      // Force reflow
      el.getBoundingClientRect();

      // Now animate to final
      const finalDeg = desired === "H" ? 0 : 180;
      el.style.transition = "transform 420ms cubic-bezier(.2,.8,.2,1)";

      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        el.removeEventListener("transitionend", finish);
        // snap & clean
        el.style.transition = "none";
        el.style.transform = `rotateY(${finalDeg}deg)`;
        resolve();
      };
      el.addEventListener("transitionend", finish, { once: true });

      // Fallback in case transitionend is missed
      setTimeout(finish, 600);

      // Kick it
      requestAnimationFrame(() => {
        el.style.transform = `rotateY(${finalDeg}deg)`;
      });
    });

  const goToDefault = () => {
    // default pose: BTC up (0deg) and no grey
    setGreySide(null);
    const el = coinRef.current;
    if (!el) return;
    el.style.animation = "none";
    el.style.transition = "none";
    el.style.transform = "rotateY(0deg)";
  };

  useImperativeHandle(ref, () => ({
    // Begin indefinite flip while waiting for backend
    startWaiting() {
      setGlow(false);
      setGreySide(null);
      lastUpRef.current = null;
      startSpin();
    },

    // Resolve to H (BTC) or T (TON) and fulfill when it settles
    async resolve(desired) {
      setGlow(false);
      // enforce a minimum fast-spin duration (~3–4 flips)
      const elapsed = Date.now() - (waitStartRef.current || 0);
      const remaining = Math.max(0, MIN_WAIT_MS - elapsed);
      if (remaining > 0) {
        await new Promise((r) => setTimeout(r, remaining));
      }
      stopSpin();
      lastUpRef.current = desired === "T" ? "T" : "H";
      await settleTo(lastUpRef.current);
    },

    // Stop any animation (used on error)
    stop() {
      stopSpin();
      setGlow(false);
      setGreySide(null);
      lastUpRef.current = null;
      goToDefault();
    },

    // Win → glow for 2s, then return to default/start stage
    flashWin() {
      setGreySide(null);
      setGlow(true);
      setTimeout(() => {
        setGlow(false);
        goToDefault();
      }, 2000);
    },

    // Loss → show GREY on the landed face for 2s, then default
    async flashLose() {
      setGlow(false);
      const landed = lastUpRef.current; // 'H' | 'T'
      if (!landed) return;
      setGreySide(landed);
      setTimeout(() => {
        setGreySide(null);
        goToDefault();
      }, 2000);
    },
  }), []);

  return (
    <div
      className={`relative select-none ${glow ? "coin-win-glow" : ""}`}
      style={{ width: 200, height: 200, pointerEvents: "none" }}
      role="img"
      aria-label={ariaFace === "H" ? "Heads (BTC)" : "Tails (TON)"}
    >
      {/* 3D scene */}
      <div className="coin-scene">
        <div className="coin" ref={coinRef}>
          {/* FRONT = BTC / HEADS */}
          <img
            className="coin-face coin-front"
            src={greySide === "H" ? coinFaceBTCGrey : coinFaceBTCColor}
            alt="Bitcoin"
            draggable="false"
          />
          {/* BACK = TON / TAILS */}
          <img
            className="coin-face coin-back"
            src={greySide === "T" ? coinFaceTONGrey : coinFaceTONColor}
            alt="TON"
            draggable="false"
          />
        </div>
      </div>

      <style>
        {`
          .coin-win-glow {
            filter: drop-shadow(0 0 18px rgba(255, 220, 140, 0.7))
                    drop-shadow(0 0 42px rgba(255, 190, 90, 0.35));
            transition: filter 180ms ease;
          }
          .coin-scene {
            width: 100%;
            height: 100%;
            perspective: 1200px;
          }
          .coin {
            position: relative;
            width: 100%;
            height: 100%;
            transform-style: preserve-3d;
            will-change: transform;
          }
          .coin-face {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: contain;
            backface-visibility: hidden;
            image-rendering: auto;
            filter: drop-shadow(0 4px 10px rgba(0,0,0,0.35));
          }
          .coin-front { transform: rotateY(0deg) translateZ(0); }
          .coin-back  { transform: rotateY(180deg) translateZ(0); }

          @keyframes coinFlipSpin {
            0%   { transform: rotateY(0deg); }
            100% { transform: rotateY(360deg); }
          }
        `}
      </style>
    </div>
  );
});

// no-op (kept for parity)
function CoinFace() { return null; }
