import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Wifi } from 'lucide-react'
import BackButton from '../components/layout/BackButton'
import PageShell from '../components/layout/PageShell'
import { io } from 'socket.io-client'
import { setGlobalSocket, setCardsLobbyHandoff } from '../utils/socketStore'
import { getSocketUrl } from '../utils/api'
import { saveCardsSession, loadCardsSession } from '../utils/cardsSession'
import ShareRoomLink from '../components/layout/ShareRoomLink'

const API_URL = getSocketUrl()

function pickRoomForHandoff(r) {
  if (!r || typeof r !== 'object') return null
  const players = Array.isArray(r.players)
    ? r.players.map((p) => ({ name: String(p?.name ?? ''), score: Number(p?.score) || 0 }))
    : []
  return {
    code: String(r.code ?? ''),
    host: String(r.host ?? ''),
    status: r.status,
    czarIdx: r.czarIdx,
    czarId: r.czarId,
    round: r.round,
    blackCard: r.blackCard,
    revealed: r.revealed,
    submissionCount: r.submissionCount,
    players,
  }
}

function pickGameStateForHandoff(s) {
  if (!s || typeof s !== 'object') return null
  const players = Array.isArray(s.players)
    ? s.players.map((p) => ({ name: String(p?.name ?? ''), score: Number(p?.score) || 0 }))
    : []
  return {
    status: s.status,
    round: s.round,
    czarIdx: s.czarIdx,
    czarName: s.czarName,
    czarId: s.czarId,
    blackCard: s.blackCard,
    players,
  }
}

