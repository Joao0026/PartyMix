import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Clock } from 'lucide-react'
import { playSuccessSound, playFailSound } from '../../utils/sounds'

export default function ChallengeCard({ challenge, player, mode, penaltyType = 'sips', competitors = [], onResult, onClose }) {
  const [timeLeft,   setTimeLeft]   = useState(null)
  const [timerDone,  setTimerDone]  = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [questionVisible, setQuestionVisible] = useState(() => challenge?.category !== 'perguntas')
  const [answerVisible, setAnswerVisible] = useState(false)
  const [selectedChoice, setSelectedChoice] = useState(null)
  const [choiceFeedback, setChoiceFeedback] = useState('')

  const isFamily  = mode === 'family'
  const hasTimer  = challenge?.time_limit && challenge.time_limit > 0

  useEffect(() => {
    if (!hasTimer) return
    setTimeLeft(challenge.time_limit)
  }, [challenge])

  useEffect(() => {
    setQuestionVisible(challenge?.category !== 'perguntas')
    setAnswerVisible(false)
    setSelectedChoice(null)
    setChoiceFeedback('')
  }, [challenge])

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) { if (timeLeft === 0) { setTimerDone(true); handleResult('fail'); } return }
    const tm = setTimeout(() => setTimeLeft(t => t-1), 1000)
    return () => clearTimeout(tm)
  }, [timeLeft])

  const CATEGORY_EMOJIS = {
    telepatia:'🧠', perguntas:'📚', proibido:'🚫', caos:'💥',
    mimica:'🎭', desenho:'🎨', palavra:'💬', acao:'⚡', verdade:'❓',
    consequencia:'🎲', cultura:'📚', desporto:'⚽', musica:'🎵', cinema:'🎬',
    erotico:'🔥', romantico:'🌹', picante:'🔥', roleplay:'🎭', casal_pergunta:'💬', dados:'🎲',
  }
  const CATEGORY_COLORS = {
    telepatia:'from-cyan-600 to-blue-700', perguntas:'from-blue-600 to-indigo-700',
    proibido:'from-amber-600 to-orange-700', caos:'from-red-600 to-rose-700',
    mimica:'from-violet-600 to-purple-700', desenho:'from-pink-600 to-rose-700',
    palavra:'from-blue-600 to-cyan-700', acao:'from-orange-600 to-amber-700',
    verdade:'from-red-600 to-rose-700', consequencia:'from-slate-600 to-slate-800',
    cultura:'from-emerald-600 to-teal-700', desporto:'from-green-600 to-emerald-700',
    musica:'from-fuchsia-600 to-pink-700', cinema:'from-slate-700 to-zinc-800',
    erotico:'from-rose-700 to-pink-800', romantico:'from-rose-500 to-pink-600',
    picante:'from-red-700 to-rose-800', roleplay:'from-slate-600 to-slate-800',
    casal_pergunta:'from-violet-700 to-purple-800',
  }
  const CATEGORY_LABELS = {
    telepatia:'Sincronia', perguntas:'Sabichão', desenho:'Rabiscos', mimica:'Gestos',
    proibido:'Palavra Tabu', caos:'Caos', romantico:'Conexão', picante:'Picante',
    roleplay:'Cena', casal_pergunta:'Quanto me conheces?',
  }
  const catColor = CATEGORY_COLORS[challenge?.category] || 'from-violet-600 to-purple-700'
  const catEmoji = CATEGORY_EMOJIS[challenge?.category] || '🎴'
  const catLabel = CATEGORY_LABELS[challenge?.category] || challenge?.category || 'desafio'
  const hasChoices = Array.isArray(challenge?.choices) && challenge.choices.length > 0
  const normalizedAnswer = String(challenge?.answer || '').trim().toLowerCase()
  const selectedIsCorrect = selectedChoice !== null
    ? String(challenge.choices[selectedChoice] || '').trim().toLowerCase() === normalizedAnswer
    : false
  const questionResolved = challenge?.category !== 'perguntas' || answerVisible || selectedChoice !== null || !challenge?.answer
  const isContinuousOnly = challenge?.category === 'caos' || challenge?.is_ongoing
  const isCompetitive = ['duel','shot','team_duel','all_play'].includes(challenge?.special)
  const telepathyTheme = challenge?.category === 'telepatia'
    ? String(challenge?.text || '').replace(/^Tema:\s*/i, '').split('.')[0].trim()
    : ''

  const handleResult = (res, options = {}) => {
    if (res === 'success') playSuccessSound()
    else if (res === 'fail') playFailSound()
    setShowResult(true)
    setTimeout(() => { onResult(res, options) }, 800)
  }

  const getPenaltyText = () => {
    if (isFamily) return null // No drinking in family mode
    const sips = Math.floor(Math.random() * 5) + 1
    if (penaltyType === 'sips')    return `🍺 ${player?.name} bebe ${sips} gole${sips>1?'s':''}!`
    if (penaltyType === 'penalty') return `⚽ ${player?.name} marca um penálti!`
    // both — show generic message, actual penalty handled by parent
    return Math.random() < 0.5
      ? `🍺 ${player?.name} bebe ${sips} gole${sips>1?'s':''}!`
      : `⚽ ${player?.name} marca um penálti!`
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center p-4">
      <motion.div initial={{y:120,opacity:0}} animate={{y:0,opacity:1}} exit={{y:120,opacity:0}}
        transition={{type:'spring',damping:20}}
        className="w-full max-w-lg bg-[#0d0f1c] border border-white/[0.08] rounded-3xl overflow-hidden shadow-2xl">

        {/* Category header */}
        <div className={`bg-gradient-to-r ${catColor} px-5 py-4 flex items-center gap-3`}>
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/18 text-3xl shadow-inner">{catEmoji}</span>
          <div className="flex-1">
            <p className="text-white/70 text-xs uppercase tracking-[0.18em]">{catLabel}</p>
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
          {challenge?.category === 'perguntas' && !questionVisible ? (
            <div className={`bg-gradient-to-br ${catColor} bg-opacity-10 border border-white/[0.08] rounded-2xl p-5 min-h-28 flex flex-col items-center justify-center gap-3 text-center`}>
              <p className="text-slate-400 text-sm">A equipa adversária deve ler esta carta.</p>
              <button onClick={() => setQuestionVisible(true)} className="rounded-2xl bg-blue-600 px-5 py-3 text-white font-black">
                Mostrar pergunta
              </button>
            </div>
          ) : (
            <div className="relative overflow-hidden bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 min-h-28 flex flex-col items-center justify-center gap-4">
              <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${catColor}`} />
              <div className="absolute -right-5 -bottom-8 text-8xl opacity-[0.04]">{catEmoji}</div>
              {challenge?.category === 'telepatia' ? (
                <div className="w-full text-center">
                  <p className="text-cyan-300 text-xs font-black uppercase tracking-[0.22em] mb-2">Tema</p>
                  <p className="text-white font-black text-3xl leading-tight">{telepathyTheme || 'Tema livre'}</p>
                  <p className="text-slate-500 text-xs mt-3">Digam a palavra ao mesmo tempo.</p>
                </div>
              ) : (
                <p className="text-white font-bold text-xl text-center leading-relaxed">
                  {challenge?.text?.replace(/{player}/g, player?.name || 'Um jogador') || 'Desafio'}
                </p>
              )}
              {hasChoices && (
                <div className="grid w-full gap-2">
                  {challenge.choices.map((choice, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (isCompetitive) return
                        if (selectedChoice !== null) return
                        const isCorrect = String(choice || '').trim().toLowerCase() === normalizedAnswer
                        setSelectedChoice(idx)
                        setAnswerVisible(true)
                        setChoiceFeedback(isCorrect
                          ? 'Acertou! A passar ao próximo turno...'
                          : isFamily
                          ? 'Falhou! A passar ao próximo turno...'
                          : mode === 'friends'
                          ? 'Falhou! Bebe 2 goles.'
                          : getPenaltyText() || 'Falhou!')
                        setTimeout(() => handleResult(isCorrect ? 'success' : 'fail', { autoNext: true }), 1200)
                      }}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-all ${
                        selectedChoice === null
                          ? 'border-blue-400/20 bg-blue-500/10 text-slate-100 hover:border-blue-300/50'
                          : String(choice || '').trim().toLowerCase() === normalizedAnswer
                          ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-100'
                          : selectedChoice === idx
                          ? 'border-red-400/50 bg-red-500/20 text-red-100'
                          : 'border-white/[0.06] bg-black/10 text-slate-500'
                      }`}
                    >
                      <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-lg bg-blue-500/25 font-black text-blue-200">{String.fromCharCode(65+idx)}</span>
                      <span>{choice}</span>
                      {selectedChoice !== null && String(choice || '').trim().toLowerCase() === normalizedAnswer && <span className="ml-auto font-black text-emerald-300">✓</span>}
                      {selectedChoice === idx && !selectedIsCorrect && <span className="ml-auto font-black text-red-300">✕</span>}
                    </button>
                  ))}
                </div>
              )}
              {selectedChoice !== null && (
                <p className={`text-sm font-bold ${selectedIsCorrect ? 'text-emerald-300' : 'text-red-300'}`}>
                  {choiceFeedback}
                </p>
              )}
            </div>
          )}
          
          {/* Answer for question cards */}
          {challenge?.answer && questionVisible && !hasChoices && (
            <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
              className="bg-gradient-to-r from-emerald-500/15 to-teal-500/15 border border-emerald-500/30 rounded-2xl p-4 text-center">
              {!answerVisible ? (
                <button onClick={() => setAnswerVisible(true)} className="w-full text-emerald-300 font-black">
                  Mostrar resposta correta
                </button>
              ) : (
                <>
                  <p className="text-emerald-400 text-xs uppercase tracking-wide font-semibold mb-1">✓ Resposta Correta</p>
                  <p className="text-white font-bold text-lg">{challenge.answer}</p>
                </>
              )}
            </motion.div>
          )}

          {Array.isArray(challenge?.forbiddenWords) && challenge.forbiddenWords.length > 0 && (
            <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
              className="bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/30 rounded-2xl p-4">
              <p className="text-amber-300 text-xs uppercase tracking-wide font-semibold mb-2 text-center">🚫 Não podes dizer</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {challenge.forbiddenWords.map((word, i) => (
                  <span key={i} className="rounded-full bg-black/20 border border-amber-400/20 px-3 py-1 text-sm font-bold text-white">
                    {word}
                  </span>
                ))}
              </div>
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
            {isContinuousOnly && !showResult ? (
              <button onClick={() => handleResult('accepted')}
                className="w-full bg-orange-500/15 border border-orange-500/30 text-orange-400 rounded-2xl py-4 text-sm font-black">
                🔁 Aceitar desafio contínuo
              </button>
            ) : isCompetitive && !showResult ? (
              <div className="space-y-2">
                <p className="text-slate-400 text-center text-sm font-bold">Quem conseguiu?</p>
                <div className="grid gap-2">
                  {(competitors.length ? competitors : [{label:'Conseguiu', result:'success'}]).map((opt, idx)=>(
                    <button key={idx} onClick={() => handleResult('success', {...opt, autoNext:true})}
                      className="w-full rounded-2xl border border-emerald-500/30 bg-emerald-500/15 py-3 text-emerald-300 font-black">
                      ✅ {opt.label}
                    </button>
                  ))}
                  <button onClick={() => handleResult('fail', {autoNext:true})}
                    className="w-full rounded-2xl border border-red-500/30 bg-red-500/15 py-3 text-red-300 font-black">
                    ✕ Ninguém conseguiu
                  </button>
                </div>
              </div>
            ) : !showResult && hasChoices && challenge?.category === 'perguntas' ? (
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-center text-sm font-bold text-slate-400">
                {selectedChoice === null ? 'Escolhe uma alínea para responder.' : 'A fechar a carta...'}
              </div>
            ) : !showResult ? (
              <motion.div exit={{opacity:0,scale:0.95}} className="flex gap-3">
                <motion.button whileTap={{scale:0.95}} onClick={() => handleResult('success')}
                  disabled={!questionResolved}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black rounded-2xl py-4 text-xl">
                  ✅ Conseguiu!
                </motion.button>
                <motion.button whileTap={{scale:0.95}} onClick={() => handleResult('fail')}
                  disabled={!questionResolved}
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
          {challenge?.is_ongoing && !showResult && !isContinuousOnly && (
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
