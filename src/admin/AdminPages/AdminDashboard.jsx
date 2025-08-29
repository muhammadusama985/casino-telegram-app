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
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm opacity-70">Realtime overview of platform performance.</p>
      </header>

      {/* KPIs */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "All Users", value: summary.totalUsers },
          { label: "Banned Users", value: summary.bannedUsers },
          { label: "Transactions", value: summary.transactions },
          { label: "—", value: "—" }, // keeps your 4-card grid; replace later if you want
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="text-xs opacity-70">{k.label}</div>
            <div className="text-xl font-semibold mt-1">{loading ? "…" : k.value}</div>
          </div>
        ))}
      </section>

      {/* Charts */}
      <section className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="font-medium mb-2">New Users (Last 30 days)</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={usersSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#9ca3af" }} />
                <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#0b0b0e", border: "1px solid #27272a", color: "#e5e7eb" }}
                  labelStyle={{ color: "#e5e7eb" }}
                />
                <Line type="monotone" dataKey="count" stroke="#22d3ee" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="font-medium mb-2">Transactions (Last 30 days)</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={txSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#9ca3af" }} />
                <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#0b0b0e", border: "1px solid #27272a", color: "#e5e7eb" }}
                  labelStyle={{ color: "#e5e7eb" }}
                />
                <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}
