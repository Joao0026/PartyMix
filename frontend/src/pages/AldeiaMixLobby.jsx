import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Wifi, Trash2 } from 'lucide-react'
import BackButton from '../components/layout/BackButton'
import PageShell from '../components/layout/PageShell'
import { io } from 'socket.io-client'
import { getSocketUrl } from '../utils/api'
import { getGlobalSocket, setGlobalSocket, setAmLobbyHandoff, patchAmLobbyHandoff, clearGlobalSocket } from '../utils/socketStore'
import { saveAmSession, loadAmSession, clearAmSession } from '../utils/amSession'
import { loadNightRoster } from '../utils/nightRoster'
import ShareRoomLink from '../components/layout/ShareRoomLink'

const API_URL = getSocketUrl()

export default function AldeiaMixLobby() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState('create')
  const [name, setName] = useState('')
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
  const [numVidentes, setNumVidentes] = useState(0)
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
    if (saved?.code) setCode(saved.code)
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
    socket.emit('am_start_game', { code: room.code })
  }

  const closeRoom = () => {
    if (!socket || !room || !window.confirm('Fechar sala?')) return
    socket.emit('am_end_session', { code: room.code })
    clearAmSession()
    socket.disconnect()
    navigate('/AldeiaMix')
  }

  const maxSpec = room ? Math.max(1, (room.players?.length || 0) - 2) : 0
  const isHost = room && room.host === name.trim()
  const juizName = room?.juizName || room?.players?.[0]?.name
  const savedSession = loadAmSession()

  const roleCounter = (label, val, set) => (
    <div className="bg-white/[0.03] rounded-xl p-3 text-center">
      <p className="text-slate-500 text-xs mb-1">{label}</p>
      <div className="flex items-center justify-center gap-2">
        <button type="button" onClick={() => set((v) => Math.max(0, v - 1))} className="w-7 h-7 rounded-lg bg-white/[0.06] text-slate-400">−</button>
        <span className="text-white font-black">{val}</span>
        <button type="button" disabled={numLobos + numCurandeiras + numVidentes >= maxSpec} onClick={() => {
          if (numLobos + numCurandeiras + numVidentes < maxSpec) set((v) => v + 1)
        }} className="w-7 h-7 rounded-lg bg-white/[0.06] text-slate-400 disabled:opacity-30">+</button>
      </div>
    </div>
  )

  if (room) {
    return (
      <PageShell mode="aldeia" innerClassName="space-y-4">
          <div className="flex items-center gap-3">
            <BackButton onClick={() => { clearAmSession(); socket?.disconnect(); clearGlobalSocket(); navigate('/AldeiaMix') }} />
            <div>
              <h1 className="text-white font-black text-xl flex items-center gap-2">
                <Wifi className="text-emerald-400 w-5 h-5" /> AldeiaMix · {room.code}
              </h1>
              <p className="text-slate-500 text-sm">Juiz (narrador): {juizName} · não joga</p>
            </div>
          </div>

          <div className="bg-white/[0.04] border border-white/[0.07] rounded-3xl p-6">
            <ShareRoomLink mode="aldeia" code={room.code} />
          </div>

          <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 space-y-2">
            {(room.players || []).map((p, i) => (
              <div key={p.id || p.name || i} className="flex items-center gap-3">
                <span className={`text-white font-medium ${p.disconnected ? 'opacity-40 line-through' : ''}`}>
                  {p.name}{p.name === name.trim() ? ' (Tu)' : ''}
                </span>
                {p.name === room.host && <span className="ml-auto text-xs text-emerald-400 font-bold">HOST</span>}
                {i === room.juizIdx && <span className="text-xs text-amber-400 font-bold">JUIZ</span>}
              </div>
            ))}
          </div>

          {isHost && (
            <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 space-y-3">
              <h3 className="text-white font-semibold text-sm">Papéis</h3>
              <div className="grid grid-cols-3 gap-2">
                {roleCounter('Lobos', numLobos, setNumLobos)}
                {roleCounter('Beijoq./o', numCurandeiras, setNumCurandeiras)}
                {roleCounter('Xerife', numVidentes, setNumVidentes)}
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-2">Tempo de discussão + votação</p>
                <div className="grid grid-cols-4 gap-2">
                  {[60, 90, 120, 180].map((s) => (
                    <button key={s} type="button" onClick={() => setDiscussionSeconds(s)}
                      className={`rounded-xl border py-2 text-xs font-bold ${discussionSeconds === s ? 'bg-emerald-600/30 border-emerald-500 text-emerald-200' : 'bg-white/[0.03] border-white/[0.07] text-slate-400'}`}>
                      {s}s
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          {isHost ? (
            <>
              <motion.button type="button" whileTap={{ scale: 0.98 }} onClick={startGame}
                disabled={(room.players?.filter((p) => !p.disconnected)?.length || 0) < 4}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-black rounded-2xl py-4 disabled:opacity-40">
                Começar partida ({room.players?.length}/4+)
              </motion.button>
              <button type="button" onClick={closeRoom}
                className="w-full flex items-center justify-center gap-2 bg-red-950/50 border border-red-500/30 text-red-300 rounded-2xl py-3 text-sm">
                <Trash2 className="w-4 h-4" /> Fechar sala
              </button>
            </>
          ) : (
            <p className="text-center text-slate-500 text-sm py-4 animate-pulse">À espera do host…</p>
          )}
      </PageShell>
    )
  }

  return (
    <PageShell mode="aldeia" innerClassName="space-y-5">
        <BackButton onClick={() => navigate('/AldeiaMix')} showLabel label="Voltar" className="!ml-0 w-auto px-1" />
        <div>
          <label className="text-slate-400 text-xs uppercase tracking-wider mb-2 block">O teu nome</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Como te chamas?" maxLength={20}
            className="w-full bg-slate-800 border border-slate-600 text-white rounded-2xl px-4 py-4 outline-none focus:border-emerald-500 text-lg placeholder-slate-500" />
        </div>
        <div>
          <label className="text-slate-400 text-xs uppercase tracking-wider mb-2 block">Código da sala</label>
          <input value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); if (e.target.value) setTab('join') }}
            placeholder="ABC234" maxLength={6}
            className="w-full bg-slate-800 border border-slate-600 text-white rounded-2xl px-4 py-4 text-center tracking-[0.3em] font-black placeholder-slate-600 text-2xl outline-none focus:border-emerald-500" />
        </div>
        {savedSession?.code && (
          <button type="button" onClick={rejoinSaved} disabled={connecting}
            className="w-full bg-white/[0.06] border border-emerald-500/30 text-emerald-200 rounded-2xl py-3 text-sm font-semibold disabled:opacity-40">
            Voltar à sala {savedSession.code} ({savedSession.playerName})
          </button>
        )}
        {error && <p className="text-red-300 text-sm text-center bg-red-900/30 border border-red-400/40 rounded-xl p-3">{error}</p>}
        <motion.button type="button" whileTap={{ scale: 0.98 }} onClick={createRoom}
          disabled={connecting || !name.trim()}
          className="w-full bg-white text-slate-950 font-black rounded-2xl py-5 text-xl min-h-[56px] disabled:opacity-40">
          {connecting && tab === 'create' ? 'A ligar…' : 'Criar sala'}
        </motion.button>
        <motion.button type="button" whileTap={{ scale: 0.98 }} onClick={joinRoom}
          disabled={connecting || !name.trim() || !code.trim()}
          className="w-full bg-white/[0.08] border border-white/20 text-white font-black rounded-2xl py-5 text-xl min-h-[56px] disabled:opacity-40">
          {connecting && tab === 'join' ? 'A ligar…' : 'Tenho um código'}
        </motion.button>
    </PageShell>
  )
}
