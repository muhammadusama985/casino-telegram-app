// src/pages/Loyalty.jsx
import { useMemo } from "react";
// import avatar from "../assets/avatar.png";           // replace if you have another
// import trophy from "../assets/icons/trophy.png";     // optional local icons
// import chest from "../assets/icons/chest.png";       // optional
// If you don't have these icons yet, keep them commented or swap for emojis.

function StatPill({ icon = "⭐", value = 0 }) {
  return (
    <div className="flex items-center gap-2 bg-zinc-800/60 border border-zinc-700 rounded-full px-3 h-8">
      <span className="text-yellow-400">{icon}</span>
      <span className="text-white text-sm">{value}</span>
    </div>
  );
}

function Progress({ value = 0 }) {
  return (
    <div className="w-full h-3 rounded-full bg-zinc-800 overflow-hidden">
      <div
        className="h-full bg-yellow-400"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function CardShell({ children, glow = false }) {
  return (
    <div
      className={[
        "min-w-[230px] bg-zinc-900 border rounded-2xl px-4 py-4",
        glow
          ? "border-yellow-500/60 shadow-[0_0_0_2px_rgba(234,179,8,.25)]"
          : "border-zinc-800",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function MissionCard({ title, leftText, rewardText, glow = false, badge = "1" }) {
  return (
    <CardShell glow={glow}>
      <div className="text-white text-lg font-bold">{title}</div>

      <div className="inline-flex items-center mt-3 bg-cyan-700/70 text-white text-xs font-semibold rounded-full px-3 py-1">
        Left {leftText}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="relative h-16 w-16 rounded-xl bg-zinc-800 grid place-items-center">
          {/* icon or chest image */}
          {/* {chest ? <img src={chest} alt="" className="h-8 w-8 object-contain" /> : "🎁"} */}
          <span className="text-2xl">🎁</span>
          <div className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-purple-600 grid place-items-center text-white text-sm font-bold">
            {badge}
          </div>
        </div>

        <div>
          <div className="text-zinc-400 text-sm font-semibold">Reward:</div>
          <div className="text-white font-bold">{rewardText}</div>
        </div>
      </div>
    </CardShell>
  );
}

export default function Loyalty() {
  const missions = useMemo(
    () => [
      { id: "daily",  title: "Daily Slot",  left: "12:27:58", reward: "1 Wheel Spin", glow: true,  badge: "1" },
      { id: "weekly", title: "Weekly Slot", left: "05:12:27:58", reward: "2 Wheel Spins", glow: false, badge: "1" },
      { id: "monthly",title: "Monthly Slot",left: "29d 12:27", reward: "4 Wheel Spins", glow: false, badge: "1" },
    ],
    []
  );

  return (
    <div className="bg-[#0e0e10] text-white">
      <div className="px-4 pb-28">
        {/* PROFILE / LEVEL HEADER */}
        <div className="mt-3 bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <img
              // src={avatar}
              alt="avatar"
              className="h-12 w-12 rounded-full border border-zinc-700 object-cover"
            />
            <div className="flex items-center gap-2">
              <StatPill icon="⭐" value={0} />
              <StatPill icon="🪙" value={0} />
              <StatPill icon="👑" value={1} />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="font-semibold">1st Level</div>
            <div className="text-zinc-300 text-sm">
              Next level is <span className="font-semibold">Joker</span>
            </div>
          </div>

          <div className="mt-2">
            <Progress value={10} />
          </div>

          <div className="mt-1 text-center text-zinc-400 text-sm">
            <span className="font-semibold">900</span> points to get there
          </div>
        </div>

        {/* LEVELS TILE */}
        <div className="mt-4">
          <div className="w-[84px] h-[84px] rounded-2xl bg-zinc-900 border border-zinc-800 grid place-items-center">
            {/* {trophy ? <img src={trophy} alt="" className="h-8" /> : "👑"} */}
            <span className="text-2xl">👑</span>
          </div>
          <div className="mt-2 text-zinc-300 font-medium">Levels</div>
        </div>

        {/* LATEST MISSIONS */}
        <div className="mt-6 flex items-baseline justify-between">
          <h2 className="text-2xl font-extrabold">Latest missions</h2>
          <button className="text-zinc-300">VIEW ALL</button>
        </div>

        <div className="mt-3 flex gap-4 overflow-x-auto no-scrollbar pb-1">
          {missions.map((m) => (
            <MissionCard
              key={m.id}
              title={m.title}
              leftText={m.left}
              rewardText={m.reward}
              glow={m.glow}
              badge={m.badge}
            />
          ))}
        </div>

        {/* UPCOMING TOURNAMENTS */}
        <div className="mt-7 flex items-baseline justify-between">
          <h2 className="text-2xl font-extrabold">Upcoming tournaments</h2>
          <button className="text-zinc-300">VIEW ALL</button>
        </div>

        <div className="mt-3 rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800">
          {/* header image / banner */}
          <div className="relative">
            <div className="aspect-[16/9] bg-gradient-to-br from-zinc-800 to-black grid place-items-center">
              <div className="text-3xl font-extrabold">
                <span className="text-yellow-400">3,000</span>
              </div>
            </div>
            {/* chips */}
            <div className="absolute top-2 left-2">
              <span className="inline-flex items-center gap-1 bg-yellow-600 text-black text-xs font-bold rounded-full px-2 py-0.5">
                LIVE
              </span>
            </div>
            <div className="absolute bottom-2 right-2">
              <span className="inline-flex items-center gap-1 bg-zinc-800 text-zinc-200 text-xs rounded-full px-2 py-0.5">
                FINISHED
              </span>
            </div>
          </div>

          <div className="px-4 py-3 text-[12px] text-zinc-400 uppercase tracking-wide">
            Finished a day ago
          </div>
        </div>
      </div>
    </div>
  );
}

/* helpers
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
*/
