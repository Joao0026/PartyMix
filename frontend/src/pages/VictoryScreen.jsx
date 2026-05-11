import { useEffect, useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Home, RotateCcw } from 'lucide-react'

// ── WEB AUDIO SOUNDS ─────────────────────────────────────────
function playVictorySound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const notes = [523, 659, 784, 1047] // C E G C
    notes.forEach((freq, i) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.connect(g); g.connect(ctx.destination)
      o.frequency.value = freq
      o.type = 'sine'
      const t = ctx.currentTime + i * 0.15
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.25, t + 0.05)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
      o.start(t); o.stop(t + 0.5)
    })
  } catch {}
}

function playConfettiSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    for (let i = 0; i < 6; i++) {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.connect(g); g.connect(ctx.destination)
      o.frequency.value = 300 + Math.random() * 800
      o.type = 'sine'
      const t = ctx.currentTime + i * 0.08
      g.gain.setValueAtTime(0.15, t)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
      o.start(t); o.stop(t + 0.35)
    }
  } catch {}
}

// ── CONFETTI ─────────────────────────────────────────────────
const COLORS = ['#f43f5e','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899']

function Confetti() {
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 1.5,
    duration: 2 + Math.random() * 2,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: 6 + Math.random() * 8,
    rotate: Math.random() * 360,
  }))
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-10">
      {pieces.map(p => (
        <motion.div key={p.id}
          initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: p.rotate }}
          animate={{ y: '110vh', opacity: [1,1,0], rotate: p.rotate + 360 * 3 }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
          style={{ position:'absolute', top:0, width:p.size, height:p.size,
            background:p.color, borderRadius: Math.random() > 0.5 ? '50%' : 2 }}/>
      ))}
    </div>
  )
}

// ── TITLES ────────────────────────────────────────────────────
const TITLES = [
  { condition: (score, max, total) => score === max && score >= 5,                   title:'👑 O Rei da Noite',        color:'text-amber-400' },
  { condition: (score, max, total) => score === max,                                  title:'🏆 Melhor Jogador',        color:'text-yellow-400' },
  { condition: (score, max, total, fails) => fails >= 4,                              title:'💀 Rei do Falhanço',       color:'text-red-400' },
  { condition: (score, max, total, fails) => fails === 0 && score > 0,               title:'⚡ Imparável',             color:'text-cyan-400' },
  { condition: (score, max, total, fails, idx, players) => idx === players.length-1, title:'🐢 Último a Chegar',       color:'text-slate-400' },
  { condition: () => true,                                                             title:'🎉 Participante',          color:'text-slate-300' },
]

function getTitle(score, maxScore, fails, idx, players) {
  for (const t of TITLES) {
    if (t.condition(score, maxScore, players.length, fails, idx, players)) return t
  }
  return TITLES[TITLES.length - 1]
}

