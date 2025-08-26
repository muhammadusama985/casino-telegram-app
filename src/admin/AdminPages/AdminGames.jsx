import { useState } from "react";
import { adminRTP } from "../AdminApi"; // ⬅️ use the dedicated RTP API

export default function AdminGames() {
  const [game, setGame] = useState("coinflip");
  const [rtp, setRtp] = useState("0.90");
  const [userId, setUserId] = useState("");

  async function save(scope) {
    // validate RTP
    const r = Number(rtp);
    if (!Number.isFinite(r) || r < 0.5 || r > 0.99) {
      alert("Enter a valid RTP between 0.50 and 0.99");
      return;
    }

    try {
      if (scope === "user") {
        const uid = userId.trim();
        if (!uid) {
          alert("Enter a User ID for per-user RTP");
          return;
        }
        await adminRTP.setUser(uid, game, r);
      } else {
        await adminRTP.setGlobal(game, r);
      }
      alert("Saved!");
    } catch (e) {
      alert(e?.message || "Failed");
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Game Settings / RTP</h1>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Global RTP */}
        <div className="rounded-xl border border-zinc-800 p-4 space-y-3">
          <h2 className="font-semibold">Global RTP</h2>
          <div className="flex gap-2">
            <select
              value={game}
              onChange={(e) => setGame(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-gray-100"
            >
              <option value="coinflip">coinflip</option>
              <option value="dice">dice</option>
              <option value="slot">slot</option>
              <option value="crash">crash</option>
            </select>

            <input
              value={rtp}
              onChange={(e) => setRtp(e.target.value)}
              placeholder="0.90"
              className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 w-24 text-gray-100 placeholder-gray-400"
            />

            <button
              onClick={() => save("game")}
              className="px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500"
            >
              Save
            </button>
          </div>
        </div>

        {/* Per-user RTP */}
        <div className="rounded-xl border border-zinc-800 p-4 space-y-3">
          <h2 className="font-semibold">Per-user RTP</h2>

          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="User ID"
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-gray-100 placeholder-gray-400"
          />

          <div className="flex gap-2">
            <select
              value={game}
              onChange={(e) => setGame(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-gray-100"
            >
              <option value="coinflip">coinflip</option>
              <option value="dice">dice</option>
              <option value="slot">slot</option>
              <option value="crash">crash</option>
            </select>

            <input
              value={rtp}
              onChange={(e) => setRtp(e.target.value)}
              placeholder="0.90"
              className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 w-24 text-gray-100 placeholder-gray-400"
            />

            <button
              onClick={() => save("user")}
              className="px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500"
            >
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Make the native dropdown menu readable on dark themes */}
      <style>{`
        select option {
          background-color: #18181b; /* zinc-900 */
          color: #e5e7eb;           /* gray-200 */
        }
      `}</style>
    </div>
  );
}
