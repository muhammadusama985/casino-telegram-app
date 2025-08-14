import { useState } from "react";
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
  const [balance, setBalance] = useState(100);
  const [result, setResult] = useState("");
  const [rolling, setRolling] = useState(false);

  const rollDice = () => {
    if (bet <= 0 || bet > balance) {
      alert("Invalid bet amount.");
      return;
    }

    const rollSound = new Audio(diceRollSound);
    rollSound.play();

    setRolling(true);
    setResult("");

    let rollFrames = 0;
    const rollInterval = setInterval(() => {
      const random = Math.floor(Math.random() * 6) + 1;
      setDice(random);
      rollFrames++;

      if (rollFrames >= 10) {
        clearInterval(rollInterval);

        const final = Math.floor(Math.random() * 6) + 1;
        setDice(final);

        if (guess === final) {
          const winAmount = bet * 5;
          setBalance((prev) => prev + winAmount);
          setResult(`🎉 You Win! +${winAmount}`);
          new Audio(winSound).play();
        } else {
          setBalance((prev) => prev - bet);
          setResult(`❌ You Lose! -${bet}`);
          new Audio(loseSound).play();
        }

        setRolling(false);
      }
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black px-4 py-10 text-white">
      <div className="max-w-xl mx-auto">
        <h1 className="text-4xl font-extrabold mb-6 text-center text-yellow-400">
          🎲 Dice Game
        </h1>

        <div className="text-2xl mb-6 text-center font-mono text-zinc-300">
          Balance: <span className="text-yellow-500">${balance.toFixed(2)}</span>
        </div>

        {/* Inputs */}
        <div className="flex flex-col md:flex-row justify-center items-center gap-6 mb-8">
          <div className="w-full md:w-auto bg-zinc-900/50 backdrop-blur-lg p-4 rounded-xl border border-zinc-700 shadow-inner">
            <label className="block mb-1 text-sm font-semibold text-zinc-300">Bet Amount:</label>
            <input
              type="number"
              min="1"
              value={bet}
              onChange={(e) => setBet(parseInt(e.target.value))}
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
              onChange={(e) => setGuess(parseInt(e.target.value))}
              className="text-black w-full px-3 py-2 rounded bg-white font-bold"
            />
          </div>
        </div>

        {/* Dice Box */}
        <div className={`mb-8 p-6 rounded-xl bg-gradient-to-br from-yellow-900 via-yellow-600 to-amber-500 shadow-xl border border-yellow-400 transition-transform duration-300 ${rolling ? "animate-pulse" : ""}`}>
          <img
            src={diceImages[dice - 1]}
            alt={`Dice ${dice}`}
            className="w-28 h-28 mx-auto rounded-lg shadow-lg"
          />
        </div>

        {/* Roll Button */}
        <div className="text-center">
          <button
            onClick={rollDice}
            disabled={rolling}
            className={`px-6 py-3 rounded-xl font-bold text-lg shadow-md transition-all duration-200 ${
              rolling
                ? "bg-yellow-300 text-black opacity-70 cursor-not-allowed"
                : "bg-yellow-500 hover:bg-yellow-400 text-black"
            }`}
          >
            {rolling ? "Rolling..." : "Roll Dice"}
          </button>
        </div>

        {/* Result */}
        {result && (
          <div
            className={`mt-6 px-6 py-4 text-center rounded-xl font-semibold text-lg ${
              result.includes("Win")
                ? "bg-green-600 text-white shadow-lg"
                : result.includes("Lose")
                ? "bg-red-600 text-white shadow-lg"
                : "bg-zinc-800 text-white"
            }`}
          >
            {result}
          </div>
        )}
      </div>
    </div>
  );
}
