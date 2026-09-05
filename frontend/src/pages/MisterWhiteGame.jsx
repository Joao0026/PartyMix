import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Eye, EyeOff } from 'lucide-react'
import NightShell, { NightTitle, NightCta, NightPlayerChip, pessoaLabel } from '../components/layout/NightShell'
import MisterMatchSettings from '../components/mister/MisterMatchSettings'
import { shuffle } from '../utils/game'
import { api } from '../utils/api'
import {
  WORD_PACKS,
  WORD_PACK_ORDER,
  MW_COLORS,
  DIFFICULTY_IDS,
  adjustSpecialRoleCounts,
  collectPairPool,
  pickWordPair,
  sanitizeCustomPairs,
  sanitizeMisterPair,
  toggleOrdered,
} from '../utils/misterWhiteShared'
import { loadNightRoster, saveNightRoster } from '../utils/nightRoster'

const COLORS = MW_COLORS

export default function MisterWhiteGame() {
  const navigate = useNavigate()
  const [communityPairs, setCommunityPairs] = useState([])
  const [customPairs, setCustomPairs] = useState([])
  const [draftCivil, setDraftCivil] = useState('')
  const [draftUndercover, setDraftUndercover] = useState('')
  const packOptions = WORD_PACK_ORDER.filter((id) => WORD_PACKS[id])
  const packLabels = useMemo(
    () => Object.fromEntries(packOptions.map((id) => [id, WORD_PACKS[id].label])),
    [packOptions],
  )

  useEffect(() => {
    api.getMisterPairs().then((d) => {
      if (Array.isArray(d?.pairs)) setCommunityPairs(d.pairs)
    }).catch(() => {})
  }, [])
  const [step, setStep] = useState('setup')
  const [playerNames, setPlayerNames] = useState(() => loadNightRoster().names.slice(0, 15))
  const [draft, setDraft] = useState('')
  const [numUndercover, setNumUndercover] = useState(1)
  const [numMW, setNumMW] = useState(0)
  const [wordPacks, setWordPacks] = useState(['geral'])
  const [difficulties, setDifficulties] = useState([...DIFFICULTY_IDS])
  const [discussionSeconds, setDiscussionSeconds] = useState(90)

  // Game state
  const [roles, setRoles] = useState([])           // [{name, color, role, word, origIdx}] — in original player order
  const [civilWord, setCivilWord] = useState('')
  const [undercoverWord, setUndercoverWord] = useState('')
  const [revealCursor, setRevealCursor] = useState(0) // tracks which player is next to reveal
  const [revealCount, setRevealCount] = useState(0)
  const [roundStartCursor, setRoundStartCursor] = useState(0)
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

  useEffect(() => {
    const names = playerNames.map((n) => n.trim()).filter(Boolean)
    if (names.length >= 3) saveNightRoster(names)
  }, [playerNames])
  const maxSpec = Math.max(0, valid.length - 2)
  const adjustRole = (role, delta) => {
    const next = adjustSpecialRoleCounts(
      { numMW, numUndercover },
      role,
      delta,
      valid.length,
    )
    setNumMW(next.numMW)
    setNumUndercover(next.numUndercover)
  }

  const matchSettings = { wordPacks, difficulties, customPairs, discussionSeconds }
  const canStartMatch = collectPairPool(WORD_PACKS, matchSettings, communityPairs).length > 0

  const startGame = () => {
    if (!canStartMatch) return
    saveNightRoster(valid)
    const pair = pickWordPair(matchSettings, null, WORD_PACKS, communityPairs)
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
    const firstPlayer = Math.floor(Math.random() * valid.length)
    setRoles(assigned)
    setRevealCursor(firstPlayer)
    setRevealCount(0)
    setRoundStartCursor(firstPlayer)
    setShowRole(false)
    setEliminated([]); setVotes({}); setVoteCandidate(null); setConfirmed(false)
    setMwGuess(''); setMwEliminatedIdx(null); setGameResult(null); setRoundNum(1)
    setTimeLeft(discussionSeconds)
    setStep('reveal')
  }

  const activeIndices = roles.map((_, i) => i).filter(i => !eliminated.includes(i))
  const orderedActiveIndices = roles.length
    ? Array.from({ length: roles.length }, (_, offset) => (roundStartCursor + offset) % roles.length)
      .filter((i) => !eliminated.includes(i))
    : []

  // Advance revealCursor wrapping only through active players in original order
  const nextReveal = () => {
    const nextCount = revealCount + 1
    if (nextCount >= roles.length) {
      setShowRole(false)
      setStep('playing')
      return
    }
    setRevealCount(nextCount)
    setRevealCursor((revealCursor + 1) % roles.length)
    setShowRole(false)
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
    // Rotate from the previous round cursor through the original seating order.
    // Eliminated seats still count in that order, but cannot become the starter.
    let nextStarter = roundStartCursor
    for (let offset = 1; offset <= roles.length; offset += 1) {
      const candidate = (roundStartCursor + offset) % roles.length
      if (!newElim.includes(candidate)) {
        nextStarter = candidate
        break
      }
    }
    setRoundStartCursor(nextStarter)
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

  const addPlayer = () => {
    const clean = draft.trim().slice(0, 20)
    if (!clean || playerNames.length >= 15) return
    if (playerNames.some((n) => n.toLocaleLowerCase('pt-PT') === clean.toLocaleLowerCase('pt-PT'))) return
    setPlayerNames([...playerNames, clean])
    setDraft('')
  }

  const resetGame = () => {
    setStep('setup')
    setPlayerNames(loadNightRoster().names.slice(0, 15))
    setNumMW(0)
    setNumUndercover(1)
  }

  const GOLD = '#fbbf24'

  return (
    <NightShell
      wide={step === 'settings'}
      onBack={() => {
        if (step === 'setup') navigate('/MisterWhite')
        else if (step === 'settings') setStep('setup')
        else setStep('settings')
      }}
      footer={step === 'setup' ? (
        <NightCta accent={GOLD} onClick={() => setStep('settings')} disabled={valid.length < 3}>
          Continuar com {pessoaLabel(valid.length)}
        </NightCta>
      ) : step === 'settings' ? (
        <NightCta accent={GOLD} onClick={startGame} disabled={!canStartMatch}>
          Começar com {pessoaLabel(valid.length)}
        </NightCta>
      ) : step === 'reveal' && showRole ? (
        <NightCta accent={GOLD} onClick={nextReveal}>
          {revealCount < roles.length - 1 ? `Próximo: ${roles[(revealCursor + 1) % roles.length]?.name}` : 'Começar ronda'}
        </NightCta>
      ) : step === 'playing' ? (
        <NightCta accent="#ff4d7a" onClick={startVoting}>Votar na eliminação</NightCta>
      ) : step === 'vote' && voteCandidate !== null && !confirmed ? (
        <NightCta accent="#ff4d7a" onClick={confirmElimination}>Eliminar {roles[voteCandidate]?.name}</NightCta>
      ) : step === 'mw_guess' ? (
        <NightCta accent={GOLD} onClick={handleMWGuess} disabled={!mwGuess.trim()}>Revelar</NightCta>
      ) : step === 'result' ? (
        <NightCta accent={GOLD} onClick={startGame}>Nova ronda</NightCta>
      ) : null}
    >
      <AnimatePresence mode="wait">

          {step === 'setup' && (
            <motion.div key="setup" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <NightTitle>Mister White</NightTitle>
              <p className="mt-3 text-center text-[1.05rem] font-medium text-white">Um telemóvel</p>
              <p className="mt-1.5 text-center text-[13px] text-white/45">Passa à volta da mesa. Mínimo 3 pessoas.</p>

              <form
                className="mt-6"
                onSubmit={(e) => {
                  e.preventDefault()
                  addPlayer()
                }}
              >
                <div className="flex gap-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Nome"
                    maxLength={20}
                    autoComplete="off"
                    className="h-12 min-w-0 flex-1 rounded-full border border-white/10 bg-[#1c1c21] px-5 text-[15px] text-white outline-none placeholder:text-slate-500"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || playerNames.length >= 15}
                    className="flex h-12 shrink-0 items-center gap-1 rounded-full border border-white/10 bg-[#2a2a2e] px-3.5 text-[13px] font-bold text-white disabled:opacity-35"
                  >
                    <Plus className="h-4 w-4 text-[#ffb04f]" strokeWidth={2.5} />
                    Adicionar
                  </button>
                </div>
              </form>

              <div className="mt-4 space-y-2.5">
                {playerNames.map((n, i) => (
                  <NightPlayerChip
                    key={`${n}-${i}`}
                    name={n}
                    index={i}
                    accent={GOLD}
                    onRemove={() => setPlayerNames((ps) => ps.filter((_, j) => j !== i))}
                  />
                ))}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                {[{ label: 'Infiltrados', val: numUndercover, role: 'undercover' }, { label: 'Mister Whites', val: numMW, role: 'mw' }].map(({ label, val, role }) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-[#1c1c21] p-3 text-center">
                    <p className="mb-1 text-xs text-slate-500">{label}</p>
                    <div className="flex items-center justify-center gap-2">
                      <button type="button" onClick={() => adjustRole(role, -1)}
                        disabled={val === 0 || numMW + numUndercover <= 1}
                        className="h-7 w-7 rounded-lg bg-white/[0.06] text-slate-400 disabled:opacity-25">−</button>
                      <span className="font-black text-white">{val}</span>
                      <button type="button" onClick={() => adjustRole(role, 1)}
                        disabled={maxSpec === 0 || (numMW + numUndercover >= maxSpec && (role === 'mw' ? numUndercover : numMW) === 0)}
                        className="h-7 w-7 rounded-lg bg-white/[0.06] text-slate-400 disabled:opacity-25">+</button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-center text-xs text-slate-500">
                {valid.length < 3
                  ? 'Adiciona pelo menos 3 jogadores para escolher os papéis.'
                  : `${maxSpec === 1 ? '1 papel especial' : `${maxSpec} papéis especiais`} no máximo · ficam sempre 2 civis.`}
              </p>
            </motion.div>
          )}

          {step === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <MisterMatchSettings
                packIds={packOptions}
                packLabels={packLabels}
                wordPacks={wordPacks}
                onTogglePack={(id) => setWordPacks((prev) => {
                  const next = toggleOrdered(prev, id, packOptions)
                  return next.length ? next : prev
                })}
                onAllPacks={() => setWordPacks([...packOptions])}
                difficulties={difficulties}
                onToggleDifficulty={(id) => setDifficulties((prev) => {
                  const next = toggleOrdered(prev, id, DIFFICULTY_IDS)
                  return next.length ? next : prev
                })}
                onAllDifficulties={() => setDifficulties([...DIFFICULTY_IDS])}
                customPairs={customPairs}
                draftCivil={draftCivil}
                draftUndercover={draftUndercover}
                onDraftCivil={setDraftCivil}
                onDraftUndercover={setDraftUndercover}
                onAddPair={() => {
                  const pair = sanitizeMisterPair({ civil: draftCivil, undercover: draftUndercover }, { custom: true })
                  if (!pair) return
                  setCustomPairs((prev) => sanitizeCustomPairs([...prev, pair]))
                  setDraftCivil('')
                  setDraftUndercover('')
                }}
                onRemovePair={(i) => setCustomPairs((prev) => prev.filter((_, idx) => idx !== i))}
                discussionSeconds={discussionSeconds}
                onDiscussionSeconds={setDiscussionSeconds}
              />
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
                  className="group relative flex h-48 w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-[2rem] border border-white/10 bg-[#1c1c21] text-slate-300"
                >
                  <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#fbbf24]/70 to-transparent" />
                  <div className="grid h-16 w-16 place-items-center rounded-3xl border border-white/10 bg-[#141419]">
                    <EyeOff className="h-8 w-8 text-[#fbbf24]"/>
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
              <p className="text-xs text-slate-500">{revealCount + 1} de {roles.length}</p>
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
                {orderedActiveIndices.map(i => (
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
                  <button type="button" onClick={() => setVoteCandidate(null)} className="w-full py-2 text-sm font-bold text-white/40">Voltar atrás</button>
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
              <button type="button" onClick={resetGame} className="w-full py-2 text-sm font-bold text-white/40">Início</button>
            </motion.div>
          )}

        </AnimatePresence>
    </NightShell>
  )
}
