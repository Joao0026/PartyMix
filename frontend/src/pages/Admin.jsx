import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Plus, Trash2, Check, X, ThumbsUp, ThumbsDown, BarChart2, Database, Users, Sparkles } from 'lucide-react'
import { api } from '../utils/api'

// ── SHARED STYLES ─────────────────────────────────────────────
const inp   = 'w-full bg-slate-800 border border-slate-600 text-white rounded-xl px-3 py-2.5 outline-none focus:border-violet-500 text-sm placeholder-slate-500'
const sel   = inp + ' cursor-pointer'
const card  = 'bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4'
const badge = (color) => `text-xs px-2 py-0.5 rounded-full font-semibold border ${color}`

// ── STATS TAB ──────────────────────────────────────────────────
function StatsTab() {
  const [stats, setStats]       = useState(null)
  const [counts, setCounts]     = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      api.getCommunityStats(),
      Promise.all([
        api.getChallenges({}).then(r => Array.isArray(r) ? r.length : 0),
        api.getCards({}).then(r => Array.isArray(r) ? r.length : 0),
        api.getDice({}).then(r => Array.isArray(r) ? r.length : 0),
      ])
    ]).then(([s, [ch, ca, di]]) => {
      setStats(s); setCounts({ challenges: ch, cards: ca, dice: di }); setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-slate-400 text-center py-8">A carregar...</p>

  const boxes = [
    { label: 'Desafios',         n: counts?.challenges || 0,   icon:'📋', color:'from-cyan-600 to-blue-700' },
    { label: 'Cartas',           n: counts?.cards || 0,        icon:'🃏', color:'from-amber-500 to-yellow-600' },
    { label: 'Opções de Dados',  n: counts?.dice || 0,         icon:'🎲', color:'from-rose-500 to-pink-600' },
    { label: 'Subm. pendentes',  n: stats?.pending || 0,       icon:'⏳', color:'from-orange-500 to-amber-600' },
    { label: 'Subm. aprovadas',  n: stats?.approved || 0,      icon:'✅', color:'from-green-500 to-emerald-600' },
    { label: 'Subm. rejeitadas', n: stats?.rejected || 0,      icon:'❌', color:'from-slate-500 to-slate-700' },
  ]

  return (
    <div className="space-y-4">
      <h3 className="text-white font-bold text-lg">📊 Estatísticas</h3>
      <div className="grid grid-cols-2 gap-3">
        {boxes.map(b => (
          <div key={b.label} className={`bg-gradient-to-br ${b.color} rounded-2xl p-4 text-center`}>
            <p className="text-3xl mb-1">{b.icon}</p>
            <p className="text-white font-black text-3xl">{b.n}</p>
            <p className="text-white/70 text-xs">{b.label}</p>
          </div>
        ))}
      </div>
      <div className={card}>
        <p className="text-slate-400 text-sm text-center">
          Backend: <a href="/api/health" target="_blank" className="text-violet-400 underline">/api/health</a>
        </p>
      </div>
    </div>
  )
}

// ── CHALLENGES TAB ────────────────────────────────────────────
const CATS_CH  = ['mimica','desenho','palavra','acao','verdade','consequencia','cultura','desporto','musica','cinema','erotico','dados','casal_pergunta']
const MODES_CH = ['couple','friends','family','all']
const DIFFS    = ['facil','medio','dificil']

function ChallengesTab() {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState({ mode_type:'', category:'' })
  const [form,    setForm]    = useState({ text:'', category:'mimica', mode_type:'friends', difficulty:'medio', time_limit:60, sips_penalty:2, is_ongoing:false, ongoing_rounds:0, ongoing_instruction:'' })
  const [saving,  setSaving]  = useState(false)
  const [search,  setSearch]  = useState('')

  const load = () => {
    setLoading(true)
    const p = {}
    if (filter.mode_type) p.mode_type = filter.mode_type
    if (filter.category)  p.category  = filter.category
    api.getChallenges(p).then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false) })
  }

  useEffect(() => { load() }, [filter])

  const save = async () => {
    if (!form.text.trim()) return
    setSaving(true)
    await api.createChallenge(form)
    setForm({ text:'', category:'mimica', mode_type:'friends', difficulty:'medio', time_limit:60, sips_penalty:2, is_ongoing:false, ongoing_rounds:0, ongoing_instruction:'' })
    setSaving(false); load()
  }

  const remove = async id => { await api.deleteChallenge(id); load() }

  const filtered = items.filter(i => !search || i.text.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-4">
      {/* Add form */}
      <div className={card + ' space-y-3'}>
        <h3 className="text-white font-semibold">Novo Desafio</h3>
        <textarea value={form.text} onChange={e=>setForm(f=>({...f,text:e.target.value}))}
          placeholder="Texto do desafio..." className={inp + ' resize-none h-20'}/>
        <div className="grid grid-cols-2 gap-2">
          <select value={form.category}  onChange={e=>setForm(f=>({...f,category:e.target.value}))}  className={sel}>{CATS_CH.map(c=><option key={c}>{c}</option>)}</select>
          <select value={form.mode_type} onChange={e=>setForm(f=>({...f,mode_type:e.target.value}))} className={sel}>{MODES_CH.map(m=><option key={m}>{m}</option>)}</select>
          <select value={form.difficulty} onChange={e=>setForm(f=>({...f,difficulty:e.target.value}))} className={sel}>{DIFFS.map(d=><option key={d}>{d}</option>)}</select>
          <input type="number" value={form.time_limit} onChange={e=>setForm(f=>({...f,time_limit:+e.target.value}))} placeholder="Tempo (s)" className={inp}/>
          <input type="number" value={form.sips_penalty} onChange={e=>setForm(f=>({...f,sips_penalty:+e.target.value}))} placeholder="Golos" className={inp}/>
        </div>
        <label className="flex items-center gap-2 text-slate-300 text-sm cursor-pointer">
          <input type="checkbox" checked={form.is_ongoing} onChange={e=>setForm(f=>({...f,is_ongoing:e.target.checked}))} className="rounded accent-violet-500"/>
          Desafio Contínuo
        </label>
        {form.is_ongoing && (
          <div className="grid grid-cols-2 gap-2">
            <input type="number" value={form.ongoing_rounds} onChange={e=>setForm(f=>({...f,ongoing_rounds:+e.target.value}))} placeholder="Rondas" className={inp}/>
            <input value={form.ongoing_instruction} onChange={e=>setForm(f=>({...f,ongoing_instruction:e.target.value}))} placeholder="Instrução..." className={inp}/>
          </div>
        )}
        <motion.button whileTap={{scale:0.97}} onClick={save} disabled={!form.text.trim()||saving}
          className="w-full bg-gradient-to-r from-violet-600 to-purple-700 text-white font-bold rounded-xl py-3 disabled:opacity-40 flex items-center justify-center gap-2">
          <Plus className="w-4 h-4"/> {saving ? 'A guardar...' : 'Adicionar'}
        </motion.button>
      </div>

      {/* Filters + search */}
      <div className="flex gap-2">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar..." className={inp + ' flex-1'}/>
        <select value={filter.mode_type} onChange={e=>setFilter(f=>({...f,mode_type:e.target.value}))} className={sel + ' w-28'}>
          <option value="">Modo</option>{MODES_CH.map(m=><option key={m}>{m}</option>)}
        </select>
      </div>

      {/* List */}
      <p className="text-slate-500 text-xs">{filtered.length} desafios</p>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {loading ? <p className="text-slate-400 text-center py-4">A carregar...</p>
          : filtered.map(item => (
          <div key={item._id} className={card + ' flex items-start gap-3'}>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm">{item.text}</p>
              <div className="flex gap-1.5 mt-1 flex-wrap">
                <span className={badge('bg-violet-500/20 border-violet-500/40 text-violet-300')}>{item.category}</span>
                <span className={badge('bg-cyan-500/20 border-cyan-500/40 text-cyan-300')}>{item.mode_type}</span>
                <span className={badge(item.difficulty==='facil'?'bg-green-500/20 border-green-500/40 text-green-300':item.difficulty==='dificil'?'bg-red-500/20 border-red-500/40 text-red-300':'bg-amber-500/20 border-amber-500/40 text-amber-300')}>{item.difficulty}</span>
              </div>
            </div>
            <button onClick={()=>remove(item._id)} className="text-slate-600 hover:text-red-400 flex-shrink-0 p-1 transition-colors"><Trash2 className="w-4 h-4"/></button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── CARDS TAB ────────────────────────────────────────────────
const CATS_CARD = ['geral','adulto','cultura','absurdo','regra','beber','desafio','poder','sorte']

function CardsTab() {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [form,    setForm]    = useState({ text:'', category:'geral', is_black:false })
  const [saving,  setSaving]  = useState(false)
  const [filter,  setFilter]  = useState('')
  const [search,  setSearch]  = useState('')

  const load = () => {
    setLoading(true)
    const p = {}
    if (filter) p.is_black = filter
    api.getCards(p).then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false) })
  }

  useEffect(() => { load() }, [filter])

  const save = async () => {
    if (!form.text.trim()) return
    setSaving(true); await api.createCard(form)
    setForm({ text:'', category:'geral', is_black:false })
    setSaving(false); load()
  }

  const remove = async id => { await api.deleteCard(id); load() }
  const filtered = items.filter(i => !search || i.text.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-4">
      <div className={card + ' space-y-3'}>
        <h3 className="text-white font-semibold">Nova Carta</h3>
        <textarea value={form.text} onChange={e=>setForm(f=>({...f,text:e.target.value}))}
          placeholder="Texto da carta... usa ___ para espaços em cartas pretas" className={inp + ' resize-none h-20'}/>
        <div className="grid grid-cols-2 gap-2">
          <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} className={sel}>
            {CATS_CARD.map(c=><option key={c}>{c}</option>)}
          </select>
          <select value={String(form.is_black)} onChange={e=>setForm(f=>({...f,is_black:e.target.value==='true'}))} className={sel}>
            <option value="false">⬜ Branca (resposta)</option>
            <option value="true">⬛ Preta (pergunta)</option>
          </select>
        </div>
        {/* Preview */}
        {form.text && (
          <div className={`rounded-xl p-3 border ${form.is_black?'bg-black border-white/20 text-white':'bg-white border-slate-200 text-slate-900'}`}>
            <p className="text-sm font-semibold">{form.text}</p>
          </div>
        )}
        <motion.button whileTap={{scale:0.97}} onClick={save} disabled={!form.text.trim()||saving}
          className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold rounded-xl py-3 disabled:opacity-40 flex items-center justify-center gap-2">
          <Plus className="w-4 h-4"/> {saving ? 'A guardar...' : 'Adicionar'}
        </motion.button>
      </div>

      <div className="flex gap-2">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar..." className={inp + ' flex-1'}/>
        <select value={filter} onChange={e=>setFilter(e.target.value)} className={sel + ' w-32'}>
          <option value="">Todas</option>
          <option value="false">Brancas</option>
          <option value="true">Pretas</option>
        </select>
      </div>

      <p className="text-slate-500 text-xs">{filtered.length} cartas</p>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {loading ? <p className="text-slate-400 text-center py-4">A carregar...</p>
          : filtered.map(item => (
          <div key={item._id} className={`flex items-start gap-3 rounded-xl p-3 border ${item.is_black?'bg-black border-white/15':'bg-white/90 border-slate-200'}`}>
            <p className={`flex-1 text-sm font-medium ${item.is_black?'text-white':'text-slate-900'}`}>{item.text}</p>
            <button onClick={()=>remove(item._id)} className="text-slate-400 hover:text-red-400 flex-shrink-0 transition-colors"><Trash2 className="w-4 h-4"/></button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── COMMUNITY TAB ─────────────────────────────────────────────
const MODE_COLORS = {
  friends:'bg-cyan-500/20 border-cyan-500/40 text-cyan-300',
  family: 'bg-sky-500/20 border-sky-500/40 text-sky-300',
  couple: 'bg-rose-500/20 border-rose-500/40 text-rose-300',
  drink:  'bg-amber-500/20 border-amber-500/40 text-amber-300',
  cards:  'bg-yellow-500/20 border-yellow-500/40 text-yellow-300',
}
const MODE_LABELS = { friends:'👥 Amigos', family:'🏡 Família', couple:'💕 Casal', drink:'🍺 Beber', cards:'🃏 Cartas' }

function CommunityTab() {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('pending')
  const [working, setWorking] = useState({})

  const load = () => {
    setLoading(true)
    api.getCommunity({ status: filter, limit: 100 }).then(d => {
      setItems(Array.isArray(d.items) ? d.items : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [filter])

  const approve = async id => {
    setWorking(w => ({...w, [id]:'approving'}))
    await api.approveCommunity(id)
    setWorking(w => ({...w, [id]:null}))
    load()
  }

  const reject = async id => {
    setWorking(w => ({...w, [id]:'rejecting'}))
    await api.rejectCommunity(id)
    setWorking(w => ({...w, [id]:null}))
    load()
  }

  const remove = async id => {
    await api.deleteCommunity(id)
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[['pending','⏳ Pendentes'],['approved','✅ Aprovadas'],['rejected','❌ Rejeitadas']].map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${filter===v?'bg-violet-600/30 border-violet-500 text-violet-200':'bg-white/[0.03] border-white/[0.07] text-slate-400'}`}>
            {l}
          </button>
        ))}
      </div>

      {loading ? <p className="text-slate-400 text-center py-8">A carregar...</p>
        : items.length === 0 ? <p className="text-slate-500 text-center py-8">Nenhuma submissão neste estado</p>
        : (
        <div className="space-y-3">
          {items.map(item => (
            <motion.div key={item._id} layout className={card + ' space-y-3'}>
              {/* Header badges */}
              <div className="flex flex-wrap gap-1.5">
                {item.submissionType === 'idea' ? (
                  <span className={badge('bg-amber-500/20 border-amber-500/40 text-amber-300')}>💡 Ideia: {item.ideaType}</span>
                ) : (
                  <>
                    {item.mode && <span className={badge(MODE_COLORS[item.mode] || '')}>{MODE_LABELS[item.mode] || item.mode}</span>}
                    {item.cardType && <span className={badge('bg-white/10 border-white/20 text-slate-300')}>{item.cardType}</span>}
                    {item.isBlack && <span className={badge('bg-slate-900 border-white/20 text-white/60')}>⬛ Preta</span>}
                  </>
                )}
                <span className={badge('bg-violet-500/20 border-violet-500/40 text-violet-300')}>
                  <ThumbsUp className="w-3 h-3 inline mr-0.5"/>{item.votes}
                </span>
                <span className="text-slate-600 text-xs">@{item.author}</span>
              </div>

              {/* Text */}
              <p className="text-white font-medium leading-relaxed">{item.text}</p>

              {/* Preview for cards mode */}
              {item.mode === 'cards' && (
                <div className={`rounded-xl p-3 border text-sm ${item.isBlack?'bg-black border-white/15 text-white':'bg-white border-slate-200 text-slate-900'}`}>
                  {item.text}
                </div>
              )}

              {/* Actions */}
              {filter === 'pending' && (
                <div className="flex gap-2">
                  <motion.button whileTap={{scale:0.95}} onClick={() => approve(item._id)}
                    disabled={!!working[item._id]}
                    className="flex-1 bg-green-500/20 border border-green-500/40 text-green-400 font-bold rounded-xl py-2.5 flex items-center justify-center gap-1.5 text-sm disabled:opacity-50">
                    <Check className="w-4 h-4"/>
                    {working[item._id] === 'approving' ? 'A aprovar...' : '✅ Aprovar + Adicionar ao Jogo'}
                  </motion.button>
                  <button onClick={() => reject(item._id)} disabled={!!working[item._id]}
                    className="flex-1 bg-red-500/20 border border-red-500/40 text-red-400 font-bold rounded-xl py-2.5 flex items-center justify-center gap-1.5 text-sm disabled:opacity-50">
                    <X className="w-4 h-4"/>
                    {working[item._id] === 'rejecting' ? 'A rejeitar...' : '❌ Rejeitar'}
                  </button>
                </div>
              )}
              {filter !== 'pending' && (
                <div className="flex justify-between items-center">
                  <span className={filter === 'approved' ? 'text-green-400 text-sm font-semibold' : 'text-red-400 text-sm font-semibold'}>
                    {filter === 'approved' ? '✅ Aprovada e adicionada ao jogo' : '❌ Rejeitada'}
                  </span>
                  <button onClick={() => remove(item._id)} className="text-slate-600 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4"/></button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── DICE TAB ──────────────────────────────────────────────────
function DiceTab() {
  const [items,   setItems]   = useState([])
  const [form,    setForm]    = useState({ text:'', dice_type:'body_part' })
  const [saving,  setSaving]  = useState(false)

  const load = () => api.getDice().then(d => setItems(Array.isArray(d) ? d : []))
  useEffect(() => { load() }, [])

  const save = async () => {
    if (!form.text.trim()) return
    setSaving(true); await api.createDice(form)
    setForm(f => ({...f, text:''}))
    setSaving(false); load()
  }

  const remove = async id => { await api.deleteDice(id); load() }

  return (
    <div className="space-y-4">
      <div className={card + ' space-y-3'}>
        <h3 className="text-white font-semibold">Nova Opção de Dado</h3>
        <input value={form.text} onChange={e=>setForm(f=>({...f,text:e.target.value}))} placeholder="Ex: Lábios / Massagem suave" className={inp}/>
        <select value={form.dice_type} onChange={e=>setForm(f=>({...f,dice_type:e.target.value}))} className={sel}>
          <option value="body_part">🫀 Parte do Corpo</option>
          <option value="action">⚡ Ação</option>
        </select>
        <button onClick={save} disabled={!form.text.trim()||saving}
          className="w-full bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold rounded-xl py-3 disabled:opacity-40 flex items-center justify-center gap-2">
          <Plus className="w-4 h-4"/> {saving ? 'A guardar...' : 'Adicionar'}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {['body_part','action'].map(type => (
          <div key={type}>
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">{type==='body_part'?'🫀 Corpo':'⚡ Ação'}</p>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {items.filter(i=>i.dice_type===type).map(item => (
                <div key={item._id} className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2 flex items-center gap-2">
                  <span className="flex-1 text-white text-sm">{item.text}</span>
                  <button onClick={()=>remove(item._id)} className="text-slate-600 hover:text-red-400 transition-colors"><Trash2 className="w-3 h-3"/></button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── MAIN ─────────────────────────────────────────────────────
const TABS = [
  { id:'stats',     label:'📊 Stats',      comp: StatsTab },
  { id:'community', label:'🌍 Comunidade', comp: CommunityTab },
  { id:'challenges',label:'📋 Desafios',   comp: ChallengesTab },
  { id:'cards',     label:'🃏 Cartas',     comp: CardsTab },
  { id:'dice',      label:'🎲 Dados',      comp: DiceTab },
]

export default function Admin() {
  const navigate   = useNavigate()
  const [tab, setTab] = useState('stats')
  const Active = TABS.find(t => t.id === tab)?.comp || StatsTab

  return (
    <div className="min-h-screen bg-[#080b14] flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white p-1"><ChevronLeft className="w-5 h-5"/></button>
          <div>
            <h1 className="text-white font-bold text-xl flex items-center gap-2"><Database className="w-5 h-5 text-violet-400"/> Painel Admin</h1>
            <p className="text-slate-500 text-xs">Gestão de conteúdo do PartyMix</p>
          </div>
        </div>

        {/* Tab bar — scrollable on mobile */}
        <div className="flex gap-1 overflow-x-auto pb-2 mb-6" style={{scrollbarWidth:'none'}}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex-shrink-0 border transition-all ${tab===t.id?'bg-violet-600 border-violet-500 text-white':'bg-white/[0.04] border-white/[0.07] text-slate-400 hover:text-white'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
            <Active/>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
