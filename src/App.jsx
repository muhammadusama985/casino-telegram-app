import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import SlotGame from "./pages/SlotGame";
import CoinFlip from "./pages/CoinFlip";
import Dice from "./pages/Dice";
import Crash from "./pages/Crash";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/slot" element={<SlotGame />} />
        <Route path="/coinflip" element={<CoinFlip />} />
        <Route path="/dice" element={<Dice />} />
        <Route path="/crash" element={<Crash />} />
      </Routes>
    </Router>
  );
}

export default App;
