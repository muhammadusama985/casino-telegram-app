// src/pages/Dice.jsx
import { useEffect, useState } from "react";
import { games, getBalance, users } from "../api"; // NOTE: users.getUserId()
import diceRollSound from "../assets/diceRoll.mp3";
import winSound from "../assets/win.mp3";
import loseSound from "../assets/lose.mp3";

import dice1 from "../assets/1.jpg";
import dice2 from "../assets/2.jpg";
import dice3 from "../assets/3.jpg";
import dice4 from "../assets/4.jpg";
import dice5 from "../assets/5.jpg";
import dice6 from "../assets/6.jpg";

const diceImages = [dice1, dice2, dice3, dice4, dice5, dice6];

export default function Dice() {
  const [dice, setDice] = useState(1);
  const [guess, setGuess] = useState(1);
  const [bet, setBet] = useState(1);
  const [balance, setBalance] = useState(0);   // ← will be fetched
  const [result, setResult] = useState("");
  const [rolling, setRolling] = useState(false);

  // --- wait for login (userId), then fetch; also react to balance:refresh ---
  useEffect(() => {
    let alive = true;

    const fetchBalance = async () => {
      try {
        const c = await getBalance();          // returns Number (your fn)
        if (alive && Number.isFinite(c)) setBalance(c);
      } catch {
        // ignore (e.g., network hiccup); we'll get it on next refresh or bet
      }
    };

    (async function waitForLoginThenFetch() {
      // poll until MainLayout's telegramAuth() has written userId
      let tries = 0;
      while (alive && !users.getUserId()) {
        await new Promise(r => setTimeout(r, 250));
        if (++tries > 80) break; // ~20s max guard
      }
      if (!alive) return;
      await fetchBalance();
    })();

    const onRefresh = () => fetchBalance();
    window.addEventListener("balance:refresh", onRefresh);
    return () => {
      alive = false;
      window.removeEventListener("balance:refresh", onRefresh);
    };
  }, []);

  // helpers
  const toInt = (v, min, max) => {
    const n = Math.floor(Number(v || 0));
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max ?? n, n));
  };

  const rollDice = async () => {
    const stake = toInt(bet, 1);
    const pick = toInt(guess, 1, 6);
    if (stake <= 0) return alert("Enter a valid bet (>= 1).");
    if (pick < 1 || pick > 6) return alert("Your guess must be 1–6.");
    if (balance < stake) return alert("Not enough coins.");

    setResult("");
    setRolling(true);

    try { new Audio(diceRollSound).play().catch(() => {}); } catch {}

    // quick spin while waiting for server
    let frames = 0;
    const spin = setInterval(() => {
      setDice(Math.floor(Math.random() * 6) + 1);
      if (++frames >= 10) clearInterval(spin);
    }, 90);

    try {
      // SERVER decides outcome & updates balance
      const res = await games.dice(stake, pick); // -> { result, payout, newBalance, details.roll, ... }
      try { clearInterval(spin); } catch {}

      const final = Number(res?.details?.roll) || Math.floor(Math.random() * 6) + 1;
      setDice(final);

      if (Number.isFinite(res?.newBalance)) setBalance(res.newBalance);

      if (res?.result === "win") {
        setResult(`🎉 You Win! +${res.payout}`);
        try { new Audio(winSound).play().catch(() => {}); } catch {}
      } else {
        setResult(`❌ You Lose! -${stake}`);
        try { new Audio(loseSound).play().catch(() => {}); } catch {}
      }

      // let the header update too
      window.dispatchEvent(new Event("balance:refresh"));
    } catch (e) {
      const msg = String(e?.message || "");
      if (msg.includes("insufficient-funds")) alert("Not enough coins.");
      else if (msg.includes("min-stake")) alert("Bet is below minimum.");
      else if (msg.includes("max-stake")) alert("Bet exceeds maximum.");
      else alert("Bet failed. Try again.");
    } finally {
      setRolling(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black px-4 py-10 text-white">
      <div className="max-w-xl mx-auto">
        <h1 className="text-4xl font-extrabold mb-6 text-center text-yellow-400">🎲 Dice Game</h1>

        <div className="text-2xl mb-6 text-center font-mono text-zinc-300">
          Balance: <span className="text-yellow-500">{Number(balance).toFixed(0)} COIN</span>
        </div>

        {/* Inputs */}
        <div className="flex flex-col md:flex-row justify-center items-center gap-6 mb-8">
          <div className="w-full md:w-auto bg-zinc-900/50 backdrop-blur-lg p-4 rounded-xl border border-zinc-700 shadow-inner">
            <label className="block mb-1 text-sm font-semibold text-zinc-300">Bet (coins):</label>
            <input
              type="number"
              min="1"
              value={bet}
              onChange={(e) => setBet(toInt(e.target.value, 1))}
              className="text-black w-full px-3 py-2 rounded bg-white font-bold"
            />
          </div>

          <div className="w-full md:w-auto bg-zinc-900/50 backdrop-blur-lg p-4 rounded-xl border border-zinc-700 shadow-inner">
            <label className="block mb-1 text-sm font-semibold text-zinc-300">Your Guess (1–6):</label>
            <input
              type="number"
              min="1"
              max="6"
              value={guess}
              onChange={(e) => setGuess(toInt(e.target.value, 1, 6))}
              className="text-black w-full px-3 py-2 rounded bg-white font-bold"
            />
          </div>
        </div>

        {/* Dice Box */}
        <div className={`mb-8 p-6 rounded-xl bg-gradient-to-br from-yellow-900 via-yellow-600 to-amber-500 shadow-xl border border-yellow-400 transition-transform duration-300 ${rolling ? "animate-pulse" : ""}`}>
          <img src={diceImages[dice - 1]} alt={`Dice ${dice}`} className="w-28 h-28 mx-auto rounded-lg shadow-lg" />
        </div>

        {/* Roll Button */}
        <div className="text-center">
          <button
            onClick={rollDice}
            disabled={rolling}
            className={`px-6 py-3 rounded-xl font-bold text-lg shadow-md transition-all duration-200 ${
              rolling ? "bg-yellow-300 text-black opacity-70 cursor-not-allowed" : "bg-yellow-500 hover:bg-yellow-400 text-black"
            }`}
          >
            {rolling ? "Rolling..." : "Roll Dice"}
          </button>
        </div>

        {/* Result */}
        {result && (
          <div
            className={`mt-6 px-6 py-4 text-center rounded-xl font-semibold text-lg ${
              result.includes("Win") ? "bg-green-600 text-white shadow-lg" :
              result.includes("Lose") ? "bg-red-600 text-white shadow-lg" :
              "bg-zinc-800 text-white"
            }`}
          >
            {result}
          </div>
        )}
      </div>
    </div>
  );
}
