// // src/pages/Wallet.jsx
// import { useEffect, useMemo, useState } from "react";
// import WebApp from "@twa-dev/sdk";
// import { api } from "../api"; // no getBalance here; MainLayout listens to balance:refresh
// import { useTonWallet, useTonConnectUI } from "@tonconnect/ui-react";
// import { beginCell } from "@ton/ton";

// // ---- utils ----

// // opcode(0) + stringTail(text) -> BOC base64
// function textCommentPayload(text) {
//   const cell = beginCell().storeUint(0, 32).storeStringTail(text).endCell();
//   return cell.toBoc().toString("base64");
// }

// // TON -> nanotons (string)
// const toNanoStr = (v) => {
//   const n = Number(v);
//   if (!isFinite(n) || n <= 0) return "0";
//   return String(Math.round(n * 1e9));
// };

// function FieldRow({ label, value, readOnly = true, onChange, onCopy }) {
//   return (
//     <div className="mt-3">
//       {label ? <div className="mb-2 text-sm text-zinc-400">{label}</div> : null}
//       <div className="flex items-stretch bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
//         <input
//           value={value}
//           readOnly={readOnly}
//           onChange={onChange || (() => {})}
//           className="flex-1 bg-transparent px-4 py-3 text-white outline-none"
//         />
//         {onCopy && (
//           <button
//             onClick={onCopy}
//             className="px-3 bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
//             title="Copy"
//           >
//             📋
//           </button>
//         )}
//       </div>
//     </div>
//   );
// }

// export default function Wallet() {
//   const tonWallet = useTonWallet();
//   const [ui] = useTonConnectUI();

//   // From backend (intent)
//   const [adminAddress, setAdminAddress] = useState("");
//   const [comment, setComment] = useState("");
//   const [minAmountTon, setMinAmountTon] = useState(0.2);
//   const [loadingIntent, setLoadingIntent] = useState(false);

//   // UX
//   const [amountTon, setAmountTon] = useState("");
//   const [sending, setSending] = useState(false);

//   const connectedAddress = useMemo(() => {
//     // Try multiple shapes TonConnect might return
//     return (
//       tonWallet?.account?.address ||
//       tonWallet?.address ||
//       ""
//     );
//   }, [tonWallet]);

//   // Fetch a fresh deposit intent on mount
//   useEffect(() => {
//     let cancelled = false;
//     (async () => {
//       setLoadingIntent(true);
//       try {
//         const intent = await api("/deposits/intent", { method: "POST" });
//         if (cancelled) return;
//         setAdminAddress(intent.adminAddress || "");
//         setComment(intent.comment || "");
//         setMinAmountTon(
//           typeof intent.minAmountTon === "number" && isFinite(intent.minAmountTon)
//             ? intent.minAmountTon
//             : 0.2
//         );
//       } catch (e) {
//         console.error("Failed to fetch deposit intent:", e?.message || e);
//       } finally {
//         if (!cancelled) setLoadingIntent(false);
//       }
//     })();
//     return () => {
//       cancelled = true;
//     };
//   }, []);

//   // Hide everything in the TonConnect modal except Tonkeeper
// useEffect(() => {
//   // when the connect modal opens, strip non-Tonkeeper options
//   const unsubscribe = ui.onModalStateChange(({ opened }) => {
//     if (!opened) return;

//     const scrub = () => {
//       try {
//         // find the modal container by its heading text (works across skins)
//         const modalRoot = Array.from(document.querySelectorAll("div"))
//           .find((el) => /connect your ton wallet/i.test(el.textContent || ""));

//         if (!modalRoot) return;

//         // 1) kill the big "Connect Wallet in Telegram" button
//         Array.from(modalRoot.querySelectorAll("button")).forEach((btn) => {
//           const t = (btn.textContent || "").toLowerCase();
//           if (t.includes("connect wallet in telegram")) {
//             btn.style.display = "none";
//           }
//         });

//         // 2) hide non-Tonkeeper wallet tiles and “Choose other application” label
//         Array.from(modalRoot.querySelectorAll("button, a, div")).forEach((el) => {
//           const txt = (el.textContent || "").toLowerCase().trim();

//           // remove other wallet options
//           if (txt.includes("mytonwallet") || txt.includes("tonhub")) {
//             (el.closest("button") || el).style.display = "none";
//           }

//           // remove category caption + “View all wallets” entry
//           if (txt === "choose other application" || txt.includes("view all wallets")) {
//             el.style.display = "none";
//           }
//         });
//       } catch {}
//     };

//     // initial scrub (modal content renders async)
//     setTimeout(scrub, 0);

