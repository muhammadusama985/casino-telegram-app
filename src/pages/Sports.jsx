// src/pages/Sports.jsx
import { useEffect, useMemo, useState } from "react";

/**
 * New minimalist design: dark glass background, neon accents, compact scoreboard cards,
 * sticky footer for a (future) bet slip, and clean sport tabs across the top.
 *
 * TailwindCSS required.
 */

const SPORT_DEFS = [
  { key: "football", label: "Football", emoji: "⚽" },
  { key: "nba", label: "NBA", emoji: "🏀" },
  { key: "cricket", label: "Cricket", emoji: "🏏" },
];

function cx(...c) {
  return c.filter(Boolean).join(" ");
}

function LiveDot({ on = false }) {
  return (
    <span
      className={cx(
        "inline-block h-2.5 w-2.5 rounded-full",
        on ? "bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.9)]" : "bg-zinc-600"
      )}
    />
  );
}

function Header({ sport, setSport, refreshing, setForceRefresh }) {
  return (
    <header className="sticky top-0 z-20 backdrop-blur-xl bg-[#0b0b0e]/70 border-b border-white/5">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2 mr-2">
          <div className="h-9 w-9 grid place-items-center rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10">
            🧠
          </div>
          <div className="text-lg font-semibold tracking-wide">Imperial <span className="text-zinc-300">Scores</span></div>
        </div>

        <nav className="ml-auto flex items-center gap-2 rounded-xl p-1 bg-black/50 border border-white/10">
          {SPORT_DEFS.map((s) => {
            const active = sport === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setSport(s.key)}
                className={cx(
                  "px-3 h-9 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors",
                  active
                    ? "bg-white text-black"
                    : "text-zinc-300 hover:text-white hover:bg-white/10"
                )}
                title={s.label}
              >
                <span>{s.emoji}</span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            );
          })}
        </nav>

        <button
          onClick={() => setForceRefresh((v) => v + 1)}
          className="ml-2 h-9 px-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-zinc-200 text-sm transition-colors"
          title="Refresh"
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>
    </header>
  );
}

function SectionTitle({ title, hint, live = false }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <LiveDot on={live} />
        <h2 className="text-sm font-semibold tracking-wide text-white">{title}</h2>
      </div>
      {hint ? <div className="text-xs text-zinc-400">{hint}</div> : null}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 animate-pulse">
      <div className="h-4 w-40 bg-white/10 rounded mb-3" />
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 w-48 bg-white/10 rounded" />
          <div className="h-4 w-36 bg-white/10 rounded" />
        </div>
        <div className="h-10 w-20 bg-white/10 rounded" />
      </div>
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center">
      <div className="text-zinc-200 font-medium">{label}</div>
      <div className="text-xs text-zinc-400 mt-1">Try again later or switch the sport.</div>
    </div>
  );
}

function ScoreBadge({ homeScore, awayScore }) {
  const bothNumeric =
    typeof homeScore === "number" && typeof awayScore === "number";

  if (bothNumeric) {
    return (
      <div className="h-9 min-w-[66px] px-3 rounded-lg grid place-items-center bg-white text-black font-semibold">
        {homeScore} : {awayScore}
      </div>
    );
  }
  // cricket strings or “—”
  const left = homeScore ?? "—";
  const right = awayScore ?? "";
  return (
    <div className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/10 text-xs text-zinc-200 max-w-[220px]">
      {String(left)} {right ? `• ${right}` : ""}
    </div>
  );
}

