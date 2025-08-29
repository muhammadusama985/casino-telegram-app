// src/admin/AdminPages/AdminSecurity.jsx
import { useEffect, useState } from "react";
import { adminSecurity } from "../AdminApi";

export default function AdminSecurity() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function loadLogs() {
    setErr(""); setLoading(true);
    try {
      const r = await adminSecurity.listAudits({ limit: 100 });
      setLogs(r.items || []);
    } catch (e) {
      setErr(e?.message || "Failed to load logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadLogs(); }, []);

  async function handleEnable2FA() {
    try {
      // Step 1: ask server to create a temp secret and return an otpauth QR
      const setup = await adminSecurity.setup2FA();
      // Show QR to admin (simple window; keep your UI minimalist)
      window.open(setup.qrDataUrl, "_blank");

      // Step 2: ask the admin to enter the 6-digit token from their app
      const token = prompt("Enter the 6-digit code from your authenticator app:");
      if (!token) return;

      await adminSecurity.enable2FA({ token });
      alert("2FA enabled.");
    } catch (e) {
      alert(e?.message || "Enable 2FA failed");
    }
  }

  async function handleReset2FA() {
    if (!confirm("Disable 2FA for the admin account?")) return;
    try {
      await adminSecurity.reset2FA();
      alert("2FA disabled.");
    } catch (e) {
      alert(e?.message || "Reset 2FA failed");
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Security & Control</h1>
        <p className="text-sm opacity-70">Admin 2FA, activity logs, and access control.</p>
      </header>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
        <div className="font-medium">Two-Factor Authentication</div>

        {/* Buttons: brighter backgrounds + explicit text color */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleEnable2FA}
            className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm"
          >
            Enable 2FA
          </button>
          <button
            onClick={handleReset2FA}
            className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-sm"
          >
            Reset 2FA
          </button>
        </div>

        <div className="text-xs opacity-70">
          When enabled, admin login requires a one-time password (TOTP).
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 overflow-hidden">
        <div className="p-4 font-medium border-b border-zinc-800 bg-zinc-900/70">
          Admin Activity Logs
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="[&>th]:text-left [&>th]:px-3 [&>th]:py-2">
              <th>Time</th>
              <th>Admin</th>
              <th>Action</th>
              <th>Target</th>
              <th>Meta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {loading && (
              <tr>
                <td colSpan={5} className="px-3 py-6 opacity-70 text-center">Loading…</td>
              </tr>
            )}
            {!loading && logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 opacity-70 text-center">—</td>
              </tr>
            )}
            {logs.map((a) => (
              <tr key={a._id} className="[&>td]:px-3 [&>td]:py-2">
                <td>{a.at ? new Date(a.at).toLocaleString() : "—"}</td>
                <td>{a.adminEmail || "—"}</td>
                <td>{a.action || "—"}</td>
                <td>{a.targetUserId || a.target || "—"}</td>
                <td className="truncate max-w-[240px]">
                  {a.payload ? JSON.stringify(a.payload) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {err && <div className="p-3 text-sm text-red-400">{err}</div>}
      </section>
    </div>
  );
}
