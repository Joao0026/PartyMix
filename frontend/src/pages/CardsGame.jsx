import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../utils/api'
import { shuffle } from '../utils/game'
import { Crown, ChevronLeft, RotateCcw } from 'lucide-react'

// Fallback cards if API is unavailable
const FALLBACK_BLACK = [
  { text:'O novo plano do governo para a habitação: ___.', category:'cultura' },
  { text:'Nunca deves dizer ___ numa primeira consulta.', category:'geral' },
  { text:'A nova série da RTP é sobre ___.', category:'geral' },
  { text:'O segredo do sucesso em Portugal é ___.', category:'cultura' },
  { text:'Porque é que os portugueses nunca chegam a horas? ___.', category:'cultura' },
  { text:'Estudos revelam que ___ aumenta 300% a felicidade.', category:'absurdo' },
  { text:'O meu plano de reforma baseia-se em ___.', category:'geral' },
  { text:'Próxima atração do Festival de Sintra: ___.', category:'absurdo' },
  { text:'Moda nova dos millennials portugueses: ___.', category:'cultura' },
  { text:'O Ronaldo só assina se o clube garantir ___.', category:'cultura' },
  { text:'A IA vai substituir ___ e era mesmo hora.', category:'absurdo' },
  { text:'O reality show mais honesto de Portugal seria sobre ___.', category:'cultura' },
  { text:'Misturar ___ com ___ foi o pior erro da minha vida.', category:'geral' },
  { text:'Querido Diário: Hoje conheci ___ e fizemos ___. Nunca mais fui o mesmo.', category:'geral' },
  { text:'O que o meu terapeuta disse: ___.', category:'geral' },
  { text:'Nova lei proíbe ___ em espaços públicos.', category:'absurdo' },
  { text:'Peppa Pig Adulta: Peppa descobre ___.', category:'absurdo' },
  { text:'O que acontece em Portugal com 30 graus? ___.', category:'cultura' },
  { text:'Portugal 2050. O maior problema já não é habitação, é ___.', category:'absurdo' },
  { text:'O que a minha mãe mandou no grupo às 7h: ___.', category:'geral' },
]

const FALLBACK_WHITE = [
  'O Cristiano Ronaldo em modo humilde','Pastéis de Belém às 3 da manhã','A saudade de não fazer nada',
  'O Sporting a ganhar a liga','A avó com tupperware de comida','Férias em agosto com tudo fechado',
  'A novela das 21h','O Zé Povinho com smartphone','O António Costa a sorrir misteriosamente',
  'Uma cabra filósofa com doutoramento','Um pombo com MBA','O existencialismo às 4 da manhã',
  'A reunião que podia ser um email','O LinkedIn às 2 da manhã','A felicidade num PowerPoint',
  'O chefe que não percebe nada','O email enviado para toda a empresa','O estágio não remunerado',
  'O PowerPoint com 47 slides','Trabalho remoto em pijama com blazer','Pedir aumento e receber pizza',
  'A tia que faz perguntas incómodas','O jantar de Natal que correu mal','O grupo de família às 7h',
  'A ansiedade de abrir carta do hospital','O FOMO num domingo à chuva','O burnout aos 24 anos',
  'O ex que viu a story mas não respondeu','A bateria a 1% longe de tomadas','O autocorreto traiçoeiro',
  'O VAR que anulou o golo','O árbitro comprado segundo os adeptos','O transfer que nunca jogou',
  'O spoiler não pedido','O final de série que destruiu 8 anos','O reboot que ninguém pediu',
  'A imperial morna que custou 4 euros','Comer às 22h30 porque somos portugueses',
  'A última bolacha do pacote partida','O Wi-Fi do vizinho com password enorme',
  'Explicar um meme ao pai durante 15 minutos','O político honesto como o Pai Natal',
  'O estacionamento em Lisboa em qualquer dia','Um seguro de saúde que funciona como descrito',
  'Fazer anos com toda a gente a lembrar pelo Facebook','O plano de negócios que ninguém leu',
  'A posição que só funciona nos filmes','Um massajista com dedos milagrosos',
  'O vizinho bonito que só vês às segundas','O histórico do browser que não pode ser visto',
]

