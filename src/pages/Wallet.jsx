import { useEffect, useState } from "react";
import { api, getBalance } from "../api";
import { useTonWallet, useTonConnectUI } from "@tonconnect/ui-react";
import { beginCell } from "@ton/ton";

// --- helper to build text-comment payload (opcode 0) ---
function textCommentPayload(text) {
  const cell = beginCell().storeUint(0, 32).storeStringTail(text).endCell();
  return cell.toBoc().toString("base64");
}

// very simple TON -> nanotons (string) converter
function toNanoStr(v) {
  const n = Number(v);
  if (!isFinite(n) || n <= 0) return "0";
  return String(Math.round(n * 1e9));
}

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
  const [tonConnectUI] = useTonConnectUI();

  const [adminAddress, setAdminAddress] = useState(""); // from backend
  const [comment, setComment] = useState("");           // from backend (MANDATORY)
  const [minAmountTon, setMinAmountTon] = useState(0.2);
  const [amountTon, setAmountTon] = useState("");       // user-entered TON amount
  const [loadingIntent, setLoadingIntent] = useState(false);

  // 1) Fetch a fresh deposit intent (admin address + unique comment) on mount
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

  // 2) Connect specifically to Tonkeeper if present, otherwise show install
  const connectTonkeeper = async () => {
    try {
      const wallets = await tonConnectUI.getWallets();
      // find Tonkeeper by appName or name
      const tk = wallets.find(
        (w) =>
          (w.appName && w.appName.toLowerCase() === "tonkeeper") ||
          /tonkeeper/i.test(w.name)
      );

      if (tk) {
        // try direct connect to Tonkeeper
        await tonConnectUI.connectWallet(tk);
      } else {
        // fallback: show install prompt (you can customize this UI)
        const wants = confirm(
          "Tonkeeper is not detected. Do you want to install it?"
        );
        if (wants) {
          // official download page
          window.open("https://tonkeeper.com/download", "_blank");
        }
      }
    } catch (e) {
      console.log("Connect Tonkeeper error:", e);
      // fallback to the default modal (will still only list Tonkeeper due to provider filter)
      try {
        await tonConnectUI.openModal();
      } catch {}
    }
  };

  // 3) Transfer via connected wallet
  const transferTon = async () => {
    const amt = parseFloat(amountTon);
    if (!wallet) return alert("Please connect Tonkeeper first.");
    if (!adminAddress || !comment) return alert("Deposit info is not ready yet.");
    if (!isFinite(amt) || amt <= 0) return alert("Enter a valid TON amount.");
    if (amt < minAmountTon) return alert(`Minimum is ${minAmountTon} TON.`);

    try {
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [
          {
            address: adminAddress,
            amount: toNanoStr(amt),            // TON -> nanotons
            payload: textCommentPayload(comment),
          },
        ],
      });

      // Optional: poll your balance after a few seconds
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
    try { await navigator.clipboard.writeText(text); } catch {}
  };

  return (
    <div className="bg-[#0e0e10] text-white">
      <div className="px-4 pb-28">
        <h2 className="mt-2 text-2xl font-semibold">Wallet</h2>

        {/* Connect Tonkeeper */}
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

          {/* Optional: a small install hint if not connected */}
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
              </a>
              , then tap Connect again.
            </p>
          )}
        </div>

        {/* Deposit form */}
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
