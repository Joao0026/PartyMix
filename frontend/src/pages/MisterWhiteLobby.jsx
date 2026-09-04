import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Wifi } from 'lucide-react'
import BackButton from '../components/layout/BackButton'
import PageShell from '../components/layout/PageShell'
import { io } from 'socket.io-client'
import { getSocketUrl, api } from '../utils/api'
import { getGlobalSocket, setGlobalSocket, setMwLobbyHandoff, patchMwLobbyHandoff, clearGlobalSocket } from '../utils/socketStore'
import { saveMwSession, loadMwSession } from '../utils/mwSession'
import { WORD_PACKS, adjustSpecialRoleCounts, mergeCommunityPairs } from '../utils/misterWhiteShared'
import ShareRoomLink from '../components/layout/ShareRoomLink'

const API_URL = getSocketUrl()

export default function MisterWhiteLobby() {
  const navigate = useNavigate()
  const location = useLocation()
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
  const playerNameRef = useRef('')
  const creatingRoomRef = useRef(false)
  const savedSession = loadMwSession()

  const [numUndercover, setNumUndercover] = useState(1)
  const [numMW, setNumMW] = useState(0)
  const [wordPack, setWordPack] = useState('geral')
  const [difficulty, setDifficulty] = useState('normal')
  const [discussionSeconds, setDiscussionSeconds] = useState(90)
  const [communityPairs, setCommunityPairs] = useState([])
  const wordPacks = useMemo(() => mergeCommunityPairs(WORD_PACKS, communityPairs), [communityPairs])

  useEffect(() => {
    api.getMisterPairs().then((d) => {
      if (Array.isArray(d?.pairs)) setCommunityPairs(d.pairs)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const q = searchParams.get('code')
    if (q) {
      setCode(q.trim().toUpperCase())
      setTab('join')
    }
  }, [searchParams])

  const goToGame = (incomingRoom, playerName, isHost, role) => {
    if (hasNavigatedRef.current) return
    hasNavigatedRef.current = true
    saveMwSession({ code: incomingRoom.code, playerName, isHost })
    setMwLobbyHandoff({ room: incomingRoom, playerName, isHost, myRole: role || null })
    navigate('/MisterWhiteOnline', { replace: true, state: { online: true } })
  }

  const bindSocket = (s, playerName, isHost) => {
    isHostRef.current = isHost
    playerNameRef.current = playerName
    const roleRef = { current: null }

    s.off('mw_your_role')
    s.off('mw_room_created')
    s.off('mw_room_joined')
    s.off('mw_rejoined')
    s.off('mw_room_updated')
    s.off('mw_game_started')
    s.off('error')
    s.off('connect')
    s.off('connect_error')

    s.on('mw_your_role', (data) => {
      roleRef.current = data
      patchMwLobbyHandoff({ myRole: data })
    })
    s.on('mw_room_created', ({ code: c, room: r, playerToken }) => {
      creatingRoomRef.current = false
      setRoom({ ...r, code: c })
      setConnecting(false)
      saveMwSession({ code: c, playerName, isHost: true, playerToken })
    })
    s.on('mw_room_joined', ({ room: r, playerToken }) => {
      setRoom(r)
      setConnecting(false)
      saveMwSession({ code: r.code, playerName, isHost, playerToken })
      if (r.status !== 'waiting') {
        goToGame(r, playerName, isHost, roleRef.current)
      }
    })
    s.on('mw_rejoined', ({ room: r, playerName: pn, isHost: ih, playerToken }) => {
      setRoom(r)
      setConnecting(false)
      saveMwSession({ code: r.code, playerName: pn, isHost: ih, playerToken })
      if (r.status !== 'waiting') {
        goToGame(r, pn, ih, roleRef.current)
      }
    })
    s.on('mw_room_updated', (r) => {
      const nowHost = r.host === playerNameRef.current
      isHostRef.current = nowHost
      setRoom(r)
      saveMwSession({ code: r.code, playerName: playerNameRef.current, isHost: nowHost })
    })
    s.on('mw_game_started', (r) => goToGame(r, playerNameRef.current, isHostRef.current, roleRef.current))
    s.on('error', (msg) => { setError(msg); setConnecting(false) })
    s.on('connect_error', () => { setError('Não foi possível conectar ao servidor'); setConnecting(false) })
    s.on('connect', () => {
      if (creatingRoomRef.current) return
      const saved = loadMwSession()
      if (saved?.code && playerNameRef.current) {
        s.emit('mw_rejoin_room', { code: saved.code, playerName: playerNameRef.current, playerToken: saved.playerToken })
      }
    })
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
    s.on('connect_error', () => { setError('Não foi possível conectar ao servidor'); setConnecting(false) })
  }

  const createRoom = () => {
    if (!name.trim()) return
    creatingRoomRef.current = true
    setTab('create')
    connectAnd((s) => {
      bindSocket(s, name.trim(), true)
      s.emit('mw_create_room', {
        playerName: name.trim(),
        settings: { numUndercover, numMW, wordPack, difficulty, discussionSeconds },
      })
    })
  }

  const joinRoom = () => {
    if (!name.trim() || !code.trim()) return
    setTab('join')
    connectAnd((s) => {
      bindSocket(s, name.trim(), false)
      s.emit('mw_join_room', { code: code.trim().toUpperCase(), playerName: name.trim() })
    })
  }

  const rejoinSaved = () => {
    const saved = loadMwSession()
    if (!saved?.code || !saved?.playerName) return
    setName(saved.playerName)
    setCode(saved.code)
    connectAnd((s) => {
      bindSocket(s, saved.playerName, !!saved.isHost)
      s.emit('mw_rejoin_room', { code: saved.code, playerName: saved.playerName, playerToken: saved.playerToken })
    })
  }

  useEffect(() => {
    const saved = loadMwSession()
    if (saved?.playerName) setName(saved.playerName)
    if (saved?.code) setCode(saved.code)
    if (location.state?.returnToLobby && saved) {
      connectAnd((s) => {
        bindSocket(s, saved.playerName, !!saved.isHost)
        s.emit('mw_rejoin_room', { code: saved.code, playerName: saved.playerName, playerToken: saved.playerToken })
      })
    }
    return () => {
      const s = getGlobalSocket()
      if (!s) return
      s.off('mw_room_created')
      s.off('mw_room_joined')
      s.off('mw_rejoined')
      s.off('mw_room_updated')
      s.off('mw_game_started')
      s.off('mw_your_role')
      s.off('error')
      s.off('connect')
      s.off('connect_error')
    }
  }, [])

  const updateSettings = () => {
    if (!socket || !room) return
    socket.emit('mw_update_settings', {
      code: room.code,
      settings: { numUndercover, numMW, wordPack, difficulty, discussionSeconds },
    })
  }

  useEffect(() => {
    if (!socket || !room || !isHostRef.current || room.status !== 'waiting') return
    updateSettings()
  }, [numUndercover, numMW, wordPack, difficulty, discussionSeconds])

  const startGame = () => {
    if (!socket || !room) return
    socket.emit('mw_start_game', { code: room.code })
  }

  const maxSpec = room ? Math.max(0, (room.players?.length || 0) - 2) : 0
  const isHost = room && room.host === name.trim()
  const adjustRole = (role, delta) => {
    const next = adjustSpecialRoleCounts(
      { numMW, numUndercover },
      role,
      delta,
      room?.players?.length || 0,
    )
    setNumMW(next.numMW)
    setNumUndercover(next.numUndercover)
  }

  if (room) {
    return (
      <PageShell mode="misterwhite" innerClassName="space-y-4">
          <div className="flex items-center gap-3">
            <BackButton onClick={() => { socket?.disconnect(); clearGlobalSocket(); navigate('/MisterWhite') }} />
            <div>
              <h1 className="text-white font-black text-xl flex items-center gap-2">
                <Wifi className="text-green-400 w-5 h-5" /> Sala Mister White
              </h1>
              <p className="text-slate-500 text-sm">{isHost ? 'Partilha o link com os amigos' : 'À espera do host'}</p>
            </div>
          </div>

          <div className="bg-white/[0.04] border border-white/[0.07] rounded-3xl p-6">
            <ShareRoomLink mode="mister" code={room.code} />
          </div>

          <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 space-y-2">
            <p className="text-slate-400 text-sm font-semibold">{room.players?.length} jogador{room.players?.length !== 1 ? 'es' : ''}</p>
            {(room.players || []).map((p, i) => (
              <div key={p.id || i} className={`flex items-center gap-3 ${p.disconnected ? 'opacity-40' : ''}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm ${p.name === room.host ? 'bg-gradient-to-br from-violet-500 to-purple-600' : 'bg-gradient-to-br from-slate-600 to-slate-700'}`}>
                  {p.name[0]}
                </div>
                <span className={`text-white font-medium ${p.disconnected ? 'line-through' : ''}`}>{p.name}{p.name === name.trim() ? ' (Tu)' : ''}</span>
                {p.name === room.host && <span className="ml-auto text-xs text-violet-400 font-bold">HOST</span>}
              </div>
            ))}
          </div>

          {isHost && (
            <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 space-y-3">
              <h3 className="text-white font-semibold text-sm">Definições</h3>
              <select value={wordPack} onChange={(e) => setWordPack(e.target.value)}
                className="w-full bg-white/[0.05] text-white rounded-xl px-3 py-2.5 outline-none border border-white/[0.07] text-sm">
                {Object.entries(wordPacks).map(([id, pack]) => (
                  <option key={id} value={id}>{pack.label}</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                {[{ label: 'Infiltrados', val: numUndercover, role: 'undercover' }, { label: 'Mister Whites', val: numMW, role: 'mw' }].map(({ label, val, role }) => (
                  <div key={label} className="bg-white/[0.03] rounded-xl p-3 text-center">
                    <p className="text-slate-500 text-xs mb-1">{label}</p>
                    <div className="flex items-center justify-center gap-2">
                      <button type="button" onClick={() => adjustRole(role, -1)}
                        disabled={val === 0 || numMW + numUndercover <= 1}
                        className="w-7 h-7 rounded-lg bg-white/[0.06] text-slate-400 disabled:opacity-25">−</button>
                      <span className="text-white font-black">{val}</span>
                      <button type="button" onClick={() => adjustRole(role, 1)}
                        disabled={maxSpec === 0 || (numMW + numUndercover >= maxSpec && (role === 'mw' ? numUndercover : numMW) === 0)}
                        className="w-7 h-7 rounded-lg bg-white/[0.06] text-slate-400 disabled:opacity-25">+</button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-center text-slate-500 text-xs">
                {(room.players?.length || 0) < 3
                  ? 'Quando entrarem 3 jogadores podes escolher os papéis.'
                  : `${maxSpec === 1 ? '1 papel especial' : `${maxSpec} papéis especiais`} no máximo · ficam sempre 2 civis.`}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[60, 90, 120].map((s) => (
                  <button key={s} type="button" onClick={() => setDiscussionSeconds(s)}
                    className={`rounded-xl border py-2 text-xs font-bold ${discussionSeconds === s ? 'bg-violet-600/30 border-violet-500 text-violet-200' : 'bg-white/[0.03] border-white/[0.07] text-slate-400'}`}>
                    {s}s
                  </button>
                ))}
              </div>
            </div>
          )}

          {isHost ? (
            <motion.button whileTap={{ scale: 0.98 }} onClick={startGame}
              disabled={(room.players?.length || 0) < 3}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-700 text-white font-black rounded-2xl py-4 disabled:opacity-40">
              Começar jogo ({room.players?.length}/3+)
            </motion.button>
          ) : (
            <p className="text-center text-slate-500 text-sm py-4 animate-pulse">À espera que o host inicie…</p>
          )}
      </PageShell>
    )
  }

  return (
    <PageShell mode="misterwhite" innerClassName="space-y-5">
        <div className="flex items-center gap-3">
          <BackButton onClick={() => navigate('/MisterWhite')} />
          <div>
            <h1 className="text-white font-black text-xl">Sala online</h1>
            <p className="text-slate-300 text-sm">Cria uma sala ou entra com o código</p>
          </div>
        </div>

        <div>
          <label className="text-slate-400 text-xs uppercase tracking-wider mb-2 block">O teu nome</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Como te chamas?" maxLength={20}
            className="w-full bg-slate-800 border border-slate-600 text-white rounded-2xl px-4 py-4 outline-none focus:border-violet-500 text-lg" />
        </div>

        <div>
          <label className="text-slate-400 text-xs uppercase tracking-wider mb-2 block">Código da sala</label>
          <input value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); if (e.target.value) setTab('join') }}
            placeholder="ABC234" maxLength={6}
            className="w-full bg-slate-800 border border-slate-600 text-white rounded-2xl px-4 py-4 outline-none focus:border-violet-500 text-2xl text-center tracking-[0.3em] font-black placeholder-slate-600" />
        </div>

        <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 space-y-3">
            <p className="text-slate-300 text-xs font-bold uppercase tracking-wider">Opções da nova sala</p>
            <select value={wordPack} onChange={(e) => setWordPack(e.target.value)}
              className="w-full bg-white/[0.05] text-white rounded-xl px-3 py-2.5 outline-none border border-white/[0.07] text-sm">
              {Object.entries(wordPacks).map(([id, pack]) => (
                <option key={id} value={id}>{pack.label}</option>
              ))}
            </select>
            <div className="grid grid-cols-3 gap-2">
              {[['facil', 'Fácil'], ['normal', 'Normal'], ['dificil', 'Difícil']].map(([id, label]) => (
                <button key={id} type="button" onClick={() => setDifficulty(id)}
                  className={`rounded-xl border py-3 min-h-[48px] text-xs font-bold ${difficulty === id ? 'bg-slate-500/30 border-slate-400 text-white' : 'bg-white/[0.03] border-white/[0.07] text-slate-400'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

        {error && <p className="text-red-300 text-sm text-center bg-red-900/30 border border-red-400/40 rounded-xl p-3">{error}</p>}

        {savedSession?.code && (
          <button type="button" onClick={rejoinSaved} disabled={connecting}
            className="w-full bg-white/[0.06] border border-violet-500/30 text-violet-200 rounded-2xl py-3 text-sm font-semibold disabled:opacity-40">
            Voltar à sala {savedSession.code} ({savedSession.playerName})
          </button>
        )}

        <motion.button whileTap={{ scale: 0.98 }}
          onClick={createRoom}
          disabled={connecting || !name.trim()}
          className="w-full bg-white text-slate-950 font-black rounded-2xl py-5 text-xl min-h-[56px] disabled:opacity-40">
          {connecting && tab === 'create' ? 'A ligar…' : 'Criar sala'}
        </motion.button>
        <motion.button whileTap={{ scale: 0.98 }}
          onClick={joinRoom}
          disabled={connecting || !name.trim() || !code.trim()}
          className="w-full bg-white/[0.08] border border-white/20 text-white font-black rounded-2xl py-5 text-xl min-h-[56px] disabled:opacity-40">
          {connecting && tab === 'join' ? 'A ligar…' : 'Tenho um código'}
        </motion.button>
    </PageShell>
  )
}
