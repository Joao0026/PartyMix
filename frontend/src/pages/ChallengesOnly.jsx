import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { loadGame, CATEGORY_CONFIG, weightedSips } from '../utils/game'
import { api } from '../utils/api'
import ChallengeCard from '../components/game/ChallengeCard'
import { ChevronLeft, Trophy, Shuffle } from 'lucide-react'

const WINNING_SCORE = 5

export default function ChallengesOnly() {
  const navigate = useNavigate()
  const game = loadGame()
  const players = game?.players || []
  const cats = game?.selectedCategories || ['mimica','verdade','acao','desenho']

  const [currentPlayer, setCurrentPlayer] = useState(0)
  const [scores, setScores] = useState(players.map(() => 0))
  const [challenge, setChallenge] = useState(null)
  const [showChallenge, setShowChallenge] = useState(false)
  const [loading, setLoading] = useState(false)
  const [penaltyAnim, setPenaltyAnim] = useState(null)
  const [ongoings, setOngoings] = useState([])
  const [round, setRound] = useState(1)

  if (!game) { navigate('/'); return null }

  const player = players[currentPlayer]
  const maxScore = Math.max(...scores)

  const drawChallenge = async () => {
    setLoading(true)
    // Pick random category from selected
    const cat = cats[Math.floor(Math.random() * cats.length)]
    try {
      const c = await api.getRandomChallenge({ category: cat, mode_type: game.mode || 'friends' })
      if (c && !c.error) { setChallenge(c); setShowChallenge(true) }
    } catch { console.error('challenge fetch failed') }
    setLoading(false)
  }

  const handleResult = (result) => {
    setShowChallenge(false)
    if (result === 'success') {
      const newScores = scores.map((s, i) => i === currentPlayer ? s + 1 : s)
      setScores(newScores)
      if (newScores[currentPlayer] >= WINNING_SCORE) {
        setTimeout(() => navigate('/VictoryScreen', { state: { players, scores: newScores, mode: game.mode } }), 400)
        return
      }
    }
    if (result === 'fail' && game.penaltyType !== 'penalty') {
      const sips = [1, 2, 2, 3][Math.floor(Math.random() * 4)]
      setPenaltyAnim({ name: player?.name, sips })
      setTimeout(() => setPenaltyAnim(null), 2500)
    }
    if (result === 'accepted' && challenge?.is_ongoing) {
      setOngoings(o => [...o, { instruction: challenge.ongoing_instruction, playerIdx: currentPlayer, turnsLeft: challenge.ongoing_rounds }])
    }
  }

  const nextPlayer = () => {
    setChallenge(null)
    setShowChallenge(false)
    const next = (currentPlayer + 1) % players.length
    if (next === 0) setRound(r => r + 1)
    setCurrentPlayer(next)
    setOngoings(os => os.map(o => ({ ...o, turnsLeft: o.turnsLeft - 1 })).filter(o => o.turnsLeft > 0))
  }

  return (
    <div className="min-h-screen bg-[#080b14] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white p-1"><ChevronLeft className="w-5 h-5"/></button>
          <div className="flex items-center gap-2">
            <Trophy className="text-amber-400 w-4 h-4"/>
            <span className="text-white font-bold text-sm">Ronda {round} · Meta {WINNING_SCORE}pts</span>
          </div>
          <div className="flex gap-3">
            {players.map((p, i) => (
              <div key={i} className="text-center">
                <div className={`text-sm font-black ${i === currentPlayer ? 'text-amber-400' : 'text-white'}`}>{scores[i]}</div>
                <div className="text-slate-600 text-xs truncate max-w-10">{p.name.split(' ')[0]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Score bars */}
      <div className="px-4 py-2 max-w-lg mx-auto w-full">
        {players.map((p, i) => (
          <div key={i} className="flex items-center gap-2 mb-1">
            <span className="text-xs text-slate-500 w-12 truncate">{p.name.split(' ')[0]}</span>
            <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <motion.div animate={{ width: `${(scores[i] / WINNING_SCORE) * 100}%` }}
                className={`h-full rounded-full bg-gradient-to-r ${p.color}`} transition={{ type: 'spring', damping: 12 }}/>
            </div>
            <span className="text-xs text-slate-500 w-6 text-right">{scores[i]}</span>
          </div>
        ))}
      </div>

      {/* Ongoings */}
      {ongoings.length > 0 && (
        <div className="px-4 max-w-lg mx-auto w-full space-y-1">
          {ongoings.map((o, i) => (
            <div key={i} className="bg-orange-500/10 border border-orange-500/30 rounded-xl px-3 py-1.5 text-orange-300 text-xs flex gap-2">
              🔁 <span><b>{players[o.playerIdx]?.name}:</b> {o.instruction} ({o.turnsLeft})</span>
            </div>
          ))}
        </div>
      )}

      {/* Main player card */}
      <div className="flex-1 flex flex-col items-center px-4 py-6 max-w-lg mx-auto w-full gap-5">
        <motion.div layout className="bg-white/[0.04] border border-white/[0.07] rounded-3xl p-6 w-full">
          <div className="flex items-center gap-4 mb-6">
            <motion.div layout className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${player?.color} flex items-center justify-center text-white font-black text-3xl shadow-xl`}>
              {player?.name?.[0]}
            </motion.div>
            <div>
              <p className="text-slate-500 text-xs">É a vez de</p>
              <motion.h2 key={currentPlayer} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="text-white font-black text-2xl">{player?.name}</motion.h2>
              <p className="text-slate-600 text-xs">{scores[currentPlayer]} pontos</p>
            </div>
            {scores[currentPlayer] === maxScore && maxScore > 0 && <Trophy className="text-amber-400 w-5 h-5 ml-auto"/>}
          </div>

          {/* Category display */}
          <div className="flex flex-wrap gap-1.5 mb-5">
            {cats.map(c => {
              const cfg = CATEGORY_CONFIG[c]
              return (
                <span key={c} className="text-xs px-2 py-1 rounded-lg bg-white/[0.06] text-slate-400">
                  {cfg?.emoji} {cfg?.label || c}
                </span>
              )
            })}
          </div>

          {!showChallenge && (
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={drawChallenge} disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black rounded-2xl py-5 text-xl flex items-center justify-center gap-2">
              <Shuffle className="w-5 h-5"/>
              {loading ? 'A sortear...' : 'Sortear Desafio'}
            </motion.button>
          )}

          {showChallenge && (
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={nextPlayer}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-700 text-white font-bold rounded-2xl py-4 mt-2">
              Próximo Jogador →
            </motion.button>
          )}
        </motion.div>

        {/* Players scoreboard */}
        <div className="w-full grid grid-cols-2 gap-2">
          {players.map((p, i) => (
            <motion.div key={i} layout
              className={`bg-white/[0.04] rounded-2xl p-3 flex items-center gap-3 border transition-all ${i === currentPlayer ? 'border-cyan-500/40 bg-cyan-500/5' : 'border-white/[0.05]'}`}>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center text-white text-sm font-black shadow`}>{p.name[0]}</div>
              <div className="min-w-0">
                <div className="text-white text-sm font-semibold truncate">{p.name}</div>
                <div className="text-amber-400 text-xs font-bold">★ {scores[i]}</div>
              </div>
              {i === currentPlayer && (
                <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}
                  className="ml-auto w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0"/>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Penalty anim */}
      <AnimatePresence>
        {penaltyAnim && (
          <motion.div key="penalty" initial={{ opacity: 0, scale: 0.6, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, y: -40 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="bg-amber-500/90 backdrop-blur-sm rounded-3xl px-8 py-6 text-center shadow-2xl">
              <div className="text-5xl mb-2">🍺</div>
              <div className="text-black font-black text-2xl">{penaltyAnim.name}</div>
              <div className="text-black/80 font-bold">bebe {penaltyAnim.sips} golo{penaltyAnim.sips > 1 ? 's' : ''}!</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showChallenge && challenge && (
          <ChallengeCard challenge={challenge} player={player} mode={game.mode} penaltyType={game.penaltyType}
            onResult={handleResult} onClose={() => setShowChallenge(false)}/>
        )}
      </AnimatePresence>
    </div>
  )
}
