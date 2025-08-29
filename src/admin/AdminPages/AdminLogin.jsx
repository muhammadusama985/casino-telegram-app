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
    <div className="min-h-screen grid place-items-center p-4 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-zinc-800/80 bg-zinc-900/80 backdrop-blur-sm p-6 space-y-4 shadow-2xl ring-1 ring-black/20"
      >
        <div>
          <div className="text-xl font-semibold tracking-tight text-white">Admin Login</div>
          <div className="text-sm text-zinc-400">Enter admin password to continue.</div>
        </div>

        <input
          type="password"
          autoFocus
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          placeholder="Admin password"
          className="w-full bg-zinc-950/70 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500 transition"
        />

        <button
          disabled={busy || !pass}
          className="w-full px-3 py-2 rounded-lg text-white text-sm bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/30 active:scale-[0.99] transition"
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
