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
    <div className={`px-4 pt-3 pb-3 sticky top-0 z-40 bg-[#0e0e10] ${className}`}>
      <div className="flex items-center justify-between">
        {/* LEFT: Welcome message with avatar */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-white">Welcome, {username}</span>
        </div>

        {/* RIGHT: Balance pill + Avatar + Optional menu */}
        <div className="flex items-center gap-3">
          <button
            onClick={onCurrencyClick}
            className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 active:scale-[0.99]"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-600 text-white text-xs">
              {currency?.[0] ?? "T"}
            </span>
            <span className="font-mono text-sm text-white">{balance}</span>
            <span className="text-zinc-400">▾</span>
          </button>

          <button
            onClick={onAvatarClick}
            className="h-9 w-9 rounded-full overflow-hidden border border-zinc-700"
          >
            <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
          </button>

          {rightMenu ? rightMenu : null}
        </div>
      </div>
    </div>
  );
}
