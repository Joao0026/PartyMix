import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, WifiOff } from 'lucide-react'
import BackButton from '../components/layout/BackButton'
import PageShell from '../components/layout/PageShell'
import ReconnectBanner from '../components/layout/ReconnectBanner'
import { io } from 'socket.io-client'
import { getGlobalSocket, setGlobalSocket, clearMmLobbyHandoff, peekMmLobbyHandoff } from '../utils/socketStore'
import { saveMmSession, loadMmSession, clearMmSession, patchMmSession } from '../utils/mmSession'
import { fullMemeUrl } from '../utils/mememixImage'
import { getSocketUrl } from '../utils/api'

const API_URL = getSocketUrl()

function memeImgUrl(path, token) {
  return fullMemeUrl(path, token, API_URL)
}

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  visible: (i) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { delay: i * 0.08, type: 'spring', stiffness: 320, damping: 24 },
  }),
}

export default function MemeMixOnline() {
  const navigate = useNavigate()
  const [room, setRoom] = useState(null)
  const [game, setGame] = useState(null)
  const [playerName, setPlayerName] = useState('')
  const [isHost, setIsHost] = useState(false)
  const [socket, setSocket] = useState(null)
  const [uploadToken, setUploadToken] = useState(null)
  const [pickedLegenda, setPickedLegenda] = useState(null)
  const [typedLegenda, setTypedLegenda] = useState('')
  const [reconnecting, setReconnecting] = useState(false)
  const [disconnected, setDisconnected] = useState(false)
  const playerNameRef = useRef('')

  const bindGameSocket = (s) => {
    s.off('mm_state')
    s.off('mm_round_update')
    s.off('mm_reveal_submissions')
    s.off('mm_next_round')
    s.off('mm_game_ended')
    s.off('mm_session_ended')
    s.off('mm_rejoined')
    s.off('mm_room_updated')

    s.on('disconnect', () => {
      setDisconnected(true)
      setReconnecting(true)
    })
    s.on('connect', () => {
      setDisconnected(false)
      setReconnecting(false)
    })

    s.on('mm_state', (state) => {
      setGame(state)
      if (state?.code) setRoom(state)
    })
    s.on('mm_round_update', (r) => { setRoom(r); setGame((g) => ({ ...g, ...r, pendingSubmissions: r.submissions })) })
    s.on('mm_reveal_submissions', (r) => setRoom(r))
    s.on('mm_next_round', (r) => {
      setRoom(r)
      setPickedLegenda(null)
      setTypedLegenda('')
    })
    s.on('mm_game_ended', (r) => setRoom(r))
    s.on('mm_session_ended', () => {
      clearMmSession()
      navigate('/MemeMix', { replace: true })
    })
    s.on('mm_room_updated', (r) => {
      if (r.status === 'waiting') {
        const saved = loadMmSession()
        saveMmSession({
          code: r.code,
          playerName: playerNameRef.current || saved?.playerName,
          uploadToken: saved?.uploadToken,
          isHost: saved?.isHost,
        })
        navigate('/MemeMixLobby', { replace: true, state: { returnToLobby: true } })
      } else {
        setRoom(r)
      }
    })
    s.on('mm_rejoined', ({ room: r, uploadToken: tok, playerName: pn, isHost: ih }) => {
      setRoom(r)
      setUploadToken(tok)
      setPlayerName(pn)
      setIsHost(ih)
      patchMmSession({ uploadToken: tok, isHost: ih })
      setReconnecting(false)
      setDisconnected(false)
      s.emit('mm_request_state', { code: r.code })
    })
  }

  useEffect(() => {
    let cancelled = false
    let s = null

    const handoff = peekMmLobbyHandoff()
    const saved = loadMmSession()
    const pn = handoff?.playerName || saved?.playerName || ''
    const tok = handoff?.uploadToken || saved?.uploadToken || null
    const ih = handoff?.isHost ?? saved?.isHost ?? false
    const code = handoff?.room?.code || saved?.code

    if (!code || !pn) {
      navigate('/MemeMixLobby', { replace: true })
      return
    }

    setPlayerName(pn)
    playerNameRef.current = pn
    setIsHost(ih)
    setUploadToken(tok)
    if (handoff?.room) {
      setRoom(handoff.room)
      if (handoff.game) setGame(handoff.game)
    }
    saveMmSession({ code, playerName: pn, uploadToken: tok, isHost: ih })
    setTimeout(() => clearMmLobbyHandoff(), 0)

    const setup = (sock) => {
      if (cancelled) return
      s = sock
      setSocket(sock)
      setGlobalSocket(sock)
      bindGameSocket(sock)
      sock.emit('mm_rejoin_room', { code, playerName: pn, uploadToken: tok })
    }

    const existing = getGlobalSocket()
    if (existing?.connected) {
      setup(existing)
    } else {
      setReconnecting(true)
      s = io(API_URL, { transports: ['websocket', 'polling'] })
      setGlobalSocket(s)
      s.once('connect', () => setup(s))
      s.on('connect_error', () => setReconnecting(true))
    }

    return () => {
      cancelled = true
      s?.off('disconnect')
      s?.off('connect')
      s?.off('mm_state')
      s?.off('mm_round_update')
      s?.off('mm_reveal_submissions')
      s?.off('mm_next_round')
      s?.off('mm_game_ended')
      s?.off('mm_session_ended')
      s?.off('mm_rejoined')
      s?.off('mm_room_updated')
    }
  }, [navigate])

  const submitLegenda = () => {
    if (!socket || !room) return
    const text = (typedLegenda.trim() || pickedLegenda || '').trim()
    if (!text) return
    socket.emit('mm_submit_legenda', { code: room.code, text })
    setPickedLegenda(null)
    setTypedLegenda('')
  }

  const playMeme = (memeId) => {
    if (!socket || !room) return
    socket.emit('mm_play_meme', { code: room.code, memeId })
  }

  const pickWinner = (winnerId) => {
    if (!socket || !room) return
    socket.emit('mm_pick_winner', { code: room.code, winnerId })
  }

  const closeRoom = () => {
    if (!socket || !room || !window.confirm('Fechar sala e apagar todas as fotos?')) return
    socket.emit('mm_end_session', { code: room.code })
    clearMmSession()
    navigate('/MemeMix')
  }

  if (!room) {
    return (
      <PageShell mode="mememix" className="justify-center" innerClassName="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
        {reconnecting && (
          <p className="text-slate-500 text-sm flex items-center gap-2">
            <WifiOff className="w-4 h-4" /> A reconectar…
          </p>
        )}
      </PageShell>
    )
  }

  const g = game || {}
  const gameReady = typeof g.isJuiz === 'boolean'
  const isJuiz = gameReady ? g.isJuiz : room.juizName === playerName
  const hand = g.hand || []
  const memeHand = g.memeHand || []
  const currentMeme = room.currentMeme
  const submissions = g.submissionsPublic || []
  const scores = room.players || []
  const pending = g.pendingSubmissions ?? room.submissions ?? 0
  const expected = room.submissionsExpected ?? Math.max(0, scores.filter((p) => !p.disconnected).length - 1)
  const rawLegendaMode = room.settings?.legendaMode || 'pack'
  const legendaMode = rawLegendaMode === 'misto' ? 'pack' : rawLegendaMode
  const canPickFromHand = legendaMode === 'pack' && hand.length > 0
  const canType = legendaMode === 'escritas'

  return (
    <PageShell mode="mememix" innerClassName="space-y-4">
        <ReconnectBanner
          reconnecting={reconnecting && !disconnected}
          disconnected={disconnected}
          onRetry={() => socket?.connect()}
        />
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BackButton onClick={() => navigate('/MemeMix')} />
            <div>
              <h1 className="text-white font-bold">😂 {room.code}</h1>
              <p className="text-slate-500 text-xs">
                Ronda {room.round} · Juiz: {room.juizName} · Meta: {room.settings?.maxPoints} pts
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {scores.map((p) => (
            <span key={p.id || p.name} className={`text-xs px-2 py-1 rounded-lg ${p.disconnected ? 'opacity-40 line-through' : ''} ${p.name === playerName ? 'bg-pink-600/30 text-pink-200' : 'bg-white/[0.05] text-slate-400'}`}>
              {p.name}: {p.score}
            </span>
          ))}
        </div>

        {isJuiz && g.stashCount > 0 && (
          <p className="text-slate-500 text-xs text-center">
            {g.stashCount} legenda{g.stashCount !== 1 ? 's' : ''} guardada{g.stashCount !== 1 ? 's' : ''}
          </p>
        )}

        {room.status === 'ended' && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-4">
            <p className="text-white font-black text-2xl">🏆 {room.gameWinner} ganhou!</p>
            {isHost && (
              <>
                <button type="button" onClick={() => socket?.emit('mm_play_again', { code: room.code })}
                  className="w-full bg-pink-600 text-white rounded-2xl py-4 font-bold">
                  Nova sessão (lobby)
                </button>
                <button type="button" onClick={closeRoom}
                  className="w-full flex items-center justify-center gap-2 bg-red-950/50 border border-red-500/30 text-red-300 rounded-2xl py-3 text-sm">
                  <Trash2 className="w-4 h-4" /> Fechar sala
                </button>
              </>
            )}
          </motion.div>
        )}

        {room.status === 'playing' && (
          <AnimatePresence mode="wait">
            {!gameReady ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-500 text-sm">A carregar a tua mão…</p>
              </div>
            ) : currentMeme ? (
              <motion.div key={`round-${room.round}-${currentMeme.id}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <motion.div
                  initial={{ rotate: -1.5, scale: 0.92, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  className="rounded-[2rem] bg-white p-3 pb-8 shadow-2xl"
                >
                  <div className="overflow-hidden rounded-2xl bg-black">
                    <img src={memeImgUrl(currentMeme.url, uploadToken)} alt="Meme" className="w-full max-h-72 object-contain mx-auto" />
                  </div>
                  <p className="mt-3 text-center text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                    Meme da ronda #{room.round}
                  </p>
                </motion.div>
                {!room.revealed && (
                  <p className="text-center text-slate-500 text-xs">Legendas: {pending}/{expected}</p>
                )}
                {room.revealed && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                    <p className="text-white font-semibold text-sm text-center">
                      {isJuiz ? 'Escolhe a vencedora:' : 'Legendas desta ronda:'}
                    </p>
                    {submissions.map((s, i) => (
                      isJuiz ? (
                        <motion.button key={s.playerId} custom={i} variants={cardVariants} initial="hidden" animate="visible"
                          type="button" onClick={() => pickWinner(s.playerId)}
                          className="relative w-full text-left bg-white text-slate-950 hover:bg-pink-50 border border-pink-200/80 rounded-[1.4rem] p-4 shadow-lg">
                          <span className="absolute -top-2 left-6 h-4 w-4 rotate-45 bg-white border-l border-t border-pink-200/80" />
                          <p className="text-slate-400 text-xs">{s.playerName}</p>
                          <p className="text-slate-950 font-bold">{s.text}</p>
                        </motion.button>
                      ) : (
                        <motion.div key={s.playerId} custom={i} variants={cardVariants} initial="hidden" animate="visible"
                          className="relative bg-white/[0.08] border border-white/10 rounded-[1.4rem] p-3">
                          <span className="absolute -top-1.5 left-5 h-3 w-3 rotate-45 bg-[#24172f] border-l border-t border-white/10" />
                          <p className="text-slate-500 text-xs">{s.playerName}</p>
                          <p className="text-white font-medium">{s.text}</p>
                        </motion.div>
                      )
                    ))}
                  </motion.div>
                )}
                {!isJuiz && !g.mySubmission && !room.revealed && (
                  <div className="space-y-2">
                    {canPickFromHand && (
                      <>
                        <p className="text-slate-400 text-sm">Escolhe uma legenda:</p>
                        {hand.map((leg) => (
                          <button key={leg} type="button" onClick={() => { setPickedLegenda(leg); setTypedLegenda('') }}
                            className={`relative w-full text-left rounded-[1.35rem] p-3 text-sm ${pickedLegenda === leg ? 'bg-pink-600 text-white ring-2 ring-pink-300/70' : 'bg-white/[0.06] text-slate-200 border border-white/10'}`}>
                            <span className="absolute -top-1.5 left-5 h-3 w-3 rotate-45 bg-inherit" />
                            {leg}
                          </button>
                        ))}
                      </>
                    )}
                    {canType && (
                      <>
                        <p className="text-slate-400 text-sm">Escreve a tua legenda:</p>
                        <textarea value={typedLegenda} maxLength={200} rows={2}
                          onChange={(e) => { setTypedLegenda(e.target.value); if (e.target.value) setPickedLegenda(null) }}
                          placeholder="A tua legenda…"
                          className="w-full bg-white/[0.05] border border-white/10 text-white rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-pink-500/50" />
                      </>
                    )}
                    <div className="sticky-cta !bg-gradient-to-t !from-[#080b14] !via-[#080b14]/95 !to-transparent">
                      <button type="button" disabled={!pickedLegenda && !typedLegenda.trim()} onClick={submitLegenda}
                        className="w-full bg-pink-600 text-white rounded-2xl py-4 font-black disabled:opacity-40">
                        Jogar legenda
                      </button>
                    </div>
                  </div>
                )}
                {g.mySubmission && !room.revealed && (
                  <p className="text-center text-slate-500 text-sm">Legenda enviada ({pending}/{expected})</p>
                )}
                {room.roundWinner && (
                  <p className="text-pink-300 text-center font-semibold">+1 ponto: {room.roundWinner} 🎉</p>
                )}
              </motion.div>
            ) : isJuiz ? (
              <motion.div key="juiz-pick" className="space-y-3">
                <p className="text-white font-semibold">Escolhe um meme:</p>
                {memeHand.map((m) => (
                  <button key={m.id} type="button" onClick={() => playMeme(m.id)}
                    className="w-full rounded-xl overflow-hidden border border-white/10 bg-black/30">
                    <img src={memeImgUrl(m.url, uploadToken)} alt="" className="w-full max-h-52 object-contain mx-auto" />
                  </button>
                ))}
              </motion.div>
            ) : (
              <motion.div key="waiting-meme" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                <p className="text-center text-slate-500 text-sm">Juiz a escolher meme…</p>
                {canPickFromHand && (
                  <>
                    <p className="text-slate-400 text-sm">As tuas legendas — podes ir escolhendo:</p>
                    {hand.map((leg) => (
                      <button key={leg} type="button" onClick={() => { setPickedLegenda(leg); setTypedLegenda('') }}
                        className={`relative w-full text-left rounded-[1.35rem] p-3 text-sm ${pickedLegenda === leg ? 'bg-pink-600/80 text-white ring-1 ring-pink-400/50' : 'bg-white/[0.06] text-slate-200 border border-white/10'}`}>
                        <span className="absolute -top-1.5 left-5 h-3 w-3 rotate-45 bg-inherit" />
                        {leg}
                      </button>
                    ))}
                  </>
                )}
                {canType && (
                  <>
                    <p className="text-slate-400 text-sm">Prepara a tua legenda:</p>
                    <textarea value={typedLegenda} maxLength={200} rows={2}
                      onChange={(e) => { setTypedLegenda(e.target.value); if (e.target.value) setPickedLegenda(null) }}
                      placeholder="A tua legenda…"
                      className="w-full bg-white/[0.05] border border-white/10 text-white rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-pink-500/50" />
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {isHost && room.status === 'playing' && (
          <button type="button" onClick={closeRoom} className="w-full flex items-center justify-center gap-2 text-red-400/80 text-xs py-2">
            <Trash2 className="w-3 h-3" /> Fechar sala
          </button>
        )}
    </PageShell>
  )
}
