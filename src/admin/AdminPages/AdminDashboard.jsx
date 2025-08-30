import { useEffect, useState } from "react";
import { adminDashboard } from "../AdminApi";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export default function AdminDashboard() {
  const [summary, setSummary] = useState({ totalUsers: "—", bannedUsers: "—", transactions: "—" });
  const [usersSeries, setUsersSeries] = useState([]);
  const [txSeries, setTxSeries] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const s = await adminDashboard.summary();
      const u = await adminDashboard.timeseries("users", 30);
      const t = await adminDashboard.timeseries("transactions", 30);

      setSummary({
        totalUsers: s?.totalUsers ?? 0,
        bannedUsers: s?.bannedUsers ?? 0,
        transactions: s?.transactions ?? 0,
      });
      setUsersSeries(u?.points || []);
      setTxSeries(t?.points || []);
    } catch (e) {
      alert(e?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="relative space-y-6 p-1">
      {/* Background (decorative only) */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        {/* cool cyan/indigo mesh glows */}
        <div className="absolute -top-40 -left-40 h-[42rem] w-[42rem] rounded-full blur-3xl opacity-30 bg-gradient-to-br from-cyan-500 via-sky-400 to-teal-400" />
        <div className="absolute top-1/3 -right-32 h-[34rem] w-[34rem] rounded-full blur-3xl opacity-25 bg-gradient-to-tr from-indigo-600 via-violet-600 to-fuchsia-500" />
        <div className="absolute inset-0 bg-[radial-gradient(70rem_45rem_at_50%_10%,rgba(59,130,246,0.08),transparent)]" />
        <div className="absolute inset-0 [background-image:repeating-linear-gradient(0deg,rgba(255,255,255,0.03)_0px,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_24px)] opacity-40" />
      </div>

      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-200 to-indigo-300 drop-shadow-[0_0_16px_rgba(56,189,248,0.25)]">
          Dashboard
        </h1>
        <p className="text-sm text-zinc-300/85">Realtime overview of platform performance.</p>
      </header>

      {/* KPIs (removed the empty placeholder card) */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: "All Users", value: summary.totalUsers },
          { label: "Banned Users", value: summary.bannedUsers },
          { label: "Transactions", value: summary.transactions },
        ].map((k) => (
          <div
            key={k.label}
            className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900/70 via-zinc-900/50 to-zinc-900/70 p-5
                       ring-1 ring-cyan-200/10 shadow-[0_0_28px_rgba(56,189,248,0.18)]
                       transition hover:shadow-[0_0_42px_rgba(56,189,248,0.28)] hover:ring-cyan-200/20"
          >
            <div className="text-xs text-zinc-400">{k.label}</div>
            <div className="mt-2 text-2xl font-semibold text-white">
              {loading ? "…" : k.value}
            </div>
            {/* subtle underline glow */}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-200/40 to-transparent" />
          </div>
        ))}
      </section>

      {/* Charts */}
      <section className="grid gap-3 lg:grid-cols-2">
        {/* Users chart */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900/70 via-zinc-900/50 to-zinc-900/70 p-4 ring-1 ring-cyan-200/10 shadow-[0_0_28px_rgba(56,189,248,0.18)]">
          <div className="font-medium mb-2 text-white">New Users (Last 30 days)</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={usersSeries}>
                <defs>
                  <linearGradient id="lineUsers" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#67e8f9" />
                    <stop offset="50%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#818cf8" />
                  </linearGradient>
                  <filter id="glowUsers" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#a1a1aa" }} />
                <YAxis tick={{ fontSize: 12, fill: "#a1a1aa" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#0b0b0e", border: "1px solid #27272a", color: "#e5e7eb" }}
                  labelStyle={{ color: "#e5e7eb" }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="url(#lineUsers)"
                  strokeWidth={3}
                  dot={false}
                  strokeLinecap="round"
                  style={{ filter: "url(#glowUsers)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Transactions chart */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900/70 via-zinc-900/50 to-zinc-900/70 p-4 ring-1 ring-cyan-200/10 shadow-[0_0_28px_rgba(56,189,248,0.18)]">
          <div className="font-medium mb-2 text-white">Transactions (Last 30 days)</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={txSeries}>
                <defs>
                  <linearGradient id="lineTx" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="50%" stopColor="#22c55e" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                  <filter id="glowTx" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#a1a1aa" }} />
                <YAxis tick={{ fontSize: 12, fill: "#a1a1aa" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#0b0b0e", border: "1px solid #27272a", color: "#e5e7eb" }}
                  labelStyle={{ color: "#e5e7eb" }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="url(#lineTx)"
                  strokeWidth={3}
                  dot={false}
                  strokeLinecap="round"
                  style={{ filter: "url(#glowTx)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}
