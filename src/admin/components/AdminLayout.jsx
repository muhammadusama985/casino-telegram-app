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
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[240px_1fr] bg-gradient-to-br from-[#0b0b13] via-black to-[#0b0b13] bg-[radial-gradient(60rem_40rem_at_50%_10%,rgba(244,208,63,0.06),transparent),radial-gradient(45rem_30rem_at_90%_90%,rgba(168,85,247,0.08),transparent)]">
      <aside className="hidden lg:block border-r border-white/10 p-4 space-y-2 bg-white/10 backdrop-blur-xl rounded-r-3xl shadow-[0_0_40px_rgba(244,208,63,0.18)]">
        <div className="text-lg font-semibold mb-2 text-black">Admin</div>
        <nav className="space-y-1">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm transition ${
                  isActive
                    ? "bg-zinc-900 text-white ring-1 ring-amber-300/30 shadow-[0_0_18px_rgba(244,208,63,0.25)]"
                    : "bg-white/85 text-black hover:bg-amber-50"
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={logout}
          className="mt-4 w-full px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-sm text-white ring-1 ring-amber-300/20 shadow-[0_0_18px_rgba(244,208,63,0.18)] transition"
        >
          Logout
        </button>
      </aside>

      <main className="min-h-screen">
        {/* Topbar (mobile) */}
        <div className="lg:hidden border-b border-white/10 p-3 flex items-center justify-between bg-white/60 backdrop-blur-md">
          <div className="font-semibold text-black">Admin</div>
          <button
            onClick={logout}
            className="px-3 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-xs text-white ring-1 ring-amber-300/20 transition"
          >
            Logout
          </button>
        </div>

        <div className="p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
