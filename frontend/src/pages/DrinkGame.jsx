import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, RotateCcw, Check, Plus, Beer, Share2, Users, SlidersHorizontal, Monitor, Home } from 'lucide-react'
import { shuffle } from '../utils/game'
import { api } from '../utils/api'
import { fetchChallenges, fetchDrinkDecks, fetchDrinkPacks } from '../utils/contentApi'
import { challengePackParams } from '../utils/packParams'
import ImpostorCard, { IMPOSTOR_PAIRS, mergeImpostorPairs } from '../components/game/ImpostorCard'
import PreferenciaCard from '../components/game/PreferenciaCard'

import { FALLBACK_DRINK_DECKS } from '../utils/drinkDecksFallback'
import { formatGoles } from '../utils/penalties'
import { drinkCardImageSrc } from '../utils/drinkCardImage'
import { pickImpostorForRound, enrichImpostorCard } from '../utils/drinkImpostorGhost'
import { getCardCaos, rollCaosMoment, applyCaosUpgrade, caosActivatorIsSubject, getCaosPrompt } from '../utils/drinkChaosUpgrade'
import {
  buildAgentPublicPool,
  buildPlayableDrinkDeck,
  composeAgentCard,
  pickBalancedDeckCard,
  sessionAct,
} from '../utils/drinkAgentCompose'
import { normalizeDrinkCategories, selectableDrinkCategories, mergeDrinkCategories, COMMUNITY_DRINK_PACK } from '../utils/drinkBaralhos'
import { substitutePlayerTokens } from '../utils/drinkPlayerText'
import PageShell from '../components/layout/PageShell'
import ModeHeader from '../components/layout/ModeHeader'
import BackButton from '../components/layout/BackButton'
import GameShell from '../components/layout/GameShell'
import MesaNoite from '../components/layout/MesaNoite'
import NightShell, { NightTitle, NightCta, GlowDisc } from '../components/layout/NightShell'
import { shareNight } from '../utils/shareNight'
import { loadNightRoster, saveNightRoster } from '../utils/nightRoster'
import { shouldSpinRoulette, pickRoulettePrize, rouletteCard } from '../utils/drinkRoulette'
import { makeDrinkTvCode, drinkTvUrl, writeDrinkTvLocal } from '../utils/drinkTvSession'

const MAX_DRINK_PLAYERS = 20
const AJUSTAR_PINK = '#ff5c8d'

function drinkCardKey(card) {
  if (!card) return ''
  return [card.deckId || '', card.pack || '', card.type || '', card.id || '', card.text || ''].join('::')
}

