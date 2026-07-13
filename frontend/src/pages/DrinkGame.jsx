import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, RotateCcw, Check, Lock, Plus, Trash2 } from 'lucide-react'
import { shuffle } from '../utils/game'
import { api } from '../utils/api'
import { fetchChallenges, fetchDrinkDecks, fetchDrinkPacks } from '../utils/contentApi'
import { challengePackParams } from '../utils/packParams'
import ImpostorCard, { IMPOSTOR_PAIRS, mergeImpostorPairs } from '../components/game/ImpostorCard'
import PreferenciaCard from '../components/game/PreferenciaCard'

import { FALLBACK_DRINK_DECKS } from '../utils/drinkDecksFallback'
import { formatGoles } from '../utils/penalties'
import { drinkCardImageSrc } from '../utils/drinkCardImage'
import {
  buildAgentPublicPool,
  buildPlayableDrinkDeck,
  composeAgentCard,
  pickBalancedDeckCard,
} from '../utils/drinkAgentCompose'
import { normalizeDrinkCategories, selectableDrinkCategories } from '../utils/drinkBaralhos'
import { substitutePlayerTokens } from '../utils/drinkPlayerText'
import PageShell from '../components/layout/PageShell'
import ModeHeader from '../components/layout/ModeHeader'
import BackButton from '../components/layout/BackButton'
import GameShell from '../components/layout/GameShell'

const MAX_DRINK_PLAYERS = 15

const IMPOSTOR_PENALTY_TEXT =
  'Se a mesa descobrir o impostor, ele bebe 2 goles. Se falhar, distribui 2 goles.'

/** Duração de regras/caos: rondas = cartas; voltas = volta à mesa até ao mesmo jogador. */
function parseActiveDuration(card) {
  const text = `${card?.text || ''} ${card?.title || ''}`.toLowerCase()

  if (/at[eé]\s+sair\s+outra\s+regra/.test(text)) {
    return { unit: 'untilReplaced' }
  }

  const voltaCount = text.match(/(\d+)\s*voltas?\b/)
  if (voltaCount) {
    return { unit: 'lap', amount: Math.min(20, parseInt(voltaCount[1], 10) || 1) }
  }
  if (/volta[s]?\s*(?:à mesa|à\s+mesa)|at[eé] ao fim da volta|durante uma volta|pr[oó]xima volta|\buma volta\b/.test(text)) {
    return { unit: 'lap', amount: 1 }
  }

  const rondaCount = text.match(/(?:durante\s+(?:as\s+)?(?:pr[oó]ximas?\s+)?)?(\d+)\s*rondas?\b/)
  if (rondaCount) {
    return { unit: 'round', amount: Math.min(20, parseInt(rondaCount[1], 10) || 1) }
  }
  if (/at[eé] ao fim da ronda|esta ronda|nesta ronda/.test(text)) {
    return { unit: 'round', amount: 1 }
  }

  if (card?.type === 'caos') return { unit: 'round', amount: 3 }
  if (card?.type === 'regra') return { unit: 'round', amount: 5 }
  return { unit: 'round', amount: 5 }
}

function buildActiveRule(card, readerIndex, nextTurn, playerCount) {
  const duration = parseActiveDuration(card)
  const untilReplaced = duration.unit === 'untilReplaced'
  return {
    id: `${Date.now()}-${Math.random()}`,
    text: card.text,
    ownerIndex: readerIndex,
    type: card.type,
    untilReplaced,
    durationUnit: untilReplaced ? null : duration.unit,
    expiresAt: untilReplaced ? null : expiresAfterDuration(nextTurn, duration, playerCount),
  }
}

function parseAllianceDuration(card) {
  const text = `${card?.text || ''} ${card?.title || ''}`.toLowerCase()
  if (/at[eé]\s+[àa]\s+pr[oó]xima\s+alian[çc]a|at[eé]\s+sair\s+outra\s+alian[çc]a/.test(text)) {
    return { unit: 'untilReplaced' }
  }
  const duration = parseActiveDuration(card)
  if (duration.unit === 'untilReplaced') return null
  const hasExplicitDuration = /(\d+)\s*(?:rondas?|voltas?)\b|durante\s+uma\s+volta|pr[oó]xima\s+volta|at[eé]\s+ao\s+fim\s+da\s+volta|esta\s+ronda|nesta\s+ronda|at[eé]\s+ao\s+fim\s+da\s+ronda/.test(text)
  return hasExplicitDuration ? duration : null
}

function formatDurationTimeLeft(item, turnCount, playerCount) {
  if (item.untilReplaced) return ' · até à próxima aliança'
  return formatRuleTimeLeft(item, turnCount, playerCount)
}

function expiresAfterDuration(nextTurn, duration, playerCount) {
  if (duration.unit === 'untilReplaced') return null
  if (duration.unit === 'lap') return nextTurn + duration.amount * Math.max(1, playerCount)
  return nextTurn + duration.amount
}

function formatRuleTimeLeft(rule, turnCount, playerCount) {
  if (rule.untilReplaced || !rule?.expiresAt) return ''
  const remaining = Math.max(0, rule.expiresAt - turnCount)
  if (remaining === 0) return ''
  if (rule.durationUnit === 'lap') {
    const laps = Math.ceil(remaining / Math.max(1, playerCount))
    return ` · ${laps} volta${laps === 1 ? '' : 's'}`
  }
  return ` · ${remaining} ronda${remaining === 1 ? '' : 's'}`
}
const ROULETTE_SEGS=[
  {label:'Bebe 2',color:'#f59e0b',action:'drink',val:2},
  {label:'Desafio!',color:'#06b6d4',action:'challenge'},
  {label:'Distribui 3',color:'#8b5cf6',action:'give',val:3},
  {label:'Bebe 1',color:'#ef4444',action:'drink',val:1},
  {label:'Sorte!',color:'#10b981',action:'lucky'},
  {label:'Bebe 3',color:'#f43f5e',action:'drink',val:3},
  {label:'Regra!',color:'#a855f7',action:'rule'},
  {label:'Waterfall',color:'#3b82f6',action:'waterfall'},
]

