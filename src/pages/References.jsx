// src/pages/References.jsx
import { useEffect, useState } from "react";
import { referrals, rewards } from "../api";

export default function References() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      console.log('[References] loading summary…');
      const data = await referrals.summary();
      console.log('[References] summary loaded:', data);
      setSummary(data);
    } catch (e) {
      console.error('[References] summary failed:', e.status, e.message, e.payload);
      setError("Failed to load referral summary.");
      alert(`Failed to load summary: ${e.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const canClaimToday = (() => {
    if (!summary) return false;
    if (!summary.lastDailyClaimAt) return true;
    const last = new Date(summary.lastDailyClaimAt);
    const now = new Date();
    return !(
      last.getUTCFullYear() === now.getUTCFullYear() &&
      last.getUTCMonth() === now.getUTCMonth() &&
      last.getUTCDate() === now.getUTCDate()
    );
  })();

  async function handleClaim() {
    setClaiming(true);
    try {
      console.log('[References] claiming daily…');
      const r = await rewards.dailyClaim();
      console.log('[References] daily claim OK:', r);
      alert(`Daily claimed: +${r?.rewardAdded ?? 0} coin`);
      await load();
    } catch (e) {
      console.error('[References] daily claim failed:', e.status, e.message, e.payload);
      alert(e?.payload?.error === 'already-claimed-today'
        ? 'You already claimed today.'
        : `Daily claim failed: ${e.message || 'Unknown error'}`);
    } finally {
      setClaiming(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(summary?.referralLink || "");
      alert('Referral link copied!');
    } catch (e) {
      console.error('[References] copy failed:', e);
      alert('Could not copy link.');
    }
  }

  if (loading) return <div className="p-4">Loading…</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Rewards</h2>
          <div className="text-sm opacity-80">Balance: <b>{Number(summary.coins).toFixed(2)}</b> coins</div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm">Daily login reward</div>
            <div className="text-xs opacity-70">Claim +0.1 coin once per day</div>
          </div>
          <button
            onClick={handleClaim}
            disabled={!canClaimToday || claiming}
            className={`px-3 py-2 rounded-lg text-sm ${
              canClaimToday ? "bg-emerald-600 hover:bg-emerald-500" : "bg-zinc-700 cursor-not-allowed"
            }`}
          >
            {claiming ? "Claiming…" : canClaimToday ? "Claim +0.1" : "Already claimed"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-4">
        <h2 className="text-lg font-semibold">Referrals</h2>

        <div className="text-sm">
          <div className="opacity-80 mb-1">Your referral link</div>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={summary?.referralLink || ""}
              className="w-full bg-zinc-800 rounded-lg px-3 py-2 text-xs"
            />
            <button onClick={copyLink} className="px-3 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-xs">
              Copy
            </button>
          </div>
          <div className="text-xs opacity-70 mt-1">
            Share this link. Every 10 joins = +1 coin.
          </div>
        </div>

        <div className="text-sm">
          <div className="flex items-center justify-between">
            <div>Referral count</div>
            <div className="font-semibold">{summary?.referralCount ?? 0}</div>
          </div>
          <div className="mt-2">
            <div className="text-xs opacity-70 mb-1">
              Next bonus in <b>{summary?.nextBonusIn ?? 10}</b> referrals
            </div>
            <div className="h-2 bg-zinc-800 rounded">
              <div
                className="h-2 bg-emerald-600 rounded"
                style={{ width: `${(((summary?.referralCount ?? 0) % 10) / 10) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
        <h3 className="text-lg font-semibold mb-3">Recent reward activity</h3>
        <div className="space-y-2">
          {(summary?.rewardLog || []).length === 0 && (
            <div className="text-sm opacity-70">No rewards yet.</div>
          )}
          {(summary?.rewardLog || []).map((r, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm">
              <div className="opacity-80">
                {r.type === 'daily' ? 'Daily login' : 'Referral bonus'}
                {r?.meta?.blocks ? ` (+${r.meta.blocks} block${r.meta.blocks>1?'s':''})` : ''}
              </div>
              <div className="font-medium">+{r.amount} coin</div>
              <div className="text-xs opacity-60">{new Date(r.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
