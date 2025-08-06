import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./components/MainLayout";

// YOUR EXISTING SCREENS (unchanged names)
import Home from "./pages/Home";
import Sports from "./pages/Sports";     // if you already created stubs
import Wallet from "./pages/Wallet";
import Earn from "./pages/Earn";
import Loyalty from "./pages/Loyalty";
import Search from "./pages/Search";


// Your game pages remain available too
import SlotGame from "./pages/SlotGame";
import CoinFlip from "./pages/CoinFlip";
import Dice from "./pages/Dice";
import Crash from "./pages/Crash";

export default function App() {
  return (
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
          <Route path="earn" element={<Earn />} />
          <Route path="loyalty" element={<Loyalty />} />
          <Route path="*" element={<Navigate to="/app/home" replace />} />
        </Route>

        {/* Game routes (optional, outside bottom nav) */}
        <Route path="/slot" element={<SlotGame />} />
        <Route path="/coinflip" element={<CoinFlip />} />
        <Route path="/dice" element={<Dice />} />
        <Route path="/crash" element={<Crash />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/app/home" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
