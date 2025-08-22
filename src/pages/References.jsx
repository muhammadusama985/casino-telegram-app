import { useEffect, useState } from 'react';
import { getReferralsInfo, claimDaily } from '../api';

export default function References() {
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null);
  const [msg, setMsg] = useState('');

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await getReferralsInfo();
      setInfo(data);
    } catch (e) {
      console.error(e);
      setMsg('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setMsg('Copied!');
      setTimeout(() => setMsg(''), 1500);
    } catch { setMsg('Copy failed'); }
  };

  const onClaimDaily = async () => {
    try {
      const res = await claimDaily();
      if (res.alreadyClaimed) {
        setMsg('Already claimed today');
      } else {
        setMsg(`+${res.claimed} claimed`);
      }
      await refresh();
    } catch (e) {
      console.error(e);
      setMsg('Claim failed');
    }
  };

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
                Reward: {info.rewardPerBatch} coin every {info.batchSize} joins
              </span>
            </div>

            <div className="mt-3 grid gap-2">
              <div className="flex items-center justify-between">
                <div className="text-sm opacity-80">Referral Code</div>
                <div className="font-mono">{info.inviteCode}</div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm"
                  readOnly
                  value={info.inviteUrl}
                />
                <button
                  onClick={() => copy(info.inviteUrl)}
                  className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-sm active:scale-95"
                >
                  Copy
                </button>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Stat label="Joined via you" value={info.referralsCount} />
                <Stat label="Next reward in" value={info.nextRewardIn} />
                <Stat label="Referral coins" value={Number(info.referralRewardCoins || 0).toFixed(2)} />
              </div>

              <div className="mt-4">
                <div className="text-sm opacity-70 mb-2">Recent referrals</div>
                {(!info.referred || info.referred.length === 0) ? (
                  <div className="text-sm opacity-60">No referrals yet.</div>
                ) : (
                  <ul className="space-y-2 max-h-48 overflow-auto pr-1">
                    {info.referred.map((r) => (
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
              <Stat label="Streak" value={info.dailyStreak ?? 0} />
              <Stat label="Last claim" value={info.lastDailyAt ? new Date(info.lastDailyAt).toLocaleDateString() : '—'} />
              <Stat label="Daily coins" value={Number(info.dailyRewardCoins || 0).toFixed(2)} />
            </div>

            <div className="mt-4">
              <button
                onClick={onClaimDaily}
                className="w-full rounded-xl px-4 py-3 bg-emerald-600/30 border border-emerald-500/30 font-semibold active:scale-95"
              >
                Claim Daily
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
