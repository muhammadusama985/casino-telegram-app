// src/layouts/MainLayout.jsx
import { Outlet } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import TopBar from "../components/TopBar";
import WebApp from "@twa-dev/sdk";
import { useEffect, useState } from "react";
import { telegramAuth, getBalance, pollBalance } from "../api";

function toNum(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function MainLayout() {
  const [username, setUsername] = useState("Guest");
  const [avatar, setAvatar] = useState("/assets/avatar.png");
  const [coins, setCoins] = useState(0);

  useEffect(() => {
    // Telegram UI polish
    try {
      WebApp.ready();
      WebApp.expand();
      WebApp.setHeaderColor("#0a0a0a");
      WebApp.setBackgroundColor("#000000");
    } catch {}

    (async () => {
      try {
        const tg = window.Telegram?.WebApp;
        console.log(
          "[FE] has tg?",
          !!tg,
          "initData length:",
          tg?.initData?.length || 0,
          tg?.initDataUnsafe?.user
        );

        // 1) Login with backend; returns user incl. coins
        const u = await telegramAuth(); // sets localStorage.userId
        console.log("[FE] userId in LS after login:", localStorage.getItem("userId"));

        const name =
          u.first_name && u.last_name
            ? `${u.first_name} ${u.last_name}`
            : u.first_name || u.username || "Guest";
        setUsername(name);
        setAvatar(u.photo_url || "/assets/avatar.png");

        // Set coins from login payload (numeric guard)
        setCoins(toNum(u.coins));
      } catch (e) {
        console.error("[FE] telegramAuth failed:", e);
      }

      // 2) Defensive: fetch balance from backend (numeric)
      try {
        const c = await getBalance();
        setCoins(toNum(c));
      } catch (e) {
        console.error("[FE] getBalance failed:", e);
      }
    })();

    // 3) Auto-refresh every 4s
    const stop = pollBalance((c) => setCoins(toNum(c)), 4000);
    return () => stop();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Mini header */}
      <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-950/60">
        <h1 className="text-lg font-semibold">Lucky Bot</h1>
      </div>

      {/* TopBar gets live coins */}
      <TopBar
        balance={String(coins)}          // in-app coins
        currency="COIN"                  // label matches your DB 'coins'
        username={username}
        avatarUrl={avatar}
        onCurrencyClick={() => console.log("open currency selector")}
        onAvatarClick={() => console.log("open profile drawer")}
        className="bg-black"
      />

      <div className="px-4 pt-2 pb-[84px]">
        <Outlet />
      </div>

      <BottomNav />
    </div>
  );
}
