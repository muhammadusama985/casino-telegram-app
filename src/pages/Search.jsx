// src/pages/Search.jsx
import { useMemo, useState, useRef, useEffect } from "react";

// images from src/assets (same files you already imported on Home)
import slotImg from "../assets/games/slot.jpg";
import coinImg from "../assets/games/coin.png";
import diceImg from "../assets/games/dice.jpg";
import crashImg from "../assets/games/crash.jpg";

function useClickOutside(ref, handler) {
  useEffect(() => {
    const onClick = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler();
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [ref, handler]);
}

function SelectRow({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  useClickOutside(boxRef, () => setOpen(false));

  return (
    <div className="relative" ref={boxRef}>
      <button
        className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 flex items-center justify-between"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="text-zinc-400">
          {label}: <span className="text-white">{value}</span>
        </span>
        <span className={`text-zinc-400 transition ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden z-20">
          {options.map((opt) => (
            <button
              key={opt}
              className={`w-full text-left px-4 py-3 hover:bg-zinc-800 ${
                opt === value ? "text-white" : "text-zinc-300"
              }`}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SearchBox({ value, onChange }) {
  return (
    <div className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-2 flex items-center">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by game"
        className="w-full bg-transparent outline-none text-zinc-200 placeholder:text-zinc-400 py-2"
        type="text"
        inputMode="search"
      />
    </div>
  );
}

function GameTile({ img, title }) {
  return (
    <button
      className="
        relative rounded-2xl overflow-hidden
        bg-zinc-900 border border-zinc-800
        aspect-[4/5]
        active:opacity-90
      "
      // onClick={() => navigate('/slot')} // wire later if you want
    >
      <img src={img} alt={title} className="h-full w-full object-cover" />
      <div className="absolute inset-x-0 bottom-0 p-2">
        <div className="rounded-lg bg-black/40 px-2 py-1">
          <p className="text-white text-sm font-semibold leading-tight line-clamp-2">
            {title}
          </p>
        </div>
      </div>
    </button>
  );
}

export default function Search() {
  // your 4 games with a simple provider tag + an order for "Recommended"
  const games = useMemo(
    () => [
      { id: "slot",     title: "SLOT MACHINE", img: slotImg,  provider: "Pragmatic", order: 1 },
      { id: "coinflip", title: "COIN FLIP",    img: coinImg,  provider: "Originals", order: 2 },
      { id: "dice",     title: "DICE",         img: diceImg,  provider: "Originals", order: 3 },
      { id: "crash",    title: "CRASH",        img: crashImg, provider: "Spribe",    order: 4 },
    ],
    []
  );

  const sortOptions = ["Recommended", "A–Z", "Z–A"];
  const providerOptions = ["All", "Pragmatic", "Originals", "Spribe"];

  const [sort, setSort] = useState("Recommended");
  const [provider, setProvider] = useState("All");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    let list = [...games];

    // Provider filter
    if (provider !== "All") {
      list = list.filter((g) => g.provider === provider);
    }

    // Search by name (case-insensitive)
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((g) => g.title.toLowerCase().includes(q));
    }

    // Sort
    if (sort === "Recommended") {
      list.sort((a, b) => a.order - b.order);
    } else if (sort === "A–Z") {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === "Z–A") {
      list.sort((a, b) => b.title.localeCompare(a.title));
    }
    return list;
  }, [games, sort, provider, query]);

  return (
    <div className="bg-[#0e0e10] text-white">
      <div className="px-4 pb-24">
        {/* Filters */}
        <div className="space-y-3 mt-2">
          <SelectRow label="Sort" value={sort} options={sortOptions} onChange={setSort} />
          <SelectRow label="Provider" value={provider} options={providerOptions} onChange={setProvider} />
          <SearchBox value={query} onChange={setQuery} />
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {filtered.length === 0 ? (
            <div className="col-span-3 text-center text-zinc-400 py-8">No games found.</div>
          ) : (
            filtered.map((g) => <GameTile key={g.id} img={g.img} title={g.title} />)
          )}
        </div>
      </div>
    </div>
  );
}