export default function CardsLobby() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [name,    setName]    = useState('')
  const [code,    setCode]    = useState('')
  const [error,   setError]   = useState(null)
  const [joining, setJoining] = useState(false)
  const [room,    setRoom]    = useState(null)
  const [socket,  setSocket]  = useState(null)
  const roomRef = useRef(null)
  const handRef = useRef(null)
  const hasNavigatedRef = useRef(false)
  const pendingStartRef = useRef(null)

  useEffect(() => {
    const saved = loadCardsSession()
    if (saved?.playerName) setName(saved.playerName)
    if (saved?.code) setCode(saved.code)
  }, [])

  useEffect(() => {
    const q = searchParams.get('code')
    if (q) setCode(q.trim().toUpperCase())
  }, [searchParams])

  const savedSession = loadCardsSession()

  const rejoinSaved = () => {
    const saved = loadCardsSession()
    if (!saved?.code || !saved?.playerName) return
    setName(saved.playerName)
    setCode(saved.code)
    setJoining(true)
    setError(null)
    const s = io(API_URL, { transports: ['websocket', 'polling'] })
    setSocket(s)
    setGlobalSocket(s)
    const enterGame = (rawGameState) => {
      if (hasNavigatedRef.current) return
      hasNavigatedRef.current = true
      const room = pickRoomForHandoff(roomRef.current)
      const gameState = pickGameStateForHandoff(rawGameState)
      const hand = Array.isArray(handRef.current) ? handRef.current.map(String) : []
      setCardsLobbyHandoff({ room, playerName: saved.playerName, gameState, hand })
      navigate('/CardsGame', { replace: true, state: { online: true } })
    }
    const enterGameAfterHand = (rawGameState) => {
      if (hasNavigatedRef.current) return
      pendingStartRef.current = rawGameState
      s.once('your_hand', (hand) => {
        if (hasNavigatedRef.current) return
        handRef.current = hand
        const pending = pendingStartRef.current
        pendingStartRef.current = null
        if (pending) enterGame(pending)
      })
    }
    s.once('connect', () => {
      s.on('cards_rejoined', ({ room: r, playerName: pn, isHost: ih }) => {
        setRoom(r)
        roomRef.current = r
        setJoining(false)
        saveCardsSession({ code: r.code, playerName: pn || saved.playerName, isHost: ih })
        if (r.status === 'playing') {
          enterGameAfterHand({ status: r.status, round: r.round, czarIdx: r.czarIdx, czarName: r.players[r.czarIdx]?.name, czarId: r.czarId, blackCard: r.blackCard, players: r.players })
        }
      })
      s.on('your_hand', (hand) => { handRef.current = hand })
      s.on('error', (msg) => { setError(msg); setJoining(false) })
      s.emit('cards_rejoin_room', { code: saved.code, playerName: saved.playerName })
    })
    s.on('connect_error', () => { setError('Não foi possível conectar ao servidor'); setJoining(false) })
  }

  const join = () => {
    if (!name.trim() || !code.trim()) return
    setJoining(true); setError(null)

    const s = io(API_URL, { transports:['websocket','polling'] })
    setSocket(s)
    setGlobalSocket(s)

    const enterGame = (rawGameState) => {
      if (hasNavigatedRef.current) return
      hasNavigatedRef.current = true
      const room = pickRoomForHandoff(roomRef.current)
      const gameState = pickGameStateForHandoff(rawGameState)
      const hand = Array.isArray(handRef.current) ? handRef.current.map(String) : []
      setCardsLobbyHandoff({ room, playerName: name.trim(), gameState, hand })
      // History state must be structured-cloneable; keep only a flag — real payload is in setCardsLobbyHandoff.
      navigate('/CardsGame', { replace: true, state: { online: true } })
    }

    const enterGameAfterHand = (rawGameState) => {
      if (hasNavigatedRef.current) return
      pendingStartRef.current = rawGameState
      s.once('your_hand', (hand) => {
        if (hasNavigatedRef.current) return
        handRef.current = hand
        const pending = pendingStartRef.current
        pendingStartRef.current = null
        if (pending) enterGame(pending)
      })
    }

    s.emit('join_room', { code:code.trim().toUpperCase(), playerName:name.trim() })
    s.on('room_joined', ({ room:r }) => {
      setRoom(r)
      roomRef.current = r
      setJoining(false)
      saveCardsSession({ code: r.code, playerName: name.trim(), isHost: r.host === name.trim() })
      if (r.status === 'playing') {
        enterGameAfterHand({ status:r.status, round:r.round, czarIdx:r.czarIdx, czarName:r.players[r.czarIdx]?.name, czarId:r.czarId, blackCard:r.blackCard, players:r.players })
      }
    })
    s.on('cards_rejoined', ({ room: r, playerName: pn }) => {
      setRoom(r)
      roomRef.current = r
      setJoining(false)
      saveCardsSession({ code: r.code, playerName: pn || name.trim(), isHost: r.host === (pn || name.trim()) })
      if (r.status === 'playing') {
        enterGameAfterHand({ status:r.status, round:r.round, czarIdx:r.czarIdx, czarName:r.players[r.czarIdx]?.name, czarId:r.czarId, blackCard:r.blackCard, players:r.players })
      }
    })
    s.on('room_updated', r => {
      setRoom(r)
      roomRef.current = r
      // Não navegar aqui quando passa a "playing": room_updated pode chegar antes de your_hand e
      // bloqueava enterGame vindo de game_started. Só game_started (e room_joined em jogo) tratam disso.
    })
    s.on('your_hand', hand => {
      handRef.current = hand
    })
    s.on('error', msg => { setError(msg); setJoining(false); s.disconnect() })
    s.on('connect_error', () => { setError('Não foi possível conectar ao servidor'); setJoining(false); s.disconnect() })
    s.on('connect_failed', () => { setError('Não foi possível conectar ao servidor'); setJoining(false); s.disconnect() })

    // Quando o host inicia: esperar your_hand (emitido logo a seguir no servidor) antes de navegar
    s.on('game_started', (state) => {
      enterGameAfterHand(state)
    })
  }

  return (
    <PageShell mode="cards" innerClassName="space-y-6">
        <div className="flex items-center gap-3">
          <BackButton onClick={() => navigate('/')} />
          <div>
            <h1 className="text-white font-black text-xl flex items-center gap-2"><Wifi className="text-green-400 w-5 h-5"/>Entrar na Sala</h1>
            <p className="text-slate-500 text-sm">Entra numa sala criada por outra pessoa</p>
          </div>
        </div>

        {!room ? (
          <div className="space-y-4">
            <div>
              <label className="text-slate-400 text-xs uppercase tracking-wider mb-2 block">O teu nome</label>
              <input value={name} onChange={e=>setName(e.target.value)}
                placeholder="Como te chamas?" maxLength={20}
                className="w-full bg-slate-800 border border-slate-600 text-white rounded-2xl px-4 py-4 outline-none focus:border-violet-500 text-lg placeholder-slate-500"/>
            </div>
            <div>
              <label className="text-slate-400 text-xs uppercase tracking-wider mb-2 block">Código da sala</label>
              <input value={code} onChange={e=>setCode(e.target.value.toUpperCase())}
                placeholder="XXXX" maxLength={6}
                className="w-full bg-slate-800 border border-slate-600 text-white rounded-2xl px-4 py-4 outline-none focus:border-violet-500 text-2xl text-center tracking-[0.3em] font-black placeholder-slate-600"/>
            </div>
            {savedSession?.code && (
              <button type="button" onClick={rejoinSaved} disabled={joining}
                className="w-full bg-white/[0.06] border border-violet-500/30 text-violet-200 rounded-2xl py-3 text-sm font-semibold disabled:opacity-40">
                Voltar à sala {savedSession.code} ({savedSession.playerName})
              </button>
            )}
            {error && <p className="text-red-400 text-sm text-center bg-red-900/20 border border-red-500/30 rounded-xl p-3">{error}</p>}
            <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.97}}
              onClick={join} disabled={joining||!name.trim()||!code.trim()}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-700 text-white font-black rounded-2xl py-5 text-xl disabled:opacity-40">
              {joining ? '⏳ A entrar...' : '🔑 Entrar na Sala'}
            </motion.button>
            <div className="pt-4 text-center">
              <p className="text-slate-500 text-sm mb-2">Ainda não tens sala?</p>
              <button
                onClick={() => navigate('/CardsGame', { state: { presetPlayerName: name.trim() } })}
                disabled={!name.trim()}
                className="w-full bg-white/[0.04] border border-white/[0.08] text-white rounded-2xl py-4 text-sm hover:bg-white/[0.08] transition disabled:opacity-40 disabled:hover:bg-white/[0.04]">
                ✨ Criar Sala de Cartas
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white/[0.04] border border-white/[0.07] rounded-3xl p-6">
              <ShareRoomLink mode="cards" code={room.code} />
            </div>
            <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 space-y-2">
              <p className="text-slate-400 text-sm font-semibold">{room.players?.length} jogador{room.players?.length!==1?'es':''}</p>
              {(room.players||[]).map((p,i)=>(
                <div key={i} className={`flex items-center gap-3 ${p.disconnected ? 'opacity-40' : ''}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm ${p.name===room.host?'bg-gradient-to-br from-violet-500 to-purple-600':'bg-gradient-to-br from-slate-600 to-slate-700'}`}>{p.name[0]}</div>
                  <span className={`text-white font-medium ${p.disconnected ? 'line-through' : ''}`}>{p.name}{p.name===name?' (Tu)':''}</span>
                  {p.name===room.host&&<span className="ml-auto text-xs text-violet-400 font-bold">HOST</span>}
                </div>
              ))}
            </div>
            <div className="text-center py-4 space-y-2">
              <motion.div animate={{scale:[1,1.05,1]}} transition={{repeat:Infinity,duration:1.5}}>
                <p className="text-slate-400 text-lg">⏳ À espera que o host inicie o jogo...</p>
              </motion.div>
              <p className="text-slate-600 text-sm">Quando o host carregar em "Iniciar", o jogo começa automaticamente</p>
            </div>
          </div>
        )}
    </PageShell>
  )
}