//     // keep scrubbing as modal re-renders
//     const mo = new MutationObserver(() => scrub());
//     mo.observe(document.body, { childList: true, subtree: true });

//     // stop when modal closes
//     const off = ui.onModalStateChange((s) => {
//       if (!s.opened) {
//         mo.disconnect();
//         off?.();
//       }
//     });
//   });

//   return () => unsubscribe?.();
// }, [ui]);


//   // Helpful TonConnect logs
//   useEffect(() => {
//     const off1 = ui.onStatusChange((info) => console.log("[TonConnect status]", info));
//     const off2 = ui.onModalStateChange((state) => console.log("[TonConnect modal]", state));
//     return () => {
//       off1?.();
//       off2?.();
//     };
//   }, [ui]);

//   // When a wallet is connected, persist it on backend (optional but nice)
//   useEffect(() => {
//     (async () => {
//       if (!connectedAddress) return;
//       try {
//         await api("/wallet/connect", {
//           method: "POST",
//           body: { address: connectedAddress },
//         });
//       } catch (e) {
//         console.warn("Failed to record connected wallet:", e?.message || e);
//       }
//     })();
//   }, [connectedAddress]);

//   // Tonkeeper-only connect flow
// // Tonkeeper-only connect flow
// const connectTonkeeper = async () => {
//   try {
//     // Make sure TonConnect doesn’t reuse a previously selected generic wallet
//     try {
//       localStorage.removeItem("ton-connect-ui_last-wallet");
//     } catch {}

//     const wallets = await ui.getWallets();

//     // Find Tonkeeper robustly (names differ across platforms/builds)
//     const tk = wallets.find((w) => {
//       const name = (w.name || w.appName || "").toLowerCase();
//       const about = (w.aboutUrl || "").toLowerCase();
//       return (
//         name.includes("tonkeeper") ||
//         about.includes("tonkeeper.com")
//       );
//     });

//     if (!tk) {
//       const go = confirm("Tonkeeper not found. Open the install page?");
//       if (go) window.open("https://tonkeeper.com/download", "_blank", "noopener,noreferrer");
//       return;
//     }

//     // Try direct connect to Tonkeeper (no multi-wallet modal)
//     await ui.connectWallet(tk);
//     return;
//   } catch (err) {
//     console.warn("connectWallet error:", err);
//   }

//   // Hard fallback: open Tonkeeper’s universal link directly (still Tonkeeper-only)
//   try {
//     const wallets = await ui.getWallets();
//     const tk = wallets.find((w) => {
//       const name = (w.name || w.appName || "").toLowerCase();
//       const about = (w.aboutUrl || "").toLowerCase();
//       return name.includes("tonkeeper") || about.includes("tonkeeper.com");
//     });

//     if (tk?.universalLink) {
//       const link = tk.universalLink;
//       if (WebApp?.openTelegramLink) {
//         WebApp.openTelegramLink(link);
//       } else {
//         window.open(link, "_blank", "noopener,noreferrer") || (window.location.href = link);
//       }
//       return;
//     }
//   } catch (fallbackErr) {
//     console.warn("universalLink fallback failed:", fallbackErr);
//   }

//   const go = confirm("Could not open Tonkeeper. Install Tonkeeper?");
//   if (go) window.open("https://tonkeeper.com/download", "_blank", "noopener,noreferrer");
// };


//   // Send TON with the mandatory comment
//   const transferTon = async () => {
//     const amt = parseFloat(amountTon);
//     if (!tonWallet) return alert("Please connect Tonkeeper first.");
//     if (!adminAddress || !comment) return alert("Deposit info not ready yet.");
//     if (!isFinite(amt) || amt <= 0) return alert("Enter a valid TON amount.");
//     if (amt < minAmountTon) return alert(`Minimum is ${minAmountTon} TON.`);

//     try {
//       setSending(true);
//       await ui.sendTransaction({
//         validUntil: Math.floor(Date.now() / 1000) + 300,
//         messages: [
//           {
//             address: adminAddress,
//             amount: toNanoStr(amt), // TON → nanotons
//             payload: textCommentPayload(comment),
//           },
//         ],
//       });

//       // Let MainLayout refresh balance after watcher credits
//       setTimeout(() => {
//         window.dispatchEvent(new Event("balance:refresh"));
//       }, 4000);

//       alert("Transfer submitted. We will credit coins after confirmation.");
//       setAmountTon("");
//     } catch (e) {
//       console.error("Transfer error:", e);
//       alert("Transfer canceled or failed.");
//     } finally {
//       setSending(false);
//     }
//   };

//   const copy = async (text) => {
//     try {
//       await navigator.clipboard.writeText(text);
//     } catch {}
//   };

