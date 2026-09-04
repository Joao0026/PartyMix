import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ImagePlus, Trash2, Users, X } from 'lucide-react'
import BackButton from '../components/layout/BackButton'
import PageShell from '../components/layout/PageShell'
import { io } from 'socket.io-client'
import { getSocketUrl, api } from '../utils/api'
import { getGlobalSocket, setGlobalSocket, clearGlobalSocket, setMmLobbyHandoff } from '../utils/socketStore'
import { saveMmSession, loadMmSession, clearMmSession } from '../utils/mmSession'
import { compressImageFile, fullMemeUrl } from '../utils/mememixImage'
import ShareRoomLink from '../components/layout/ShareRoomLink'

const API_URL = getSocketUrl()

const LEGENDA_PACK_LABELS = {
  todas: 'Todas',
  base: 'Portugal (PT)',
  br: 'Portugal Extra',
  'house-party': '#House Party',
  picante: 'Picante 18+',
  trabalho: 'Trabalho/Escola',
  relacionamentos: 'Relacionamentos',
  nostalgia: 'Nostalgia',
  amigos: 'Amigos',
  community: 'Comunidade',
}

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
  const [tab, setTab] = useState('create')
  const [name, setName] = useState('')
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
    if (saved?.code) setCode(saved.code)
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

  if (room) {
    return (
      <PageShell mode="mememix" innerClassName="space-y-4">
          <div className="flex items-center gap-3">
            <BackButton onClick={() => { clearMmSession(); socket?.disconnect(); clearGlobalSocket(); navigate('/') }} />
            <h1 className="text-white font-black text-xl">MemeMix · {room.code}</h1>
          </div>

          <div className="bg-white/[0.04] border border-white/[0.07] rounded-3xl p-5">
            <ShareRoomLink mode="mememix" code={room.code} />
            <p className="text-slate-600 text-sm mt-4 text-center">
              {room.memeCount || 0} fotos na sala · Tu: {myMemes}/{maxPer}
            </p>
            <p className="text-slate-600 text-xs mt-1 flex items-center justify-center gap-1">
              <Users className="w-3 h-3" /> {room.players?.length || 0}/15 jogadores
            </p>
          </div>

          <div className="bg-white/[0.03] rounded-2xl p-3 space-y-1">
            <p className="text-slate-600 text-xs font-semibold uppercase tracking-wide">Quem enviou</p>
            {(room.memeUploadSummary || []).length === 0 ? (
              <p className="text-slate-600 text-xs">Ainda sem fotos</p>
            ) : (
              room.memeUploadSummary.map(({ name: n, count }) => (
                <div key={n} className="flex justify-between text-sm">
                  <span className={n === playerName ? 'text-pink-300' : 'text-slate-400'}>{n}</span>
                  <span className="text-slate-600">{count}/{maxPer}</span>
                </div>
              ))
            )}
          </div>

          {isHost && (
            <div className="bg-white/[0.04] rounded-2xl p-4 space-y-3">
              <div>
                <p className="text-slate-400 text-xs mb-2">Pontos para ganhar</p>
                <div className="flex gap-2 flex-wrap">
                  {[3, 4, 5, 6, 7].map((n) => (
                    <button key={n} type="button" onClick={() => setMaxPoints(n)}
                      className={`px-4 py-2 rounded-xl font-bold ${maxPoints === n ? 'bg-pink-600 text-white' : 'bg-white/[0.05] text-slate-400'}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-2">Máx. fotos por jogador</p>
                <p className="text-slate-600 text-[10px] mb-2">Escolhe antes de enviar — aplica a todos na sala</p>
                <div className="flex gap-2 flex-wrap">
                  {[5, 10, 15, 20, 30, 40, 50].map((n) => (
                    <button key={n} type="button" onClick={() => {
                      setMaxMemesPerPlayer(n)
                      pushSettings({ maxMemesPerPlayer: n })
                    }}
                      className={`px-4 py-2 rounded-xl font-bold text-sm ${maxMemesPerPlayer === n ? 'bg-pink-600 text-white' : 'bg-white/[0.05] text-slate-400'}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-2">Baralho de memes</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: false, label: 'Só fotos da sala' },
                    { id: true, label: 'Fotos + oficiais' },
                  ].map(({ id, label }) => (
                    <button key={String(id)} type="button" onClick={() => {
                      setIncludeOfficialMemes(id)
                      pushSettings({ includeOfficialMemes: id })
                    }}
                      className={`py-2 px-2 rounded-xl text-xs font-bold leading-tight ${includeOfficialMemes === id ? 'bg-pink-600 text-white' : 'bg-white/[0.05] text-slate-400'}`}>
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-slate-600 text-[10px] mt-1.5">
                  {includeOfficialMemes
                    ? 'Inclui memes do pack (public/memes + memes-pack.json).'
                    : 'Só entram fotos enviadas pelos jogadores nesta sala.'}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-2">Legendas</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'pack', label: 'Do pack' },
                    { id: 'escritas', label: 'Escritas na hora' },
                  ].map(({ id, label }) => (
                    <button key={id} type="button" onClick={() => {
                      setLegendaMode(id)
                      pushSettings({ legendaMode: id })
                    }}
                      className={`py-2 px-2 rounded-xl text-xs font-bold leading-tight ${legendaMode === id ? 'bg-pink-600 text-white' : 'bg-white/[0.05] text-slate-400'}`}>
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-slate-600 text-[10px] mt-1.5">
                  {legendaMode === 'escritas'
                    ? 'Cada jogador escreve a própria legenda na hora.'
                    : 'Cada jogador recebe uma mão de legendas do pack.'}
                </p>
              </div>
              {legendaMode !== 'escritas' && (
                <div>
                  <p className="text-slate-400 text-xs mb-2">Packs de legendas</p>
                  <div className="flex gap-2 flex-wrap">
                    {['todas', ...availablePacks.filter((p) => p !== 'community')].map((p) => (
                      <button key={p} type="button" onClick={() => toggleLegendaPack(p)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold ${legendaPacks.includes(p) ? 'bg-pink-600 text-white' : 'bg-white/[0.05] text-slate-400'}`}>
                        {LEGENDA_PACK_LABELS[p] || p}
                      </button>
                    ))}
                  </div>
                  <p className="text-slate-600 text-[10px] mt-1.5">
                    {legendaPacks.includes('todas')
                      ? 'Mistura todos os packs de legendas disponíveis.'
                      : `Mistura: ${legendaPacks.map((p) => LEGENDA_PACK_LABELS[p] || p).join(', ')}.`}
                  </p>
                </div>
              )}
              <div>
                <p className="text-slate-400 text-xs mb-2">Quem envia fotos</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'all', label: 'Todos' },
                    { id: 'host', label: 'Só o host' },
                  ].map(({ id, label }) => (
                    <button key={id} type="button" onClick={() => {
                      setUploadsMode(id)
                      pushSettings({ uploads: id })
                    }}
                      className={`py-2 rounded-xl text-sm font-bold ${uploadsMode === id ? 'bg-pink-600 text-white' : 'bg-white/[0.05] text-slate-400'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {canRemoveMemes && (
            <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 space-y-2">
              <p className="text-slate-300 text-sm font-semibold">As tuas fotos ({myMemes}/{maxPer})</p>
              <p className="text-slate-600 text-xs">Toca no ✕ vermelho para remover</p>
              <div className="grid grid-cols-4 gap-3 pt-2">
                {myMemesList.map((m) => (
                  <MemeThumb key={m.id || m.url} meme={m} removable />
                ))}
              </div>
            </div>
          )}

          {canUpload ? (
            <div className="bg-pink-900/10 border border-pink-500/20 rounded-2xl p-4 space-y-3">
              <p className="text-pink-200 text-sm font-semibold">Memes da festa</p>
              <p className="text-slate-600 text-xs">
                {uploadsSetting === 'host'
                  ? 'Só tu (host) podes enviar fotos nesta sala.'
                  : `Cada jogador pode enviar até ${maxPer} fotos.`}
                {' '}Comprimidas automaticamente (máx. 1200px, 5 MB).
              </p>
              <label className="flex items-start gap-2 text-xs text-slate-400">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
                Tenho permissão das pessoas nas fotos
              </label>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
              <button type="button" disabled={uploading || atPhotoLimit} onClick={() => fileRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 bg-pink-600/80 text-white rounded-xl py-3 font-bold disabled:opacity-50">
                <ImagePlus className="w-5 h-5" />
                {uploading ? 'A enviar…' : atPhotoLimit ? `Limite ${maxPer} fotos` : 'Adicionar fotos'}
              </button>
              {uploadStatus && <p className="text-green-400 text-xs text-center">{uploadStatus}</p>}
              {otherMemesList.length > 0 && (
                <div>
                  <p className="text-slate-600 text-xs mb-2">Outras fotos na sala ({otherMemesList.length})</p>
                  <div className="grid grid-cols-4 gap-2">
                    {otherMemesList.map((m) => (
                      <MemeThumb key={m.id} meme={m} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white/[0.03] rounded-2xl p-4 text-center">
              <p className="text-slate-600 text-sm">
                {room.uploadsLocked ? 'Uploads fechados — jogo em curso.' : 'Só o host envia fotos nesta sala.'}
              </p>
              {(room.memes?.length || 0) > 0 && (
                <p className="text-slate-600 text-xs mt-2">{room.memeCount} foto(s) já na sala</p>
              )}
            </div>
          )}

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          {isHost ? (
            <>
              <button type="button" onClick={startGame}
                disabled={starting || (room.players?.filter((p) => !p.disconnected)?.length || 0) < 2 || (room.memeCount || 0) < 3}
                className="w-full bg-gradient-to-r from-pink-600 to-rose-600 text-white font-black rounded-2xl py-4 disabled:opacity-40">
                {starting ? 'A iniciar…' : `Começar (${room.players?.length} jog., ${room.memeCount} fotos)`}
              </button>
              <button type="button" onClick={closeRoom}
                className="w-full flex items-center justify-center gap-2 bg-red-950/50 border border-red-500/30 text-red-300 rounded-2xl py-3 text-sm font-semibold">
                <Trash2 className="w-4 h-4" /> Fechar sala (apaga fotos)
              </button>
            </>
          ) : (
            <p className="text-center text-slate-300 text-sm animate-pulse">À espera do host…</p>
          )}
      </PageShell>
    )
  }

  return (
    <PageShell mode="mememix" innerClassName="space-y-5">
        <BackButton onClick={() => navigate('/')} showLabel label="Voltar" className="!ml-0 w-auto px-1" />
        <div>
          <h1 className="text-white font-black text-2xl">😂 MemeMix</h1>
          <p className="text-slate-300 text-sm mt-1">Cria uma sala ou entra com o código dos amigos.</p>
        </div>
        <div>
          <label className="text-slate-400 text-xs uppercase tracking-wider mb-2 block">O teu nome</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Como te chamas?" maxLength={20}
            className="w-full bg-slate-800 border border-slate-600 text-white rounded-2xl px-4 py-4 outline-none focus:border-pink-500 text-lg placeholder-slate-500" />
        </div>
        <div>
          <label className="text-slate-400 text-xs uppercase tracking-wider mb-2 block">Código da sala</label>
          <input value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); if (e.target.value) setTab('join') }}
            placeholder="ABC234" maxLength={6}
            className="w-full bg-slate-800 border border-slate-600 text-white rounded-2xl px-4 py-4 outline-none focus:border-pink-500 text-2xl text-center tracking-[0.3em] font-black placeholder-slate-600" />
        </div>
        {savedSession?.code && (
          <button type="button" onClick={rejoinSaved} disabled={connecting}
            className="w-full bg-white/[0.06] border border-pink-500/30 text-pink-200 rounded-2xl py-3 text-sm font-semibold disabled:opacity-40">
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
