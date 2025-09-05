// --- CoinLottie.jsx (or inline above Coinflip component) ---
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import Lottie from "lottie-react";

import coinAnim from "../assets/lottie/Flip_coin.json";
import bgAnim from "../assets/lottie/Flipcoin_background.json";

/**
 * CoinLottie matches the Coin3D API:
 *  - startWaiting(): loop the coin animation while backend is pending
 *  - resolve(desired): play a short settle and resolve; returns a Promise that fulfills when done
 *  - stop(): stop any animation immediately
 *
 * Notes:
 *  - If your Lottie has segment markers for Heads/Tails, you can plug them in where noted.
 *  - Otherwise we emulate: loop while waiting, then play ~1.1s settle and stop.
 */
const CoinLottie = forwardRef(function CoinLottie({ ariaFace = "H" }, ref) {
  const coinRef = useRef(null);
  const bgRef = useRef(null);

  const [loop, setLoop] = useState(false);
  const [play, setPlay] = useState(false);        // autoplay toggle
  const [speed, setSpeed] = useState(1);          // playback speed
  const [key, setKey] = useState(0);              // force remount to restart

  // ensure paused on first render
  useEffect(() => { setPlay(false); setLoop(false); }, []);

  useImperativeHandle(ref, () => ({
    startWaiting() {
      // restart from frame 0, set loop
      setKey((k) => k + 1);
      setSpeed(1);
      setLoop(true);
      setPlay(true);
    },
    resolve(desired /* "H" or "T" */) {
      // stop looping, play a short one-shot settle, then stop.
      // If your JSON has segment markers, you can do:
      //   coinRef.current?.playSegments([startFrameForH, endFrameForH], true);
      // or tails segment for "T".
      setLoop(false);
      setSpeed(1.1 + Math.random() * 0.3);
      // kick a one-shot play by remounting and auto-playing once
      setKey((k) => k + 1);
      setPlay(true);

      // resolve after ~1.1–1.4s (matches your old Coin3D settle)
      const durationMs = 1100 + Math.floor(Math.random() * 300);
      return new Promise((res) => setTimeout(() => {
        // pause on last frame
        try { coinRef.current?.pause(); } catch {}
        setPlay(false);
        res();
      }, durationMs));
    },
    stop() {
      try { coinRef.current?.stop(); } catch {}
      setPlay(false);
      setLoop(false);
    },
  }), []);

  return (
    <div
      className="relative"
      style={{ width: 160, height: 160 }}  // same footprint as your old coin
      role="img"
      aria-label={ariaFace === "H" ? "Heads" : "Tails"}
    >
      {/* Background FX (optional) */}
      <Lottie
        key={`bg-${key}`}
        lottieRef={bgRef}
        animationData={bgAnim}
        loop={loop}
        autoplay={play && loop}
        style={{
          position: "absolute",
          inset: 0,
          transform: "scale(0.9)", // keep subtle behind coin
          pointerEvents: "none",
        }}
      />

      {/* Coin */}
      <Lottie
        key={`coin-${key}`}
        lottieRef={coinRef}
        animationData={coinAnim}
        loop={loop}
        autoplay={play}
        speed={speed}
        style={{
          position: "absolute",
          inset: 0,
          // Fit the large 1080×1920 animation inside 160×160:
          transformOrigin: "center",
          objectFit: "contain",
        }}
      />
    </div>
  );
});

export default CoinLottie;
