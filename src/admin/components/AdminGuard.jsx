// src/admin/components/AdminGuard.jsx
import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { adminAuth, getAdminToken } from "../AdminApi";

export default function AdminGuard() {
  const [state, setState] = useState({ loading: true, ok: false });
  const loc = useLocation();

  useEffect(() => {
    let alive = true;

    async function run() {
      const token = getAdminToken();
      if (!token) {
        if (alive) setState({ loading: false, ok: false });
        return;
      }
      try {
        await adminAuth.me();
        if (alive) setState({ loading: false, ok: true });
      } catch (e) {
        // 401/403 -> not authorized
        if (alive) setState({ loading: false, ok: false });
      }
    }

    run();
    return () => { alive = false; };
  }, [loc.key]);

  if (state.loading) {
    return (
      <div className="min-h-screen grid place-items-center text-sm opacity-70">
        Checking admin session…
      </div>
    );
  }

  if (!state.ok) {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
}
