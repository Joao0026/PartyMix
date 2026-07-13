import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ThumbsUp, Send, Sparkles, Clock, CheckCircle, Lightbulb } from 'lucide-react'
import BackButton from '../components/layout/BackButton'
import PageShell from '../components/layout/PageShell'
import { api } from '../utils/api'
import { DRINK_BARALHOS, DRINK_ESPECIAL_TYPES, DRINK_BARALHO_PLACEHOLDERS, drinkBaralhoLabel } from '../utils/drinkBaralhos'

const MODES = [
  {
    id:'friends', label:'👥 Modo Amigos', color:'bg-cyan-500/15 border-cyan-500/40 text-cyan-300',
    showBlackWhite:false, showAnswer:true,
    cardTypes:[
      {id:'telepatia',label:'🧠 Sincronia'},{id:'perguntas',label:'📚 Sabichão'},
      {id:'desenho',label:'🎨 Rabiscos'},{id:'mimica',label:'🎭 Gestos'},
      {id:'proibido',label:'🚫 Palavra Tabu'},{id:'caos',label:'💥 Caos'},
      {id:'impostor',label:'🎭 Impostor'},
    ],
  },
  {
    id:'family', label:'🏡 Modo Família', color:'bg-sky-500/15 border-sky-500/40 text-sky-300',
    showBlackWhite:false, showAnswer:true,
    cardTypes:[
      {id:'telepatia',label:'🧠 Sincronia'},{id:'perguntas',label:'📚 Sabichão'},
      {id:'desenho',label:'🎨 Rabiscos'},{id:'mimica',label:'🎭 Gestos'},
      {id:'proibido',label:'🚫 Palavra Tabu'},
    ],
  },
  {
    id:'couple', label:'💕 Modo Casal', color:'bg-rose-500/15 border-rose-500/40 text-rose-300',
    showBlackWhite:false, showAnswer:true,
    cardTypes:[
      {id:'romantico',label:'🌹 Conexão'},{id:'picante',label:'🔥 Picante'},
      {id:'verdade',label:'❓ Confissão'},{id:'acao',label:'⚡ Atitude'},
      {id:'roleplay',label:'🎭 Cena'},{id:'quiz',label:'💬 Quanto me conheces?'},
    ],
  },
  {
    id:'drink', label:'🍺 Modo Beber', color:'bg-amber-500/15 border-amber-500/40 text-amber-300',
    showBlackWhite:false, showAnswer:false,
    cardTypes: DRINK_BARALHOS.map(({ id, label }) => ({ id, label })),
  },
  {
    id:'cards', label:'🃏 Modo Cartas', color:'bg-yellow-500/15 border-yellow-500/40 text-yellow-300',
    showBlackWhite:true, showAnswer:false,
    cardTypes:[],
  },
  {
    id:'mister', label:'👁️ Mister White', color:'bg-slate-500/15 border-slate-400/40 text-slate-300',
    showBlackWhite:false, showAnswer:false,
    cardTypes:[],
  },
  {
    id:'mememix', label:'😂 MemeMix', color:'bg-pink-500/15 border-pink-500/40 text-pink-300',
    showBlackWhite:false, showAnswer:false,
    cardTypes:[{id:'legenda', label:'💬 Legenda'}],
  },
]

const IDEA_TYPES = [
  {id:'mode',label:'🎮 Novo Modo de Jogo'},
  {id:'minigame',label:'🎲 Novo Mini-jogo'},
  {id:'feature',label:'⚙️ Nova Funcionalidade'},
  {id:'other',label:'💡 Outra Ideia'},
]

const TYPE_ICONS = {
  telepatia:'🧠', perguntas:'📚', desenho:'🎨', mimica:'🎭', proibido:'🚫', caos:'💥',
  romantico:'🌹', picante:'🔥', verdade:'❓', acao:'⚡', roleplay:'🎭', quiz:'💬',
  beber:'🍺', eununca:'🙅', regra:'📜', desafio:'⚡', cadeia:'🔗', historia:'🎬',
  provavel:'👉', bluff:'🎭', maldicao:'🔮', duelo:'⚔️', poder:'👑', sorte:'🍀', azar:'💀',
  preferencia:'🤔', agent:'🕵️', alliance:'🤝', miniboss:'👹', impostor:'🎭', extreme:'💣', geral:'🃏',
  legenda:'💬', par:'👁️',
  waterfall:'🌊', regras:'📜', desafios:'⚡', preferias:'🤔', especiais:'🛡️',
}

const MEMEMIX_LEGENDA_PLACEHOLDER = 'Ex: Quando disseste «só mais um copo» e acabaste às 6 da manhã'

// Card type that has answers (question types per mode)
const ANSWER_TYPES = ['perguntas','quiz','casal_pergunta']

