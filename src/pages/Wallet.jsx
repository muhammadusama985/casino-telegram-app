import { useEffect, useState } from "react";
import { api, getBalance } from "../api";
import { useTonWallet, useTonConnectUI } from "@tonconnect/ui-react";
import { beginCell } from "@ton/ton";

function textCommentPayload(text) {
  const cell = beginCell().storeUint(0, 32).storeStringTail(text).endCell();
  return cell.toBoc().toString("base64");
}
const toNanoStr = (v) => String(Math.round(Number(v || 0) * 1e9));

function FieldRow({ label, value, onCopy, readOnly = true, onChange }) {
  return (
    <div className="mt-3">
      {label ? <div className="mb-2 text-sm text-zinc-400">{label}</div> : null}
      <div className="flex items-stretch bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <input
          value={value}
          readOnly={readOnly}
          onChange={onChange || (() => {})}
          className="flex-1 bg-transparent px-4 py-3 text-white outline-none"
        />
        {onCopy && (
          <button onClick={onCopy} className="px-3 bg-zinc-800 text-zinc-200 hover:bg-zinc-700" title="Copy">📋</button>
        )}
      </div>
    </div>
  );
}

export default function Wallet() {
  const wallet = useTonWallet();
  const [ui] = useTonConnectUI();

  const [adminAddress, setAdminAddress] = useState("");
  const [comment, setComment] = useState("");
  const [minAmountTon, setMinAmountTon] = useState(0.2);
  const [amountTon, setAmountTon] = useState("");
  const [loadingIntent, setLoadingIntent] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingIntent(true);
      try {
        const intent = await api("/deposits/intent", { method: "POST" });
        setAdminAddress(intent.adminAddress || "");
        setComment(intent.comment || "");
        setMinAmountTon(intent.minAmountTon || 0.2);
      } catch (e) {
        console.error("Failed to fetch deposit intent:", e.message);
      } finally {
        setLoadingIntent(false);
      }
    })();
  }, []);

  // --- DIRECT Tonkeeper connect (no wallet list) ---
  const connectTonkeeper = async () => {
    try {
      // clear old “last-wallet” cache once if it keeps opening a different wallet
      // localStorage.removeItem("ton-connect-ui_last-wallet");

      const all = await ui.getWallets();
      const tk = all.find(
        (w) => (w.appName && w.appName.toLowerCase() === "tonkeeper") || /tonkeeper/i.test(w.name)
      );

      if (!tk) {
        // Tonkeeper not present in the list: prompt to install
        const go = confirm("Tonkeeper is not installed. Open install page?");
        if (go) window.open("https://tonkeeper.com/download", "_blank");
        return;
      }

      // Try direct connect to Tonkeeper
      await ui.connectWallet(tk);

      // If the user accepts, useTonWallet() becomes non-null and we show “connected”
    } catch (e) {
      console.log("connectWallet error:", e);
      // User canceled or the app isn’t installed; offer install
      const go = confirm("Could not open Tonkeeper or connection was denied. Install Tonkeeper?");
      if (go) window.open("https://tonkeeper.com/download", "_blank");
    }
  };

  const transferTon = async () => {
    const amt = parseFloat(amountTon);
    if (!wallet) return alert("Please connect Tonkeeper first.");
    if (!adminAddress || !comment) return alert("Deposit info not ready yet.");
    if (!isFinite(amt) || amt <= 0) return alert("Enter a valid TON amount.");
    if (amt < minAmountTon) return alert(`Minimum is ${minAmountTon} TON.`);

    try {
      await ui.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [
          { address: adminAddress, amount: toNanoStr(amt), payload: textCommentPayload(comment) }
        ],
      });

      setTimeout(async () => { try { await getBalance(); } catch {} }, 4000);
      alert("Transfer submitted. We’ll credit coins after confirmation.");
    } catch (e) {
      console.error("Transfer error:", e);
      alert("Transfer canceled or failed.");
    }
  };

  const copy = async (t) => { try { await navigator.clipboard.writeText(t); } catch {} };

  return (
    <div className="bg-[#0e0e10] text-white">
      <div className="px-4 pb-28">
        <h2 className="mt-2 text-2xl font-semibold">Wallet</h2>

        {/* CONNECT TONKEEPER */}
        <div className="mt-4">
          {!wallet ? (
            <button
              onClick={connectTonkeeper}
              className="w-full h-12 rounded-xl bg-emerald-600 text-white font-semibold"
            >
              Connect Tonkeeper
            </button>
          ) : (
            <div className="w-full h-12 rounded-xl bg-emerald-800/40 border border-emerald-700 grid place-items-center text-emerald-300">
              ✅ Tonkeeper connected
            </div>
          )}

          {!wallet && (
            <p className="mt-2 text-xs text-zinc-400 text-center">
              Don’t have Tonkeeper?{" "}
              <a href="https://tonkeeper.com/download" target="_blank" rel="noreferrer" className="underline">
                Install it
              </a>{" "}
              and tap Connect again.
            </p>
          )}
        </div>

        {/* DEPOSIT FORM */}
        <div className="mt-5">
          <FieldRow
            label={`Amount (TON) — minimum ${minAmountTon}`}
            value={amountTon}
            readOnly={false}
            onChange={(e) => setAmountTon(e.target.value)}
          />

          <FieldRow
            label="Treasury / Admin TON address"
            value={adminAddress || (loadingIntent ? "Loading…" : "—")}
            onCopy={() => copy(adminAddress)}
          />

          <FieldRow
            label={<span>Destination tag / Comment — <span className="underline">MANDATORY</span></span>}
            value={comment || (loadingIntent ? "Loading…" : "—")}
            onCopy={() => copy(comment)}
          />

          <button
            onClick={transferTon}
            disabled={!wallet || !adminAddress || !comment}
            className="mt-4 w-full h-12 rounded-xl bg-yellow-500 text-black font-semibold disabled:opacity-50"
          >
            Transfer TON
          </button>

          <p className="mt-4 text-center text-sm text-zinc-400">
            Send only TON to this address. Use the exact comment above so we can credit your account.
          </p>
        </div>
      </div>
    </div>
  );
}
