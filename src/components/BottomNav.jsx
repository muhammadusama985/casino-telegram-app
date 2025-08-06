import { NavLink } from "react-router-dom";
import { AiOutlineHome, AiOutlineSearch } from "react-icons/ai";
import { MdSportsSoccer } from "react-icons/md";
import { PiWalletBold } from "react-icons/pi";
import { HiOutlineUserAdd } from "react-icons/hi";
import { FaRegHandshake } from "react-icons/fa6";

const tabs = [
  { to: "/app/home",   label: "HOME",    Icon: AiOutlineHome },
  { to: "/app/search", label: "SEARCH",  Icon: AiOutlineSearch }, // ⬅️ added
  { to: "/app/sports", label: "SPORTS",  Icon: MdSportsSoccer },
  { to: "/app/wallet", label: "WALLET",  Icon: PiWalletBold },
  { to: "/app/earn",   label: "EARN",    Icon: HiOutlineUserAdd },
  { to: "/app/loyalty",label: "LOYALTY", Icon: FaRegHandshake },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900/95 border-t border-zinc-800 px-2 pt-2 pb-[calc(10px+env(safe-area-inset-bottom))]">
      {/* grid-cols-6 because we now have 6 items */}
      <ul className="grid grid-cols-6 gap-2 text-xs text-zinc-400">
        {tabs.map(({ to, label, Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-2 rounded-lg transition ${
                  isActive ? "text-white" : "hover:text-zinc-200"
                }`
              }
            >
              <Icon className="text-2xl mb-1" />
              <span className="tracking-wide">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
