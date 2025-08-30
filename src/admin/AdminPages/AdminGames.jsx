// src/admin/AdminPages/AdminGames.jsx
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
    <div className="relative space-y-4 bg-black text-yellow-300">
      {/* Background gold glows (visual only) */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-32 h-[36rem] w-[36rem] rounded-full blur-3xl opacity-15 bg-[radial-gradient(closest-side,rgba(250,204,21,0.35),transparent)] motion-safe:animate-[pulse_3.5s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-8rem] right-[-8rem] h-[32rem] w-[32rem] rounded-full blur-3xl opacity-10 bg-[radial-gradient(closest-side,rgba(234,179,8,0.35),transparent)] motion-safe:animate-[pulse_4s_ease-in-out_infinite]" />
      </div>

      <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-300 to-amber-300 drop-shadow-[0_0_18px_rgba(250,204,21,0.45)]">
        Game Settings / RTP
      </h1>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Global RTP */}
        <div className="relative rounded-2xl border border-yellow-500/30 ring-1 ring-yellow-400/20 bg-zinc-950/90 p-4 space-y-3 shadow-[0_0_30px_rgba(250,204,21,0.28)]">
          <div className="pointer-events-none absolute inset-0 opacity-60 mix-blend-screen bg-[radial-gradient(120%_60%_at_50%_120%,rgba(250,204,21,0.08),transparent)]" />
          <h2 className="font-semibold text-yellow-100 drop-shadow-[0_0_10px_rgba(250,204,21,0.45)]">Global RTP</h2>
          <div className="flex gap-2">
            <select
              value={globalGame}
              onChange={(e) => setGlobalGame(e.target.value)}
              className="bg-black/60 border border-yellow-500/25 rounded px-3 py-2 text-yellow-100 outline-none focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-300 transition"
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
              className="bg-black/60 border border-yellow-500/25 rounded px-3 py-2 w-24 text-yellow-100 placeholder-yellow-300/60 outline-none focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-300 transition"
            />

            <button
              onClick={saveGlobal}
              className="px-3 py-2 rounded text-sm text-black bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-200 hover:from-yellow-200 hover:to-amber-200 ring-1 ring-yellow-400/30 shadow-[0_0_20px_rgba(250,204,21,0.35)] hover:shadow-[0_0_28px_rgba(250,204,21,0.45)] active:translate-y-px transition"
            >
              Save
            </button>
          </div>
        </div>

        {/* Per-user RTP */}
        <div className="relative rounded-2xl border border-yellow-500/30 ring-1 ring-yellow-400/20 bg-zinc-950/90 p-4 space-y-3 shadow-[0_0_30px_rgba(250,204,21,0.28)]">
          <div className="pointer-events-none absolute inset-0 opacity-60 mix-blend-screen bg-[radial-gradient(120%_60%_at_50%_120%,rgba(250,204,21,0.08),transparent)]" />
          <h2 className="font-semibold text-yellow-100 drop-shadow-[0_0_10px_rgba(250,204,21,0.45)]">Per-user RTP</h2>

          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="User ID"
            className="w-full bg-black/60 border border-yellow-500/25 rounded px-3 py-2 text-yellow-100 placeholder-yellow-300/60 outline-none focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-300 transition"
          />

          <div className="flex gap-2">
            <select
              value={userGame}
              onChange={(e) => setUserGame(e.target.value)}
              className="bg-black/60 border border-yellow-500/25 rounded px-3 py-2 text-yellow-100 outline-none focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-300 transition"
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
              className="bg-black/60 border border-yellow-500/25 rounded px-3 py-2 w-24 text-yellow-100 placeholder-yellow-300/60 outline-none focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-300 transition"
            />

            <button
              onClick={saveUser}
              className="px-3 py-2 rounded text-sm text-black bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-200 hover:from-yellow-200 hover:to-amber-200 ring-1 ring-yellow-400/30 shadow-[0_0_20px_rgba(250,204,21,0.35)] hover:shadow-[0_0_28px_rgba(250,204,21,0.45)] active:translate-y-px transition"
            >
              Save
            </button>
          </div>
        </div>
      </div>

      {/* readable native dropdown on dark themes */}
      <style>{`
        select option {
          background-color: #000;       /* black */
          color: #fde68a;               /* yellow-200 */
        }
      `}</style>
    </div>
  );
}
