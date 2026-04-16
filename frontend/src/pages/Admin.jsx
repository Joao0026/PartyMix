import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, Trash2, ChevronLeft } from 'lucide-react'
import { api } from '../utils/api'

const TABS = ['Desafios','Cartas','Dados']

function ChallengesTab() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ text:'', category:'mimica', mode_type:'friends', difficulty:'medio', time_limit:60, sips_penalty:2, is_ongoing:false, ongoing_rounds:0, ongoing_instruction:'' })
  const cats = ['mimica','desenho','palavra','acao','verdade','consequencia','cultura','desporto','musica','cinema','erotico','dados']
  useEffect(() => { api.getChallenges().then(setItems) }, [])
  const save = async () => {
    await api.createChallenge(form)
    api.getChallenges().then(setItems)
    setForm({ text:'', category:'mimica', mode_type:'friends', difficulty:'medio', time_limit:60, sips_penalty:2, is_ongoing:false, ongoing_rounds:0, ongoing_instruction:'' })
  }
  const del = async (id) => { await api.deleteChallenge(id); setItems(i => i.filter(x => x._id !== id)) }
  const inp = 'w-full bg-white/5 text-white rounded-xl px-3 py-2.5 outline-none border border-white/10 focus:border-violet-500/50 text-sm'
  return (
    <div className="space-y-4">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
        <h3 className="text-white font-semibold">Novo Desafio</h3>
        <textarea value={form.text} onChange={e=>setForm(f=>({...f,text:e.target.value}))} placeholder="Texto do desafio..." className={inp+' resize-none h-20'} />
        <div className="grid grid-cols-2 gap-2">
          <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} className={inp}>
            {cats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={form.mode_type} onChange={e=>setForm(f=>({...f,mode_type:e.target.value}))} className={inp}>
            {['couple','friends','family','all'].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={form.difficulty} onChange={e=>setForm(f=>({...f,difficulty:e.target.value}))} className={inp}>
            {['facil','medio','dificil'].map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <input type="number" value={form.time_limit} onChange={e=>setForm(f=>({...f,time_limit:+e.target.value}))} placeholder="Tempo (seg)" className={inp} />
        </div>
        <label className="flex items-center gap-2 text-slate-300 text-sm cursor-pointer">
          <input type="checkbox" checked={form.is_ongoing} onChange={e=>setForm(f=>({...f,is_ongoing:e.target.checked}))} className="rounded" />
          Desafio Contínuo
        </label>
        {form.is_ongoing && (
          <div className="space-y-2">
            <input type="number" value={form.ongoing_rounds} onChange={e=>setForm(f=>({...f,ongoing_rounds:+e.target.value}))} placeholder="Rondas" className={inp} />
            <input value={form.ongoing_instruction} onChange={e=>setForm(f=>({...f,ongoing_instruction:e.target.value}))} placeholder="Instrução contínua..." className={inp} />
          </div>
        )}
        <button onClick={save} disabled={!form.text.trim()} className="w-full bg-gradient-to-r from-violet-600 to-purple-700 text-white font-bold rounded-xl py-3 disabled:opacity-50 flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> Adicionar
        </button>
      </div>
      <div className="space-y-2">
        {items.map(item => (
          <div key={item._id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-start gap-3">
            <div className="flex-1">
              <p className="text-white text-sm">{item.text}</p>
              <p className="text-slate-500 text-xs mt-1">{item.category} · {item.mode_type} · {item.difficulty}</p>
            </div>
            <button onClick={() => del(item._id)} className="text-slate-500 hover:text-red-400 flex-shrink-0"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </div>
  )
}

function CardsTab() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ text:'', category:'geral', is_black: false })
  useEffect(() => { api.getCards().then(setItems) }, [])
  const save = async () => { await api.createCard(form); api.getCards().then(setItems); setForm({ text:'', category:'geral', is_black:false }) }
  const del = async (id) => { await api.deleteCard(id); setItems(i => i.filter(x => x._id !== id)) }
  const inp = 'w-full bg-white/5 text-white rounded-xl px-3 py-2.5 outline-none border border-white/10 focus:border-amber-500/50 text-sm'
  return (
    <div className="space-y-4">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
        <h3 className="text-white font-semibold">Nova Carta</h3>
        <textarea value={form.text} onChange={e=>setForm(f=>({...f,text:e.target.value}))} placeholder="Texto da carta..." className={inp+' resize-none h-20'} />
        <div className="grid grid-cols-2 gap-2">
          <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} className={inp}>
            {['geral','adulto','cultura','absurdo'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={form.is_black ? 'true' : 'false'} onChange={e=>setForm(f=>({...f,is_black:e.target.value==='true'}))} className={inp}>
            <option value="false">Branca (resposta)</option>
            <option value="true">Preta (pergunta)</option>
          </select>
        </div>
        <button onClick={save} disabled={!form.text.trim()} className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold rounded-xl py-3 disabled:opacity-50 flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> Adicionar
        </button>
      </div>
      <div className="space-y-2">
        {items.map(item => (
          <div key={item._id} className={`border rounded-xl p-3 flex items-start gap-3 ${item.is_black ? 'bg-black border-white/20' : 'bg-white border-slate-200'}`}>
            <p className={`flex-1 text-sm font-medium ${item.is_black ? 'text-white' : 'text-black'}`}>{item.text}</p>
            <button onClick={() => del(item._id)} className="text-slate-500 hover:text-red-400 flex-shrink-0"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </div>
  )
}

function DiceTab() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ text:'', dice_type:'body_part' })
  useEffect(() => { api.getDice().then(setItems) }, [])
  const save = async () => { await api.createDice(form); api.getDice().then(setItems); setForm({ text:'', dice_type:'body_part' }) }
  const del = async (id) => { await api.deleteDice(id); setItems(i => i.filter(x => x._id !== id)) }
  const inp = 'w-full bg-white/5 text-white rounded-xl px-3 py-2.5 outline-none border border-white/10 text-sm'
  return (
    <div className="space-y-4">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
        <h3 className="text-white font-semibold">Nova Opção de Dado</h3>
        <input value={form.text} onChange={e=>setForm(f=>({...f,text:e.target.value}))} placeholder="Texto..." className={inp} />
        <select value={form.dice_type} onChange={e=>setForm(f=>({...f,dice_type:e.target.value}))} className={inp}>
          <option value="body_part">Parte do Corpo</option>
          <option value="action">Ação</option>
        </select>
        <button onClick={save} disabled={!form.text.trim()} className="w-full bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold rounded-xl py-3 disabled:opacity-50">
          <Plus className="w-4 h-4 inline mr-2" /> Adicionar
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {['body_part','action'].map(type => (
          <div key={type}>
            <h4 className="text-slate-400 text-xs mb-2 uppercase tracking-wider">{type === 'body_part' ? '🫀 Corpo' : '⚡ Ação'}</h4>
            {items.filter(i => i.dice_type === type).map(item => (
              <div key={item._id} className="bg-white/5 border border-white/10 rounded-xl p-2 flex items-center gap-2 mb-1">
                <span className="flex-1 text-white text-sm">{item.text}</span>
                <button onClick={() => del(item._id)} className="text-slate-500 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Admin() {
  const navigate = useNavigate()
  const [tab, setTab] = useState(0)
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white"><ChevronLeft /></button>
          <h1 className="text-white font-bold text-xl">⚙️ Painel Admin</h1>
        </div>
        <div className="flex bg-white/5 rounded-2xl p-1 mb-6">
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${tab===i ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              {t}
            </button>
          ))}
        </div>
        <motion.div key={tab} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}>
          {tab === 0 && <ChallengesTab />}
          {tab === 1 && <CardsTab />}
          {tab === 2 && <DiceTab />}
        </motion.div>
      </div>
    </div>
  )
}