export default function VictoryScreen() {
  const navigate   = useNavigate()
  const location   = useLocation()
  const soundPlayed = useRef(false)

  // Get data from navigation state or fallback to saved game
  const state    = location.state || {}
  const players  = state.players  || []
  const scores   = state.scores   || players.map(() => 0)
  const fails    = state.fails    || players.map(() => 0)
  const mode     = state.mode     || 'friends'

  const [show, setShow] = useState(false)

  useEffect(() => {
    if (soundPlayed.current) return
    soundPlayed.current = true
    setTimeout(() => { playVictorySound(); setShow(true) }, 300)
    setTimeout(() => playConfettiSound(), 600)
    setTimeout(() => playConfettiSound(), 1200)
  }, [])

  if (!players.length) return (
    <div className="min-h-screen bg-[#080b14] flex items-center justify-center">
      <div className="text-center space-y-4">
        <p className="text-white font-bold text-xl">Nenhum jogo encontrado</p>
        <button onClick={() => navigate('/')} className="bg-violet-600 text-white px-6 py-3 rounded-2xl font-bold">Início</button>
      </div>
    </div>
  )

  const maxScore  = Math.max(...scores, 1)
  const winnerIdx = scores.indexOf(maxScore)

  // Sort by score descending for the leaderboard
  const ranked = players
    .map((p, i) => ({ ...p, score: scores[i], fails: fails[i] || 0, originalIdx: i }))
    .sort((a, b) => b.score - a.score)

  return (
    <div className="min-h-screen bg-[#080b14] flex flex-col items-center px-4 py-8 relative overflow-hidden">
      <Confetti/>

      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none" style={{background:'radial-gradient(ellipse at 50% 20%, rgba(245,158,11,0.12) 0%, transparent 60%)'}}/>

      <div className="w-full max-w-lg relative z-20 space-y-6">
        {/* Trophy header */}
        <AnimatePresence>
          {show && (
            <motion.div initial={{scale:0,opacity:0}} animate={{scale:1,opacity:1}} transition={{type:'spring',damping:12,delay:0.1}}
              className="text-center space-y-3">
              <motion.div animate={{rotate:[0,-5,5,-5,5,0],scale:[1,1.1,1.05,1.1,1]}} transition={{duration:0.8,delay:0.3}}>
                <span className="text-8xl">🏆</span>
              </motion.div>
              <h1 className="text-white font-black text-3xl">Jogo Terminado!</h1>
              <p className="text-amber-400 font-bold text-lg">
                {players[winnerIdx]?.name} venceu com {maxScore} pontos!
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Leaderboard */}
        <div className="space-y-3">
          {ranked.map((p, rank) => {
            const title = getTitle(p.score, maxScore, p.fails, p.originalIdx, players)
            return (
              <motion.div key={p.originalIdx}
                initial={{opacity:0, x:-20}} animate={{opacity:1, x:0}}
                transition={{delay:0.3 + rank * 0.1, type:'spring', damping:15}}
                className={`rounded-3xl p-4 flex items-center gap-4 border ${rank===0?'border-amber-500/40 bg-amber-500/8':'border-white/[0.07] bg-white/[0.04]'}`}
                style={rank===0?{boxShadow:'0 0 24px rgba(245,158,11,0.15)'}:{}}>

                {/* Rank */}
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-lg flex-shrink-0 ${rank===0?'bg-amber-500 text-black':rank===1?'bg-slate-600 text-white':rank===2?'bg-amber-800 text-white':'bg-white/[0.06] text-slate-400'}`}>
                  {rank===0?'🥇':rank===1?'🥈':rank===2?'🥉':rank+1}
                </div>

                {/* Avatar */}
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${p.color} flex items-center justify-center text-white font-black text-xl shadow-lg flex-shrink-0`}>
                  {p.name[0]}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={`font-black text-lg ${rank===0?'text-amber-400':'text-white'}`}>{p.name}</p>
                  <p className={`text-sm font-bold ${title.color}`}>{title.title}</p>
                </div>

                {/* Score */}
                <div className="text-right flex-shrink-0">
                  <p className={`font-black text-2xl ${rank===0?'text-amber-400':'text-white'}`}>{p.score}</p>
                  <p className="text-slate-500 text-xs">{p.score===1?'ponto':'pontos'}</p>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Actions */}
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.8}}
          className="grid grid-cols-2 gap-3">
          <button onClick={() => navigate(`/GameSetup?mode=${mode}`)}
            className="bg-white/[0.06] border border-white/[0.1] text-white font-bold rounded-2xl py-4 flex items-center justify-center gap-2">
            <RotateCcw className="w-5 h-5"/> Jogar de Novo
          </button>
          <button onClick={() => navigate('/')}
            className="bg-gradient-to-r from-violet-600 to-purple-700 text-white font-bold rounded-2xl py-4 flex items-center justify-center gap-2">
            <Home className="w-5 h-5"/> Início
          </button>
        </motion.div>

        {/* Fun stats */}
        {fails.some(f => f > 0) && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:1}}
            className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
            <p className="text-slate-500 text-xs text-center mb-2 uppercase tracking-wider">Estatísticas da Noite</p>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <p className="text-white font-black text-2xl">{scores.reduce((a,b)=>a+b,0)}</p>
                <p className="text-slate-500 text-xs">Desafios completos</p>
              </div>
              <div>
                <p className="text-white font-black text-2xl">{fails.reduce((a,b)=>a+b,0)}</p>
                <p className="text-slate-500 text-xs">Falhanços épicos</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
