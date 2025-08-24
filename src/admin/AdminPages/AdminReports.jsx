export default function AdminReports() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Reports</h1>
          <p className="text-sm opacity-70">Export monthly/weekly performance summaries.</p>
        </div>
        <div className="flex gap-2">
          <select className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm">
            <option>Monthly</option>
            <option>Weekly</option>
            <option>Daily</option>
          </select>
          <button className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm">
            Generate
          </button>
        </div>
      </header>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
        <div className="text-sm opacity-70">[Generated report preview]</div>
      </div>
    </div>
  );
}
