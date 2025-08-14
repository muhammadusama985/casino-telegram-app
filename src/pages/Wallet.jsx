import { useEffect, useMemo, useState } from "react";
import { api, getBalance } from "../api";
import { TonConnectUIProvider, TonConnectButton, useTonWallet, useTonConnectUI } from "@tonconnect/ui-react";
import { beginCell } from "@ton/ton";

function TabButton({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        "flex-1 h-12 rounded-xl border px-4 font-medium",
        active
          ? "bg-yellow-500/20 text-yellow-400 border-yellow-600"
          : "bg-zinc-900 text-zinc-200 border-zinc-800",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function FieldRow({ label, value, onCopy, readOnly = true }) {
  return (
    <div className="mt-3">
      {label ? <div className="mb-2 text-sm text-zinc-400">{label}</div> : null}
      <div className="flex items-stretch bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <input
          value={value}
          readOnly={readOnly}
          onChange={() => {}}
          className="flex-1 bg-transparent px-4 py-3 text-white outline-none"
        />
        <button
          onClick={onCopy}
          className="px-3 bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
          title="Copy"
        >
          📋
        </button>
      </div>
    </div>
  );
}

function SelectRow({ label, value, options, onChange, note }) {
  return (
    <div className="mt-4">
      <div className="text-sm text-zinc-400">
        {label} {note ? <span className="font-semibold text-zinc-300">{note}</span> : null}
      </div>
      <div className="mt-2">
        <div className="relative">
          <button className="w-full flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3">
            <span className="flex items-center gap-2">
              <span className="h-5 w-5 grid place-items-center rounded-full bg-sky-600">🟦</span>
              <span className="text-white">{value}</span>
            </span>
            <span className="text-zinc-400">▾</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// --- helper to build text-comment payload (opcode 0) ---
function textCommentPayload(text) {
  const cell = beginCell().storeUint(0, 32).storeStringTail(text).endCell();
  return cell.toBoc().toString("base64");
}

function WalletInner({ onCredited }) {
  const [mode, setMode] = useState("deposit"); // 'deposit' | 'withdraw'
  const [token, setToken] = useState("Toncoin (TON)");

  // Fetched from backend:
  const [adminAddress, setAdminAddress] = useState("");
  const [comment, setComment] = useState("");
  const [minAmountTon, setMinAmountTon] = useState(0.2);
  const [loadingIntent, setLoadingIntent] = useState(false);

  const wallet = useTonWallet();
  const [tonConnectUI] = useTonConnectUI();

  // copy helper
  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); } catch {}
  };

  // Get a fresh deposit intent each time the Deposit tab opens
  useEffect(() => {
    if (mode !== "deposit") return;
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
  }, [mode]);

  const handleDeposit = async () => {
    if (!wallet) return; // must connect first

    if (!adminAddress || !comment) {
      alert("Deposit address not ready. Please try again.");
      return;
    }

    try {
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [
          {
            address: adminAddress,
            amount: String(Math.max(minAmountTon, 0.2) * 1e9), // TON → nanotons
            payload: textCommentPayload(comment),
          },
        ],
      });
      // Give watcher a moment to see the tx, then refresh balance in UI:
      setTimeout(onCredited, 4000);
    } catch (e) {
      console.error("User canceled or wallet error:", e);
    }
  };

  return (
    <div className="bg-[#0e0e10] text-white">
      <div className="px-4 pb-28">
        <h2 className="mt-2 text-2xl font-semibold">Wallet</h2>

        {/* Tabs */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <TabButton active={mode === "deposit"} onClick={() => setMode("deposit")}>
            ↓ Deposit
          </TabButton>
          <TabButton active={mode === "withdraw"} onClick={() => setMode("withdraw")}>
            ↑ Withdraw
          </TabButton>
        </div>

        {mode === "deposit" ? (
          <>
            {/* Connect button */}
            <div className="mt-4">
              <TonConnectButton />
            </div>

            <SelectRow
              label="Select the token to deposit"
              note={`(Minimum ${minAmountTon} Toncoin (TON))`}
              value={token}
              options={["Toncoin (TON)"]}
              onChange={setToken}
            />

            <FieldRow
              label="TON deposit address"
              value={adminAddress || "Loading…"}
              onCopy={() => copy(adminAddress)}
            />

            <FieldRow
              label={
                <span>
                  Destination tag / Comment – <span className="underline">MANDATORY</span>
                </span>
              }
              value={comment || (loadingIntent ? "Loading…" : "—")}
              onCopy={() => copy(comment)}
            />

            <button
              disabled={!wallet || !adminAddress || !comment}
              onClick={handleDeposit}
              className="mt-5 w-full h-12 rounded-xl bg-yellow-500 text-black font-semibold disabled:opacity-50"
            >
              {wallet ? `Deposit at least ${minAmountTon} TON` : "Connect TON Wallet"}
            </button>

            <p className="mt-5 text-center text-sm text-zinc-400">
              Send only TON to this address. Use the exact comment above to credit your account.
            </p>
          </>
        ) : (
          <div className="mt-4">
            <SelectRow
              label="Select the token to withdraw"
              value={token}
              options={["Toncoin (TON)"]}
              onChange={setToken}
            />
            <FieldRow label="Your TON wallet address" value="" onCopy={() => {}} readOnly={false} />
            <FieldRow label="Amount" value="" onCopy={() => {}} readOnly={false} />
            <button className="mt-4 w-full h-12 rounded-xl bg-yellow-500 text-black font-semibold">
              Continue
            </button>
            <p className="mt-3 text-xs text-zinc-400">
              Withdrawals may take a few minutes to process on-chain.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Wallet() {
  // when credited, refresh any global balance UI if you want (optional)
  const [_, setTick] = useState(0);
  const onCredited = async () => {
    try { await getBalance(); } catch {}
    setTick((t) => t + 1);
  };

  return (
    <TonConnectUIProvider manifestUrl="/tonconnect-manifest.json">
      <WalletInner onCredited={onCredited} />
    </TonConnectUIProvider>
  );
}