function MatchCard({ m }) {
  const live =
    ["LIVE", "IN_PLAY", "PAUSED"].includes(m.status) ||
    ["1st Qtr", "2nd Qtr", "3rd Qtr", "4th Qtr", "Halftime"].includes(m.status);

  // normalize scores
  const homeScore =
    typeof m?.score?.fullTime?.home === "number" || typeof m?.score?.fullTime?.home === "string"
      ? m.score.fullTime.home
      : null;
  const awayScore =
    typeof m?.score?.fullTime?.away === "number" || typeof m?.score?.fullTime?.away === "string"
      ? m.score.fullTime.away
      : null;

  return (
    <div
      className={cx(
        "rounded-2xl border p-4 transition-all",
        "bg-[radial-gradient(120%_120%_at_90%_-10%,rgba(250,250,250,0.06),rgba(12,12,16,0.9))]",
        "border-white/10 hover:border-white/20"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="text-xs text-zinc-400 flex items-center gap-2">
          <span className="truncate max-w-[220px]">{m.league}</span>
          <span className="text-zinc-500">•</span>
          <span className="text-[11px]">{m.when || "—"}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cx(
              "text-[10px] px-2 py-1 rounded-md border",
              live
                ? "bg-emerald-400/10 text-emerald-300 border-emerald-400/20"
                : "bg-white/5 text-zinc-300 border-white/10"
            )}
          >
            {live ? "LIVE" : m.status || "—"}
          </span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="min-w-0">
          <div className="font-medium text-white truncate">{m.home}</div>
        </div>

        <ScoreBadge homeScore={homeScore} awayScore={awayScore} />

        <div className="min-w-0 text-right">
          <div className="font-medium text-zinc-200 truncate">{m.away}</div>
        </div>
      </div>

      {/* odds row (placeholder) */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {["1", "Draw", "2"].map((label, i) => (
          <button
            key={label}
            disabled
            className="rounded-lg border border-white/10 bg-white/5 text-zinc-300 text-sm py-2 cursor-not-allowed"
          >
            {label} {m.odds?.[i] ?? "—"}
          </button>
        ))}
      </div>
    </div>
  );
}

function FooterBar() {
  return (
    <div className="fixed bottom-0 inset-x-0 z-20">
      <div className="mx-auto max-w-6xl px-4 pb-4">
        <div className="rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl p-3 flex items-center justify-between">
          <div className="text-sm text-zinc-300">Bet slip (coming soon)</div>
          <button className="h-9 px-4 rounded-lg bg-white text-black text-sm font-medium">
            Open
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Sports() {
  const [sport, setSport] = useState("football");
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(0);

  // Section title & hint based on sport
  const { title, hint } = useMemo(() => {
    if (sport === "football") return { title: "Football — Live & Today", hint: "Source: football-data" };
    if (sport === "nba") return { title: "NBA — Live", hint: "Source: balldontlie" };
    return { title: "Cricket — Live", hint: "Source: CricketData" };
  }, [sport]);

  async function fetchMatches() {
    setRefreshing(true);
    setErr("");
    try {
      let urls = [];
      if (sport === "football") {
        urls = [
          "/api/sports/live?status=LIVE",
          "/api/sports/live?status=IN_PLAY",
          "/api/sports/live?status=SCHEDULED",
        ];
      } else if (sport === "nba") {
        urls = ["/api/sports/nba/live"];
      } else {
        urls = ["/api/sports/cricket/live"];
      }

      let got = [];
      for (const u of urls) {
        const r = await fetch(u);
        if (!r.ok) continue;
        const data = await r.json();
        if (data?.matches?.length) {
          got = data.matches;
          break;
        }
      }
      setMatches(got);
    } catch (e) {
      setErr(e?.message || "Failed to fetch");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    fetchMatches();
    const t = setInterval(fetchMatches, 30_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sport, forceRefresh]);

  return (
    <div className="min-h-[100dvh] bg-[#0b0b0e] text-white">
      <Header
        sport={sport}
        setSport={setSport}
        refreshing={refreshing}
        setForceRefresh={setForceRefresh}
      />

      <main className="mx-auto max-w-6xl px-4 py-6">
        <SectionTitle
          title={title}
          hint={hint}
          live={matches.some(
            (m) =>
              ["LIVE", "IN_PLAY", "PAUSED"].includes(m.status) ||
              ["1st Qtr", "2nd Qtr", "3rd Qtr", "4th Qtr", "Halftime"].includes(m.status)
          )}
        />

        {/* Error */}
        {err && (
          <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 text-rose-200 text-sm p-3 mb-3">
            {err}
          </div>
        )}

        {/* Loading skeleton */}
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : matches.length === 0 ? (
          <EmptyState label="No matches available right now." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {matches.map((m) => (
              <MatchCard key={m.id} m={m} />
            ))}
          </div>
        )}

        <p className="mt-6 text-[11px] text-zinc-400/90">
          Data is provided for information only and may be delayed. Odds not included on free tiers.
        </p>
      </main>

      <FooterBar />
    </div>
  );
}

/* Optional: hide scrollbars for a cleaner feel
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
*/
