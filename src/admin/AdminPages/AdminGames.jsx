import { useState } from "react";
import { api as adminApi } from "../AdminApi";

export default function AdminGames() {
  // separate state for GLOBAL
  const [globalGame, setGlobalGame] = useState("coinflip");
  const [globalRtp, setGlobalRtp]   = useState("0.90");

  // separate state for PER-USER
  const [userGame, setUserGame] = useState("coinflip");
  const [userRtp, setUserRtp]   = useState("0.90");
  const [userId, setUserId]     = useState("");

  async function saveGlobal() {
    const payload = { scope: "game", game: globalGame, targetRTP: Number(globalRtp) };
    try {
      await adminApi("/admin/rtp", { method: "POST", body: payload });
      alert("Saved!");
    } catch (e) {
      alert(e?.message || "Failed");
    }
  }

  async function saveUser() {
    const payload = {
      scope: "user",
      game: userGame,
      targetRTP: Number(userRtp),
      userId: userId.trim(),
    };
    try {
      await adminApi("/admin/rtp", { method: "POST", body: payload });
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
              value={globalGame}
              onChange={(e) => setGlobalGame(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-gray-100"
            >
              <option value="coinflip">coinflip</option>
              <option value="dice">dice</option>
              <option value="slot">slot</option>
              <option value="crash">crash</option>
            </select>

            <input
              value={globalRtp}
              onChange={(e) => setGlobalRtp(e.target.value)}
              placeholder="0.90"
              className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 w-24 text-gray-100 placeholder-gray-400"
            />

            <button
              onClick={saveGlobal}
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
              value={userGame}
              onChange={(e) => setUserGame(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-gray-100"
            >
              <option value="coinflip">coinflip</option>
              <option value="dice">dice</option>
              <option value="slot">slot</option>
              <option value="crash">crash</option>
            </select>

            <input
              value={userRtp}
              onChange={(e) => setUserRtp(e.target.value)}
              placeholder="0.90"
              className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 w-24 text-gray-100 placeholder-gray-400"
            />

            <button
              onClick={saveUser}
              className="px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500"
            >
              Save
            </button>
          </div>
        </div>
      </div>

      {/* readable native dropdown on dark themes */}
      <style>{`
        select option {
          background-color: #18181b; /* zinc-900 */
          color: #e5e7eb;           /* gray-200 */
        }
      `}</style>
    </div>
  );
}
