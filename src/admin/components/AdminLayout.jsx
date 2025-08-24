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
  { to: "/admin/reports", label: "Reports" },
  { to: "/admin/notifications", label: "Notifications" },
  { to: "/admin/security", label: "Security" },
];

export default function AdminLayout() {
  const navigate = useNavigate();

  function logout() {
    adminAuth.logout();
    navigate("/admin/login", { replace: true });
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[240px_1fr]">
      <aside className="hidden lg:block border-r border-zinc-800 p-4 space-y-2">
        <div className="text-lg font-semibold mb-2">Admin</div>
        <nav className="space-y-1">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm ${
                  isActive ? "bg-zinc-800" : "hover:bg-zinc-900"
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={logout}
          className="mt-4 w-full px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm"
        >
          Logout
        </button>
      </aside>

      <main className="min-h-screen">
        {/* Topbar (mobile) */}
        <div className="lg:hidden border-b border-zinc-800 p-3 flex items-center justify-between">
          <div className="font-semibold">Admin</div>
          <button
            onClick={logout}
            className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs"
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
