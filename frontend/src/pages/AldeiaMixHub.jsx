import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Wifi } from 'lucide-react'

export default function AldeiaMixHub() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#080b14] flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/')} className="text-slate-400 hover:text-white p-1">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-white font-black text-xl">🏘️ AldeiaMix</h1>
            <p className="text-slate-500 text-sm">Lobos, videntes e curandeiros — online</p>
          </div>
        </div>

        <motion.button
          type="button"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/AldeiaMixLobby')}
          className="w-full rounded-2xl p-5 flex items-center gap-4 text-left border border-emerald-500/25 bg-emerald-500/10 hover:bg-emerald-500/15 transition-all"
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center flex-shrink-0">
            <Wifi className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-white font-bold text-lg">Sala online</p>
            <p className="text-slate-400 text-sm mt-0.5">Cada jogador no telemóvel — host escolhe papéis; narrador conduz a noite</p>
          </div>
        </motion.button>

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 text-sm text-slate-500">
          Mínimo 4 jogadores. No fim: «Jogar outra vez» — o juiz passa ao jogador seguinte.
        </div>
      </div>
    </div>
  )
}
