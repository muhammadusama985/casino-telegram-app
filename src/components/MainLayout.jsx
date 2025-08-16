// src/layouts/MainLayout.jsx
import { Outlet } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import TopBar from "../components/TopBar";
import WebApp from "@twa-dev/sdk";
import { useEffect, useState } from "react";
import { telegramAuth, getBalance, pollBalance } from "../api";

export default function MainLayout() {
  const [username, setUsername] = useState("Guest");
  const [avatar, setAvatar] = useState("/assets/avatar.png");
  const [coins, setCoins] = useState(0);

  useEffect(() => {
    // Telegram UI polish (safe in webview; no-op elsewhere)
    try {
      WebApp.ready();
      WebApp.expand();
      WebApp.setHeaderColor("#0a0a0a");
      WebApp.setBackgroundColor("#000000");
    } catch {}

    // Auth + initial data
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

        // 1) Verify with backend via Telegram initData
        const u = await telegramAuth(); // also sets localStorage.userId
        console.log("[FE] userId in LS after login:", localStorage.getItem("userId"));

        const name =
          u.first_name && u.last_name
            ? `${u.first_name} ${u.last_name}`
            : u.first_name || u.username || "Guest";
        setUsername(name);
        setAvatar(u.photo_url || "/assets/avatar.png");

        // Set coins immediately from login payload to avoid flashing 0
        setCoins(Number(u.coins ?? 0));
      } catch (e) {
        console.error("[FE] telegramAuth failed:", e);
      }

      // 2) Defensive: fetch balance once more from backend
      try {
        const c = await getBalance(); // Number
        setCoins(Number(c));
      } catch (e) {
        console.error("[FE] getBalance failed:", e);
      }
    })();

    // 3) Keep balance fresh every 4s so watcher credits appear automatically
    const stopPolling = pollBalance((c) => setCoins(Number(c)), 4000);

    // 4) Optional: listen for manual refresh events (e.g. after sendTransaction)
    const refresh = async () => {
      try {
        const c = await getBalance();
        setCoins(Number(c));
      } catch (e) {
        console.error("[FE] manual balance refresh failed:", e);
      }
    };
    window.addEventListener("balance:refresh", refresh);

    return () => {
      stopPolling();
      window.removeEventListener("balance:refresh", refresh);
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Mini header */}
      <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-950/60">
        <h1 className="text-lg font-semibold">Lucky Bot</h1>
      </div>

      {/* TopBar gets live data */}
      <TopBar
        balance={String(coins)}          // in-app coins from DB
        currency="COIN"                  // clearer than "T" (TON)
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
