import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useAnimation } from 'framer-motion'
import { loadGame, CATEGORY_CONFIG, shuffle } from '../utils/game'
import { api } from '../utils/api'
import DiceRoller from '../components/game/DiceRoller'
import ChallengeCard from '../components/game/ChallengeCard'
import { Trophy, ChevronLeft } from 'lucide-react'

function buildMap(categories, length = 60) {
  return Array.from({ length }, (_, i) => {
    if (i === 0) return { type: 'start', emoji: '🏁', bg: '#059669' }
    if (i % 5 === 0) return { type: 'minigame', emoji: '🎲', bg: '#d97706' }
    const cat = categories[i % categories.length]
    const cfg = CATEGORY_CONFIG[cat] || { emoji: '⭐' }
    return { type: 'challenge', category: cat, emoji: cfg.emoji, bg: '#6d28d9' }
  })
}

const MINI_GAME_LABELS = {
  maior_menor: { title: '🃏 Maior ou Menor', desc: 'Adivinha se a próxima carta é maior ou menor!', color: 'from-blue-600 to-cyan-600' },
  grupo: { title: '👥 Desafio de Grupo', desc: 'Todos participam neste desafio!', color: 'from-green-600 to-emerald-600' },
  espio: { title: '🕵️ Espião', desc: 'Descobre quem não conhece a palavra secreta.', color: 'from-slate-600 to-slate-800' },
  '10_segundos': { title: '⏱ 10 Segundos', desc: 'Nomeia 5 coisas em 10 segundos!', color: 'from-orange-500 to-amber-600' },
  batalha: { title: '⚔️ Batalha', desc: 'Debate absurdo — os outros votam!', color: 'from-red-600 to-rose-700' },
}

