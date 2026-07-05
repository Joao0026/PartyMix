import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Wifi } from 'lucide-react'

export default function MemeMixHub() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#080b14] flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/')} className="text-slate-400 hover:text-white p-1">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-white font-black text-xl">😂 MemeMix</h1>
            <p className="text-slate-500 text-sm">Memes + legendas — estilo What Do You Meme</p>
          </div>
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/MemeMixLobby')}
          className="w-full rounded-2xl p-5 flex items-center gap-4 text-left border border-pink-500/25 bg-pink-500/10"
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
            <Wifi className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-lg">Sala online</p>
            <p className="text-slate-400 text-sm">Cada um envia fotos do telemóvel — apagadas no fim</p>
          </div>
        </motion.button>

        <div className="text-sm text-slate-500 bg-white/[0.03] rounded-2xl p-4 border border-white/[0.06]">
          Host escolhe pontos (1–7). Juiz só memes; os outros 5 legendas. Fotos da sessão não ficam guardadas.
        </div>
      </div>
    </div>
  )
}