function Roulette({players,currentPlayerIdx}){
  const [totalRot,setTotalRot]=useState(0)
  const [spinning,setSpinning]=useState(false)
  const [result,setResult]=useState(null)
  const n=ROULETTE_SEGS.length
  const step=360/n
  const cx=130,cy=130,r=122
  const player=players[currentPlayerIdx]

  const spin=()=>{
    if(spinning)return
    setSpinning(true);setResult(null)
    const extra=1800+Math.floor(Math.random()*720)
    const newRot=totalRot+extra
    setTotalRot(newRot)
    setTimeout(()=>{
      // Calculate which segment the arrow points to
      // Arrow is at top (270deg). The wheel rotates clockwise.
      const normalised=(newRot%360+360)%360
      const arrowDeg=270 // top
      const offset=(arrowDeg-normalised+360)%360
      const idx=Math.floor(offset/step)%n
      setResult(ROULETTE_SEGS[idx])
      setSpinning(false)
    },3500)
  }

  const getResultText=(seg)=>{
    if(!seg)return''
    if(seg.action==='drink') return `${player?.name} bebe ${formatGoles(seg.val)}!`
    if(seg.action==='give') return `${player?.name} distribui ${formatGoles(seg.val)}!`
    if(seg.action==='challenge') return `${player?.name} tem um desafio!`
    if(seg.action==='lucky') return `${player?.name} tem sorte — imune à próxima!`
    if(seg.action==='rule') return `${player?.name} cria uma regra!`
    if(seg.action==='waterfall') return `WATERFALL! ${player?.name} começa!`
    return seg.label
  }

  return(
    <div className="flex flex-col items-center gap-4">
      {/* Arrow */}
      <div className="relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
          <div className="w-0 h-0 border-l-8 border-r-8 border-b-16 border-l-transparent border-r-transparent border-b-white" style={{borderBottomWidth:20}}/>
        </div>
        <motion.div
          animate={{ rotate: totalRot, scale: spinning ? [1, 1.05, 0.98, 1.02, 1] : 1 }}
          transition={{ duration: 3.5, ease: [0.23,1,0.32,1] }}
          className="drop-shadow-[0_0_28px_rgba(245,158,11,0.35)]"
          style={{width:260,height:260}}>
          <svg width="260" height="260">
            {ROULETTE_SEGS.map((seg,i)=>{
              const sa=(i*step-90)*Math.PI/180
              const ea=((i+1)*step-90)*Math.PI/180
              const x1=cx+r*Math.cos(sa),y1=cy+r*Math.sin(sa)
              const x2=cx+r*Math.cos(ea),y2=cy+r*Math.sin(ea)
              const ma=((i+0.5)*step-90)*Math.PI/180
              const tx=cx+r*0.65*Math.cos(ma),ty=cy+r*0.65*Math.sin(ma)
              return(
                <g key={i}>
                  <path d={`M ${cx},${cy} L ${x1},${y1} A ${r},${r} 0 0,1 ${x2},${y2} Z`} fill={seg.color} stroke="rgba(0,0,0,0.3)" strokeWidth="1.5"/>
                  <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="9.5" fontWeight="bold"
                    transform={`rotate(${(i+0.5)*step},${tx},${ty})`}>{seg.label}</text>
                </g>
              )
            })}
            <circle cx={cx} cy={cy} r={16} fill="#0f172a" stroke="white" strokeWidth="2"/>
          </svg>
        </motion.div>
      </div>

      <motion.button whileHover={{scale:1.04}} whileTap={{scale:0.95}} onClick={spin} disabled={spinning}
        className="w-full text-white font-black rounded-2xl py-4 text-xl disabled:opacity-50"
        style={{background:'linear-gradient(135deg,#f59e0b,#d97706)'}}>
        {spinning?'🌀 A girar...':'🎰 GIRAR!'}
      </motion.button>

      {result&&!spinning&&(
        <motion.div initial={{scale:0.8,opacity:0}} animate={{scale:1,opacity:1}}
          className="w-full rounded-2xl p-4 text-center border"
          style={{background:`${result.color}20`,borderColor:`${result.color}50`}}>
          <p className="text-white font-black text-xl">{result.label}!</p>
          <p className="text-slate-300 text-sm mt-1">{getResultText(result)}</p>
        </motion.div>
      )}
    </div>
  )
}

