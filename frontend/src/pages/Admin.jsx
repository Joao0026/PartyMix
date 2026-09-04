import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Check, X, ThumbsUp, Lock, Eye, EyeOff } from 'lucide-react'
import BackButton from '../components/layout/BackButton'
import PageShell from '../components/layout/PageShell'
import { api, clearAdminToken, getAdminToken } from '../utils/api'
import { PACK_IMPORT_TEMPLATES } from '../utils/packJsonTemplates'
import DrinkAssignTab from '../components/admin/DrinkAssignTab'

function PasswordGate({ onUnlock }) {
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)
  const [msg, setMsg] = useState('')

  const attempt = async () => {
    setMsg('')
    try {
      await api.adminLogin(pw)
      onUnlock()
    } catch (e) {
      setError(true)
      setShake(true)
      setMsg(e?.message || 'Erro ao entrar')
      setTimeout(() => setShake(false), 600)
      setTimeout(() => setError(false), 2000)
      setPw('')
    }
  }

  return (
    <PageShell mode="hub" className="justify-center" innerClassName="w-full max-w-xs">
      <motion.div animate={shake ? { x: [-8, 8, -6, 6, -4, 4, 0] } : {}} transition={{ duration: 0.5 }}
        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-3xl p-8 text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center">
          <Lock className="text-white w-8 h-8" />
        </div>
        <div>
          <h1 className="text-white font-black text-2xl">Admin</h1>
          <p className="text-slate-500 text-sm mt-1">Acesso restrito</p>
        </div>
        <div className="relative">
          <input type={show ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && attempt()}
            placeholder="Password"
            className={`w-full bg-slate-800 border rounded-xl px-4 py-3 text-white outline-none text-center text-lg tracking-widest transition-all ${error ? 'border-red-500 bg-red-900/20' : 'border-slate-600 focus:border-violet-500'}`} />
          <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {error && <p className="text-red-400 text-sm">{msg || 'Password incorreta'}</p>}
        <motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={attempt}
          className="w-full bg-gradient-to-r from-violet-600 to-purple-700 text-white font-bold rounded-2xl py-3">
          Entrar
        </motion.button>
      </motion.div>
    </PageShell>
  )
}

const card = 'bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4'
const inp = 'w-full bg-slate-800 border border-slate-600 text-white rounded-xl px-3 py-2.5 outline-none focus:border-violet-500 text-sm placeholder-slate-500'
const pill = (active) => `flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${active ? 'bg-violet-600 border-violet-500 text-white' : 'bg-white/[0.03] border-white/[0.07] text-slate-400'}`

const MODE_COLORS = { friends: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300', family: 'bg-sky-500/20 border-sky-500/40 text-sky-300', couple: 'bg-rose-500/20 border-rose-500/40 text-rose-300', drink: 'bg-amber-500/20 border-amber-500/40 text-amber-300', cards: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300', mister: 'bg-slate-500/20 border-slate-400/40 text-slate-300', mememix: 'bg-pink-500/20 border-pink-500/40 text-pink-300' }
const MODE_LABELS = { friends: 'Amigos', family: 'Família', couple: 'Casal', drink: 'Beber', cards: 'Cartas', mister: 'Mister White', mememix: 'MemeMix' }
const TYPE_ICONS = { telepatia: '🧠', perguntas: '📚', desenho: '🎨', mimica: '🎭', proibido: '🚫', caos: '💥', romantico: '🌹', picante: '🔥', verdade: '❓', acao: '⚡', roleplay: '🎭', quiz: '💬', waterfall: '🌊', eununca: '🙅', regras: '📜', desafios: '⚡', cadeia: '🔗', historia: '🎬', provavel: '👉', bluff: '🎭', maldicao: '🔮', poder: '👑', preferias: '🤔', extreme: '💣', especiais: '🛡️', agent: '🕵️', alliance: '🤝', miniboss: '👹', impostor: '🎭', geral: '🃏' }

function CommunityTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [modeFilter, setModeFilter] = useState('all')
  const [working, setWorking] = useState({})
  const [selected, setSelected] = useState([])
  const [warnMap, setWarnMap] = useState({})
  const [lastApproveMsg, setLastApproveMsg] = useState(null)
  const [loadError, setLoadError] = useState('')
  const loadRequestRef = useRef(0)

  const load = useCallback(() => {
    const reqId = ++loadRequestRef.current
    setLoading(true)
    setLoadError('')
    api.getCommunity({ status: filter, limit: 100 }, { auth: true })
      .then((d) => {
        if (reqId !== loadRequestRef.current) return
        setItems(Array.isArray(d.items) ? d.items : [])
      })
      .catch((e) => {
        if (reqId !== loadRequestRef.current) return
        setItems([])
        setLoadError(e?.message || 'Não foi possível carregar')
      })
      .finally(() => {
        if (reqId !== loadRequestRef.current) return
        setLoading(false)
      })
  }, [filter])

  useEffect(() => { load(); setSelected([]) }, [load])

  const loadWarnings = async (id) => {
    try {
      const d = await api.previewSubmissionWarnings(id)
      setWarnMap((m) => ({ ...m, [id]: Array.isArray(d.warnings) ? d.warnings : [] }))
    } catch { setWarnMap((m) => ({ ...m, [id]: [] })) }
  }

  const approve = async (id) => {
    setWorking((w) => ({ ...w, [id]: 'approving' }))
    try {
      const res = await api.approveCommunity(id)
      const w = Array.isArray(res.warnings) ? res.warnings : []
      setLastApproveMsg(w.length ? { id, w } : null)
    } catch (e) {
      setLastApproveMsg({ id, error: e?.message || 'Erro' })
    }
    setWorking((w) => ({ ...w, [id]: null }))
    load()
  }

  const reject = async (id) => {
    setWorking((w) => ({ ...w, [id]: 'rejecting' }))
    try { await api.rejectCommunity(id) }
    catch (e) { setLastApproveMsg({ id, error: e?.message || 'Erro ao rejeitar' }) }
    setWorking((w) => ({ ...w, [id]: null }))
    load()
  }

  const remove = async (id) => {
    try { await api.deleteCommunity(id) }
    catch (e) { setLastApproveMsg({ id, error: e?.message || 'Erro ao apagar' }) }
    load()
  }

  const updateMeta = async (item, patch) => {
    setWorking((w) => ({ ...w, [item._id]: 'meta' }))
    try { await api.updateCommunityMeta(item._id, { pack: item.pack || '', audience: item.audience || '', ...patch }) }
    catch (e) { setLastApproveMsg({ id: item._id, error: e?.message || 'Erro ao guardar' }) }
    setWorking((w) => ({ ...w, [item._id]: null }))
    load()
  }

  const visibleItems = items
    .filter((item) => modeFilter === 'all' || item.mode === modeFilter)
    .sort((a, b) => (b.votes || 0) - (a.votes || 0))

  const toggleSelected = (id) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id])

  const approveSelected = async () => {
    for (const id of selected) {
      try { await api.approveCommunity(id) }
      catch (e) { setLastApproveMsg({ id, error: e?.message || 'Erro no lote' }); break }
    }
    setSelected([])
    load()
  }

  return (
    <div className="space-y-4">
      {lastApproveMsg?.error && (
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-red-300 text-sm">{lastApproveMsg.error}</p>
      )}
      {lastApproveMsg?.w?.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs space-y-1">
          <p className="text-amber-200 font-bold">Aprovado com avisos de similaridade</p>
          {lastApproveMsg.w.slice(0, 5).map((w, i) => (
            <p key={i} className="text-slate-300">{w.message || w.type} → {w.similarTo?.location}</p>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        {[['pending', 'Pendentes'], ['approved', 'Aprovadas'], ['rejected', 'Rejeitadas']].map(([v, label]) => (
          <button key={v} type="button" onClick={() => setFilter(v)} className={pill(filter === v)}>{label}</button>
        ))}
      </div>
      <div className="flex gap-2">
        <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value)} className={inp}>
          <option value="all">Todos os modos</option>
          {Object.entries(MODE_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
        {filter === 'pending' && selected.length > 0 && (
          <button type="button" onClick={approveSelected} className="shrink-0 bg-green-500/20 border border-green-500/40 text-green-300 font-bold rounded-xl px-3 text-sm">
            Aprovar {selected.length}
          </button>
        )}
      </div>
      {loadError && <p className="text-red-300 text-sm bg-red-500/10 border border-red-500/30 rounded-xl p-3">{loadError}</p>}
      {loading ? <p className="text-slate-400 text-center py-8">A carregar...</p>
        : visibleItems.length === 0 ? <p className="text-slate-500 text-center py-8">Nenhuma submissão</p>
        : visibleItems.map((item) => (
          <motion.div key={item._id} layout className={card + ' space-y-3'}>
            <div className="flex gap-3">
              <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl border border-white/[0.08] bg-white/[0.06] text-2xl">
                {item.submissionType === 'idea' ? '💡' : item.mode === 'cards' ? (item.isBlack ? '⬛' : '⬜') : (TYPE_ICONS[item.cardType] || '🎴')}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap gap-1.5 items-center">
                  {filter === 'pending' && <input type="checkbox" checked={selected.includes(item._id)} onChange={() => toggleSelected(item._id)} className="accent-green-500" />}
                  {item.mode && <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${MODE_COLORS[item.mode] || ''}`}>{MODE_LABELS[item.mode] || item.mode}</span>}
                  {item.cardType && <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-slate-300">{item.cardType}</span>}
                  <span className="text-xs text-violet-300 flex items-center gap-0.5"><ThumbsUp className="w-3 h-3" />{item.votes}</span>
                  <span className="text-slate-600 text-xs">@{item.author}</span>
                </div>
                <p className="text-white font-medium">{item.text}</p>
              </div>
            </div>
            {item.civilWord && <p className="text-green-300 text-sm">Civil: {item.civilWord}</p>}
            {item.undercoverWord && <p className="text-blue-300 text-sm">Undercover: {item.undercoverWord}</p>}
            {item.answer && <p className="text-emerald-300 text-sm">Resposta: {item.answer}</p>}
            {filter === 'pending' && (
              <div className="grid grid-cols-2 gap-2">
                <input
                  key={`${item._id}-pack-${item.pack || ''}`}
                  defaultValue={item.pack || ''}
                  onBlur={(e) => e.target.value !== (item.pack || '') && updateMeta(item, { pack: e.target.value })}
                  placeholder="Pack"
                  className={inp}
                />
                <select value={item.audience || ''} onChange={(e) => updateMeta(item, { audience: e.target.value })} className={inp} disabled={working[item._id] === 'meta'}>
                  <option value="">Audiência</option>
                  <option value="family">Família</option>
                  <option value="adult">Adulto</option>
                  <option value="all">Todos</option>
                </select>
              </div>
            )}
            {filter === 'pending' && (
              <div className="flex gap-2">
                <button type="button" onClick={() => loadWarnings(item._id)} className="text-xs rounded-lg border border-white/10 px-2 py-2 text-slate-400">Similares</button>
                <button type="button" onClick={() => approve(item._id)} disabled={!!working[item._id]} className="flex-1 bg-green-500/20 border border-green-500/40 text-green-400 font-bold rounded-xl py-2.5 text-sm flex items-center justify-center gap-1 disabled:opacity-50"><Check className="w-3.5 h-3.5" />{working[item._id] === 'approving' ? 'A aprovar...' : 'Aprovar'}</button>
                <button type="button" onClick={() => reject(item._id)} disabled={!!working[item._id]} className="flex-1 bg-red-500/20 border border-red-500/40 text-red-400 font-bold rounded-xl py-2.5 text-sm flex items-center justify-center gap-1 disabled:opacity-50"><X className="w-3.5 h-3.5" />{working[item._id] === 'rejecting' ? 'A rejeitar...' : 'Rejeitar'}</button>
              </div>
            )}
            {warnMap[item._id]?.length > 0 && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-2 space-y-1 text-xs">
                {warnMap[item._id].map((w, i) => (
                  <p key={i} className="text-slate-400">{w.message || w.type} — {w.similarTo?.location}</p>
                ))}
              </div>
            )}
            {filter !== 'pending' && (
              <div className="flex justify-between">
                <span className={filter === 'approved' ? 'text-green-400 text-sm' : 'text-red-400 text-sm'}>{filter === 'approved' ? 'No jogo' : 'Rejeitada'}</span>
                <button type="button" onClick={() => remove(item._id)} className="text-slate-600 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            )}
          </motion.div>
        ))}
    </div>
  )
}

function ChallengesTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ text: '', category: 'perguntas', mode_type: 'friends', difficulty: 'medio', time_limit: 60 })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const load = () => {
    setLoading(true)
    api.getChallenges({})
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .catch((e) => { setItems([]); setErr(e?.message || 'Erro ao carregar') })
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    if (!form.text.trim()) return
    setSaving(true)
    setErr('')
    try {
      await api.createChallenge(form)
      setForm({ text: '', category: 'perguntas', mode_type: 'friends', difficulty: 'medio', time_limit: 60 })
      load()
    } catch (e) { setErr(e?.message || 'Erro ao guardar') }
    finally { setSaving(false) }
  }

  const filtered = items.filter((i) => !search || String(i.text || '').toLowerCase().includes(search.toLowerCase()))
  const CATS = ['telepatia', 'perguntas', 'desenho', 'mimica', 'proibido', 'caos', 'acao', 'verdade', 'consequencia', 'romantico', 'picante', 'roleplay']

  return (
    <div className="space-y-4">
      <div className={card + ' space-y-3'}>
        <textarea value={form.text} onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))} placeholder="Texto do desafio..." className={inp + ' resize-none h-20'} />
        <div className="grid grid-cols-2 gap-2">
          <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className={inp}>{CATS.map((c) => <option key={c}>{c}</option>)}</select>
          <select value={form.mode_type} onChange={(e) => setForm((f) => ({ ...f, mode_type: e.target.value }))} className={inp}>
            <option value="friends">Amigos</option>
            <option value="family">Família</option>
            <option value="couple">Casal</option>
            <option value="all">Todos</option>
          </select>
        </div>
        <button type="button" onClick={save} disabled={!form.text.trim() || saving} className="w-full bg-violet-600 text-white font-bold rounded-xl py-3 disabled:opacity-40 flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" />{saving ? 'A guardar...' : 'Adicionar'}
        </button>
      </div>
      {err && <p className="text-red-300 text-sm">{err}</p>}
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar..." className={inp} />
      <p className="text-slate-500 text-xs">{filtered.length} desafios</p>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {loading ? <p className="text-slate-400 text-center py-4">A carregar...</p> : filtered.map((item) => (
          <div key={item._id} className={card + ' flex items-start gap-3'}>
            <div className="flex-1">
              <p className="text-white text-sm">{item.text}</p>
              <p className="text-slate-500 text-xs mt-1">{item.category} · {MODE_LABELS[item.mode_type] || item.mode_type}</p>
            </div>
            <button type="button" onClick={() => api.deleteChallenge(item._id).then(load).catch((e) => setErr(e?.message || 'Erro'))} className="text-slate-600 hover:text-red-400 p-1"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </div>
  )
}

function CardsTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ text: '', category: 'geral', is_black: false })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const load = () => {
    setLoading(true)
    api.getCards({ mode_type: 'cards' })
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .catch((e) => { setItems([]); setErr(e?.message || 'Erro ao carregar') })
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    if (!form.text.trim()) return
    setSaving(true)
    setErr('')
    try {
      await api.createCard({ ...form, mode_type: 'cards' })
      setForm({ text: '', category: 'geral', is_black: false })
      load()
    } catch (e) { setErr(e?.message || 'Erro ao guardar') }
    finally { setSaving(false) }
  }

  const filtered = items.filter((i) => !search || String(i.text || '').toLowerCase().includes(search.toLowerCase()))
  return (
    <div className="space-y-4">
      <div className={card + ' space-y-3'}>
        <textarea value={form.text} onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))} placeholder="Texto... usa ___ nas pretas" className={inp + ' resize-none h-20'} />
        <div className="grid grid-cols-2 gap-2">
          <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className={inp}>{['geral', 'adulto', 'cultura', 'absurdo'].map((c) => <option key={c}>{c}</option>)}</select>
          <select value={String(form.is_black)} onChange={(e) => setForm((f) => ({ ...f, is_black: e.target.value === 'true' }))} className={inp}><option value="false">Branca</option><option value="true">Preta</option></select>
        </div>
        <button type="button" onClick={save} disabled={!form.text.trim() || saving} className="w-full bg-amber-500 text-black font-bold rounded-xl py-3 disabled:opacity-40 flex items-center justify-center gap-2"><Plus className="w-4 h-4" />{saving ? 'A guardar...' : 'Adicionar'}</button>
      </div>
      {err && <p className="text-red-300 text-sm">{err}</p>}
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar..." className={inp} />
      <p className="text-slate-500 text-xs">{filtered.length} cartas</p>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {loading ? <p className="text-slate-400 text-center py-4">A carregar...</p> : filtered.map((item) => (
          <div key={item._id} className={`flex items-start gap-3 rounded-xl p-3 border ${item.is_black ? 'bg-black border-white/15' : 'bg-white/90 border-slate-200'}`}>
            <p className={`flex-1 text-sm font-medium ${item.is_black ? 'text-white' : 'text-slate-900'}`}>{item.text}</p>
            <button type="button" onClick={() => api.deleteCard(item._id).then(load).catch((e) => setErr(e?.message || 'Erro'))} className="text-slate-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </div>
  )
}

function DiceTab() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ text: '', dice_type: 'body_part' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const load = () => api.getDice()
    .then((d) => setItems(Array.isArray(d) ? d : []))
    .catch((e) => { setItems([]); setErr(e?.message || 'Erro ao carregar') })
  useEffect(() => { load() }, [])

  const save = async () => {
    if (!form.text.trim()) return
    setSaving(true)
    setErr('')
    try {
      await api.createDice(form)
      setForm((f) => ({ ...f, text: '' }))
      load()
    } catch (e) { setErr(e?.message || 'Erro ao guardar') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div className={card + ' space-y-3'}>
        <input value={form.text} onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))} placeholder="Ex: Lábios" className={inp} />
        <select value={form.dice_type} onChange={(e) => setForm((f) => ({ ...f, dice_type: e.target.value }))} className={inp}>
          <option value="body_part">Parte do corpo</option>
          <option value="action">Ação</option>
        </select>
        <button type="button" onClick={save} disabled={!form.text.trim() || saving} className="w-full bg-rose-500 text-white font-bold rounded-xl py-3 disabled:opacity-40 flex items-center justify-center gap-2"><Plus className="w-4 h-4" />{saving ? 'A guardar...' : 'Adicionar'}</button>
      </div>
      {err && <p className="text-red-300 text-sm">{err}</p>}
      <div className="grid grid-cols-2 gap-3">
        {['body_part', 'action'].map((type) => (
          <div key={type}>
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">{type === 'body_part' ? 'Corpo' : 'Ação'}</p>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {items.filter((i) => i.dice_type === type).map((item) => (
                <div key={item._id} className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2 flex items-center gap-2">
                  <span className="flex-1 text-white text-sm">{item.text}</span>
                  <button type="button" onClick={() => api.deleteDice(item._id).then(load).catch((e) => setErr(e?.message || 'Erro'))} className="text-slate-600 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ContentTab() {
  const [sub, setSub] = useState('challenges')
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[['challenges', 'Desafios'], ['cards', 'Cartas'], ['dice', 'Dados']].map(([id, label]) => (
          <button key={id} type="button" onClick={() => setSub(id)} className={pill(sub === id)}>{label}</button>
        ))}
      </div>
      {sub === 'challenges' && <ChallengesTab />}
      {sub === 'cards' && <CardsTab />}
      {sub === 'dice' && <DiceTab />}
    </div>
  )
}

function ImportPackTab() {
  const [packs, setPacks] = useState([])
  const [loadingPacks, setLoadingPacks] = useState(true)
  const [templateId, setTemplateId] = useState('friends')
  const [text, setText] = useState(() => JSON.stringify(PACK_IMPORT_TEMPLATES[0].pack, null, 2))
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [exported, setExported] = useState('')

  useEffect(() => {
    api.listAdminPacks()
      .then((rows) => setPacks(Array.isArray(rows) ? rows : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoadingPacks(false))
  }, [])

  const loadTemplate = (id) => {
    const tpl = PACK_IMPORT_TEMPLATES.find((t) => t.id === id)
    if (!tpl) return
    setTemplateId(id)
    setText(JSON.stringify(tpl.pack, null, 2))
    setResult(null)
    setError('')
    setExported('')
  }

  const doExport = async (pack) => {
    setError('')
    setExported('')
    try {
      setExported(JSON.stringify(await api.exportAdminPack(pack), null, 2))
    } catch (e) {
      setError(e?.message || 'Erro ao exportar')
    }
  }

  const importNow = async () => {
    setError('')
    setResult(null)
    let pack
    try { pack = JSON.parse(text) } catch { setError('JSON inválido.'); return }
    setLoading(true)
    try { setResult(await api.importPack(pack)) }
    catch (e) { setError(e?.message || 'Erro ao importar') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <div className={card + ' space-y-2'}>
        <p className="text-white font-semibold">Packs na base</p>
        {loadingPacks ? <p className="text-slate-500 text-sm">A carregar…</p> : packs.length === 0 ? (
          <p className="text-slate-500 text-sm">Nenhum pack importado.</p>
        ) : packs.map((p) => (
          <div key={p.pack} className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2">
            <p className="flex-1 text-white text-sm font-bold truncate">{p.name || p.pack}</p>
            <button type="button" onClick={() => doExport(p.pack)} className="text-xs font-bold rounded-lg bg-white/10 text-slate-200 px-2.5 py-1.5">Exportar</button>
          </div>
        ))}
      </div>
      {exported && <textarea readOnly value={exported} className={inp + ' h-48 font-mono text-xs resize-none'} />}
      <div className={card + ' space-y-3'}>
        <p className="text-white font-semibold">Importar JSON</p>
        <select value={templateId} onChange={(e) => loadTemplate(e.target.value)} className={inp}>
          {PACK_IMPORT_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <textarea value={text} onChange={(e) => setText(e.target.value)} className={inp + ' h-56 font-mono text-xs resize-none'} spellCheck={false} />
        <button type="button" onClick={importNow} disabled={loading || !text.trim()} className="w-full bg-emerald-600 text-white font-bold rounded-xl py-3 disabled:opacity-40">
          {loading ? 'A importar...' : 'Importar'}
        </button>
      </div>
      {error && <p className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-red-300 text-sm">{error}</p>}
      {result && (
        <div className={card + ' space-y-1 text-sm'}>
          <p className="text-green-300 font-bold">Importado: {result.pack}</p>
          <p className="text-slate-300">Cartas {result.cards.inserted} novas · Desafios {result.challenges.inserted} novos</p>
        </div>
      )}
    </div>
  )
}

function QualidadeTab() {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const [includeDb, setIncludeDb] = useState(true)

  const load = () => {
    setLoading(true)
    setErr(null)
    api.getContentAudit({ source: includeDb ? 'both' : 'files' })
      .then((d) => { setReport(d); setLoading(false) })
      .catch((e) => { setErr(e?.message || 'Erro'); setLoading(false) })
  }

  if (!report && !loading && !err) {
    return (
      <div className={card + ' space-y-3'}>
        <p className="text-white font-semibold">Auditoria de conteúdo</p>
        <p className="text-slate-500 text-sm">Procura duplicados e erros no catálogo. Pode demorar.</p>
        <label className="flex items-center gap-3 cursor-pointer">
          <button type="button" onClick={() => setIncludeDb((v) => !v)} className={`w-11 h-6 rounded-full relative ${includeDb ? 'bg-violet-500' : 'bg-white/[0.12]'}`}>
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full ${includeDb ? 'left-6' : 'left-1'}`} />
          </button>
          <span className="text-slate-300 text-sm">Incluir base de dados</span>
        </label>
        <button type="button" onClick={load} className="w-full rounded-xl bg-violet-600 text-white font-bold py-3">Auditar agora</button>
      </div>
    )
  }

  if (loading) return <p className="text-slate-400 text-sm text-center py-8">A auditar…</p>
  if (err) return (
    <div className={card}>
      <p className="text-red-300 text-sm">{err}</p>
      <button type="button" onClick={load} className="mt-3 text-violet-300 text-sm">Tentar de novo</button>
    </div>
  )

  const s = report?.stats || {}
  return (
    <div className="space-y-4">
      <div className={`rounded-2xl p-4 border ${report?.ok ? 'bg-green-500/10 border-green-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
        <p className={`font-bold ${report?.ok ? 'text-green-300' : 'text-amber-300'}`}>{report?.ok ? 'Conteúdo OK' : 'Problemas encontrados'}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Itens', n: s.items },
          { label: 'Duplicados', n: s.exactDuplicateGroups },
          { label: 'Quase iguais', n: s.nearDuplicatePairs },
          { label: 'Variantes beber', n: s.drinkVariantPairs },
        ].map((b) => (
          <div key={b.label} className={`${card} text-center`}>
            <p className="text-white font-black text-2xl">{b.n ?? 0}</p>
            <p className="text-slate-500 text-xs">{b.label}</p>
          </div>
        ))}
      </div>
      {report?.validationErrors?.length > 0 && (
        <div className={card + ' space-y-2 max-h-64 overflow-y-auto'}>
          <h3 className="text-white font-semibold">Validação</h3>
          {report.validationErrors.slice(0, 20).map((e, i) => (
            <p key={i} className="text-xs text-red-300">{e.message}</p>
          ))}
        </div>
      )}
      {report?.exactDuplicates?.length > 0 && (
        <div className={card + ' space-y-2 max-h-48 overflow-y-auto'}>
          <h3 className="text-white font-semibold">Duplicados</h3>
          {report.exactDuplicates.slice(0, 12).map((g, i) => (
            <p key={i} className="text-xs text-amber-200 truncate">×{g.count} — {g.text}</p>
          ))}
        </div>
      )}
      <button type="button" onClick={load} className="w-full rounded-xl border border-white/10 py-3 text-slate-300 text-sm">Atualizar</button>
    </div>
  )
}

const TABS = [
  { id: 'beber', label: 'Beber' },
  { id: 'community', label: 'Comunidade' },
  { id: 'content', label: 'Conteúdo' },
  { id: 'import', label: 'Packs' },
  { id: 'qualidade', label: 'Qualidade' },
]

export default function Admin() {
  const navigate = useNavigate()
  const [unlocked, setUnlocked] = useState(() => !!getAdminToken())
  const [tab, setTab] = useState('beber')
  const [health, setHealth] = useState(null)

  useEffect(() => {
    const onAuth = () => { if (!getAdminToken()) setUnlocked(false) }
    window.addEventListener('partymix-admin-auth', onAuth)
    return () => window.removeEventListener('partymix-admin-auth', onAuth)
  }, [])

  useEffect(() => {
    if (!unlocked) return
    api.getHealth().then(setHealth).catch(() => setHealth(null))
  }, [unlocked])

  const logout = async () => {
    try { await api.adminLogout() } catch { /* still clear local token */ }
    clearAdminToken()
    setUnlocked(false)
  }
  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />

  const ActiveTab = { community: CommunityTab, qualidade: QualidadeTab, beber: DrinkAssignTab, import: ImportPackTab, content: ContentTab }[tab] || DrinkAssignTab

  return (
    <PageShell mode="hub" maxWidth="xl" innerClassName="space-y-0 w-full">
      <div className="flex items-center gap-3 mb-5">
        <BackButton onClick={() => navigate('/')} />
        <div className="flex-1 min-w-0">
          <h1 className="text-white font-bold text-xl">Admin</h1>
          {health && (
            <p className={`text-[11px] ${health.status === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>
              {health.db === 'connected'
                ? 'Base de dados ligada'
                : health.status === 'ok'
                  ? 'Servidor ok'
                  : 'Servidor offline'}
            </p>
          )}
        </div>
        <button type="button" onClick={logout} className="text-slate-500 hover:text-red-400 text-xs border border-slate-700 hover:border-red-500/40 rounded-xl px-3 py-1.5">Sair</button>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-2 mb-5" style={{ scrollbarWidth: 'none' }}>
        {TABS.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex-shrink-0 border transition-all ${tab === t.id ? 'bg-violet-600 border-violet-500 text-white' : 'bg-white/[0.04] border-white/[0.07] text-slate-400 hover:text-white'}`}>{t.label}</button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          <ActiveTab />
        </motion.div>
      </AnimatePresence>
    </PageShell>
  )
}
