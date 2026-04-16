import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, XCircle, Clock } from 'lucide-react'
import { CATEGORY_CONFIG, weightedSips } from '../../utils/game'

export default function ChallengeCard({ challenge, player, mode, penaltyType, onResult, onClose }) {
  const [timeLeft, setTimeLeft] = useState(challenge?.time_limit || 0)
  const [sips] = useState(weightedSips())
  const [hasPenalty] = useState(Math.random() < 0.15)
  const [accepted, setAccepted] = useState(false)
  const cat = CATEGORY_CONFIG[challenge?.category] || { emoji: '🎲', label: 'Desafio', color: 'from-violet-500 to-purple-600' }

  const maxTime = challenge?.time_limit || 0
  const timerPct = maxTime > 0 ? (timeLeft / maxTime) * 100 : 100

  useEffect(() => {
    if (!challenge?.time_limit || timeLeft <= 0) return
    const t = setInterval(() => setTimeLeft(s => {
      if (s <= 1) { clearInterval(t); return 0 }
      return s - 1
    }), 1000)
    return () => clearInterval(t)
  }, [challenge?.time_limit])

  if (!challenge) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 100, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 100, scale: 0.9 }}
        transition={{ type: 'spring', damping: 16, stiffness: 300 }}
        className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">

        {/* Header gradient */}
        <div className={`bg-gradient-to-r ${cat.color} p-4 relative overflow-hidden`}>
          <motion.div 
            className="absolute inset-0 bg-black/20"
            animate={{ opacity: [0.2, 0.3, 0.2] }}
            transition={{ duration: 3, repeat: Infinity }} />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.span
                animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-3xl">{cat.emoji}</motion.span>
              <div>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-white/70 text-xs">{player?.name}</motion.div>
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-white font-bold text-lg">{cat.label}</motion.div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {maxTime > 0 && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2 py-1">
                  <Clock className="w-4 h-4 text-white/70" />
                  <motion.span
                    animate={timeLeft <= 5 ? { scale: [1, 1.3, 1], color: ['#fef3c7', '#fca5a5', '#fef3c7'] } : {}}
                    transition={{ repeat: timeLeft <= 5 ? Infinity : 0, duration: 0.5 }}
                    className={`text-white font-mono font-black text-xl ${timeLeft <= 5 ? 'text-red-200' : ''}`}>
                    {timeLeft}
                  </motion.span>
                </motion.div>
              )}
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose} 
                className="text-white/50 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all">
                <X className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
          {/* Timer bar */}
          {maxTime > 0 && (
            <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${
                  timeLeft <= 5 ? 'bg-gradient-to-r from-red-400 to-red-300' : 
                  timeLeft <= maxTime / 3 ? 'bg-gradient-to-r from-yellow-400 to-yellow-300' :
                  'bg-gradient-to-r from-green-400 to-emerald-300'
                }`}
                animate={{ width: `${timerPct}%` }}
                transition={{ duration: 0.3, ease: 'linear' }}
                style={{ boxShadow: timerPct > 0 ? 'inset 0 0 8px rgba(255,255,255,0.3)' : 'none' }} />
            </div>
          )}
        </div>

        <div className="p-5 space-y-4">
          {/* Challenge text */}
          <motion.p
            initial={{ opacity: 0, y: 8 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.2, type: 'spring', damping: 10 }}
            className="text-white text-xl font-semibold leading-relaxed text-center py-2 min-h-24 flex items-center justify-center">
            {challenge.text}
          </motion.p>

          {/* Difficulty badge */}
          <motion.div 
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', damping: 12 }}
            className="flex justify-center">
            <motion.span 
              whileHover={{ scale: 1.1 }}
              className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 cursor-default
              ${challenge.difficulty === 'facil' ? 'bg-green-500/25 text-green-300 border border-green-500/40' :
                challenge.difficulty === 'dificil' ? 'bg-red-500/25 text-red-300 border border-red-500/40' :
                'bg-amber-500/25 text-amber-300 border border-amber-500/40'}`}>
              <motion.span
                animate={{ rotate: [0, 360] }}
                transition={{ duration: challenge.difficulty === 'dificil' ? 2 : 3, repeat: Infinity }}
                className="text-lg">
                {challenge.difficulty === 'facil' ? '🟢' : challenge.difficulty === 'dificil' ? '🔴' : '🟡'}
              </motion.span>
              {challenge.difficulty === 'facil' ? 'Fácil' : challenge.difficulty === 'dificil' ? 'Difícil' : 'Médio'}
            </motion.span>
          </motion.div>

          {/* Penalty panel */}
          {mode === 'friends' && !challenge.is_ongoing && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }} 
              animate={{ opacity: 1, x: 0 }} 
              transition={{ delay: 0.35 }}
              className="bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/30 rounded-2xl p-3 text-center">
              <p className="text-slate-400 text-xs mb-1">⚠️ Penalização se falhar</p>
              <motion.p 
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: 'spring' }}
                className="text-amber-300 font-black text-base">
                🍺 {typeof sips === 'number' ? `${sips} golo${sips > 1 ? 's' : ''}` : sips}
              </motion.p>
              {hasPenalty && (
                <motion.p 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  className="text-green-400 text-xs mt-2 font-bold">⚽ + Marca um penálti!</motion.p>
              )}
            </motion.div>
          )}

          {/* Buttons */}
          {challenge.is_ongoing && !accepted ? (
            <div className="flex gap-3 pt-1">
              <motion.button 
                whileHover={{ scale: 1.05 }} 
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                onClick={() => { setAccepted(true); onResult('accepted', challenge) }}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-2xl py-4 text-lg shadow-lg shadow-green-500/30">
                Aceito! 🤝
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.05 }} 
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                onClick={() => onResult('refused', challenge)}
                className="flex-1 bg-white/10 border border-white/20 text-white font-bold rounded-2xl py-4 hover:bg-white/15">
                Recuso
              </motion.button>
            </div>
          ) : challenge.is_ongoing && accepted ? (
            <div className="text-center space-y-3">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-emerald-500/15 border border-emerald-500/40 rounded-2xl p-3">
                <motion.p 
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
                  className="text-emerald-300 font-bold mb-1">🔁 Desafio Contínuo Ativo!</motion.p>
                <p className="text-slate-300 text-sm">{challenge.ongoing_instruction}</p>
              </motion.div>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                onClick={() => onResult('done', challenge)}
                className="w-full bg-white/10 text-white rounded-2xl py-3 font-medium border border-white/10">
                Continuar →
              </motion.button>
            </div>
          ) : (
            <div className="flex gap-3 pt-1">
              <motion.button 
                whileHover={{ scale: 1.05 }} 
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                onClick={() => onResult('success', challenge)}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-2xl py-4 text-lg flex items-center justify-center gap-2 shadow-lg shadow-green-500/30">
                <Check className="w-5 h-5" /> Consegui!
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.05 }} 
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                onClick={() => onResult('fail', challenge)}
                className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold rounded-2xl py-4 text-lg flex items-center justify-center gap-2 shadow-lg shadow-red-500/30">
                <XCircle className="w-5 h-5" /> Falhei
              </motion.button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
