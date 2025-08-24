import { createContext, useContext, useEffect, useState } from 'react';
import { adminApi } from './AdminApi';

const Ctx = createContext(null);
export const useAdminAuth = () => useContext(Ctx);

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  async function probe() {
    try {
      const r = await adminApi.me();
      setAdmin(r?.admin || null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { probe(); }, []);

  async function login(email, password) {
    await adminApi.login(email, password);
    const r = await adminApi.me();
    setAdmin(r?.admin || null);
  }

  async function logout() {
    await adminApi.logout();
    setAdmin(null);
  }

  return (
    <Ctx.Provider value={{ admin, loading, login, logout }}>
      {children}
    </Ctx.Provider>
  );
}
