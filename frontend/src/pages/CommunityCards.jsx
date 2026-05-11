import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ThumbsUp, Send, Sparkles, Clock, CheckCircle, Lightbulb } from 'lucide-react'
import { api } from '../utils/api'

const MODES = [
  {
    id:'friends', label:'👥 Modo Amigos', color:'bg-cyan-500/15 border-cyan-500/40 text-cyan-300',
    showBlackWhite:false, showAnswer:true,
    cardTypes:[
      {id:'mimica',label:'🎭 Mímica'},{id:'desenho',label:'🎨 Desenho'},
      {id:'palavra',label:'💬 Palavra'},{id:'acao',label:'⚡ Ação'},
      {id:'verdade',label:'❓ Verdade'},{id:'consequencia',label:'🎲 Consequência'},
    ],
  },
  {
    id:'family', label:'🏡 Modo Família', color:'bg-sky-500/15 border-sky-500/40 text-sky-300',
    showBlackWhite:false, showAnswer:true,
    cardTypes:[
      {id:'cultura',label:'📚 Cultura'},{id:'desporto',label:'⚽ Desporto'},
      {id:'musica',label:'🎵 Música'},{id:'cinema',label:'🎬 Cinema'},
      {id:'mimica',label:'🎭 Mímica'},{id:'desenho',label:'🎨 Desenho'},
    ],
  },
  {
    id:'couple', label:'💕 Modo Casal', color:'bg-rose-500/15 border-rose-500/40 text-rose-300',
    showBlackWhite:false, showAnswer:true,
    cardTypes:[
      {id:'erotico',label:'🔥 Erótico'},{id:'verdade',label:'❓ Verdade'},
      {id:'acao',label:'⚡ Ação'},{id:'roleplay',label:'🎭 Roleplay'},
      {id:'quiz',label:'💬 Quiz'},
    ],
  },
  {
    id:'drink', label:'🍺 Modo Beber', color:'bg-amber-500/15 border-amber-500/40 text-amber-300',
    showBlackWhite:false, showAnswer:false,
    cardTypes:[
      {id:'beber',label:'🍺 Beber'},{id:'regra',label:'📜 Regra'},
      {id:'desafio',label:'⚡ Desafio'},{id:'poder',label:'👑 Poder'},{id:'sorte',label:'🍀 Sorte/Azar'},
    ],
  },
  {
    id:'cards', label:'🃏 Modo Cartas', color:'bg-yellow-500/15 border-yellow-500/40 text-yellow-300',
    showBlackWhite:true, showAnswer:false, // Only Cards mode shows black/white, no category needed
    cardTypes:[], // No category for cards mode — just black or white
  },
]

const IDEA_TYPES = [
  {id:'mode',label:'🎮 Novo Modo de Jogo'},
  {id:'minigame',label:'🎲 Novo Mini-jogo'},
  {id:'feature',label:'⚙️ Nova Funcionalidade'},
  {id:'other',label:'💡 Outra Ideia'},
]

