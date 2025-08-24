// // src/admin/AdminPages/AdminUsers.jsx
// import { useEffect, useMemo, useState } from "react";
// import { adminUsers } from "../AdminApi";

// export default function AdminUsers() {
//   const [q, setQ] = useState("");
//   const [page, setPage] = useState(1);
//   const [limit] = useState(20);
//   const [rows, setRows] = useState([]);
//   const [total, setTotal] = useState(0);
//   const [loading, setLoading] = useState(true);
//   const [err, setErr] = useState("");

//   const pages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

//   async function fetchList({ query = q, pageNum = page } = {}) {
//     setLoading(true);
//     setErr("");
//     try {
//       const res = await adminUsers.list({ query, page: pageNum, limit });
//       setRows(res.items || []);
//       setTotal(res.total || 0);
//       setPage(res.page || 1);
//     } catch (e) {
//       setErr(e?.message || "Failed to load users");
//       setRows([]);
//       setTotal(0);
//     } finally {
//       setLoading(false);
//     }
//   }

//   useEffect(() => {
//     fetchList(); // initial load
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   function onSearch() {
//     setPage(1);
//     fetchList({ query: q, pageNum: 1 });
//   }

//   return (
//     <div className="space-y-4">
//       <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
//         <div>
//           <h1 className="text-2xl font-semibold">Users</h1>
//           <p className="text-sm opacity-70">Search, filter, adjust balances, and ban/unban.</p>
//         </div>
//         <div className="flex gap-2">
//           <input
//             value={q}
//             onChange={(e) => setQ(e.target.value)}
//             onKeyDown={(e) => e.key === "Enter" && onSearch()}
//             placeholder="Search by username, tgId, referralCode…"
//             className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm w-64"
//           />
//           <button
//             onClick={onSearch}
//             className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm"
//           >
//             Search
//           </button>
//         </div>
//       </header>

//       <div className="rounded-xl border border-zinc-800 overflow-hidden">
//         <table className="w-full text-sm">
//           <thead className="bg-zinc-900/70">
//             <tr className="[&>th]:text-left [&>th]:px-3 [&>th]:py-2">
//               <th>User</th>
//               <th>tgId</th>
//               <th>Coins</th>
//               <th>Referrals</th>
//               <th>Ref Code</th>
//               <th>Status</th>
//               <th className="w-56">Actions</th>
//             </tr>
//           </thead>
//           <tbody className="divide-y divide-zinc-800">
//             {loading && (
//               <tr>
//                 <td colSpan={7} className="px-3 py-6 text-center opacity-70">Loading…</td>
//               </tr>
//             )}

//             {!loading && rows.length === 0 && (
//               <tr>
//                 <td colSpan={7} className="px-3 py-6 text-center opacity-70">No users found.</td>
//               </tr>
//             )}

//             {!loading && rows.map((u) => (
//               <tr key={u._id} className="[&>td]:px-3 [&>td]:py-2">
//                 <td>
//                   <div className="font-medium">
//                     {u.username || `${u.firstName || ""} ${u.lastName || ""}`.trim() || "—"}
//                   </div>
//                   <div className="text-xs opacity-70">{u._id}</div>
//                 </td>
//                 <td>{u.tgId || "—"}</td>
//                 <td>{Number(u.coins || 0).toFixed(2)}</td>
//                 <td>{u.referralCount ?? 0}</td>
//                 <td>{u.referralCode || "—"}</td>
//                 <td>
//                   {u?.banned?.is ? (
//                     <span className="text-red-400">banned</span>
//                   ) : (
//                     <span className="text-emerald-400">active</span>
//                   )}
//                 </td>
//                 <td className="flex gap-2 flex-wrap">
//                   <button
//                     onClick={() => alert("Adjust balance modal TODO")}
//                     className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700"
//                   >
//                     Adjust
//                   </button>
//                   {u?.banned?.is ? (
//                     <button
//                       onClick={() => alert("Unban flow TODO")}
//                       className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700"
//                     >
//                       Unban
//                     </button>
//                   ) : (
//                     <button
//                       onClick={() => alert("Ban flow TODO")}
//                       className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700"
//                     >
//                       Ban
//                     </button>
//                   )}
//                   <button
//                     onClick={() => alert("Logs modal TODO")}
//                     className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700"
//                   >
//                     Logs
//                   </button>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>

//       {/* Tiny debug line so you can see counts on mobile */}
//       <div className="text-xs opacity-60">
//         total: {total} • page: {page}/{pages}
//       </div>

//       {err && <div className="text-sm text-red-400">{err}</div>}

//       {/* Pagination */}
//       {pages > 1 && (
//         <div className="flex items-center gap-2">
//           <button
//             disabled={page <= 1}
//             onClick={() => fetchList({ pageNum: page - 1 })}
//             className="px-3 py-1 rounded bg-zinc-800 disabled:opacity-50"
//           >
//             Prev
//           </button>
//           <button
//             disabled={page >= pages}
//             onClick={() => fetchList({ pageNum: page + 1 })}
//             className="px-3 py-1 rounded bg-zinc-800 disabled:opacity-50"
//           >
//             Next
//           </button>
//         </div>
//       )}

//       <details className="text-xs opacity-60 mt-3">
//   <summary>Debug</summary>
//   <pre className="whitespace-pre-wrap break-all">
//     {JSON.stringify({
//       base: import.meta.env.VITE_API || "(fallback)",
//       tokenPrefix: localStorage.getItem("adminToken")?.slice(0, 12) || "(none)"
//     }, null, 2)}
//   </pre>
// </details>

//     </div>
//   );
// }


// src/admin/AdminPages/AdminUsers.jsx
import { useEffect, useMemo, useState } from "react";
import { adminUsers, api as adminApiRaw } from "../AdminApi"; // <-- uses your AdminApi.js

export default function AdminUsers() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // small on-screen debug to verify you're hitting the correct server
  const [sys, setSys] = useState(null);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  async function fetchList({ query = q, pageNum = page } = {}) {
    setLoading(true);
    setErr("");
    try {
      // Debug ping: confirms FE talks to the same backend (shows dbName & totalUsers)
      try {
        const s = await adminApiRaw("/admin/debug/system");
        setSys(s);
      } catch {
        setSys(null);
      }

      const res = await adminUsers.list({ query, page: pageNum, limit });
      setRows(res.items || []);
      setTotal(res.total || 0);
      setPage(res.page || 1);
    } catch (e) {
      setErr(e?.message || "Failed to load users");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchList(); // initial load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSearch() {
    setPage(1);
    fetchList({ query: q, pageNum: 1 });
  }

  return (
    <div className="space-y-4">
      {/* Header + search */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm opacity-70">Search, filter, adjust balances, and ban/unban.</p>
        </div>
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            placeholder="Search by username, tgId, referralCode…"
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm w-64"
          />
          <button
            onClick={onSearch}
            className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm"
          >
            Search
          </button>
        </div>
      </header>

      {/* Table */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900/70">
            <tr className="[&>th]:text-left [&>th]:px-3 [&>th]:py-2">
              <th>User</th>
              <th>tgId</th>
              <th>Coins</th>
              <th>Referrals</th>
              <th>Ref Code</th>
              <th>Status</th>
              <th className="w-56">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {loading && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center opacity-70">
                  Loading…
                </td>
              </tr>
            )}

            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center opacity-70">
                  No users found.
                </td>
              </tr>
            )}

            {!loading &&
              rows.map((u) => (
                <tr key={u._id} className="[&>td]:px-3 [&>td]:py-2">
                  <td>
                    <div className="font-medium">
                      {u.username ||
                        `${u.firstName || ""} ${u.lastName || ""}`.trim() ||
                        "—"}
                    </div>
                    <div className="text-xs opacity-70">{u._id}</div>
                  </td>
                  <td>{u.tgId || "—"}</td>
                  <td>{Number(u.coins || 0).toFixed(2)}</td>
                  <td>{u.referralCount ?? 0}</td>
                  <td>{u.referralCode || "—"}</td>
                  <td>
                    {u?.banned?.is ? (
                      <span className="text-red-400">banned</span>
                    ) : (
                      <span className="text-emerald-400">active</span>
                    )}
                  </td>
                  <td className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => alert("Adjust balance modal TODO")}
                      className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700"
                    >
                      Adjust
                    </button>
                    {u?.banned?.is ? (
                      <button
                        onClick={() => alert("Unban flow TODO")}
                        className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700"
                      >
                        Unban
                      </button>
                    ) : (
                      <button
                        onClick={() => alert("Ban flow TODO")}
                        className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700"
                      >
                        Ban
                      </button>
                    )}
                    <button
                      onClick={() => alert("Logs modal TODO")}
                      className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700"
                    >
                      Logs
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Footer row: counts & pagination */}
      <div className="flex items-center justify-between">
        <div className="text-xs opacity-60">
          total: {total} • page: {page}/{pages}
        </div>

        {pages > 1 && (
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => fetchList({ pageNum: page - 1 })}
              className="px-3 py-1 rounded bg-zinc-800 disabled:opacity-50"
            >
              Prev
            </button>
            <button
              disabled={page >= pages}
              onClick={() => fetchList({ pageNum: page + 1 })}
              className="px-3 py-1 rounded bg-zinc-800 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {err && <div className="text-sm text-red-400">{err}</div>}

      {/* Debug inspector (helps confirm the FE base URL & backend match) */}
      <details className="text-xs opacity-60">
        <summary>Debug</summary>
        <pre className="whitespace-pre-wrap break-all">
{JSON.stringify(
  {
    base: import.meta.env.VITE_API || "(no VITE_API)",
    sys,                           // { ok, dbName, totalUsers } if reachable
    total,
    rowsLen: rows.length,
  },
  null,
  2
)}
        </pre>
      </details>
    </div>
  );
}
