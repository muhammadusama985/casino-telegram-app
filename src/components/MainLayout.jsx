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
    // Telegram UI polish
    try {
      WebApp.ready();
      WebApp.expand();
      WebApp.setHeaderColor("#0a0a0a");
      WebApp.setBackgroundColor("#000000");
    } catch {}

    // 1) Telegram server auth + get user info
    (async () => {
      try {
        const tg = window.Telegram?.WebApp;
console.log('[FE] has tg?', !!tg, 'initData length:', tg?.initData?.length, tg?.initDataUnsafe?.user);

        const u = await telegramAuth(); // verifies on backend, stores tgId
        const name =
  (u.first_name && u.last_name) ? `${u.first_name} ${u.last_name}` :
   (u.first_name || u.username || "Guest");
        setUsername(name);
        setAvatar(u.photo_url || "/assets/avatar.png");
      } catch (e) {
        console.error(e);
      }

      // 2) Fetch balance from backend
      try {
        const c = await getBalance();
        setCoins(c);
      } catch (e) {
        console.error(e);
      }
    })();
   // 🔁 keep balance fresh every 4s (watcher credits asynchronously)
  const stop = pollBalance((coins) => setCoins(coins), 4000);
 return () => stop();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Mini header */}
      <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-950/60">
        <h1 className="text-lg font-semibold">Lucky Bot</h1>
      </div>

      {/* TopBar now receives live data */}
      <TopBar
        balance={String(coins.toFixed(5))}
        currency="T"
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
