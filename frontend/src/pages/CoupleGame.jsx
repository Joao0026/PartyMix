import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { loadGame } from '../utils/game'
import { api } from '../utils/api'
import ChallengeCard from '../components/game/ChallengeCard'

function EroticDice({ onRoll }) {
  const [rolling, setRolling] = useState(false)
  const [result, setResult] = useState(null)

  const roll = async () => {
    setRolling(true)
    setResult(null)
    const data = await api.rollDice()
    await new Promise(r => setTimeout(r, 1000))
    setRolling(false)
    setResult(data)
    onRoll && onRoll(data)
  }

  return (
    <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
      <h3 className="text-slate-400 text-sm mb-4">Dados Eróticos</h3>
      <AnimatePresence mode="wait">
        {result ? (
          <motion.div key="result" initial={{scale:0}} animate={{scale:1}} className="mb-4">
            <div className="text-white text-2xl font-bold">{result.body_part?.text}</div>
            <div className="text-rose-400 text-lg">+</div>
            <div className="text-white text-2xl font-bold">{result.action?.text}</div>
          </motion.div>
        ) : (
          <motion.div key="empty" className="h-20 flex items-center justify-center mb-4">
            <span className="text-slate-500 text-sm">Clica para rolar</span>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={roll}
        disabled={rolling}
        className="w-full bg-gradient-to-r from-red-500 to-rose-700 text-white font-bold rounded-2xl py-4">
        {rolling ? '🎲 Rolando...' : '🎲 Rolar Dados'}
      </motion.button>
    </div>
  )
}

export default function CoupleGame() {
  const navigate = useNavigate()
  const game = loadGame()
  const [turn, setTurn] = useState(0)
  const [phase, setPhase] = useState('dice')
  const [challenge, setChallenge] = useState(null)
  const [showChallenge, setShowChallenge] = useState(false)
  const [diceResult, setDiceResult] = useState(null)

  useEffect(() => { if (!game || game.mode !== 'couple') navigate('/') }, [])

  const players = game?.players || []
  const player = players[turn % players.length]

  const handleDiceRoll = (result) => setDiceResult(result)

  const getChallenge = async () => {
    const cats = game?.selectedCategories?.length ? game.selectedCategories : ['erotico','verdade']
    const cat = cats[Math.floor(Math.random() * cats.length)]
    const c = await api.getRandomChallenge({ category: cat, mode_type: 'couple' })
    setChallenge(c)
    setShowChallenge(true)
  }

  const nextTurn = () => {
    setTurn(t => t + 1)
    setPhase('dice')
    setDiceResult(null)
    setShowChallenge(false)
    setChallenge(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900/30 to-slate-900 flex flex-col">
      <div className="p-4 border-b border-white/10 flex items-center justify-between max-w-lg mx-auto w-full">
        <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white text-sm">← Sair</button>
        <h1 className="text-white font-bold">💕 Modo Casal</h1>
        <span className="text-slate-400 text-sm">Turno {turn + 1}</span>
      </div>
      <div className="flex-1 flex flex-col items-center px-4 py-6 max-w-lg mx-auto w-full gap-5">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 w-full flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${player?.color} flex items-center justify-center text-white text-2xl font-black`}>{player?.name?.[0]}</div>
          <div>
            <p className="text-slate-400 text-sm">É a vez de</p>
            <p className="text-white font-bold text-xl">{player?.name}</p>
          </div>
        </div>
        <EroticDice onRoll={handleDiceRoll} />
        <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.98}} onClick={getChallenge}
          className="w-full bg-gradient-to-r from-rose-500 to-pink-700 text-white font-bold rounded-2xl py-4">
          🔥 Desafio
        </motion.button>
        <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.98}} onClick={nextTurn}
          className="w-full bg-white/10 text-white font-medium rounded-2xl py-3">
          Próximo Turno →
        </motion.button>
      </div>
      <AnimatePresence>
        {showChallenge && challenge && (
          <ChallengeCard challenge={challenge} player={player} mode="couple"
            onResult={() => setShowChallenge(false)} onClose={() => setShowChallenge(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}
