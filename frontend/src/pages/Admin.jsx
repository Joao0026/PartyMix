import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Plus, Trash2, Check, X, ThumbsUp, Lock, Eye, EyeOff } from 'lucide-react'
import { api, clearAdminToken, getAdminToken } from '../utils/api'

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
    <div className="min-h-screen bg-[#080b14] flex items-center justify-center px-4">
      <motion.div animate={shake?{x:[-8,8,-6,6,-4,4,0]}:{}} transition={{duration:0.5}}
        className="w-full max-w-xs bg-white/[0.04] border border-white/[0.08] rounded-3xl p-8 text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center">
          <Lock className="text-white w-8 h-8"/>
        </div>
        <div><h1 className="text-white font-black text-2xl">Admin</h1><p className="text-slate-500 text-sm mt-1">Acesso restrito</p></div>
        <div className="relative">
          <input type={show?'text':'password'} value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==='Enter'&&attempt()}
            placeholder="Password"
            className={`w-full bg-slate-800 border rounded-xl px-4 py-3 text-white outline-none text-center text-lg tracking-widest transition-all ${error?'border-red-500 bg-red-900/20':'border-slate-600 focus:border-violet-500'}`}/>
          <button onClick={()=>setShow(s=>!s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
            {show?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}
          </button>
        </div>
        {error && <p className="text-red-400 text-sm">{msg || 'Password incorreta'}</p>}
        <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.97}} onClick={attempt}
          className="w-full bg-gradient-to-r from-violet-600 to-purple-700 text-white font-bold rounded-2xl py-3">
          Entrar
        </motion.button>
      </motion.div>
    </div>
  )
}

const inp  = 'w-full bg-slate-800 border border-slate-600 text-white rounded-xl px-3 py-2.5 outline-none focus:border-violet-500 text-sm placeholder-slate-500'
const card = 'bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4'

