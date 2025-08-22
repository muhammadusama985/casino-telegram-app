// src/pages/References.jsx
import { useEffect, useState } from "react";

// small fetch helpers (adjust base URL / auth header as in your app)
async function apiGET(path) {
  const res = await fetch(path, { headers: { "x-user-id": localStorage.getItem("x-user-id") || "" }});
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
async function apiPOST(path, body={}) {
  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": localStorage.getItem("x-user-id") || ""
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function References() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [copyOk, setCopyOk] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const data = await apiGET("/referrals/summary");
      setSummary(data);
    } catch (e) {
      console.error(e);
      setError("Failed to load referral summary.");
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
    // same UTC day?
    return !(
      last.getUTCFullYear() === now.getUTCFullYear() &&
      last.getUTCMonth() === now.getUTCMonth() &&
      last.getUTCDate() === now.getUTCDate()
    );
  })();

  async function handleClaim() {
    setClaiming(true);
    setError("");
    try {
      await apiPOST("/rewards/daily-claim");
      await load();
    } catch (e) {
      console.error(e);
      setError("Already claimed today or server error.");
    } finally {
      setClaiming(false);
    }
  }

  async function copyLink() {
    if (!summary?.referralLink) return;
    try {
      await navigator.clipboard.writeText(summary.referralLink);
      setCopyOk(true);
      setTimeout(() => setCopyOk(false), 1500);
    } catch {
      setError("Couldn’t copy link.");
    }
  }

  if (loading) {
    return <div className="p-4 text-sm text-zinc-400">Loading…</div>;
  }

  if (error) {
    return <div className="p-4 text-sm text-red-400">{error}</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Balance + Daily */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Rewards</h2>
          <div className="text-sm opacity-80">Balance: <b>{summary?.coins?.toFixed(2)}</b> coins</div>
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

      {/* Referral */}
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
              {copyOk ? "Copied!" : "Copy"}
            </button>
          </div>
          <div className="text-xs opacity-70 mt-1">
            Share this link. When people join via your link, your referral count increases.
            Every 10 joins = +1 coin.
          </div>
        </div>

        <div className="text-sm">
          <div className="flex items-center justify-between">
            <div>Referral count</div>
            <div className="font-semibold">{summary?.referralCount ?? 0}</div>
          </div>
          {/* Progress to next 10 */}
          <div className="mt-2">
            <div className="text-xs opacity-70 mb-1">
              Next bonus in <b>{summary?.nextBonusIn ?? 10}</b> referrals
            </div>
            <div className="h-2 bg-zinc-800 rounded">
              <div
                className="h-2 bg-emerald-600 rounded"
                style={{
                  width: `${(((summary?.referralCount ?? 0) % 10) / 10) * 100}%`
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Reward Activity */}
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
              <div className="text-xs opacity-60">
                {new Date(r.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
