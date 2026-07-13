import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { LangProvider } from './contexts/LangContext'
import ConnectionStatus from './components/ConnectionStatus'
import InstallPrompt from './components/InstallPrompt'

const Home = lazy(() => import('./pages/Home'))
const GameSetup = lazy(() => import('./pages/GameSetup'))
const MapGame = lazy(() => import('./pages/MapGame'))
const ChallengesOnly = lazy(() => import('./pages/ChallengesOnly'))
const CoupleGame = lazy(() => import('./pages/CoupleGame'))
const DrinkGame = lazy(() => import('./pages/DrinkGame'))
const CardsLobby = lazy(() => import('./pages/CardsLobby'))
const CardsGame = lazy(() => import('./pages/CardsGame'))
const MisterWhiteHub = lazy(() => import('./pages/MisterWhiteHub'))
const MisterWhiteGame = lazy(() => import('./pages/MisterWhiteGame'))
const MisterWhiteLobby = lazy(() => import('./pages/MisterWhiteLobby'))
const MisterWhiteOnline = lazy(() => import('./pages/MisterWhiteOnline'))
const AldeiaMixHub = lazy(() => import('./pages/AldeiaMixHub'))
const AldeiaMixLobby = lazy(() => import('./pages/AldeiaMixLobby'))
const AldeiaMixOnline = lazy(() => import('./pages/AldeiaMixOnline'))
const MemeMixHub = lazy(() => import('./pages/MemeMixHub'))
const MemeMixLobby = lazy(() => import('./pages/MemeMixLobby'))
const MemeMixOnline = lazy(() => import('./pages/MemeMixOnline'))
const VictoryScreen = lazy(() => import('./pages/VictoryScreen'))
const CommunityCards = lazy(() => import('./pages/CommunityCards'))
const DailyScratch = lazy(() => import('./pages/DailyScratch'))
const Admin = lazy(() => import('./pages/Admin'))
const JoinRoom = lazy(() => import('./pages/JoinRoom'))

function PageLoader() {
  return (
    <div className="min-h-screen bg-[#080b14] flex items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
        <p className="text-sm font-semibold">A carregar PartyMix...</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <LangProvider>
      <ConnectionStatus />
      <InstallPrompt />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/"                element={<Home />} />
          <Route path="/join/:mode/:code" element={<JoinRoom />} />
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
      </Suspense>
    </LangProvider>
  )
}
