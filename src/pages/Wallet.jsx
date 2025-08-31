// src/pages/Wallet.jsx
import { useEffect, useMemo, useState } from "react";
import WebApp from "@twa-dev/sdk";
import { api } from "../api";
import { useTonWallet, useTonConnectUI } from "@tonconnect/ui-react";
import { beginCell } from "@ton/ton";

function textCommentPayload(text) {
  const cell = beginCell().storeUint(0, 32).storeStringTail(text).endCell();
  return cell.toBoc().toString("base64");
}
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
          onChange={onChange || (() => { })}
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
  const tonWallet = useTonWallet();
  const [ui] = useTonConnectUI();

  const [adminAddress, setAdminAddress] = useState("");
  const [comment, setComment] = useState("");
  const [minAmountTon, setMinAmountTon] = useState(0.2);
  const [loadingIntent, setLoadingIntent] = useState(false);

  const [amountTon, setAmountTon] = useState("");
  const [sending, setSending] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);


  const connectedAddress = useMemo(() => {
    return (
      tonWallet?.account?.address ||
      tonWallet?.address ||
      ""
    );
  }, [tonWallet]);

  // fetch deposit intent on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingIntent(true);
      try {
        const intent = await api("/deposits/intent", { method: "POST" });
        if (cancelled) return;
        setAdminAddress(intent.adminAddress || "");
        setComment(intent.comment || "");
        setMinAmountTon(
          typeof intent.minAmountTon === "number" && isFinite(intent.minAmountTon)
            ? intent.minAmountTon
            : 0.2
        );
      } catch (e) {
        console.error("Failed to fetch deposit intent:", e?.message || e);
      } finally {
        if (!cancelled) setLoadingIntent(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // persist wallet connect to backend
  useEffect(() => {
    (async () => {
      if (!connectedAddress) return;
      try {
        await api("/wallet/connect", {
          method: "POST",
          body: { address: connectedAddress },
        });
      } catch (e) {
        console.warn("Failed to record connected wallet:", e?.message || e);
      }
    })();
  }, [connectedAddress]);

  // disconnect wallet
 const disconnectWallet = async () => {
  // confirmation
  const sure = window.confirm("Are you sure you want to disconnect your wallet?");
  if (!sure) return;

  try {
    setDisconnecting(true);
    await ui.disconnect(); // TonConnect
    await api("/wallet/disconnect", { method: "POST" }); // remove from DB
    alert("Wallet disconnected.");
    window.dispatchEvent(new Event("balance:refresh")); // optional
  } catch (e) {
    console.error("Disconnect failed:", e);
    alert("Failed to disconnect wallet.");
  } finally {
    setDisconnecting(false);
  }
};

  const connectTonkeeper = async () => {
    try {
      localStorage.removeItem("ton-connect-ui_last-wallet");
    } catch { }
    const wallets = await ui.getWallets();
    const tk = wallets.find((w) => {
      const name = (w.name || w.appName || "").toLowerCase();
      const about = (w.aboutUrl || "").toLowerCase();
      return name.includes("tonkeeper") || about.includes("tonkeeper.com");
    });
    if (!tk) {
      const go = confirm("Tonkeeper not found. Open the install page?");
      if (go) window.open("https://tonkeeper.com/download", "_blank", "noopener,noreferrer");
      return;
    }
    await ui.connectWallet(tk);
  };

  const transferTon = async () => {
    const amt = parseFloat(amountTon);
    if (!tonWallet) return alert("Please connect Tonkeeper first.");
    if (!adminAddress || !comment) return alert("Deposit info not ready yet.");
    if (!isFinite(amt) || amt <= 0) return alert("Enter a valid TON amount.");
    if (amt < minAmountTon) return alert(`Minimum is ${minAmountTon} TON.`);

    try {
      setSending(true);
      await ui.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [
          {
            address: adminAddress,
            amount: toNanoStr(amt),
            payload: textCommentPayload(comment),
          },
        ],
      });
      setTimeout(() => {
        window.dispatchEvent(new Event("balance:refresh"));
      }, 4000);
      alert("Transfer submitted. We will credit coins after confirmation.");
      setAmountTon("");
    } catch (e) {
      console.error("Transfer error:", e);
      alert("Transfer canceled or failed.");
    } finally {
      setSending(false);
    }
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch { }
  };

  return (
    <div className="bg-[#0e0e10] text-white">
      <div className="px-4 pb-28">
        <h2 className="mt-2 text-2xl font-semibold">Wallet</h2>

        {/* CONNECT/DISCONNECT TONKEEPER */}
        <div className="mt-4 space-y-2">
          {!tonWallet ? (
            <button
              onClick={connectTonkeeper}
              className="w-full h-12 rounded-xl bg-emerald-600 text-white font-semibold"
            >
              Connect Tonkeeper
            </button>
          ) : (
            <>
              <div className="w-full h-12 rounded-xl bg-emerald-800/40 border border-emerald-700 grid place-items-center text-emerald-300">
                ✅ Tonkeeper connected{" "}
                {connectedAddress ? `(${connectedAddress.slice(0, 4)}…${connectedAddress.slice(-4)})` : ""}
              </div>
              <button
                onClick={disconnectWallet}
                disabled={disconnecting}
                className="w-full h-12 rounded-xl bg-red-600 text-white font-semibold disabled:opacity-50"
              >
                {disconnecting ? "Disconnecting…" : "Disconnect Wallet"}
              </button>

            </>
          )}

          {!tonWallet && (
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
            onCopy={() => adminAddress && copy(adminAddress)}
          />
          <FieldRow
            label={<span>Destination tag / Comment — <span className="underline">MANDATORY</span></span>}
            value={comment || (loadingIntent ? "Loading…" : "—")}
            onCopy={() => comment && copy(comment)}
          />
          <button
            onClick={transferTon}
            disabled={!tonWallet || !adminAddress || !comment || sending}
            className="mt-4 w-full h-12 rounded-xl bg-yellow-500 text-black font-semibold disabled:opacity-50"
          >
            {sending ? "Submitting…" : "Transfer TON"}
          </button>
          <p className="mt-4 text-center text-sm text-zinc-400">
            Send only TON to this address. Use the exact comment above so we can credit your account.
          </p>
        </div>
      </div>
    </div>
  );
}
