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
      console.log('[References] summary loaded (raw):', data);

      // normalize shape: flat or { user: {...} }
      const u = data?.user ? data.user : data;

      // 🔑 prefer fresh virtual; fallback to cached-in-DB
      const link = u?.referralLink || u?.referralLinkCached || "";

      setSummary({ ...u, referralLink: link }); // ensure summary.referralLink is always set

      if (!link) {
        console.warn('[References] no referral link (virtual or cached) in payload:', u);
        alert('No referral link returned. Check server returns virtuals or cached value.');
      } else {
        console.log('[References] using link:', link);
      }
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
    const link = summary?.referralLink || "";
    console.log('[References] copying value:', link);
    try {
      await navigator.clipboard.writeText(link);
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
      {/* Rewards card ... unchanged */}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-4">
        <h2 className="text-lg font-semibold">Referrals</h2>

        <div className="text-sm">
          <div className="opacity-80 mb-1">Your referral link</div>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={summary?.referralLink || ""}   // now guaranteed from load()
              className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-xs"
            />
            <button onClick={copyLink} className="px-3 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-xs">
              Copy
            </button>
          </div>
          <div className="text-xs opacity-70 mt-1">
            Share this link. Every 10 joins = +1 coin.
          </div>
        </div>

        {/* rest of the component unchanged */}
      </div>
    </div>
  );
}
