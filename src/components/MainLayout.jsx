import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";
import TopBar from "./TopBar";
import WebApp from "@twa-dev/sdk";
import { useEffect } from "react";

export default function MainLayout() {
  useEffect(() => {
    WebApp.ready();
    WebApp.expand();
    try {
      WebApp.setHeaderColor("#0a0a0a");
      WebApp.setBackgroundColor("#000000");
    } catch {}
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Mini header */}
      <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-950/60">
        <h1 className="text-lg font-semibold">Lucky Bot</h1>
      </div>

      {/* TopBar without close button */}
      <TopBar
        balance="0.00000"
        currency="T"
        avatarUrl="/assets/avatar.png"
        onCurrencyClick={() => console.log("open currency selector")}
        onAvatarClick={() => console.log("open profile drawer")}
        className="bg-black"
      />

      {/* Page content; bottom padding so content isn't hidden by the nav */}
      <div className="px-4 pt-2 pb-[84px]">
        <Outlet />
      </div>

      <BottomNav />
    </div>
  );
}
