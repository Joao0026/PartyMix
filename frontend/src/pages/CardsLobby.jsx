import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import { setGlobalSocket, setCardsLobbyHandoff, clearGlobalSocket } from '../utils/socketStore'
import { getSocketUrl } from '../utils/api'
import { socketIoOptions } from '../utils/socketOptions'
import { saveCardsSession, loadCardsSession } from '../utils/cardsSession'
import { loadNightRoster } from '../utils/nightRoster'
import NightShell, {
  NightTitle, NightCta, GlowCode, CodeField, NameField, RosterChips, NightTabs, NightPlayerChip,
} from '../components/layout/NightShell'

const API_URL = getSocketUrl()
const ICE = '#e2e8f0'

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
  const rosterNames = useMemo(() => loadNightRoster().names, [])
  const [tab, setTab] = useState('create')
  const [name,    setName]    = useState(() => loadCardsSession()?.playerName || loadNightRoster().names[0] || '')
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
  }, [])

  useEffect(() => {
    const q = searchParams.get('code')
    if (q) {
      setCode(q.trim().toUpperCase())
      setTab('join')
    }
  }, [searchParams])

  const savedSession = loadCardsSession()

  const rejoinSaved = () => {
    const saved = loadCardsSession()
    if (!saved?.code || !saved?.playerName) return
    setName(saved.playerName)
    setCode(saved.code)
    setJoining(true)
    setError(null)
    const s = io(API_URL, socketIoOptions())
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
      s.on('cards_rejoined', ({ room: r, playerName: pn, isHost: ih, playerToken }) => {
        setRoom(r)
        roomRef.current = r
        setJoining(false)
        saveCardsSession({ code: r.code, playerName: pn || saved.playerName, isHost: ih, playerToken })
        if (r.status === 'playing') {
          enterGameAfterHand({ status: r.status, round: r.round, czarIdx: r.czarIdx, czarName: r.players[r.czarIdx]?.name, czarId: r.czarId, blackCard: r.blackCard, players: r.players })
        }
      })
      s.on('your_hand', (hand) => { handRef.current = hand })
      s.on('error', (msg) => { setError(msg); setJoining(false) })
      s.emit('cards_rejoin_room', { code: saved.code, playerName: saved.playerName, playerToken: saved.playerToken })
    })
    s.on('connect_error', () => { setError('Não foi possível conectar ao servidor'); setJoining(false) })
  }

  const join = () => {
    if (!name.trim() || !code.trim()) return
    setJoining(true); setError(null)

    const s = io(API_URL, socketIoOptions())
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
    s.on('room_joined', ({ room:r, playerToken }) => {
      setRoom(r)
      roomRef.current = r
      setJoining(false)
      saveCardsSession({ code: r.code, playerName: name.trim(), isHost: r.host === name.trim(), playerToken })
      if (r.status === 'playing') {
        enterGameAfterHand({ status:r.status, round:r.round, czarIdx:r.czarIdx, czarName:r.players[r.czarIdx]?.name, czarId:r.czarId, blackCard:r.blackCard, players:r.players })
      }
    })
    s.on('cards_rejoined', ({ room: r, playerName: pn, playerToken }) => {
      setRoom(r)
      roomRef.current = r
      setJoining(false)
      saveCardsSession({ code: r.code, playerName: pn || name.trim(), isHost: r.host === (pn || name.trim()), playerToken })
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

  const leaveRoom = () => {
    socket?.disconnect()
    clearGlobalSocket()
    setRoom(null)
    setSocket(null)
    setJoining(false)
  }

  return (
    <NightShell
      onBack={() => { if (room) leaveRoom(); navigate('/') }}
      footer={!room ? (
        <>
          {savedSession?.code && (
            <button type="button" onClick={rejoinSaved} disabled={joining} className="mb-2 w-full py-1.5 text-center text-xs font-bold text-white/40 disabled:opacity-40">
              Voltar à sala {savedSession.code}
            </button>
          )}
          {tab === 'create' ? (
            <NightCta accent={ICE} onClick={() => navigate('/CardsGame', { state: { presetPlayerName: name.trim() } })} disabled={!name.trim()}>
              Criar sala
            </NightCta>
          ) : (
            <NightCta accent={ICE} onClick={join} disabled={joining || !name.trim() || !code.trim()}>
              {joining ? 'A entrar…' : 'Entrar na sala'}
            </NightCta>
          )}
        </>
      ) : (
        <p className="py-2 text-center text-sm text-white/45">À espera que o host inicie…</p>
      )}
    >
      <NightTitle>Cartas</NightTitle>
      {!room ? (
        <>
          <p className="mt-3 text-center text-[1.05rem] font-medium text-white">Sala online</p>
          <p className="mt-1.5 text-center text-[13px] text-white/45">Quem és tu nesta mesa?</p>
          <RosterChips names={rosterNames} value={name} onChange={setName} accent={ICE} />
          <NameField value={name} onChange={setName} />
          <NightTabs tab={tab} onChange={setTab} />
          {tab === 'join' && <CodeField value={code} onChange={setCode} />}
          {error && (
            <p className="mt-4 rounded-2xl border border-red-400/40 bg-red-900/30 p-3 text-center text-sm text-red-300">{error}</p>
          )}
        </>
      ) : (
        <>
          <GlowCode code={room.code} accent={ICE} mode="cards" />
          <div className="mt-5 space-y-2.5">
            {(room.players || []).map((p, i) => (
              <NightPlayerChip
                key={i}
                name={p.name}
                index={i}
                host={p.name === room.host}
                mine={p.name === name}
                disconnected={p.disconnected}
                accent={ICE}
                onRemove={p.name === name ? leaveRoom : undefined}
                removeLabel="Sair da sala"
              />
            ))}
          </div>
        </>
      )}
    </NightShell>
  )
}
