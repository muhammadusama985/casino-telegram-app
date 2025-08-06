// src/pages/Wallet.jsx
import { useMemo, useState } from "react";

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
      {label ? (
        <div className="mb-2 text-sm text-zinc-400">
          {label}
        </div>
      ) : null}

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

          {/* Static list (closed by design in screenshot). 
              If you want a real dropdown, wire a local "open" state. */}
          {/* <div className="absolute left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden z-20">
            {options.map((opt) => (
              <button key={opt} onClick={() => onChange(opt)} className="w-full text-left px-4 py-3 hover:bg-zinc-800 text-zinc-200">
                {opt}
              </button>
            ))}
          </div> */}
        </div>
      </div>
    </div>
  );
}

export default function Wallet() {
  const [mode, setMode] = useState("deposit"); // 'deposit' | 'withdraw'
  const [token, setToken] = useState("Toncoin (TON)");

  // demo data (replace with real values from backend later)
  const depositAddress = useMemo(
    () => "UQBJ2IsFo_Vt8R0Iw4GCMgWxxxxxxxxxxxxxxxxxxxxxx",
    []
  );
  const destinationTag = useMemo(() => "306500466EF029A37272", []);

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // no-op
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

        {/* Deposit section (as in screenshot) */}
        {mode === "deposit" ? (
          <>
            <SelectRow
              label="Select the token to deposit"
              note="(Minimum 0.1 Toncoin (TON))"
              value={token}
              options={["Toncoin (TON)"]}
              onChange={setToken}
            />

            <FieldRow
              label="TON deposit address"
              value={depositAddress}
              onCopy={() => copy(depositAddress)}
            />

            <FieldRow
              label={
                <span>
                  Destination tag – <span className="underline">MANDATORY FIELD</span>
                </span>
              }
              value={destinationTag}
              onCopy={() => copy(destinationTag)}
            />

            <p className="mt-5 text-center text-sm text-zinc-400">
              Send only TON to this deposit address. <br />
              Values sent below the minimum amount or to an incorrect address will be lost.
            </p>
          </>
        ) : (
          /* Simple placeholder for Withdraw tab (matches look) */
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
              Withdrawals may take up to a few minutes to process on-chain.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