//   return (
//     <div className="bg-[#0e0e10] text-white">
//       <div className="px-4 pb-28">
//         <h2 className="mt-2 text-2xl font-semibold">Wallet</h2>

//         {/* CONNECT TONKEEPER */}
//         <div className="mt-4">
//           {!tonWallet ? (
//             <button
//               onClick={connectTonkeeper}
//               className="w-full h-12 rounded-xl bg-emerald-600 text-white font-semibold"
//             >
//               Connect Tonkeeper
//             </button>
//           ) : (
//             <div className="w-full h-12 rounded-xl bg-emerald-800/40 border border-emerald-700 grid place-items-center text-emerald-300">
//               ✅ Tonkeeper connected {connectedAddress ? `(${connectedAddress.slice(0, 4)}…${connectedAddress.slice(-4)})` : ""}
//             </div>
//           )}

//           {!tonWallet && (
//             <p className="mt-2 text-xs text-zinc-400 text-center">
//               Don’t have Tonkeeper?{" "}
//               <a
//                 href="https://tonkeeper.com/download"
//                 target="_blank"
//                 rel="noreferrer"
//                 className="underline"
//               >
//                 Install it
//               </a>{" "}
//               and tap Connect again.
//             </p>
//           )}
//         </div>

//         {/* DEPOSIT FORM */}
//         <div className="mt-5">
//           <FieldRow
//             label={`Amount (TON) — minimum ${minAmountTon}`}
//             value={amountTon}
//             readOnly={false}
//             onChange={(e) => setAmountTon(e.target.value)}
//           />

//           <FieldRow
//             label="Treasury / Admin TON address"
//             value={adminAddress || (loadingIntent ? "Loading…" : "—")}
//             onCopy={() => adminAddress && copy(adminAddress)}
//           />

//           <FieldRow
//             label={
//               <span>
//                 Destination tag / Comment — <span className="underline">MANDATORY</span>
//               </span>
//             }
//             value={comment || (loadingIntent ? "Loading…" : "—")}
//             onCopy={() => comment && copy(comment)}
//           />

//           <button
//             onClick={transferTon}
//             disabled={!tonWallet || !adminAddress || !comment || sending}
//             className="mt-4 w-full h-12 rounded-xl bg-yellow-500 text-black font-semibold disabled:opacity-50"
//           >
//             {sending ? "Submitting…" : "Transfer TON"}
//           </button>

//           <p className="mt-4 text-center text-sm text-zinc-400">
//             Send only TON to this address. Use the exact comment above so we can credit your account.
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// }



// src/pages/Wallet.jsx
import { useEffect, useMemo, useState } from "react";
import WebApp from "@twa-dev/sdk";
import { api } from "../api"; // no getBalance here; MainLayout listens to balance:refresh
import { useTonWallet, useTonConnectUI } from "@tonconnect/ui-react";
import { beginCell } from "@ton/ton";

// ---- utils ----

// opcode(0) + stringTail(text) -> BOC base64
function textCommentPayload(text) {
  const cell = beginCell().storeUint(0, 32).storeStringTail(text).endCell();
  return cell.toBoc().toString("base64");
}

