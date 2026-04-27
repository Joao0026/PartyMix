import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Star, Home, RotateCcw, Award } from 'lucide-react'
import { useLang } from '../contexts/LangContext'

// ── CONFETTI ─────────────────────────────────────────
function Confetti() {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const COLORS = ['#f43f5e','#a855f7','#06b6d4','#f59e0b','#10b981','#3b82f6','#ec4899','#8b5cf6']
    const pieces = Array.from({ length: 150 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 7 + 3,
      d: Math.random() * 80 + 20,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      tilt: Math.random() * 10 - 10,
      tiltAngle: 0,
      tiltSpeed: Math.random() * 0.1 + 0.04,
      shape: Math.random() > 0.5 ? 'circle' : 'rect',
    }))
    let angle = 0, raf
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      angle += 0.008
      pieces.forEach(p => {
        p.tiltAngle += p.tiltSpeed
        p.y += (Math.cos(angle + p.d) + 2.5) * 1.1
        p.x += Math.sin(angle) * 0.8
        p.tilt = Math.sin(p.tiltAngle) * 14
        if (p.y > canvas.height + 10) { p.y = -10; p.x = Math.random() * canvas.width }
        ctx.beginPath()
        ctx.fillStyle = p.color
        if (p.shape === 'circle') { ctx.arc(p.x + p.tilt, p.y, p.r, 0, Math.PI * 2); ctx.fill() }
        else { ctx.fillRect(p.x + p.tilt, p.y, p.r, p.r / 2) }
      })
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [])
  return <canvas ref={ref} className="fixed inset-0 pointer-events-none z-40" />
}

// ── TITLE GENERATION ─────────────────────────────────
function generateTitles(players, scores, lang = 'pt') {
  if (!players?.length) return []

  const ranked = players.map((p, i) => ({ ...p, score: scores?.[i] || 0, idx: i }))
    .sort((a, b) => b.score - a.score)

  const defs = {
    pt: [
      { id: 'winner',      icon: '👑', get: (r) => r[0],           cond: () => true,                   text: (p) => `Rei/Rainha da Festa` },
      { id: 'loser',       icon: '🐢', get: (r) => r[r.length-1],  cond: (r) => r.length > 2,          text: (p) => `Mestre da Derrota` },
      { id: 'clutch',      icon: '⚡', get: (r) => r[1],           cond: (r) => r.length > 1 && r[0].score - r[1].score <= 1, text: () => `Rei/Rainha do Clutch` },
      { id: 'shy',         icon: '🙈', get: (r) => r.find(p => p.score === 0), cond: (r) => r.some(p => p.score === 0), text: () => `A Grande Vergonha` },
      { id: 'dominant',    icon: '🔥', get: (r) => r[0],           cond: (r) => r[0].score >= 5,        text: () => `O Intocável` },
      { id: 'comeback',    icon: '🚀', get: (r) => r[r.length-2],  cond: (r) => r.length > 2,          text: () => `Rei/Rainha da Remontada` },
      { id: 'silver',      icon: '🥈', get: (r) => r[1],           cond: (r) => r.length > 1,          text: () => `Eterno Segundo Lugar` },
    ],
    es: [
      { id: 'winner',      icon: '👑', get: (r) => r[0],           cond: () => true,                   text: () => `Rey/Reina de la Fiesta` },
      { id: 'loser',       icon: '🐢', get: (r) => r[r.length-1],  cond: (r) => r.length > 2,          text: () => `Maestro de la Derrota` },
      { id: 'clutch',      icon: '⚡', get: (r) => r[1],           cond: (r) => r.length > 1 && r[0].score - r[1].score <= 1, text: () => `Rey/Reina del Clutch` },
      { id: 'shy',         icon: '🙈', get: (r) => r.find(p => p.score === 0), cond: (r) => r.some(p => p.score === 0), text: () => `La Gran Vergüenza` },
      { id: 'dominant',    icon: '🔥', get: (r) => r[0],           cond: (r) => r[0].score >= 5,        text: () => `El Intocable` },
      { id: 'silver',      icon: '🥈', get: (r) => r[1],           cond: (r) => r.length > 1,          text: () => `Eterno Segundo Lugar` },
    ],
    en: [
      { id: 'winner',      icon: '👑', get: (r) => r[0],           cond: () => true,                   text: () => `Party King/Queen` },
      { id: 'loser',       icon: '🐢', get: (r) => r[r.length-1],  cond: (r) => r.length > 2,          text: () => `Master of Defeat` },
      { id: 'clutch',      icon: '⚡', get: (r) => r[1],           cond: (r) => r.length > 1 && r[0].score - r[1].score <= 1, text: () => `Clutch King/Queen` },
      { id: 'shy',         icon: '🙈', get: (r) => r.find(p => p.score === 0), cond: (r) => r.some(p => p.score === 0), text: () => `The Big Disgrace` },
      { id: 'dominant',    icon: '🔥', get: (r) => r[0],           cond: (r) => r[0].score >= 5,        text: () => `The Untouchable` },
      { id: 'silver',      icon: '🥈', get: (r) => r[1],           cond: (r) => r.length > 1,          text: () => `Eternal Second Place` },
    ],
  }

  const langDefs = defs[lang] || defs.pt
  const titles = []
  const usedPlayers = new Set()

  for (const def of langDefs) {
    if (!def.cond(ranked)) continue
    const player = def.get(ranked)
    if (!player || usedPlayers.has(player.idx)) continue
    usedPlayers.add(player.idx)
    titles.push({ player: player.name, icon: def.icon, title: def.text(player), color: player.color })
  }

  return titles
}

