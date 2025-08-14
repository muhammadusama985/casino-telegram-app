// src/pages/Wallet.jsx
import { useEffect, useMemo, useState } from "react";
import { TonConnectButton, useTonWallet, useTonConnectUI } from "@tonconnect/ui-react";
import { beginCell } from "@ton/core";
import { api, getJSON } from "../api";

// ---------- small UI atoms ----------
function Card({ children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-zinc-800 bg-zinc-900/70 ${className}`}>
      {children}
    </div>
  );
}
function Row({ label, right }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-zinc-400">{label}</span>
      <span className="text-white font-medium">{right}</span>
    </div>
  );
}
function Label({ children }) {
  return <div className="text-sm text-zinc-400 mb-2">{children}</div>;
}
function Input({ value, onChange, readOnly, placeholder }) {
  return (
    <input
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      placeholder={placeholder}
      className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3 text-white outline-none focus:border-zinc-600"
    />
  );
}
function CopyField({ label, value, onCopy }) {
  return (
    <div className="mt-4">
      {label ? <Label>{label}</Label> : null}
      <div className="flex items-stretch rounded-xl overflow-hidden border border-zinc-800">
        <input
          value={value}
          readOnly
          className="flex-1 bg-zinc-900 px-4 py-3 text-white outline-none"
        />
        <button
          onClick={() => onCopy?.(value)}
          className="px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
          title="Copy"
        >
          📋
        </button>
      </div>
    </div>
  );
}
const short = (a) => (!a ? "" : a.length > 14 ? `${a.slice(0, 8)}…${a.slice(-6)}` : a);

// ---- base64 (browser) helpers (no Buffer) ----
function bytesToBase64(bytes) {
  // Convert Uint8Array to a binary string, then to base64 using btoa()
  let binary = "";
  const chunkSize = 0x8000; // avoid call stack limits
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

// ---- encode text comment to base64 BOC for TonConnect payload ----
function textCommentToB64(comment) {
  const cell = beginCell().storeUint(0, 32).storeStringTail(comment).endCell();
  const bocBytes = cell.toBoc(); // Uint8Array in browsers
  return bytesToBase64(bocBytes);
}

export default function Wallet() {
  const wallet = useTonWallet();
  const [tonConnectUI] = useTonConnectUI();

  // state
  const [coins, setCoins] = useState(0);
  const [amountTon, setAmountTon] = useState("0.2");
  const [intent, setIntent] = useState(null); // {toAddress, memo, amountNano, orderId}
  const [loadingIntent, setLoadingIntent] = useState(false);
  const [sending, setSending] = useState(false);

  // placeholders before intent exists
  const fallbackAddress = useMemo(
    () => "UQBJ2IsFo_Vt8R0Iw4GCMgWxxxxxxxxxxxxxxxxxxxxxx",
    []
  );
  const fallbackMemo = "Tap Generate to create";

  // load coin balance
  useEffect(() => {
    getJSON("/wallet/balance")
      .then(({ coins }) => setCoins(coins))
      .catch(() => {});
  }, []);

  // dev login to set api cookie (local testing)
  async function devLogin() {
    try {
      await fetch("/api/session/dev-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tgId: "999", username: "dev_user", firstName: "Dev" }),
      });
      alert("Dev session set ✅");
      refreshBalance();
    } catch {
      alert("Dev login failed");
    }
  }

  async function refreshBalance() {
    try {
      const { coins } = await getJSON("/wallet/balance");
      setCoins(coins);
    } catch {}
  }

  async function createDepositIntent() {
    const amt = Number(amountTon);
    if (!amt || amt < 0.1) return alert("Minimum deposit is 0.1 TON");
    setLoadingIntent(true);
    try {
      const res = await api("/wallet/deposit-intent", { amountTon: amt });
      setIntent(res);
    } catch (e) {
      console.error(e);
      alert("Failed to create deposit intent");
    } finally {
      setLoadingIntent(false);
    }
  }

  async function sendFromWallet() {
    if (!wallet?.account?.address) return alert("Connect your TON wallet first.");
    if (!intent) return alert("Generate deposit details first.");
    setSending(true);
    try {
      const payload = textCommentToB64(intent.memo);
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [
          {
            address: intent.toAddress,
            amount: String(intent.amountNano),
            payload,
          },
        ],
      });
      alert("Transaction sent ✅ — coins will appear after confirmation.");
    } catch (e) {
      console.error(e);
      alert("Failed to send transaction");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-[#0e0e10] min-h-screen text-white">
      <div className="px-4 pb-28 max-w-2xl mx-auto">
        {/* header */}
        <div className="flex items-center justify-between pt-4">
          <div>
            <h1 className="text-2xl font-bold">Wallet</h1>
            <p className="text-sm text-zinc-400">
              {wallet?.account?.address
                ? `Connected: ${short(wallet.account.address)}`
                : "Not connected"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={devLogin}
              className="text-xs px-2 py-1 rounded bg-zinc-800 border border-zinc-700"
              title="Set dev session cookie"
            >
              Dev Login
            </button>
            <TonConnectButton />
          </div>
        </div>

        {/* balance card */}
        <Card className="mt-5 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-zinc-400 text-sm">Your Coins</div>
              <div className="text-3xl font-extrabold text-yellow-400">{coins}</div>
            </div>
            <button
              onClick={refreshBalance}
              className="h-10 px-4 rounded-xl bg-zinc-800 border border-zinc-700 text-sm"
            >
              Refresh
            </button>
          </div>
          <div className="mt-3 text-xs text-zinc-500">
            Coins appear after your on-chain deposit confirms.
          </div>
        </Card>

        {/* deposit card */}
        <Card className="mt-6 p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-emerald-600/20 text-emerald-400">
              ⤵
            </span>
            <h2 className="text-lg font-semibold">Deposit TON → Coins</h2>
          </div>
          <div className="text-sm text-zinc-400">
            Rate is configured on server. Minimum deposit: <span className="text-zinc-300">0.1 TON</span>
          </div>

          <div className="mt-4">
            <Label>Amount (TON)</Label>
            <Input
              value={amountTon}
              onChange={(e) => setAmountTon(e.target.value)}
              placeholder="0.2"
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              onClick={createDepositIntent}
              disabled={loadingIntent}
              className="h-11 rounded-xl bg-yellow-500 text-black font-semibold disabled:opacity-60"
            >
              {loadingIntent ? "Generating…" : "Generate details"}
            </button>
            <button
              onClick={sendFromWallet}
              disabled={sending}
              className="h-11 rounded-xl bg-emerald-500 text-black font-semibold disabled:opacity-60"
            >
              {sending ? "Sending…" : "Send from wallet"}
            </button>
          </div>

          <CopyField
            label="TON deposit address"
            value={intent?.toAddress || fallbackAddress}
            onCopy={async (v) => await navigator.clipboard.writeText(v)}
          />
          <CopyField
            label={
              <span>
                Destination tag (memo) — <span className="underline">MANDATORY</span>
              </span>
            }
            value={intent?.memo || "Tap Generate to create"}
            onCopy={async (v) => await navigator.clipboard.writeText(v)}
          />

          <div className="mt-4 text-xs text-zinc-500 leading-relaxed">
            Send only <span className="text-zinc-300">TON</span> to this address. Deposits below the
            minimum or with a missing memo may be lost. Coins are credited after network confirmation.
          </div>
        </Card>

        {/* info card */}
        <Card className="mt-6 p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-2">Tips</h3>
          <Row label="Network" right="TON (testnet)" />
          <Row label="Treasury" right={short(intent?.toAddress || fallbackAddress)} />
          <Row label="Session" right="Telegram or Dev cookie" />
        </Card>
      </div>
    </div>
  );
}
