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
    <div className="min-h-screen grid place-items-center p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 space-y-4"
      >
        <div>
          <div className="text-xl font-semibold">Admin Login</div>
          <div className="text-sm opacity-70">Enter admin password to continue.</div>
        </div>
        <input
          type="password"
          autoFocus
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          placeholder="Admin password"
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm"
        />
        <button
          disabled={busy || !pass}
          className="w-full px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <div className="text-xs opacity-60">
          Your session is stored locally as a token. Revoke it from the server if needed.
        </div>
      </form>
    </div>
  );
}
