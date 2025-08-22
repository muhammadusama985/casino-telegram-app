import { useEffect, useState } from 'react';
import { getReferralsInfo, claimDaily, telegramAuth, auth } from '../api';

export default function References() {
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null);
  const [msg, setMsg] = useState('');
  const [claiming, setClaiming] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      // ensure we have a logged-in user (x-user-id header comes from localStorage)
      const uid = auth?.getUserId?.() || '';
      if (!uid) {
        try {
          await telegramAuth(); // sets userId in localStorage
        } catch (e) {
          console.error('telegramAuth failed', e);
          throw new Error('Not logged in');
        }
      }

      const data = await getReferralsInfo();
      setInfo(data || {}); // never leave it null
      setMsg('');
    } catch (e) {
      console.error(e);
      setInfo({}); // keep UI from crashing
      setMsg(e.message || 'Failed to load data');
      setInfo({}); // keep UI rendering safely
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

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

            {/* ======= ONE PLACE: Code + Link (kept design language) ======= */}
            <div className="mt-3 grid gap-2">
              {/* Compact header row still shows the code at a glance */}
              <div className="flex items-center justify-between">
                <div className="text-sm opacity-80">Referral</div>
                <div className="font-mono">{inviteCode}</div>
              </div>

              {/* Unified card that contains both Code + Link with their own copy buttons */}
              <div className="rounded-xl bg-black/20 border border-white/10 p-3">
                <div className="text-xs opacity-70 mb-2">Share your code or link</div>

                {/* Row: Code badge + Copy */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm opacity-80">Code</span>
                  <span className="font-mono text-sm bg-white/5 border border-white/10 rounded-md px-2 py-1">
                    {inviteCode}
                  </span>
                  <button
                    onClick={() => copy(inviteCode)}
                    disabled={!inviteCode || inviteCode === '—'}
                    className="px-2 py-1 text-xs rounded-md bg-white/10 border border-white/10 active:scale-95 disabled:opacity-50"
                  >
                    Copy code
                  </button>
                </div>

                {/* Row: Link input + Copy */}
                <div className="flex items-center gap-2">
                  <span className="text-sm opacity-80">Link</span>
                  <input
                    className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm"
                    readOnly
                    value={inviteUrl}
                    placeholder="Invite link will appear here"
                  />
                  <button
                    onClick={() => copy(inviteUrl)}
                    disabled={!inviteUrl}
                    className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-sm active:scale-95 disabled:opacity-50"
                  >
                    Copy link
                  </button>
                </div>

                {!inviteUrl && (
                  <div className="text-xs opacity-60 mt-2">
                    Tip: set <code>WEBAPP_URL</code> in your backend env to your Vercel URL so the invite link can be built.
                  </div>
                )}
              </div>

              {/* Stats grid preserved */}
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Stat label="Joined via you" value={referralsCount} />
                <Stat label="Next reward in" value={nextRewardIn} />
                <Stat label="Referral coins" value={referralRewardCoins} />
              </div>

              {/* Recent referrals preserved */}
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