// ── MAIN ─────────────────────────────────────────────
const MEDALS = ['🥇', '🥈', '🥉']

export default function VictoryScreen() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const { t, lang } = useLang()
  const [showTitles, setShowTitles] = useState(false)

  const { players = [], scores = [], mode = 'friends' } = state || {}
  const ranked = [...players].map((p, i) => ({ ...p, score: scores[i] || 0, idx: i })).sort((a, b) => b.score - a.score)
  const winner = ranked[0]
  const titles = generateTitles(players, scores, lang)

  const bgAccent = {
    couple: 'from-rose-900/30',
    friends: 'from-cyan-900/20',
    family: 'from-sky-900/20',
    drink: 'from-amber-900/20',
  }

  useEffect(() => {
    const timer = setTimeout(() => setShowTitles(true), 1800)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-900 ${bgAccent[mode] || ''} to-slate-900 flex flex-col items-center px-4 py-8`}>
      <Confetti />

      <div className="relative z-50 w-full max-w-lg space-y-5">
        {/* Winner hero */}
        <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 10, delay: 0.2 }}
          className="text-center">
          <motion.div animate={{ rotate: [-8, 8, -4, 4, 0] }} transition={{ delay: 0.8, duration: 0.6 }}
            className="text-7xl mb-3 select-none">🏆</motion.div>
          <h1 className="text-white font-black text-3xl">{winner?.name}</h1>
          <p className="text-amber-400 font-bold text-lg">{t.wonWith} {winner?.score} {t.pts}!</p>
          <div className="flex justify-center mt-2 gap-0.5">
            {[...Array(Math.min(winner?.score || 0, 5))].map((_, i) => (
              <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 + i * 0.08 }}>
                <Star className="text-amber-400 w-5 h-5 fill-amber-400" />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Podium */}
        <div className="space-y-2">
          {ranked.map((p, rank) => (
            <motion.div key={p.idx}
              initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + rank * 0.08 }}
              className={`flex items-center gap-4 rounded-2xl p-4 ${rank === 0 ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-white/[0.04] border border-white/[0.06]'}`}>
              <span className="text-2xl w-8 text-center select-none">{MEDALS[rank] || `${rank + 1}`}</span>
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${p.color} flex items-center justify-center text-white font-black text-xl shadow`}>
                {p.name[0]}
              </div>
              <p className="flex-1 text-white font-bold">{p.name}</p>
              <div className="text-right">
                <p className="text-white font-black text-2xl">{p.score}</p>
                <p className="text-slate-500 text-xs">{t.pts}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Night Titles */}
        <AnimatePresence>
          {showTitles && titles.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <Award className="text-violet-400 w-5 h-5" />
                <h2 className="text-white font-bold">{t.nightTitle}</h2>
              </div>
              {titles.map((ti, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.12 }}
                  className="bg-gradient-to-r from-violet-900/40 to-purple-900/40 border border-violet-500/30 rounded-2xl px-4 py-3 flex items-center gap-3">
                  <span className="text-2xl select-none">{ti.icon}</span>
                  <div>
                    <p className="text-violet-300 text-xs font-semibold uppercase tracking-wider">{ti.title}</p>
                    <p className="text-white font-bold">{ti.player}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}
          className="flex gap-3 pt-2">
          <button onClick={() => navigate('/')}
            className="flex-1 bg-gradient-to-r from-violet-600 to-purple-700 text-white font-bold rounded-2xl py-4 flex items-center justify-center gap-2">
            <Home className="w-5 h-5" /> {t.backHome}
          </button>
          <button onClick={() => navigate(-2)}
            className="flex-1 bg-white/[0.06] border border-white/10 text-white font-bold rounded-2xl py-4 flex items-center justify-center gap-2">
            <RotateCcw className="w-5 h-5" /> {t.playAgain}
          </button>
        </motion.div>
      </div>
    </div>
  )
}
