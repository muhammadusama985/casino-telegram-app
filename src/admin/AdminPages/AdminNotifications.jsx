// src/admin/AdminPages/AdminNotifications.jsx
import { useState } from "react";
import { adminNotifications } from "../AdminApi";

export default function AdminNotifications() {
  const [segment, setSegment] = useState("new"); // new | active | inactive | banned
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  async function handleSend() {
    if (!title.trim() || !body.trim()) return alert("Please enter a title and a message.");
    setSending(true);
    try {
      const r = await adminNotifications.send({ segment, title, body });
      setLastResult(r);
      alert(`Sent: ${r.sent}/${r.total} (failed: ${r.failed})`);
    } catch (e) {
      alert(e?.message || "Send failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="relative space-y-6 bg-black text-yellow-300">
      {/* background gold glows (decorative) */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-32 h-[36rem] w-[36rem] rounded-full blur-3xl opacity-15 bg-[radial-gradient(closest-side,rgba(250,204,21,0.35),transparent)]" />
        <div className="absolute bottom-[-8rem] right-[-8rem] h-[32rem] w-[32rem] rounded-full blur-3xl opacity-10 bg-[radial-gradient(closest-side,rgba(234,179,8,0.35),transparent)]" />
      </div>

      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-300 to-amber-300 drop-shadow-[0_0_18px_rgba(250,204,21,0.45)]">
          Notifications
        </h1>
        <p className="text-sm text-yellow-300/85">Send broadcasts to user segments via Telegram.</p>
      </header>

      <section className="relative rounded-2xl border border-yellow-500/30 ring-1 ring-yellow-400/20 bg-zinc-950/90 p-5 space-y-4 shadow-[0_0_26px_rgba(250,204,21,0.28)]">
        {/* inner glow */}
        <div className="pointer-events-none absolute inset-0 opacity-60 mix-blend-screen bg-[radial-gradient(120%_60%_at_50%_120%,rgba(250,204,21,0.08),transparent)]" />

        {/* Top controls as bordered grid (table-like visible borders) */}
        <div className="grid sm:grid-cols-3 gap-0 rounded-xl overflow-hidden border border-yellow-500/30">
          <div className="p-3 border-b sm:border-b-0 sm:border-r border-yellow-500/30">
            <select
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              className="w-full bg-black/60 border border-yellow-500/35 rounded-lg px-3 py-2 text-sm text-yellow-100 outline-none focus:ring-2 focus:ring-yellow-400/30 focus:border-yellow-300 transition"
            >
              <option value="new">New</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="banned">Banned</option>
            </select>
          </div>

          <div className="p-3 border-b sm:border-b-0 sm:border-r border-yellow-500/30">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="w-full bg-black/60 border border-yellow-500/35 rounded-lg px-3 py-2 text-sm text-yellow-100 placeholder-yellow-300/60 outline-none focus:ring-2 focus:ring-yellow-400/30 focus:border-yellow-300 transition"
            />
          </div>

          <div className="p-3 flex items-end">
            <button
              onClick={handleSend}
              disabled={sending}
              className={`w-full px-3 py-2 rounded-lg text-sm transition ${
                sending
                  ? "bg-black/60 text-yellow-300/70 ring-1 ring-yellow-500/25 cursor-not-allowed"
                  : "text-black bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-200 hover:from-yellow-200 hover:to-amber-200 ring-1 ring-yellow-400/30 shadow-[0_0_18px_rgba(250,204,21,0.35)] hover:shadow-[0_0_26px_rgba(250,204,21,0.45)] active:translate-y-px"
              }`}
            >
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>

        <textarea
          rows={8}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full bg-black/60 border border-yellow-500/35 rounded-xl px-3 py-2 text-sm text-yellow-100 placeholder-yellow-300/60 outline-none focus:ring-2 focus:ring-yellow-400/30 focus:border-yellow-300 transition"
          placeholder="Message body (supports Markdown)…"
        />

        <div className="text-xs text-yellow-300/80">
          Telegram formatted text supported (Markdown). Avoid unescaped <code>_ * [ ] ( )</code> if using Markdown.
        </div>
      </section>

      {lastResult && (
        <div className="text-sm text-yellow-200">
          Last send → Segment <b>{segment}</b>, targets: <b>{lastResult.total}</b>, sent:{" "}
          <b className="text-emerald-400">{lastResult.sent}</b>, failed:{" "}
          <b className="text-red-400">{lastResult.failed}</b>
        </div>
      )}

      {/* Make the native dropdown menu readable on dark themes */}
      <style>{`
        select option { background-color: #000; color: #fde68a; }
      `}</style>
    </div>
  );
}
