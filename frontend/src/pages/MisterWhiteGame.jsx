import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Minus, Eye, EyeOff, Users } from 'lucide-react'
import BackButton from '../components/layout/BackButton'
import PageShell from '../components/layout/PageShell'
import { shuffle } from '../utils/game'
import { api } from '../utils/api'
import {
  WORD_PACKS,
  MW_COLORS,
  mergeCommunityPairs,
  pickWordPair,
} from '../utils/misterWhiteShared'

const COLORS = MW_COLORS

export default function MisterWhiteGame() {
  const navigate = useNavigate()
  const [communityPairs, setCommunityPairs] = useState([])
  const wordPacks = useMemo(() => mergeCommunityPairs(WORD_PACKS, communityPairs), [communityPairs])

  useEffect(() => {
    api.getMisterPairs().then((d) => {
      if (Array.isArray(d?.pairs)) setCommunityPairs(d.pairs)
    }).catch(() => {})
  }, [])
  const [step, setStep] = useState('setup')
  const [playerNames, setPlayerNames] = useState(['','','',''])
  const [numUndercover, setNumUndercover] = useState(1)
  const [numMW, setNumMW] = useState(1)
  const [wordPack, setWordPack] = useState('geral')
  const [difficulty, setDifficulty] = useState('normal')
  const [discussionSeconds, setDiscussionSeconds] = useState(90)

  // Game state
  const [roles, setRoles] = useState([])           // [{name, color, role, word, origIdx}] — in original player order
  const [civilWord, setCivilWord] = useState('')
  const [undercoverWord, setUndercoverWord] = useState('')
  const [revealCursor, setRevealCursor] = useState(0) // tracks which player is next to reveal
  const [showRole, setShowRole] = useState(false)
  const [eliminated, setEliminated] = useState([])
  const [votes, setVotes] = useState({})           // {candidateIdx: count}
  const [voteCandidate, setVoteCandidate] = useState(null) // currently selected target
  const [confirmed, setConfirmed] = useState(false)
  const [mwGuess, setMwGuess] = useState('')
  const [mwEliminatedIdx, setMwEliminatedIdx] = useState(null)
  const [gameResult, setGameResult] = useState(null)
  const [roundNum, setRoundNum] = useState(1)
  const [timeLeft, setTimeLeft] = useState(discussionSeconds)

  const valid = playerNames.filter(n => n.trim())
  const maxSpec = Math.max(0, valid.length - 2)

  const startGame = () => {
    const pair = pickWordPair(wordPack, difficulty, wordPacks)
    setCivilWord(pair.civil); setUndercoverWord(pair.undercover)
    // Assign roles randomly but KEEP original player order for reveals/turns
    const indices = Array.from({ length: valid.length }, (_, i) => i)
    const shuffledIdxs = shuffle([...indices])
    // Assign MW and undercover roles to shuffled positions
    const roleMap = {}
    shuffledIdxs.slice(0, numMW).forEach(i => { roleMap[i] = { role: 'mister_white', word: '' } })
    shuffledIdxs.slice(numMW, numMW + numUndercover).forEach(i => { roleMap[i] = { role: 'undercover', word: pair.undercover } })
    shuffledIdxs.slice(numMW + numUndercover).forEach(i => { roleMap[i] = { role: 'civil', word: pair.civil } })
    // Build roles array in ORIGINAL order
    const assigned = valid.map((name, i) => ({
      name, origIdx: i,
      color: COLORS[i % COLORS.length],
      ...roleMap[i]
    }))
    setRoles(assigned)
    setRevealCursor(Math.floor(Math.random() * valid.length))
    setShowRole(false)
    setEliminated([]); setVotes({}); setVoteCandidate(null); setConfirmed(false)
    setMwGuess(''); setMwEliminatedIdx(null); setGameResult(null); setRoundNum(1)
    setTimeLeft(discussionSeconds)
    setStep('reveal')
  }

  const activeIndices = roles.map((_, i) => i).filter(i => !eliminated.includes(i))

  // Advance revealCursor wrapping only through active players in original order
  const nextReveal = () => {
    // Find next in original order after current reveal
    const next = revealCursor + 1
    if (next >= roles.length) { setRevealCursor(0); setShowRole(false); setStep('playing'); return }
    setRevealCursor(next); setShowRole(false)
  }

  const startVoting = () => {
    setVoteCandidate(null); setConfirmed(false); setVotes({}); setStep('vote')
  }

  useEffect(() => {
    if (step !== 'playing') return
    setTimeLeft(discussionSeconds)
  }, [step, roundNum, discussionSeconds])

  useEffect(() => {
    if (step !== 'playing' || timeLeft <= 0) return
    const timer = setTimeout(() => setTimeLeft(t => Math.max(0, t - 1)), 1000)
    return () => clearTimeout(timer)
  }, [step, timeLeft])

  const selectCandidate = (idx) => { setVoteCandidate(idx); setConfirmed(false) }

  const confirmElimination = () => {
    if (voteCandidate === null) return
    const elim = voteCandidate
    const newElim = [...eliminated, elim]
    setEliminated(newElim)
    const role = roles[elim]
    if (role.role === 'mister_white') {
      setMwEliminatedIdx(elim)
      // Check if game should end or continue
      const remaining = roles.filter((_, i) => !newElim.includes(i))
      const undercoversLeft = remaining.filter(r => r.role === 'undercover').length
      if (undercoversLeft === 0) { setStep('mw_guess'); return }
      // MW caught but undercoveres remain — MW gets to guess, then game continues
      setStep('mw_guess')
    } else {
      checkEndCondition(newElim)
    }
  }

  const checkEndCondition = (newElim) => {
    const remaining = roles.filter((_, i) => !newElim.includes(i))
    const mwAlive = remaining.some(r => r.role === 'mister_white')
    const civils = remaining.filter(r => r.role === 'civil').length
    const undercoveres = remaining.filter(r => r.role === 'undercover').length
    if (civils <= 1) { setGameResult(mwAlive ? 'mw_wins' : undercoveres > 0 ? 'undercover_wins' : 'civils_win'); setStep('result'); return }
    if (undercoveres >= civils) { setGameResult('undercover_wins'); setStep('result'); return }
    if (!mwAlive && undercoveres === 0) { setGameResult('civils_win'); setStep('result'); return }
    // Next round — advance reveal cursor to next active player in order
    const nextActive = activeIndices.filter(i => !newElim.includes(i))
    // Advance starting player by 1 (rotate right)
    const firstNext = nextActive[(nextActive.indexOf(nextActive[0]) + 1) % nextActive.length]
    setRevealCursor(firstNext || nextActive[0] || 0)
    setVoteCandidate(null); setConfirmed(false); setVotes({})
    setRoundNum(r => r + 1); setStep('playing')
  }

  const handleMWGuess = () => {
    const guess = mwGuess.toLowerCase().trim()
    const correct = guess === civilWord.toLowerCase().trim() || civilWord.toLowerCase().startsWith(guess)
    if (correct) { setGameResult('mw_wins'); setStep('result') }
    else {
      // MW guessed wrong — check if game continues (undercoveres still alive)
      const remaining = roles.filter((_, i) => ![...eliminated].includes(i))
      const undercoveres = remaining.filter(r => r.role === 'undercover').length
      if (undercoveres > 0) {
        checkEndCondition(eliminated)
      } else {
        setGameResult('civils_win'); setStep('result')
      }
    }
  }

  const resetGame = () => { setStep('setup'); setPlayerNames(['','','','']); setNumMW(1); setNumUndercover(1) }

  const remainingActive = roles.filter((_, i) => !eliminated.includes(i))

  return (
    <PageShell
      mode="misterwhite"
      innerClassName="space-y-0 w-full"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.20) 0%, #111827 45%, #050711 100%)' }}
    >
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-3 mb-6">
          <BackButton onClick={() => (step === 'setup' ? navigate('/MisterWhite') : setStep('setup'))} />
          <div>
            <h1 className="text-white font-bold text-xl">👁️ Mister White</h1>
            {step !== 'setup' && <p className="text-slate-500 text-xs">Ronda {roundNum} · {remainingActive.length} jogadores activos</p>}
          </div>
        </div>
        <AnimatePresence mode="wait">

          {/* ── SETUP ── */}
          {step==='setup'&&(
            <motion.div key="setup" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-4">
              <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-slate-400"/>Jogadores (mín. 3)</h3>
                {playerNames.map((n,i)=>(
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <input value={n} onChange={e=>setPlayerNames(ps=>ps.map((x,j)=>j===i?e.target.value:x))}
                      placeholder={`Jogador ${i+1}`}
                      className="flex-1 bg-white/[0.05] text-white rounded-xl px-3 py-2.5 outline-none border border-white/[0.07] text-sm"/>
                    {playerNames.length>3&&<button onClick={()=>setPlayerNames(ps=>ps.filter((_,j)=>j!==i))} className="text-slate-600 hover:text-red-400 transition-colors"><Minus className="w-4 h-4"/></button>}
                  </div>
                ))}
                <button onClick={()=>setPlayerNames(p=>[...p,''])} className="text-slate-500 hover:text-white text-sm flex items-center gap-1 mt-1 transition-colors">
                  <Plus className="w-3 h-3"/> Adicionar
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[{label:'Infiltrados',val:numUndercover,set:setNumUndercover},{label:'Mister Whites',val:numMW,set:setNumMW}].map(({label,val,set})=>(
                  <div key={label} className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 text-center">
                    <p className="text-slate-400 text-xs mb-2">{label}</p>
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={()=>set(v=>Math.max(0,v-1))} className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center text-slate-400 hover:text-white"><Minus className="w-3 h-3"/></button>
                      <span className="text-white font-black text-xl w-6 text-center">{val}</span>
                      <button onClick={()=>{ if(numMW+numUndercover<maxSpec) set(v=>v+1) }}
                        className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center text-slate-400 hover:text-white"><Plus className="w-3 h-3"/></button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 space-y-3">
                <h3 className="text-white font-semibold">Tema e dificuldade</h3>
                <select value={wordPack} onChange={e=>setWordPack(e.target.value)}
                  className="w-full bg-white/[0.05] text-white rounded-xl px-3 py-2.5 outline-none border border-white/[0.07] text-sm">
                  {Object.entries(wordPacks).map(([id, pack]) => <option key={id} value={id}>{pack.label}</option>)}
                </select>
                <div className="grid grid-cols-3 gap-2">
                  {[['facil','Fácil'],['normal','Normal'],['dificil','Difícil']].map(([id,label])=>(
                    <button key={id} onClick={()=>setDifficulty(id)}
                      className={`rounded-xl border px-3 py-2 text-xs font-bold ${difficulty===id?'bg-slate-500/30 border-slate-400 text-white':'bg-white/[0.03] border-white/[0.07] text-slate-400'}`}>
                      {label}
                    </button>
                  ))}
                </div>
                <div>
                  <p className="text-slate-400 text-xs mb-2">Timer de discussão</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[60,90,120].map(seconds=>(
                      <button key={seconds} onClick={()=>setDiscussionSeconds(seconds)}
                        className={`rounded-xl border px-3 py-2 text-xs font-bold ${discussionSeconds===seconds?'bg-violet-600/30 border-violet-500 text-violet-200':'bg-white/[0.03] border-white/[0.07] text-slate-400'}`}>
                        {seconds}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="bg-slate-800/40 border border-white/[0.06] rounded-2xl p-4 text-sm text-slate-400 space-y-1">
                <p>📖 <span className="text-white">Civis</span> conhecem a palavra. <span className="text-blue-400">Infiltrados</span> têm palavra similar. <span className="text-red-400">Mister White</span> não tem palavra.</p>
                <p>🗳️ Grupo discute, vota num suspeito, e o dono do telemóvel confirma a eliminação.</p>
                <p>⏱️ Usa o timer para limitar a discussão antes da votação.</p>
                <p>🔄 Após a primeira ronda, o turno de revelar avança um para a direita.</p>
              </div>
              <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.98}} onClick={startGame} disabled={valid.length<3}
                className="w-full bg-gradient-to-r from-slate-500 to-slate-700 text-white font-bold rounded-2xl py-4 disabled:opacity-40">
                Começar 👁️
              </motion.button>
            </motion.div>
          )}

          {/* ── REVEAL — one by one in original order ── */}
          {step==='reveal'&&roles[revealCursor]&&(
            <motion.div key={`reveal-${revealCursor}`} initial={{opacity:0,scale:0.92}} animate={{opacity:1,scale:1}} exit={{opacity:0}} className="text-center space-y-5">
              <div className={`w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br ${roles[revealCursor].color} flex items-center justify-center text-white font-black text-4xl`}>
                {roles[revealCursor].name[0]}
              </div>
              <h2 className="text-white font-bold text-xl">Vez de <span className="font-black">{roles[revealCursor].name}</span></h2>
              <p className="text-slate-500 text-sm">Mostra só a ti próprio!</p>
              {!showRole ? (
                <motion.button
                  whileTap={{scale:0.96}}
                  onClick={()=>setShowRole(true)}
                  className="group relative w-full h-48 overflow-hidden rounded-[2rem] border border-violet-300/20 bg-gradient-to-br from-slate-950 via-violet-950/50 to-black shadow-2xl flex flex-col items-center justify-center gap-3 text-slate-300"
                >
                  <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/70 to-transparent" />
                  <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-500/20 blur-2xl transition group-active:scale-125" />
                  <div className="grid h-16 w-16 place-items-center rounded-3xl border border-white/10 bg-white/[0.06]">
                    <EyeOff className="w-8 h-8 text-violet-200"/>
                  </div>
                  <span className="font-black text-white">Toca para revelar</span>
                  <span className="text-xs text-slate-500">Mantém o ecrã virado só para ti</span>
                </motion.button>
              ) : (
                <motion.div initial={{scale:0.85,opacity:0}} animate={{scale:1,opacity:1}}
                  className={`relative w-full min-h-44 overflow-hidden rounded-[2rem] flex flex-col items-center justify-center gap-2 border p-6 shadow-2xl ${roles[revealCursor].role==='civil'?'bg-green-900/25 border-green-500/30':roles[revealCursor].role==='undercover'?'bg-blue-900/25 border-blue-500/30':'bg-red-900/25 border-red-500/30'}`}>
                  <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
                  <span className="text-slate-300 text-sm">{roles[revealCursor].role==='civil'?'✅ Civil':roles[revealCursor].role==='undercover'?'🕵️ Undercover':'👁️ Mister White'}</span>
                  <span className="text-white font-black text-3xl">{roles[revealCursor].word||'Sem palavra'}</span>
                  {roles[revealCursor].role==='undercover'&&<span className="text-blue-300 text-xs">A tua palavra é parecida mas diferente!</span>}
                  {roles[revealCursor].role==='mister_white'&&<span className="text-red-300 text-xs">Tenta descobrir a palavra civil!</span>}
                </motion.div>
              )}
              {showRole&&(
                <button onClick={nextReveal}
                  className="w-full bg-gradient-to-r from-slate-500 to-slate-700 text-white font-bold rounded-2xl py-4">
                  {revealCursor<roles.length-1?`Próximo: ${roles[revealCursor+1]?.name} →`:'Começar Ronda →'}
                </button>
              )}
              <p className="text-slate-600 text-xs">{revealCursor+1} de {roles.length}</p>
            </motion.div>
          )}

          {/* ── PLAYING ── */}
          {step==='playing'&&(
            <motion.div key={`playing-${roundNum}`} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-4">
              <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 text-center">
                <p className="text-slate-300 text-sm leading-relaxed">Cada jogador diz <b className="text-white">uma pista</b> sobre a sua palavra — nem demasiado óbvia nem demasiado vaga.</p>
                <div className={`mt-3 rounded-2xl border px-4 py-3 ${timeLeft===0?'border-red-500/40 bg-red-500/10':'border-violet-500/30 bg-violet-500/10'}`}>
                  <p className={`font-black text-3xl ${timeLeft===0?'text-red-300':'text-white'}`}>
                    {Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,'0')}
                  </p>
                  <p className="text-slate-500 text-xs">{timeLeft===0?'Tempo terminado. Podem votar.':'Tempo de discussão'}</p>
                </div>
              </div>
              <div className="space-y-2">
                {activeIndices.map(i => (
                  <div key={i} className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${roles[i].color} flex items-center justify-center text-white text-sm font-black flex-shrink-0`}>{roles[i].name[0]}</div>
                    <span className="text-white font-medium">{roles[i].name}</span>
                    <Eye className="text-slate-700 w-4 h-4 ml-auto"/>
                  </div>
                ))}
              </div>
              {eliminated.length>0&&(
                <div className="space-y-1">
                  <p className="text-slate-600 text-xs uppercase tracking-wider">Eliminados</p>
                  {eliminated.map(i=>(
                    <div key={i} className="bg-white/[0.02] rounded-xl px-4 py-2 flex items-center gap-3 opacity-35">
                      <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${roles[i].color} flex items-center justify-center text-white text-xs font-black`}>{roles[i].name[0]}</div>
                      <span className="text-slate-500 text-sm">{roles[i].name} ({roles[i].role === 'civil' ? 'Civil' : roles[i].role === 'undercover' ? 'Undercover' : 'Mister White'})</span>
                    </div>
                  ))}
                </div>
              )}
              <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.98}} onClick={startVoting}
                className="w-full bg-gradient-to-r from-red-600 to-rose-700 text-white font-bold rounded-2xl py-4">
                🗳️ Votar na Eliminação
              </motion.button>
            </motion.div>
          )}

          {/* ── VOTE — group discusses, one confirms ── */}
          {step==='vote'&&(
            <motion.div key="vote" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-4">
              <div className="bg-red-900/15 border border-red-500/25 rounded-2xl p-4 text-center">
                <p className="text-white font-bold mb-1">Quem eliminar?</p>
                <p className="text-slate-400 text-sm">O grupo discute e o dono do telemóvel escolhe quem é eliminado.</p>
              </div>
              <div className="space-y-2">
                {activeIndices.map(idx => (
                  <motion.button key={idx} whileHover={{scale:1.01}} whileTap={{scale:0.98}}
                    onClick={() => selectCandidate(idx)}
                    className={`w-full px-4 py-3.5 rounded-xl border flex items-center gap-3 transition-all text-left ${voteCandidate===idx?'bg-red-900/25 border-red-500/50':'bg-white/[0.04] border-white/[0.07] hover:border-white/[0.2]'}`}>
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${roles[idx].color} flex items-center justify-center text-white text-sm font-black flex-shrink-0`}>{roles[idx].name[0]}</div>
                    <span className={`font-medium ${voteCandidate===idx?'text-white':'text-slate-300'}`}>{roles[idx].name}</span>
                    {voteCandidate===idx&&<span className="ml-auto text-red-400 text-sm font-bold">Selecionado ✓</span>}
                  </motion.button>
                ))}
              </div>
              {voteCandidate!==null&&!confirmed&&(
                <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
                  className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-center space-y-3">
                  <p className="text-amber-300 font-bold">Eliminar <span className="text-white">{roles[voteCandidate]?.name}</span>?</p>
                  <p className="text-slate-400 text-sm">Toda a gente concorda?</p>
                  <div className="flex gap-3">
                    <button onClick={() => {setVoteCandidate(null)}} className="flex-1 bg-white/[0.06] border border-white/[0.08] text-white rounded-2xl py-3 font-medium">← Voltar atrás</button>
                    <motion.button whileTap={{scale:0.96}} onClick={confirmElimination}
                      className="flex-1 bg-gradient-to-r from-red-600 to-rose-700 text-white font-black rounded-2xl py-3">
                      Eliminar! ✂️
                    </motion.button>
                  </div>
                </motion.div>
              )}
              {voteCandidate===null&&(
                <button onClick={()=>setStep('playing')} className="w-full bg-white/[0.05] text-slate-400 rounded-2xl py-3 text-sm">← Voltar ao jogo</button>
              )}
            </motion.div>
          )}

          {/* ── MW GUESS ── */}
          {step==='mw_guess'&&mwEliminatedIdx!==null&&(
            <motion.div key="mwguess" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="text-center space-y-5">
              <div className="text-5xl">👁️</div>
              <h3 className="text-white font-black text-xl">{roles[mwEliminatedIdx]?.name} é o Mister White!</h3>
              <p className="text-slate-400 text-sm">Última hipótese — adivinha a palavra civil para vencer!</p>
              <input value={mwGuess} onChange={e=>setMwGuess(e.target.value)}
                placeholder="A palavra civil é..."
                className="w-full bg-white/[0.05] text-white text-center text-lg font-bold rounded-2xl px-4 py-4 outline-none border border-white/[0.08] focus:border-slate-400/50"
                onKeyDown={e=>e.key==='Enter'&&mwGuess.trim()&&handleMWGuess()}/>
              <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.98}} onClick={handleMWGuess} disabled={!mwGuess.trim()}
                className="w-full bg-gradient-to-r from-slate-500 to-slate-700 text-white font-bold rounded-2xl py-4 disabled:opacity-40">
                Revelar! 🎭
              </motion.button>
            </motion.div>
          )}

          {/* ── RESULT ── */}
          {step==='result'&&(
            <motion.div key="result" initial={{opacity:0,scale:0.92}} animate={{opacity:1,scale:1}} exit={{opacity:0}} className="text-center space-y-5">
              <div className="text-6xl">{gameResult==='civils_win'?'✅':gameResult==='mw_wins'?'🕵️':'🔵'}</div>
              <h2 className="text-white font-black text-2xl">
                {gameResult==='civils_win'?'Os Civis Venceram!':gameResult==='mw_wins'?'Mister White Venceu!':'Infiltrados Venceram!'}
              </h2>
              <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 text-left space-y-1">
                <div className="flex gap-4 mb-3 text-sm">
                  <span className="text-slate-400">Civil: <span className="text-green-400 font-bold">{civilWord}</span></span>
                  <span className="text-slate-400">Undercover: <span className="text-blue-400 font-bold">{undercoverWord}</span></span>
                </div>
                {roles.map((r,i)=>(
                  <div key={i} className="flex items-center gap-2 py-1 border-b border-white/[0.05] last:border-0">
                    <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${r.color} flex items-center justify-center text-white text-xs font-black flex-shrink-0`}>{r.name[0]}</div>
                    <span className="text-white text-sm flex-1">{r.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${r.role==='civil'?'bg-green-500/15 text-green-400':r.role==='undercover'?'bg-blue-500/15 text-blue-400':'bg-red-500/15 text-red-400'}`}>
                      {r.role==='civil'?'Civil':r.role==='undercover'?'Undercover':'MW'}
                    </span>
                    <span className="text-slate-500 text-xs">{r.word||'—'}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={startGame} className="flex-1 bg-white/[0.07] border border-white/[0.08] text-white rounded-2xl py-3 font-medium">🔄 Nova Ronda</button>
                <button onClick={resetGame} className="flex-1 bg-white/[0.07] border border-white/[0.08] text-white rounded-2xl py-3 font-medium">🏠 Início</button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </PageShell>
  )
}
