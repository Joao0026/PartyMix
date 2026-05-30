import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Smartphone, Wifi, Users } from 'lucide-react'

export default function MisterWhiteHub() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#080b14] flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white p-1">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-white font-black text-xl">👁️ Mister White</h1>
            <p className="text-slate-500 text-sm">Como queres jogar?</p>
          </div>
        </div>

        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/MisterWhiteGame')}
          className="w-full rounded-2xl p-5 flex items-center gap-4 text-left border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.06] transition-all"
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-white font-bold text-lg">Um telemóvel</p>
            <p className="text-slate-500 text-sm mt-0.5">Passa o telemóvel à volta da mesa para ver os papéis</p>
          </div>
        </motion.button>

        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/MisterWhiteLobby')}
          className="w-full rounded-2xl p-5 flex items-center gap-4 text-left border border-violet-500/25 bg-violet-500/10 hover:bg-violet-500/15 transition-all"
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center flex-shrink-0">
            <Wifi className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-white font-bold text-lg">Sala online</p>
            <p className="text-slate-400 text-sm mt-0.5">Cada jogador no seu telemóvel — código da sala</p>
          </div>
        </motion.button>

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 flex gap-3 text-sm text-slate-500">
          <Users className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
          <p>Mínimo 3 jogadores. Na sala online, o host controla votação e eliminações; cada um vê só o seu papel.</p>
        </div>
      </div>
    </div>
  )
}
