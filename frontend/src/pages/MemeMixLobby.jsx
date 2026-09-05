import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { ImagePlus, Trash2, X } from 'lucide-react'
import { io } from 'socket.io-client'
import { getSocketUrl, api } from '../utils/api'
import { getGlobalSocket, setGlobalSocket, clearGlobalSocket, setMmLobbyHandoff } from '../utils/socketStore'
import { saveMmSession, loadMmSession, clearMmSession } from '../utils/mmSession'
import { compressImageFile, fullMemeUrl } from '../utils/mememixImage'
import { loadNightRoster } from '../utils/nightRoster'
import NightShell, {
  NightTitle, NightCta, GlowCode, CodeField, NameField, RosterChips, NightTabs, NightPlayerChip, NightBox, NightChip, pessoaLabel,
} from '../components/layout/NightShell'

const API_URL = getSocketUrl()
const PINK = '#fb7185'

const LEGENDA_PACK_LABELS = {
  todas: 'Todas',
  base: 'Portugal (PT)',
  br: 'Portugal Extra',
  'house-party': '#House Party',
  picante: 'Picante 18+',
  trabalho: 'Trabalho/Escola',
  relacionamentos: 'Relacionamentos',
  nostalgia: 'Nostalgia',
  amigos: 'A malta',
  community: 'Comunidade',
}

const FALLBACK_LEGENDA_PACKS = [
  'base', 'br', 'house-party', 'picante', 'trabalho', 'relacionamentos', 'nostalgia', 'amigos',
]

function normalizeLegendaPacks(value) {
  const raw = Array.isArray(value) ? value : [value]
  const packs = raw.map((p) => String(p || 'todas').trim()).filter(Boolean)
  const unique = [...new Set(packs)]
  if (!unique.length || unique.includes('todas') || unique.includes('all')) return ['todas']
  return unique
}

