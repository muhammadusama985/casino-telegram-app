export const API_BASE = import.meta.env.VITE_API_BASE;

export async function api(path, options = {}) {
  const tgId = localStorage.getItem('tgId') || '';
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (tgId) headers.set('x-telegram-id', tgId);

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

/**
 * Call this once when the app loads, *inside Telegram*.
 * - Verifies initData on your backend
 * - Stores telegramId locally to send on future requests
 * - Returns { id, first_name, last_name, username, photo_url }
 */
export async function telegramAuth() {
  const tg = window.Telegram?.WebApp;
  if (!tg?.initData) throw new Error('Open via Telegram bot');

  const r = await fetch(`${API_BASE}/auth/telegram`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData: tg.initData })
  });
  const { ok, telegramId } = await r.json();
  if (!ok || !telegramId) throw new Error('Telegram auth failed');

  localStorage.setItem('tgId', String(telegramId));

  // Return user info from Telegram (for UI)
  const u = tg.initDataUnsafe?.user || {};
  return {
    id: telegramId,
    first_name: u.first_name || 'Guest',
    last_name: u.last_name || '',
    username: u.username || '',
    photo_url: u.photo_url || '/assets/avatar.png'
  };
}

export async function getBalance() {
  const res = await api('/me'); // { ok, coins }
  return res?.coins ?? 0;
}
