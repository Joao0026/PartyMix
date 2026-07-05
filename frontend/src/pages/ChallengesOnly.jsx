import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Trophy, RotateCcw } from 'lucide-react'
import { loadGame, CATEGORY_CONFIG } from '../utils/game'
import { api } from '../utils/api'
import { challengePackParams } from '../utils/packParams'

// Fallback challenges per category if API fails
const FALLBACK = {
  mimica:       ['Imita um robot a dançar','Imita alguém a conduzir com raiva','Imita um professor chato','Imita alguém a montar um IKEA','Imita um político a responder perguntas'],
  desenho:      ['Desenha um unicórnio com fato','Desenha um dragão de escritório','Desenha o teu chefe imaginário','Desenha Portugal do espaço','Desenha o teu animal espiritual'],
  palavra:      ['Di 5 países que começam por A em 10 segundos','Diz 5 frutas exóticas','Diz 5 cidades portuguesas em 5 segundos','Diz 5 profissões estranhas','Diz 5 instrumentos musicais'],
  acao:         ['Faz 15 agachamentos','Mantém equilíbrio num pé 15 segundos','Faz a moon walk','Faz a pose de super-herói favorita','Faz beatbox 15 segundos'],
  verdade:      ['Qual foi a tua maior mentira?','Qual é o teu maior medo?','O que nunca contaste a ninguém aqui?','Qual foi o teu pior trabalho de grupo?','O que farias com 1 milhão?'],
  consequencia: ['Fala com sotaque britânico até ao próximo turno','Responde só com perguntas durante 2 turnos','Termina cada frase com "sabe o que é" durante 1 turno','Não podes usar o telemóvel durante 3 turnos','Fala em voz de pato até ao próximo turno'],
  cultura:      ['Nomeia 5 capitais europeias','Em que ano foi o 25 de Abril?','Quem escreveu Os Lusíadas?','Qual é o maior país do mundo?','Nomeia 3 países de língua portuguesa'],
  desporto:     ['Em que ano ganhou Portugal o Euro?','Quantos jogadores tem um time de futebol?','Nomeia 5 atletas olímpicos portugueses','Qual é o desporto mais praticado no mundo?','Em que país se jogou o primeiro Mundial?'],
  musica:       ['Canta 10 segundos de uma música portuguesa','Nomeia 5 bandas portuguesas','Qual é o instrumento mais antigo do mundo?','Quem ganhou o Eurovision 2017 por Portugal?','Nomeia 3 géneros musicais'],
  cinema:       ['Nomeia 5 filmes de animação','Quem é o realizador de Interstellar?','Qual foi o primeiro filme da Disney?','Nomeia 3 actores portugueses','Qual é o filme mais visto da história?'],
  erotico:      ['Diz 3 elogios específicos ao parceiro','Beija o parceiro no sítio favorito dele','Sussurra algo ousado ao ouvido','Remove uma peça de roupa do parceiro','Olha nos olhos 30 segundos sem falar'],
}

const CATEGORY_EMOJIS = {
  mimica:'🎭', desenho:'🎨', palavra:'💬', acao:'⚡', verdade:'❓',
  consequencia:'🎲', cultura:'📚', desporto:'⚽', musica:'🎵', cinema:'🎬', erotico:'🔥',
}

function useSound() {
  const ctx = typeof window !== 'undefined' ? new (window.AudioContext || window.webkitAudioContext)() : null
  const play = (type) => {
    if (!ctx) return
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    if (type === 'success') { o.frequency.setValueAtTime(520, ctx.currentTime); o.frequency.setValueAtTime(660, ctx.currentTime+0.1); g.gain.setValueAtTime(0.2, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.4) }
    if (type === 'fail')    { o.frequency.setValueAtTime(200, ctx.currentTime); o.frequency.setValueAtTime(150, ctx.currentTime+0.2); g.gain.setValueAtTime(0.2, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.5) }
    if (type === 'next')    { o.frequency.setValueAtTime(440, ctx.currentTime); g.gain.setValueAtTime(0.1, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.2) }
    o.start(ctx.currentTime); o.stop(ctx.currentTime+0.6)
  }
  return { play }
}