export default function MapGame() {
  const navigate = useNavigate()
  const game = loadGame()
  const players = game?.players || []

  const [positions, setPositions] = useState(players.map(() => 0))
  const [scores, setScores] = useState(players.map(() => 0))
  const [currentPlayer, setCurrentPlayer] = useState(0)
  const [rolled, setRolled] = useState(false)
  const [moving, setMoving] = useState(false)
  const [challenge, setChallenge] = useState(null)
  const [showChallenge, setShowChallenge] = useState(false)
  const [miniGame, setMiniGame] = useState(null)
  const [ongoings, setOngoings] = useState([])
  const [penaltyAnim, setPenaltyAnim] = useState(null)
  const [round, setRound] = useState(1)
  const mapScrollRef = useRef(null)
  const MAP = buildMap(game?.selectedCategories || ['mimica', 'verdade', 'acao'])

  useEffect(() => { if (!game) navigate('/') }, [])

  const scrollToPlayer = (pos) => {
    if (!mapScrollRef.current) return
    const tileW = 64 + 8
    const container = mapScrollRef.current
    const center = pos * tileW - container.clientWidth / 2 + tileW / 2
    container.scrollTo({ left: Math.max(0, center), behavior: 'smooth' })
  }

  const handleRoll = async (val) => {
    if (rolled || moving) return
    setRolled(true)
    setMoving(true)

    // Animate step by step
    const startPos = positions[currentPlayer]
    for (let step = 1; step <= val; step++) {
      await new Promise(r => setTimeout(r, 180))
      const newPos = Math.min(startPos + step, MAP.length - 1)
      setPositions(p => p.map((pos, i) => i === currentPlayer ? newPos : pos))
      scrollToPlayer(newPos)
    }

    setMoving(false)
    const finalPos = Math.min(startPos + val, MAP.length - 1)
    const tile = MAP[finalPos]

    setTimeout(async () => {
      if (tile.type === 'minigame') {
        const mg = game?.miniGames?.length
          ? game.miniGames[Math.floor(Math.random() * game.miniGames.length)]
          : 'maior_menor'
        setMiniGame(mg)
      } else if (tile.type === 'challenge') {
        const c = await api.getRandomChallenge({ category: tile.category, mode_type: game?.mode || 'friends' })
        if (c && !c.error) { setChallenge(c); setShowChallenge(true) }
      }
    }, 400)
  }

  const handleChallengeResult = (result) => {
    setShowChallenge(false)
    if (result === 'success') {
      setScores(s => s.map((sc, i) => i === currentPlayer ? sc + 1 : sc))
    }
    if (result === 'fail' && (game?.penaltyType === 'sips' || game?.penaltyType === 'both')) {
      const sips = [1, 2, 2, 2, 3, 3][Math.floor(Math.random() * 6)]
      setPenaltyAnim({ name: players[currentPlayer]?.name, sips })
      setTimeout(() => setPenaltyAnim(null), 2500)
    }
    if (result === 'accepted' && challenge?.is_ongoing) {
      setOngoings(o => [...o, {
        text: challenge.text, instruction: challenge.ongoing_instruction,
        playerIdx: currentPlayer, turnsLeft: challenge.ongoing_rounds
      }])
    }
  }

  const nextPlayer = () => {
    setRolled(false)
    setChallenge(null)
    setShowChallenge(false)
    setMiniGame(null)
    const next = (currentPlayer + 1) % players.length
    setCurrentPlayer(next)
    if (next === 0) setRound(r => r + 1)
    scrollToPlayer(positions[next])
    // Tick ongoings
    setOngoings(os => os
      .map(o => ({ ...o, turnsLeft: o.turnsLeft - 1 }))
      .filter(o => o.turnsLeft > 0)
    )
  }

  const player = players[currentPlayer]
  const visStart = Math.max(0, positions[currentPlayer] - 3)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white p-1">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <Trophy className="text-amber-400 w-4 h-4" />
            <span className="text-white font-bold text-sm">Ronda {round}</span>
          </div>
          <div className="flex gap-2">
            {players.map((p, i) => (
              <div key={i} className="text-center">
                <div className={`text-xs font-black ${i === currentPlayer ? 'text-amber-400' : 'text-white'}`}>{scores[i]}</div>
                <div className="text-slate-500 text-xs">{p.name.split(' ')[0]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ongoing badges */}
      {ongoings.length > 0 && (
        <div className="px-4 pt-2 space-y-1 max-w-lg mx-auto w-full">
          {ongoings.map((o, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              className="bg-orange-500/20 border border-orange-500/40 rounded-xl px-3 py-1.5 text-orange-300 text-xs flex items-center gap-2">
              🔁 <span><b>{players[o.playerIdx]?.name}:</b> {o.instruction} ({o.turnsLeft} ronda{o.turnsLeft > 1 ? 's' : ''})</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* MAP STRIP */}
      <div className="px-4 py-3 max-w-lg mx-auto w-full">
        <div ref={mapScrollRef}
          className="flex gap-2 overflow-x-scroll pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {MAP.map((tile, idx) => {
            const playersHere = players.map((p, pi) => ({ p, pi })).filter(({ pi }) => positions[pi] === idx)
            const isCurrent = positions[currentPlayer] === idx
            return (
              <motion.div key={idx}
                animate={isCurrent ? { 
                  scale: [1, 1.15, 1], 
                  boxShadow: [
                    '0 0 0px rgba(167,139,250,0)',
                    '0 0 24px rgba(167,139,250,0.9)',
                    '0 0 12px rgba(167,139,250,0.5)'
                  ] 
                } : { scale: 1, boxShadow: '0 0 0px rgba(167,139,250,0)' }}
                transition={{ duration: 0.6, ease: 'easeInOut', repeat: isCurrent ? Infinity : 0, repeatType: 'mirror' }}
                className="relative flex-shrink-0 flex flex-col items-center justify-end rounded-2xl overflow-visible transition-all duration-300"
                style={{ 
                  width: 64, 
                  height: 68, 
                  background: tile.bg + '99', 
                  border: isCurrent ? '2px solid rgba(167,139,250,1)' : '1px solid rgba(255,255,255,0.08)',
                  filter: isCurrent ? 'brightness(1.2)' : 'brightness(1)'
                }}>
                {/* Players on tile */}
                <div className="absolute -top-4 flex gap-0.5">
                  {playersHere.map(({ p, pi }) => (
                    <motion.div key={pi}
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      layout
                      className={`w-6 h-6 rounded-full bg-gradient-to-br ${p.color} border-2 border-white/60 flex items-center justify-center text-white text-xs font-black shadow-lg`}
                      style={{ zIndex: 10 }}>
                      {p.name[0]}
                    </motion.div>
                  ))}
                </div>
                <span className="text-2xl mb-1">{tile.emoji}</span>
                <span className="text-white/40 text-xs mb-1">{idx}</span>
              </motion.div>
            )
          })}
        </div>
      </div>

        {/* Current player card */}
      <div className="flex-1 flex flex-col items-center px-4 pb-6 max-w-lg mx-auto w-full gap-4">
        <motion.div layout className="bg-white/5 border border-violet-500/30 rounded-3xl p-5 w-full">
          <div className="flex items-center gap-4 mb-5">
            <motion.div layout
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, repeatType: 'mirror' }}
              className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${player?.color} flex items-center justify-center text-white font-black text-3xl shadow-xl shadow-violet-500/20`}>
              {player?.name?.[0]}
            </motion.div>
            <div>
              <motion.p 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }}
                className="text-slate-400 text-xs">É a vez de</motion.p>
              <motion.h2 
                key={currentPlayer} 
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ type: 'spring', damping: 10 }}
                className="text-white font-black text-2xl">{player?.name}</motion.h2>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-slate-500 text-xs">Casa {positions[currentPlayer]} • {scores[currentPlayer]} pts</motion.p>
            </div>
          </div>
          {!rolled
            ? <DiceRoller onRoll={handleRoll} disabled={moving} />
            : !moving && (
              <motion.button 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }} 
                whileTap={{ scale: 0.98 }}
                onClick={nextPlayer}
                className="w-full bg-gradient-to-r from-violet-600 to-purple-700 text-white font-bold rounded-2xl py-4 mt-2 shadow-lg shadow-violet-500/30">
                Próximo Jogador →
              </motion.button>
            )
          }
        </motion.div>

        {/* Scoreboard */}
        <div className="w-full grid grid-cols-2 gap-2">
          {players.map((p, i) => (
            <motion.div key={i} layout
              animate={i === currentPlayer ? { scale: [1, 1.02, 1] } : {}}
              transition={{ duration: 0.8, repeat: i === currentPlayer ? Infinity : 0, repeatType: 'reverse' }}
              className={`bg-white/5 rounded-2xl p-3 flex items-center gap-3 transition-all border-2 ${i === currentPlayer ? 'border-violet-500/80 bg-violet-500/15 shadow-lg shadow-violet-500/30' : 'border-white/10'}`}>
              <motion.div
                initial={false}
                animate={i === currentPlayer ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.6, repeat: i === currentPlayer ? Infinity : 0 }}
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center text-white text-sm font-black shadow`}>
                {p.name[0]}
              </motion.div>
              <div className="min-w-0 flex-1">
                <div className="text-white text-sm font-semibold truncate">{p.name}</div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-xs">Casa {positions[i]}</span>
                  <motion.span 
                    key={`score-${i}-${scores[i]}`}
                    initial={{ scale: 1.3, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-amber-400 text-xs font-bold">★ {scores[i]}
                  </motion.span>
                </div>
              </div>
              <AnimatePresence>
                {i === currentPlayer && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: [1, 1.4, 1] }}
                    exit={{ scale: 0 }}
                    transition={{ duration: 0.8, repeat: Infinity, repeatType: 'reverse' }}
                    className="w-3 h-3 rounded-full bg-gradient-to-r from-violet-400 to-pink-400 flex-shrink-0 shadow-lg shadow-violet-400/50" />
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Penalty animation overlay */}
      <AnimatePresence>
        {penaltyAnim && (
          <motion.div key="penalty"
            initial={{ opacity: 0, scale: 0.3, y: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.3, y: -100 }}
            transition={{ type: 'spring', damping: 12, stiffness: 200 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <motion.div 
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
              className="bg-gradient-to-r from-amber-500 to-orange-600 backdrop-blur-md rounded-3xl px-8 py-6 text-center shadow-2xl border border-amber-300/40">
              <motion.div 
                animate={{ rotate: [0, 10, -10, 5, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="text-6xl mb-3">
                🍺
              </motion.div>
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                transition={{ delay: 0.2 }}
                className="text-black font-black text-2xl">
                {penaltyAnim.name}
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-black/80 text-lg font-bold mt-1">
                bebe {penaltyAnim.sips} golo{penaltyAnim.sips > 1 ? 's' : ''}!
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Challenge modal */}
      <AnimatePresence>
        {showChallenge && challenge && (
          <ChallengeCard challenge={challenge} player={player} mode={game?.mode}
            penaltyType={game?.penaltyType}
            onResult={handleChallengeResult}
            onClose={() => setShowChallenge(false)} />
        )}
      </AnimatePresence>

      {/* Mini-game modal */}
      <AnimatePresence>
        {miniGame && (() => {
          const mg = MINI_GAME_LABELS[miniGame] || { title: '🎲 Mini-Jogo', desc: '', color: 'from-violet-600 to-purple-700' }
          return (
            <motion.div key="minigame"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center p-4">
              <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
                className="w-full max-w-lg bg-slate-800 border border-white/10 rounded-3xl overflow-hidden">
                <div className={`bg-gradient-to-r ${mg.color} p-5 text-center`}>
                  <h3 className="text-white font-black text-2xl">{mg.title}</h3>
                </div>
                <div className="p-5 text-center">
                  <p className="text-slate-300 mb-6">{mg.desc}</p>
                  <button onClick={nextPlayer}
                    className={`w-full bg-gradient-to-r ${mg.color} text-white font-bold rounded-2xl py-4`}>
                    Concluído →
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )
        })()}
      </AnimatePresence>
    </div>
  )
}
