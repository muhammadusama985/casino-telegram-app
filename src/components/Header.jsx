const Header = ({ user }) => {
  return (
    <header className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-yellow-400">🎰 Telegram Casino</h1>
        <p className="text-sm text-gray-300">
          {user ? `Welcome, ${user.first_name}` : "Connecting to Telegram..."}
        </p>
      </div>
      {user?.photo_url && (
        <img
          src={user.photo_url}
          alt="user"
          className="w-10 h-10 rounded-full border-2 border-yellow-400"
        />
      )}
    </header>
  );
};

export default Header;