// TON -> nanotons (string)
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
  const tonWallet = useTonWallet();
  const [ui] = useTonConnectUI();

  // From backend (intent)
  const [adminAddress, setAdminAddress] = useState("");
  const [comment, setComment] = useState("");
  const [minAmountTon, setMinAmountTon] = useState(0.2);
  const [loadingIntent, setLoadingIntent] = useState(false);

  // UX
  const [amountTon, setAmountTon] = useState("");
  const [sending, setSending] = useState(false);

  const connectedAddress = useMemo(() => {
    // Try multiple shapes TonConnect might return
    return (
      tonWallet?.account?.address ||
      tonWallet?.address ||
      ""
    );
  }, [tonWallet]);

  // Fetch a fresh deposit intent on mount
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

  // Hide everything in the TonConnect modal except Tonkeeper
  useEffect(() => {
    // when the connect modal opens, strip non-Tonkeeper options
    const unsubscribe = ui.onModalStateChange(({ opened }) => {
      if (!opened) return;

      const scrub = () => {
        try {
          // find the modal container by its heading text (works across skins)
          const modalRoot = Array.from(document.querySelectorAll("div"))
            .find((el) => /connect your ton wallet/i.test(el.textContent || ""));

          if (!modalRoot) return;

          // 1) kill the big "Connect Wallet in Telegram" button
          Array.from(modalRoot.querySelectorAll("button")).forEach((btn) => {
            const t = (btn.textContent || "").toLowerCase();
            if (t.includes("connect wallet in telegram")) {
              btn.style.display = "none";
            }
          });

          // 2) hide non-Tonkeeper wallet tiles and “Choose other application” label
          Array.from(modalRoot.querySelectorAll("button, a, div")).forEach((el) => {
            const txt = (el.textContent || "").toLowerCase().trim();

            // remove other wallet options
            if (txt.includes("mytonwallet") || txt.includes("tonhub")) {
              (el.closest("button") || el).style.display = "none";
            }

            // remove category caption + “View all wallets” entry
            if (txt === "choose other application" || txt.includes("view all wallets")) {
              el.style.display = "none";
            }
          });
        } catch {}
      };

      // initial scrub (modal content renders async)
      setTimeout(scrub, 0);

      // keep scrubbing as modal re-renders
      const mo = new MutationObserver(() => scrub());
      mo.observe(document.body, { childList: true, subtree: true });

      // stop when modal closes
      const off = ui.onModalStateChange((s) => {
        if (!s.opened) {
          mo.disconnect();
          off?.();
        }
      });
    });

    return () => unsubscribe?.();
  }, [ui]);

  // Helpful TonConnect logs
  useEffect(() => {
    const off1 = ui.onStatusChange((info) => console.log("[TonConnect status]", info));
    const off2 = ui.onModalStateChange((state) => console.log("[TonConnect modal]", state));
    return () => {
      off1?.();
      off2?.();
    };
  }, [ui]);

  // When a wallet is connected, persist it on backend (optional but nice)
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

  // ---- Tonkeeper-only connect method (added) ----
  const connectTonkeeper = async () => {
    // clear any previous generic selection to avoid multi-wallet sticky state
    try {
      localStorage.removeItem("ton-connect-ui_last-wallet");
    } catch {}

    // light UA check to tweak messaging (no UI/logic changes elsewhere)
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");

    try {
      const wallets = await ui.getWallets();

      // find Tonkeeper across platforms/builds
      const tk = wallets.find((w) => {
        const name = (w.name || w.appName || "").toLowerCase();
        const about = (w.aboutUrl || "").toLowerCase();
        return name.includes("tonkeeper") || about.includes("tonkeeper.com");
      });

      if (!tk) {
        const go = confirm(
          isMobile
            ? "Tonkeeper app not detected. Open the install page?"
            : "Tonkeeper extension not detected. Open the install page?"
        );
        if (go) window.open("https://tonkeeper.com/download", "_blank", "noopener,noreferrer");
        return;
      }

      // try direct connect (extension on desktop if present; app on mobile)
      try {
        await ui.connectWallet(tk);
        return;
      } catch (directErr) {
        console.warn("direct connect failed, attempting universalLink", directErr);
      }

      // fallback: open Tonkeeper universal deep link (guides install if missing)
      if (tk.universalLink) {
        const link = tk.universalLink;
        if (WebApp?.openTelegramLink) {
          WebApp.openTelegramLink(link);
        } else {
          window.open(link, "_blank", "noopener,noreferrer") || (window.location.href = link);
        }
        return;
      }

      // last-resort: take user to downloads
      const go = confirm("Could not open Tonkeeper. Install Tonkeeper?");
      if (go) window.open("https://tonkeeper.com/download", "_blank", "noopener,noreferrer");
    } catch (err) {
      console.warn("Tonkeeper connect error:", err);
      const go = confirm("Could not open Tonkeeper. Install Tonkeeper?");
      if (go) window.open("https://tonkeeper.com/download", "_blank", "noopener,noreferrer");
    }
  };
  // ---- end connect method ----

  // Send TON with the mandatory comment
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
            amount: toNanoStr(amt), // TON → nanotons
            payload: textCommentPayload(comment),
          },
        ],
      });

      // Let MainLayout refresh balance after watcher credits
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
    } catch {}
  };

  return (
    <div className="bg-[#0e0e10] text-white">
      <div className="px-4 pb-28">
        <h2 className="mt-2 text-2xl font-semibold">Wallet</h2>

        {/* CONNECT TONKEEPER */}
        <div className="mt-4">
          {!tonWallet ? (
            <button
              onClick={connectTonkeeper}
              className="w-full h-12 rounded-xl bg-emerald-600 text-white font-semibold"
            >
              Connect Tonkeeper
            </button>
          ) : (
            <div className="w-full h-12 rounded-xl bg-emerald-800/40 border border-emerald-700 grid place-items-center text-emerald-300">
              ✅ Tonkeeper connected {connectedAddress ? `(${connectedAddress.slice(0, 4)}…${connectedAddress.slice(-4)})` : ""}
            </div>
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
            label={
              <span>
                Destination tag / Comment — <span className="underline">MANDATORY</span>
              </span>
            }
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
