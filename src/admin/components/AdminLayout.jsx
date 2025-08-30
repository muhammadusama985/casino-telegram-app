// src/admin/layout/AdminLayout.jsx
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { adminAuth } from "../AdminApi";

const nav = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/transactions", label: "Transactions" },
  { to: "/admin/games", label: "Games" },
  { to: "/admin/bonuses", label: "Bonuses" },
  { to: "/admin/referrals", label: "Referrals" },
  { to: "/admin/notifications", label: "Notifications" },
];

export default function AdminLayout() {
  const navigate = useNavigate();

  function logout() {
    adminAuth.logout();
    navigate("/admin/login", { replace: true });
  }

  return (
    <div className="relative min-h-screen grid grid-cols-1 lg:grid-cols-[240px_1fr] overflow-hidden
      bg-gradient-to-br from-[#0b0b13] via-black to-[#0b0b13]
      bg-[radial-gradient(60rem_40rem_at_20%_0%,rgba(244,208,63,0.07),transparent),radial-gradient(50rem_35rem_at_110%_100%,rgba(168,85,247,0.08),transparent)]
      [background-image:linear-gradient(transparent,transparent),repeating-linear-gradient(0deg,rgba(255,255,255,0.04)_0px,rgba(255,255,255,0.04)_1px,transparent_1px,transparent_24px)]
    ">
      {/* SIDE NAV */}
      <aside className="hidden lg:block p-4 space-y-3 border-r border-white/10
        bg-white/10 backdrop-blur-xl rounded-r-3xl
        shadow-[0_0_50px_rgba(244,208,63,0.20),0_0_80px_rgba(168,85,247,0.12)]
        ring-1 ring-amber-300/20
      ">
        <div className="text-lg font-extrabold mb-2 text-black tracking-tight">
          Admin
        </div>

        <nav className="space-y-2">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-xl text-sm transition-all duration-200 tracking-wide
                ${isActive
                  ? "bg-zinc-900 text-white ring-1 ring-amber-300/40 shadow-[0_0_22px_rgba(244,208,63,0.30)]"
                  : "bg-white/90 text-black hover:bg-white hover:ring-1 hover:ring-amber-300/30 hover:shadow-[0_10px_28px_-10px_rgba(244,208,63,0.35)] hover:translate-x-[1px]"
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={logout}
          className="mt-4 w-full px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-sm text-white
            ring-1 ring-amber-300/25 shadow-[0_0_22px_rgba(244,208,63,0.25)] transition-all duration-200"
        >
          Logout
        </button>
      </aside>

      {/* MAIN */}
      <main className="min-h-screen relative">
        {/* Topbar (mobile) */}
        <div className="lg:hidden border-b border-white/10 p-3 flex items-center justify-between
          bg-white/70 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.25)]
        ">
          <div className="font-semibold text-black">Admin</div>
          <button
            onClick={logout}
            className="px-3 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-xs text-white
              ring-1 ring-amber-300/25 transition"
          >
            Logout
          </button>
        </div>

        {/* Content */}
        <div className="p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