function StatsTab() {
  const [counts, setCounts] = useState(null)
  const [stats,  setStats]  = useState(null)
  const [health, setHealth] = useState(null)
  useEffect(()=>{
    Promise.all([
      api.getCommunityStats().catch(()=>null),
      fetch('/api/health').then(r=>r.json()).catch(()=>null),
      api.getChallenges({}).then(r=>Array.isArray(r)?r.length:0).catch(()=>0),
      api.getCards({}).then(r=>Array.isArray(r)?r.length:0).catch(()=>0),
      api.getDice({}).then(r=>Array.isArray(r)?r.length:0).catch(()=>0),
    ]).then(([s,h,ch,ca,di])=>{setStats(s);setHealth(h);setCounts({challenges:ch,cards:ca,dice:di})})
  },[])

  const boxes=[
    {label:'Desafios na BD',n:counts?.challenges||0,icon:'📋',color:'from-cyan-600 to-blue-700'},
    {label:'Cartas na BD',  n:counts?.cards||0,     icon:'🃏',color:'from-amber-500 to-yellow-600'},
    {label:'Dados Eróticos',n:counts?.dice||0,      icon:'🎲',color:'from-rose-500 to-pink-600'},
    {label:'Subm. pendentes',n:stats?.pending||0,   icon:'⏳',color:'from-orange-500 to-amber-600'},
    {label:'Subm. aprovadas',n:stats?.approved||0,  icon:'✅',color:'from-green-500 to-emerald-600'},
    {label:'Subm. rejeitadas',n:stats?.rejected||0, icon:'❌',color:'from-slate-500 to-slate-700'},
  ]

  return (
    <div className="space-y-4">
      {health&&(
        <div className={`rounded-2xl p-4 border ${health.db==='connected'?'bg-green-500/10 border-green-500/30':'bg-red-500/10 border-red-500/30'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${health.db==='connected'?'bg-green-400':'bg-red-400'} animate-pulse`}/>
            <div>
              <p className={`font-bold text-sm ${health.db==='connected'?'text-green-400':'text-red-400'}`}>MongoDB: {health.db}</p>
              <p className="text-slate-500 text-xs">Groq AI: {health.groq?'✅ Configurado':'⚠️ GROQ_API_KEY em falta'}</p>
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {boxes.map(b=>(
          <div key={b.label} className={`bg-gradient-to-br ${b.color} rounded-2xl p-4 text-center`}>
            <p className="text-3xl mb-1">{b.icon}</p>
            <p className="text-white font-black text-3xl">{b.n}</p>
            <p className="text-white/70 text-xs">{b.label}</p>
          </div>
        ))}
      </div>
      <div className={card+' space-y-3'}>
        <h3 className="text-white font-bold">🗄️ Fix Base de Dados</h3>
        <p className="text-slate-400 text-sm">Verifica que o teu <code className="text-amber-300 bg-amber-900/20 px-1 rounded">MONGODB_URI</code> contém <code className="text-violet-300 bg-violet-900/20 px-1 rounded">partymix</code> antes do <code className="text-slate-300">?</code></p>
        <div className="bg-slate-800 rounded-xl p-3 text-xs text-green-300 font-mono break-all">...mongodb.net/<strong>partymix</strong>?retryWrites=true...</div>
        <p className="text-slate-500 text-xs">Depois corre <code className="text-amber-300">npm run seed</code> no backend para criar as coleções.</p>
      </div>
    </div>
  )
}

const MODE_COLORS={friends:'bg-cyan-500/20 border-cyan-500/40 text-cyan-300',family:'bg-sky-500/20 border-sky-500/40 text-sky-300',couple:'bg-rose-500/20 border-rose-500/40 text-rose-300',drink:'bg-amber-500/20 border-amber-500/40 text-amber-300',cards:'bg-yellow-500/20 border-yellow-500/40 text-yellow-300'}
const MODE_LABELS={friends:'👥 Amigos',family:'🏡 Família',couple:'💕 Casal',drink:'🍺 Beber',cards:'🃏 Cartas'}
const TYPE_ICONS={telepatia:'🧠',perguntas:'📚',desenho:'🎨',mimica:'🎭',proibido:'🚫',caos:'💥',romantico:'🌹',picante:'🔥',verdade:'❓',acao:'⚡',roleplay:'🎭',quiz:'💬',beber:'🍺',regra:'📜',desafio:'⚡',duelo:'⚔️',poder:'👑',sorte:'🍀',geral:'🃏'}

function CommunityTab(){
  const [items,setItems]=useState([]),[loading,setLoading]=useState(true),[filter,setFilter]=useState('pending'),[modeFilter,setModeFilter]=useState('all'),[typeFilter,setTypeFilter]=useState('all'),[minVotes,setMinVotes]=useState(0),[working,setWorking]=useState({}),[selected,setSelected]=useState([])
  const load=()=>{
    setLoading(true)
    const params={status:filter,limit:100}
    if(modeFilter!=='all')params.mode=modeFilter
    api.getCommunity(params).then(d=>{setItems(Array.isArray(d.items)?d.items:[]);setLoading(false)}).catch(()=>setLoading(false))
  }
  useEffect(()=>{load();setSelected([])},[filter,modeFilter])
  const approve=async id=>{setWorking(w=>({...w,[id]:'approving'}));await api.approveCommunity(id);setWorking(w=>({...w,[id]:null}));load()}
  const reject=async id=>{setWorking(w=>({...w,[id]:'rejecting'}));await api.rejectCommunity(id);setWorking(w=>({...w,[id]:null}));load()}
  const remove=async id=>{await api.deleteCommunity(id);load()}
  const updateMeta=async (item, patch)=>{setWorking(w=>({...w,[item._id]:'meta'}));await api.updateCommunityMeta(item._id,{pack:item.pack||'',audience:item.audience||'',...patch});setWorking(w=>({...w,[item._id]:null}));load()}
  const visibleItems=items
    .filter(item=>typeFilter==='all'||item.cardType===typeFilter||item.submissionType===typeFilter)
    .filter(item=>(item.votes||0)>=minVotes)
    .sort((a,b)=>(b.votes||0)-(a.votes||0))
  const toggleSelected=id=>setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id])
  const approveSelected=async()=>{for(const id of selected){await api.approveCommunity(id)};setSelected([]);load()}
  return(
    <div className="space-y-4">
      <div className="flex gap-2">
        {[['pending','⏳'],['approved','✅'],['rejected','❌']].map(([v,e])=>(
          <button key={v} onClick={()=>setFilter(v)} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${filter===v?'bg-violet-600/30 border-violet-500 text-violet-200':'bg-white/[0.03] border-white/[0.07] text-slate-400'}`}>{e} {v.charAt(0).toUpperCase()+v.slice(1)}</button>
        ))}
      </div>
      <div className={card+' space-y-2'}>
        <div className="grid grid-cols-2 gap-2">
          <select value={modeFilter} onChange={e=>setModeFilter(e.target.value)} className={inp}>
            <option value="all">Todos os modos</option>
            {Object.entries(MODE_LABELS).map(([id,label])=><option key={id} value={id}>{label}</option>)}
          </select>
          <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} className={inp}>
            <option value="all">Todos os tipos</option>
            <option value="idea">Ideias</option>
            {['telepatia','perguntas','desenho','mimica','proibido','caos','romantico','picante','verdade','acao','roleplay','quiz','beber','regra','desafio','duelo','poder','sorte','geral'].map(t=><option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <label className="block text-slate-500 text-xs">Votos mínimos: {minVotes}</label>
        <input type="range" min="0" max="50" value={minVotes} onChange={e=>setMinVotes(+e.target.value)} className="w-full"/>
        {filter==='pending'&&selected.length>0&&(
          <button onClick={approveSelected} className="w-full bg-green-500/20 border border-green-500/40 text-green-300 font-bold rounded-xl py-2.5 text-sm">
            Aprovar {selected.length} em lote
          </button>
        )}
      </div>
      {loading?<p className="text-slate-400 text-center py-8">A carregar...</p>
        :visibleItems.length===0?<p className="text-slate-500 text-center py-8">Nenhuma submissão</p>
        :visibleItems.map(item=>(
        <motion.div key={item._id} layout className={card+' space-y-3'}>
          <div className="flex gap-3">
            <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl border border-white/[0.08] bg-white/[0.06] text-2xl">
              {item.submissionType==='idea'?'💡':item.mode==='cards'?(item.isBlack?'⬛':'⬜'):(TYPE_ICONS[item.cardType]||'🎴')}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-1.5 items-center">
            {filter==='pending'&&<input type="checkbox" checked={selected.includes(item._id)} onChange={()=>toggleSelected(item._id)} className="accent-green-500"/>}
            {item.mode&&<span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${MODE_COLORS[item.mode]||''}`}>{MODE_LABELS[item.mode]||item.mode}</span>}
            {item.cardType&&<span className="text-xs px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-slate-300">{item.cardType}</span>}
            {item.ideaType&&<span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">💡 {item.ideaType}</span>}
            <span className="text-xs text-violet-300 flex items-center gap-0.5"><ThumbsUp className="w-3 h-3"/>{item.votes}</span>
            <span className="text-slate-600 text-xs">@{item.author}</span>
          </div>
          <p className="text-white font-medium">{item.text}</p>
            </div>
          </div>
          {item.answer&&<p className="text-emerald-300 text-sm">Resposta: {item.answer}</p>}
          {Array.isArray(item.choices)&&item.choices.length>0&&<p className="text-slate-400 text-xs">Alíneas: {item.choices.join(' / ')}</p>}
          {Array.isArray(item.forbiddenWords)&&item.forbiddenWords.length>0&&<p className="text-slate-400 text-xs">Proibidas: {item.forbiddenWords.join(', ')}</p>}
          <div className="grid grid-cols-2 gap-2">
            <input
              defaultValue={item.pack||''}
              onBlur={e=>e.target.value!==(item.pack||'')&&updateMeta(item,{pack:e.target.value})}
              placeholder="Pack: ex. familia-base"
              className={inp}
            />
            <select
              value={item.audience||''}
              onChange={e=>updateMeta(item,{audience:e.target.value})}
              className={inp}
              disabled={working[item._id]==='meta'}
            >
              <option value="">Sem marca</option>
              <option value="family">Família</option>
              <option value="adult">Adulto</option>
              <option value="all">Todos</option>
            </select>
          </div>
          {filter==='pending'&&(
            <div className="flex gap-2">
              <button onClick={()=>approve(item._id)} disabled={!!working[item._id]} className="flex-1 bg-green-500/20 border border-green-500/40 text-green-400 font-bold rounded-xl py-2.5 text-sm flex items-center justify-center gap-1 disabled:opacity-50"><Check className="w-3.5 h-3.5"/>{working[item._id]==='approving'?'A aprovar...':'Aprovar + Jogo'}</button>
              <button onClick={()=>reject(item._id)} disabled={!!working[item._id]} className="flex-1 bg-red-500/20 border border-red-500/40 text-red-400 font-bold rounded-xl py-2.5 text-sm flex items-center justify-center gap-1 disabled:opacity-50"><X className="w-3.5 h-3.5"/>{working[item._id]==='rejecting'?'A rejeitar...':'Rejeitar'}</button>
            </div>
          )}
          {filter!=='pending'&&(
            <div className="flex justify-between">
              <span className={filter==='approved'?'text-green-400 text-sm':'text-red-400 text-sm'}>{filter==='approved'?'✅ No jogo':'❌ Rejeitada'}</span>
              <button onClick={()=>remove(item._id)} className="text-slate-600 hover:text-red-400"><Trash2 className="w-4 h-4"/></button>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  )
}

function ChallengesTab(){
  const [items,setItems]=useState([]),[loading,setLoading]=useState(true),[search,setSearch]=useState('')
  const [form,setForm]=useState({text:'',category:'perguntas',mode_type:'friends',difficulty:'medio',time_limit:60,sips_penalty:2,is_ongoing:false,ongoing_rounds:0,ongoing_instruction:''})
  const [saving,setSaving]=useState(false)
  const load=()=>{setLoading(true);api.getChallenges({}).then(d=>{setItems(Array.isArray(d)?d:[]);setLoading(false)})}
  useEffect(()=>{load()},[])
  const save=async()=>{if(!form.text.trim())return;setSaving(true);await api.createChallenge(form);setForm({text:'',category:'perguntas',mode_type:'friends',difficulty:'medio',time_limit:60,sips_penalty:2,is_ongoing:false,ongoing_rounds:0,ongoing_instruction:''});setSaving(false);load()}
  const filtered=items.filter(i=>!search||i.text.toLowerCase().includes(search.toLowerCase()))
  const CATS=['telepatia','perguntas','desenho','mimica','proibido','caos','acao','verdade','consequencia','romantico','picante','roleplay','casal_pergunta','cultura','desporto','musica','cinema','erotico']
  return(
    <div className="space-y-4">
      <div className={card+' space-y-3'}>
        <h3 className="text-white font-semibold">Novo Desafio</h3>
        <textarea value={form.text} onChange={e=>setForm(f=>({...f,text:e.target.value}))} placeholder="Texto do desafio..." className={inp+' resize-none h-20'}/>
        <div className="grid grid-cols-2 gap-2">
          <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} className={inp}>{CATS.map(c=><option key={c}>{c}</option>)}</select>
          <select value={form.mode_type} onChange={e=>setForm(f=>({...f,mode_type:e.target.value}))} className={inp}>{['couple','friends','family','all'].map(m=><option key={m}>{m}</option>)}</select>
          <select value={form.difficulty} onChange={e=>setForm(f=>({...f,difficulty:e.target.value}))} className={inp}>{['facil','medio','dificil'].map(d=><option key={d}>{d}</option>)}</select>
          <input type="number" value={form.time_limit} onChange={e=>setForm(f=>({...f,time_limit:+e.target.value}))} placeholder="Tempo (s)" className={inp}/>
        </div>
        <button onClick={save} disabled={!form.text.trim()||saving} className="w-full bg-gradient-to-r from-violet-600 to-purple-700 text-white font-bold rounded-xl py-3 disabled:opacity-40 flex items-center justify-center gap-2">
          <Plus className="w-4 h-4"/>{saving?'A guardar...':'Adicionar'}
        </button>
      </div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar..." className={inp}/>
      <p className="text-slate-500 text-xs">{filtered.length} desafios</p>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {loading?<p className="text-slate-400 text-center py-4">A carregar...</p>:filtered.map(item=>(
          <div key={item._id} className={card+' flex items-start gap-3'}>
            <div className="flex-1"><p className="text-white text-sm">{item.text}</p>
              <div className="flex gap-1.5 mt-1"><span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/40 text-violet-300">{item.category}</span><span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300">{item.mode_type}</span></div>
            </div>
            <button onClick={()=>api.deleteChallenge(item._id).then(load)} className="text-slate-600 hover:text-red-400 p-1"><Trash2 className="w-4 h-4"/></button>
          </div>
        ))}
      </div>
    </div>
  )
}

function CardsTab(){
  const [items,setItems]=useState([]),[loading,setLoading]=useState(true),[search,setSearch]=useState('')
  const [form,setForm]=useState({text:'',category:'geral',is_black:false}),[saving,setSaving]=useState(false)
  const load=()=>{setLoading(true);api.getCards({}).then(d=>{setItems(Array.isArray(d)?d:[]);setLoading(false)})}
  useEffect(()=>{load()},[])
  const save=async()=>{if(!form.text.trim())return;setSaving(true);await api.createCard(form);setForm({text:'',category:'geral',is_black:false});setSaving(false);load()}
  const filtered=items.filter(i=>!search||i.text.toLowerCase().includes(search.toLowerCase()))
  return(
    <div className="space-y-4">
      <div className={card+' space-y-3'}>
        <h3 className="text-white font-semibold">Nova Carta</h3>
        <textarea value={form.text} onChange={e=>setForm(f=>({...f,text:e.target.value}))} placeholder="Texto... usa ___ para espaços em pretas" className={inp+' resize-none h-20'}/>
        <div className="grid grid-cols-2 gap-2">
          <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} className={inp}>{['geral','adulto','cultura','absurdo'].map(c=><option key={c}>{c}</option>)}</select>
          <select value={String(form.is_black)} onChange={e=>setForm(f=>({...f,is_black:e.target.value==='true'}))} className={inp}><option value="false">⬜ Branca</option><option value="true">⬛ Preta</option></select>
        </div>
        {form.text&&<div className={`rounded-xl p-3 border text-sm ${form.is_black?'bg-black border-white/20 text-white':'bg-white border-slate-200 text-slate-900'}`}>{form.text}</div>}
        <button onClick={save} disabled={!form.text.trim()||saving} className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold rounded-xl py-3 disabled:opacity-40 flex items-center justify-center gap-2"><Plus className="w-4 h-4"/>{saving?'A guardar...':'Adicionar'}</button>
      </div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar..." className={inp}/>
      <p className="text-slate-500 text-xs">{filtered.length} cartas</p>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {loading?<p className="text-slate-400 text-center py-4">A carregar...</p>:filtered.map(item=>(
          <div key={item._id} className={`flex items-start gap-3 rounded-xl p-3 border ${item.is_black?'bg-black border-white/15':'bg-white/90 border-slate-200'}`}>
            <p className={`flex-1 text-sm font-medium ${item.is_black?'text-white':'text-slate-900'}`}>{item.text}</p>
            <button onClick={()=>api.deleteCard(item._id).then(load)} className="text-slate-400 hover:text-red-400"><Trash2 className="w-4 h-4"/></button>
          </div>
        ))}
      </div>
    </div>
  )
}

function ImportPackTab(){
  const [text,setText]=useState('{\n  "name": "Pack exemplo",\n  "mode": "family",\n  "categories": {\n    "perguntas": [\n      {\n        "text": "Qual é a capital da Austrália?",\n        "answer": "Camberra",\n        "choices": ["Sydney", "Melbourne", "Camberra", "Perth"],\n        "difficulty": "medio"\n      }\n    ]\n  }\n}')
  const [result,setResult]=useState(null)
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(false)
  const importNow=async()=>{
    setError('');setResult(null)
    let pack
    try{pack=JSON.parse(text)}catch{setError('JSON inválido. Confirma vírgulas, aspas e chavetas.');return}
    setLoading(true)
    try{setResult(await api.importPack(pack))}
    catch(e){setError(e?.message||'Erro ao importar pack')}
    finally{setLoading(false)}
  }
  return(
    <div className="space-y-4">
      <div className={card+' space-y-3'}>
        <h3 className="text-white font-semibold">Importar Pack JSON</h3>
        <p className="text-slate-400 text-sm">Cola aqui um pack de `data/.../base.json`. Repetidas são ignoradas automaticamente.</p>
        <textarea value={text} onChange={e=>setText(e.target.value)} className={inp+' h-72 font-mono text-xs resize-none'} />
        <button onClick={importNow} disabled={loading||!text.trim()} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl py-3 disabled:opacity-40">
          {loading?'A importar...':'Importar para a base de dados'}
        </button>
      </div>
      {error&&<p className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-red-300 text-sm">{error}</p>}
      {result&&(
        <div className={card+' space-y-2'}>
          <p className="text-green-300 font-bold">Pack importado: {result.pack}</p>
          <p className="text-slate-300 text-sm">Cartas: {result.cards.inserted} novas, {result.cards.skipped} repetidas, {result.cards.invalid} inválidas.</p>
          <p className="text-slate-300 text-sm">Desafios: {result.challenges.inserted} novos, {result.challenges.skipped} repetidos, {result.challenges.invalid} inválidos.</p>
        </div>
      )}
    </div>
  )
}

function DiceTab(){
  const [items,setItems]=useState([]),[form,setForm]=useState({text:'',dice_type:'body_part'}),[saving,setSaving]=useState(false)
  const load=()=>api.getDice().then(d=>setItems(Array.isArray(d)?d:[]))
  useEffect(()=>{load()},[])
  const save=async()=>{if(!form.text.trim())return;setSaving(true);await api.createDice(form);setForm(f=>({...f,text:''}));setSaving(false);load()}
  return(
    <div className="space-y-4">
      <div className={card+' space-y-3'}>
        <h3 className="text-white font-semibold">Nova Opção de Dado</h3>
        <input value={form.text} onChange={e=>setForm(f=>({...f,text:e.target.value}))} placeholder="Ex: Lábios / Massagem suave" className={inp}/>
        <select value={form.dice_type} onChange={e=>setForm(f=>({...f,dice_type:e.target.value}))} className={inp}><option value="body_part">🫀 Parte do Corpo</option><option value="action">⚡ Ação</option></select>
        <button onClick={save} disabled={!form.text.trim()||saving} className="w-full bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold rounded-xl py-3 disabled:opacity-40 flex items-center justify-center gap-2"><Plus className="w-4 h-4"/>{saving?'A guardar...':'Adicionar'}</button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {['body_part','action'].map(type=>(
          <div key={type}>
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">{type==='body_part'?'🫀 Corpo':'⚡ Ação'}</p>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {items.filter(i=>i.dice_type===type).map(item=>(
                <div key={item._id} className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2 flex items-center gap-2">
                  <span className="flex-1 text-white text-sm">{item.text}</span>
                  <button onClick={()=>api.deleteDice(item._id).then(load)} className="text-slate-600 hover:text-red-400"><Trash2 className="w-3 h-3"/></button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const TABS=[{id:'stats',label:'📊 Stats'},{id:'community',label:'🌍 Comunidade'},{id:'import',label:'📦 Importar'},{id:'challenges',label:'📋 Desafios'},{id:'cards',label:'🃏 Cartas'},{id:'dice',label:'🎲 Dados'}]

export default function Admin(){
  const navigate=useNavigate()
  const [unlocked,setUnlocked]=useState(()=>!!getAdminToken())
  const [tab,setTab]=useState('stats')
  const logout=()=>{clearAdminToken();setUnlocked(false)}
  if(!unlocked)return<PasswordGate onUnlock={()=>setUnlocked(true)}/>
  const ActiveTab={stats:StatsTab,community:CommunityTab,import:ImportPackTab,challenges:ChallengesTab,cards:CardsTab,dice:DiceTab}[tab]||StatsTab
  return(
    <div className="min-h-screen bg-[#080b14] flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={()=>navigate('/')} className="text-slate-400 hover:text-white p-1"><ChevronLeft className="w-5 h-5"/></button>
          <div className="flex-1"><h1 className="text-white font-bold text-xl">⚙️ Painel Admin</h1><p className="text-slate-500 text-xs">Gestão de conteúdo</p></div>
          <button onClick={logout} className="text-slate-500 hover:text-red-400 text-xs border border-slate-700 hover:border-red-500/40 rounded-xl px-3 py-1.5 transition-all">Sair</button>
        </div>
        <div className="flex gap-1 overflow-x-auto pb-2 mb-6" style={{scrollbarWidth:'none'}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex-shrink-0 border transition-all ${tab===t.id?'bg-violet-600 border-violet-500 text-white':'bg-white/[0.04] border-white/[0.07] text-slate-400 hover:text-white'}`}>{t.label}</button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
            <ActiveTab/>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
