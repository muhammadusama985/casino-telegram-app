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
      {/* Subtle amber-themed background accents (visual only) */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-40 h-[42rem] w-[42rem] rounded-full blur-3xl opacity-20 bg-gradient-to-br from-amber-400 via-yellow-300 to-amber-500" />
        <div className="absolute top-1/3 -right-32 h-[34rem] w-[34rem] rounded-full blur-3xl opacity-15 bg-gradient-to-tr from-fuchsia-500 via-purple-600 to-amber-300" />
        <div className="absolute inset-0 bg-[radial-gradient(65rem_42rem_at_50%_8%,rgba(244,208,63,0.07),transparent)]" />
      </div>

      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 drop-shadow-[0_0_16px_rgba(255,215,0,0.22)]">
          Dashboard
        </h1>
        <p className="text-sm text-zinc-300/85">Realtime overview of platform performance.</p>
      </header>

      {/* KPIs — 3 cards, matching the luxe gold/amber vibe */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: "All Users", value: summary.totalUsers },
          { label: "Banned Users", value: summary.bannedUsers },
          { label: "Transactions", value: summary.transactions },
        ].map((k) => (
          <div
            key={k.label}
            className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900/75 via-zinc-900/55 to-zinc-900/75 p-5
                       ring-1 ring-amber-300/15 shadow-[0_0_26px_rgba(244,208,63,0.16)]
                       transition hover:shadow-[0_0_40px_rgba(244,208,63,0.26)] hover:ring-amber-300/25"
          >
            <div className="text-xs text-zinc-400">{k.label}</div>
            <div className="mt-2 text-2xl font-semibold text-white">
              {loading ? "…" : k.value}
            </div>
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-200/40 to-transparent" />
          </div>
        ))}
      </section>

      {/* Charts — colors aligned to the admin login/layout (amber & emerald) */}
      <section className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900/75 via-zinc-900/55 to-zinc-900/75 p-4 ring-1 ring-amber-300/15 shadow-[0_0_26px_rgba(244,208,63,0.16)]">
          <div className="font-medium mb-2 text-white">New Users (Last 30 days)</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={usersSeries}>
                <defs>
                  {/* Amber gradient line to match theme */}
                  <linearGradient id="lineUsersAmber" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#fde68a" />
                    <stop offset="50%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                  <filter id="glowUsersAmber" x="-20%" y="-20%" width="140%" height="140%">
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
                  stroke="url(#lineUsersAmber)"
                  strokeWidth={3}
                  dot={false}
                  strokeLinecap="round"
                  style={{ filter: "url(#glowUsersAmber)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900/75 via-zinc-900/55 to-zinc-900/75 p-4 ring-1 ring-amber-300/15 shadow-[0_0_26px_rgba(244,208,63,0.16)]">
          <div className="font-medium mb-2 text-white">Transactions (Last 30 days)</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={txSeries}>
                <defs>
                  {/* Emerald line pairs nicely with gold theme */}
                  <linearGradient id="lineTxEmerald" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="50%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                  <filter id="glowTxEmerald" x="-20%" y="-20%" width="140%" height="140%">
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
                  stroke="url(#lineTxEmerald)"
                  strokeWidth={3}
                  dot={false}
                  strokeLinecap="round"
                  style={{ filter: "url(#glowTxEmerald)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}
