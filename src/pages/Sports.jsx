// src/pages/Sports.jsx
import { useEffect, useMemo, useRef, useState } from "react";

/** ─────────────────────────────────────────────────────────────────────────────
 *  Small UI helpers
 *  ────────────────────────────────────────────────────────────────────────────
 */
function IconChip({ label, active = false }) {
  return (
    <button
      className={[
        "h-10 w-10 rounded-full grid place-items-center text-sm",
        active ? "bg-yellow-500/90 text-black" : "bg-zinc-900 text-zinc-300 border border-zinc-800",
      ].join(" ")}
      aria-label={label}
      title={label}
    >
      {label === "LIVE" ? "⏺" : label === "Fav" ? "★" : label === "Slip" ? "🧾" : label === "Ball" ? "⚽" : "🏠"}
    </button>
  );
}

function PillTabs({ tab, setTab }) {
  return (
    <div className="flex items-center gap-2 mt-4">
      <button
        onClick={() => setTab("highlights")}
        className={`px-3 py-2 rounded-xl text-sm font-medium border ${
          tab === "highlights"
            ? "bg-zinc-900 text-white border-zinc-700"
            : "bg-zinc-900/40 text-zinc-300 border-zinc-800"
        }`}
      >
        ▣ HIGHLIGHTS
      </button>
      <button
        onClick={() => setTab("builder")}
        className={`px-3 py-2 rounded-xl text-sm font-medium border relative ${
          tab === "builder"
            ? "bg-zinc-900 text-white border-zinc-700"
            : "bg-zinc-900/40 text-zinc-300 border-zinc-800"
        }`}
      >
        ◻ EVENT BUILDER
        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-yellow-500" />
      </button>
      <div className="ml-auto flex gap-2">
        <span className="h-9 w-9 grid place-items-center rounded-lg bg-zinc-900 border border-zinc-800">☰</span>
      </div>
    </div>
  );
}

