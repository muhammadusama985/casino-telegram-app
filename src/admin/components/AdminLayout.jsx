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
    <div
      className="relative min-h-screen grid grid-cols-1 lg:grid-cols-[240px_1fr] overflow-hidden
                 bg-black text-yellow-300"
    >
      {/* Background gold glows (visual only) */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-44 -left-44 h-[44rem] w-[44rem] rounded-full blur-3xl opacity-15 bg-[radial-gradient(closest-side,rgba(250,204,21,0.35),transparent)] motion-safe:animate-[pulse_3.5s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-10rem] right-[-10rem] h-[40rem] w-[40rem] rounded-full blur-3xl opacity-10 bg-[radial-gradient(closest-side,rgba(234,179,8,0.35),transparent)] motion-safe:animate-[pulse_4s_ease-in-out_infinite]" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-[radial-gradient(50%_100%_at_50%_100%,rgba(250,204,21,0.20),transparent)]" />
      </div>

      {/* SIDE NAV */}
      <aside
        className="hidden lg:block p-4 space-y-3 border-r border-yellow-500/25
                   bg-zinc-950/80 backdrop-blur-xl rounded-r-3xl
                   ring-1 ring-yellow-400/20
                   shadow-[0_0_30px_rgba(250,204,21,0.28)]"
      >
        <div className="text-lg font-extrabold mb-2 tracking-tight text-yellow-100 drop-shadow-[0_0_12px_rgba(250,204,21,0.55)]">
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
                 ring-1
                 ${
                   isActive
                     ? "bg-zinc-950 text-yellow-100 ring-yellow-400/40 shadow-[0_0_22px_rgba(250,204,21,0.35)]"
                     : "bg-black/60 text-yellow-300 ring-yellow-500/20 hover:bg-black/80 hover:shadow-[0_10px_28px_-10px_rgba(250,204,21,0.35)]"
                 }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={logout}
          className="mt-4 w-full px-3 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-900 text-sm text-white
                     ring-1 ring-yellow-400/25 shadow-[0_0_22px_rgba(250,204,21,0.25)] transition-all duration-200"
        >
          Logout
        </button>
      </aside>

      {/* MAIN */}
      <main className="min-h-screen relative">
        {/* Topbar (mobile) */}
        <div
          className="lg:hidden border-b border-yellow-500/25 p-3 flex items-center justify-between
                     bg-zinc-950/80 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.45)]"
        >
          <div className="font-semibold text-yellow-100 drop-shadow-[0_0_10px_rgba(250,204,21,0.45)]">Admin</div>
          <button
            onClick={logout}
            className="px-3 py-1 rounded bg-zinc-950 hover:bg-zinc-900 text-xs text-white
                       ring-1 ring-yellow-400/25 transition"
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
