import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Wifi, Copy, Check, Trash2 } from 'lucide-react'
import { io } from 'socket.io-client'
import { getSocketUrl } from '../utils/api'
import { getGlobalSocket, setGlobalSocket, setAmLobbyHandoff, patchAmLobbyHandoff } from '../utils/socketStore'
import { saveAmSession, loadAmSession, clearAmSession } from '../utils/amSession'

const API_URL = getSocketUrl()

export default function AldeiaMixLobby() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('create')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [room, setRoom] = useState(null)
  const [socket, setSocket] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [copied, setCopied] = useState(false)
  const isHostRef = useRef(false)
  const hasNavigatedRef = useRef(false)

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

  const bindSocket = (s, playerName, isHost) => {
    isHostRef.current = isHost
    const roleRef = { current: null }

    s.on('am_your_role', (data) => {
      roleRef.current = data
      patchAmLobbyHandoff({ myRole: data })
    })
    s.on('am_room_created', ({ code: c, room: r }) => {
      setRoom({ ...r, code: c })
      saveAmSession({ code: c, playerName, isHost: true })
      setConnecting(false)
    })
    s.on('am_room_joined', ({ code: c, room: r }) => {
      setRoom(r)
      saveAmSession({ code: c, playerName, isHost })
      setConnecting(false)
      if (r.status !== 'waiting') goToGame(r, playerName, isHost, roleRef.current)
    })
    s.on('am_rejoined', ({ code: c, room: r, playerName: pn, isHost: ih }) => {
      setRoom(r)
      hasNavigatedRef.current = false
      saveAmSession({ code: c, playerName: pn, isHost: ih })
      setConnecting(false)
      if (r.status !== 'waiting') goToGame(r, pn, ih, roleRef.current)
    })
    s.on('am_room_updated', (r) => setRoom(r))
    s.on('am_game_started', (r) => goToGame(r, playerName, isHostRef.current, roleRef.current))
    s.on('am_session_ended', () => {
      clearAmSession()
      setError('A sala foi fechada')
      setRoom(null)
    })
    s.on('error', (msg) => { setError(msg); setConnecting(false) })
    s.on('connect_error', () => { setError('Não foi possível conectar ao servidor'); setConnecting(false) })
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
    s.once('connect', () => fn(s))
    s.on('connect_error', () => { setError('Sem ligação'); setConnecting(false) })
  }

  const createRoom = () => {
    if (!name.trim()) return
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
      s.emit('am_rejoin_room', { code: saved.code, playerName: saved.playerName })
    })
  }

  useEffect(() => {
    const saved = loadAmSession()
    if (saved?.playerName) setName(saved.playerName)
    if (saved?.code) setCode(saved.code)
  }, [])

  useEffect(() => {
    if (!socket || !room || !isHostRef.current || room.status !== 'waiting') return
    socket.emit('am_update_settings', {
      code: room.code,
      settings: { numLobos, numCurandeiras, numVidentes, discussionSeconds },
    })
  }, [numLobos, numCurandeiras, numVidentes, discussionSeconds, socket, room])

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

  const copyCode = () => {
    if (!room?.code) return
    navigator.clipboard?.writeText(room.code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const maxSpec = room ? Math.max(0, (room.players?.length || 0) - 3) : 0
  const isHost = room && room.host === name.trim()
  const juizName = room?.juizName || room?.players?.[0]?.name
  const savedSession = loadAmSession()

  const roleCounter = (label, val, set) => (
    <div className="bg-white/[0.03] rounded-xl p-3 text-center">
      <p className="text-slate-500 text-xs mb-1">{label}</p>
      <div className="flex items-center justify-center gap-2">
        <button type="button" onClick={() => set((v) => Math.max(0, v - 1))} className="w-7 h-7 rounded-lg bg-white/[0.06] text-slate-400">−</button>
        <span className="text-white font-black">{val}</span>
        <button type="button" onClick={() => {
          if (numLobos + numCurandeiras + numVidentes < maxSpec) set((v) => v + 1)
        }} className="w-7 h-7 rounded-lg bg-white/[0.06] text-slate-400">+</button>
      </div>
    </div>
  )

  if (room) {
    return (
      <div className="min-h-screen bg-[#080b14] flex flex-col items-center px-4 py-8">
        <div className="w-full max-w-lg space-y-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => { socket?.disconnect(); navigate('/AldeiaMix') }} className="text-slate-400 hover:text-white p-1">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-white font-black text-xl flex items-center gap-2">
                <Wifi className="text-emerald-400 w-5 h-5" /> AldeiaMix · {room.code}
              </h1>
              <p className="text-slate-500 text-sm">Juiz (narrador): {juizName} · não joga</p>
            </div>
          </div>

          <div className="bg-white/[0.04] border border-white/[0.07] rounded-3xl p-6 text-center">
            <div className="flex items-center justify-center gap-3">
              <p className="text-white font-black text-4xl tracking-[0.25em]">{room.code}</p>
              <button type="button" onClick={copyCode} className="p-2 rounded-xl bg-white/[0.06] text-slate-400">
                {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
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
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#080b14] flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-lg space-y-5">
        <button type="button" onClick={() => navigate('/AldeiaMix')} className="text-slate-400 flex items-center gap-1">
          <ChevronLeft className="w-5 h-5" /> Voltar
        </button>
        <div className="grid grid-cols-2 gap-2">
          {['create', 'join'].map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={`py-3 rounded-xl font-bold text-sm ${tab === t ? 'bg-emerald-600 text-white' : 'bg-white/[0.04] text-slate-400 border border-white/[0.07]'}`}>
              {t === 'create' ? '✨ Criar' : '🔑 Entrar'}
            </button>
          ))}
        </div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="O teu nome" maxLength={20}
          className="w-full bg-slate-800 border border-slate-600 text-white rounded-2xl px-4 py-4 outline-none focus:border-emerald-500" />
        {tab === 'join' && (
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Código" maxLength={6}
            className="w-full bg-slate-800 border border-slate-600 text-white rounded-2xl px-4 py-4 text-center tracking-[0.3em] font-black" />
        )}
        {savedSession?.code && (
          <button type="button" onClick={rejoinSaved} disabled={connecting}
            className="w-full bg-white/[0.06] border border-emerald-500/30 text-emerald-200 rounded-2xl py-3 text-sm font-semibold disabled:opacity-40">
            Voltar à sala {savedSession.code} ({savedSession.playerName})
          </button>
        )}
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        <motion.button type="button" whileTap={{ scale: 0.98 }}
          onClick={tab === 'create' ? createRoom : joinRoom}
          disabled={connecting || !name.trim() || (tab === 'join' && !code.trim())}
          className="w-full bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-black rounded-2xl py-5 disabled:opacity-40">
          {connecting ? 'A ligar…' : tab === 'create' ? 'Criar sala' : 'Entrar'}
        </motion.button>
      </div>
    </div>
  )
}
