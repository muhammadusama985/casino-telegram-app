// src/admin/pages/AdminLogin.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminAuth } from "../AdminApi";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [otp, setOtp] = useState("");
  const [needOtp, setNeedOtp] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  async function submitPassword(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await adminAuth.login(email.trim(), pass);
      if (r?.needOtp) {
        setNeedOtp(true);
        setCooldown(r.cooldown || 0);
        // Keep the same screen; now show OTP field & Verify button
      } else {
        alert("Admin login OK");
        nav("/admin", { replace: true });
      }
    } catch (e) {
      alert(e?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitOtp(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await adminAuth.loginOtp(email.trim(), otp.trim());
      alert("Admin login OK");
      nav("/admin", { replace: true });
    } catch (e) {
      alert(e?.message || "OTP verification failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <form
        onSubmit={needOtp ? submitOtp : submitPassword}
        className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 space-y-4"
      >
        <div>
          <div className="text-xl font-semibold">Admin Login</div>
          <div className="text-sm opacity-70">
            {needOtp ? "Enter the OTP sent to your email." : "Enter admin email and password."}
          </div>
        </div>

        {/* Email */}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Admin email"
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-400"
          disabled={needOtp} // lock email once we’re in OTP step
          required
        />

        {/* Password (only in step 1) */}
        {!needOtp && (
          <input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="Admin password"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-400"
            required
          />
        )}

        {/* OTP (only in step 2) */}
        {needOtp && (
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="6-digit OTP"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-400 tracking-widest"
            autoFocus
            required
          />
        )}

        <button
          disabled={busy || (!needOtp && (!email || !pass)) || (needOtp && (!email || !otp))}
          className="w-full px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60"
        >
          {busy ? (needOtp ? "Verifying…" : "Signing in…") : (needOtp ? "Verify OTP" : "Sign in")}
        </button>

        {/* Cooldown hint (optional) */}
        {needOtp && cooldown > 0 && (
          <div className="text-xs opacity-60">
            An OTP was just sent. You may request a new one after ~{cooldown}s.
          </div>
        )}

        <div className="text-xs opacity-60">
          Your session is stored locally as a token. Revoke it from the server if needed.
        </div>
      </form>
    </div>
  );
}
