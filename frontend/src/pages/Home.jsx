import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sparkles, Heart, Users, Home as HomeIcon, Layers, Eye, Settings, ChevronRight } from 'lucide-react'

const MODES = [
  { id: 'couple', icon: Heart, label: 'Modo Casal', desc: 'Dados eróticos, desafios e posições', color: 'from-red-500 to-rose-700', glow: '#f43f5e', path: '/GameSetup?mode=couple' },
  { id: 'friends', icon: Users, label: 'Modo Amigos', desc: 'Mapa, mini-jogos e penalizações', color: 'from-cyan-400 to-blue-600', glow: '#22d3ee', path: '/GameSetup?mode=friends' },
  { id: 'family', icon: HomeIcon, label: 'Modo Família', desc: 'Cultura, desporto, música e cinema', color: 'from-sky-400 to-blue-400', glow: '#38bdf8', path: '/GameSetup?mode=family' },
  { id: 'cards', icon: Layers, label: 'Modo Cartas', desc: 'Tipo Cards Against Humanity', color: 'from-amber-500 to-yellow-500', glow: '#f59e0b', path: '/CardsLobby' },
  { id: 'mister', icon: Eye, label: 'Mister White', desc: 'Dedução social, quem é o infiltrado?', color: 'from-slate-400 to-slate-600', glow: '#94a3b8', path: '/MisterWhiteGame' },
]

export default function Home() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex flex-col items-center px-4 py-10 overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-1/4 w-64 h-64 bg-cyan-600/8 rounded-full blur-3xl pointer-events-none" />

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -30, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 12 }}
        className="mb-10 text-center relative z-10">
        <div className="flex items-center justify-center gap-3 mb-2">
          <motion.div animate={{ rotate: [0, 15, -10, 15, 0], scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 3, delay: 1 }}>
            <Sparkles className="text-yellow-400 w-8 h-8" />
          </motion.div>
          <h1 className="text-5xl font-black bg-gradient-to-r from-yellow-400 via-pink-400 to-violet-400 bg-clip-text text-transparent tracking-tight">
            PartyMix
          </h1>
          <motion.div animate={{ rotate: [0, -15, 10, -15, 0], scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 3, delay: 1.5 }}>
            <Sparkles className="text-violet-400 w-8 h-8" />
          </motion.div>
        </div>
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="text-slate-400 text-xs font-semibold tracking-[0.25em] uppercase">
          O jogo de festa definitivo
        </motion.p>
      </motion.div>

      {/* Mode buttons */}
      <div className="w-full max-w-lg space-y-3 relative z-10">
        {MODES.map((m, i) => (
          <motion.button
            key={m.id}
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.08, type: 'spring', damping: 14 }}
            whileHover={{ scale: 1.02, x: 4 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate(m.path)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 flex items-center gap-4 hover:bg-white/[0.08] hover:border-white/20 transition-all group relative overflow-hidden"
            style={{ '--glow': m.glow }}>
            {/* Subtle glow on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: `radial-gradient(circle at 30% 50%, ${m.glow}18 0%, transparent 70%)` }} />
            <motion.div
              whileHover={{ rotate: [0, -8, 8, 0] }}
              transition={{ duration: 0.4 }}
              className={`bg-gradient-to-br ${m.color} w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg relative z-10`}>
              <m.icon className="text-white w-7 h-7" />
            </motion.div>
            <div className="flex-1 text-left relative z-10">
              <div className="text-white font-bold text-lg leading-tight">{m.label}</div>
              <div className="text-slate-400 text-sm">{m.desc}</div>
            </div>
            <motion.div
              animate={{ x: [0, 3, 0] }}
              transition={{ repeat: Infinity, duration: 2, delay: i * 0.3 }}
              className="relative z-10">
              <ChevronRight className="text-slate-600 group-hover:text-white transition-colors w-5 h-5" />
            </motion.div>
          </motion.button>
        ))}
      </div>

      <motion.button
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
        onClick={() => navigate('/Admin')}
        className="mt-8 flex items-center gap-2 text-slate-600 hover:text-slate-300 transition-colors text-sm relative z-10">
        <Settings className="w-4 h-4" /> Painel Admin
      </motion.button>
    </div>
  )
}