export default function CardsGame() {
  const navigate = useNavigate()
  const { state } = useLocation()

  const [allBlack, setAllBlack] = useState([])
  const [allWhite, setAllWhite] = useState([])
  const [deck,     setDeck]     = useState([]) // remaining white cards
  const [hands,    setHands]    = useState({}) // {playerIdx: [cards]}
  const [blackCard,setBlackCard]= useState(null)
  const [czarIdx,  setCzarIdx]  = useState(0)
  const [submitted,setSubmitted]= useState({}) // {playerIdx: card}
  const [scores,   setScores]   = useState({})
  const [winner,   setWinner]   = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [round,    setRound]    = useState(1)

  const players = state?.lobby?.players || state?.players || []

  useEffect(() => {
    if (!players.length) { navigate('/CardsLobby'); return }
    loadCards()
  }, [])

  const loadCards = async () => {
    setLoading(true)
    let blacks, whites
    try {
      [blacks, whites] = await Promise.all([
        api.getCards({ is_black: true }),
        api.getCards({ is_black: false }),
      ])
    } catch {
      blacks = []; whites = []
    }
    // Merge with fallbacks
    const bCards = blacks.length > 5 ? shuffle(blacks) : shuffle(FALLBACK_BLACK.map((c,i) => ({ ...c, _id: `fb_b_${i}`, is_black: true })))
    const wCards = whites.length > 20
      ? shuffle(whites)
      : shuffle(FALLBACK_WHITE.map((t,i) => ({ text: t, _id: `fb_w_${i}`, is_black: false, category: 'geral' })))

    setAllBlack(bCards)
    setAllWhite(wCards)
    setBlackCard(bCards[0])

    // Deal 7 cards to each player
    const newHands = {}
    const sc = {}
    let pool = [...wCards]
    players.forEach((_, i) => {
      newHands[i] = pool.splice(0, 7)
      sc[i] = 0
    })
    setHands(newHands)
    setDeck(pool)
    setScores(sc)
    setCzarIdx(0)
    setSubmitted({})
    setLoading(false)
  }

  const submitCard = (playerIdx, card) => {
    if (playerIdx === czarIdx || submitted[playerIdx]) return
    setSubmitted(s => ({ ...s, [playerIdx]: card }))
  }

  const nonCzarPlayers = players.map((_, i) => i).filter(i => i !== czarIdx)
  const allSubmitted = nonCzarPlayers.every(i => submitted[i])

  const pickWinner = (playerIdx) => {
    setScores(s => ({ ...s, [playerIdx]: (s[playerIdx] || 0) + 1 }))
    setWinner(playerIdx)
  }

  const nextRound = () => {
    if (winner === null) return
    // Replace played cards
    const newHands = { ...hands }
    let pool = [...deck]
    nonCzarPlayers.forEach(i => {
      if (submitted[i]) {
        newHands[i] = newHands[i].filter(c => c._id !== submitted[i]._id)
        if (pool.length > 0) { newHands[i].push(pool.shift()) }
      }
    })
    const nextCzar = (czarIdx + 1) % players.length
    const nextBlack = allBlack[(round) % allBlack.length]
    setHands(newHands)
    setDeck(pool)
    setBlackCard(nextBlack)
    setCzarIdx(nextCzar)
    setSubmitted({})
    setWinner(null)
    setRound(r => r + 1)
  }

  if (!players.length) return null

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-amber-900/20 to-slate-900 flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="text-4xl animate-spin">🃏</div>
        <p className="text-white font-bold">A baralhar as cartas...</p>
      </div>
    </div>
  )

  const maxScore = Math.max(...Object.values(scores))
  const leader = Object.keys(scores).find(k => scores[k] === maxScore && maxScore > 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-amber-900/10 to-slate-900 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <button onClick={() => navigate('/')} className="text-slate-400 text-sm flex items-center gap-1">
            <ChevronLeft className="w-4 h-4"/> Sair
          </button>
          <div className="text-center">
            <p className="text-white font-bold text-sm">Ronda {round}</p>
            <p className="text-slate-400 text-xs">Czar: <span className="text-amber-400 font-bold">{players[czarIdx]?.name}</span></p>
          </div>
          <button onClick={loadCards} className="text-slate-400 hover:text-white">
            <RotateCcw className="w-4 h-4"/>
          </button>
        </div>
        {/* Scores */}
        <div className="flex justify-center gap-4 mt-3 max-w-lg mx-auto">
          {players.map((p, i) => (
            <div key={i} className="text-center">
              <div className="flex items-center gap-1 justify-center">
                {i === czarIdx && <Crown className="w-3 h-3 text-amber-400"/>}
                {parseInt(leader) === i && scores[i] > 0 && <span className="text-xs">👑</span>}
              </div>
              <div className={`text-lg font-black ${parseInt(leader)===i&&scores[i]>0?'text-amber-400':'text-white'}`}>{scores[i]}</div>
              <div className="text-slate-500 text-xs truncate max-w-16">{p.name.split(' ')[0]}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center px-4 py-4 max-w-lg mx-auto w-full gap-4 overflow-y-auto">
        {/* Black card */}
        <motion.div layout className="w-full bg-black border border-white/20 rounded-2xl p-5 shadow-xl">
          <p className="text-amber-400 text-xs font-bold mb-2 uppercase tracking-wider">Carta Preta</p>
          <p className="text-white text-lg font-bold leading-relaxed">{blackCard?.text}</p>
        </motion.div>

        {/* Phase: submitting */}
        {!allSubmitted && (
          <div className="w-full space-y-4">
            <p className="text-slate-400 text-xs text-center">
              {nonCzarPlayers.filter(i => submitted[i]).length}/{nonCzarPlayers.length} jogadores submeteram
            </p>
            {players.map((p, pi) => {
              if (pi === czarIdx) return (
                <div key={pi} className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-center">
                  <Crown className="w-5 h-5 text-amber-400 mx-auto mb-1"/>
                  <p className="text-amber-400 font-bold text-sm">{p.name} é o Czar desta ronda</p>
                  <p className="text-slate-400 text-xs">Aguarda que os outros submetam</p>
                </div>
              )
              return (
                <div key={pi} className={`bg-white/5 border rounded-2xl p-4 transition-all ${submitted[pi] ? 'border-green-500/40 bg-green-900/10' : 'border-white/10'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black`}
                      style={{ background: `linear-gradient(135deg, var(--tw-gradient-stops))` }}
                      className={`w-8 h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white text-xs font-black`}>
                      {p.name[0]}
                    </div>
                    <span className="text-white text-sm font-medium">{p.name}</span>
                    {submitted[pi] && <span className="ml-auto text-green-400 text-xs font-bold">✅ Submeteu</span>}
                  </div>
                  {!submitted[pi] && (
                    <div className="flex flex-wrap gap-2">
                      {(hands[pi] || []).map((card, ci) => (
                        <motion.button key={ci} whileTap={{ scale: 0.95 }}
                          onClick={() => submitCard(pi, card)}
                          className="bg-white text-black text-xs font-medium rounded-xl px-3 py-2 text-left hover:bg-slate-100 transition-all max-w-full">
                          {card.text}
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Phase: czar picks winner */}
        {allSubmitted && winner === null && (
          <div className="w-full space-y-3">
            <div className="text-center">
              <Crown className="w-6 h-6 text-amber-400 mx-auto mb-1"/>
              <p className="text-white font-bold">{players[czarIdx]?.name}, escolhe a melhor resposta!</p>
            </div>
            {Object.entries(submitted).map(([idx, card]) => (
              <motion.button key={idx} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => pickWinner(parseInt(idx))}
                className="w-full bg-white text-black font-bold rounded-2xl p-5 text-left hover:bg-slate-100 transition-all shadow-lg">
                {card.text}
              </motion.button>
            ))}
          </div>
        )}

        {/* Winner celebration */}
        {winner !== null && (
          <AnimatePresence>
            <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="w-full bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border border-amber-500/40 rounded-2xl p-6 text-center space-y-3">
              <div className="text-5xl">🏆</div>
              <p className="text-white font-black text-2xl">{players[winner]?.name} venceu!</p>
              <div className="bg-white text-black rounded-xl p-3 text-sm font-medium">
                {submitted[winner]?.text}
              </div>
              <div className="flex gap-2 text-sm">
                {players.map((p, i) => (
                  <div key={i} className="flex-1 bg-white/10 rounded-xl py-2 text-center">
                    <div className={`font-black ${i === winner ? 'text-amber-400' : 'text-white'}`}>{scores[i]}</div>
                    <div className="text-slate-400 text-xs truncate">{p.name.split(' ')[0]}</div>
                  </div>
                ))}
              </div>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={nextRound}
                className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold rounded-2xl py-4">
                Próxima Ronda →
              </motion.button>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
