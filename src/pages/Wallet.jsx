// src/pages/Wallet.jsx
import { useEffect, useState } from "react";
import WebApp from "@twa-dev/sdk";
import { api, getBalance } from "../api";
import { useTonWallet, useTonConnectUI } from "@tonconnect/ui-react";
import { beginCell } from "@ton/ton";

// Build a text comment payload (opcode 0)
function textCommentPayload(text) {
  const cell = beginCell().storeUint(0, 32).storeStringTail(text).endCell();
  return cell.toBoc().toString("base64");
}

// Simple TON -> nanotons (string) converter
const toNanoStr = (v) => {
  const n = Number(v);
  if (!isFinite(n) || n <= 0) return "0";
  return String(Math.round(n * 1e9));
};

function FieldRow({ label, value, readOnly = true, onChange, onCopy }) {
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
          <button
            onClick={onCopy}
            className="px-3 bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
            title="Copy"
          >
            📋
          </button>
        )}
      </div>
    </div>
  );
}

export default function Wallet() {
  const wallet = useTonWallet();
  const [ui] = useTonConnectUI();

  // From backend
  const [adminAddress, setAdminAddress] = useState("");
  const [comment, setComment] = useState("");
  const [minAmountTon, setMinAmountTon] = useState(0.2);
  const [loadingIntent, setLoadingIntent] = useState(false);

  // User input
  const [amountTon, setAmountTon] = useState("");

  // Fetch a deposit intent on mount (treasury address + unique comment)
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

  // Helpful logs (optional)
  useEffect(() => {
    const off1 = ui.onStatusChange((info) => console.log("[TonConnect status]", info));
    const off2 = ui.onModalStateChange((state) => console.log("[TonConnect modal]", state));
    return () => {
      off1?.();
      off2?.();
    };
  }, [ui]);

  // Connect Tonkeeper directly (no wallet list)
  const connectTonkeeper = async () => {
    try {
      // localStorage.removeItem("ton-connect-ui_last-wallet"); // uncomment once if wrong wallet persists
      const wallets = await ui.getWallets();
      console.log(
        "[TC] wallets:",
        wallets.map((w) => ({ name: w.name, appName: w.appName, hasLink: !!w.universalLink }))
      );

      const tk = wallets.find(
        (w) =>
          (w.appName && w.appName.toLowerCase() === "tonkeeper") ||
          /tonkeeper/i.test(w.name)
      );

      if (!tk) {
        // Tonkeeper not detected in the list → suggest install
        const go = confirm("Tonkeeper is not installed. Open install page?");
        if (go) window.open("https://tonkeeper.com/download", "_blank");
        return;
      }

      // Try direct connect to Tonkeeper (no modal)
      await ui.connectWallet(tk);
      // If user accepts, useTonWallet() becomes non-null → UI shows “connected”
    } catch (err) {
      console.warn("connectWallet error:", err);

      // Fallback: open Tonkeeper universal link manually (works better in some Telegram webviews)
      try {
        const wallets = await ui.getWallets();
        const tk = wallets.find(
          (w) =>
            (w.appName && w.appName.toLowerCase() === "tonkeeper") ||
            /tonkeeper/i.test(w.name)
        );
        if (tk?.universalLink) {
          const link = tk.universalLink;
          if (WebApp?.openTelegramLink) {
            WebApp.openTelegramLink(link); // Telegram-friendly opener
          } else {
            window.open(link, "_blank") || (window.location.href = link);
          }
          return;
        }
      } catch (e2) {
        console.warn("universalLink fallback failed:", e2);
      }

      // Last resort: prompt install
      const go = confirm("Could not open Tonkeeper. Install Tonkeeper?");
      if (go) window.open("https://tonkeeper.com/download", "_blank");
    }
  };

  // Send TON to treasury with mandatory comment
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
          {
            address: adminAddress,
            amount: toNanoStr(amt), // TON → nanotons
            payload: textCommentPayload(comment),
          },
        ],
      });

      // Nudge balance refresh after a few seconds (watcher will credit)
      setTimeout(async () => {
        try { await getBalance(); } catch {}
      }, 4000);

      alert("Transfer submitted. We will credit coins after confirmation.");
    } catch (e) {
      console.error("Transfer error:", e);
      alert("Transfer canceled or failed.");
    }
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

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
              <a
                href="https://tonkeeper.com/download"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
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
            label={
              <span>
                Destination tag / Comment — <span className="underline">MANDATORY</span>
              </span>
            }
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
