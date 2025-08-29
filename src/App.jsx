// // src/App.jsx
// import './polyfills'; // Buffer shim FIRST if you added it
// import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// import { TonConnectUIProvider } from "@tonconnect/ui-react";

// import MainLayout from "./components/MainLayout";

// // Screens
// import Home from "./pages/Home";
// import Sports from "./pages/Sports";
// import Wallet from "./pages/Wallet";
// import Reference from "./pages/References";
// import Loyalty from "./pages/Loyalty";
// import Search from "./pages/Search";

// // Games
// import SlotGame from "./pages/SlotGame";
// import CoinFlip from "./pages/CoinFlip";
// import Dice from "./pages/Dice";
// import Crash from "./pages/Crash";

// export default function App() {
//   return (
//     <TonConnectUIProvider
//       manifestUrl="/tonconnect-manifest.json"
//       // Critical for Telegram Mini App: lets wallet return to your bot
//       actionsConfiguration={{
//         // <-- replace with your bot username
//         twaReturnUrl: "https://t.me/FotuneFlipBot?start=app"
//       }}
//         walletsListConfiguration={{
//     includeWallets: [{ appName: "tonkeeper" }],   // show/target Tonkeeper only
//   }}
//     >
//       <BrowserRouter>
//         <Routes>
//           {/* App entry redirects to main/home */}
//           <Route path="/" element={<Navigate to="/app/home" replace />} />

//           {/* Main screen with bottom nav */}
//           <Route path="/app" element={<MainLayout />}>
//             <Route path="home" element={<Home />} />
//             <Route path="search" element={<Search />} />
//             <Route path="sports" element={<Sports />} />
//             <Route path="wallet" element={<Wallet />} />
//             <Route path="earn" element={<Reference />} />
//             <Route path="loyalty" element={<Loyalty />} />
//             <Route path="*" element={<Navigate to="/app/home" replace />} />
//           </Route>

//           {/* Game routes (outside bottom nav if desired) */}
//           <Route path="/slot" element={<SlotGame />} />
//           <Route path="/coinflip" element={<CoinFlip />} />
//           <Route path="/dice" element={<Dice />} />
//           <Route path="/crash" element={<Crash />} />

//           {/* Fallback */}
//           <Route path="*" element={<Navigate to="/app/home" replace />} />
//         </Routes>
//       </BrowserRouter>
//     </TonConnectUIProvider>
//   );
// }



// src/App.jsx
import './polyfills'; // Buffer shim FIRST if you added it
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { TonConnectUIProvider } from "@tonconnect/ui-react";

import MainLayout from "./components/MainLayout";

// Screens
import Home from "./pages/Home";
import Sports from "./pages/Sports";
import Wallet from "./pages/Wallet";
import Reference from "./pages/References";
import Loyalty from "./pages/Loyalty";
import Search from "./pages/Search";

// Games
import SlotGame from "./pages/SlotGame";
import CoinFlip from "./pages/CoinFlip";
import Dice from "./pages/Dice";
import Crash from "./pages/Crash";

/* --- ADMIN imports (new) --- */
import AdminGuard from "./admin/components/AdminGuard";
import AdminLayout from "./admin/components/AdminLayout";
import AdminLogin from "./admin/AdminPages/AdminLogin";
import AdminDashboard from "./admin/AdminPages/AdminDashboard";
import AdminUsers from "./admin/AdminPages/AdminUsers";
import AdminTransactions from "./admin/AdminPages/AdminTransactions";
import AdminGames from "./admin/AdminPages/AdminGames";
import AdminBonuses from "./admin/AdminPages/AdminBonuses";
import AdminReferrals from "./admin/AdminPages/AdminReferrals";
import AdminNotifications from "./admin/AdminPages/AdminNotifications";

export default function App() {
  return (
    <TonConnectUIProvider
      manifestUrl="/tonconnect-manifest.json"
      // Critical for Telegram Mini App: lets wallet return to your bot
      actionsConfiguration={{
        // <-- replace with your bot username
        twaReturnUrl: "https://t.me/FotuneFlipBot?start=app"
      }}
      walletsListConfiguration={{
        includeWallets: [{ appName: "tonkeeper" }],   // show/target Tonkeeper only
      }}
    >
      <BrowserRouter>
        <Routes>
          {/* App entry redirects to main/home */}
          <Route path="/" element={<Navigate to="/app/home" replace />} />

          {/* Main screen with bottom nav */}
          <Route path="/app" element={<MainLayout />}>
            <Route path="home" element={<Home />} />
            <Route path="search" element={<Search />} />
            <Route path="sports" element={<Sports />} />
            <Route path="wallet" element={<Wallet />} />
            <Route path="earn" element={<Reference />} />
            <Route path="loyalty" element={<Loyalty />} />
            <Route path="*" element={<Navigate to="/app/home" replace />} />
          </Route>

          {/* Game routes (outside bottom nav if desired) */}
          <Route path="/slot" element={<SlotGame />} />
          <Route path="/coinflip" element={<CoinFlip />} />
          <Route path="/dice" element={<Dice />} />
          <Route path="/crash" element={<Crash />} />

          {/* --- ADMIN routes (new) --- */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route element={<AdminGuard />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="transactions" element={<AdminTransactions />} />
              <Route path="games" element={<AdminGames />} />
              <Route path="bonuses" element={<AdminBonuses />} />
              <Route path="referrals" element={<AdminReferrals />} />
              <Route path="notifications" element={<AdminNotifications />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/app/home" replace />} />
        </Routes>
      </BrowserRouter>
    </TonConnectUIProvider>
  );
}
