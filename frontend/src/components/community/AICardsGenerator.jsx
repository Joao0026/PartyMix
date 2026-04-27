import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Plus, RefreshCw, X } from 'lucide-react'
import { useLang } from '../contexts/LangContext'

// Generates cards using Claude API with player names injected
async function generateAICards(players, lang = 'pt') {
  const names = players.map(p => p.name).join(', ')

  const prompts = {
    pt: `Gera 6 cartas de jogo de festa estilo "Cartas Contra a Humanidade" em PORTUGUÊS de Portugal.
Os jogadores desta sessão chamam-se: ${names}.

Regras:
- 4 cartas BRANCAS (respostas engraçadas, frases ou situações absurdas)
- 2 cartas PRETAS (perguntas/frases com ___ para preencher)
- Usa os nomes dos jogadores (${names}) nas cartas para as tornar pessoais e engraçadas
- Tom: irreverente, português, situações do quotidiano, sem ser ofensivo
- Máximo 15 palavras por carta

Responde APENAS com JSON válido, sem texto extra:
{"white": ["carta1", "carta2", "carta3", "carta4"], "black": ["carta_com_blank1 ___", "carta_com_blank2 ___"]}`,

    es: `Genera 6 tarjetas de juego de fiesta estilo "Cartas Contra la Humanidad" en ESPAÑOL.
Los jugadores se llaman: ${names}.

Reglas:
- 4 tarjetas BLANCAS (respuestas graciosas, frases absurdas)
- 2 tarjetas NEGRAS (preguntas con ___ para rellenar)
- Usa los nombres (${names}) para hacerlas personales y graciosas
- Tono: irreverente, situaciones cotidianas, sin ser ofensivo
- Máximo 15 palabras por tarjeta

Responde SOLO con JSON válido:
{"white": ["tarjeta1", "tarjeta2", "tarjeta3", "tarjeta4"], "black": ["pregunta1 ___", "pregunta2 ___"]}`,

    en: `Generate 6 party game cards in the style of "Cards Against Humanity" in ENGLISH.
The players are named: ${names}.

Rules:
- 4 WHITE cards (funny answers, absurd phrases or situations)
- 2 BLACK cards (questions/prompts with ___ to fill in)
- Use the players' names (${names}) to make them personal and funny
- Tone: irreverent, everyday situations, not offensive
- Maximum 15 words per card

Reply ONLY with valid JSON, no extra text:
{"white": ["card1", "card2", "card3", "card4"], "black": ["prompt_with_blank1 ___", "prompt_with_blank2 ___"]}`,
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompts[lang] || prompts.pt }]
    })
  })

  const data = await response.json()
  const text = data.content?.map(b => b.text || '').join('') || ''
  const clean = text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

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
      const result = await generateAICards(players, lang)
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center p-4">
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
