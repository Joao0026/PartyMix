import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Users, Home as HomeIcon, Layers, Eye, Beer, ChevronRight, Users2 } from 'lucide-react'
import { useLang } from '../contexts/LangContext'

const MODE_ICONS = { couple: Heart, friends: Users, family: HomeIcon, drink: Beer, cards: Layers, mister: Eye }
const MODE_COLORS = {
  couple:  { gradient: 'from-rose-500 to-pink-600',    glow: 'rgba(244,63,94,0.18)',  ring: '#f43f5e' },
  friends: { gradient: 'from-cyan-400 to-blue-500',    glow: 'rgba(34,211,238,0.15)', ring: '#22d3ee' },
  family:  { gradient: 'from-sky-400 to-indigo-500',   glow: 'rgba(56,189,248,0.15)', ring: '#38bdf8' },
  drink:   { gradient: 'from-amber-400 to-orange-500', glow: 'rgba(245,158,11,0.18)', ring: '#f59e0b' },
  cards:   { gradient: 'from-yellow-400 to-amber-500', glow: 'rgba(234,179,8,0.15)',  ring: '#eab308' },
  mister:  { gradient: 'from-slate-500 to-slate-700',  glow: 'rgba(148,163,184,0.15)',ring: '#94a3b8' },
}
const MODE_PATHS = { couple:'/GameSetup?mode=couple', friends:'/GameSetup?mode=friends', family:'/GameSetup?mode=family', drink:'/DrinkGame', cards:'/CardsLobby', mister:'/MisterWhite' }
const MODE_ORDER = ['couple','friends','family','drink','cards','mister']

export default function Home() {
  const navigate = useNavigate()
  const { t } = useLang()

  return (
    <div className="min-h-screen bg-[#080b14] flex flex-col items-center px-4 py-8 overflow-x-hidden overflow-y-auto relative">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-5%] right-[10%] w-[350px] h-[350px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #ec4899 0%, transparent 70%)' }} />
        <div className="absolute top-[40%] left-[-5%] w-[250px] h-[250px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
      </div>

      {/* Logo */}
      <motion.div initial={{ opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 14 }}
        className="mb-10 text-center relative z-10">
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          className="text-6xl mb-3 select-none">🎉</motion.div>
        <h1 className="text-5xl font-black tracking-tight mb-2"
          style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #ec4899 40%, #8b5cf6 80%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          PartyMix
        </h1>
        <p className="text-slate-500 text-sm font-medium tracking-[0.2em] uppercase">{t.tagline}</p>
      </motion.div>

      {/* Mode cards */}
      <div className="w-full max-w-lg space-y-2.5 relative z-10">
        {MODE_ORDER.map((id, i) => {
          const cfg   = MODE_COLORS[id]
          const Icon  = MODE_ICONS[id]
          const info  = t.modes[id]
          return (
            <motion.button key={id}
              initial={{ opacity: 0, x: -32 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.06 + i * 0.06, type: 'spring', damping: 16 }}
              whileHover={{ scale: 1.015, x: 3 }}
              whileTap={{ scale: 0.975 }}
              onClick={() => navigate(MODE_PATHS[id])}
              className="w-full rounded-2xl p-4 flex items-center gap-4 transition-all group relative overflow-hidden text-left"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '0.5px solid rgba(255,255,255,0.08)',
              }}>
              {/* Glow on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
                style={{ background: `radial-gradient(ellipse at 20% 50%, ${cfg.glow} 0%, transparent 60%)` }} />
              {/* Active ring on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
                style={{ boxShadow: `inset 0 0 0 1px ${cfg.ring}30` }} />

              <motion.div
                whileHover={{ rotate: [-4, 4, -2, 0] }}
                transition={{ duration: 0.35 }}
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center flex-shrink-0 shadow-lg relative z-10`}
                style={{ boxShadow: `0 4px 20px ${cfg.ring}30` }}>
                <Icon className="text-white w-7 h-7" />
              </motion.div>

              <div className="flex-1 relative z-10">
                <div className="text-white font-bold text-base leading-tight">{info.label}</div>
                <div className="text-slate-500 text-sm mt-0.5">{info.desc}</div>
              </div>

              <ChevronRight className="text-slate-700 group-hover:text-slate-400 transition-colors w-4 h-4 relative z-10 flex-shrink-0" />
            </motion.button>
          )
        })}

        {/* Community Cards button */}
        <motion.button
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.975 }}
          onClick={() => navigate('/community')}
          className="w-full rounded-2xl p-4 flex items-center gap-4 transition-all group relative overflow-hidden text-left mt-1"
          style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px dashed rgba(255,255,255,0.12)' }}>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center flex-shrink-0" style={{ boxShadow: '0 4px 20px rgba(124,58,237,0.3)' }}>
            <Users2 className="text-white w-7 h-7" />
          </div>
          <div className="flex-1">
            <div className="text-white font-bold text-base">{t.community}</div>
            <div className="text-slate-500 text-sm mt-0.5">{t.communityDesc}</div>
          </div>
          <ChevronRight className="text-slate-700 group-hover:text-slate-400 transition-colors w-4 h-4 flex-shrink-0" />
        </motion.button>
      </div>

      {/* Version */}
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
        className="mt-8 text-slate-700 text-xs relative z-10">
        PartyMix v5 · <a onClick={() => navigate('/admin')} className="hover:text-slate-500 cursor-pointer transition-colors">⚙</a>
      </motion.p>
    </div>
  )
}
