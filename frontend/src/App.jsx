import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import GameSetup from './pages/GameSetup'
import MapGame from './pages/MapGame'
import CoupleGame from './pages/CoupleGame'
import CardsLobby from './pages/CardsLobby'
import CardsGame from './pages/CardsGame'
import MisterWhiteGame from './pages/MisterWhiteGame'
import Admin from './pages/Admin'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/GameSetup" element={<GameSetup />} />
      <Route path="/MapGame" element={<MapGame />} />
      <Route path="/CoupleGame" element={<CoupleGame />} />
      <Route path="/CardsLobby" element={<CardsLobby />} />
      <Route path="/CardsGame" element={<CardsGame />} />
      <Route path="/MisterWhiteGame" element={<MisterWhiteGame />} />
      <Route path="/Admin" element={<Admin />} />
    </Routes>
  )
}
