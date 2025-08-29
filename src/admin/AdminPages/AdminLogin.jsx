// src/admin/pages/AdminLogin.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminAuth } from "../AdminApi";

export default function AdminLogin() {
  const [pass, setPass] = useState("");
  const [otp, setOtp] = useState("");
  const [needOtp, setNeedOtp] = useState(false);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();
    if (needOtp) {
      // STEP 2: OTP
      setBusy(true);
      try {
        const r = await adminAuth.verifyOtp(otp);
        if (r?.token) {
          alert("Admin login OK");
          nav("/admin", { replace: true });
        } else {
          alert("OTP verification failed");
        }
      } catch (err) {
        alert(err?.message || "OTP failed");
      } finally {
        setBusy(false);
      }
      return;
    }

    // STEP 1: password
    setBusy(true);
    try {
      const r = await adminAuth.login(pass);
      if (r.needOtp) {
        setNeedOtp(true);
        alert("OTP sent to admin email. Please check your inbox.");
      } else {
        // token already stored
        alert("Admin login OK");
        nav("/admin", { replace: true });
      }
    } catch (err) {
      alert(err?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <form
        onSubmit={submit}
        className="w/full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 space-y-4"
      >
        <div>
          <div className="text-xl font-semibold">Admin Login</div>
          <div className="text-sm opacity-70">
            {needOtp ? "Enter the 6-digit code sent to your admin email." : "Enter admin password to continue."}
          </div>
        </div>

        {!needOtp && (
          <input
            type="password"
            autoFocus
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="Admin password"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-400"
          />
        )}

        {needOtp && (
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoFocus
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            placeholder="6-digit OTP"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-400 tracking-widest"
          />
        )}

        <button
          disabled={busy || (!needOtp && !pass) || (needOtp && otp.length !== 6)}
          className="w-full px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60"
        >
          {busy ? (needOtp ? "Verifying…" : "Signing in…") : (needOtp ? "Verify OTP" : "Sign in")}
        </button>

        <div className="text-xs opacity-60">
          Your session is stored locally as a token. Revoke it from the server if needed.
        </div>
      </form>
    </div>
  );
}
