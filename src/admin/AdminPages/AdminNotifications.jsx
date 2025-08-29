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
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="text-sm opacity-70">Send broadcasts to user segments via Telegram.</p>
      </header>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <select
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-gray-100"
          >
            <option value="new">New</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="banned">Banned</option>
          </select>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-gray-100 placeholder-gray-400"
          />

          <button
            onClick={handleSend}
            disabled={sending}
            className={`px-3 py-2 rounded-lg text-sm ${sending ? "bg-zinc-800 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-500"}`}
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>

        <textarea
          rows={8}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-gray-100 placeholder-gray-400"
          placeholder="Message body (supports Markdown)…"
        />

        <div className="text-xs opacity-70">
          Telegram formatted text supported (Markdown). Avoid unescaped <code>_ * [ ] ( )</code> if using Markdown.
        </div>
      </section>

      {lastResult && (
        <div className="text-sm text-zinc-300">
          Last send → Segment <b>{segment}</b>, targets: <b>{lastResult.total}</b>, sent:{" "}
          <b className="text-emerald-400">{lastResult.sent}</b>, failed:{" "}
          <b className="text-red-400">{lastResult.failed}</b>
        </div>
      )}

      {/* Make the native dropdown menu readable on dark themes */}
      <style>{`
        select option { background-color: #18181b; color: #e5e7eb; }
      `}</style>
    </div>
  );
}