function PlayerRosterPanel({
  players,
  playerNames,
  genderSymbol,
  drinkStats,
  registerDrink,
  removeActivePlayer,
  midGameName,
  setMidGameName,
  midGameGender,
  setMidGameGender,
  addActivePlayer,
  showDrinkStats = true,
  title = 'Jogadores',
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3">
      <p className="text-slate-400 text-xs font-black uppercase tracking-[0.12em] mb-2">{title}</p>
      <div className="grid grid-cols-2 gap-2">
        {players.map((player, idx) => (
          <div key={player.name} className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-2">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-white text-sm font-bold truncate">
                {genderSymbol(player.gender) && (
                  <span className={`mr-1 font-black ${player.gender === 'm' ? 'text-sky-200' : 'text-pink-200'}`}>{genderSymbol(player.gender)}</span>
                )}
                {player.name}
              </p>
              {showDrinkStats && <p className="text-amber-300 text-sm font-black">{drinkStats[idx]?.drinks || 0}</p>}
            </div>
            {showDrinkStats && (
              <div className="grid grid-cols-3 gap-1">
                {[1, 2, 3].map((amount) => (
                  <button key={amount} type="button" onClick={() => registerDrink(idx, amount)} className="rounded-xl bg-amber-500/15 border border-amber-400/20 text-amber-200 py-3 min-h-[48px] text-sm font-black">
                    +{amount}
                  </button>
                ))}
              </div>
            )}
            {players.length > 2 && (
              <button type="button" onClick={() => removeActivePlayer(idx)} className={`${showDrinkStats ? 'mt-2' : ''} w-full rounded-xl bg-red-500/10 border border-red-400/20 text-red-200 py-3 min-h-[48px] text-sm font-bold`}>
                Remover
              </button>
            )}
          </div>
        ))}
      </div>
      {playerNames.length < MAX_DRINK_PLAYERS && (
        <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.04] p-2">
          <p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500">Adicionar jogador</p>
          <div className="flex gap-2">
            <input
              value={midGameName}
              onChange={(e) => setMidGameName(e.target.value)}
              placeholder="Nome"
              maxLength={20}
              className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2 text-sm text-white outline-none"
            />
            <select
              value={midGameGender}
              onChange={(e) => setMidGameGender(e.target.value)}
              className="rounded-xl border border-white/[0.08] bg-black/20 px-2 py-2 text-sm text-white"
            >
              <option value="m">♂</option>
              <option value="f">♀</option>
            </select>
            <button type="button" onClick={addActivePlayer} disabled={!midGameName.trim()} className="rounded-xl bg-amber-500 px-3 py-2 text-sm font-black text-black disabled:opacity-40">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

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
  departedPlayers,
  impostorPairs,
  preferDeckId,
  readerHoldName,
  injectCard,
  hasPicante,
  hasCommunity,
  onPreferDeckConsumed,
  onHoldConsumed,
  onRoulette,
  onDisplayChange,
  onCardDrawn,
  onAgentResult,
  onAllianceChosen,
  onImpostorResult,
  onChaosResolved,
}) {
  const sessionDeck = useMemo(() => [...activeDeck], [activeDeck])
  const [deck, setDeck] = useState(() => shuffle([...sessionDeck]))
  const [current, setCurrent] = useState(null)
  const currentKeyRef = useRef('')
  const [baseCard, setBaseCard] = useState(null)
  const [chaosMomentActive, setChaosMomentActive] = useState(false)
  const [chaosResolved, setChaosResolved] = useState(true)
  const [chaosActivatorIdx, setChaosActivatorIdx] = useState('')
  const [cardDrawId, setCardDrawId] = useState(0)
  const [agentOpen, setAgentOpen] = useState(false)
  const [agentResult, setAgentResult] = useState(null)
  const [impostorName, setImpostorName] = useState(null)
  const [impostorDone, setImpostorDone] = useState(false)
  const [allianceDone, setAllianceDone] = useState(false)
  const [allianceTarget, setAllianceTarget] = useState('')
  const [recentTypes, setRecentTypes] = useState([])
  const [recentDeckIds, setRecentDeckIds] = useState([])
  const recentPublicTextsRef = useRef([])
  const displayCbRef = useRef(onDisplayChange)
  displayCbRef.current = onDisplayChange
  const [nextReaderName, setNextReaderName] = useState(null)
  const [lastReaderName, setLastReaderName] = useState(null)

  const resolveReaderByName = (name) => {
    if (!players.length) return null
    return players.find((p) => p.name === name) || players[0]
  }

  const readerIndexByName = (name) => {
    const idx = players.findIndex((p) => p.name === name)
    return idx >= 0 ? idx : 0
  }

  const impostorIndex = impostorName != null ? players.findIndex((p) => p.name === impostorName) : null
  currentKeyRef.current = drinkCardKey(current)

  useEffect(() => {
    const allowed = new Set(sessionDeck.map(drinkCardKey))
    setDeck((prev) => {
      const kept = prev.filter((card) => allowed.has(drinkCardKey(card)))
      const held = new Set(prev.map(drinkCardKey))
      if (currentKeyRef.current) held.add(currentKeyRef.current)
      const added = sessionDeck.filter((card) => !held.has(drinkCardKey(card)))
      if (kept.length === prev.length && added.length === 0) return prev
      return added.length ? [...kept, ...shuffle(added)] : kept
    })
  }, [sessionDeck])

  useEffect(() => {
    setNextReaderName((name) => (name && players.some((p) => p.name === name) ? name : players[0]?.name ?? null))
    setLastReaderName((name) => (name && players.some((p) => p.name === name) ? name : null))
    setImpostorName((name) => {
      if (name == null || players.some((p) => p.name === name)) return name
      return players.length ? players[Math.floor(Math.random() * players.length)]?.name ?? null : null
    })
  }, [players])

  useEffect(() => {
    if (!injectCard) return
    setCurrent(injectCard)
    setBaseCard(injectCard)
    setCardDrawId((id) => id + 1)
    setChaosMomentActive(false)
    setChaosResolved(true)
    setAgentOpen(false)
    setAgentResult(null)
    setImpostorDone(true)
    setAllianceDone(true)
  }, [injectCard])

  const finalizeAgent = (raw) => {
    if (!agentPublicPool.length) return raw
    const composed = composeAgentCard(raw, agentPublicPool, recentPublicTextsRef.current)
    if (composed.publicText) {
      recentPublicTextsRef.current = [...recentPublicTextsRef.current.slice(-12), composed.publicText]
    }
    return composed
  }

  const draw = () => {
    if (current?.type === 'impostor' && !impostorDone) return
    if (current?.type === 'alliance' && !allianceDone) return
    if (chaosMomentActive && !chaosResolved) return
    const drawnCount = sessionDeck.length - deck.length
    if (shouldSpinRoulette({ drawnCount, recentTypes })) {
      const prize = pickRoulettePrize({ hasPicante, hasCommunity })
      const card = rouletteCard(prize)
      const reader = readerIndexByName(nextReaderName || players[0]?.name)
      const readerPlayer = players[reader]
      setLastReaderName(readerPlayer?.name ?? null)
      setBaseCard(card)
      setCurrent(card)
      setCardDrawId((id) => id + 1)
      setChaosMomentActive(false)
      setChaosResolved(true)
      setAgentOpen(false)
      setImpostorDone(true)
      setAllianceDone(true)
      setRecentTypes((types) => [...types.slice(-7), 'roleta'])
      const step = prize.id === 'passa' ? 2 : 1
      const nextIdx = (reader + step) % Math.max(players.length, 1)
      if (readerHoldName && players.some((p) => p.name === readerHoldName) && prize.id !== 'passa') {
        setNextReaderName(readerHoldName)
        onHoldConsumed?.()
      } else {
        setNextReaderName(players[nextIdx]?.name ?? null)
      }
      onRoulette?.(prize, reader)
      onCardDrawn?.(card, reader)
      return
    }
    if (!deck.length) return
    const drinkSpam = recentTypes.slice(-2).every(type => type === 'beber')
    const repeatedDeck = recentDeckIds.length >= 2 && recentDeckIds.slice(-2).every((id) => id && id === recentDeckIds[recentDeckIds.length - 1])
    let pool = deck
    if (preferDeckId) {
      const preferred = pool.filter((card) => card.deckId === preferDeckId)
      if (preferred.length) {
        pool = preferred
        onPreferDeckConsumed?.()
      }
    }
    if (drinkSpam) {
      const filtered = deck.filter((card) => card.type !== 'beber')
      if (filtered.length) pool = filtered
    }
    const canAvoidImpostor = pool.some((card) => card.type !== 'impostor')
    if (canAvoidImpostor && (recentTypes.includes('impostor') || Math.random() < 0.6)) {
      pool = pool.filter((card) => card.type !== 'impostor')
    }
    const avoidDeckIds = repeatedDeck ? [recentDeckIds[recentDeckIds.length - 1]] : []
    const preferAct = sessionAct(sessionDeck.length - deck.length, sessionDeck.length)
    const skipRare = recentTypes.slice(-8).some((type) => ['impostor', 'miniboss', 'alliance'].includes(type))
    const { card: picked, rest } = pickBalancedDeckCard(pool, { avoidDeckIds, preferAct, skipRare })
    if (!picked) return
    let card = picked
    if (card?.type === 'agent') card = finalizeAgent(card)
    if (card?.type === 'impostor') {
      const pick = pickImpostorForRound({ players, departedPlayers })
      setImpostorName(pick.carrierName)
      card = enrichImpostorCard(card, {
        impostorPairs,
        ghostName: pick.ghostName,
        penaltyText: IMPOSTOR_PENALTY_TEXT,
      })
      if (!card.text?.trim()) {
        card = { ...card, text: IMPOSTOR_PENALTY_TEXT }
      }
    } else {
      setImpostorName(null)
    }
    const reader = readerIndexByName(nextReaderName || players[0]?.name)
    const readerPlayer = players[reader]
    setLastReaderName(readerPlayer?.name ?? null)
    setBaseCard(card)
    setCurrent(card)
    setCardDrawId((id) => id + 1)
    const moment = rollCaosMoment(card)
    setChaosMomentActive(moment)
    setChaosResolved(!moment)
    setChaosActivatorIdx('')
    setAgentOpen(false)
    setAgentResult(null)
    setImpostorDone(false)
    setAllianceDone(card?.type !== 'alliance')
    setAllianceTarget('')
    setDeck(rest)
    setRecentTypes(types => [...types.slice(-7), card.type])
    setRecentDeckIds((ids) => [...ids.slice(-2), card.deckId || 'outros'])
    const nextIdx = (reader + 1) % Math.max(players.length, 1)
    if (readerHoldName && players.some((p) => p.name === readerHoldName)) {
      setNextReaderName(readerHoldName)
      onHoldConsumed?.()
    } else {
      setNextReaderName(players[nextIdx]?.name ?? null)
    }
    onCardDrawn?.(card, reader)
  }

  const lastReaderIdx = lastReaderName ? readerIndexByName(lastReaderName) : null
  const whoReads = current == null
    ? resolveReaderByName(nextReaderName)
    : resolveReaderByName(lastReaderName ?? nextReaderName)

  useEffect(() => {
    displayCbRef.current?.({
      card: current,
      readerName: whoReads?.name || '',
      deckLeft: deck.length,
    })
  }, [current, whoReads, deck.length])

  const acceptChaosNormal = () => {
    if (!baseCard || chaosResolved) return
    setChaosResolved(true)
    onChaosResolved?.({ mode: 'normal', readerIndex: lastReaderIdx, baseCard })
  }

  const acceptChaosUpgrade = () => {
    const caos = getCardCaos(baseCard)
    if (!baseCard || chaosResolved || !caos) return
    const activatorIndex = caosActivatorIsSubject(caos)
      ? Number(chaosActivatorIdx)
      : lastReaderIdx
    if (activatorIndex == null || activatorIndex < 0 || !Number.isInteger(activatorIndex)) return
    const upgraded = applyCaosUpgrade(baseCard)
    setCurrent(upgraded)
    setChaosResolved(true)
    onChaosResolved?.({
      mode: 'upgrade',
      activatorIndex,
      readerIndex: lastReaderIdx,
      baseCard,
      upgrade: caos,
    })
  }

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
    roleta: 'from-fuchsia-600 to-amber-500',
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
    roleta: 'Roleta',
  }

  const impostorLocked = current?.type === 'impostor' && !impostorDone
  const allianceLocked = current?.type === 'alliance' && !allianceDone
  const chaosLocked = chaosMomentActive && !chaosResolved
  const actionLocked = impostorLocked || allianceLocked || chaosLocked
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
    onAgentResult?.(outcome, lastReaderIdx ?? readerIndexByName(nextReaderName))
  }

  const chooseAlliance = () => {
    const targetIndex = Number(allianceTarget)
    const readerIndex = lastReaderIdx ?? readerIndexByName(nextReaderName)
    if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= players.length || targetIndex === readerIndex) return
    setAllianceDone(true)
    onAllianceChosen?.(current, readerIndex, targetIndex)
  }

  const cardCaos = baseCard ? getCardCaos(baseCard) : null
  const showCaosPanel = chaosMomentActive && cardCaos && !chaosResolved
  const caosNeedsSubjectPick = showCaosPanel && caosActivatorIsSubject(cardCaos)
  const caosCanUpgrade = !caosNeedsSubjectPick || chaosActivatorIdx !== ''

  const reshuffleCleanDeck = () => {
    setDeck(shuffle([...sessionDeck]))
    setCurrent(null)
    setBaseCard(null)
    setChaosMomentActive(false)
    setChaosResolved(true)
    setChaosActivatorIdx('')
    setCardDrawId(0)
    setAgentOpen(false)
    setAgentResult(null)
    setImpostorName(null)
    setImpostorDone(false)
    setAllianceDone(false)
    setAllianceTarget('')
    setRecentTypes([])
    setRecentDeckIds([])
    recentPublicTextsRef.current = []
    setNextReaderName(players[0]?.name ?? null)
    setLastReaderName(null)
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
            key={`card-${cardDrawId}`}
            initial={{ scale: 0.82, opacity: 0, y: -18, rotate: -3 }}
            animate={{ scale: 1, opacity: 1, y: 0, rotate: current.type === 'caos' ? [0, -1.5, 1.5, 0] : 0 }}
            exit={{ scale: 0.9, opacity: 0, rotate: 2 }}
            transition={{ type: 'spring', damping: 18, stiffness: 240 }}
            className={`relative w-full overflow-hidden ${
              current.type === 'preferencia'
                ? 'bg-transparent p-4 shadow-none min-h-0'
                : `bg-gradient-to-br ${TYPE_COLORS[current.type] || 'from-violet-600 to-purple-700'} rounded-[2rem] border ${current._chaosActive ? 'border-amber-300/70 ring-2 ring-amber-300/40' : 'border-amber-200/20'} p-8 shadow-[0_24px_80px_rgba(245,158,11,0.20)] min-h-[20rem]`
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
              {current._chaosActive ? '⚡ Caos' : (TYPE_LABELS[current.type] || 'Carta')}
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
                        idx === (lastReaderIdx ?? readerIndexByName(nextReaderName)) ? null : (
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
            ) : current.type === 'impostor' && impostorIndex != null && impostorIndex >= 0 ? (
              <div className="space-y-3">
                {cardText && (
                  <p className="text-white/90 font-medium leading-relaxed text-base">{cardText}</p>
                )}
                <ImpostorCard
                  players={players}
                  correctQuestion={current.correctQuestion}
                  wrongQuestion={current.wrongQuestion}
                  impostorIndex={impostorIndex}
                  ghostImpostorName={current._ghostImpostor || null}
                  onComplete={(result) => {
                    setImpostorDone(true)
                    onImpostorResult?.(result)
                    requestAnimationFrame(() => {
                      document.getElementById('drink-next-card-btn')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                    })
                  }}
                />
                {!impostorDone && (
                  <button
                    type="button"
                    onClick={() => setImpostorDone(true)}
                    className="w-full rounded-2xl border border-white/15 bg-white/10 py-3 text-sm font-bold text-white/85"
                  >
                    Saltar carta Impostor
                  </button>
                )}
              </div>
            ) : (
              <p className="text-white/90 font-medium leading-relaxed text-lg">{cardText}</p>
            )}
            {showCaosPanel && (
              <div className="relative z-10 mt-5 rounded-2xl border-2 border-amber-300/50 bg-black/35 p-4 space-y-3 text-left">
                <p className="text-amber-200 text-xs font-black uppercase tracking-[0.2em] text-center">⚡ Momento Caos</p>
                <p className="text-white/85 text-sm text-center leading-relaxed">
                  {px(getCaosPrompt(cardCaos, { readerName: whoReads?.name || '' }))}
                </p>
                {caosNeedsSubjectPick && (
                  <div className="space-y-1.5">
                    <p className="text-amber-100/80 text-xs font-bold text-center">
                      {px(cardCaos.activatorLabel || 'Quem cumpre a carta?')}
                    </p>
                    <select
                      value={chaosActivatorIdx}
                      onChange={(e) => setChaosActivatorIdx(e.target.value)}
                      className="w-full rounded-2xl border border-white/15 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none focus:border-amber-300/60"
                    >
                      <option value="">Escolher jogador...</option>
                      {players.map((p, idx) => (
                        <option key={p.name} value={idx}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={acceptChaosNormal}
                    className="rounded-2xl border border-white/20 bg-white/10 py-3 text-sm font-bold text-white"
                  >
                    Manter carta normal
                  </button>
                  <button
                    type="button"
                    onClick={acceptChaosUpgrade}
                    disabled={!caosCanUpgrade}
                    className="rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 py-3 text-sm font-black text-black shadow-lg disabled:opacity-40"
                  >
                    {px(cardCaos.buttonLabel || 'Evoluir carta!')}
                    {cardCaos.cost && (
                      <span className="block text-xs font-bold text-black/75 mt-0.5">{px(cardCaos.cost)}</span>
                    )}
                  </button>
                </div>
                {cardCaos.preview && (
                  <p className="text-amber-100/70 text-xs text-center">{px(cardCaos.preview)}</p>
                )}
              </div>
            )}
            {current?._chaosActive && current._chaosCost && (
              <p className="relative z-10 mt-3 text-amber-100/80 text-xs font-bold">{px(current._chaosCost)}</p>
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
        <div id="drink-next-card-btn" className="mt-2 flex justify-center">
          <button
            type="button"
            onClick={draw}
            disabled={actionLocked}
            className="min-h-11 rounded-full border bg-[#1c1c21] px-6 text-[15px] font-extrabold text-white active:scale-[0.98] disabled:opacity-40"
            style={{
              borderColor: '#ff5c8d66',
              boxShadow: actionLocked ? 'none' : '0 8px 24px -8px #ff5c8d88',
            }}
          >
            {impostorLocked ? 'Termina Impostor' : allianceLocked ? 'Escolhe a aliança' : chaosLocked ? 'Normal ou Caos' : current ? 'Próxima carta' : 'Ver carta'}
          </button>
        </div>
      ) : (
        <div className="text-center space-y-3 w-full">
          <p className="text-emerald-400 font-bold text-lg">🏆 Baralho esgotado!</p>
          <button
            type="button"
            onClick={reshuffleCleanDeck}
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
  const [setupStep, setSetupStep] = useState(() => loadNightRoster().names.filter(Boolean).length >= 2 ? 1 : 0)
  const [playerNames,setPlayerNames]=useState(() => {
    const { names } = loadNightRoster()
    return names.length >= 2 ? names.slice(0, MAX_DRINK_PLAYERS) : ['', '', '']
  })
  const [playerGenders,setPlayerGenders]=useState(() => {
    const { names, genders } = loadNightRoster()
    return names.length >= 2 ? names.slice(0, MAX_DRINK_PLAYERS).map((_, i) => genders[i] ?? null) : [null, null, null]
  })
  const [selectedCats,setSelectedCats]=useState(['waterfall','eununca','desafios','cadeia','especiais'])
  const [packOff, setPackOff] = useState({})
  const [showMesaPanel, setShowMesaPanel] = useState(false)
  const [showPlayersPanel, setShowPlayersPanel] = useState(false)
  const [showAjustar, setShowAjustar] = useState(false)
  const [showTvPanel, setShowTvPanel] = useState(false)
  const [showHousePanel, setShowHousePanel] = useState(false)
  const [tvCode, setTvCode] = useState(() => makeDrinkTvCode())
  const [houseCards, setHouseCards] = useState([])
  const [houseDraft, setHouseDraft] = useState('')
  const [houseSending, setHouseSending] = useState({})
  const [sipShields, setSipShields] = useState({})
  const [preferDeckId, setPreferDeckId] = useState('')
  const [readerHoldName, setReaderHoldName] = useState('')
  const [readerHoldLeft, setReaderHoldLeft] = useState(0)
  const [injectCard, setInjectCard] = useState(null)
  const [tvCopied, setTvCopied] = useState(false)
  const [deckSessionId, setDeckSessionId] = useState(0)
  const [drinkStats,setDrinkStats]=useState([])
  const [activeRules,setActiveRules]=useState([])
  const [activeCurses,setActiveCurses]=useState([])
  const [activeAlliances,setActiveAlliances]=useState([])
  const [turnCount,setTurnCount]=useState(0)
  const [leaveConfirm, setLeaveConfirm] = useState(false)
  const [impostorPairs, setImpostorPairs] = useState(IMPOSTOR_PAIRS)
  const [deckCategories, setDeckCategories] = useState(FALLBACK_DRINK_DECKS)
  const [contentPacks, setContentPacks] = useState(['base', 'community'])
  const [packOptions, setPackOptions] = useState([
    {
      pack: 'base',
      name: 'Essencial',
      description: 'O pack gratuito para começar qualquer festa.',
      premium: false,
      intensity: 'moderada',
      ageRating: '18+',
    },
    COMMUNITY_DRINK_PACK,
  ])
  const [decksLoading, setDecksLoading] = useState(true)
  const [midGameName, setMidGameName] = useState('')
  const [midGameGender, setMidGameGender] = useState('m')
  const [departedPlayers, setDepartedPlayers] = useState([])

  const players=playerNames
    .map((name,i)=>({
      name:name.trim(),
      gender: playerGenders[i] ?? null,
      color:['from-pink-400 to-rose-500','from-cyan-400 to-blue-500','from-emerald-400 to-teal-500','from-amber-400 to-orange-500','from-violet-400 to-purple-500','from-fuchsia-400 to-pink-500','from-rose-400 to-red-500','from-sky-400 to-blue-500'][i%8]
    }))
    .filter(p=>p.name)

  const playersSetupReady = players.length >= 2

  useEffect(() => {
    const names = playerNames.map((n) => n.trim()).filter(Boolean)
    if (names.length < 2) return
    const genders = playerNames
      .map((n, i) => (n.trim() ? playerGenders[i] ?? null : null))
      .filter((_, i) => playerNames[i]?.trim())
    saveNightRoster(names, genders)
  }, [playerNames, playerGenders])

  const genderSymbol = (g) => (g === 'm' ? '♂' : g === 'f' ? '♀' : '')

  const packHasCard = (card, packId) => card.pack === packId || (!card.pack && packId === 'base')

  const packedCategories = useMemo(() => {
    const packSet = new Set(contentPacks)
    return deckCategories
      .map((cat) => ({
        ...cat,
        cards: (cat.cards || []).filter((card) => {
          const packId = card.pack || 'base'
          if (!packSet.has(packId)) return false
          return !(packOff[packId] || []).includes(cat.id)
        }),
      }))
      .filter((cat) => cat.id === 'comunidade' || (cat.cards && cat.cards.length))
  }, [deckCategories, contentPacks, packOff])

  const availableCats = useMemo(
    () => selectableDrinkCategories(packedCategories),
    [packedCategories]
  )

  const effectiveCats = useMemo(() => {
    const available = availableCats.map((cat) => cat.id)
    const picked = selectedCats.filter((id) => available.includes(id))
    return picked.length ? picked : available
  }, [availableCats, selectedCats])

  const agentPublicPool = useMemo(
    () => buildAgentPublicPool(packedCategories, effectiveCats),
    [packedCategories, effectiveCats]
  )

  const activeDeck = useMemo(
    () => buildPlayableDrinkDeck(packedCategories, effectiveCats),
    [packedCategories, effectiveCats]
  )

  const freshStats = (count) => Array.from({ length: count }, () => ({
    drinks: 0,
    distributed: 0,
    agentSuccess: 0,
    rulesCreated: 0,
    unlucky: 0,
  }))

  const togglePack = (packId) => {
    setContentPacks((prev) => {
      if (prev.includes(packId)) {
        if (prev.length === 1) return prev
        return prev.filter((id) => id !== packId)
      }
      return [...prev, packId]
    })
  }

  const decksForPack = (packId) => selectableDrinkCategories(deckCategories)
    .map((cat) => ({
      id: cat.id,
      label: cat.label,
      count: (cat.cards || []).filter((card) => packHasCard(card, packId)).length,
    }))
    .filter((cat) => cat.count > 0)

  const countPlayableCards = (offMap, packs = contentPacks) => {
    const packSet = new Set(packs)
    return deckCategories.reduce((n, cat) => {
      const cards = (cat.cards || []).filter((card) => {
        const packId = card.pack || 'base'
        if (!packSet.has(packId)) return false
        return !(offMap[packId] || []).includes(cat.id)
      })
      return n + cards.length
    }, 0)
  }

  const togglePackDeck = (packId, catId) => {
    setPackOff((prev) => {
      const current = prev[packId] || []
      if (current.includes(catId)) {
        return { ...prev, [packId]: current.filter((id) => id !== catId) }
      }
      const next = { ...prev, [packId]: [...current, catId] }
      if (countPlayableCards(next) === 0) return prev
      return next
    })
  }

  const countPackCards = (packId) => {
    const off = new Set(packOff[packId] || [])
    return deckCategories.reduce(
      (n, cat) => n + (off.has(cat.id) ? 0 : (cat.cards || []).filter((card) => packHasCard(card, packId)).length),
      0
    )
  }

  const startGame = () => {
    if (!playersSetupReady || activeDeck.length === 0) return
    setDrinkStats(freshStats(players.length))
    setActiveRules([])
    setActiveCurses([])
    setActiveAlliances([])
    setTurnCount(0)
    setDepartedPlayers([])
    setDeckSessionId((k) => k + 1)
    setShowAjustar(false)
    setShowMesaPanel(false)
    setShowPlayersPanel(false)
    setShowTvPanel(false)
    setShowHousePanel(false)
    setHouseCards([])
    setHouseDraft('')
    setHouseSending({})
    setSipShields({})
    setPreferDeckId('')
    setReaderHoldName('')
    setReaderHoldLeft(0)
    setInjectCard(null)
    setTvCode(makeDrinkTvCode())
    setPhase('playing')
  }

  const removeActivePlayer = (playerIndex) => {
    if (players.length <= 2) return
    const removed = players[playerIndex]
    if (removed?.name) {
      setDepartedPlayers((list) => [...list, { name: removed.name, gender: removed.gender ?? null }])
    }
    setPlayerNames((names) => names.filter((_, i) => i !== playerIndex))
    setPlayerGenders((genders) => genders.filter((_, i) => i !== playerIndex))
    setDrinkStats((stats) => stats.filter((_, idx) => idx !== playerIndex))
    const shift = (idx) => (idx > playerIndex ? idx - 1 : idx)
    setActiveRules((rules) => rules
      .filter((rule) => rule.ownerIndex !== playerIndex)
      .map((rule) => ({ ...rule, ownerIndex: shift(rule.ownerIndex) })))
    setActiveCurses((curses) => curses
      .filter((curse) => curse.playerIndex !== playerIndex)
      .map((curse) => ({ ...curse, playerIndex: shift(curse.playerIndex) })))
    setActiveAlliances((alliances) => alliances
      .filter((alliance) => !alliance.players.includes(playerIndex))
      .map((alliance) => ({ ...alliance, players: alliance.players.map(shift) })))
  }

  const addActivePlayer = () => {
    const clean = midGameName.trim()
    if (!clean || playerNames.length >= MAX_DRINK_PLAYERS) return
    if (players.some((p) => p.name.toLowerCase() === clean.toLowerCase())) return
    setPlayerNames((names) => [...names, clean])
    setPlayerGenders((genders) => [...genders, midGameGender])
    setDrinkStats((stats) => [...stats, freshStats(1)[0]])
    setMidGameName('')
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
    const playerName = players[playerIndex]?.name
    if (playerName && (sipShields[playerName] || 0) > 0) {
      setSipShields((prev) => ({ ...prev, [playerName]: Math.max(0, (prev[playerName] || 0) - 1) }))
      return
    }
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
    if (card?.type === 'roleta') return

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

  const handleChaosResolved = ({ mode, activatorIndex, readerIndex, upgrade }) => {
    if (mode !== 'upgrade' || !upgrade) return
    const idx = activatorIndex ?? readerIndex
    if (idx == null || idx < 0) return
    if (upgrade.readerDrinks) registerDrink(idx, upgrade.readerDrinks)
    if (upgrade.readerDistributes) registerDistributed(idx, upgrade.readerDistributes)
    if (upgrade.groupDrinks) registerGroupDrink(upgrade.groupDrinks)
    if (upgrade.othersDrink) registerOthersDrink(idx, upgrade.othersDrink)
  }

  const hasPicante = packedCategories.some((cat) => cat.id === 'picante' && (cat.cards || []).length)
  const hasCommunity = packedCategories.some((cat) => cat.id === 'comunidade' && (cat.cards || []).length)

  const applyRoulettePrize = (prize, readerIndex) => {
    const readerName = players[readerIndex]?.name
    if (!prize?.id) return
    if (prize.id === 'escudo' && readerName) {
      setSipShields((prev) => ({ ...prev, [readerName]: (prev[readerName] || 0) + 1 }))
    }
    if (prize.id === 'picante') setPreferDeckId('picante')
    if (prize.id === 'comunidade') setPreferDeckId('comunidade')
    if (prize.id === 'leitor' && readerName) {
      setReaderHoldName(readerName)
      setReaderHoldLeft(3)
    }
    if (prize.id === 'casa') {
      setShowHousePanel(true)
      setShowAjustar(false)
      setShowTvPanel(false)
    }
    if (prize.id === 'distribui' && readerIndex >= 0) {
      registerOthersDrink(readerIndex, 1)
      registerDistributed(readerIndex, Math.max(0, players.length - 1))
    }
  }

  const saveHouseCard = () => {
    const text = houseDraft.trim()
    if (!text) return
    const reader = players[0]
    const card = {
      id: `${Date.now()}`,
      type: 'desafio',
      deckId: 'casa',
      pack: 'community',
      emoji: '🏠',
      title: 'Carta da casa',
      text,
      cardType: 'desafios',
    }
    setHouseCards((list) => [...list, card])
    setHouseDraft('')
    setInjectCard({ ...card, id: `${card.id}-play` })
    setShowHousePanel(false)
  }

  const sendHouseToCommunity = async (card) => {
    if (houseSending[card.id]) return
    setHouseSending((m) => ({ ...m, [card.id]: 'sending' }))
    try {
      await api.submitCommunity({
        submissionType: 'card',
        mode: 'drink',
        cardType: card.cardType || 'desafios',
        text: card.text,
        author: 'Mesa',
      })
      setHouseSending((m) => ({ ...m, [card.id]: 'pending' }))
    } catch {
      setHouseSending((m) => ({ ...m, [card.id]: 'error' }))
    }
  }

  const onDisplayChange = (partial) => {
    const card = partial?.card
    const payload = {
      card: card ? {
        type: card.type || '',
        title: card.title || '',
        text: card.text || card.publicText || '',
        emoji: card.emoji || '🍺',
      } : null,
      readerName: partial?.readerName || '',
      turnCount,
      rules: visibleRules.map((rule) => rule.text).filter(Boolean),
    }
    writeDrinkTvLocal(tvCode, payload)
    api.publishDrinkTv(tvCode, payload).catch(() => {})
  }

  const copyTvLink = async () => {
    const url = drinkTvUrl(tvCode)
    try {
      await navigator.clipboard.writeText(url)
      setTvCopied(true)
      window.setTimeout(() => setTvCopied(false), 2000)
    } catch { /* ignore */ }
  }

  const rosterPanelProps = {
    players,
    playerNames,
    genderSymbol,
    drinkStats,
    registerDrink,
    removeActivePlayer,
    midGameName,
    setMidGameName,
    midGameGender,
    setMidGameGender,
    addActivePlayer,
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
    fetchDrinkPacks()
      .then(async (packs) => {
        if (cancelled) return
        const list = Array.isArray(packs) && packs.length ? packs : [{ pack: 'base' }]
        const withCommunity = list.some((pack) => pack.pack === 'community')
          ? list
          : [...list, COMMUNITY_DRINK_PACK]
        setPackOptions(withCommunity)
        const ids = withCommunity.map((pack) => pack.pack).filter(Boolean)
        const [decksList, impostorRows] = await Promise.all([
          Promise.all((ids.length ? ids : ['base']).map((id) => fetchDrinkDecks(id))),
          fetchChallenges({
            category: 'impostor',
            mode_type: 'friends',
            ...challengePackParams(ids[0] || 'base', true),
          }),
        ])
        if (cancelled) return
        const cats = normalizeDrinkCategories(mergeDrinkCategories(decksList))
        setDeckCategories(cats)
        setSelectedCats(selectableDrinkCategories(cats).map((cat) => cat.id))
        if (Array.isArray(impostorRows)) setImpostorPairs(mergeImpostorPairs(IMPOSTOR_PAIRS, impostorRows))
      })
      .finally(() => { if (!cancelled) setDecksLoading(false) })
    return () => { cancelled = true }
  }, [])

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
                        <span className={`mr-1 font-black ${player.gender === 'm' ? 'text-sky-200' : 'text-pink-200'}`}>{genderSymbol(player.gender)}</span>
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

          {houseCards.length > 0 && (
            <div className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-4 mb-5 space-y-3">
              <p className="text-slate-400 text-xs font-black uppercase tracking-[0.14em]">Cartas da casa</p>
              <p className="text-sm text-white/55">Adicionar à comunidade fica pendente até o admin dar ok. Depois entram no pack Comunidade do Beber.</p>
              {houseCards.map((card) => (
                <div key={card.id} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <p className="text-white text-sm leading-snug">{card.text}</p>
                  <button
                    type="button"
                    onClick={() => sendHouseToCommunity(card)}
                    disabled={houseSending[card.id] === 'sending' || houseSending[card.id] === 'pending'}
                    className="mt-2 w-full rounded-xl border border-white/15 bg-white/10 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {houseSending[card.id] === 'pending' ? 'Pendente na comunidade' : houseSending[card.id] === 'sending' ? 'A enviar…' : houseSending[card.id] === 'error' ? 'Falhou — tentar de novo' : 'Adicionar à comunidade'}
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={()=>setPhase('playing')} className="rounded-2xl bg-white/[0.08] border border-white/10 text-white py-4 min-h-[52px] font-bold">
              Voltar ao jogo
            </button>
            <button type="button" onClick={startGame} className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-black py-4 min-h-[52px] font-black">
              Nova sessão
            </button>
          </div>
          <button
            type="button"
            onClick={() => shareNight({
              title: 'Modo Beber — PartyMix',
              text: [
                '🍺 Modo Beber — PartyMix',
                mostDrinks ? `Mais goles: ${mostDrinks.player.name} (${mostDrinks.value})` : null,
                bestAgent ? `Agente: ${bestAgent.player.name} (${bestAgent.value})` : null,
                ruleKing ? `Regras: ${ruleKing.player.name} (${ruleKing.value})` : null,
                unluckiest ? `Azar: ${unluckiest.player.name} (${unluckiest.value})` : null,
                '',
                ...players.map((player, idx) => `${player.name}: ${drinkStats[idx]?.drinks || 0} goles`),
              ].filter(Boolean).join('\n'),
            })}
            className="w-full rounded-2xl bg-white text-slate-950 py-4 min-h-[52px] font-black inline-flex items-center justify-center gap-2"
          >
            <Share2 className="h-5 w-5" /> Partilhar a noite
          </button>
      </PageShell>
    )
  }

  if(phase==='setup' && setupStep === 0) {
    const names = playerNames.map((n) => n.trim()).filter(Boolean)
    const genders = playerNames
      .map((n, i) => (n.trim() ? playerGenders[i] ?? null : null))
      .filter((_, i) => playerNames[i]?.trim())
    return (
      <MesaNoite
        names={names}
        genders={genders}
        max={MAX_DRINK_PLAYERS}
        confirmPrefix="Continuar com"
        onBack={() => navigate('/')}
        onChange={(nextNames, nextGenders) => {
          setPlayerNames(nextNames)
          setPlayerGenders(nextGenders)
        }}
        onConfirm={(nextNames, nextGenders) => {
          if (nextNames.length < 2) return
          setPlayerNames(nextNames)
          setPlayerGenders(nextGenders)
          setSetupStep(1)
        }}
      />
    )
  }

  if(phase==='setup') {
    const PINK = AJUSTAR_PINK
    const rosterReady = loadNightRoster().names.filter(Boolean).length >= 2
    return (
      <NightShell
        onBack={() => {
          if (rosterReady) navigate('/')
          else setSetupStep(0)
        }}
        footer={(
          <NightCta
            accent={PINK}
            onClick={startGame}
            disabled={contentPacks.length === 0 || decksLoading || effectiveCats.length === 0 || activeDeck.length === 0 || !playersSetupReady}
          >
            Começar · {activeDeck.length} cartas
          </NightCta>
        )}
      >
        <NightTitle>Modo Beber</NightTitle>
        <p className="mt-3 text-center text-[1.05rem] font-medium text-white">Que packs queres?</p>
        <p className="mt-1.5 text-center text-[13px] text-white/45">Começa já. No jogo, Ajustar tira os baralhos que não queres.</p>

        <div className="mt-6 space-y-1.5">
          {packOptions.map((pack) => {
            const selected = contentPacks.includes(pack.pack)
            const packCount = countPackCards(pack.pack)
            return (
              <button
                key={pack.pack}
                type="button"
                onClick={() => togglePack(pack.pack)}
                className="flex w-full items-center gap-2.5 rounded-full border bg-[#1c1c21] px-2.5 py-1.5 text-left active:scale-[0.98]"
                style={selected
                  ? { borderColor: `${PINK}66`, boxShadow: `0 8px 20px -10px ${PINK}88` }
                  : { borderColor: 'rgba(255,255,255,.1)' }}
              >
                <GlowDisc color={selected ? PINK : '#64748b'} size={36}>
                  <Beer className="h-4 w-4" style={{ color: selected ? PINK : '#94a3b8' }} strokeWidth={1.75} />
                </GlowDisc>
                <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-white">
                  {pack.name || pack.pack}
                  {packCount > 0 && <span className="ml-1.5 font-semibold text-slate-400">{packCount}</span>}
                </span>
                <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${selected ? 'border-[#ff5c8d] bg-[#ff5c8d]' : 'border-white/20'}`}>
                  {selected && <Check className="h-3 w-3 text-black" strokeWidth={3} />}
                </span>
              </button>
            )
          })}
        </div>
        {decksLoading && <p className="mt-3 text-center text-xs text-[#ff5c8d]">A preparar os packs…</p>}
      </NightShell>
    )
  }

  return(
    <GameShell
      mode="drink"
      header={
        <div className="flex items-center gap-1.5">
          <BackButton onClick={() => setLeaveConfirm(true)} />
          <div className="flex-1 min-w-0 text-center">
            <h1 className="truncate text-lg font-black leading-tight text-white">Beber</h1>
            <p className="text-sm text-slate-300">Turno {turnCount}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowHousePanel((v) => !v)
              setShowAjustar(false)
              setShowTvPanel(false)
              setShowPlayersPanel(false)
              setShowMesaPanel(false)
            }}
            aria-label="Carta da casa"
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border ${
              showHousePanel
                ? 'border-[#ffb04f]/50 bg-[#ffb04f] text-black'
                : 'border-white/10 bg-[#1c1c21] text-white'
            }`}
          >
            <Home className="h-4 w-4" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => {
              setShowTvPanel((v) => !v)
              setShowAjustar(false)
              setShowHousePanel(false)
              setShowPlayersPanel(false)
              setShowMesaPanel(false)
            }}
            aria-label="Ecrã TV"
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border ${
              showTvPanel
                ? 'border-[#22d3ee]/50 bg-[#22d3ee] text-black'
                : 'border-white/10 bg-[#1c1c21] text-white'
            }`}
          >
            <Monitor className="h-4 w-4" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => {
              setShowAjustar((v) => !v)
              setShowHousePanel(false)
              setShowTvPanel(false)
              setShowPlayersPanel(false)
              setShowMesaPanel(false)
            }}
            aria-label="Ajustar baralhos"
            className={`flex h-10 shrink-0 items-center gap-1 rounded-full border px-2.5 text-xs font-bold ${
              showAjustar
                ? 'border-[#ff5c8d]/50 bg-[#ff5c8d] text-black'
                : 'border-white/10 bg-[#1c1c21] text-white'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={2} />
            Ajustar
          </button>
          <button
            type="button"
            onClick={() => {
              setShowPlayersPanel((v) => !v)
              setShowAjustar(false)
            }}
            aria-label="Jogadores"
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border ${
              showPlayersPanel
                ? 'border-[#ff5c8d]/50 bg-[#ff5c8d] text-black'
                : 'border-white/10 bg-[#1c1c21] text-white'
            }`}
          >
            <Users className="h-4 w-4" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => {
              setShowMesaPanel((v) => !v)
              setShowAjustar(false)
            }}
            className={`relative flex h-10 shrink-0 items-center gap-1 rounded-full border px-3 text-xs font-bold ${
              showMesaPanel
                ? 'border-[#ffb04f]/50 bg-[#ffb04f] text-black'
                : 'border-white/10 bg-[#1c1c21] text-white'
            }`}
          >
            Mesa
            {mesaBadgeCount > 0 && !showMesaPanel && (
              <span className="grid h-4 min-w-4 place-items-center rounded-full bg-[#ff5c8d] px-1 text-[10px] font-black text-white">
                {mesaBadgeCount}
              </span>
            )}
          </button>
          <button type="button" onClick={() => setPhase('results')} className="h-10 shrink-0 rounded-full border border-white/10 bg-[#1c1c21] px-3 text-xs font-bold text-white">
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

        {showHousePanel && (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 space-y-3">
            <p className="text-slate-400 text-xs font-black uppercase tracking-[0.12em]">Carta da casa</p>
            <p className="text-[13px] text-white/45">O telemóvel fica com quem lê. Escreve a carta e lê em voz alta.</p>
            <textarea
              value={houseDraft}
              onChange={(e) => setHouseDraft(e.target.value)}
              maxLength={300}
              rows={3}
              placeholder="Ex: Quem chegou por último bebe 2 goles."
              className="w-full rounded-2xl border border-white/10 bg-[#1c1c21] px-3 py-2 text-sm text-white outline-none"
            />
            <button
              type="button"
              onClick={saveHouseCard}
              disabled={!houseDraft.trim()}
              className="w-full rounded-2xl bg-[#ff5c8d] py-3 min-h-[48px] text-sm font-black text-black disabled:opacity-40"
            >
              Mostrar à mesa
            </button>
          </div>
        )}

        {showTvPanel && (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 space-y-3">
            <p className="text-slate-400 text-xs font-black uppercase tracking-[0.12em]">Ecrã TV</p>
            <p className="text-[13px] text-white/45">Abre este link na TV ou noutro ecrã. O telemóvel continua a comandar.</p>
            <p className="text-center text-3xl font-black tracking-[0.2em] text-white">{tvCode}</p>
            <p className="break-all text-center text-xs text-cyan-200">{drinkTvUrl(tvCode)}</p>
            <button
              type="button"
              onClick={copyTvLink}
              className="w-full rounded-2xl border border-white/15 bg-white/10 py-3 min-h-[48px] text-sm font-bold text-white"
            >
              {tvCopied ? 'Link copiado' : 'Copiar link da TV'}
            </button>
          </div>
        )}

        {showAjustar && (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 space-y-4">
            <p className="text-slate-400 text-xs font-black uppercase tracking-[0.12em]">Ajustar baralhos</p>
            <p className="text-[13px] text-white/45 -mt-2">Toca para tirar o que não queres. A carta actual fica.</p>
            {packOptions.filter((pack) => contentPacks.includes(pack.pack)).map((pack) => {
              const packDecks = decksForPack(pack.pack)
              const off = packOff[pack.pack] || []
              if (!packDecks.length) return null
              return (
                <div key={pack.pack}>
                  <p className="mb-2 text-[13px] font-bold text-white/70">{pack.name || pack.pack}</p>
                  <div className="flex flex-wrap gap-2">
                    {packDecks.map((cat) => {
                      const on = !off.includes(cat.id)
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => togglePackDeck(pack.pack, cat.id)}
                          className="inline-flex items-center rounded-full border px-3 py-1 text-left"
                          style={on
                            ? { borderColor: `${AJUSTAR_PINK}66`, boxShadow: `0 8px 20px -10px ${AJUSTAR_PINK}88`, background: '#1c1c21', color: '#fff' }
                            : { borderColor: 'rgba(255,255,255,.1)', background: '#141419', color: '#64748b', textDecoration: 'line-through' }}
                        >
                          <span className="text-[13px] font-bold leading-none">{cat.label}</span>
                          <span className="ml-1.5 text-[10px] font-semibold leading-none opacity-70">{cat.count}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {showPlayersPanel && (
          <PlayerRosterPanel
            {...rosterPanelProps}
            showDrinkStats={false}
            title="Jogadores na mesa"
          />
        )}

        {showMesaPanel && (
          <PlayerRosterPanel
            {...rosterPanelProps}
            showDrinkStats
            title="Contador (goles)"
          />
        )}

        <CardDeck
          key={deckSessionId}
          activeDeck={activeDeck}
          agentPublicPool={agentPublicPool}
          players={players}
          departedPlayers={departedPlayers}
          impostorPairs={impostorPairs}
          preferDeckId={preferDeckId}
          readerHoldName={readerHoldLeft > 0 ? readerHoldName : ''}
          injectCard={injectCard}
          hasPicante={hasPicante}
          hasCommunity={hasCommunity}
          onPreferDeckConsumed={() => setPreferDeckId('')}
          onHoldConsumed={() => {
            setReaderHoldLeft((n) => {
              const next = Math.max(0, n - 1)
              if (next === 0) setReaderHoldName('')
              return next
            })
          }}
          onRoulette={applyRoulettePrize}
          onDisplayChange={onDisplayChange}
          onCardDrawn={onCardDrawn}
          onAgentResult={handleAgentResult}
          onAllianceChosen={onAllianceChosen}
          onImpostorResult={handleImpostorResult}
          onChaosResolved={handleChaosResolved}
        />
      </div>

      {leaveConfirm && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#1a1520] p-5 space-y-4">
            <p className="text-white font-black text-xl text-center">Sair do jogo?</p>
            <p className="text-slate-300 text-sm text-center">Voltas aos packs. Os goles desta sessão ficam nesta página até começares outra.</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setLeaveConfirm(false)} className="rounded-2xl border border-white/15 bg-white/10 py-4 min-h-[52px] text-white font-black">
                Continuar
              </button>
              <button type="button" onClick={() => { setLeaveConfirm(false); setShowAjustar(false); setSetupStep(1); setPhase('setup') }} className="rounded-2xl bg-amber-500 py-4 min-h-[52px] text-black font-black">
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </GameShell>
  )
}
