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
    <div className="relative space-y-6 bg-black text-yellow-300">
      {/* background glows */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-40 h-[44rem] w-[44rem] rounded-full blur-3xl opacity-15 bg-[radial-gradient(closest-side,rgba(250,204,21,0.35),transparent)] motion-safe:animate-[pulse_3.5s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-10rem] right-[-10rem] h-[40rem] w-[40rem] rounded-full blur-3xl opacity-10 bg-[radial-gradient(closest-side,rgba(234,179,8,0.35),transparent)] motion-safe:animate-[pulse_4s_ease-in-out_infinite]" />
      </div>

      <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-300 to-amber-300 drop-shadow-[0_0_18px_rgba(250,204,21,0.45)]">
        Game Settings / RTP
      </h1>

      <div className="grid sm:grid-cols-2 gap-6">
        {/* Global RTP — STACKED & NEARLY FULL CARD */}
        <div className="relative overflow-hidden rounded-3xl border-2 border-yellow-500/40 ring-2 ring-yellow-400/20 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-6 md:p-8 min-h-[360px] shadow-[0_0_55px_rgba(250,204,21,0.35)] hover:shadow-[0_0_80px_rgba(250,204,21,0.45)] transition">
          <div className="pointer-events-none absolute inset-0 opacity-70 mix-blend-screen bg-[radial-gradient(120%_60%_at_50%_120%,rgba(250,204,21,0.10),transparent)] motion-safe:animate-[pulse_3.8s_ease-in-out_infinite]" />
          <h2 className="text-2xl font-bold text-yellow-100 drop-shadow-[0_0_12px_rgba(250,204,21,0.55)] mb-4">
            Global RTP
          </h2>

          {/* STACK column */}
          <div className="flex flex-col gap-4">
            <select
              value={globalGame}
              onChange={(e) => setGlobalGame(e.target.value)}
              className="w-full bg-black/60 border-2 border-yellow-500/40 rounded-2xl px-5 py-4 text-lg text-yellow-100 outline-none focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-300 transition"
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
              className="w-full bg-black/60 border-2 border-yellow-500/40 rounded-2xl px-5 py-4 text-lg text-yellow-100 placeholder-yellow-300/60 outline-none focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-300 transition"
            />

            {/* Save button slightly above bottom */}
            <div className="mt-6">
              <button
                onClick={saveGlobal}
                className="w-full px-6 py-4 rounded-2xl text-lg font-semibold text-black bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-200 hover:from-yellow-200 hover:to-amber-200 ring-1 ring-yellow-400/40 shadow-[0_0_28px_rgba(250,204,21,0.45)] hover:shadow-[0_0_40px_rgba(250,204,21,0.55)] active:translate-y-px transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>

        {/* Per-user RTP — STACKED & NEARLY FULL CARD */}
        <div className="relative overflow-hidden rounded-3xl border-2 border-yellow-500/40 ring-2 ring-yellow-400/20 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-6 md:p-8 min-h-[420px] shadow-[0_0_55px_rgba(250,204,21,0.35)] hover:shadow-[0_0_80px_rgba(250,204,21,0.45)] transition">
          <div className="pointer-events-none absolute inset-0 opacity-70 mix-blend-screen bg-[radial-gradient(120%_60%_at_50%_120%,rgba(250,204,21,0.10),transparent)] motion-safe:animate-[pulse_4.1s_ease-in-out_infinite]" />
          <h2 className="text-2xl font-bold text-yellow-100 drop-shadow-[0_0_12px_rgba(250,204,21,0.55)] mb-4">
            Per-user RTP
          </h2>

          {/* STACK column */}
          <div className="flex flex-col gap-4">
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="User ID"
              className="w-full bg-black/60 border-2 border-yellow-500/40 rounded-2xl px-5 py-4 text-lg text-yellow-100 placeholder-yellow-300/60 outline-none focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-300 transition"
            />

            <select
              value={userGame}
              onChange={(e) => setUserGame(e.target.value)}
              className="w-full bg-black/60 border-2 border-yellow-500/40 rounded-2xl px-5 py-4 text-lg text-yellow-100 outline-none focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-300 transition"
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
              className="w-full bg-black/60 border-2 border-yellow-500/40 rounded-2xl px-5 py-4 text-lg text-yellow-100 placeholder-yellow-300/60 outline-none focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-300 transition"
            />

            {/* Save button slightly above bottom */}
            <div className="mt-6">
              <button
                onClick={saveUser}
                className="w-full px-6 py-4 rounded-2xl text-lg font-semibold text-black bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-200 hover:from-yellow-200 hover:to-amber-200 ring-1 ring-yellow-400/40 shadow-[0_0_28px_rgba(250,204,21,0.45)] hover:shadow-[0_0_40px_rgba(250,204,21,0.55)] active:translate-y-px transition"
              >
                Save
              </button>
            </div>
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
