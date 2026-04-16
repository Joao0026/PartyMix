import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../utils/api'
import { shuffle } from '../utils/game'

export default function CardsGame() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const [blackCard, setBlackCard] = useState(null)
  const [whiteCards, setWhiteCards] = useState([])
  const [allBlack, setAllBlack] = useState([])
  const [allWhite, setAllWhite] = useState([])
  const [hands, setHands] = useState({})
  const [submitted, setSubmitted] = useState({})
  const [czarIdx, setCzarIdx] = useState(0)
  const [phase, setPhase] = useState('playing')
  const [scores, setScores] = useState({})
  const [winner, setWinner] = useState(null)
  const players = state?.lobby?.players || []

  useEffect(() => {
    Promise.all([api.getCards({ is_black: true }), api.getCards({ is_black: false })]).then(([blacks, whites]) => {
      const sb = shuffle(blacks); const sw = shuffle(whites)
      setAllBlack(sb); setAllWhite(sw)
      setBlackCard(sb[0])
      const newHands = {}
      players.forEach((p, i) => { newHands[i] = sw.splice(0, 7) })
      setHands(newHands)
      setWhiteCards(sw)
      const s = {}; players.forEach((_, i) => s[i] = 0); setScores(s)
    })
  }, [])

  const submitCard = (playerIdx, card) => {
    if (playerIdx === czarIdx) return
    setSubmitted(s => ({ ...s, [playerIdx]: card }))
  }

  const pickWinner = (playerIdx) => {
    setScores(s => ({ ...s, [playerIdx]: (s[playerIdx] || 0) + 1 }))
    setWinner(playerIdx)
    setTimeout(() => {
      setWinner(null)
      setSubmitted({})
      setCzarIdx(c => (c + 1) % players.length)
      setAllBlack(b => { const nb = [...b]; nb.push(nb.shift()); setBlackCard(nb[0]); return nb })
      setHands(h => {
        const nh = { ...h }
        players.forEach((_, i) => {
          const sub = submitted[i]
          if (sub) {
            nh[i] = nh[i].filter(c => c._id !== sub._id)
            if (whiteCards.length > 0) {
              const [newCard, ...rest] = whiteCards
              nh[i] = [...nh[i], newCard]
              setWhiteCards(rest)
            }
          }
        })
        return nh
      })
      setPhase('playing')
    }, 2000)
  }

  const allSubmitted = players.filter((_, i) => i !== czarIdx).every((_, idx) => {
    const actualIdx = idx >= czarIdx ? idx + 1 : idx
    return submitted[actualIdx]
  })

  if (!blackCard) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">A carregar...</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-amber-900/20 to-slate-900 flex flex-col">
      <div className="p-4 border-b border-white/10 flex items-center justify-between max-w-lg mx-auto w-full">
        <button onClick={() => navigate('/')} className="text-slate-400 text-sm">← Sair</button>
        <div className="flex gap-3">
          {players.map((p, i) => (
            <div key={i} className="text-center">
              <div className="text-amber-400 font-bold text-sm">{scores[i] || 0}</div>
              <div className="text-slate-500 text-xs">{p.name}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center px-4 py-5 max-w-lg mx-auto w-full gap-4">
        <div className="text-center text-slate-400 text-sm">
          Czar: <span className="text-amber-400 font-bold">{players[czarIdx]?.name}</span>
        </div>
        <div className="bg-black border border-white/20 rounded-2xl p-5 w-full min-h-24">
          <p className="text-white text-lg font-bold leading-relaxed">{blackCard?.text}</p>
        </div>
        {!allSubmitted ? (
          <div className="w-full space-y-3">
            <h3 className="text-slate-400 text-sm">As tuas cartas (não és czar se a tua mão aparecer):</h3>
            {players.map((p, pi) => pi !== czarIdx && (
              <div key={pi} className="bg-white/5 border border-white/10 rounded-2xl p-3">
                <p className="text-slate-400 text-xs mb-2">{p.name} {submitted[pi] ? '✅' : ''}</p>
                <div className="flex flex-wrap gap-2">
                  {(hands[pi] || []).map((card, ci) => (
                    <motion.button key={ci} whileTap={{scale:0.95}} onClick={() => submitCard(pi, card)}
                      disabled={!!submitted[pi]}
                      className={`bg-white text-black text-xs font-medium rounded-xl px-3 py-2 text-left hover:bg-slate-100 transition-all
                        ${submitted[pi]?._id === card._id ? 'ring-2 ring-amber-500' : ''} ${submitted[pi] && submitted[pi]?._id !== card._id ? 'opacity-40' : ''}`}>
                      {card.text}
                    </motion.button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full space-y-3">
            <h3 className="text-white font-semibold text-center">{players[czarIdx]?.name}, escolhe o vencedor!</h3>
            {Object.entries(submitted).map(([idx, card]) => (
              <motion.button key={idx} whileHover={{scale:1.02}} whileTap={{scale:0.95}}
                onClick={() => pickWinner(parseInt(idx))}
                className="w-full bg-white text-black font-bold rounded-2xl p-4 text-left hover:bg-slate-100 transition-all">
                {card.text}
              </motion.button>
            ))}
          </div>
        )}
        <AnimatePresence>
          {winner !== null && (
            <motion.div initial={{scale:0}} animate={{scale:1}} exit={{scale:0}}
              className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">🏆</div>
                <div className="text-white font-black text-3xl">{players[winner]?.name} venceu!</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
