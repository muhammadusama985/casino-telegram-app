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
    <div className="min-h-screen grid place-items-center p-4 bg-gradient-to-br from-[#0a0f14] via-black to-[#0a0f14] bg-[radial-gradient(60rem_30rem_at_10%_10%,rgba(16,185,129,.18),transparent),radial-gradient(60rem_30rem_at_90%_90%,rgba(168,85,247,.12),transparent)]">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900/80 via-zinc-900/50 to-zinc-900/80 backdrop-blur-xl p-6 space-y-4 shadow-[0_0_40px_rgba(16,185,129,0.18),0_0_80px_rgba(168,85,247,0.08)] ring-1 ring-emerald-500/10 transition-all duration-300 hover:shadow-[0_0_55px_rgba(16,185,129,0.25),0_0_100px_rgba(168,85,247,0.12)]"
      >
        <div>
          <div className="text-xl font-semibold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.35)]">
            Admin Login
          </div>
          <div className="text-sm text-zinc-400">
            Enter admin password to continue.
          </div>
        </div>

        <input
          type="password"
          autoFocus
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          placeholder="Admin password"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-emerald-50 placeholder:text-emerald-200/40 outline-none focus:ring-4 focus:ring-emerald-500/25 focus:border-emerald-400/60 transition"
        />

        <button
          disabled={busy || !pass}
          className="w-full px-3 py-2 rounded-lg text-sm text-black bg-gradient-to-r from-emerald-400 via-emerald-300 to-lime-300 hover:from-emerald-300 hover:via-emerald-200 hover:to-lime-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_0_22px_rgba(16,185,129,.45)] hover:shadow-[0_0_36px_rgba(16,185,129,.55)] active:translate-y-px active:brightness-95 transition"
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