function DrinkCardBackdrop({ image }) {
  const src = drinkCardImageSrc(image)
  if (!src) return null
  return (
    <>
      <img
        src={src}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
        decoding="async"
        onError={(e) => { e.currentTarget.style.display = 'none' }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/55 to-black/35" aria-hidden />
    </>
  )
}

// ── CARD DECK ────────────────────────────────────────────────
function CardDeck({
  activeDeck,
  agentPublicPool,
  players,
  deckSessionId,
  impostorPairs,
  onCardDrawn,
  onAgentResult,
  onAllianceChosen,
  onImpostorResult,
}) {
  const [deck, setDeck] = useState(() => shuffle([...activeDeck]))
  const [current, setCurrent] = useState(null)
  const [agentOpen, setAgentOpen] = useState(false)
  const [agentResult, setAgentResult] = useState(null)
  const [impostorIndex, setImpostorIndex] = useState(null)
  const [impostorDone, setImpostorDone] = useState(false)
  const [allianceDone, setAllianceDone] = useState(false)
  const [allianceTarget, setAllianceTarget] = useState('')
  const [recentTypes, setRecentTypes] = useState([])
  const [recentDeckIds, setRecentDeckIds] = useState([])
  const recentPublicTextsRef = useRef([])
  /** Índice do jogador que deve tirar a próxima carta (ou que acabou de tirar, conforme ecrã) */
  const [nextReaderIdx, setNextReaderIdx] = useState(0)
  /** Quem tirou a carta atualmente visível */
  const [lastReaderIdx, setLastReaderIdx] = useState(null)

  useEffect(() => {
    setDeck(shuffle([...activeDeck]))
    setCurrent(null)
    setAgentOpen(false)
    setAgentResult(null)
    setImpostorIndex(null)
    setImpostorDone(false)
    setAllianceDone(false)
    setAllianceTarget('')
    setNextReaderIdx(0)
    setLastReaderIdx(null)
    setRecentTypes([])
    setRecentDeckIds([])
    recentPublicTextsRef.current = []
  }, [deckSessionId, activeDeck])

  const finalizeAgent = (raw) => {
    if (!agentPublicPool.length) return raw
    const composed = composeAgentCard(raw, agentPublicPool, recentPublicTextsRef.current)
    if (composed.publicText) {
      recentPublicTextsRef.current = [...recentPublicTextsRef.current.slice(-12), composed.publicText]
    }
    return composed
  }

  const draw = () => {
    if (!deck.length) return
    if (current?.type === 'impostor' && !impostorDone) return
    if (current?.type === 'alliance' && !allianceDone) return
    const drinkSpam = recentTypes.slice(-2).every(type => type === 'beber')
    const repeatedDeck = recentDeckIds.length >= 2 && recentDeckIds.slice(-2).every((id) => id && id === recentDeckIds[recentDeckIds.length - 1])
    let pool = deck
    if (drinkSpam) {
      const filtered = deck.filter((card) => card.type !== 'beber')
      if (filtered.length) pool = filtered
    }
    const avoidDeckIds = repeatedDeck ? [recentDeckIds[recentDeckIds.length - 1]] : []
    const { card: picked, rest } = pickBalancedDeckCard(pool, { avoidDeckIds })
    if (!picked) return
    let card = picked
    if (card?.type === 'agent') card = finalizeAgent(card)
    if (card?.type === 'impostor') {
      setImpostorIndex(Math.floor(Math.random() * players.length))
      if (!card.text?.trim()) {
        card = { ...card, text: IMPOSTOR_PENALTY_TEXT }
      }
    } else {
      setImpostorIndex(null)
    }
    const reader = nextReaderIdx % players.length
    setLastReaderIdx(reader)
    setCurrent(card)
    setAgentOpen(false)
    setAgentResult(null)
    setImpostorDone(false)
    setAllianceDone(card?.type !== 'alliance')
    setAllianceTarget('')
    setDeck(rest)
    setRecentTypes(types => [...types.slice(-2), card.type])
    setRecentDeckIds((ids) => [...ids.slice(-2), card.deckId || 'outros'])
    setNextReaderIdx((reader + 1) % players.length)
    onCardDrawn?.(card, reader)
  }

  const n = players.length || 1
  const whoReads = current == null ? players[nextReaderIdx % n] : players[(lastReaderIdx ?? nextReaderIdx) % n]

  const TYPE_COLORS = {
    beber: 'from-amber-500 to-orange-600',
    regra: 'from-violet-600 to-purple-700',
    desafio: 'from-cyan-600 to-blue-700',
    poder: 'from-amber-400 to-yellow-500',
    sorte: 'from-emerald-600 to-teal-700',
    azar: 'from-slate-600 to-slate-800',
    caos: 'from-red-600 to-rose-700',
    agent: 'from-slate-800 to-zinc-950',
    alliance: 'from-pink-600 to-rose-700',
    miniboss: 'from-red-700 to-orange-700',
    impostor: 'from-fuchsia-700 to-purple-900',
    preferencia: 'from-slate-800 to-slate-900',
    maldicao: 'from-cyan-700 to-teal-900',
    historia: 'from-amber-700 to-orange-800',
  }
  const TYPE_LABELS = {
    beber: 'Beber',
    regra: 'Regra da Mesa',
    desafio: 'Missão',
    poder: 'Poder',
    sorte: 'Sorte',
    azar: 'Azar',
    caos: 'Caos',
    agent: 'Agente Secreto',
    alliance: 'Aliança',
    miniboss: 'Mini Boss',
    impostor: 'Impostor',
    preferencia: 'Preferias?',
    maldicao: 'Maldição',
    historia: 'História',
  }

  const impostorLocked = current?.type === 'impostor' && !impostorDone
  const allianceLocked = current?.type === 'alliance' && !allianceDone
  const cardImageSrc = current ? drinkCardImageSrc(current.image) : ''
  const readerName = whoReads?.name || ''
  const px = (s) => substitutePlayerTokens(s, players, {
    reader: readerName,
    readerGender: whoReads?.gender ?? null,
  })
  const cardTitle = current ? px(current.title) : ''
  const cardText = current ? px(current.text) : ''
  const cardPublicText = current ? px(current.publicText) : ''
  const cardSecretMission = current ? px(current.secretMission) : ''

  const resolveAgent = (outcome) => {
    setAgentResult(outcome)
    onAgentResult?.(outcome, lastReaderIdx ?? nextReaderIdx)
  }

  const chooseAlliance = () => {
    const targetIndex = Number(allianceTarget)
    const readerIndex = lastReaderIdx ?? nextReaderIdx
    if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= players.length || targetIndex === readerIndex) return
    setAllianceDone(true)
    onAllianceChosen?.(current, readerIndex, targetIndex)
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="flex items-center gap-3 w-full rounded-2xl border border-white/[0.12] bg-white/[0.07] p-3">
        <div
          className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${whoReads?.color || 'from-slate-500 to-slate-700'} flex items-center justify-center text-white font-black text-lg flex-shrink-0`}
        >
          {whoReads?.name?.[0] || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-slate-400 text-xs uppercase tracking-[0.2em] mb-0.5">
            {current ? 'Carta tirada por' : 'Agora é a vez de'}
          </p>
          <p className="text-white font-black text-lg leading-tight truncate">{whoReads?.name || '—'}</p>
          <p className="text-slate-500 text-xs mt-1">{deck.length} cartas no baralho</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {current ? (
          <motion.div
            key={`${current.title}-${current.text || current.publicText || current.secretMission}`}
            initial={{ scale: 0.82, opacity: 0, y: -18, rotate: -3 }}
            animate={{ scale: 1, opacity: 1, y: 0, rotate: current.type === 'caos' ? [0, -1.5, 1.5, 0] : 0 }}
            exit={{ scale: 0.9, opacity: 0, rotate: 2 }}
            transition={{ type: 'spring', damping: 18, stiffness: 240 }}
            className={`relative w-full overflow-hidden ${
              current.type === 'preferencia'
                ? 'bg-transparent p-4 shadow-none min-h-0'
                : `bg-gradient-to-br ${TYPE_COLORS[current.type] || 'from-violet-600 to-purple-700'} rounded-[2rem] border border-amber-200/20 p-8 shadow-[0_24px_80px_rgba(245,158,11,0.20)] min-h-[20rem]`
            } text-center flex flex-col justify-center`}
          >
            <DrinkCardBackdrop image={current.image} />
            {current.type !== 'preferencia' && (
              <>
                <div className="absolute inset-x-8 top-0 z-20 h-px bg-gradient-to-r from-transparent via-amber-200/80 to-transparent" />
                <div className="absolute -right-12 top-10 z-0 h-36 w-36 rounded-full bg-amber-300/20 blur-3xl" />
                <div className="absolute bottom-4 right-5 z-20 text-[10px] font-black uppercase tracking-[0.22em] text-white/35">
                  PartyMix Bar
                </div>
              </>
            )}
            <div className="absolute left-5 top-5 z-20 rounded-full border border-white/20 bg-black/40 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-white/90">
              {TYPE_LABELS[current.type] || 'Carta'}
            </div>
            <div className={`relative z-10 flex flex-col justify-center ${cardImageSrc ? 'min-h-[12rem]' : ''}`}>
            {!cardImageSrc && current.type !== 'preferencia' && (
              <div className="absolute -right-8 -top-10 text-9xl opacity-15 pointer-events-none">{current.emoji}</div>
            )}
            {!cardImageSrc && current.type !== 'preferencia' && (
              <div className="mx-auto mb-4 grid h-24 w-24 place-items-center rounded-3xl border border-white/20 bg-white/15 text-6xl shadow-inner">
                {current.emoji}
              </div>
            )}
            {cardImageSrc && (
              <div className="mx-auto mb-3 text-4xl drop-shadow-md" aria-hidden>{current.emoji}</div>
            )}
            {current.type !== 'preferencia' && (
              <h3 className="text-white font-black text-3xl mb-4 drop-shadow-sm">{cardTitle}</h3>
            )}
            {current.type === 'agent' ? (
              <div className="space-y-3">
                {current.publicText ? (
                  <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                    <p className="text-white/60 text-xs font-black uppercase tracking-[0.18em] mb-1">Lê isto em voz alta à mesa</p>
                    <p className="text-white/90 font-medium leading-relaxed">{cardPublicText}</p>
                  </div>
                ) : (
                  <p className="text-red-300 text-sm font-bold">Sem baralho público activo — esta carta Agente não devia aparecer.</p>
                )}
                {!agentOpen ? (
                  <>
                    <p className="text-white/80 text-sm font-bold">Só {whoReads?.name} vê a missão secreta no telemóvel.</p>
                    <button onClick={()=>setAgentOpen(true)} className="w-full rounded-2xl bg-white/15 border border-white/20 py-3 text-white font-black">
                      Ver missão secreta
                    </button>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4">
                      <p className="text-amber-200 text-xs font-black uppercase tracking-[0.18em] mb-1">Missão secreta</p>
                      <p className="text-white font-bold leading-relaxed">{cardSecretMission}</p>
                    </div>
                    {!agentResult ? (
                      <div className="grid grid-cols-1 gap-2 pt-1">
                        <button type="button" onClick={() => resolveAgent('success')} className="rounded-2xl bg-emerald-500 text-black py-3 font-black">
                          Consegui a missão
                        </button>
                        <button type="button" onClick={() => resolveAgent('fail')} className="rounded-2xl bg-white/[0.12] border border-white/15 text-white py-3 font-bold">
                          Falhei
                        </button>
                        <button type="button" onClick={() => resolveAgent('caught')} className="rounded-2xl bg-red-500 text-white py-3 font-black">
                          Fui apanhado
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-emerald-100 font-black">
                        {agentResult === 'success' && 'Missão cumprida!'}
                        {agentResult === 'fail' && 'Missão falhada.'}
                        {agentResult === 'caught' && 'Foste apanhado.'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : current.type === 'alliance' ? (
              <div className="space-y-4">
                <p className="text-white/90 font-medium leading-relaxed text-lg">{cardText}</p>
                {players.length > 1 && !allianceDone && (
                  <div className="rounded-2xl border border-pink-300/25 bg-black/20 p-4 space-y-3">
                    <p className="text-pink-100 text-xs font-black uppercase tracking-[0.16em]">
                      {whoReads?.name} escolhe o parceiro da aliança
                    </p>
                    <select
                      value={allianceTarget}
                      onChange={(e) => setAllianceTarget(e.target.value)}
                      className="w-full rounded-2xl border border-white/15 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-pink-300/60"
                    >
                      <option value="">Escolher jogador...</option>
                      {players.map((p, idx) => (
                        idx === (lastReaderIdx ?? nextReaderIdx) ? null : (
                          <option key={p.name} value={idx}>{p.name}</option>
                        )
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={chooseAlliance}
                      disabled={allianceTarget === ''}
                      className="w-full rounded-2xl bg-pink-500 py-3 font-black text-white disabled:opacity-40"
                    >
                      Confirmar aliança
                    </button>
                  </div>
                )}
                {allianceDone && (
                  <div className="rounded-2xl border border-pink-300/25 bg-pink-500/10 p-3 text-pink-100 font-black">
                    Aliança registada.
                  </div>
                )}
              </div>
            ) : current.type === 'miniboss' ? (
              <p className="text-white/90 font-medium leading-relaxed text-lg">{cardText}</p>
            ) : current.type === 'maldicao' ? (
              <p className="text-white/90 font-medium leading-relaxed text-lg">{cardText}</p>
            ) : current.type === 'historia' ? (
              <p className="text-white/90 font-medium leading-relaxed text-lg">{cardText}</p>
            ) : current.type === 'preferencia' && Array.isArray(current.choices) && current.choices.length >= 2 ? (
              <PreferenciaCard
                choices={current.choices.slice(0, 2).map((choice) => px(choice))}
                ruleText={cardText}
              />
            ) : current.type === 'impostor' && impostorIndex !== null ? (
              <div className="space-y-3">
                {cardText && (
                  <p className="text-white/90 font-medium leading-relaxed text-base">{cardText}</p>
                )}
                <ImpostorCard
                  players={players}
                  correctQuestion={current.correctQuestion}
                  wrongQuestion={current.wrongQuestion}
                  impostorIndex={impostorIndex}
                  onComplete={(result) => {
                    setImpostorDone(true)
                    onImpostorResult?.(result)
                    requestAnimationFrame(() => {
                      document.getElementById('drink-next-card-btn')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                    })
                  }}
                />
              </div>
            ) : (
              <p className="text-white/90 font-medium leading-relaxed text-lg">{cardText}</p>
            )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="placeholder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full min-h-[14rem] surface border-2 border-dashed border-amber-500/30 rounded-[2rem] flex flex-col items-center justify-center gap-4 px-6 py-8"
          >
            <span className="text-5xl">🃏</span>
            <p className="text-white font-bold text-center text-lg">Próxima carta é tua, {whoReads?.name}!</p>
            <p className="text-slate-400 text-sm text-center leading-relaxed">
              Carrega em <span className="text-amber-400 font-semibold">Ver carta</span> em baixo. Lê em voz alta para o grupo.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {deck.length > 0 ? (
        <div className="sticky-cta -mx-4 px-4 mt-2">
        <motion.button
          id="drink-next-card-btn"
          whileHover={{ scale: (impostorLocked || allianceLocked) ? 1 : 1.02 }}
          whileTap={{ scale: (impostorLocked || allianceLocked) ? 1 : 0.97 }}
          onClick={draw}
          disabled={impostorLocked || allianceLocked}
          className="btn-primary bg-gradient-to-r from-amber-400 via-orange-500 to-rose-600 text-lg text-black shadow-[0_16px_40px_rgba(245,158,11,0.22)] disabled:opacity-40"
        >
          {impostorLocked ? 'Termina a ronda Impostor' : allianceLocked ? 'Escolhe a aliança' : current ? 'Próxima carta →' : 'Ver carta'}
        </motion.button>
        </div>
      ) : (
        <div className="text-center space-y-3 w-full">
          <p className="text-emerald-400 font-bold text-lg">🏆 Baralho esgotado!</p>
          <button
            type="button"
            onClick={() => {
              setDeck(shuffle([...activeDeck]))
              setCurrent(null)
              setNextReaderIdx(0)
              setLastReaderIdx(null)
              setRecentTypes([])
            }}
            className="w-full bg-white/[0.07] text-white rounded-2xl py-3 flex items-center justify-center gap-2 font-medium"
          >
            <RotateCcw className="w-4 h-4" /> Baralhar de novo
          </button>
        </div>
      )}
    </div>
  )
}

// ── MAIN ─────────────────────────────────────────────────────
export default function DrinkGame(){
  const navigate=useNavigate()
  const [phase,setPhase]=useState('setup')
  const [setupStep, setSetupStep] = useState(0)
  const [playerNames,setPlayerNames]=useState(['','',''])
  const [playerGenders,setPlayerGenders]=useState([null, null, null])
  const [selectedCats,setSelectedCats]=useState(['waterfall','eununca','desafios','cadeia','especiais'])
  const [showMesaPanel, setShowMesaPanel] = useState(false)
  const [deckSessionId, setDeckSessionId] = useState(0)
  const [drinkStats,setDrinkStats]=useState([])
  const [activeRules,setActiveRules]=useState([])
  const [activeCurses,setActiveCurses]=useState([])
  const [activeAlliances,setActiveAlliances]=useState([])
  const [turnCount,setTurnCount]=useState(0)
  const [impostorPairs, setImpostorPairs] = useState(IMPOSTOR_PAIRS)
  const [deckCategories, setDeckCategories] = useState(FALLBACK_DRINK_DECKS)
  const [contentPack, setContentPack] = useState('base')
  const [includeCommunity, setIncludeCommunity] = useState(true)
  const [packOptions, setPackOptions] = useState([{ pack: 'base', name: 'base' }])
  const [decksLoading, setDecksLoading] = useState(true)

  const toggleCat=id=>{
    const cat=deckCategories.find(c=>c.id===id)
    if(cat?.premium)return
    setSelectedCats(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id])
  }

  const players=playerNames
    .map((name,i)=>({
      name:name.trim(),
      gender: playerGenders[i] ?? null,
      color:['from-pink-400 to-rose-500','from-cyan-400 to-blue-500','from-emerald-400 to-teal-500','from-amber-400 to-orange-500','from-violet-400 to-purple-500','from-fuchsia-400 to-pink-500','from-rose-400 to-red-500','from-sky-400 to-blue-500'][i%8]
    }))
    .filter(p=>p.name)

  const playersSetupReady = players.length >= 2 && players.every((p) => p.gender === 'm' || p.gender === 'f')

  const genderSymbol = (g) => (g === 'm' ? '♂' : g === 'f' ? '♀' : '')

  const agentPublicPool = useMemo(
    () => buildAgentPublicPool(deckCategories, selectedCats),
    [deckCategories, selectedCats]
  )

  const activeDeck = useMemo(
    () => buildPlayableDrinkDeck(deckCategories, selectedCats, includeCommunity),
    [deckCategories, selectedCats, includeCommunity]
  )

  const freshStats = (count) => Array.from({ length: count }, () => ({
    drinks: 0,
    distributed: 0,
    agentSuccess: 0,
    rulesCreated: 0,
    unlucky: 0,
  }))

  const startGame = () => {
    if (!playersSetupReady) return
    setDrinkStats(freshStats(players.length))
    setActiveRules([])
    setActiveCurses([])
    setActiveAlliances([])
    setTurnCount(0)
    setDeckSessionId((k) => k + 1)
    setPhase('playing')
  }

  const updatePlayerStat = (playerIndex, patcher) => {
    setDrinkStats((stats) => {
      const base = stats.length === players.length ? stats : freshStats(players.length)
      return base.map((stat, idx) => (idx === playerIndex ? patcher(stat) : stat))
    })
  }

  const activeAllianceList = activeAlliances.filter((alliance) => alliance.untilReplaced || (alliance.expiresAt && alliance.expiresAt > turnCount))
  const visibleRules = activeRules.filter((rule) => rule.untilReplaced || (rule.expiresAt && rule.expiresAt > turnCount))
  const mesaBadgeCount = visibleRules.length + activeCurses.length + activeAllianceList.length

  useEffect(() => {
    setActiveRules((rules) => rules.filter((rule) => rule.untilReplaced || (rule.expiresAt && rule.expiresAt > turnCount)))
    setActiveAlliances((alliances) => alliances.filter((a) => a.untilReplaced || (a.expiresAt && a.expiresAt > turnCount)))
  }, [turnCount])

  const formatCardTextForReader = (text, readerIndex) => substitutePlayerTokens(text, players, {
    reader: players[readerIndex]?.name || '',
    readerGender: players[readerIndex]?.gender ?? null,
  })

  const registerDrink = (playerIndex, amount = 1, options = {}) => {
    if (playerIndex == null || playerIndex < 0) return
    const linkedPlayers = activeAllianceList
      .filter((alliance) => alliance.players.includes(playerIndex))
      .flatMap((alliance) => alliance.players.filter((idx) => idx !== playerIndex))

    setDrinkStats((stats) => {
      const base = stats.length === players.length ? stats : freshStats(players.length)
      return base.map((stat, idx) => {
        if (idx === playerIndex) {
          return {
            ...stat,
            drinks: stat.drinks + amount,
            unlucky: stat.unlucky + (options.unlucky ?? 1),
          }
        }
        if (linkedPlayers.includes(idx)) {
          return {
            ...stat,
            drinks: stat.drinks + 1,
            unlucky: stat.unlucky + 1,
          }
        }
        return stat
      })
    })
  }

  const registerDistributed = (playerIndex, amount = 1) => {
    if (playerIndex == null || playerIndex < 0) return
    updatePlayerStat(playerIndex, (stat) => ({ ...stat, distributed: stat.distributed + amount }))
  }

  const registerGroupDrink = (amount = 2) => {
    setDrinkStats((stats) => {
      const base = stats.length === players.length ? stats : freshStats(players.length)
      return base.map((stat) => ({ ...stat, drinks: stat.drinks + amount, unlucky: stat.unlucky + 1 }))
    })
  }

  const registerGroupDistributed = (amount = 2) => {
    setDrinkStats((stats) => {
      const base = stats.length === players.length ? stats : freshStats(players.length)
      return base.map((stat) => ({ ...stat, distributed: stat.distributed + amount }))
    })
  }

  const registerOthersDrink = (exceptIndex, amount = 2) => {
    setDrinkStats((stats) => {
      const base = stats.length === players.length ? stats : freshStats(players.length)
      return base.map((stat, idx) => (
        idx === exceptIndex ? stat : { ...stat, drinks: stat.drinks + amount, unlucky: stat.unlucky + 1 }
      ))
    })
  }

  const onCardDrawn = (card, readerIndex) => {
    const nextTurn = turnCount + 1
    setTurnCount(nextTurn)

    if (card?.type === 'regra' || card?.type === 'caos') {
      if (/regras canceladas/i.test(card.title || '') || /canceladas/i.test(card.text || '')) {
        setActiveRules([])
      } else {
        const activeRule = buildActiveRule(card, readerIndex, nextTurn, players.length)
        setActiveRules((rules) => [
          ...rules.filter((r) => !r.untilReplaced && r.expiresAt && r.expiresAt > nextTurn),
          { ...activeRule, text: formatCardTextForReader(activeRule.text, readerIndex) },
        ])
        updatePlayerStat(readerIndex, (stat) => ({ ...stat, rulesCreated: stat.rulesCreated + 1 }))
      }
    }

    if (card?.type === 'maldicao') {
      setActiveCurses((curses) => [
        ...curses,
        {
          id: `${Date.now()}-${Math.random()}`,
          textTemplate: card.text,
          text: formatCardTextForReader(card.text, readerIndex),
          playerIndex: readerIndex,
        },
      ])
    }

  }

  const onAllianceChosen = (card, readerIndex, targetIndex) => {
    const duration = parseAllianceDuration(card)
    if (!duration) return
    const untilReplaced = duration.unit === 'untilReplaced'
    const nextTurn = turnCount
    setActiveAlliances((alliances) => [
      ...alliances.filter((alliance) => !alliance.untilReplaced && alliance.expiresAt && alliance.expiresAt > nextTurn),
      {
        id: `${Date.now()}-${Math.random()}`,
        text: formatCardTextForReader(card.text, readerIndex),
        players: [readerIndex, targetIndex],
        untilReplaced,
        durationUnit: untilReplaced ? null : duration.unit,
        expiresAt: untilReplaced ? null : expiresAfterDuration(nextTurn, duration, players.length),
      },
    ])
  }

  const handleImpostorResult = ({ guessedCorrect, impostorIndex }) => {
    if (!Number.isInteger(impostorIndex)) return
    if (guessedCorrect) {
      registerDrink(impostorIndex, 2, { unlucky: 1 })
    } else {
      registerOthersDrink(impostorIndex, 2)
      registerDistributed(impostorIndex, Math.max(0, players.length - 1) * 2)
    }
  }

  const handleAgentResult = (outcome, readerIndex) => {
    if (outcome === 'success') {
      updatePlayerStat(readerIndex, (stat) => ({ ...stat, agentSuccess: stat.agentSuccess + 1 }))
    }
  }

  const passCurse = (curseId, toPlayerIndex) => {
    setActiveCurses((curses) => curses.map((c) => (
      c.id === curseId
        ? {
            ...c,
            playerIndex: toPlayerIndex,
            text: formatCardTextForReader(c.textTemplate || c.text, toPlayerIndex),
          }
        : c
    )))
  }

  const failCurse = (curseId) => {
    setActiveCurses((curses) => curses.filter((c) => c.id !== curseId))
  }

  useEffect(() => {
    let cancelled = false
    setDecksLoading(true)
    Promise.all([
      fetchDrinkPacks(),
      fetchDrinkDecks(contentPack),
      fetchChallenges({
        category: 'impostor',
        mode_type: 'friends',
        ...challengePackParams(contentPack, includeCommunity),
      }),
    ]).then(([packs, decks, impostorRows]) => {
      if (cancelled) return
      if (Array.isArray(packs) && packs.length) {
        setPackOptions(packs.map((p) => ({ pack: p.pack, name: p.name || p.pack })))
      }
      const cats = normalizeDrinkCategories(decks?.categories?.length ? decks.categories : FALLBACK_DRINK_DECKS)
      setDeckCategories(cats)
      setSelectedCats((prev) => prev.filter((id) => id !== 'comunidade' && cats.some((c) => c.id === id)))
      if (Array.isArray(impostorRows)) setImpostorPairs(mergeImpostorPairs(IMPOSTOR_PAIRS, impostorRows))
    }).finally(() => { if (!cancelled) setDecksLoading(false) })
    return () => { cancelled = true }
  }, [contentPack, includeCommunity])

  const topBy = (field) => {
    if (!players.length) return null
    return players
      .map((player, idx) => ({ player, value: drinkStats[idx]?.[field] || 0 }))
      .sort((a, b) => b.value - a.value)[0]
  }

  if(phase==='results'){
    const mostDrinks = topBy('drinks')
    const bestAgent = topBy('agentSuccess')
    const ruleKing = topBy('rulesCreated')
    const unluckiest = topBy('unlucky')
    return(
      <PageShell mode="drink" innerClassName="space-y-5">
        <ModeHeader
          onBack={() => setPhase('playing')}
          title="🏆 Estatísticas finais"
          subtitle="Resumo desta sessão do Modo Beber"
        />

          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              ['🍺 Quem bebeu mais', mostDrinks, 'goles'],
              ['🕵️ Maior agente secreto', bestAgent, 'missões'],
              ['📜 Rei das regras', ruleKing, 'regras'],
              ['💀 Maior azarado', unluckiest, 'azares'],
            ].map(([label, entry, suffix])=>(
              <div key={label} className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-4">
                <p className="text-slate-400 text-xs font-black uppercase tracking-[0.14em] mb-2">{label}</p>
                <p className="text-white font-black text-xl leading-tight">{entry?.player?.name || '—'}</p>
                <p className="text-amber-300 text-sm font-bold mt-1">{entry?.value || 0} {suffix}</p>
              </div>
            ))}
          </div>

          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.04] overflow-hidden mb-5">
            {players.map((player, idx)=>{
              const stat = drinkStats[idx] || freshStats(1)[0]
              return(
                <div key={player.name} className="flex items-center gap-3 p-4 border-b border-white/[0.06] last:border-b-0">
                  <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${player.color} flex items-center justify-center text-white font-black`}>{player.name[0]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold truncate">
                      {genderSymbol(player.gender) && (
                        <span className={player.gender === 'm' ? 'text-sky-300' : 'text-pink-300'}>{genderSymbol(player.gender)} </span>
                      )}
                      {player.name}
                    </p>
                    <p className="text-slate-500 text-xs">Distribuiu {stat.distributed} · Agente {stat.agentSuccess} · Regras {stat.rulesCreated}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-amber-300 font-black">{stat.drinks}</p>
                    <p className="text-slate-500 text-xs">goles</p>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={()=>setPhase('playing')} className="rounded-2xl bg-white/[0.08] border border-white/10 text-white py-3 font-bold">
              Voltar ao jogo
            </button>
            <button type="button" onClick={startGame} className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-black py-3 font-black">
              Nova sessão
            </button>
          </div>
      </PageShell>
    )
  }

  if(phase==='setup')return(
    <PageShell mode="drink" innerClassName="space-y-5">
        <ModeHeader
          onBack={() => setupStep > 0 ? setSetupStep(0) : navigate('/')}
          title="🍺 Modo Beber"
          subtitle={setupStep === 0 ? 'Passo 1 — Jogadores' : 'Passo 2 — Baralhos'}
        />

        <div className="w-full bg-white/[0.06] rounded-full h-1 mb-6">
          <div
            className="bg-gradient-to-r from-amber-400 to-orange-500 h-1 rounded-full transition-all"
            style={{ width: setupStep === 0 ? '50%' : '100%' }}
          />
        </div>

        <AnimatePresence mode="wait">
          {setupStep === 0 && (
            <motion.div
              key="setup-players"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              className="space-y-4"
            >
              <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4">
                <h3 className="text-white font-semibold mb-1">Quem joga?</h3>
                <p className="text-slate-500 text-sm mb-4">
                  Preenche o <span className="text-slate-300 font-semibold">nome</span> e escolhe <span className="text-slate-300 font-semibold">♂ ou ♀</span> — usados nas cartas.
                </p>
                <div className="space-y-3">
                  {playerNames.map((n, i) => {
                    const needsGender = n.trim() && playerGenders[i] !== 'm' && playerGenders[i] !== 'f'
                    return (
                    <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3 space-y-2">
                      <p className="text-slate-500 text-xs font-semibold">Jogador {i + 1}</p>
                      <div className="flex items-center gap-2">
                        <input
                          id={`drink-player-name-${i}`}
                          value={n}
                          onChange={(e) => setPlayerNames((ns) => ns.map((x, j) => (j === i ? e.target.value : x)))}
                          placeholder={`Ex.: ${['Ana', 'João', 'Maria', 'Pedro'][i] || `Jogador ${i + 1}`}`}
                          autoComplete="off"
                          aria-label={`Nome do jogador ${i + 1}`}
                          className="flex-1 min-w-0 bg-white/[0.04] text-white rounded-xl px-3 py-2.5 outline-none border border-white/[0.1] focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 text-sm font-medium placeholder-slate-600"
                        />
                        {playerNames.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              setPlayerNames((ns) => ns.filter((_, j) => j !== i))
                              setPlayerGenders((gs) => gs.filter((_, j) => j !== i))
                            }}
                            className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-white/[0.04] transition-colors flex-shrink-0"
                            title="Remover jogador"
                          >
                            <Trash2 className="w-4 h-4"/>
                          </button>
                        )}
                        <div className={`flex gap-1 flex-shrink-0 rounded-xl p-0.5 ${needsGender ? 'ring-1 ring-amber-400/50' : ''}`}>
                          {[
                            { id: 'm', label: '♂', title: 'Masculino' },
                            { id: 'f', label: '♀', title: 'Feminino' },
                          ].map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              title={opt.title}
                              onClick={() => setPlayerGenders((gs) => gs.map((g, j) => (j === i ? opt.id : g)))}
                              className={`w-9 h-9 rounded-xl border text-base font-bold transition-all ${
                                playerGenders[i] === opt.id
                                  ? opt.id === 'm'
                                    ? 'border-sky-400/50 bg-sky-500/20 text-sky-200'
                                    : 'border-pink-400/50 bg-pink-500/20 text-pink-200'
                                  : 'border-white/[0.08] bg-white/[0.04] text-slate-500 hover:text-white'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    )
                  })}
                </div>
                {!playersSetupReady && players.length >= 2 && (
                  <p className="text-amber-400/90 text-xs mt-3">Escolhe ♂ ou ♀ para cada jogador com nome.</p>
                )}
                {players.length < 2 && playerNames.some((name) => name.trim()) && (
                  <p className="text-amber-400/90 text-xs mt-3">Mínimo 2 jogadores com nome e género.</p>
                )}
                {playerNames.length < MAX_DRINK_PLAYERS && (
                  <button
                    type="button"
                    onClick={() => {
                      setPlayerNames((n) => [...n, ''])
                      setPlayerGenders((g) => [...g, null])
                    }}
                    className="mt-3 w-full border border-dashed border-white/[0.1] rounded-2xl py-2.5 text-slate-500 hover:text-white hover:border-white/[0.25] transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <Plus className="w-4 h-4"/> Adicionar jogador
                  </button>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSetupStep(1)}
                disabled={!playersSetupReady}
                className="w-full text-black font-black rounded-2xl py-4 text-lg disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}
              >
                Escolher baralhos
                <ChevronRight className="w-5 h-5"/>
              </motion.button>
            </motion.div>
          )}

          {setupStep === 1 && (
            <motion.div
              key="setup-decks"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              className="space-y-4"
            >
              <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4">
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Jogadores</p>
                <div className="flex flex-wrap gap-2">
                  {players.map((p) => (
                    <span
                      key={p.name}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.05] px-3 py-1 text-sm text-white"
                    >
                      {genderSymbol(p.gender) && (
                        <span className={p.gender === 'm' ? 'text-sky-300' : 'text-pink-300'}>{genderSymbol(p.gender)}</span>
                      )}
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4">
                <h3 className="text-white font-semibold mb-2">Pack de conteúdo</h3>
                <select
                  value={contentPack}
                  onChange={(e) => setContentPack(e.target.value)}
                  className="w-full bg-white/[0.05] text-white rounded-xl px-4 py-2.5 border border-white/[0.08] text-sm"
                >
                  {packOptions.map((p) => <option key={p.pack} value={p.pack}>{p.name}</option>)}
                </select>
                <label className="flex items-center gap-3 mt-3 cursor-pointer">
                  <button
                    type="button"
                    onClick={() => setIncludeCommunity((v) => !v)}
                    className={`w-11 h-6 rounded-full transition-all relative flex-shrink-0 ${includeCommunity ? 'bg-amber-500' : 'bg-white/[0.12]'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${includeCommunity ? 'left-6' : 'left-1'}`}/>
                  </button>
                  <span className="text-slate-300 text-sm">Incluir baralho Comunidade</span>
                </label>
                {decksLoading && <p className="text-amber-400 text-xs mt-2">A carregar baralhos…</p>}
              </div>

              <div>
                <h3 className="text-white font-semibold mb-3">Categorias do baralho</h3>
                <div className="space-y-2">
                  {selectableDrinkCategories(deckCategories).map(cat => {
                    const isSel = selectedCats.includes(cat.id)
                    return (
                      <motion.button
                        key={cat.id}
                        whileTap={!cat.premium ? { scale: 0.98 } : {}}
                        onClick={() => toggleCat(cat.id)}
                        className={`w-full rounded-2xl p-4 flex items-center gap-3 border transition-all text-left ${
                          cat.premium
                            ? 'opacity-50 cursor-not-allowed border-white/[0.04] bg-white/[0.02]'
                            : isSel
                              ? 'border-amber-500/40 bg-amber-500/8'
                              : 'border-white/[0.06] bg-white/[0.03] hover:border-white/[0.15]'
                        }`}
                      >
                        <div className="text-2xl flex-shrink-0 w-10 text-center">{cat.label.split(' ')[0]}</div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold text-sm ${isSel || cat.premium ? 'text-white' : 'text-slate-400'}`}>{cat.label}</p>
                          <p className="text-slate-500 text-xs truncate">{cat.desc}{!cat.premium && ` · ${cat.cards.length} cartas`}</p>
                          {cat.premium && <p className="text-amber-600 text-xs mt-0.5">Em breve — conteúdo premium</p>}
                        </div>
                        {cat.premium ? (
                          <Lock className="text-slate-600 w-4 h-4 flex-shrink-0"/>
                        ) : (
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSel ? 'border-amber-400 bg-amber-500' : 'border-white/[0.20]'}`}>
                            {isSel && <Check className="text-white w-3 h-3"/>}
                          </div>
                        )}
                      </motion.button>
                    )
                  })}
                </div>

              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={startGame}
                disabled={selectedCats.length === 0 || !playersSetupReady}
                className="w-full text-black font-black rounded-2xl py-5 text-xl disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}
              >
                🍻 Começar! ({activeDeck.length} cartas)
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
    </PageShell>
  )

  return(
    <GameShell
      mode="drink"
      header={
        <div className="flex items-center gap-2">
          <BackButton onClick={() => { setSetupStep(1); setPhase('setup') }} />
          <div className="flex-1 min-w-0 text-center">
            <h1 className="text-white font-black text-lg leading-tight">🍺 Modo Beber</h1>
            <p className="text-slate-500 text-sm">Turno {turnCount}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowMesaPanel((v) => !v)}
            className={`shrink-0 text-sm font-black rounded-xl border px-2.5 py-2 flex items-center gap-1.5 ${
              showMesaPanel
                ? 'text-black border-amber-400 bg-amber-400'
                : 'text-amber-300 border-amber-400/25 bg-amber-400/10'
            }`}
          >
            🪑 Mesa
            {mesaBadgeCount > 0 && !showMesaPanel && (
              <span className="min-w-[1.1rem] h-4 px-1 rounded-full bg-amber-500 text-black text-[10px] font-black flex items-center justify-center">
                {mesaBadgeCount}
              </span>
            )}
          </button>
          <button type="button" onClick={()=>setPhase('results')} className="shrink-0 text-amber-300 text-sm font-black rounded-xl border border-amber-400/25 bg-amber-400/10 px-2.5 py-2">
            Fim
          </button>
        </div>
      }
    >
      <div className="px-4 py-4 max-w-lg mx-auto w-full space-y-3">
        {(visibleRules.length > 0 || activeCurses.length > 0 || activeAllianceList.length > 0) && (
          <div className="surface p-3 space-y-2">
            {visibleRules.length > 0 && (
              <div className="space-y-2">
                <p className="text-violet-300 text-xs font-black uppercase tracking-[0.12em]">Regras ativas</p>
                {visibleRules.map((rule) => (
                    <div key={rule.id} className="rounded-xl border border-violet-400/20 bg-violet-400/10 p-2.5">
                      <div className="flex gap-2 items-start">
                        <p className="text-white text-sm leading-snug flex-1">{rule.text}</p>
                        <button type="button" onClick={() => setActiveRules((rules) => rules.filter((item) => item.id !== rule.id))} className="text-violet-200 text-xs font-black rounded-lg bg-white/10 px-2 py-1 shrink-0">
                          ✕
                        </button>
                      </div>
                      <p className="text-violet-200/70 text-xs mt-1">
                        {players[rule.ownerIndex]?.name || 'jogador'}
                        {formatRuleTimeLeft(rule, turnCount, players.length)}
                      </p>
                    </div>
                  ))}
              </div>
            )}

            {activeCurses.length > 0 && (
              <div className="space-y-2">
                <p className="text-cyan-300 text-xs font-black uppercase tracking-[0.12em]">Maldições</p>
                {activeCurses.map((curse) => (
                  <div key={curse.id} className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-2.5 space-y-2">
                    <p className="text-white text-sm leading-snug">
                      🔮 <span className="font-bold">{players[curse.playerIndex]?.name || '?'}</span>: {curse.text}
                    </p>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <button type="button" onClick={() => failCurse(curse.id)} className="rounded-lg bg-red-500/20 border border-red-400/30 text-red-200 px-2.5 py-1 text-xs font-black">
                        Falhou
                      </button>
                      {players.length > 1 && (
                        players.length <= 5 ? players.map((p, idx) => (
                          idx !== curse.playerIndex ? (
                            <button key={p.name} type="button" onClick={() => passCurse(curse.id, idx)} className="rounded-lg bg-white/10 border border-white/15 text-white px-2.5 py-1 text-xs font-bold">
                              → {p.name}
                            </button>
                          ) : null
                        )) : (
                          <select
                            defaultValue=""
                            onChange={(e) => {
                              const idx = Number(e.target.value)
                              if (Number.isFinite(idx) && idx >= 0) passCurse(curse.id, idx)
                              e.target.value = ''
                            }}
                            className="rounded-lg bg-white/10 border border-white/15 text-white px-2.5 py-1 text-xs max-w-full"
                          >
                            <option value="">Passar a…</option>
                            {players.map((p, idx) => (
                              idx !== curse.playerIndex ? (
                                <option key={p.name} value={idx}>{p.name}</option>
                              ) : null
                            ))}
                          </select>
                        )
                      )}
                      <button type="button" onClick={() => setActiveCurses((c) => c.filter((x) => x.id !== curse.id))} className="rounded-lg bg-white/5 text-slate-400 px-2.5 py-1 text-xs">
                        remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeAllianceList.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-pink-300 text-xs font-black uppercase tracking-[0.12em]">Alianças</p>
                {activeAllianceList.map((alliance) => (
                  <div key={alliance.id} className="rounded-xl border border-pink-400/20 bg-pink-400/10 px-2.5 py-2 text-sm text-white">
                    <p className="font-bold">
                      🤝 {players[alliance.players[0]]?.name} + {players[alliance.players[1]]?.name}
                      <span className="text-pink-200/80 text-xs">{formatDurationTimeLeft(alliance, turnCount, players.length)}</span>
                    </p>
                    {alliance.text && <p className="mt-1 text-xs leading-snug text-pink-100/80">{alliance.text}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {showMesaPanel && (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3">
            <p className="text-slate-400 text-xs font-black uppercase tracking-[0.12em] mb-2">Contador (goles)</p>
            <div className="grid grid-cols-2 gap-2">
              {players.map((player, idx) => (
                <div key={player.name} className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-2">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-white text-sm font-bold truncate">
                      {genderSymbol(player.gender) && (
                        <span className={player.gender === 'm' ? 'text-sky-300' : 'text-pink-300'}>{genderSymbol(player.gender)} </span>
                      )}
                      {player.name}
                    </p>
                    <p className="text-amber-300 text-sm font-black">{drinkStats[idx]?.drinks || 0}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {[1, 2, 3].map((amount) => (
                      <button key={amount} type="button" onClick={() => registerDrink(idx, amount)} className="rounded-lg bg-amber-500/15 border border-amber-400/20 text-amber-200 py-1.5 text-xs font-black">
                        +{amount}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <CardDeck
          key={deckSessionId}
          activeDeck={activeDeck}
          agentPublicPool={agentPublicPool}
          players={players}
          deckSessionId={deckSessionId}
          impostorPairs={impostorPairs}
          onCardDrawn={onCardDrawn}
          onAgentResult={handleAgentResult}
          onAllianceChosen={onAllianceChosen}
          onImpostorResult={handleImpostorResult}
        />
      </div>
    </GameShell>
  )
}