export default function ChallengesOnly() {
  const navigate = useNavigate()
  const game     = loadGame()
  const players  = game?.players   || []
  const cats     = game?.selectedCategories || ['mimica','verdade','acao']
  const isFamily = game?.mode === 'family'
  const penaltyType = game?.penaltyType || 'sips'
  const winningScore = game?.maxPoints || game?.winningScore || 21

  const [currentPlayer, setCurrentPlayer] = useState(0)
  const [round,         setRound]         = useState(1)
  const [challenge,     setChallenge]     = useState(null)
  const [loading,       setLoading]       = useState(false)
  const [result,        setResult]        = useState(null) // 'success'|'fail'|null
  const [penaltyAnim,   setPenaltyAnim]   = useState(null)
  const [scores,        setScores]        = useState(() => players.map(() => 0))
  const [fails,         setFails]         = useState(() => players.map(() => 0))
  const { play } = useSound()

  useEffect(() => { if (!game) navigate('/') }, [])
  useEffect(() => { loadChallenge() }, [currentPlayer])

  const loadChallenge = async () => {
    setLoading(true); setResult(null); setChallenge(null)
    const cat = cats[Math.floor(Math.random() * cats.length)]
    try {
      const c = await api.getRandomChallenge({
        category: cat,
        mode_type: game?.mode || 'friends',
        ...challengePackParams(game?.contentPack, game?.includeCommunity !== false),
      })
      if (c && !c.error) { setChallenge(c); setLoading(false); return }
    } catch {}
    // Fallback
    const pool = FALLBACK[cat] || FALLBACK.mimica
    setChallenge({ text: pool[Math.floor(Math.random()*pool.length)], category: cat, time_limit: 60, sips_penalty: 2 })
    setLoading(false)
  }

  const showPenalty = (playerName) => {
    if (isFamily) return // No drinking in family mode
    let anim
    const sips = Math.floor(Math.random() * 5) + 1
    if (penaltyType === 'sips')    anim = { name:playerName, type:'sips',    sips }
    else if (penaltyType === 'penalty') anim = { name:playerName, type:'penalty' }
    else anim = Math.random() < 0.5
      ? { name:playerName, type:'sips',    sips }
      : { name:playerName, type:'penalty' }
    setPenaltyAnim(anim)
    setTimeout(() => setPenaltyAnim(null), 2800)
  }

  const handleResult = (res) => {
    setResult(res)
    play(res === 'success' ? 'success' : 'fail')
    if (res === 'success') {
      const newScores = scores.map((sc,i) => i === currentPlayer ? sc+1 : sc)
      setScores(newScores)
      // Check if anyone reached winning score
      const winner = newScores.findIndex(s => s >= winningScore)
      if (winner !== -1) {
        // Redirect to victory screen after delay
        setTimeout(() => {
          navigate('/VictoryScreen', {
            state: {
              mode: game?.mode || 'friends',
              players,
              scores: newScores,
              fails,
              winner
            }
          })
        }, 1500)
      }
    } else {
      const newFails = fails.map((f,i) => i === currentPlayer ? f+1 : f)
      setFails(newFails)
      showPenalty(players[currentPlayer]?.name)
    }
  }

  const nextPlayer = () => {
    play('next')
    const next = (currentPlayer + 1) % players.length
    if (next === 0) setRound(r => r+1)
    setCurrentPlayer(next)
    setResult(null)
  }

  if (!players.length) return null

  const player  = players[currentPlayer]
  const maxScore = Math.max(...scores)
  const cat      = challenge?.category || cats[0]

  return (
    <div className="min-h-screen bg-[#080b14] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white p-1">
            <ChevronLeft className="w-5 h-5"/>
          </button>
          <div className="flex items-center gap-2">
            <Trophy className="text-amber-400 w-4 h-4"/>
            <span className="text-white font-bold text-sm">Ronda {round}</span>
          </div>
          {/* Score chips */}
          <div className="flex gap-2">
            {players.map((p,i) => (
              <div key={i} className="text-center">
                <p className={`text-sm font-black ${i===currentPlayer?'text-amber-400':'text-white'}`}>{scores[i]}</p>
                <p className="text-slate-600 text-xs truncate max-w-10">{p.name.split(' ')[0]}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Player order strip */}
      <div className="px-4 py-2 max-w-lg mx-auto w-full">
        <div className="flex gap-1.5 overflow-x-auto" style={{scrollbarWidth:'none'}}>
          {players.map((p,i) => (
            <div key={i} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border flex-shrink-0 transition-all ${i===currentPlayer?'bg-violet-600/20 border-violet-500/50':'bg-white/[0.03] border-white/[0.06]'}`}>
              <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${p.color} flex items-center justify-center text-white text-xs font-black`}>{p.name[0]}</div>
              <span className={`text-xs font-semibold ${i===currentPlayer?'text-white':'text-slate-500'}`}>{p.name.split(' ')[0]}</span>
              {i===currentPlayer && <motion.div animate={{scale:[1,1.4,1]}} transition={{repeat:Infinity,duration:0.9}} className="w-1.5 h-1.5 rounded-full bg-violet-400"/>}
            </div>
          ))}
        </div>
      </div>

      {/* Challenge card */}
      <div className="flex-1 flex flex-col items-center px-4 pb-6 gap-4 max-w-lg mx-auto w-full">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              className="w-full h-52 bg-white/[0.04] border border-white/[0.07] rounded-3xl flex items-center justify-center">
              <motion.div animate={{rotate:360}} transition={{repeat:Infinity,duration:1,ease:'linear'}}
                className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full"/>
            </motion.div>
          ) : challenge ? (
            <motion.div key={challenge.text} initial={{opacity:0,y:16,scale:0.96}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-12}}
              className="w-full">
              {/* Category badge */}
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${result==='success'?'bg-green-500/20':result==='fail'?'bg-red-500/20':'bg-violet-600/20'}`}>
                  {CATEGORY_EMOJIS[cat] || '🎴'}
                </div>
                <div>
                  <p className="text-slate-500 text-xs capitalize">{cat}</p>
                  <p className="text-white font-bold">{player?.name}</p>
                </div>
                {challenge.time_limit && (
                  <div className="ml-auto bg-white/[0.05] rounded-xl px-2.5 py-1">
                    <p className="text-slate-400 text-xs">⏱ {challenge.time_limit}s</p>
                  </div>
                )}
              </div>

              {/* Challenge text */}
              <motion.div
                animate={result==='success'?{borderColor:'rgba(34,197,94,0.4)',background:'rgba(34,197,94,0.05)'}
                  :result==='fail'?{borderColor:'rgba(239,68,68,0.4)',background:'rgba(239,68,68,0.05)'}
                  :{borderColor:'rgba(255,255,255,0.07)',background:'rgba(255,255,255,0.04)'}}
                className="w-full rounded-3xl p-6 border min-h-40 flex items-center justify-center">
                <p className="text-white font-bold text-xl text-center leading-relaxed">{challenge.text}</p>
              </motion.div>

              {/* Result indicator */}
              <AnimatePresence>
                {result && (
                  <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}
                    className={`mt-3 rounded-2xl p-4 text-center ${result==='success'?'bg-green-500/10 border border-green-500/30':'bg-red-500/10 border border-red-500/30'}`}>
                    <p className={`font-black text-xl ${result==='success'?'text-green-400':'text-red-400'}`}>
                      {result==='success' ? '🏆 Conseguiu!' : '💀 Falhou!'}
                    </p>
                    {result==='fail' && !isFamily && (
                      <p className="text-amber-400 text-sm mt-1">
                        {penaltyType==='sips' ? `🍺 ${player?.name} bebe ${challenge.sips_penalty||2} goles!`
                          : penaltyType==='penalty' ? `⚽ ${player?.name} marca penálti!`
                          : '🎲 Penalização a sortear...'}
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action buttons */}
              <div className="mt-4 space-y-3">
                {!result ? (
                  <div className="flex gap-3">
                    <motion.button whileTap={{scale:0.95}} onClick={()=>handleResult('success')}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black rounded-2xl py-4 text-lg">
                      ✅ Conseguiu!
                    </motion.button>
                    <motion.button whileTap={{scale:0.95}} onClick={()=>handleResult('fail')}
                      className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 text-white font-black rounded-2xl py-4 text-lg">
                      ❌ Falhou!
                    </motion.button>
                  </div>
                ) : (
                  <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.97}} onClick={nextPlayer}
                    className="w-full bg-gradient-to-r from-violet-600 to-purple-700 text-white font-bold rounded-2xl py-4 text-lg">
                    {currentPlayer===players.length-1 ? `Próxima Ronda (R${round+1}) →` : `${players[(currentPlayer+1)%players.length]?.name} →`}
                  </motion.button>
                )}
                <button onClick={loadChallenge} className="w-full bg-white/[0.04] border border-white/[0.07] text-slate-400 rounded-2xl py-3 text-sm flex items-center justify-center gap-2">
                  <RotateCcw className="w-4 h-4"/> Outro desafio
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Penalty animation overlay */}
      <AnimatePresence>
        {penaltyAnim && (
          <motion.div key="pen" initial={{opacity:0,scale:0.6,y:40}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.6,y:-40}}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className={`backdrop-blur-sm rounded-3xl px-8 py-6 text-center shadow-2xl ${penaltyAnim.type==='penalty'?'bg-emerald-500/90':'bg-amber-500/90'}`}>
              <div className="text-5xl mb-2">{penaltyAnim.type==='penalty'?'⚽':'🍺'}</div>
              <div className="text-black font-black text-2xl">{penaltyAnim.name}</div>
              <div className="text-black/80 font-bold text-lg">
                {penaltyAnim.type==='penalty' ? 'marca um penálti!' : `bebe ${penaltyAnim.sips} gole${penaltyAnim.sips>1?'s':''}!`}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