function loadVoted() { try { return new Set(JSON.parse(localStorage.getItem('partymix_voted_v5')||'[]')) } catch { return new Set() } }
function saveVoted(s) { localStorage.setItem('partymix_voted_v5', JSON.stringify([...s])) }

export default function CommunityCards() {
  const navigate = useNavigate()
  const [items,      setItems]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [voted,      setVoted]      = useState(() => loadVoted())
  const [tab,        setTab]        = useState('browse')
  const [statusFilter, setStatusFilter] = useState('all')
  const [modeFilter, setModeFilter] = useState('all')
  const [submitted,  setSubmitted]  = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Card form state
  const [cMode,     setCMode]     = useState('')
  const [cType,     setCType]     = useState('')
  const [cIsBlack,  setCIsBlack]  = useState(false)
  const [cText,     setCText]     = useState('')
  const [cAnswer,   setCAnswer]   = useState('')
  const [cChoices,  setCChoices]  = useState(['','','',''])
  const [cForbiddenWords, setCForbiddenWords] = useState(['','','','',''])
  const [cSecretMission, setCSecretMission] = useState('')
  const [cCorrectQuestion, setCCorrectQuestion] = useState('')
  const [cWrongQuestion, setCWrongQuestion] = useState('')
  const [cCivilWord, setCCivilWord] = useState('')
  const [cUndercoverWord, setCUndercoverWord] = useState('')
  const [cSpecialType, setCSpecialType] = useState('')
  const [cAuthor,   setCAuthor]   = useState('')

  // Idea form state
  const [iType,   setIType]   = useState('')
  const [iText,   setIText]   = useState('')
  const [iAuthor, setIAuthor] = useState('')

  const selectedModeObj = MODES.find(m => m.id === cMode)
  const isCardsMode     = cMode === 'cards'
  const isMisterMode    = cMode === 'mister'
  const isMememixMode   = cMode === 'mememix'
  const needsCardType   = cMode && !isCardsMode && !isMisterMode && selectedModeObj?.cardTypes.length > 0
  // Show answer field when type is a question type
  const showAnswerField = selectedModeObj?.showAnswer && ANSWER_TYPES.includes(cType)
  const showForbiddenField = cType === 'proibido'
  const isDrinkMode = cMode === 'drink'
  const showDrinkPreferencia = isDrinkMode && cType === 'preferias'
  const showEspecialPicker = isDrinkMode && cType === 'especiais'
  const showDrinkAgent = showEspecialPicker && cSpecialType === 'agent'
  const showFriendsImpostor = cMode === 'friends' && cType === 'impostor'
  const showDrinkImpostor = showEspecialPicker && cSpecialType === 'impostor'
  const showImpostor = showFriendsImpostor || showDrinkImpostor
  const showDrinkText = isDrinkMode && cType && !showDrinkAgent && !showDrinkImpostor && !showDrinkPreferencia && !(showEspecialPicker && !cSpecialType)
  const showMapText = !isCardsMode && !isDrinkMode && !isMisterMode && !isMememixMode && cType && !showImpostor
  const showMisterPair = isMisterMode
  const showMememixLegenda = isMememixMode
  const preferChoicesOk = cChoices.filter((c) => c.trim()).length >= 2

  const resetCardFields = () => {
    setCType('')
    setCIsBlack(false)
    setCText('')
    setCAnswer('')
    setCChoices(['', ''])
    setCForbiddenWords(['', '', '', '', ''])
    setCSecretMission('')
    setCCorrectQuestion('')
    setCWrongQuestion('')
    setCCivilWord('')
    setCUndercoverWord('')
    setCSpecialType('')
  }

  const loadRequestRef = useRef(0)

  const load = useCallback(() => {
    const reqId = ++loadRequestRef.current
    setLoading(true)
    const p = { limit: 200 }
    if (statusFilter !== 'all') p.status = statusFilter
    if (modeFilter !== 'all') p.mode = modeFilter
    api.getCommunity(p)
      .then((d) => {
        if (reqId !== loadRequestRef.current) return
        setItems(Array.isArray(d.items) ? d.items : [])
      })
      .catch(() => {
        if (reqId !== loadRequestRef.current) return
      })
      .finally(() => {
        if (reqId !== loadRequestRef.current) return
        setLoading(false)
      })
  }, [statusFilter, modeFilter])

  useEffect(() => { load() }, [load])

  const toggleVote = async (id) => {
    if (voted.has(id)) {
      const nv = new Set(voted)
      nv.delete(id)
      setVoted(nv)
      saveVoted(nv)
      setItems(prev => prev.map(i => i._id === id ? { ...i, votes: Math.max(0, i.votes - 1) } : i))
      try {
        await api.unvoteCommunity(id)
      } catch {
        const rv = new Set(nv)
        rv.add(id)
        setVoted(rv)
        saveVoted(rv)
        setItems(prev => prev.map(i => i._id === id ? { ...i, votes: i.votes + 1 } : i))
      }
      return
    }
    const nv = new Set([...voted, id])
    setVoted(nv)
    saveVoted(nv)
    setItems(prev => prev.map(i => i._id === id ? { ...i, votes: i.votes + 1 } : i))
    try {
      await api.voteCommunity(id)
    } catch {
      const rv = new Set(nv)
      rv.delete(id)
      setVoted(rv)
      saveVoted(rv)
      setItems(prev => prev.map(i => i._id === id ? { ...i, votes: Math.max(0, i.votes - 1) } : i))
    }
  }

  const submitCard = async () => {
    if (!cMode) return
    if (!isCardsMode && !isMisterMode && !isMememixMode && !cType) return
    if (showMisterPair && (!cCivilWord.trim() || !cUndercoverWord.trim())) return
    if (showMememixLegenda && !cText.trim()) return
    if (showEspecialPicker && !cSpecialType) return
    if (showDrinkAgent && !cSecretMission.trim()) return
    if (showImpostor && (!cCorrectQuestion.trim() || !cWrongQuestion.trim())) return
    if (showDrinkPreferencia && (!preferChoicesOk || !cText.trim())) return
    if (showDrinkText && !cText.trim()) return
    if (showMapText && !cText.trim()) return
    if (isCardsMode && !cText.trim()) return
    if (showAnswerField && !cAnswer.trim()) return
    if (showForbiddenField && cForbiddenWords.filter(w=>w.trim()).length !== 5) return
    setSubmitting(true)
    const preferChoices = cChoices.map(c=>c.trim()).filter(Boolean)
    await api.submitCommunity({
      submissionType:'card', mode:cMode,
      cardType:  isCardsMode ? 'geral' : isMisterMode ? 'par' : isMememixMode ? 'legenda' : cType,
      isBlack:   isCardsMode ? cIsBlack : false,
      text:      showImpostor ? cCorrectQuestion.trim()
        : showDrinkAgent ? cSecretMission.trim()
        : showMisterPair ? `${cCivilWord.trim()} · ${cUndercoverWord.trim()}`
        : cText.trim(),
      answer:    cAnswer.trim() || undefined,
      choices:   showDrinkPreferencia ? preferChoices.slice(0, 2) : showAnswerField ? preferChoices : undefined,
      forbiddenWords: showForbiddenField ? cForbiddenWords.map(w=>w.trim()).filter(Boolean) : undefined,
      secretMission: showDrinkAgent ? cSecretMission.trim() : undefined,
      drinkSpecialType: showEspecialPicker ? cSpecialType : undefined,
      correctQuestion: showImpostor ? cCorrectQuestion.trim() : undefined,
      wrongQuestion: showImpostor ? cWrongQuestion.trim() : undefined,
      civilWord: showMisterPair ? cCivilWord.trim() : undefined,
      undercoverWord: showMisterPair ? cUndercoverWord.trim() : undefined,
      author:    cAuthor.trim() || 'Anónimo',
    })
    setCMode(''); resetCardFields(); setCAuthor('')
    setSubmitting(false); setSubmitted(true); setTimeout(()=>setSubmitted(false),3000)
    setTab('browse'); load()
  }

  const submitIdea = async () => {
    if (!iType||iText.trim().length<20) return
    setSubmitting(true)
    await api.submitCommunity({ submissionType:'idea', ideaType:iType, text:iText.trim(), author:iAuthor.trim()||'Anónimo' })
    setIType(''); setIText(''); setIAuthor('')
    setSubmitting(false); setSubmitted(true); setTimeout(()=>setSubmitted(false),3000)
    setTab('browse'); load()
  }

  const getModeInfo  = id => MODES.find(m=>m.id===id)
  const getCardTypeLabel = (item) => {
    if (item.mode === 'drink') {
      const baralho = drinkBaralhoLabel(item.cardType)
      if (item.drinkSpecialType) return `${baralho} · ${drinkBaralhoLabel(item.drinkSpecialType)}`
      return baralho
    }
    return getModeInfo(item.mode)?.cardTypes.find(t => t.id === item.cardType)?.label || item.cardType
  }
  const getIdeaLabel = id => IDEA_TYPES.find(t=>t.id===id)?.label||id

  const inp = 'w-full bg-slate-800 border border-slate-600 text-white rounded-xl px-3 py-2.5 outline-none focus:border-violet-500 text-sm placeholder-slate-500'

  const visibleItems = useMemo(() => items.filter((item) => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false
    if (modeFilter !== 'all' && item.mode !== modeFilter) return false
    return true
  }), [items, statusFilter, modeFilter])

  const stats = {
    approved: visibleItems.filter(i => i.status === 'approved').length,
    pending:  visibleItems.filter(i => i.status === 'pending').length,
    votes:    visibleItems.reduce((s, i) => s + i.votes, 0),
  }

  return (
    <PageShell mode="cards" maxWidth="3xl" innerClassName="space-y-0 w-full flex flex-col">
      <div className="px-0 pt-0 pb-4 flex items-center gap-3 w-full">
        <BackButton onClick={() => navigate('/')} />
        <div className="flex-1">
          <h1 className="text-white font-black text-xl flex items-center gap-2"><Sparkles className="text-violet-400 w-5 h-5"/>Cartas da Comunidade</h1>
          <p className="text-slate-500 text-sm">Vota nas melhores ideias — clica outra vez para retirar. Só o admin aprova para entrar no jogo.</p>
        </div>
      </div>

      <AnimatePresence>
        {submitted&&(
          <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} exit={{opacity:0}}
            className="mx-4 mb-2 max-w-lg md:max-w-3xl mx-auto w-full bg-green-500/15 border border-green-500/30 rounded-2xl p-3 text-center">
            <p className="text-green-400 font-bold">✅ Submetido! A aguardar votos da comunidade.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="px-4 max-w-lg md:max-w-3xl mx-auto w-full mb-4">
        <div className="flex bg-white/[0.04] border border-white/[0.06] rounded-2xl p-1 gap-1">
          {[['browse','🃏 Ver'],['submit_card','✏️ Carta'],['submit_idea','💡 Ideia']].map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${tab===id?'bg-violet-600 text-white':'text-slate-400 hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 pb-8 max-w-lg md:max-w-3xl mx-auto w-full">
        <AnimatePresence mode="wait">

          {/* ── BROWSE ── */}
          {tab==='browse'&&(
            <motion.div key="browse" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {[{n:stats.approved,l:'Aprovadas'},{n:stats.pending,l:'Em revisão'},{n:stats.votes,l:'Votos'}].map((s,i)=>(
                  <div key={i} className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-3 text-center">
                    <p className="text-white font-black text-2xl">{s.n}</p>
                    <p className="text-slate-500 text-xs">{s.l}</p>
                  </div>
                ))}
              </div>

              {/* Filters */}
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {[['all','Todas'],['pending','Em revisão'],['approved','Aprovadas']].map(([id,l])=>(
                    <button key={id} onClick={()=>setStatusFilter(id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${statusFilter===id?'bg-violet-600/30 border-violet-500 text-violet-300':'bg-white/[0.03] border-white/[0.06] text-slate-400 hover:text-white'}`}>
                      {l}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="text-slate-500 text-xs uppercase tracking-wider mb-1.5 block">Modo</label>
                  <select
                    value={modeFilter}
                    onChange={(e) => setModeFilter(e.target.value)}
                    className={inp + ' cursor-pointer'}
                  >
                    <option value="all">Todos os modos</option>
                    {MODES.map(m => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* List */}
              {loading ? <p className="text-slate-400 text-center py-8">A carregar...</p>
                : visibleItems.length === 0 ? <p className="text-slate-500 text-center py-8">Nenhuma submissão</p>
                : [...visibleItems].sort((a, b) => b.votes - a.votes).map((item, i) => {
                  const modeInfo=getModeInfo(item.mode)
                  return(
                    <motion.div key={item._id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.03}}
                      className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 flex items-start gap-3">
                      <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl border border-white/[0.08] bg-white/[0.06] text-2xl">
                        {item.submissionType==='idea'?'💡':item.mode==='cards'?(item.isBlack?'⬛':'⬜'):(TYPE_ICONS[item.cardType]||'🎴')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {item.submissionType==='idea'?(
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold flex items-center gap-1">
                              <Lightbulb className="w-3 h-3"/>{getIdeaLabel(item.ideaType)}
                            </span>
                          ):(
                            <>
                              {modeInfo&&<span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${modeInfo.color}`}>{modeInfo.label}</span>}
                              {item.mode==='cards'
                                ? <span className={`text-xs px-2 py-0.5 rounded-full border ${item.isBlack?'bg-slate-900 border-white/20 text-white/70':'bg-white/90 border-white text-slate-900'}`}>{item.isBlack?'⬛ Preta':'⬜ Branca'}</span>
                                : item.cardType&&<span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.1] text-slate-400">{getCardTypeLabel(item)}</span>
                              }
                            </>
                          )}
                          {item.status==='approved'
                            ?<span className="text-xs text-green-500 flex items-center gap-0.5"><CheckCircle className="w-3 h-3"/>No jogo!</span>
                            :<span className="text-xs text-amber-500 flex items-center gap-0.5"><Clock className="w-3 h-3"/>Em revisão</span>
                          }
                        </div>
                        <p className="text-slate-200 text-sm font-medium leading-relaxed">{item.text}</p>
                        {item.answer&&<p className="text-slate-500 text-xs mt-1">💡 Resposta: {item.answer}</p>}
                        {Array.isArray(item.choices)&&item.choices.length>0&&(
                          <p className="text-slate-500 text-xs mt-1">🔢 Alíneas: {item.choices.join(' / ')}</p>
                        )}
                        {Array.isArray(item.forbiddenWords)&&item.forbiddenWords.length>0&&(
                          <p className="text-slate-500 text-xs mt-1">🚫 Proibidas: {item.forbiddenWords.join(', ')}</p>
                        )}
                        {item.secretMission&&(
                          <p className="text-slate-500 text-xs mt-1">🕵️ Missão: {item.secretMission}</p>
                        )}
                        {item.correctQuestion&&(
                          <p className="text-slate-500 text-xs mt-1">✅ Certa: {item.correctQuestion}</p>
                        )}
                        {item.wrongQuestion&&(
                          <p className="text-slate-500 text-xs mt-1">❌ Errada: {item.wrongQuestion}</p>
                        )}
                        {item.civilWord&&(
                          <p className="text-slate-500 text-xs mt-1">✅ Civil: {item.civilWord}</p>
                        )}
                        {item.undercoverWord&&(
                          <p className="text-slate-500 text-xs mt-1">🕵️ Undercover: {item.undercoverWord}</p>
                        )}
                        <p className="text-slate-600 text-xs mt-1.5">@{item.author}</p>
                      </div>
                      <button type="button" onClick={() => toggleVote(item._id)}
                        title={voted.has(item._id) ? 'Retirar voto' : 'Gostei'}
                        className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border flex-shrink-0 transition-all ${voted.has(item._id) ? 'bg-violet-600/25 border-violet-500/60 text-violet-300 hover:bg-violet-600/15' : 'bg-white/[0.04] border-white/[0.07] text-slate-400 hover:text-violet-400 hover:border-violet-500/30'}`}>
                        <ThumbsUp className={`w-4 h-4 ${voted.has(item._id) ? 'fill-current' : ''}`}/>
                        <span className="text-xs font-bold">{item.votes}</span>
                        {voted.has(item._id) && <span className="text-[10px] text-violet-400/80 leading-none">Retirar</span>}
                      </button>
                    </motion.div>
                  )
                })
              }
            </motion.div>
          )}

          {/* ── SUBMIT CARD ── */}
          {tab==='submit_card'&&(
            <motion.div key="card" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-4">
              <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-5 space-y-5">
                <h3 className="text-white font-bold text-lg">✏️ Submeter Carta</h3>

                {/* Step 1: Mode */}
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wider mb-2 block">1. Para que modo?</label>
                  <div className="space-y-2">
                    {MODES.map(m=>(
                      <button key={m.id} onClick={()=>{setCMode(m.id);resetCardFields(); if(m.id==='mememix') setCType('legenda')}}
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm font-semibold text-left transition-all ${cMode===m.id?m.color:'bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-400'}`}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 2: Black/White for Cards mode OR category for other modes */}
                {cMode && isCardsMode && (
                  <div>
                    <label className="text-slate-400 text-xs uppercase tracking-wider mb-2 block">2. Tipo de carta</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={()=>setCIsBlack(false)}
                        className={`px-3 py-3 rounded-xl border text-sm font-semibold transition-all ${!cIsBlack?'bg-white/90 border-white text-slate-900':'bg-slate-800 border-slate-600 text-slate-400'}`}>
                        ⬜ Branca<br/><span className="text-xs font-normal opacity-70">resposta / piada</span>
                      </button>
                      <button onClick={()=>setCIsBlack(true)}
                        className={`px-3 py-3 rounded-xl border text-sm font-semibold transition-all ${cIsBlack?'bg-slate-900 border-white/50 text-white':'bg-slate-800 border-slate-600 text-slate-400'}`}>
                        ⬛ Preta<br/><span className="text-xs font-normal opacity-70">pergunta com ___</span>
                      </button>
                    </div>
                  </div>
                )}

                {needsCardType && (
                  <div>
                    <label className="text-slate-400 text-xs uppercase tracking-wider mb-2 block">{isDrinkMode ? '2. Baralho' : '2. Tipo de carta'}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedModeObj.cardTypes.map(ct=>(
                        <button key={ct.id} onClick={()=>{
                          setCType(ct.id)
                          setCSpecialType('')
                          setCAnswer('')
                          setCText('')
                          setCSecretMission('')
                          setCCorrectQuestion('')
                          setCWrongQuestion('')
                          setCChoices(ct.id === 'preferias' ? ['', ''] : ['', '', '', ''])
                          setCForbiddenWords(['','','','',''])
                        }}
                          className={`px-3 py-2.5 rounded-xl border text-sm font-semibold text-left transition-all ${cType===ct.id?'bg-violet-600/30 border-violet-500 text-violet-200':'bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-400'}`}>
                          {ct.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 3: Card content */}
                {cMode && isCardsMode && (
                  <div>
                    <label className="text-slate-400 text-xs uppercase tracking-wider mb-2 block">3. Texto da carta</label>
                    <textarea value={cText} onChange={e=>setCText(e.target.value)}
                      placeholder={cIsBlack ? 'Escreve a pergunta... usa ___ para espaços' : 'Escreve a resposta ou piada...'}
                      rows={3} className={inp+' resize-none'}/>
                    {cText && (
                      <div className={`mt-2 rounded-xl p-3 border text-sm ${cIsBlack?'bg-black border-white/15 text-white':'bg-white border-slate-200 text-slate-900'}`}>
                        {cText}
                      </div>
                    )}
                  </div>
                )}

                {showMisterPair && (
                  <div className="space-y-3">
                    <label className="text-slate-400 text-xs uppercase tracking-wider block">2. Par de palavras</label>
                    <p className="text-slate-500 text-xs">Obrigatório: palavra dos <b className="text-green-400">civis</b> e palavra do <b className="text-blue-400">undercover</b> (infiltrado). Mister White não tem palavra.</p>
                    <input value={cCivilWord} onChange={e=>setCCivilWord(e.target.value)}
                      placeholder="Palavra civil — ex: Pizza"
                      className={inp}/>
                    <input value={cUndercoverWord} onChange={e=>setCUndercoverWord(e.target.value)}
                      placeholder="Palavra undercover — ex: Focaccia (parecida mas diferente)"
                      className={inp}/>
                  </div>
                )}

                {showMememixLegenda && (
                  <div>
                    <label className="text-slate-400 text-xs uppercase tracking-wider mb-2 block">2. Legenda MemeMix</label>
                    <p className="text-slate-500 text-xs mb-2">Frase curta para combinar com memes — estilo «Quando…».</p>
                    <textarea value={cText} onChange={e=>setCText(e.target.value)}
                      placeholder={MEMEMIX_LEGENDA_PLACEHOLDER}
                      rows={3} className={inp+' resize-none'}/>
                    {cText && (
                      <div className="mt-2 rounded-xl p-3 border text-sm bg-white border-slate-200 text-slate-900">
                        {cText}
                      </div>
                    )}
                  </div>
                )}

                {showEspecialPicker && (
                  <div>
                    <label className="text-slate-400 text-xs uppercase tracking-wider mb-2 block">3. Tipo especial</label>
                    <p className="text-slate-500 text-xs mb-2">Cartas do baralho Especiais — escolhe o tipo.</p>
                    <div className="grid grid-cols-2 gap-2">
                      {DRINK_ESPECIAL_TYPES.map(st => (
                        <button key={st.id} type="button" onClick={() => {
                          setCSpecialType(st.id)
                          setCText('')
                          setCSecretMission('')
                          setCCorrectQuestion('')
                          setCWrongQuestion('')
                        }}
                          className={`px-3 py-2.5 rounded-xl border text-sm font-semibold text-left transition-all ${cSpecialType === st.id ? 'bg-violet-600/30 border-violet-500 text-violet-200' : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-400'}`}>
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {showImpostor && cType && (
                  <div className="space-y-3">
                    <label className="text-slate-400 text-xs uppercase tracking-wider block">{showDrinkImpostor ? '4. Perguntas do Impostor' : '3. Perguntas do Impostor'}</label>
                    <p className="text-slate-500 text-xs">{showDrinkImpostor ? 'Baralho Especiais — pergunta «certa» e «errada» para o infiltrado.' : 'No mapa Amigos: pergunta «certa» e «errada» que o infiltrado vê.'}</p>
                    <input value={cCorrectQuestion} onChange={e=>setCCorrectQuestion(e.target.value)}
                      placeholder="Pergunta certa (ex: Quem arrasava na pista de dança?)"
                      className={inp}/>
                    <input value={cWrongQuestion} onChange={e=>setCWrongQuestion(e.target.value)}
                      placeholder="Pergunta errada (ex: Quem tropeça a caminhar em linha reta?)"
                      className={inp}/>
                  </div>
                )}

                {showDrinkAgent && (
                  <div>
                    <label className="text-slate-400 text-xs uppercase tracking-wider mb-2 block">4. Missão secreta</label>
                    <textarea value={cSecretMission} onChange={e=>setCSecretMission(e.target.value)}
                      placeholder="Ex: Faz duas pessoas repetirem a mesma palavra tua."
                      rows={3} className={inp+' resize-none'}/>
                  </div>
                )}

                {showDrinkPreferencia && cType && (
                  <div>
                    <label className="text-slate-400 text-xs uppercase tracking-wider mb-2 block">3. As duas opções</label>
                    <p className="text-slate-500 text-xs mb-2">O dilema «preferias X ou Y?» — não escrevas aqui quem bebe.</p>
                    <div className="space-y-2">
                      <input value={cChoices[0] ?? ''} onChange={e=>setCChoices(cs=>[e.target.value, cs[1] ?? ''])}
                        placeholder="Opção A — ex: Nunca mais viajar"
                        className={inp}/>
                      <input value={cChoices[1] ?? ''} onChange={e=>setCChoices(cs=>[cs[0] ?? '', e.target.value])}
                        placeholder="Opção B — ex: Nunca mais usar redes sociais"
                        className={inp}/>
                    </div>
                  </div>
                )}

                {showDrinkPreferencia && preferChoicesOk && (
                  <div>
                    <label className="text-slate-400 text-xs uppercase tracking-wider mb-2 block">4. Quem bebe?</label>
                    <textarea value={cText} onChange={e=>setCText(e.target.value)}
                      placeholder="Ex: Minoria bebe 1"
                      rows={2} className={inp+' resize-none'}/>
                  </div>
                )}

                {cMode && !isCardsMode && (showDrinkText || showMapText) && cType && (
                  <div>
                    <label className="text-slate-400 text-xs uppercase tracking-wider mb-2 block">{showEspecialPicker ? '4. Texto da carta' : '3. Texto da carta'}</label>
                    <textarea value={cText} onChange={e=>setCText(e.target.value)}
                      placeholder={
                        isDrinkMode && DRINK_BARALHO_PLACEHOLDERS[cType]
                          ? DRINK_BARALHO_PLACEHOLDERS[cType]
                          : isDrinkMode && cSpecialType && DRINK_BARALHO_PLACEHOLDERS[cSpecialType]
                          ? DRINK_BARALHO_PLACEHOLDERS[cSpecialType]
                          : cType === 'telepatia' ? 'Ex: Tema: coisas que há numa cozinha. Digam uma palavra ao mesmo tempo.'
                          : cType === 'perguntas' ? 'Escreve a pergunta de cultura, história, música, etc.'
                          : cType === 'proibido' ? 'Escreve a palavra que a equipa tem de adivinhar.'
                          : cType === 'desenho' ? 'Escreve o que tem de ser desenhado.'
                          : cType === 'mimica' ? 'Escreve o que tem de ser representado por gestos.'
                          : 'Escreve o desafio ou instrução completa.'
                      }
                      rows={3} className={inp+' resize-none'}/>
                    {cText && (
                      <div className="mt-2 rounded-xl p-3 border text-sm bg-white border-slate-200 text-slate-900">
                        {cText}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 4: Answer (only for question-type cards in non-cards modes) */}
                {showAnswerField && cText && (
                  <div>
                    <label className="text-slate-400 text-xs uppercase tracking-wider mb-2 block">
                      4. Resposta correta
                    </label>
                    <input value={cAnswer} onChange={e=>setCAnswer(e.target.value)}
                      placeholder="Qual é a resposta correta?"
                      className={inp}/>
                    <p className="text-slate-600 text-xs mt-1">Obrigatório para perguntas, para aparecer no jogo e no admin.</p>
                    <div className="mt-3 space-y-2">
                      {cChoices.map((choice, idx)=>(
                        <input key={idx} value={choice} onChange={e=>setCChoices(cs=>cs.map((c,i)=>i===idx?e.target.value:c))}
                          placeholder={`Alínea ${String.fromCharCode(65+idx)} (opcional)`} className={inp}/>
                      ))}
                    </div>
                  </div>
                )}

                {showForbiddenField && cText && (
                  <div>
                    <label className="text-slate-400 text-xs uppercase tracking-wider mb-2 block">
                      4. Palavras proibidas
                    </label>
                    <div className="space-y-2">
                      {cForbiddenWords.map((word, idx)=>(
                        <input key={idx} value={word} onChange={e=>setCForbiddenWords(ws=>ws.map((w,i)=>i===idx?e.target.value:w))}
                          placeholder={`Palavra proibida ${idx+1}`} className={inp}/>
                      ))}
                    </div>
                    <p className="text-slate-600 text-xs mt-1">No jogo, a equipa tem de adivinhar a palavra principal sem usar estas 5 pistas.</p>
                  </div>
                )}

                {/* Author */}
                {((cMode && isCardsMode && cText) || (cMode && showMisterPair && cCivilWord.trim() && cUndercoverWord.trim()) || (cMode && showMememixLegenda && cText.trim()) || (cMode && !isCardsMode && !isMisterMode && !isMememixMode && cType && (
                  showDrinkAgent ? cSecretMission.trim()
                  : showImpostor ? (cCorrectQuestion.trim() && cWrongQuestion.trim())
                  : showDrinkPreferencia ? (preferChoicesOk && cText.trim())
                  : cText.trim()
                ))) && (
                  <input value={cAuthor} onChange={e=>setCAuthor(e.target.value)} placeholder="O teu nome (opcional)" className={inp}/>
                )}

                <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.97}} onClick={submitCard}
                  disabled={
                    !cMode
                    || (needsCardType && !cType)
                    || (isCardsMode && !cText.trim())
                    || (showMisterPair && (!cCivilWord.trim() || !cUndercoverWord.trim()))
                    || (showMememixLegenda && !cText.trim())
                    || (showEspecialPicker && !cSpecialType)
                    || (showDrinkAgent && !cSecretMission.trim())
                    || (showImpostor && (!cCorrectQuestion.trim() || !cWrongQuestion.trim()))
                    || (showDrinkPreferencia && (!preferChoicesOk || !cText.trim()))
                    || (showDrinkText && !cText.trim())
                    || (showMapText && !cText.trim())
                    || (showAnswerField && !cAnswer.trim())
                    || (showForbiddenField && cForbiddenWords.filter(w=>w.trim()).length!==5)
                    || submitting
                  }
                  className="w-full bg-gradient-to-r from-violet-600 to-purple-700 text-white font-bold rounded-2xl py-4 flex items-center justify-center gap-2 disabled:opacity-40">
                  <Send className="w-4 h-4"/>{submitting?'A submeter...':'Submeter Carta'}
                </motion.button>
              </div>

              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
                <p className="text-amber-400 font-semibold text-sm mb-2">📋 Como funciona</p>
                <ul className="text-slate-400 text-xs space-y-1">
                  <li>• <b className="text-white">Modo Cartas</b>: escolhe apenas branca ou preta</li>
                  <li>• <b className="text-white">Perguntas</b>: têm de ter resposta correta</li>
                  <li>• <b className="text-white">Palavra Tabu</b>: tem de ter 5 palavras proibidas</li>
                  <li>• <b className="text-white">Modo Beber</b>: escolhe o baralho (Waterfall, Eu Nunca, Regras, Especiais…)</li>
                  <li>• <b className="text-white">Especiais</b>: Agente, Impostor, Aliança ou Mini Boss</li>
                  <li>• <b className="text-white">Preferias?</b>: primeiro as 2 opções, depois quem bebe</li>
                  <li>• <b className="text-white">Mister White</b>: par civil + undercover (sempre os dois)</li>
                  <li>• <b className="text-white">MemeMix</b>: legendas curtas para combinar com memes</li>
                  <li>• <b className="text-white">Impostor</b> (Amigos/Beber): pergunta certa + pergunta errada</li>
                  <li>• <b className="text-white">Agente</b>: só a missão secreta</li>
                  <li>• Os votos ajudam o admin a escolher o melhor conteúdo</li>
                  <li>• Só entra no jogo depois de aprovação no painel admin</li>
                </ul>
              </div>
            </motion.div>
          )}

          {/* ── SUBMIT IDEA ── */}
          {tab==='submit_idea'&&(
            <motion.div key="idea" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-4">
              <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-5 space-y-4">
                <h3 className="text-white font-bold text-lg flex items-center gap-2"><Lightbulb className="text-amber-400 w-5 h-5"/>Submeter Ideia</h3>
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wider mb-2 block">Tipo de ideia</label>
                  <div className="grid grid-cols-2 gap-2">
                    {IDEA_TYPES.map(t=>(
                      <button key={t.id} onClick={()=>setIType(t.id)}
                        className={`px-3 py-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${iType===t.id?'bg-amber-500/20 border-amber-500/50 text-amber-200':'bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-400'}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                {iType&&(
                  <div>
                    <label className="text-slate-400 text-xs uppercase tracking-wider mb-2 block">Descreve a tua ideia</label>
                    <textarea value={iText} onChange={e=>setIText(e.target.value)}
                      placeholder="Descreve com detalhe. Como funcionaria?" rows={5} className={inp+' resize-none'}/>
                    <p className="text-slate-600 text-xs mt-1">{iText.length}/500</p>
                  </div>
                )}
                <input value={iAuthor} onChange={e=>setIAuthor(e.target.value)} placeholder="O teu nome (opcional)" className={inp}/>
                <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.97}} onClick={submitIdea}
                  disabled={!iType||iText.trim().length<20||submitting}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-black font-bold rounded-2xl py-4 flex items-center justify-center gap-2 disabled:opacity-40">
                  <Lightbulb className="w-4 h-4"/>{submitting?'A submeter...':'Submeter Ideia'}
                </motion.button>
                {iText.length>0&&iText.length<20&&<p className="text-amber-500/70 text-xs text-center">{20-iText.length} caracteres em falta</p>}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </PageShell>
  )
}
