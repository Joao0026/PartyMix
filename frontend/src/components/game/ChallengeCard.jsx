import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Clock } from 'lucide-react'
import { playSuccessSound, playFailSound } from '../../utils/sounds'

export default function ChallengeCard({ challenge, player, mode, penaltyType = 'sips', onResult, onClose }) {
  const [timeLeft,   setTimeLeft]   = useState(null)
  const [timerDone,  setTimerDone]  = useState(false)
  const [showResult, setShowResult] = useState(false)

  const isFamily  = mode === 'family'
  const hasTimer  = challenge?.time_limit && challenge.time_limit > 0

  useEffect(() => {
    if (!hasTimer) return
    setTimeLeft(challenge.time_limit)
  }, [challenge])

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) { if (timeLeft === 0) { setTimerDone(true); handleResult('fail'); } return }
    const tm = setTimeout(() => setTimeLeft(t => t-1), 1000)
    return () => clearTimeout(tm)
  }, [timeLeft])

  const CATEGORY_EMOJIS = {
    mimica:'🎭', desenho:'🎨', palavra:'💬', acao:'⚡', verdade:'❓',
    consequencia:'🎲', cultura:'📚', desporto:'⚽', musica:'🎵', cinema:'🎬',
    erotico:'🔥', casal_pergunta:'💬', dados:'🎲',
  }
  const CATEGORY_COLORS = {
    mimica:'from-violet-600 to-purple-700', desenho:'from-pink-600 to-rose-700',
    palavra:'from-blue-600 to-cyan-700', acao:'from-orange-600 to-amber-700',
    verdade:'from-red-600 to-rose-700', consequencia:'from-slate-600 to-slate-800',
    cultura:'from-emerald-600 to-teal-700', desporto:'from-green-600 to-emerald-700',
    musica:'from-fuchsia-600 to-pink-700', cinema:'from-slate-700 to-zinc-800',
    erotico:'from-rose-700 to-pink-800', casal_pergunta:'from-violet-700 to-purple-800',
  }

  const catColor = CATEGORY_COLORS[challenge?.category] || 'from-violet-600 to-purple-700'
  const catEmoji = CATEGORY_EMOJIS[challenge?.category] || '🎴'

  const handleResult = (res) => {
    if (res === 'success') playSuccessSound()
    else if (res === 'fail') playFailSound()
    setShowResult(true)
    setTimeout(() => { onResult(res) }, 800)
  }

  const getPenaltyText = () => {
    if (isFamily) return null // No drinking in family mode
    const sips = Math.floor(Math.random() * 5) + 1
    if (penaltyType === 'sips')    return `🍺 ${player?.name} bebe ${sips} golo${sips>1?'s':''}!`
    if (penaltyType === 'penalty') return `⚽ ${player?.name} marca um penálti!`
    // both — show generic message, actual penalty handled by parent
    return Math.random() < 0.5
      ? `🍺 ${player?.name} bebe ${sips} golo${sips>1?'s':''}!`
      : `⚽ ${player?.name} marca um penálti!`
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center p-4">
      <motion.div initial={{y:120,opacity:0}} animate={{y:0,opacity:1}} exit={{y:120,opacity:0}}
        transition={{type:'spring',damping:20}}
        className="w-full max-w-lg bg-[#0d0f1c] border border-white/[0.08] rounded-3xl overflow-hidden shadow-2xl">

        {/* Category header */}
        <div className={`bg-gradient-to-r ${catColor} px-5 py-4 flex items-center gap-3`}>
          <span className="text-3xl">{catEmoji}</span>
          <div className="flex-1">
            <p className="text-white/70 text-xs capitalize">{challenge?.category || 'desafio'}</p>
            <p className="text-white font-black text-lg">{player?.name}</p>
          </div>
          {/* Timer */}
          {hasTimer && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${timerDone?'bg-red-500/30':'bg-black/20'}`}>
              <Clock className="w-3.5 h-3.5 text-white/70"/>
              <span className={`text-sm font-black ${timerDone?'text-red-300':'text-white'}`}>
                {timeLeft !== null ? timeLeft : challenge.time_limit}s
              </span>
            </div>
          )}
          <button onClick={onClose} className="text-white/50 hover:text-white w-8 h-8 flex items-center justify-center">
            <X className="w-5 h-5"/>
          </button>
        </div>

        {/* Timer bar */}
        {hasTimer && timeLeft !== null && (
          <div className="h-1 bg-white/[0.08]">
            <motion.div
              className={`h-full ${timeLeft<=5?'bg-red-500':'bg-white/40'}`}
              animate={{width:`${(timeLeft/challenge.time_limit)*100}%`}}
              transition={{duration:1,ease:'linear'}}/>
          </div>
        )}

        <div className="p-5 space-y-4">
          {/* Challenge text */}
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-5 min-h-28 flex items-center justify-center">
            <p className="text-white font-bold text-xl text-center leading-relaxed">
              {challenge?.text?.replace(/{player}/g, player?.name || 'Um jogador') || 'Desafio'}
            </p>
          </div>
          
          {/* Family mode answer */}
          {isFamily && challenge?.answer && (
            <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
              className="bg-gradient-to-r from-emerald-500/15 to-teal-500/15 border border-emerald-500/30 rounded-2xl p-4 text-center">
              <p className="text-emerald-400 text-xs uppercase tracking-wide font-semibold mb-1">✓ Resposta Correta</p>
              <p className="text-white font-bold text-lg">{challenge.answer}</p>
            </motion.div>
          )}

          {/* Ongoing indicator */}
          {challenge?.is_ongoing && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 text-center">
              <p className="text-orange-400 text-sm">🔁 Contínuo durante {challenge.ongoing_rounds} turno{challenge.ongoing_rounds>1?'s':''}</p>
              {challenge.ongoing_instruction && <p className="text-orange-300/70 text-xs mt-0.5">{challenge.ongoing_instruction}</p>}
            </div>
          )}

          {/* Result buttons */}
          <AnimatePresence>
            {!showResult ? (
              <motion.div exit={{opacity:0,scale:0.95}} className="flex gap-3">
                <motion.button whileTap={{scale:0.95}} onClick={() => handleResult('success')}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black rounded-2xl py-4 text-xl">
                  ✅ Conseguiu!
                </motion.button>
                <motion.button whileTap={{scale:0.95}} onClick={() => handleResult('fail')}
                  className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 text-white font-black rounded-2xl py-4 text-xl">
                  ❌ Falhou!
                </motion.button>
              </motion.div>
            ) : (
              <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}}
                className="text-center py-4 space-y-2">
                <p className="text-slate-400 text-sm">A registar resultado...</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Ongoing accept button */}
          {challenge?.is_ongoing && !showResult && (
            <button onClick={() => handleResult('accepted')}
              className="w-full bg-orange-500/15 border border-orange-500/30 text-orange-400 rounded-2xl py-3 text-sm font-bold">
              🔁 Aceitar Desafio Contínuo
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
