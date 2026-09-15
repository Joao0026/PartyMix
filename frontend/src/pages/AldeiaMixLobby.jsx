import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { io } from 'socket.io-client'
import { getSocketUrl } from '../utils/api'
import { getGlobalSocket, setGlobalSocket, setAmLobbyHandoff, patchAmLobbyHandoff, clearGlobalSocket } from '../utils/socketStore'
import { saveAmSession, loadAmSession, clearAmSession } from '../utils/amSession'
import { loadNightRoster } from '../utils/nightRoster'
import { confirmHostStart } from '../utils/confirmHost'
import NightShell, {
  NightTitle, NightCta, GlowCode, CodeField, NameField, RosterChips, NightTabs, NightPlayerChip, pessoaLabel,
} from '../components/layout/NightShell'

const API_URL = getSocketUrl()
const CYAN = '#22d3ee'

export default function AldeiaMixLobby() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState('create')
  const rosterNames = useMemo(() => loadNightRoster().names, [])
  const [name, setName] = useState(() => loadAmSession()?.playerName || loadNightRoster().names[0] || '')
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [room, setRoom] = useState(null)
  const [socket, setSocket] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const isHostRef = useRef(false)
  const hasNavigatedRef = useRef(false)
  const socketBindingRef = useRef(null)
  const socketRef = useRef(null)
  const roomRef = useRef(null)

  const [numLobos, setNumLobos] = useState(1)
  const [numCurandeiras, setNumCurandeiras] = useState(1)
  const [numVidentes, setNumVidentes] = useState(1)
  const [discussionSeconds, setDiscussionSeconds] = useState(120)

  const goToGame = (incomingRoom, playerName, isHost, role) => {
    if (hasNavigatedRef.current) return
    hasNavigatedRef.current = true
    saveAmSession({ code: incomingRoom.code, playerName, isHost })
    setAmLobbyHandoff({ room: incomingRoom, playerName, isHost, myRole: role || null })
    navigate('/AldeiaMixOnline', { replace: true, state: { online: true } })
  }

  const unbindSocket = () => {
    const binding = socketBindingRef.current
    if (!binding) return
    Object.entries(binding.handlers).forEach(([event, handler]) => {
      binding.socket.off(event, handler)
    })
    socketBindingRef.current = null
  }

  const bindSocket = (s, playerName, isHost) => {
    unbindSocket()
    isHostRef.current = isHost
    const roleRef = { current: null }

    const handlers = {
      am_your_role: (data) => {
        roleRef.current = data
        patchAmLobbyHandoff({ myRole: data })
      },
      am_room_created: ({ code: c, room: r, playerToken }) => {
        setRoom({ ...r, code: c })
        saveAmSession({ code: c, playerName, isHost: true, playerToken })
        setConnecting(false)
      },
      am_room_joined: ({ code: c, room: r, playerToken }) => {
        setRoom(r)
        saveAmSession({ code: c, playerName, isHost, playerToken })
        setConnecting(false)
        if (r.status !== 'waiting') goToGame(r, playerName, isHost, roleRef.current)
      },
      am_rejoined: ({ code: c, room: r, playerName: pn, isHost: ih, playerToken }) => {
        setRoom(r)
        hasNavigatedRef.current = false
        saveAmSession({ code: c, playerName: pn, isHost: ih, playerToken })
        setConnecting(false)
        if (r.status !== 'waiting') goToGame(r, pn, ih, roleRef.current)
      },
      am_room_updated: (r) => {
        setRoom(r)
        setError((msg) => (msg === 'Demasiados pedidos. Aguarda um momento.' ? null : msg))
      },
      am_game_started: (r) => goToGame(r, playerName, isHostRef.current, roleRef.current),
      am_session_ended: () => {
        clearAmSession()
        setError('A sala foi fechada')
        setRoom(null)
      },
      error: (msg) => { setError(msg); setConnecting(false) },
      connect_error: () => { setError('Não foi possível conectar ao servidor'); setConnecting(false) },
    }
    Object.entries(handlers).forEach(([event, handler]) => s.on(event, handler))
    socketBindingRef.current = { socket: s, handlers }
  }

  const connectAnd = (fn) => {
    setConnecting(true)
    setError(null)
    const existing = getGlobalSocket()
    if (existing?.connected) {
      setSocket(existing)
      fn(existing)
      return
    }
    const s = io(API_URL, { transports: ['websocket', 'polling'] })
    setSocket(s)
    setGlobalSocket(s)
    const onInitialError = () => { setError('Sem ligação'); setConnecting(false) }
    s.once('connect_error', onInitialError)
    s.once('connect', () => {
      s.off('connect_error', onInitialError)
      fn(s)
    })
  }

  const createRoom = () => {
    if (!name.trim()) return
    setTab('create')
    connectAnd((s) => {
      bindSocket(s, name.trim(), true)
      s.emit('am_create_room', {
        playerName: name.trim(),
        settings: { numLobos, numCurandeiras, numVidentes, discussionSeconds },
      })
    })
  }

  const joinRoom = () => {
    if (!name.trim() || !code.trim()) return
    setTab('join')
    connectAnd((s) => {
      bindSocket(s, name.trim(), false)
      s.emit('am_join_room', { code: code.trim().toUpperCase(), playerName: name.trim() })
    })
  }

  const rejoinSaved = () => {
    const saved = loadAmSession()
    if (!saved?.code || !saved?.playerName) return
    setName(saved.playerName)
    setCode(saved.code)
    connectAnd((s) => {
      bindSocket(s, saved.playerName, !!saved.isHost)
      s.emit('am_rejoin_room', { code: saved.code, playerName: saved.playerName, playerToken: saved.playerToken })
    })
  }

  useEffect(() => {
    const saved = loadAmSession()
    if (saved?.playerName) setName(saved.playerName)
    else {
      const roster = loadNightRoster()
      if (roster.names.length) setName(roster.names[0])
    }
    return () => unbindSocket()
  }, [])

  useEffect(() => {
    const q = searchParams.get('code')
    if (q) {
      setCode(q.trim().toUpperCase())
      setTab('join')
    }
  }, [searchParams])

  socketRef.current = socket
  roomRef.current = room

  useEffect(() => {
    const s = socketRef.current
    const r = roomRef.current
    if (!s || !r?.code || !isHostRef.current || r.status !== 'waiting') return
    s.emit('am_update_settings', {
      code: r.code,
      settings: { numLobos, numCurandeiras, numVidentes, discussionSeconds },
    })
  }, [numLobos, numCurandeiras, numVidentes, discussionSeconds])

  const startGame = () => {
    if (!socket || !room) return
    if (!confirmHostStart('Começar o jogo da Aldeia para toda a sala?')) return
    socket.emit('am_start_game', { code: room.code })
  }

  const closeRoom = () => {
    if (!socket || !room || !window.confirm('Fechar sala?')) return
    socket.emit('am_end_session', { code: room.code })
    clearAmSession()
    socket.disconnect()
    navigate('/AldeiaMix')
  }

  const leaveRoom = () => {
    socket?.disconnect()
    clearGlobalSocket()
    setRoom(null)
    setSocket(null)
    setConnecting(false)
  }

  const maxSpec = room ? Math.max(3, (room.players?.length || 0) - 1) : 3
  const isHost = room && room.host === name.trim()
  const juizName = room?.juizName || room?.players?.[0]?.name
  const savedSession = loadAmSession()
  const liveCount = room?.players?.filter((p) => !p.disconnected)?.length || 0

  if (room) {
    return (
      <NightShell
        onBack={() => { leaveRoom(); navigate('/AldeiaMix') }}
        footer={isHost ? (
          <>
            <NightCta accent={CYAN} onClick={startGame} disabled={liveCount < 4}>
              Começar com {pessoaLabel(room.players?.length || 0)}
            </NightCta>
            <button type="button" onClick={closeRoom} className="mt-2 flex w-full items-center justify-center gap-1 py-1.5 text-xs font-bold text-red-400/80">
              <Trash2 className="h-3.5 w-3.5" /> Fechar sala
            </button>
          </>
        ) : (
          <p className="py-2 text-center text-sm text-white/45">À espera que o host inicie…</p>
        )}
      >
        <NightTitle>AldeiaMix</NightTitle>
        <p className="mt-1.5 text-center text-[13px] text-white/45">Juiz: {juizName} · não joga</p>
        <GlowCode code={room.code} accent={CYAN} mode="aldeia" />

        <div className="mt-5 space-y-2.5">
          {(room.players || []).map((p, i) => (
            <NightPlayerChip
              key={p.id || p.name || i}
              name={p.name}
              index={i}
              host={p.name === room.host}
              mine={p.name === name.trim()}
              disconnected={p.disconnected}
              accent={CYAN}
              badge={i === room.juizIdx ? <span className="text-[11px] font-extrabold text-[#fbbf24]">JUIZ</span> : null}
              onRemove={p.name === name.trim() ? leaveRoom : undefined}
              removeLabel="Sair da sala"
            />
          ))}
        </div>

        {isHost && (
          <div className="mt-5 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Lobos', val: numLobos, set: setNumLobos },
                { label: 'Beijoq./o', val: numCurandeiras, set: setNumCurandeiras },
                { label: 'Xerife', val: numVidentes, set: setNumVidentes },
              ].map(({ label, val, set }) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-[#1c1c21] p-3 text-center">
                  <p className="mb-1 text-[11px] text-slate-500">{label}</p>
                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      disabled={val <= 1}
                      onClick={() => set((v) => Math.max(1, v - 1))}
                      className="h-7 w-7 rounded-lg bg-white/[0.06] text-slate-400 disabled:opacity-25"
                    >−</button>
                    <span className="font-black text-white">{val}</span>
                    <button
                      type="button"
                      disabled={numLobos + numCurandeiras + numVidentes >= maxSpec}
                      onClick={() => { if (numLobos + numCurandeiras + numVidentes < maxSpec) set((v) => v + 1) }}
                      className="h-7 w-7 rounded-lg bg-white/[0.06] text-slate-400 disabled:opacity-30"
                    >+</button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-slate-500">Sempre pelo menos 1 lobo, 1 beijoqueira/o e 1 xerife.</p>
            <div className="grid grid-cols-4 gap-2">
              {[60, 90, 120, 180].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setDiscussionSeconds(s)}
                  className={`rounded-full border py-2 text-xs font-bold ${discussionSeconds === s ? 'border-[#22d3ee]/40 text-[#22d3ee]' : 'border-white/10 bg-[#2a2a2e] text-slate-400'}`}
                >
                  {s}s
                </button>
              ))}
            </div>
          </div>
        )}
        {error && <p className="mt-4 text-center text-sm text-red-400">{error}</p>}
      </NightShell>
    )
  }

  return (
    <NightShell
      onBack={() => navigate('/AldeiaMix')}
      footer={(
        <>
          {savedSession?.code && (
            <button type="button" onClick={rejoinSaved} disabled={connecting} className="mb-2 w-full py-1.5 text-center text-xs font-bold text-white/40 disabled:opacity-40">
              Voltar à sala {savedSession.code}
            </button>
          )}
          {tab === 'create' ? (
            <NightCta accent={CYAN} onClick={createRoom} disabled={connecting || !name.trim()}>
              {connecting && tab === 'create' ? 'A ligar…' : 'Criar sala'}
            </NightCta>
          ) : (
            <NightCta accent={CYAN} onClick={joinRoom} disabled={connecting || !name.trim() || !code.trim()}>
              {connecting && tab === 'join' ? 'A ligar…' : 'Entrar na sala'}
            </NightCta>
          )}
        </>
      )}
    >
      <NightTitle>AldeiaMix</NightTitle>
      <p className="mt-3 text-center text-[1.05rem] font-medium text-white">Sala online</p>
      <p className="mt-1.5 text-center text-[13px] text-white/45">Quem és tu nesta mesa?</p>

      <RosterChips names={rosterNames} value={name} onChange={setName} accent={CYAN} />
      <NameField value={name} onChange={setName} />
      <NightTabs tab={tab} onChange={setTab} />
      {tab === 'join' && <CodeField value={code} onChange={setCode} />}
      {error && (
        <p className="mt-4 rounded-2xl border border-red-400/40 bg-red-900/30 p-3 text-center text-sm text-red-300">{error}</p>
      )}
    </NightShell>
  )
}
