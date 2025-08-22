import { useEffect, useState } from 'react';
import { getReferralsInfo, claimDaily, telegramAuth, auth } from '../api';

export default function References() {
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null);
  const [msg, setMsg] = useState('');
  const [claiming, setClaiming] = useState(false);

  // --- Helper: ensure we have a userId in localStorage so x-user-id is sent
  const ensureAuth = async () => {
    let uid = auth?.getUserId?.() || '';
    if (uid) {
      console.debug('[refs] already authed uid=', uid);
      return uid;
    }

    // 1) Try Telegram WebApp auth (real prod path)
    try {
      console.debug('[refs] trying telegramAuth()');
      await telegramAuth(); // sets localStorage userId
      uid = auth?.getUserId?.() || '';
      if (uid) {
        console.debug('[refs] telegramAuth ok uid=', uid);
        return uid;
      }
    } catch (e) {
      console.warn('[refs] telegramAuth failed (likely outside Telegram):', e?.message || e);
    }

    // 2) Dev/browser fallback: allow ?uid=<mongoId> to simulate login
    const qp = new URLSearchParams(window.location.search);
    const uidFromQuery = qp.get('uid');
    if (uidFromQuery) {
      console.debug('[refs] using ?uid= fallback for dev:', uidFromQuery);
      localStorage.setItem('userId', uidFromQuery);
      return uidFromQuery;
    }

    // No way to auth → throw so UI shows a message
    throw new Error('Not logged in (no Telegram initData and no ?uid provided)');
  };

  const refresh = async () => {
    setLoading(true);
    try {
      await ensureAuth();

      console.debug('[refs] fetching /api/me/referrals');
      const data = await getReferralsInfo();
      console.debug('[refs] /api/me/referrals ->', data);

      setInfo(data || {}); // never leave it null
      setMsg('');
    } catch (e) {
      console.error('[refs] refresh failed:', e);
      setInfo({}); // keep UI from crashing
      setMsg(e.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // initial load
    refresh();

    // optional: refresh when tab becomes visible (nice in Telegram)
    const onVis = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copy = async (text) => {
    try {
      if (!text) throw new Error('No link to copy');
      await navigator.clipboard.writeText(text);
      setMsg('Copied!');
      setTimeout(() => setMsg(''), 1500);
    } catch {
      setMsg('Copy failed');
    }
  };

  const onClaimDaily = async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      const res = await claimDaily();
      if (res?.alreadyClaimed) {
        setMsg('Already claimed today');
      } else {
        setMsg(`+${res?.claimed ?? 0} claimed`);
      }
      await refresh();
    } catch (e) {
      console.error(e);
      setMsg(e.message || 'Claim failed');
    } finally {
      setClaiming(false);
    }
  };

  // Safe fallbacks so rendering never crashes
  const inviteUrl = info?.inviteUrl || '';
  const inviteCode = info?.inviteCode || '—';
  const rewardPerBatch = info?.rewardPerBatch ?? '—';
  const batchSize = info?.batchSize ?? '—';
  const referralsCount = info?.referralsCount ?? 0;
  const nextRewardIn = info?.nextRewardIn ?? 0;
  const referralRewardCoins = Number(info?.referralRewardCoins || 0).toFixed(2);
  const dailyStreak = info?.dailyStreak ?? 0;
  const lastDailyAt = info?.lastDailyAt ? new Date(info.lastDailyAt).toLocaleDateString() : '—';
  const dailyRewardCoins = Number(info?.dailyRewardCoins || 0).toFixed(2);
  const referred = Array.isArray(info?.referred) ? info.referred : [];

  return (
    <div className="min-h-screen bg-[#0B1020] text-white flex flex-col">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="text-xl font-bold">References & Daily Rewards</div>
        {msg && <div className="text-xs opacity-70">{msg}</div>}
      </div>

      {loading ? (
        <div className="flex-1 grid place-items-center opacity-70">Loading…</div>
      ) : (
        <div className="px-4 pb-8 space-y-6">
          {/* REFERRALS */}
          <section className="rounded-2xl bg-[#12182B] border border-white/10 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Your Referral</h2>
              <span className="text-xs opacity-70">
                Reward: {rewardPerBatch} coin every {batchSize} joins
              </span>
            </div>

            <div className="mt-3 grid gap-2">
              <div className="flex items-center justify-between">
                <div className="text-sm opacity-80">Referral Code</div>
                <div className="font-mono">{inviteCode}</div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm"
                  readOnly
                  value={inviteUrl}
                  placeholder="Invite link will appear here"
                />
                <button
                  onClick={() => copy(inviteUrl)}
                  className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-sm active:scale-95"
                >
                  Copy
                </button>
              </div>

              {!inviteUrl && (
                <div className="text-xs opacity-60">
                  Tip: set <code>WEBAPP_URL</code> in your backend env to your Vercel URL so the invite link can be built.
                </div>
              )}

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Stat label="Joined via you" value={referralsCount} />
                <Stat label="Next reward in" value={nextRewardIn} />
                <Stat label="Referral coins" value={referralRewardCoins} />
              </div>

              <div className="mt-4">
                <div className="text-sm opacity-70 mb-2">Recent referrals</div>
                {referred.length === 0 ? (
                  <div className="text-sm opacity-60">No referrals yet.</div>
                ) : (
                  <ul className="space-y-2 max-h-48 overflow-auto pr-1">
                    {referred.map((r) => (
                      <li key={r.id} className="flex items-center justify-between text-sm">
                        <span className="opacity-80">User •••{String(r.id).slice(-4)}</span>
                        <span className="opacity-60">{new Date(r.at).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          {/* DAILY */}
          <section className="rounded-2xl bg-[#12182B] border border-white/10 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Daily Reward</h2>
              <span className="text-xs opacity-70">Log in daily to claim +0.1 coin</span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <Stat label="Streak" value={dailyStreak} />
              <Stat label="Last claim" value={lastDailyAt} />
              <Stat label="Daily coins" value={dailyRewardCoins} />
            </div>

            <div className="mt-4">
              <button
                onClick={onClaimDaily}
                disabled={claiming}
                className={`w-full rounded-xl px-4 py-3 border font-semibold active:scale-95 ${
                  claiming
                    ? 'bg-emerald-600/20 border-emerald-500/20 opacity-60 cursor-not-allowed'
                    : 'bg-emerald-600/30 border-emerald-500/30'
                }`}
              >
                {claiming ? 'Claiming…' : 'Claim Daily'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg bg-black/20 border border-white/10 py-3">
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs opacity-70 mt-1">{label}</div>
    </div>
  );
}
