import { useNavigate } from "react-router-dom";

const GameCard = ({ name, path }) => {
  const navigate = useNavigate();

  return (
    <div
      className="bg-zinc-800 rounded-xl p-4 text-center hover:bg-zinc-700 transition cursor-pointer shadow-lg"
      onClick={() => navigate(path)}
    >
      <h3 className="text-xl font-semibold">{name}</h3>
      <p className="text-sm text-gray-400 mt-2">Play now</p>
    </div>
  );
};

export default GameCard;
