import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { io } from 'socket.io-client'
import { getSocketUrl, api } from '../utils/api'
import { getGlobalSocket, setGlobalSocket, setMwLobbyHandoff, patchMwLobbyHandoff, clearGlobalSocket } from '../utils/socketStore'
import { saveMwSession, loadMwSession } from '../utils/mwSession'
import { WORD_PACKS, adjustSpecialRoleCounts, mergeCommunityPairs } from '../utils/misterWhiteShared'
import { loadNightRoster } from '../utils/nightRoster'
import NightShell, {
  NightTitle, NightCta, GlowCode, CodeField, NameField, RosterChips, NightTabs, NightPlayerChip, pessoaLabel,
} from '../components/layout/NightShell'

const API_URL = getSocketUrl()
const GOLD = '#fbbf24'

export default function MisterWhiteLobby() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const rosterNames = useMemo(() => loadNightRoster().names, [])
  const [tab, setTab] = useState('create')
  const [name, setName] = useState(() => loadMwSession()?.playerName || loadNightRoster().names[0] || '')
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

  const leaveRoom = () => {
    socket?.disconnect()
    clearGlobalSocket()
    setRoom(null)
    setSocket(null)
    setConnecting(false)
  }

  useEffect(() => {
    const saved = loadMwSession()
    if (saved?.playerName) setName(saved.playerName)
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
  const playerCount = room?.players?.length || 0
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
      <NightShell
        onBack={() => { leaveRoom(); navigate('/MisterWhite') }}
        footer={isHost ? (
          <NightCta accent={GOLD} onClick={startGame} disabled={playerCount < 3}>
            Começar com {pessoaLabel(playerCount)}
          </NightCta>
        ) : (
          <p className="py-2 text-center text-sm text-white/45">À espera que o host inicie…</p>
        )}
      >
        <NightTitle>Mister White</NightTitle>
        <GlowCode code={room.code} accent={GOLD} mode="mister" />

        <div className="mt-5 space-y-2.5">
          {(room.players || []).map((p, i) => (
            <NightPlayerChip
              key={p.id || i}
              name={p.name}
              index={i}
              host={p.name === room.host}
              mine={p.name === name.trim()}
              disconnected={p.disconnected}
              accent={GOLD}
              onRemove={p.name === name.trim() ? leaveRoom : undefined}
              removeLabel="Sair da sala"
            />
          ))}
        </div>

        {isHost && (
          <div className="mt-5 space-y-3">
            <select
              value={wordPack}
              onChange={(e) => setWordPack(e.target.value)}
              className="h-12 w-full appearance-none rounded-full border border-white/10 bg-[#1c1c21] px-5 text-sm text-white outline-none"
            >
              {Object.entries(wordPacks).map(([id, pack]) => (
                <option key={id} value={id}>{pack.label}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              {[{ label: 'Infiltrados', val: numUndercover, role: 'undercover' }, { label: 'Mister Whites', val: numMW, role: 'mw' }].map(({ label, val, role }) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-[#1c1c21] p-3 text-center">
                  <p className="mb-1 text-xs text-slate-500">{label}</p>
                  <div className="flex items-center justify-center gap-2">
                    <button type="button" onClick={() => adjustRole(role, -1)}
                      disabled={val === 0 || numMW + numUndercover <= 1}
                      className="h-7 w-7 rounded-lg bg-white/[0.06] text-slate-400 disabled:opacity-25">−</button>
                    <span className="font-black text-white">{val}</span>
                    <button type="button" onClick={() => adjustRole(role, 1)}
                      disabled={maxSpec === 0 || (numMW + numUndercover >= maxSpec && (role === 'mw' ? numUndercover : numMW) === 0)}
                      className="h-7 w-7 rounded-lg bg-white/[0.06] text-slate-400 disabled:opacity-25">+</button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-slate-500">
              {playerCount < 3
                ? 'Quando entrarem 3 jogadores podes escolher os papéis.'
                : `${maxSpec === 1 ? '1 papel especial' : `${maxSpec} papéis especiais`} no máximo · ficam sempre 2 civis.`}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[60, 90, 120].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setDiscussionSeconds(s)}
                  className={`rounded-full border py-2 text-xs font-bold ${discussionSeconds === s ? 'border-[#fbbf24]/40 text-[#fbbf24]' : 'border-white/10 bg-[#2a2a2e] text-slate-400'}`}
                >
                  {s}s
                </button>
              ))}
            </div>
          </div>
        )}
      </NightShell>
    )
  }

  return (
    <NightShell
      onBack={() => navigate('/MisterWhite')}
      footer={(
        <>
          {savedSession?.code && (
            <button
              type="button"
              onClick={rejoinSaved}
              disabled={connecting}
              className="mb-2 w-full py-1.5 text-center text-xs font-bold text-white/40 disabled:opacity-40"
            >
              Voltar à sala {savedSession.code}
            </button>
          )}
          {tab === 'create' ? (
            <NightCta accent={GOLD} onClick={createRoom} disabled={connecting || !name.trim()}>
              {connecting && tab === 'create' ? 'A ligar…' : 'Criar sala'}
            </NightCta>
          ) : (
            <NightCta accent={GOLD} onClick={joinRoom} disabled={connecting || !name.trim() || !code.trim()}>
              {connecting && tab === 'join' ? 'A ligar…' : 'Entrar na sala'}
            </NightCta>
          )}
        </>
      )}
    >
      <NightTitle>Mister White</NightTitle>
      <p className="mt-3 text-center text-[1.05rem] font-medium text-white">Sala online</p>
      <p className="mt-1.5 text-center text-[13px] text-white/45">Quem és tu nesta mesa?</p>

      <RosterChips names={rosterNames} value={name} onChange={setName} accent={GOLD} />
      <NameField value={name} onChange={setName} />
      <NightTabs tab={tab} onChange={setTab} />

      {tab === 'create' ? (
        <div className="mt-5 space-y-3">
          <p className="text-left text-[13px] text-white/45">Pacote de palavras</p>
          <select
            value={wordPack}
            onChange={(e) => setWordPack(e.target.value)}
            className="h-12 w-full appearance-none rounded-full border border-white/10 bg-[#1c1c21] px-5 text-sm text-white outline-none"
          >
            {Object.entries(wordPacks).map(([id, pack]) => (
              <option key={id} value={id}>{pack.label}</option>
            ))}
          </select>
          <div className="flex gap-2">
            {[['facil', 'Fácil'], ['normal', 'Normal'], ['dificil', 'Difícil']].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setDifficulty(id)}
                className={`min-h-[48px] flex-1 rounded-full border text-xs font-bold ${difficulty === id ? 'border-[#fbbf24]/40 text-[#fbbf24]' : 'border-white/10 bg-[#2a2a2e] text-slate-400'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <CodeField value={code} onChange={setCode} />
      )}

      {error && (
        <p className="mt-4 rounded-2xl border border-red-400/40 bg-red-900/30 p-3 text-center text-sm text-red-300">{error}</p>
      )}
    </NightShell>
  )
}
