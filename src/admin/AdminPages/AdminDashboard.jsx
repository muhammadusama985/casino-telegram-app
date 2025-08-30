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
    <div className="relative space-y-6 p-1 bg-black text-yellow-300">
      {/* Subtle gold glows (decorative only) */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-44 -left-44 h-[44rem] w-[44rem] rounded-full blur-3xl opacity-15 bg-[radial-gradient(closest-side,rgba(250,204,21,0.35),transparent)]" />
        <div className="absolute bottom-[-10rem] right-[-10rem] h-[40rem] w-[40rem] rounded-full blur-3xl opacity-10 bg-[radial-gradient(closest-side,rgba(234,179,8,0.35),transparent)]" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-[radial-gradient(50%_100%_at_50%_100%,rgba(250,204,21,0.20),transparent)]" />
      </div>

      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-300 to-amber-300 drop-shadow-[0_0_22px_rgba(250,204,21,0.55)]">
          Dashboard
        </h1>
        <p className="text-sm text-yellow-300/85 drop-shadow-[0_0_8px_rgba(250,204,21,0.35)]">
          Realtime overview of platform performance.
        </p>
      </header>

      {/* KPIs (3 cards) */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: "All Users", value: summary.totalUsers },
          { label: "Banned Users", value: summary.bannedUsers },
          { label: "Transactions", value: summary.transactions },
        ].map((k) => (
          <div
            key={k.label}
            className="relative overflow-hidden rounded-2xl border border-yellow-500/25 bg-zinc-950/90 p-5
                       ring-1 ring-yellow-400/20 shadow-[0_0_30px_rgba(250,204,21,0.28)]
                       transition will-change-transform hover:shadow-[0_0_48px_rgba(250,204,21,0.40)] hover:ring-yellow-400/30"
          >
            {/* inner glow layer */}
            <div className="pointer-events-none absolute inset-0 opacity-70 mix-blend-screen bg-[radial-gradient(120%_60%_at_50%_120%,rgba(250,204,21,0.10),transparent)]" />

            <div className="text-xs text-yellow-300/85 drop-shadow-[0_0_6px_rgba(250,204,21,0.35)]">
              {k.label}
            </div>
            <div className="mt-2 text-2xl font-semibold text-yellow-100 drop-shadow-[0_0_14px_rgba(250,204,21,0.55)]">
              {loading ? "…" : k.value}
            </div>

            {/* underline glow */}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-300/60 to-transparent" />
          </div>
        ))}
      </section>

      {/* Charts */}
      <section className="grid gap-3 lg:grid-cols-2">
        {/* Users chart */}
        <div className="relative overflow-hidden rounded-2xl border border-yellow-500/25 bg-zinc-950/90 p-4 ring-1 ring-yellow-400/20 shadow-[0_0_30px_rgba(250,204,21,0.28)] transition hover:shadow-[0_0_48px_rgba(250,204,21,0.40)] hover:ring-yellow-400/30">
          <div className="pointer-events-none absolute inset-0 opacity-70 mix-blend-screen bg-[radial-gradient(120%_60%_at_50%_120%,rgba(250,204,21,0.10),transparent)]" />
          <div className="font-medium mb-2 text-yellow-100 drop-shadow-[0_0_12px_rgba(250,204,21,0.55)]">
            New Users (Last 30 days)
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={usersSeries}>
                <defs>
                  <linearGradient id="lineUsersGold" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#fef08a" />
                    <stop offset="50%" stopColor="#facc15" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                  <filter id="glowUsersGold" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3.2" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f22" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#facc15" }} />
                <YAxis tick={{ fontSize: 12, fill: "#facc15" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#000000", border: "1px solid #3f3f46", color: "#fde68a" }}
                  labelStyle={{ color: "#facc15" }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="url(#lineUsersGold)"
                  strokeWidth={3}
                  dot={false}
                  strokeLinecap="round"
                  style={{ filter: "url(#glowUsersGold)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Transactions chart */}
        <div className="relative overflow-hidden rounded-2xl border border-yellow-500/25 bg-zinc-950/90 p-4 ring-1 ring-yellow-400/20 shadow-[0_0_30px_rgba(250,204,21,0.28)] transition hover:shadow-[0_0_48px_rgba(250,204,21,0.40)] hover:ring-yellow-400/30">
          <div className="pointer-events-none absolute inset-0 opacity-70 mix-blend-screen bg-[radial-gradient(120%_60%_at_50%_120%,rgba(250,204,21,0.10),transparent)]" />
          <div className="font-medium mb-2 text-yellow-100 drop-shadow-[0_0_12px_rgba(250,204,21,0.55)]">
            Transactions (Last 30 days)
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={txSeries}>
                <defs>
                  <linearGradient id="lineTxGold" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#fde68a" />
                    <stop offset="50%" stopColor="#facc15" />
                    <stop offset="100%" stopColor="#eab308" />
                  </linearGradient>
                  <filter id="glowTxGold" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3.2" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f22" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#facc15" }} />
                <YAxis tick={{ fontSize: 12, fill: "#facc15" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#000000", border: "1px solid #3f3f46", color: "#fde68a" }}
                  labelStyle={{ color: "#facc15" }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="url(#lineTxGold)"
                  strokeWidth={3}
                  dot={false}
                  strokeLinecap="round"
                  style={{ filter: "url(#glowTxGold)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}
