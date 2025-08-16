// src/layouts/MainLayout.jsx
import { Outlet } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import TopBar from "../components/TopBar";
import WebApp from "@twa-dev/sdk";
import { useEffect, useState } from "react";
import { telegramAuth, getBalance } from "../api";

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
    try {
      WebApp.ready();
      WebApp.expand();
      WebApp.setHeaderColor("#0a0a0a");
      WebApp.setBackgroundColor("#000000");
    } catch {}

    let stopPolling = () => {};

    (async () => {
      try {
        // 1) Login → sets localStorage.userId
        const u = await telegramAuth();

        const name =
          u.first_name && u.last_name
            ? `${u.first_name} ${u.last_name}`
            : u.first_name || u.username || "Guest";
        setUsername(name);
        setAvatar(u.photo_url || "/assets/avatar.png");

        // Show DB coins immediately
        setCoins(toNum(u.coins));

        // 2) Confirm from backend once (now that x-user-id is set)
        try {
          const c = await getBalance();          // throws on bad response
          setCoins(toNum(c));
        } catch {
          /* ignore single bad read */
        }

        // 3) Start polling ONLY AFTER login succeeded
        stopPolling = (() => {
          let alive = true;
          (function tick() {
            setTimeout(async () => {
              if (!alive) return;
              try {
                const c = await getBalance();
                setCoins(toNum(c));             // only updates on success
              } catch {
                /* ignore failed poll; do not set 0 */
              } finally {
                if (alive) tick();
              }
            }, 4000);
          })();
          return () => { alive = false; };
        })();
      } catch (e) {
        console.error("[FE] telegramAuth failed:", e);
      }
    })();

    return () => {
      stopPolling?.();
    };
  }, []);

  // 🔔 Listen for Wallet.jsx -> window.dispatchEvent(new Event("balance:refresh"))
  useEffect(() => {
    const refresh = async () => {
      try {
        const c = await getBalance();
        setCoins(toNum(c));
      } catch {
        /* ignore errors so we don't overwrite with 0 */
      }
    };
    window.addEventListener("balance:refresh", refresh);
    return () => window.removeEventListener("balance:refresh", refresh);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Mini header */}
      <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-950/60">
        <h1 className="text-lg font-semibold">Lucky Bot</h1>
      </div>

      {/* TopBar gets live coins */}
      <TopBar
        balance={String(coins)}          // in-app coins from DB
        currency="COIN"
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
