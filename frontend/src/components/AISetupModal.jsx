// DrinkGame.jsx — AI section updated to call backend instead of Claude directly
// Replace only the AISetupModal component and its usage
// Everything else stays the same as v10

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, RotateCcw } from 'lucide-react'
import { api } from '../utils/api'

// ── AI SETUP MODAL (backend Groq version) ─────────────────────
export function AISetupModal({ players, lang = 'pt', onGenerate, onClose }) {
  const [drinks,  setDrinks]  = useState(() => Object.fromEntries(players.map(p => [p.name, ''])))
  const [loading, setLoading] = useState(false)
  const [cards,   setCards]   = useState([])
  const [error,   setError]   = useState(null)

  const generate = async () => {
    setLoading(true); setCards([]); setError(null)
    try {
      const playerList = players.map(p => ({ name: p.name, drink: drinks[p.name] || '' }))
      const result = await api.generateDrinkCards(playerList, lang)
      if (result.error) throw new Error(result.error)
      setCards(result.cards || [])
      if (result.fallback) setError('IA indisponível — cartas criadas com templates!')
    } catch (e) {
      setError('Sem ligação ao servidor. A tentar de novo...')
      // local fallback
      const names = players.map(p => p.name)
      const dks   = players.map(p => drinks[p.name] || 'bebida')
      setCards([
        { text:`${names[0]}, um gole de ${dks[0]} agora — siga siga!`,          type:'ai', emoji:'🤖', title:'Carta IA', is_ai:true },
        { text:`Brinde ao ${names[Math.floor(Math.random()*names.length)]}! Toda a gente bebe 1!`, type:'ai', emoji:'🤖', title:'Carta IA', is_ai:true },
        { text:`${names[1]||names[0]} distribui 2 golos. Poder total!`,          type:'ai', emoji:'🤖', title:'Carta IA', is_ai:true },
        { text:`Quem tem ${dks[0]} mais fraco bebe 2 golos!`,                    type:'ai', emoji:'🤖', title:'Carta IA', is_ai:true },
      ])
    }
    setLoading(false)
  }

  const add = () => { onGenerate(cards); onClose() }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end justify-center p-4">
      <motion.div initial={{y:100,opacity:0}} animate={{y:0,opacity:1}} exit={{y:100,opacity:0}}
        transition={{type:'spring',damping:20}}
        className="w-full max-w-lg rounded-3xl overflow-hidden"
        style={{background:'#0f1120', border:'0.5px solid rgba(139,92,246,0.4)'}}>
        <div className="px-5 py-4 flex items-center gap-3" style={{background:'linear-gradient(135deg,#7c3aed,#a855f7)'}}>
          <Sparkles className="text-white w-5 h-5"/>
          <h3 className="text-white font-black text-lg">✨ Cartas Personalizadas com IA</h3>
          <button onClick={onClose} className="ml-auto text-white/60 hover:text-white font-bold text-xl w-8 h-8 flex items-center justify-center">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-slate-400 text-sm text-center">
            Diz o que cada um está a beber — a IA cria cartas personalizadas! 🍹
          </p>

          {/* Player drink inputs */}
          <div className="space-y-2">
            {players.map(p => (
              <div key={p.name} className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center text-white text-sm font-black flex-shrink-0`}>
                  {p.name[0]}
                </div>
                <input value={drinks[p.name]||''} onChange={e => setDrinks(d=>({...d,[p.name]:e.target.value}))}
                  placeholder={`${p.name} está a beber...`}
                  className="flex-1 bg-slate-800 text-white rounded-xl px-3 py-2.5 outline-none border border-slate-600 focus:border-violet-500/50 text-sm"/>
              </div>
            ))}
          </div>

          {/* Error notice */}
          {error && (
            <p className="text-amber-400/80 text-xs text-center bg-amber-500/10 border border-amber-500/20 rounded-xl p-2">
              ⚠️ {error}
            </p>
          )}

          {/* Generate button */}
          {!cards.length && !loading && (
            <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.97}} onClick={generate}
              className="w-full text-white font-black rounded-2xl py-4 flex items-center justify-center gap-2"
              style={{background:'linear-gradient(135deg,#7c3aed,#a855f7)'}}>
              <Sparkles className="w-5 h-5"/> Gerar Cartas com IA
            </motion.button>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center py-6 space-y-3">
              <motion.div animate={{rotate:360}} transition={{repeat:Infinity,duration:1,ease:'linear'}}>
                <Sparkles className="text-violet-400 w-8 h-8 mx-auto"/>
              </motion.div>
              <p className="text-slate-400 text-sm">A personalizar as cartas com Groq AI...</p>
              <p className="text-slate-600 text-xs">Llama 3.1 a trabalhar 🦙</p>
            </div>
          )}

          {/* Results */}
          {cards.length > 0 && (
            <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="space-y-3">
              <p className="text-slate-400 text-xs text-center uppercase tracking-wider">Cartas geradas:</p>
              {cards.map((card, i) => (
                <div key={i} className="bg-violet-900/30 border border-violet-500/30 rounded-xl p-3 flex items-start gap-2">
                  <span className="text-lg flex-shrink-0">{card.emoji || '🤖'}</span>
                  <p className="text-white text-sm font-medium">{card.text}</p>
                </div>
              ))}
              <div className="flex gap-3">
                <button onClick={generate}
                  className="flex-1 bg-white/[0.06] border border-white/[0.08] text-white rounded-2xl py-3 text-sm font-medium flex items-center justify-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5"/> Regenerar
                </button>
                <motion.button whileTap={{scale:0.97}} onClick={add}
                  className="flex-1 text-white font-bold rounded-2xl py-3 text-sm"
                  style={{background:'linear-gradient(135deg,#7c3aed,#a855f7)'}}>
                  + Adicionar ao Baralho
                </motion.button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
