// src/pages/References.jsx
import { useEffect, useState } from "react";
import { referrals, rewards, users } from "../api";

export default function References() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      // You can still pre-load counts/coins/rewardLog via summary:
      const normalized = await referrals.summary();
      setSummary(normalized);
    } catch (e) {
      setError("Failed to load referral summary.");
      alert(`Failed to load summary: ${e?.message || "Unknown error"}`);
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
      const r = await rewards.dailyClaim();
      alert(`Daily claimed: +${r?.rewardAdded ?? 0} coin`);
      await load();
    } catch (e) {
      alert(
        e?.payload?.error === "already-claimed-today"
          ? "You already claimed today."
          : `Daily claim failed: ${e?.message || "Unknown error"}`
      );
    } finally {
      setClaiming(false);
    }
  }

  async function handleGetLink() {
    try {
      const userId = users.getUserId(); // from localStorage set at /auth/login
      if (!userId) return alert("Not logged in yet — open via Telegram and let the app log you in first.");

      const r = await referrals.getLink(userId);
      if (!r?.referralLink) {
        alert("No referral link returned for your account.");
      }

      // Merge into summary so the input updates
      setSummary((prev) => ({
        ...(prev || {}),
        referralCode: r?.referralCode || (prev && prev.referralCode),
        referralLink: r?.referralLink || (prev && prev.referralLink),
      }));

      alert("Referral link fetched.");
    } catch (e) {
      alert(`Get link failed: ${e?.message || "Unknown error"}`);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <HeaderCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="rounded-xl border border-red-800/40 bg-red-900/20 text-red-200 p-4">
          {error}
        </div>
      </div>
    );
  }

  const refLink = summary?.referralLink || "";
  const refCode = summary?.referralCode || "";

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <HeaderCard refCode={refCode} refLink={refLink} />

      {/* Rewards */}
      <section className="rounded-2xl border border-zinc-800/70 bg-zinc-900/60 backdrop-blur-sm p-4 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold tracking-tight">Rewards</h2>
          <div className="text-sm opacity-80">
            Balance:{" "}
            <span className="inline-flex items-center gap-1 font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {Number(summary?.coins || 0).toFixed(2)} coins
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-sm font-medium">Daily login reward</div>
            <div className="text-xs opacity-70">Claim +0.1 coin once per day</div>
          </div>
          <button
            onClick={handleClaim}
            disabled={!canClaimToday || claiming}
            className={[
              "px-4 py-2 rounded-xl text-sm font-medium transition-all",
              "shadow-[0_8px_20px_-12px_rgba(16,185,129,0.5)]",
              canClaimToday
                ? "bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 active:scale-[0.98]"
                : "bg-zinc-800 cursor-not-allowed text-zinc-400",
            ].join(" ")}
          >
            {claiming ? "Claiming…" : canClaimToday ? "Claim +0.1" : "Already claimed"}
          </button>
        </div>
      </section>

      {/* Referrals */}
      <section className="rounded-2xl border border-zinc-800/70 bg-zinc-900/60 backdrop-blur-sm p-4 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.6)] space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Referrals</h2>

          {/* small stat pill */}
          <span className="rounded-full bg-zinc-800/80 border border-zinc-700/60 px-3 py-1 text-xs text-zinc-300">
            {summary?.referralCount ?? 0} joined
          </span>
        </div>

        <div className="text-sm space-y-2">
          <div className="opacity-80">Your referral link</div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                readOnly
                value={refLink}
                placeholder="Press “Get referral link”"
                className="w-full bg-zinc-800/90 text-white rounded-xl px-3 py-2 text-xs border border-zinc-700/70 focus:outline-none focus:ring-2 focus:ring-emerald-600/60"
              />
              {refLink ? (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-emerald-400">
                  ready
                </span>
              ) : null}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleGetLink}
                className="px-3 py-2 rounded-xl text-xs font-medium bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 transition-all shadow-[0_8px_20px_-12px_rgba(37,99,235,0.5)] active:scale-[0.98]"
              >
                Get referral link
              </button>
              <button
                onClick={async () => {
                  if (!refLink) return alert("No referral link to copy");
                  try {
                    await navigator.clipboard.writeText(refLink);
                    alert("Referral link copied!");
                  } catch {
                    const el = document.createElement("input");
                    el.value = refLink;
                    document.body.appendChild(el);
                    el.select();
                    el.setSelectionRange(0, 99999);
                    const ok = document.execCommand("copy");
                    document.body.removeChild(el);
                    alert(ok ? "Referral link copied!" : "Could not copy link.");
                  }
                }}
                className="px-3 py-2 rounded-xl text-xs font-medium bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-all active:scale-[0.98]"
              >
                Copy
              </button>
            </div>
          </div>

          <div className="text-xs opacity-70">
            Press “Get referral link” to fetch from the server (uses your cached link in DB).
          </div>
        </div>

        <div className="text-sm">
          <div className="flex items-center justify-between">
            <div>Referral count</div>
            <div className="font-semibold">{summary?.referralCount ?? 0}</div>
          </div>
          <div className="mt-3 space-y-2">
            <div className="text-xs opacity-70">
              Next bonus in{" "}
              <b className="text-emerald-400">{summary?.nextBonusIn ?? 10}</b> referrals
            </div>
            <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-[width] duration-500"
                style={{ width: `${(((summary?.referralCount ?? 0) % 10) / 10) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Recent reward activity */}
      <section className="rounded-2xl border border-zinc-800/70 bg-zinc-900/60 backdrop-blur-sm p-4 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.6)]">
        <h3 className="text-lg font-semibold mb-3 tracking-tight">Recent reward activity</h3>

        <div className="space-y-2">
          {(summary?.rewardLog || []).length === 0 && (
            <div className="text-sm opacity-70">No rewards yet.</div>
          )}
          {(summary?.rewardLog || []).map((r, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between text-sm rounded-lg bg-zinc-900/50 px-3 py-2 border border-zinc-800/60"
            >
              <div className="opacity-90">
                {r.type === "daily" ? "Daily login" : "Referral bonus"}
                {r?.meta?.blocks ? ` (+${r.meta.blocks} block${r.meta.blocks > 1 ? "s" : ""})` : ""}
              </div>
              <div className="font-semibold text-emerald-400">+{r.amount} coin</div>
              <div className="text-xs opacity-60">{new Date(r.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>

        {/* On-screen payload inspector (mobile-friendly) */}
        <details className="text-xs opacity-60 mt-3">
          <summary className="cursor-pointer select-none">Debug payload</summary>
          <pre className="whitespace-pre-wrap break-all mt-2 p-2 rounded bg-zinc-950/60 border border-zinc-800/60">
            {JSON.stringify(summary || {}, null, 2)}
          </pre>
        </details>
      </section>
    </div>
  );
}

/* ---------- tiny presentational helpers (no logic changes) ---------- */

function HeaderCard({ refCode, refLink } = {}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-800/70 bg-zinc-950/60 backdrop-blur-sm p-4 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.6)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_400px_at_10%_-20%,rgba(16,185,129,0.15),transparent),radial-gradient(800px_300px_at_90%_-10%,rgba(59,130,246,0.12),transparent)]" />
      <div className="relative">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Rewards & Referrals</h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Claim your daily reward and share your link to earn bonuses every 10 joins.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-600/30 bg-emerald-600/10 px-3 py-1 text-xs text-emerald-300">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Referral code: <b className="tracking-wider">{refCode || "—"}</b>
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-600/30 bg-sky-600/10 px-3 py-1 text-xs text-sky-300">
            Link: <b className="truncate max-w-[200px] sm:max-w-[360px]">{refLink || "—"}</b>
          </span>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 backdrop-blur-sm p-4">
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-zinc-800 rounded w-2/5" />
        <div className="h-3 bg-zinc-800 rounded w-4/5" />
        <div className="h-3 bg-zinc-800 rounded w-3/5" />
      </div>
    </div>
  );
}