function HighlightsCard({ left, right, odds }) {
  return (
    <div className="min-w-[280px] rounded-2xl overflow-hidden bg-[radial-gradient(60%_60%_at_70%_40%,rgba(212,175,55,0.35),#111)] border border-zinc-800">
      <div className="p-3 text-xs text-zinc-300 flex items-center justify-between">
        <span>International • Elite Club Friendlies</span>
        <span>Today, 21:00</span>
      </div>
      <div className="px-3 pb-3">
        <div className="flex items-center justify-between">
          <div className="text-white font-medium">{left}</div>
          <div className="text-zinc-200 font-medium">{right}</div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {["1", "draw", "2"].map((k, i) => (
            <button key={k} className="bg-zinc-900 border border-zinc-800 rounded-xl py-2 text-sm text-white">
              {k === "1" ? "1" : k === "2" ? "2" : "draw"} {odds[i]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Highlights({ items }) {
  const ref = useRef(null);
  const scroll = (dx) => ref.current?.scrollBy({ left: dx, behavior: "smooth" });
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <div className="h-1 w-20 rounded bg-zinc-700" />
        <div className="flex gap-2">
          <button onClick={() => scroll(-300)} className="h-9 w-9 rounded-md bg-zinc-900 border border-zinc-800">‹</button>
          <button onClick={() => scroll(300)} className="h-9 w-9 rounded-md bg-zinc-900 border border-zinc-800">›</button>
        </div>
      </div>
      <div ref={ref} className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
        {items.map((m) => <HighlightsCard key={m.id} {...m} />)}
      </div>
    </div>
  );
}

/** Match card that works for all three sports.
 * `score` can be a number pair (NBA/Football) or a string summary (Cricket).
 */
function MatchCard({ league, when, home, away, odds, status, score }) {
  const live = ["LIVE", "IN_PLAY", "PAUSED", "1st Qtr", "2nd Qtr", "3rd Qtr", "4th Qtr", "Halftime"].includes(status);

  // Try to normalize scores:
  const homeScore =
    typeof score?.fullTime?.home === "number" ? score.fullTime.home :
    typeof score?.fullTime?.home === "string" ? score.fullTime.home : null;

  const awayScore =
    typeof score?.fullTime?.away === "number" ? score.fullTime.away :
    typeof score?.fullTime?.away === "string" ? score.fullTime.away : null;

  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-2xl p-3 ${live ? "ring-1 ring-yellow-500/30" : ""}`}>
      <div className="flex items-center justify-between text-sm text-zinc-400">
        <span className="truncate">{league}</span>
        <span className={`text-xs ${live ? "text-yellow-400" : "text-zinc-400"}`}>{live ? "LIVE" : status}</span>
      </div>
      <div className="mt-1 text-xs text-zinc-400">Today, {when} ⌁</div>

      <div className="mt-2">
        <div className="flex items-center gap-2">
          <span className="h-6 w-6 grid place-items-center rounded-full bg-zinc-800">🏳️</span>
          <div className="text-white flex-1 flex items-center justify-between">
            <span className="truncate">{home}</span>
            {homeScore != null && <span className="font-semibold ml-2">{homeScore}</span>}
          </div>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="h-6 w-6 grid place-items-center rounded-full bg-zinc-800">🏴</span>
          <div className="text-zinc-200 flex-1 flex items-center justify-between">
            <span className="truncate">{away}</span>
            {awayScore != null && <span className="font-semibold ml-2">{awayScore}</span>}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {["1", "draw", "2"].map((k, i) => (
          <button key={k} className="bg-zinc-800 rounded-xl py-2 border border-zinc-700 text-white text-sm">
            {k === "1" ? "1" : k === "2" ? "2" : "draw"} {odds?.[i] ?? "—"}
          </button>
        ))}
      </div>
    </div>
  );
}

function OddsFormat({ value, onChange }) {
  const options = ["European", "American", "Fractional"];
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-6">
      <div className="text-xs tracking-widest text-zinc-400">ODDS FORMAT</div>
      <div className="mt-2 relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between"
        >
          <span>{value}</span><span>▾</span>
        </button>
        {open && (
          <div className="absolute left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden z-10">
            {options.map((opt) => (
              <button
                key={opt}
                className={`w-full text-left px-4 py-3 hover:bg-zinc-800 ${opt === value ? "text-white" : "text-zinc-300"}`}
                onClick={() => { onChange(opt); setOpen(false); }}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** ─────────────────────────────────────────────────────────────────────────────
 *  Main Screen
 *  ────────────────────────────────────────────────────────────────────────────
 *  Expects these backend endpoints already mounted on your Node server:
 *    - Football:  GET /api/sports/live?status=LIVE|IN_PLAY|SCHEDULED
 *    - NBA:       GET /api/sports/nba/live
 *    - Cricket:   GET /api/sports/cricket/live
 */
export default function Sports() {
  const [tab, setTab] = useState("highlights");
  const [oddsFmt, setOddsFmt] = useState("European");
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sport, setSport] = useState("football"); // football | nba | cricket

  // Optional static highlight demo (kept from your original design)
  const highlights = useMemo(
    () => [
      { id: "h1", left: "ACF Fiorentina", right: "Arsenal FC", odds: ["2.60", "3.10", "2.98"] },
      { id: "h2", left: "Empoli FC", right: "Sassuolo Calcio", odds: ["2.98", "3.75", "2.06"] },
    ],
    []
  );

  async function fetchMatches() {
    setLoading(true);

    let urls = [];
    if (sport === "football") {
      // Try live, then in-play, then scheduled (today) to avoid empty screens
      urls = [
        "/api/sports/live?status=LIVE",
        "/api/sports/live?status=IN_PLAY",
        "/api/sports/live?status=SCHEDULED",
      ];
    } else if (sport === "nba") {
      urls = ["/api/sports/nba/live"];
    } else if (sport === "cricket") {
      urls = ["/api/sports/cricket/live"];
    }

    let got = [];
    for (const u of urls) {
      try {
        const r = await fetch(u);
        const data = await r.json();
        if (data?.matches?.length) { got = data.matches; break; }
      } catch (_) {
        // ignore and try next URL
      }
    }

    setMatches(got);
    setLoading(false);
  }

  useEffect(() => {
    fetchMatches();
    const t = setInterval(fetchMatches, 30_000); // poll every 30s
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sport]); // re-fetch when switching sport

  return (
    <div className="bg-[#0e0e10] text-white">
      <div className="px-4 pb-28">
        {/* Shortcuts bar + Sport switch */}
        <div className="mt-2 flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
          <IconChip label="Home" active />
          <IconChip label="LIVE" />
          <IconChip label="Fav" />
          <IconChip label="Slip" />
          <IconChip label="Ball" />
          <IconChip label="More" />
          <div className="ml-auto flex gap-2">
            {["football", "nba", "cricket"].map((s) => (
              <button
                key={s}
                onClick={() => setSport(s)}
                className={[
                  "px-3 h-10 rounded-xl border capitalize",
                  sport === s ? "bg-yellow-500/90 text-black border-yellow-600" : "bg-zinc-900 text-zinc-300 border-zinc-800",
                ].join(" ")}
                title={`Switch to ${s}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <PillTabs tab={tab} setTab={setTab} />

        {/* Highlights carousel (football only, to match your original context) */}
        {tab === "highlights" && sport === "football" && <Highlights items={highlights} />}

        {/* Match list */}
        <div className="mt-4 space-y-3">
          {loading && <div className="text-sm text-zinc-400">Fetching {sport}…</div>}
          {!loading && matches.length === 0 && (
            <div className="text-sm text-zinc-400">No {sport} matches found right now.</div>
          )}
          {matches.map((m) => (
            <MatchCard key={m.id} {...m} />
          ))}
        </div>

        {/* Odds format selector + disclaimer */}
        <OddsFormat value={oddsFmt} onChange={setOddsFmt} />
        <p className="mt-4 text-[11px] leading-relaxed text-zinc-400">
          Although every effort is made to ensure data displayed here is accurate, it may be delayed and is provided for
          information purposes only.
        </p>
      </div>
    </div>
  );
}

/* tailwind helpers you might already have:
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
*/
