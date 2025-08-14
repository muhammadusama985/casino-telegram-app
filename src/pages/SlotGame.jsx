// pages/SlotGame.jsx

import React, { useState } from "react";

export default function SlotGame() {
  const [result, setResult] = useState([]);
  const [balance, setBalance] = useState(100); // example

  const symbols = ["🍒", "🍋", "🔔", "💎", "7️⃣"];

  function spin() {
    const newResult = Array(3)
      .fill(0)
      .map(() => symbols[Math.floor(Math.random() * symbols.length)]);
    setResult(newResult);

    if (newResult[0] === newResult[1] && newResult[1] === newResult[2]) {
      setBalance((prev) => prev + 50); // win
    } else {
      setBalance((prev) => prev - 10); // spin cost
    }
  }

  return (
    <div className="p-5 text-center">
      <h1 className="text-2xl font-bold mb-4">🎰 Slot Machine</h1>
      <div className="text-5xl flex justify-center gap-4">{result}</div>
      <p className="mt-3 text-lg">Balance: {balance} T</p>
      <button onClick={spin} className="mt-5 px-6 py-2 bg-yellow-500 text-black rounded-xl">
        Spin
      </button>
    </div>
  );
}
