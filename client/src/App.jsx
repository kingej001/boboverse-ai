import { Routes, Route } from "react-router-dom";
import Header from "./components/Header.jsx";
import Starfield from "./components/Starfield.jsx";
import Home from "./pages/Home.jsx";
import SendGift from "./pages/SendGift.jsx";
import ProfileBuilder from "./pages/ProfileBuilder.jsx";
import ClaimGift from "./pages/ClaimGift.jsx";

export default function App() {
  return (
    <div className="relative min-h-screen">
      <Starfield />
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/send" element={<SendGift />} />
          <Route path="/profile" element={<ProfileBuilder />} />
          <Route path="/claim/:giftId" element={<ClaimGift />} />
        </Routes>
      </main>
    </div>
  );
}
