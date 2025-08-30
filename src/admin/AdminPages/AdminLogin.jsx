// src/admin/pages/AdminLogin.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminAuth } from "../AdminApi";

export default function AdminLogin() {
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await adminAuth.login(pass);
      alert("Admin login OK");
      nav("/admin", { replace: true });
    } catch (e) {
      alert(e?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen grid place-items-center p-6 overflow-hidden bg-gradient-to-br from-[#0b0b13] via-black to-[#0b0b13]">
      {/* Background glow layers */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-40 h-[42rem] w-[42rem] rounded-full blur-3xl opacity-30 bg-gradient-to-br from-fuchsia-600 via-purple-700 to-cyan-500" />
        <div className="absolute top-1/3 -right-32 h-[34rem] w-[34rem] rounded-full blur-3xl opacity-25 bg-gradient-to-tr from-amber-400 via-rose-500 to-red-500" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-64 w-[80rem] opacity-40 bg-[radial-gradient(closest-side,#f5d14233,transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(60rem_40rem_at_50%_10%,rgba(244,208,63,0.06),transparent)]" />
      </div>

      {/* Big page heading */}
      <div className="mb-6 text-center">
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 drop-shadow-[0_0_25px_rgba(255,215,0,0.25)]">
          Imperial Casino Game Admin
        </h1>
      </div>

      <form
        onSubmit={submit}
        className="w-full max-w-xl md:max-w-2xl rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900/85 via-zinc-900/60 to-zinc-900/85 backdrop-blur-xl p-8 md:p-10 space-y-6 shadow-[0_0_50px_rgba(244,208,63,0.20),0_0_100px_rgba(168,85,247,0.12)] ring-1 ring-amber-300/20 transition-all duration-300 hover:shadow-[0_0_70px_rgba(244,208,63,0.28),0_0_120px_rgba(168,85,247,0.16)]"
      >
        <div>
          <div className="text-2xl font-semibold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500">
            Admin Login
          </div>
          <div className="text-sm text-zinc-400">Enter admin password to continue.</div>
        </div>

        <input
          type="password"
          autoFocus
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          placeholder="Admin password"
          className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-base text-zinc-100 placeholder:text-zinc-400 outline-none focus:ring-4 focus:ring-amber-400/30 focus:border-amber-300 transition"
        />

        <button
          disabled={busy || !pass}
          className="w-full px-4 py-3 rounded-xl text-base font-medium text-black bg-gradient-to-r from-amber-300 via-amber-200 to-yellow-200 hover:from-amber-200 hover:via-amber-100 hover:to-yellow-100 disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_10px_35px_-10px_rgba(244,208,63,0.55)] hover:shadow-[0_12px_40px_-8px_rgba(244,208,63,0.7)] active:translate-y-px transition"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <div className="text-xs text-zinc-500">
          Your session is stored locally as a token. Revoke it from the server if needed.
        </div>
      </form>
    </div>
  );
}
