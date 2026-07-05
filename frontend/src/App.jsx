import { Routes, Route } from 'react-router-dom'
import { LangProvider } from './contexts/LangContext'
import Home from './pages/Home'
import GameSetup from './pages/GameSetup'
import MapGame from './pages/MapGame'
import ChallengesOnly from './pages/ChallengesOnly'
import CoupleGame from './pages/CoupleGame'
import DrinkGame from './pages/DrinkGame'
import CardsLobby from './pages/CardsLobby'
import CardsGame from './pages/CardsGame'
import MisterWhiteHub from './pages/MisterWhiteHub'
import MisterWhiteGame from './pages/MisterWhiteGame'
import MisterWhiteLobby from './pages/MisterWhiteLobby'
import MisterWhiteOnline from './pages/MisterWhiteOnline'
import AldeiaMixHub from './pages/AldeiaMixHub'
import AldeiaMixLobby from './pages/AldeiaMixLobby'
import AldeiaMixOnline from './pages/AldeiaMixOnline'
import MemeMixHub from './pages/MemeMixHub'
import MemeMixLobby from './pages/MemeMixLobby'
import MemeMixOnline from './pages/MemeMixOnline'
import VictoryScreen from './pages/VictoryScreen'
import CommunityCards from './pages/CommunityCards'
import DailyScratch from './pages/DailyScratch'
import Admin from './pages/Admin'
import ConnectionStatus from './components/ConnectionStatus'
import InstallPrompt from './components/InstallPrompt'

export default function App() {
  return (
    <LangProvider>
      <ConnectionStatus />
      <InstallPrompt />
      <Routes>
        <Route path="/"                element={<Home />} />
        <Route path="/GameSetup"       element={<GameSetup />} />
        <Route path="/MapGame"         element={<MapGame />} />
        <Route path="/ChallengesOnly"  element={<ChallengesOnly />} />
        <Route path="/CoupleGame"      element={<CoupleGame />} />
        <Route path="/DrinkGame"       element={<DrinkGame />} />
        <Route path="/CardsLobby"      element={<CardsLobby />} />
        <Route path="/CardsGame"       element={<CardsGame />} />
        <Route path="/MisterWhite"       element={<MisterWhiteHub />} />
        <Route path="/MisterWhiteGame"   element={<MisterWhiteGame />} />
        <Route path="/MisterWhiteLobby"  element={<MisterWhiteLobby />} />
        <Route path="/MisterWhiteOnline" element={<MisterWhiteOnline />} />
        <Route path="/AldeiaMix"          element={<AldeiaMixHub />} />
        <Route path="/AldeiaMixLobby"    element={<AldeiaMixLobby />} />
        <Route path="/AldeiaMixOnline"   element={<AldeiaMixOnline />} />
        <Route path="/MemeMix"            element={<MemeMixHub />} />
        <Route path="/MemeMixLobby"       element={<MemeMixLobby />} />
        <Route path="/MemeMixOnline"      element={<MemeMixOnline />} />
        <Route path="/VictoryScreen"   element={<VictoryScreen />} />
        <Route path="/community"       element={<CommunityCards />} />
        <Route path="/daily"           element={<DailyScratch standalone />} />
        <Route path="/admin"           element={<Admin />} />
      </Routes>
    </LangProvider>
  )
}