// Card type that has answers (question types per mode)
const ANSWER_TYPES = ['verdade','cultura','desporto','musica','cinema','palavra','quiz','casal_pergunta']

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
  const [cAuthor,   setCAuthor]   = useState('')

  // Idea form state
  const [iType,   setIType]   = useState('')
  const [iText,   setIText]   = useState('')
  const [iAuthor, setIAuthor] = useState('')

  const selectedModeObj = MODES.find(m => m.id === cMode)
  const isCardsMode     = cMode === 'cards'
  // Show answer field when type is a question type
  const showAnswerField = selectedModeObj?.showAnswer && ANSWER_TYPES.includes(cType)

  const load = () => {
    setLoading(true)
    const p = {limit:200}
    if (statusFilter !== 'all') p.status = statusFilter
    if (modeFilter   !== 'all') p.mode   = modeFilter
    api.getCommunity(p)
      .then(d => { setItems(Array.isArray(d.items)?d.items:[]); setLoading(false) })
      .catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [statusFilter, modeFilter])

  const vote = async id => {
    if (voted.has(id)) return
    const nv = new Set([...voted,id]); setVoted(nv); saveVoted(nv)
    setItems(prev => prev.map(i => i._id===id ? {...i,votes:i.votes+1} : i))
    await api.voteCommunity(id)
  }

  const submitCard = async () => {
    if (!cMode || !cText.trim()) return
    if (!isCardsMode && !cType) return
    setSubmitting(true)
    await api.submitCommunity({
      submissionType:'card', mode:cMode,
      cardType:  isCardsMode ? 'geral' : cType,
      isBlack:   isCardsMode ? cIsBlack : false,
      text:      cText.trim(),
      answer:    cAnswer.trim() || undefined,
      author:    cAuthor.trim() || 'Anónimo',
    })
    setCMode(''); setCType(''); setCIsBlack(false); setCText(''); setCAnswer(''); setCAuthor('')
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
  const getIdeaLabel = id => IDEA_TYPES.find(t=>t.id===id)?.label||id

  const inp = 'w-full bg-slate-800 border border-slate-600 text-white rounded-xl px-3 py-2.5 outline-none focus:border-violet-500 text-sm placeholder-slate-500'

  const stats = {
    approved: items.filter(i=>i.status==='approved').length,
    pending:  items.filter(i=>i.status==='pending').length,
    votes:    items.reduce((s,i)=>s+i.votes,0),
  }

  return (
    <div className="min-h-screen bg-[#080b14] flex flex-col">
      <div className="px-4 pt-8 pb-4 flex items-center gap-3 max-w-lg mx-auto w-full">
        <button onClick={()=>navigate('/')} className="text-slate-400 hover:text-white p-1"><ChevronLeft className="w-5 h-5"/></button>
        <div className="flex-1">
          <h1 className="text-white font-black text-xl flex items-center gap-2"><Sparkles className="text-violet-400 w-5 h-5"/>Cartas da Comunidade</h1>
          <p className="text-slate-500 text-sm">25+ votos → entra automaticamente no jogo!</p>
        </div>
      </div>

      <AnimatePresence>
        {submitted&&(
          <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} exit={{opacity:0}}
            className="mx-4 max-w-lg mx-auto w-full mb-2 bg-green-500/15 border border-green-500/30 rounded-2xl p-3 text-center">
            <p className="text-green-400 font-bold">✅ Submetido! A aguardar votos da comunidade.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="px-4 max-w-lg mx-auto w-full mb-4">
        <div className="flex bg-white/[0.04] border border-white/[0.06] rounded-2xl p-1 gap-1">
          {[['browse','🃏 Ver'],['submit_card','✏️ Carta'],['submit_idea','💡 Ideia']].map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${tab===id?'bg-violet-600 text-white':'text-slate-400 hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 pb-8 max-w-lg mx-auto w-full">
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
              <div className="space-y-2">
                <div className="flex gap-1.5 overflow-x-auto pb-1" style={{scrollbarWidth:'none'}}>
                  {[['all','Todas'],['pending','Em revisão'],['approved','Aprovadas']].map(([id,l])=>(
                    <button key={id} onClick={()=>setStatusFilter(id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border flex-shrink-0 transition-all ${statusFilter===id?'bg-violet-600/30 border-violet-500 text-violet-300':'bg-white/[0.03] border-white/[0.06] text-slate-400'}`}>
                      {l}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1" style={{scrollbarWidth:'none'}}>
                  <button onClick={()=>setModeFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border flex-shrink-0 transition-all ${modeFilter==='all'?'bg-slate-600/30 border-slate-500 text-white':'bg-white/[0.03] border-white/[0.06] text-slate-400'}`}>
                    Todos
                  </button>
                  {MODES.map(m=>(
                    <button key={m.id} onClick={()=>setModeFilter(m.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border flex-shrink-0 transition-all ${modeFilter===m.id?m.color:'bg-white/[0.03] border-white/[0.06] text-slate-400'}`}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* List */}
              {loading?<p className="text-slate-400 text-center py-8">A carregar...</p>
                :items.length===0?<p className="text-slate-500 text-center py-8">Nenhuma submissão</p>
                :[...items].sort((a,b)=>b.votes-a.votes).map((item,i)=>{
                  const modeInfo=getModeInfo(item.mode)
                  return(
                    <motion.div key={item._id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.03}}
                      className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {item.submissionType==='idea'?(
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold flex items-center gap-1">
                              <Lightbulb className="w-3 h-3"/>{getIdeaLabel(item.ideaType)}
                            </span>
                          ):(
                            <>
                              {modeInfo&&<span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${modeInfo.color}`}>{modeInfo.label}</span>}
                              {item.cardType&&!isCardsMode&&<span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.1] text-slate-400">{modeInfo?.cardTypes.find(t=>t.id===item.cardType)?.label||item.cardType}</span>}
                              {item.isBlack&&<span className="text-xs px-2 py-0.5 rounded-full bg-slate-900 border border-white/20 text-white/60">⬛</span>}
                            </>
                          )}
                          {item.status==='approved'
                            ?<span className="text-xs text-green-500 flex items-center gap-0.5"><CheckCircle className="w-3 h-3"/>No jogo!</span>
                            :<span className="text-xs text-amber-500 flex items-center gap-0.5"><Clock className="w-3 h-3"/>Em revisão</span>
                          }
                        </div>
                        <p className="text-slate-200 text-sm font-medium leading-relaxed">{item.text}</p>
                        {item.answer&&<p className="text-slate-500 text-xs mt-1">💡 Resposta: {item.answer}</p>}
                        <p className="text-slate-600 text-xs mt-1.5">@{item.author}</p>
                      </div>
                      <button onClick={()=>vote(item._id)} disabled={voted.has(item._id)}
                        className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border flex-shrink-0 transition-all ${voted.has(item._id)?'bg-violet-600/20 border-violet-500/50 text-violet-400':'bg-white/[0.04] border-white/[0.07] text-slate-400 hover:text-violet-400'}`}>
                        <ThumbsUp className="w-4 h-4"/>
                        <span className="text-xs font-bold">{item.votes}</span>
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
                      <button key={m.id} onClick={()=>{setCMode(m.id);setCType('');setCIsBlack(false);setCAnswer('')}}
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

                {cMode && !isCardsMode && selectedModeObj?.cardTypes.length > 0 && (
                  <div>
                    <label className="text-slate-400 text-xs uppercase tracking-wider mb-2 block">2. Tipo de carta</label>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedModeObj.cardTypes.map(ct=>(
                        <button key={ct.id} onClick={()=>{setCType(ct.id);setCAnswer('')}}
                          className={`px-3 py-2.5 rounded-xl border text-sm font-semibold text-left transition-all ${cType===ct.id?'bg-violet-600/30 border-violet-500 text-violet-200':'bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-400'}`}>
                          {ct.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 3: Text */}
                {((cMode && isCardsMode) || (cMode && !isCardsMode && cType)) && (
                  <div>
                    <label className="text-slate-400 text-xs uppercase tracking-wider mb-2 block">
                      {isCardsMode ? '3.' : '3.'} Texto da carta
                    </label>
                    <textarea value={cText} onChange={e=>setCText(e.target.value)}
                      placeholder={
                        isCardsMode && cIsBlack ? 'Escreve a pergunta... usa ___ para espaços'
                        : isCardsMode ? 'Escreve a resposta ou piada...'
                        : 'Escreve o desafio, pergunta ou desafio...'
                      }
                      rows={3} className={inp+' resize-none'}/>
                    {/* Preview */}
                    {cText&&(
                      <div className={`mt-2 rounded-xl p-3 border text-sm ${isCardsMode&&cIsBlack?'bg-black border-white/15 text-white':'bg-white border-slate-200 text-slate-900'}`}>
                        {cText}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 4: Answer (only for question-type cards in non-cards modes) */}
                {showAnswerField && cText && (
                  <div>
                    <label className="text-slate-400 text-xs uppercase tracking-wider mb-2 block">
                      4. Resposta (opcional)
                    </label>
                    <input value={cAnswer} onChange={e=>setCAnswer(e.target.value)}
                      placeholder="Qual é a resposta correta? (deixa vazio se for subjetivo)"
                      className={inp}/>
                    <p className="text-slate-600 text-xs mt-1">Se for uma pergunta de cultura/música/etc, indica a resposta certa.</p>
                  </div>
                )}

                {/* Author */}
                {((cMode&&isCardsMode)||(cMode&&!isCardsMode&&cType))&&cText&&(
                  <input value={cAuthor} onChange={e=>setCAuthor(e.target.value)} placeholder="O teu nome (opcional)" className={inp}/>
                )}

                <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.97}} onClick={submitCard}
                  disabled={!cMode||(!isCardsMode&&!cType)||!cText.trim()||submitting}
                  className="w-full bg-gradient-to-r from-violet-600 to-purple-700 text-white font-bold rounded-2xl py-4 flex items-center justify-center gap-2 disabled:opacity-40">
                  <Send className="w-4 h-4"/>{submitting?'A submeter...':'Submeter Carta'}
                </motion.button>
              </div>

              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
                <p className="text-amber-400 font-semibold text-sm mb-2">📋 Como funciona</p>
                <ul className="text-slate-400 text-xs space-y-1">
                  <li>• <b className="text-white">Modo Cartas</b>: escolhe apenas branca ou preta</li>
                  <li>• <b className="text-white">Outros modos</b>: escolhe o tipo de carta dentro do modo</li>
                  <li>• Se for uma pergunta, podes incluir a resposta correta</li>
                  <li>• 25+ votos → entra automaticamente no jogo</li>
                  <li>• O admin pode aprovar manualmente a qualquer momento</li>
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
    </div>
  )
}
