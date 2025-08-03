const BalanceCard = ({ balance }) => {
  return (
    <div className="bg-yellow-400 text-black rounded-lg p-4 text-center shadow-xl">
      <h2 className="text-lg font-bold">💰 Balance</h2>
      <p className="text-2xl font-mono">{balance} TON</p>
    </div>
  );
};

export default BalanceCard;
