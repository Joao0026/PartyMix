import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Plus, RefreshCw, X } from 'lucide-react'
import { useLang } from '../../contexts/LangContext'
import { api } from '../../utils/api'

export default function AICardsGenerator({ players, onAddCards, onClose }) {
  const { t, lang } = useLang()
  const [loading, setLoading] = useState(false)
  const [cards, setCards] = useState(null)
  const [error, setError] = useState(null)
  const [added, setAdded] = useState(false)

  const generate = async () => {
    setLoading(true)
    setError(null)
    setCards(null)
    try {
      const result = await api.generateCards(players, lang)
      setCards(result)
    } catch (e) {
      // Fallback to template cards if API fails
      const names = players.map(p => p.name)
      const n = (i) => names[i % names.length]
      setCards({
        white: [
          `${n(0)} a tentar cozinhar às 2 da manhã`,
          `A desculpa do ${n(1)} para chegar tarde`,
          `${n(0)} e ${n(1)} numa ilha deserta com uma bola de futebol`,
          `O plano secreto de ${n(Math.floor(Math.random() * names.length))} para dominar o mundo`,
        ],
        black: [
          `Porque é que o ${n(0)} nunca chega a horas? ___.`,
          `O maior segredo de ${n(1)}: ___.`,
        ]
      })
    }
    setLoading(false)
  }

  const handleAdd = () => {
    if (!cards) return
    const formatted = [
      ...cards.white.map(text => ({ text, is_black: false, category: 'geral', isAI: true })),
      ...cards.black.map(text => ({ text, is_black: true, category: 'geral', isAI: true })),
    ]
    onAddCards && onAddCards(formatted)
    setAdded(true)
    setTimeout(onClose, 1500)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center overlay-safe-pad">
      <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        className="w-full max-w-lg rounded-3xl overflow-hidden"
        style={{ background: '#0f1120', border: '0.5px solid rgba(255,255,255,0.1)' }}>

        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
          <div className="flex items-center gap-2">
            <Sparkles className="text-white w-5 h-5" />
            <h3 className="text-white font-black text-lg">{t.aiCards}</h3>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white p-1"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-slate-400 text-sm text-center">{t.aiCardsDesc}</p>

          {/* Players preview */}
          <div className="flex flex-wrap gap-2 justify-center">
            {players.map((p, i) => (
              <div key={i} className={`px-3 py-1 rounded-full bg-gradient-to-r ${p.color} text-white text-xs font-bold`}>{p.name}</div>
            ))}
          </div>

          {/* Generate button */}
          {!cards && !loading && (
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={generate}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-700 text-white font-black rounded-2xl py-4 flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5" /> {t.generating.replace('...', '')} ✨
            </motion.button>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center space-y-3 py-4">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                <Sparkles className="text-violet-400 w-8 h-8 mx-auto" />
              </motion.div>
              <p className="text-slate-400 text-sm">{t.generating}</p>
              <p className="text-slate-600 text-xs">
                {lang === 'en' ? 'Creating personalized cards with your names...'
                  : lang === 'es' ? 'Creando tarjetas personalizadas con vuestros nombres...'
                  : 'A criar cartas personalizadas com os vossos nomes...'}
              </p>
            </div>
          )}

          {/* Results */}
          {cards && !added && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <div className="space-y-2">
                <p className="text-slate-500 text-xs uppercase tracking-wider">
                  {lang === 'en' ? 'White cards (answers)' : lang === 'es' ? 'Cartas blancas (respuestas)' : 'Cartas brancas (respostas)'}
                </p>
                {cards.white?.map((text, i) => (
                  <div key={i} className="bg-white rounded-xl p-3 text-black text-sm font-medium">{text}</div>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-slate-500 text-xs uppercase tracking-wider">
                  {lang === 'en' ? 'Black cards (questions)' : lang === 'es' ? 'Cartas negras (preguntas)' : 'Cartas pretas (perguntas)'}
                </p>
                {cards.black?.map((text, i) => (
                  <div key={i} className="bg-black border border-white/20 rounded-xl p-3 text-white text-sm font-medium">{text}</div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={generate}
                  className="flex-1 bg-white/5 border border-white/10 text-white rounded-2xl py-3 flex items-center justify-center gap-2 text-sm font-medium">
                  <RefreshCw className="w-4 h-4" /> {lang === 'en' ? 'Regenerate' : lang === 'es' ? 'Regenerar' : 'Regenerar'}
                </button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleAdd}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-purple-700 text-white font-bold rounded-2xl py-3 flex items-center justify-center gap-2 text-sm">
                  <Plus className="w-4 h-4" /> {t.addToGame}
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Added confirmation */}
          {added && (
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-center py-4">
              <p className="text-green-400 font-black text-xl">✅ {lang === 'en' ? 'Cards added!' : lang === 'es' ? '¡Tarjetas añadidas!' : 'Cartas adicionadas!'}</p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
