import React from "react";

export default function TopBar({
  balance = "0.00000",
  currency = "T",
  avatarUrl = "/assets/avatar.jpg",
  username = "Guest",
  onClose,
  onCurrencyClick,
  onAvatarClick,
  rightMenu,
  className = "",
}) {
  return (
    <div className={`px-4 pt-4 pb-4 sticky top-0 z-40 bg-[#0e0e10] ${className}`}>
      <div className="flex items-center justify-between">
        {/* LEFT: Welcome message */}
        <div className="flex items-center gap-2">
          <span className="text-sm sm:text-base text-white">Welcome, {username}</span>
        </div>

        {/* RIGHT: Bigger Balance pill + Avatar + Optional menu */}
        <div className="flex items-center gap-4">
          <button
            onClick={onCurrencyClick}
            className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-3 active:scale-[0.99] shadow-sm"
            aria-label="Balance"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-600 text-white text-sm">
              {currency?.[0] ?? "T"}
            </span>
            <span className="font-mono text-lg text-white leading-none tabular-nums min-w-[64px] text-right">
              {balance}
            </span>
            <span className="text-zinc-400 text-base">▾</span>
          </button>

          <button
            onClick={onAvatarClick}
            className="h-10 w-10 rounded-full overflow-hidden border border-zinc-700"
            aria-label="Profile"
          >
            <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
          </button>

          {rightMenu ? rightMenu : null}
        </div>
      </div>
    </div>
  );
}
