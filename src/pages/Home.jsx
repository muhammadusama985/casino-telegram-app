import { useEffect, useState } from "react";
import { initTelegram } from "../utils/telegram";
import GameCard from "../components/GameCard";
import BalanceCard from "../components/BalanceCard";
import Header from "../components/Header";

const Home = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const tgUser = initTelegram();
    if (tgUser) setUser(tgUser);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white px-6 py-4">
      <Header user={user} />

      <BalanceCard balance={1000} />

      <div className="grid grid-cols-2 gap-4 mt-6">
        <GameCard name="Slots" path="/slot" />
        <GameCard name="Coin Flip" path="/coinflip" />
        <GameCard name="Dice" path="/dice" />
        <GameCard name="Crash" path="/crash" />
      </div>
    </div>
  );
};

export default Home;
