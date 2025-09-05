// src/components/CoinLottie.jsx
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import Lottie from "lottie-react";
import animationData from "../assets/Flip_coin.json"; // put your JSON here

/**
 * Drop-in replacement for Coin3D with the same imperative API:
 *   - startWaiting(): loop the motion while backend resolves
 *   - resolve(desired): play a single settle motion, Promise resolves when done
 *   - stop(): stop/pause any animation
 *
 * We only change the MOTION to your Lottie file; layout/footprint stays identical.
 */
const CoinLottie = forwardRef(function CoinLottie({ ariaFace = "H" }, ref) {
  const lottieRef = useRef(null);
  const doneResolverRef = useRef(null);
  const [loop, setLoop] = useState(false);
  const [play, setPlay] = useState(false);

  // helper: safely stop and clear any "resolve" promise
  function clearPendingResolve() {
    if (doneResolverRef.current) {
      doneResolverRef.current();
      doneResolverRef.current = null;
    }
  }

  useImperativeHandle(ref, () => ({
    startWaiting() {
      clearPendingResolve();
      setLoop(true);
      setPlay(true);
      // restart from frame 0 for a clean loop
      try { lottieRef.current?.goToAndPlay(0, true); } catch {}
    },
    resolve(/* desired: 'H' | 'T' */) {
      // We stop looping and play one clean settle animation
      // (Lottie file doesn’t expose labeled segments, so we use full motion once.)
      setLoop(false);
      setPlay(true);
      try {
        // Begin from start for a deterministic settle
        lottieRef.current?.stop();
        lottieRef.current?.goToAndPlay(0, true);
      } catch {}
      return new Promise((resolve) => {
        doneResolverRef.current = resolve;
      });
    },
    stop() {
      clearPendingResolve();
      setPlay(false);
      try { lottieRef.current?.stop(); } catch {}
    },
  }), []);

  // Resolve promise when animation naturally completes (non-looping)
  useEffect(() => {
    if (!loop && play) {
      const id = setInterval(() => {
        const inst = lottieRef.current;
        if (!inst) return;
        const total = inst?.getDuration(true) ?? 0;     // frames
        const frame = inst?.getCurrentFrame?.() ?? 0;   // current frame
        // If we’re near the end, finish and resolve once
        if (total && frame >= total - 1) {
          clearInterval(id);
          setPlay(false);
          if (doneResolverRef.current) {
            const done = doneResolverRef.current;
            doneResolverRef.current = null;
            done();
          }
        }
      }, 30);
      return () => clearInterval(id);
    }
  }, [loop, play]);

  return (
    <div
      className="relative mx-4 flex items-center justify-center"
      style={{ width: 160, height: 160 }}
      role="img"
      aria-label={ariaFace === "H" ? "Heads" : "Tails"}
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={animationData}
        loop={loop}
        autoplay={false}
        style={{ width: 160, height: 160, pointerEvents: "none" }}
      />
    </div>
  );
});

export default CoinLottie;
