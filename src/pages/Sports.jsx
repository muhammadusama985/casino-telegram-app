// src/pages/Sports.jsx
import { useMemo, useState, useRef } from "react";

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
      {/* View toggle icon (optional) */}
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
            <button
              key={k}
              className="bg-zinc-900 border border-zinc-800 rounded-xl py-2 text-sm text-white"
            >
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
          <button onClick={() => scroll(-300)} className="h-9 w-9 rounded-md bg-zinc-900 border border-zinc-800">
            ‹
          </button>
          <button onClick={() => scroll(300)} className="h-9 w-9 rounded-md bg-zinc-900 border border-zinc-800">
            ›
          </button>
        </div>
      </div>
      <div ref={ref} className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
        {items.map((m) => (
          <HighlightsCard key={m.id} {...m} />
        ))}
      </div>
    </div>
  );
}

function MatchCard({ league, when, home, away, odds }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3">
      <div className="flex items-center justify-between text-sm text-zinc-400">
        <span>{league}</span>
        <button className="text-zinc-400">☆</button>
      </div>

      <div className="mt-1 text-xs text-zinc-400">Today, {when} ⌁</div>

      <div className="mt-2">
        <div className="flex items-center gap-2">
          <span className="h-6 w-6 grid place-items-center rounded-full bg-zinc-800">🏳️</span>
          <div className="text-white">{home}</div>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="h-6 w-6 grid place-items-center rounded-full bg-zinc-800">🏴</span>
          <div className="text-zinc-200">{away}</div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {["1", "draw", "2"].map((k, i) => (
          <button
            key={k}
            className="bg-zinc-800 rounded-xl py-2 border border-zinc-700 text-white text-sm"
          >
            {k === "1" ? "1" : k === "2" ? "2" : "draw"} {odds[i]}
          </button>
        ))}
      </div>
    </div>
  );
}

function OddsFormat({ value, onChange }) {
  const options = ["European", "American", "Fractional"];
  return (
    <div className="mt-6">
      <div className="text-xs tracking-widest text-zinc-400">ODDS FORMAT</div>
      <div className="mt-2 relative">
        <button className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between">
          <span>{value}</span>
          <span>▾</span>
        </button>
        {/* Simple dropdown */}
        <div className="absolute left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {options.map((opt) => (
            <button
              key={opt}
              className={`w-full text-left px-4 py-3 hover:bg-zinc-800 ${
                opt === value ? "text-white" : "text-zinc-300"
              }`}
              onClick={() => onChange(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Sports() {
  const [tab, setTab] = useState("highlights");
  const [oddsFmt, setOddsFmt] = useState("European");

  const highlights = useMemo(
    () => [
      { id: "h1", left: "ACF Fiorentina", right: "Arsenal FC", odds: ["2.60", "3.10", "2.98"] },
      { id: "h2", left: "Empoli FC", right: "Sassuolo Calcio", odds: ["2.98", "3.75", "2.06"] },
    ],
    []
  );

  const matches = useMemo(
    () => [
      {
        id: "m1",
        league: "International • Elite Club Friendlies",
        when: "21:00",
        home: "Bayer Leverkusen",
        away: "Pisa SC",
        odds: ["1.42", "4.70", "6.00"],
      },
      {
        id: "m2",
        league: "International • Elite Club Friendlies",
        when: "21:30",
        home: "Empoli FC",
        away: "Sassuolo Calcio",
        odds: ["2.98", "3.75", "2.06"],
      },
      {
        id: "m3",
        league: "International • UEFA Champions League",
        when: "22:00",
        home: "Malmo FF",
        away: "FC Copenhagen",
        odds: ["3.20", "3.05", "2.80"],
      },
    ],
    []
  );

  return (
    <div className="bg-[#0e0e10] text-white">
      <div className="px-4 pb-28">
        {/* Shortcuts bar */}
        <div className="mt-2 flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
          <IconChip label="Home" active />
          <IconChip label="LIVE" />
          <IconChip label="Fav" />
          <IconChip label="Slip" />
          <IconChip label="Ball" />
          <IconChip label="More" />
          <div className="ml-auto h-10 w-10 rounded-full bg-zinc-900 grid place-items-center border border-zinc-800">🔍</div>
        </div>

        {/* Tabs */}
        <PillTabs tab={tab} setTab={setTab} />

        {/* Highlights carousel */}
        {tab === "highlights" && <Highlights items={highlights} />}

        {/* Match list */}
        <div className="mt-4 space-y-3">
          {matches.map((m) => (
            <MatchCard key={m.id} {...m} />
          ))}
        </div>

        {/* Odds format selector + disclaimer */}
        <OddsFormat value={oddsFmt} onChange={setOddsFmt} />
        <p className="mt-4 text-[11px] leading-relaxed text-zinc-400">
          Although every effort is made to ensure data displayed on our site is accurate, this data is for
          information purposes only and should be used as a guide. We assume no liability for errors.
        </p>
      </div>
    </div>
  );
}

/* tailwind helpers you might already have:
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
*/