export default function MemeMixLobby() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const rosterNames = useMemo(() => loadNightRoster().names, [])
  const [tab, setTab] = useState('create')
  const [name, setName] = useState(() => loadMmSession()?.playerName || loadNightRoster().names[0] || '')
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [room, setRoom] = useState(null)
  const [socket, setSocket] = useState(null)
  const [uploadToken, setUploadToken] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState(null)
  const [maxPoints, setMaxPoints] = useState(5)
  const [maxMemesPerPlayer, setMaxMemesPerPlayer] = useState(30)
  const [uploadsMode, setUploadsMode] = useState('all')
  const [includeOfficialMemes, setIncludeOfficialMemes] = useState(false)
  const [legendaMode, setLegendaMode] = useState('pack')
  const [legendaPacks, setLegendaPacks] = useState(['todas'])
  const [availablePacks, setAvailablePacks] = useState([])
  const [consent, setConsent] = useState(false)
  const [removingId, setRemovingId] = useState(null)
  const [starting, setStarting] = useState(false)
  const isHostRef = useRef(false)
  const creatingRoomRef = useRef(false)
  const hasNavigatedRef = useRef(false)
  const fileRef = useRef(null)
  const uploadTokenRef = useRef(null)
  const playerNameRef = useRef('')
  const lastGameStateRef = useRef(null)

  const goToGame = (incomingRoom, playerName, isHost, token, gameState = null) => {
    if (hasNavigatedRef.current) return
    hasNavigatedRef.current = true
    setStarting(false)
    saveMmSession({ code: incomingRoom.code, playerName, uploadToken: token, isHost })
    setMmLobbyHandoff({ room: incomingRoom, game: gameState, playerName, uploadToken: token, isHost })
    navigate('/MemeMixOnline', { replace: true, state: { online: true } })
  }

  const bindSocket = (s, playerName, isHost) => {
    playerNameRef.current = playerName
    isHostRef.current = isHost

    s.off('mm_room_created')
    s.off('mm_room_joined')
    s.off('mm_rejoined')
    s.off('mm_room_updated')
    s.off('mm_memes_updated')
    s.off('mm_game_started')
    s.off('mm_state')
    s.off('mm_session_ended')
    s.off('error')
    s.off('connect')
    s.off('connect_error')

    s.on('mm_room_created', ({ code: c, room: r, uploadToken: tok, playerToken }) => {
      creatingRoomRef.current = false
      setRoom({ ...r, code: c })
      setUploadToken(tok)
      uploadTokenRef.current = tok
      setUploadsMode(r.settings?.uploads || 'all')
      setIncludeOfficialMemes(r.settings?.includeOfficialMemes !== false)
      setMaxMemesPerPlayer(r.settings?.maxMemesPerPlayer || 30)
      saveMmSession({ code: c, playerName, uploadToken: tok, isHost: true, playerToken })
      setConnecting(false)
    })
    s.on('mm_room_joined', ({ code: c, room: r, uploadToken: tok, playerToken }) => {
      setRoom(r)
      setUploadToken(tok)
      uploadTokenRef.current = tok
      setUploadsMode(r.settings?.uploads || 'all')
      setIncludeOfficialMemes(r.settings?.includeOfficialMemes !== false)
      setMaxMemesPerPlayer(r.settings?.maxMemesPerPlayer || 30)
      saveMmSession({ code: c, playerName, uploadToken: tok, isHost, playerToken })
      setConnecting(false)
      if (r.status === 'playing') goToGame(r, playerName, isHost, tok)
    })
    s.on('mm_rejoined', ({ code: c, room: r, uploadToken: tok, playerName: pn, isHost: ih, playerToken }) => {
      setRoom(r)
      setUploadToken(tok)
      uploadTokenRef.current = tok
      setUploadsMode(r.settings?.uploads || 'all')
      setIncludeOfficialMemes(r.settings?.includeOfficialMemes !== false)
      setMaxMemesPerPlayer(r.settings?.maxMemesPerPlayer || 30)
      hasNavigatedRef.current = false
      saveMmSession({ code: c, playerName: pn, uploadToken: tok, isHost: ih, playerToken })
      setConnecting(false)
      if (r.status === 'playing' || r.status === 'ended') {
        const buffered = lastGameStateRef.current
        if (buffered) {
          lastGameStateRef.current = null
          goToGame(r, pn, ih, tok, buffered)
          return
        }
        let done = false
        const enter = (gameState) => {
          if (done || hasNavigatedRef.current) return
          done = true
          s.off('mm_state', onState)
          lastGameStateRef.current = null
          goToGame(r, pn, ih, tok, gameState)
        }
        const onState = (state) => enter(state)
        s.on('mm_state', onState)
        setTimeout(() => enter(null), 2500)
      }
    })
    s.on('mm_room_updated', (r) => {
      setRoom(r)
      setUploadsMode(r.settings?.uploads || 'all')
      setIncludeOfficialMemes(r.settings?.includeOfficialMemes !== false)
      setMaxMemesPerPlayer(r.settings?.maxMemesPerPlayer || 30)
    })
    s.on('mm_memes_updated', (r) => setRoom(r))
    s.on('mm_state', (state) => {
      lastGameStateRef.current = state
    })
    s.on('mm_game_started', (r) => {
      const buffered = lastGameStateRef.current
      if (buffered) {
        lastGameStateRef.current = null
        goToGame(r, playerNameRef.current, isHostRef.current, uploadTokenRef.current, buffered)
        return
      }
      let done = false
      const enter = (gameState) => {
        if (done || hasNavigatedRef.current) return
        done = true
        s.off('mm_state', onState)
        lastGameStateRef.current = null
        goToGame(r, playerNameRef.current, isHostRef.current, uploadTokenRef.current, gameState)
      }
      const onState = (state) => enter(state)
      s.on('mm_state', onState)
      setTimeout(() => enter(null), 2500)
    })
    s.on('mm_session_ended', () => {
      clearMmSession()
      setError('A sala foi fechada')
      setRoom(null)
    })
    s.on('error', (msg) => { setError(msg); setConnecting(false); setUploading(false); setStarting(false) })
    s.on('connect_error', () => { setError('Sem ligação ao servidor'); setConnecting(false) })
    s.on('connect', () => {
      if (creatingRoomRef.current) return
      const saved = loadMmSession()
      if (saved?.code && playerNameRef.current) {
        s.emit('mm_rejoin_room', {
          code: saved.code,
          playerName: playerNameRef.current,
          uploadToken: uploadTokenRef.current || saved.uploadToken,
          playerToken: saved.playerToken,
        })
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
    s.on('connect_error', () => { setError('Sem ligação ao servidor'); setConnecting(false) })
  }

  const createRoom = () => {
    if (!name.trim()) return
    creatingRoomRef.current = true
    setTab('create')
    connectAnd((s) => {
      bindSocket(s, name.trim(), true)
      s.emit('mm_create_room', {
        playerName: name.trim(),
        settings: { maxPoints, uploads: uploadsMode, maxMemesPerPlayer, includeOfficialMemes, legendaMode, legendaPacks },
      })
    })
  }

  const joinRoom = () => {
    if (!name.trim() || !code.trim()) return
    setTab('join')
    connectAnd((s) => {
      bindSocket(s, name.trim(), false)
      s.emit('mm_join_room', { code: code.trim().toUpperCase(), playerName: name.trim() })
    })
  }

  const rejoinSaved = () => {
    const saved = loadMmSession()
    if (!saved?.code || !saved?.playerName) return
    setName(saved.playerName)
    setCode(saved.code)
    connectAnd((s) => {
      bindSocket(s, saved.playerName, !!saved.isHost)
      s.emit('mm_rejoin_room', {
        code: saved.code,
        playerName: saved.playerName,
        uploadToken: saved.uploadToken,
        playerToken: saved.playerToken,
      })
    })
  }

  useEffect(() => {
    const saved = loadMmSession()
    if (saved?.playerName) setName(saved.playerName)
    if (location.state?.returnToLobby && saved) {
      connectAnd((s) => {
        bindSocket(s, saved.playerName, !!saved.isHost)
        s.emit('mm_rejoin_room', {
          code: saved.code,
          playerName: saved.playerName,
          uploadToken: saved.uploadToken,
          playerToken: saved.playerToken,
        })
      })
    }
    return () => {
      const s = getGlobalSocket()
      if (!s) return
      s.off('mm_room_created')
      s.off('mm_room_joined')
      s.off('mm_rejoined')
      s.off('mm_room_updated')
      s.off('mm_memes_updated')
      s.off('mm_game_started')
      s.off('mm_state')
      s.off('mm_session_ended')
      s.off('error')
      s.off('connect')
      s.off('connect_error')
    }
  }, [])

  useEffect(() => {
    if (room?.settings?.legendaMode) {
      const mode = room.settings.legendaMode === 'misto' ? 'pack' : room.settings.legendaMode
      setLegendaMode(mode)
    }
  }, [room?.settings?.legendaMode])

  useEffect(() => {
    if (room?.settings?.legendaPacks || room?.settings?.legendaPack) {
      setLegendaPacks(normalizeLegendaPacks(room.settings.legendaPacks || room.settings.legendaPack))
    }
  }, [room?.settings?.legendaPacks, room?.settings?.legendaPack])

  useEffect(() => {
    api.getMemeMixPacks().then((rows) => {
      if (Array.isArray(rows)) setAvailablePacks(rows.map((r) => r.pack).filter(Boolean))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const q = searchParams.get('code')
    if (q) {
      setCode(q.trim().toUpperCase())
      setTab('join')
    }
  }, [searchParams])

  const pushSettings = (overrides = {}) => {
    if (!socket || !room || !isHostRef.current || room.status !== 'waiting') return
    const payload = {
      maxPoints: overrides.maxPoints ?? maxPoints,
      uploads: overrides.uploads ?? uploadsMode,
      maxMemesPerPlayer: overrides.maxMemesPerPlayer ?? maxMemesPerPlayer,
      includeOfficialMemes: overrides.includeOfficialMemes ?? includeOfficialMemes,
      legendaMode: overrides.legendaMode ?? legendaMode,
      legendaPacks: overrides.legendaPacks ?? legendaPacks,
    }
    socket.emit('mm_update_settings', {
      code: room.code,
      playerName: playerNameRef.current || name.trim(),
      settings: payload,
    })
    setRoom((r) => r ? { ...r, settings: { ...r.settings, ...payload } } : r)
  }

  const toggleLegendaPack = (pack) => {
    const current = normalizeLegendaPacks(legendaPacks)
    const next = pack === 'todas'
      ? ['todas']
      : current.includes('todas')
        ? [pack]
        : current.includes(pack)
          ? current.filter((p) => p !== pack)
          : [...current, pack]
    const normalized = normalizeLegendaPacks(next.length ? next : ['todas'])
    setLegendaPacks(normalized)
    pushSettings({ legendaPacks: normalized })
  }

  useEffect(() => {
    if (!socket || !room || !isHostRef.current || room.status !== 'waiting') return
    pushSettings()
  }, [maxPoints, uploadsMode, includeOfficialMemes, socket])

  const handleFiles = async (e) => {
    const files = [...(e.target.files || [])]
    e.target.value = ''
    if (!files.length || !room || !uploadToken || !socket) return
    if (!consent) { setError('Confirma permissão para usar as fotos'); return }

    const pn = playerNameRef.current || name.trim()
    const maxPer = room.settings?.maxMemesPerPlayer || maxMemesPerPlayer
    const mine = (room.memes || []).filter((m) => m.uploadedBy === pn).length
    const slotsLeft = maxPer - mine
    if (slotsLeft <= 0) {
      setError(`Máximo ${maxPer} fotos por jogador`)
      return
    }
    const toUpload = files.slice(0, slotsLeft)
    if (files.length > slotsLeft) {
      setError(`Só podes adicionar mais ${slotsLeft} — limite ${maxPer} por jogador`)
    } else {
      setError(null)
    }

    setUploading(true)
    const results = { ok: 0, fail: 0, lastError: null }
    for (const file of toUpload) {
      setUploadStatus(`A enviar ${file.name}…`)
      try {
        const dataUrl = await compressImageFile(file)
        const res = await api.uploadMemeMixPhoto(room.code, uploadToken, dataUrl)
        socket.emit('mm_register_meme', { code: room.code, meme: { id: res.id, url: res.url } })
        results.ok += 1
      } catch (err) {
        results.fail += 1
        results.lastError = err.message || 'Upload falhou'
      }
    }
    setUploading(false)
    setUploadStatus(null)
    if (results.fail && results.ok) {
      setError(`${results.ok} enviada(s), ${results.fail} falhou(ram): ${results.lastError}`)
    } else if (results.fail) {
      setError(results.lastError || 'Upload falhou')
    } else if (results.ok) {
      setUploadStatus(`${results.ok} foto(s) adicionada(s) ✓`)
      setTimeout(() => setUploadStatus(null), 2500)
    }
  }

  const removeMemeViaSocket = (code, id, pn) => new Promise((resolve, reject) => {
    const s = getGlobalSocket() || socket
    if (!s?.connected) {
      reject(new Error('Sem ligação ao servidor'))
      return
    }
    const timer = setTimeout(() => reject(new Error('Timeout ao remover')), 5000)
    s.emit('mm_remove_meme', { code, memeId: id, playerName: pn }, (result) => {
      clearTimeout(timer)
      if (result?.ok) resolve(result)
      else reject(new Error(result?.error || 'Não foi possível remover'))
    })
  })

  const removeMeme = async (memeId) => {
    if (!room || removingId) return
    const token = uploadTokenRef.current || uploadToken || loadMmSession()?.uploadToken
    const pn = playerNameRef.current || name.trim() || loadMmSession()?.playerName || room.host
    const id = String(memeId || '').trim()
    if (!id) {
      setError('Foto inválida')
      return
    }

    const prevRoom = room
    const nextMemes = (room.memes || []).filter((m) => m.id !== id && !(m.url || '').includes(id))
    setRemovingId(id)
    setError(null)
    setRoom({ ...room, memes: nextMemes, memeCount: nextMemes.length })

    try {
      let result = null
      if (token) {
        try {
          result = await api.deleteMemeMixPhoto(room.code, token, id)
        } catch (httpErr) {
          result = await removeMemeViaSocket(room.code, id, pn)
          if (!result) throw httpErr
        }
      } else {
        result = await removeMemeViaSocket(room.code, id, pn)
      }
      if (result?.room) setRoom(result.room)
    } catch (err) {
      setRoom(prevRoom)
      setError(err.message || 'Não foi possível remover')
    } finally {
      setRemovingId(null)
    }
  }

  const startGame = () => {
    if (!socket || !room || starting) return
    setStarting(true)
    setError(null)
    socket.emit('mm_start_game', { code: room.code })
  }

  const closeRoom = () => {
    if (!socket || !room) return
    if (!window.confirm('Fechar sala e apagar todas as fotos?')) return
    socket.emit('mm_end_session', { code: room.code })
    clearMmSession()
    socket.disconnect()
    navigate('/')
  }

  const playerName = playerNameRef.current || name.trim() || loadMmSession()?.playerName || ''
  const isHost = Boolean(room && (isHostRef.current || room.host === playerName))
  const uploadsSetting = room?.settings?.uploads || uploadsMode
  const canUpload = !room?.uploadsLocked && (uploadsSetting === 'all' || isHost)
  const maxPer = room?.settings?.maxMemesPerPlayer || maxMemesPerPlayer
  const myMemesList = (room?.memes || []).filter((m) => {
    if (m.uploadedBy === playerName) return true
    if (isHost && m.uploadedBy === room.host) return true
    return false
  })
  const otherMemesList = (room?.memes || []).filter((m) => !myMemesList.some((mine) => mine.id === m.id))
  const myMemes = myMemesList.length
  const atPhotoLimit = myMemes >= maxPer
  const canRemoveMemes = !room?.uploadsLocked && myMemesList.length > 0
  const savedSession = loadMmSession()

  const MemeThumb = ({ meme, removable, label }) => {
    const memeId = meme.id || (meme.url || '').match(/\/memes\/([a-f0-9]+)/i)?.[1]
    const isRemoving = removingId === memeId
    return (
    <div className="relative aspect-square overflow-visible rounded-xl bg-white p-1 shadow-lg rotate-[-1deg] even:rotate-[1deg]">
      <img
        src={fullMemeUrl(meme.url, uploadTokenRef.current || uploadToken, API_URL)}
        alt=""
        className="rounded-lg w-full h-full object-cover bg-black/20 pointer-events-none select-none"
        draggable={false}
      />
      {label && (
        <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[9px] text-white truncate px-1 py-0.5 rounded-b-lg pointer-events-none z-10">
          {label}
        </span>
      )}
      {removable && memeId && (
        <button
          type="button"
          disabled={!!removingId}
          onPointerUp={(e) => {
            e.preventDefault()
            e.stopPropagation()
            removeMeme(memeId)
          }}
          className="absolute top-0 right-0 z-30 min-w-[2.75rem] min-h-[2.75rem] rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg border-2 border-white active:scale-95 touch-manipulation disabled:opacity-60"
          aria-label="Remover foto"
        >
          {isRemoving ? <span className="text-xs">…</span> : <X className="w-4 h-4" strokeWidth={3} />}
        </button>
      )}
    </div>
    )
  }

  const liveCount = room?.players?.filter((p) => !p.disconnected)?.length || 0
  const chip = (on) => ({ className: 'w-full justify-center', selected: on, accent: PINK })

  if (room) {
    return (
      <NightShell
        wide
        onBack={() => { clearMmSession(); socket?.disconnect(); clearGlobalSocket(); navigate('/') }}
        footer={isHost ? (
          <>
            <NightCta
              accent={PINK}
              onClick={startGame}
              disabled={starting || liveCount < 2 || (room.memeCount || 0) < 3}
            >
              {starting ? 'A iniciar…' : `Começar · ${pessoaLabel(room.players?.length || 0)} · ${room.memeCount || 0} fotos`}
            </NightCta>
            <button type="button" onClick={closeRoom} className="mt-2 flex w-full items-center justify-center gap-1 py-1.5 text-xs font-bold text-red-400/80">
              <Trash2 className="h-3.5 w-3.5" /> Fechar sala
            </button>
          </>
        ) : (
          <p className="py-2 text-center text-sm text-white/45">À espera que o host inicie…</p>
        )}
      >
        <NightTitle>MemeMix</NightTitle>
        <GlowCode code={room.code} accent={PINK} mode="mememix" />
        <p className="mt-2 text-center text-[13px] text-white/45">
          {room.memeCount || 0} fotos · tu {myMemes}/{maxPer}
        </p>

        <div className="mt-5 space-y-2.5">
          {(room.players || []).map((p, i) => (
            <NightPlayerChip
              key={p.id || p.name || i}
              name={p.name}
              index={i}
              host={p.name === room.host}
              mine={p.name === playerName}
              disconnected={p.disconnected}
              accent={PINK}
              onRemove={p.name === playerName ? () => { clearMmSession(); socket?.disconnect(); clearGlobalSocket(); navigate('/') } : undefined}
              removeLabel="Sair da sala"
            />
          ))}
        </div>

        <NightBox title="Quem enviou" className="mt-5">
          {(room.memeUploadSummary || []).length === 0 ? (
            <p className="text-[13px] text-white/45">Ainda sem fotos</p>
          ) : (
            <div className="space-y-1">
              {room.memeUploadSummary.map(({ name: n, count }) => (
                <div key={n} className="flex justify-between text-[13px]">
                  <span className={n === playerName ? 'font-bold text-white' : 'text-white/70'}>{n}</span>
                  <span className="text-white/45">{count}/{maxPer}</span>
                </div>
              ))}
            </div>
          )}
        </NightBox>

        {isHost && (
          <div className="mt-3 space-y-3">
            <NightBox title="Pontos para ganhar">
              <div className="grid grid-cols-5 gap-1.5">
                {[3, 4, 5, 6, 7].map((n) => (
                  <NightChip key={n} {...chip(maxPoints === n)} onClick={() => setMaxPoints(n)}>{n}</NightChip>
                ))}
              </div>
            </NightBox>
            <NightBox title="Máx. fotos por jogador">
              <p className="mb-2 text-[12px] text-white/45">Escolhe antes de enviar — aplica a todos.</p>
              <div className="grid grid-cols-4 gap-1.5">
                {[5, 10, 15, 20, 30, 40, 50].map((n) => (
                  <NightChip key={n} {...chip(maxMemesPerPlayer === n)} onClick={() => {
                    setMaxMemesPerPlayer(n)
                    pushSettings({ maxMemesPerPlayer: n })
                  }}>{n}</NightChip>
                ))}
              </div>
            </NightBox>
            <NightBox title="Baralho de memes">
              <div className="grid grid-cols-2 gap-1.5">
                <NightChip {...chip(includeOfficialMemes === false)} onClick={() => { setIncludeOfficialMemes(false); pushSettings({ includeOfficialMemes: false }) }}>Só fotos da sala</NightChip>
                <NightChip {...chip(includeOfficialMemes === true)} onClick={() => { setIncludeOfficialMemes(true); pushSettings({ includeOfficialMemes: true }) }}>Fotos + oficiais</NightChip>
              </div>
            </NightBox>
            <NightBox title="Legendas">
              <div className="grid grid-cols-2 gap-1.5">
                <NightChip {...chip(legendaMode === 'pack')} onClick={() => { setLegendaMode('pack'); pushSettings({ legendaMode: 'pack' }) }}>Do pack</NightChip>
                <NightChip {...chip(legendaMode === 'escritas')} onClick={() => { setLegendaMode('escritas'); pushSettings({ legendaMode: 'escritas' }) }}>Escritas na hora</NightChip>
              </div>
            </NightBox>
            {legendaMode !== 'escritas' && (
              <NightBox title="Packs de legendas">
                <div className="grid grid-cols-2 gap-1.5">
                  {['todas', ...[...new Set([...FALLBACK_LEGENDA_PACKS, ...availablePacks])].filter((p) => p !== 'community')].map((p) => (
                    <NightChip key={p} {...chip(legendaPacks.includes(p))} onClick={() => toggleLegendaPack(p)}>
                      {LEGENDA_PACK_LABELS[p] || p}
                    </NightChip>
                  ))}
                </div>
              </NightBox>
            )}
            <NightBox title="Quem envia fotos">
              <div className="grid grid-cols-2 gap-1.5">
                <NightChip {...chip(uploadsMode === 'all')} onClick={() => { setUploadsMode('all'); pushSettings({ uploads: 'all' }) }}>Todos</NightChip>
                <NightChip {...chip(uploadsMode === 'host')} onClick={() => { setUploadsMode('host'); pushSettings({ uploads: 'host' }) }}>Só o host</NightChip>
              </div>
            </NightBox>
          </div>
        )}

        {canRemoveMemes && (
          <NightBox title={`As tuas fotos (${myMemes}/${maxPer})`} className="mt-3">
            <p className="mb-2 text-[12px] text-white/45">Toca no ✕ para remover</p>
            <div className="grid grid-cols-4 gap-2">
              {myMemesList.map((m) => (
                <MemeThumb key={m.id || m.url} meme={m} removable />
              ))}
            </div>
          </NightBox>
        )}

        {canUpload ? (
          <NightBox title="Memes da festa" className="mt-3">
            <p className="text-[12px] text-white/45">
              {uploadsSetting === 'host'
                ? 'Só tu (host) podes enviar fotos nesta sala.'
                : `Cada um pode enviar até ${maxPer} fotos.`}
            </p>
            <label className="mt-3 flex items-start gap-2 text-[13px] text-white/70">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
              Tenho permissão das pessoas nas fotos
            </label>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
            <button
              type="button"
              disabled={uploading || atPhotoLimit}
              onClick={() => fileRef.current?.click()}
              className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border text-[14px] font-bold text-white disabled:opacity-40"
              style={{ borderColor: `${PINK}66`, boxShadow: uploading || atPhotoLimit ? 'none' : `0 8px 20px -10px ${PINK}88`, background: '#141419' }}
            >
              <ImagePlus className="h-4 w-4" />
              {uploading ? 'A enviar…' : atPhotoLimit ? `Limite ${maxPer} fotos` : 'Adicionar fotos'}
            </button>
            {uploadStatus && <p className="mt-2 text-center text-xs text-green-400">{uploadStatus}</p>}
            {otherMemesList.length > 0 && (
              <div className="mt-3">
                <p className="mb-2 text-[12px] text-white/45">Outras fotos ({otherMemesList.length})</p>
                <div className="grid grid-cols-4 gap-2">
                  {otherMemesList.map((m) => (
                    <MemeThumb key={m.id} meme={m} />
                  ))}
                </div>
              </div>
            )}
          </NightBox>
        ) : (
          <NightBox className="mt-3">
            <p className="text-center text-[13px] text-white/45">
              {room.uploadsLocked ? 'Uploads fechados — jogo em curso.' : 'Só o host envia fotos nesta sala.'}
            </p>
          </NightBox>
        )}

        {error && (
          <p className="mt-4 rounded-2xl border border-red-400/40 bg-red-900/30 p-3 text-center text-sm text-red-300">{error}</p>
        )}
      </NightShell>
    )
  }

  return (
    <NightShell
      onBack={() => navigate('/')}
      footer={(
        <>
          {savedSession?.code && (
            <button type="button" onClick={rejoinSaved} disabled={connecting} className="mb-2 w-full py-1.5 text-center text-xs font-bold text-white/40 disabled:opacity-40">
              Voltar à sala {savedSession.code}
            </button>
          )}
          {tab === 'create' ? (
            <NightCta accent={PINK} onClick={createRoom} disabled={connecting || !name.trim()}>
              {connecting && tab === 'create' ? 'A ligar…' : 'Criar sala'}
            </NightCta>
          ) : (
            <NightCta accent={PINK} onClick={joinRoom} disabled={connecting || !name.trim() || !code.trim()}>
              {connecting && tab === 'join' ? 'A ligar…' : 'Entrar na sala'}
            </NightCta>
          )}
        </>
      )}
    >
      <NightTitle>MemeMix</NightTitle>
      <p className="mt-3 text-center text-[1.05rem] font-medium text-white">Sala online</p>
      <p className="mt-1.5 text-center text-[13px] text-white/45">Quem és tu nesta mesa?</p>

      <RosterChips names={rosterNames} value={name} onChange={setName} accent={PINK} />
      <NameField value={name} onChange={setName} />
      <NightTabs tab={tab} onChange={setTab} />
      {tab === 'join' && <CodeField value={code} onChange={setCode} />}
      {error && (
        <p className="mt-4 rounded-2xl border border-red-400/40 bg-red-900/30 p-3 text-center text-sm text-red-300">{error}</p>
      )}
    </NightShell>
  )
}
