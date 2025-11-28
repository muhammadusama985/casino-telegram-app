import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom"; 
import WebApp from "@twa-dev/sdk";
import bannerImg from "../assets/background.jpg";
import coin from "../assets/games/coin.png";
import dice from "../assets/games/dice.jpg";
import crash from "../assets/games/crash.png";
import slot from "../assets/games/slot.jpg";
import betsoft from "../assets/providers/betsoft.jpg";
import blueprint from "../assets/providers/blueprint.jpg";
import evoplay from "../assets/providers/evoplay.jpg";
import TopBar from "../components/TopBar";

// ----------------------
// Data
// ----------------------
const GAMES_TOP = [
  { id: "slot", title: "SLOT MACHINE", img: slot },
  { id: "coinflip", title: "COIN FLIP", img: coin },
  { id: "dice", title: "DICE", img: dice },
  { id: "crash", title: "CRASH", img: crash },
];

const PROVIDERS = [
  { id: "betsoft", img: betsoft },
  { id: "blueprint", img: blueprint },
  { id: "evoplay", img: evoplay },
];

// ----------------------
// Small card components
// ----------------------
function GameCard({ img, title, id }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/${id}`)}
      className="
        min-w-[260px] max-w-[260px] snap-start
        bg-zinc-900 rounded-2xl overflow-hidden
        border border-zinc-800 shadow-sm
        hover:border-zinc-700 transition
      "
    >
      {/* FULL image fill */}
      <div className="w-full h-[150px] bg-zinc-800 overflow-hidden">
        <img
          src={img}
          alt={title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Text under image */}
      <div className="px-3 py-3">
        <p className="text-sm font-semibold text-white text-center leading-tight">
          {title}
        </p>
      </div>
    </button>
  );
}



function ProviderCard({ img }) {
  return (
    <div
      className="
        min-w-[140px] max-w-[140px] snap-start
        bg-zinc-900 rounded-xl border border-zinc-800
        grid place-items-center aspect-[16/9] px-3
      "
    >
      <img src={img} alt="provider" className="max-h-8 object-contain" />
    </div>
  );
}

function Section({ title, children, rowRef, onPrev, onNext }) {
  return (
    <section className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-zinc-800 text-zinc-300">
            📌
          </span>
          <h3 className="text-lg font-semibold text-zinc-200">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onPrev}
            className="h-9 w-9 rounded-md bg-yellow-500/90 hover:bg-yellow-400 text-black font-bold grid place-items-center"
            aria-label="Prev"
          >
            ‹
          </button>
          <button
            onClick={onNext}
            className="h-9 w-9 rounded-md bg-yellow-500/90 hover:bg-yellow-400 text-black font-bold grid place-items-center"
            aria-label="Next"
          >
            ›
          </button>
        </div>
      </div>

      <div
        ref={rowRef}
        className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1"
      >
        {children}
      </div>
    </section>
  );
}

// -------------
// Home page
// -------------
export default function Home() {
  useEffect(() => {
    try {
      WebApp.ready();
      WebApp.expand();
      WebApp.setHeaderColor("#0a0a0a");
      WebApp.setBackgroundColor("#000000");
    } catch {}
  }, []);

  const topRef = useRef(null);
  const provRef = useRef(null);
  const scrollBy = (ref, px) =>
    ref.current?.scrollBy({ left: px, behavior: "smooth" });

  return (
    <div className="bg-[#0e0e10] text-white">
      <div className="px-4">
        {/* Hero banner */}
        <div className="rounded-2xl overflow-hidden relative">
          <img
            src={bannerImg}
            alt="Casino Banner"
            className="w-full h-65 object-cover"
          />
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-5 text-center">
            <h1 className="text-4xl font-extrabold leading-tight">
              IMPERIAL{"\n"}CASINO
            </h1>
            <p className="text-lg text-zinc-300 mt-3">
              Your premium casino experience!
            </p>
            <button className="mt-4 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-4 py-2 rounded-lg text-sm">
              DEPOSIT
            </button>
          </div>
        </div>

        {/* Top Games */}
        <Section
          title="Top Games"
          rowRef={topRef}
          onPrev={() => scrollBy(topRef, -280)}
          onNext={() => scrollBy(topRef, 280)}
        >
          {GAMES_TOP.map((g) => (
            <GameCard key={g.id} {...g} />
          ))}
        </Section>

        {/* Providers */}
        <Section
          title="Providers"
          rowRef={provRef}
          onPrev={() => scrollBy(provRef, -240)}
          onNext={() => scrollBy(provRef, 240)}
        >
          {PROVIDERS.map((p) => (
            <ProviderCard key={p.id} {...p} />
          ))}
        </Section>

        {/* Footer */}
        <div className="mt-8 mb-28 text-xs text-zinc-400 space-y-2">
          <p>
            18+ only | Play responsibly |{" "}
            <span className="underline">Terms apply</span> v1.2.0
          </p>
          <p>Support: help@example.com @yoursupportbot</p>
          <p className="pt-2">
            <strong>18+ GAMBLE RESPONSIBLY</strong>
          </p>
          <p className="leading-relaxed">
            Yourbrand.com is owned and operated by Example Ventures SRL.
            Registration number: 3-102-880024, registered address: City,
            Country. Licensed and regulated by …
          </p>
        </div>
      </div>
    </div>
  );
}

/* Add once in index.css if not already:
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
*/
