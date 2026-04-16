import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Minus } from 'lucide-react'
import { shuffle } from '../utils/game'

const WORD_PAIRS = [
  ['Futebol','Rugby'],['Pizza','Focaccia'],['Gato','Leopardo'],['Praia','Piscina'],
  ['Café','Chá'],['Carro','Mota'],['Sol','Lua'],['Médico','Enfermeiro'],
  ['Leão','Tigre'],['Cinema','Teatro'],['Guitarra','Violino'],['Crocodilo','Lagarto'],
  ['Avião','Helicóptero'],['Coca-Cola','Pepsi'],['McDonald\'s','Burger King'],
  ['Instagram','TikTok'],['Neve','Granizo'],['Pistola','Espingarda'],
]

export default function MisterWhiteGame() {
  const navigate = useNavigate()
  const [step, setStep] = useState('setup')
  const [players, setPlayers] = useState(['','',''])
  const [numUndercover, setNumUndercover] = useState(1)
  const [numMW, setNumMW] = useState(1)
  const [roles, setRoles] = useState([])
  const [revealIdx, setRevealIdx] = useState(0)
  const [showWord, setShowWord] = useState(false)
  const [activeVoters, setActiveVoters] = useState([])
  const [votes, setVotes] = useState({})
  const [mwGuess, setMwGuess] = useState('')
  const [eliminated, setEliminated] = useState([])
  const [civilWord, setCivilWord] = useState('')
  const [mwEliminatedIdx, setMwEliminatedIdx] = useState(null)

  const validPlayers = players.filter(p => p.trim())
  const maxSpecials = Math.max(0, validPlayers.length - 2)

  const startGame = () => {
    const pair = WORD_PAIRS[Math.floor(Math.random() * WORD_PAIRS.length)]
    setCivilWord(pair[0])
    const shuffled = shuffle(validPlayers.map((name, i) => ({ name, originalIdx: i })))
    const assigned = shuffled.map((p, i) => {
      let role = 'civil', word = pair[0]
      if (i < numMW) { role = 'mister_white'; word = '' }
      else if (i < numMW + numUndercover) { role = 'undercover'; word = pair[1] }
      return { ...p, role, word }
    })
    setRoles(assigned)
    setActiveVoters(assigned.map((_, i) => i))
    setRevealIdx(0)
    setShowWord(false)
    setStep('reveal')
  }

  const finishReveal = () => {
    if (revealIdx < roles.length - 1) { setRevealIdx(r => r + 1); setShowWord(false) }
    else setStep('playing')
  }

  const submitVote = (targetIdx) => setVotes(v => ({ ...v, [revealIdx]: targetIdx }))

  const eliminatePlayer = () => {
    const counts = {}
    Object.values(votes).forEach(v => { counts[v] = (counts[v] || 0) + 1 })
    const max = Math.max(...Object.values(counts))
    const toElim = parseInt(Object.keys(counts).find(k => counts[k] === max))
    if (roles[toElim]?.role === 'mister_white') {
      setMwEliminatedIdx(toElim)
      setStep('mw_guess')
    } else {
      setEliminated(e => [...e, toElim])
      setActiveVoters(v => v.filter(i => i !== toElim))
      const remaining = activeVoters.filter(i => i !== toElim)
      const mwAlive = remaining.some(i => roles[i]?.role === 'mister_white')
      const civils = remaining.filter(i => roles[i]?.role === 'civil').length
      if (!mwAlive || civils <= 1) setStep('result')
      else { setVotes({}); setRevealIdx(0); setStep('playing') }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/')} className="text-slate-400 text-sm">← Sair</button>
          <h1 className="text-white font-bold text-xl">👁️ Mister White</h1>
        </div>
        <AnimatePresence mode="wait">
          {step === 'setup' && (
            <motion.div key="setup" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <h3 className="text-white font-semibold mb-3">Jogadores</h3>
                {players.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <input value={p} onChange={e => setPlayers(ps => ps.map((x,j) => j===i ? e.target.value : x))}
                      placeholder={`Jogador ${i+1}`}
                      className="flex-1 bg-white/5 text-white rounded-xl px-3 py-2.5 outline-none border border-white/10 text-sm" />
                    {players.length > 3 && <button onClick={() => setPlayers(ps => ps.filter((_,j) => j!==i))} className="text-slate-500 hover:text-red-400"><Minus className="w-4 h-4" /></button>}
                  </div>
                ))}
                <button onClick={() => setPlayers(p => [...p, ''])} className="text-slate-400 hover:text-white text-sm flex items-center gap-1 mt-1">
                  <Plus className="w-3 h-3" /> Adicionar
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[{ label: 'Undercoveres', val: numUndercover, set: setNumUndercover }, { label: 'Mister Whites', val: numMW, set: setNumMW }].map(({ label, val, set }) => (
                  <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                    <p className="text-slate-400 text-xs mb-2">{label}</p>
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => set(v => Math.max(0, v-1))} className="text-slate-400 hover:text-white"><Minus className="w-4 h-4" /></button>
                      <span className="text-white font-bold text-xl">{val}</span>
                      <button onClick={() => set(v => v + numMW + numUndercover < maxSpecials ? v+1 : v)} className="text-slate-400 hover:text-white"><Plus className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
              <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.98}} onClick={startGame}
                disabled={validPlayers.length < 3}
                className="w-full bg-gradient-to-r from-slate-500 to-slate-600 text-white font-bold rounded-2xl py-4 disabled:opacity-50">
                Começar Jogo
              </motion.button>
            </motion.div>
          )}
          {step === 'reveal' && roles[revealIdx] && (
            <motion.div key={`reveal-${revealIdx}`} initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} exit={{opacity:0}} className="text-center space-y-6">
              <h2 className="text-white font-bold text-xl">Vez de {roles[revealIdx].name}</h2>
              {!showWord ? (
                <motion.button whileTap={{scale:0.95}} onClick={() => setShowWord(true)}
                  className="w-full h-40 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center text-slate-400 text-lg hover:bg-white/10 transition-all">
                  👆 Toca para ver a tua palavra
                </motion.button>
              ) : (
                <motion.div initial={{scale:0}} animate={{scale:1}} className="w-full h-40 bg-gradient-to-br from-slate-700 to-slate-800 border border-white/20 rounded-3xl flex flex-col items-center justify-center gap-2">
                  <span className="text-slate-400 text-sm">{roles[revealIdx].role === 'civil' ? 'Civil' : roles[revealIdx].role === 'undercover' ? 'Undercover' : 'Mister White'}</span>
                  <span className="text-white font-black text-3xl">{roles[revealIdx].word || 'Sem palavra'}</span>
                </motion.div>
              )}
              {showWord && (
                <button onClick={finishReveal} className="w-full bg-gradient-to-r from-slate-500 to-slate-600 text-white font-bold rounded-2xl py-4">
                  {revealIdx < roles.length - 1 ? 'Próximo →' : 'Começar Ronda →'}
                </button>
              )}
            </motion.div>
          )}
          {step === 'playing' && (
            <motion.div key="playing" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                <p className="text-slate-300">Cada jogador diz uma pista sobre a sua palavra. Depois votam!</p>
              </div>
              <div className="space-y-2">
                {activeVoters.map(i => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs font-bold">{roles[i]?.name[0]}</div>
                    <span className="text-white">{roles[i]?.name}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => { setRevealIdx(0); setVotes({}); setStep('vote') }}
                className="w-full bg-gradient-to-r from-red-600 to-rose-700 text-white font-bold rounded-2xl py-4">
                Votar na Eliminação
              </button>
            </motion.div>
          )}
          {step === 'vote' && (
            <motion.div key="vote" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-4">
              <h3 className="text-white font-semibold text-center">Vote em quem é suspeito</h3>
              {activeVoters.filter(i => i !== revealIdx).map(target => (
                <button key={target} onClick={() => submitVote(target)}
                  className={`w-full p-4 rounded-2xl border transition-all text-white font-medium
                    ${votes[revealIdx] === target ? 'bg-red-600/30 border-red-500' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                  {roles[target]?.name}
                </button>
              ))}
              {revealIdx < activeVoters.length - 1 ? (
                <button onClick={() => setRevealIdx(r => r + 1)} className="w-full bg-white/10 text-white rounded-2xl py-3">Próximo votante →</button>
              ) : (
                <button onClick={eliminatePlayer} className="w-full bg-gradient-to-r from-red-600 to-rose-700 text-white font-bold rounded-2xl py-4">Eliminar Jogador</button>
              )}
            </motion.div>
          )}
          {step === 'mw_guess' && (
            <motion.div key="mw_guess" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-4 text-center">
              <div className="text-5xl mb-2">👁️</div>
              <h3 className="text-white font-bold text-xl">{roles[mwEliminatedIdx]?.name} é o Mister White!</h3>
              <p className="text-slate-400">Última hipótese — adivinha a palavra civil!</p>
              <input value={mwGuess} onChange={e => setMwGuess(e.target.value)} placeholder="A palavra civil é..."
                className="w-full bg-white/5 text-white rounded-2xl px-4 py-4 outline-none border border-white/10 text-center text-lg" />
              <button onClick={() => setStep('result')} className="w-full bg-gradient-to-r from-slate-500 to-slate-700 text-white font-bold rounded-2xl py-4">Revelar</button>
            </motion.div>
          )}
          {step === 'result' && (
            <motion.div key="result" initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} exit={{opacity:0}} className="text-center space-y-5">
              {mwGuess.toLowerCase().trim() === civilWord.toLowerCase().trim() && mwEliminatedIdx !== null ? (
                <div><div className="text-5xl mb-3">🕵️</div><h2 className="text-white font-black text-2xl">Mister White Venceu!</h2><p className="text-slate-400">Adivinhou: {civilWord}</p></div>
              ) : (
                <div><div className="text-5xl mb-3">✅</div><h2 className="text-white font-black text-2xl">Os Civis Venceram!</h2></div>
              )}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left">
                <p className="text-slate-400 text-xs mb-3">Palavras: Civil = <strong className="text-white">{civilWord}</strong></p>
                {roles.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 py-1 border-b border-white/5 last:border-0">
                    <span className="text-white text-sm">{r.name}</span>
                    <span className={`text-xs ml-auto px-2 py-0.5 rounded-full ${r.role==='civil'?'bg-green-600/30 text-green-400':r.role==='undercover'?'bg-blue-600/30 text-blue-400':'bg-red-600/30 text-red-400'}`}>{r.role}</span>
                    <span className="text-slate-400 text-xs">{r.word || '—'}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setStep('setup'); setRoles([]); setVotes({}); setEliminated([]); setMwGuess(''); setMwEliminatedIdx(null) }}
                  className="flex-1 bg-white/10 text-white rounded-2xl py-3 font-medium">Jogar Novamente</button>
                <button onClick={() => navigate('/')} className="flex-1 bg-white/10 text-white rounded-2xl py-3 font-medium">Sair</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
