import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Crown, RefreshCw, Share2, Trash2, WifiOff } from 'lucide-react'
import BackButton from '../components/layout/BackButton'
import PageShell from '../components/layout/PageShell'
import ReconnectBanner from '../components/layout/ReconnectBanner'
import { io } from 'socket.io-client'
import { getGlobalSocket, setGlobalSocket, clearMmLobbyHandoff, peekMmLobbyHandoff } from '../utils/socketStore'
import { saveMmSession, loadMmSession, clearMmSession, patchMmSession } from '../utils/mmSession'
import { fullMemeUrl } from '../utils/mememixImage'
import { getSocketUrl } from '../utils/api'
import { shareNight } from '../utils/shareNight'

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
  const [pickedLegendas, setPickedLegendas] = useState([])
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
    s.off('error')

    s.on('disconnect', () => {
      setDisconnected(true)
      setReconnecting(true)
    })
    s.on('connect', () => {
      setDisconnected(false)
      setReconnecting(false)
      const saved = loadMmSession()
      const code = saved?.code
      const name = playerNameRef.current || saved?.playerName
      if (code && name) {
        s.emit('mm_rejoin_room', {
          code,
          playerName: name,
          uploadToken: saved?.uploadToken,
          playerToken: saved?.playerToken,
        })
      }
    })

    s.on('mm_state', (state) => {
      setGame(state)
      if (state?.code) setRoom(state)
    })
    s.on('mm_round_update', (r) => { setRoom(r); setGame((g) => ({ ...g, ...r, pendingSubmissions: r.submissions })) })
    s.on('mm_reveal_submissions', (r) => setRoom(r))
    s.on('mm_next_round', (r) => {
      setRoom(r)
      setPickedLegendas([])
      setTypedLegenda('')
    })
    s.on('mm_game_ended', (r) => setRoom(r))
    s.on('mm_session_ended', () => {
      clearMmSession()
      navigate('/', { replace: true })
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
    s.on('error', (msg) => { if (msg) window.alert(String(msg)) })
    s.on('mm_rejoined', ({ room: r, uploadToken: tok, playerName: pn, isHost: ih, playerToken }) => {
      setRoom(r)
      setUploadToken(tok)
      setPlayerName(pn)
      setIsHost(ih)
      patchMmSession({ uploadToken: tok, isHost: ih, playerToken })
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
      sock.emit('mm_rejoin_room', { code, playerName: pn, uploadToken: tok, playerToken: saved?.playerToken })
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

  const toggleLegenda = (leg) => {
    setTypedLegenda('')
    setPickedLegendas((prev) => {
      if (prev.includes(leg)) return prev.filter((x) => x !== leg)
      if (prev.length >= 3) return prev
      return [...prev, leg]
    })
  }

  const submitLegenda = () => {
    if (!socket || !room) return
    const text = (typedLegenda.trim() || (pickedLegendas.length === 1 ? pickedLegendas[0] : '') || '').trim()
    if (!text) return
    socket.emit('mm_submit_legenda', { code: room.code, text })
    setPickedLegendas([])
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

  const swapLegendas = () => {
    if (!socket || !room || pickedLegendas.length < 1) return
    socket.emit('mm_swap_legenda', { code: room.code, texts: pickedLegendas })
    setPickedLegendas([])
  }

  const closeRoom = () => {
    if (!socket || !room || !window.confirm('Fechar sala e apagar todas as fotos?')) return
    socket.emit('mm_end_session', { code: room.code })
    clearMmSession()
    navigate('/')
  }

  useEffect(() => {
    if (!isHost || !socket || !room) return
    const pendingCount = game?.pendingSubmissions ?? room.submissions ?? 0
    const expectedCount = room.submissionsExpected ?? 0
    const waiting = room.status === 'playing' && room.currentMeme && !room.revealed && pendingCount < expectedCount
    if (!waiting || pendingCount < 1) return
    const t = setTimeout(() => {
      socket.emit('mm_skip_pending', { code: room.code })
    }, 45000)
    return () => clearTimeout(t)
  }, [isHost, socket, room, game])

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
  const myScore = scores.find((p) => p.name === playerName)?.score || 0
  const pending = g.pendingSubmissions ?? room.submissions ?? 0
  const expected = room.submissionsExpected ?? Math.max(0, scores.filter((p) => !p.disconnected && !p.sittingOut).length - 1)
  const imSittingOut = !!scores.find((p) => p.name === playerName)?.sittingOut
  const rawLegendaMode = room.settings?.legendaMode || 'pack'
  const legendaMode = rawLegendaMode === 'misto' ? 'pack' : rawLegendaMode
  const canPickFromHand = legendaMode === 'pack' && hand.length > 0
  const canSwapLegendas = canPickFromHand && !isJuiz && !g.mySubmission && !room.revealed && myScore > 0
  const canType = legendaMode === 'escritas'
  const pickedLegenda = pickedLegendas.length === 1 ? pickedLegendas[0] : null
  const swapLabel = pickedLegendas.length <= 1 ? 'Trocar esta −1 pt' : `Trocar ${pickedLegendas.length} −1 pt`

  return (
    <PageShell mode="mememix" innerClassName="space-y-4">
        <ReconnectBanner
          reconnecting={reconnecting && !disconnected}
          disconnected={disconnected}
          onRetry={() => socket?.connect()}
        />
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BackButton onClick={() => navigate('/')} />
            <div>
              <h1 className="text-white font-black text-lg">😂 {room.code}</h1>
              <p className="text-slate-300 text-sm">
                Ronda {room.round} · Juiz: {room.juizName} · Meta: {room.settings?.maxPoints} pts
              </p>
            </div>
          </div>
        </div>

        {isJuiz && room.status === 'playing' && (
          <div className="rounded-2xl border border-pink-400/40 bg-pink-600/25 px-4 py-3 text-center">
            <p className="text-pink-50 font-black text-lg tracking-[0.12em]">
              {currentMeme && room.revealed ? 'TU JULGAS' : currentMeme ? 'TU ÉS O JUIZ' : 'TU ESCOLHES O MEME'}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {scores.map((p) => (
            <span key={p.id || p.name} className={`relative px-2.5 py-1.5 rounded-xl text-base font-bold ${p.disconnected || p.sittingOut ? 'opacity-40' : ''} ${p.disconnected ? 'line-through' : ''} ${p.name === playerName ? 'bg-pink-600/30 text-pink-100' : 'bg-white/[0.06] text-slate-300'}`}>
              {p.name === room.juizName && (
                <Crown className="absolute -top-3 left-1/2 h-4 w-4 -translate-x-1/2 text-amber-300 drop-shadow" />
              )}
              {p.name}: {p.score}{p.sittingOut ? ' · fora' : ''}
            </span>
          ))}
        </div>

        {room.lastRoundWinner && (
          <div className="rounded-[1.6rem] border border-pink-400/25 bg-white p-4 text-center shadow-xl">
            <p className="text-pink-600 text-xs font-black uppercase tracking-[0.16em]">Polaroid da ronda</p>
            <p className="mt-2 text-slate-950 font-black text-lg leading-snug">"{room.lastRoundWinner.text}"</p>
            <p className="mt-1 text-pink-600 text-sm font-bold">+1 ponto: {room.lastRoundWinner.playerName}</p>
            <button
              type="button"
              onClick={() => shareNight({
                title: 'MemeMix',
                text: `"${room.lastRoundWinner.text}"\n+1 ponto: ${room.lastRoundWinner.playerName} — MemeMix`,
              })}
              className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-pink-600 py-3.5 min-h-[48px] text-white font-black"
            >
              <Share2 className="h-4 w-4" /> Partilhar
            </button>
          </div>
        )}

        {isJuiz && g.stashCount > 0 && (
          <p className="text-slate-500 text-xs text-center">
            {g.stashCount} legenda{g.stashCount !== 1 ? 's' : ''} guardada{g.stashCount !== 1 ? 's' : ''}
          </p>
        )}

        {room.status === 'ended' && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-4">
            <p className="text-white font-black text-2xl">🏆 {room.gameWinner} ganhou!</p>
            <button
              type="button"
              onClick={() => shareNight({
                title: 'MemeMix',
                text: `🏆 ${room.gameWinner} ganhou no MemeMix!`,
              })}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-white py-4 min-h-[52px] font-black text-slate-950"
            >
              <Share2 className="h-4 w-4" /> Partilhar vitória
            </button>
            {isHost && (
              <>
                <button type="button" onClick={() => socket?.emit('mm_play_again', { code: room.code })}
                  className="w-full bg-pink-600 text-white rounded-2xl py-4 font-bold">
                  Nova sessão (lobby)
                </button>
                <button type="button" onClick={closeRoom}
                  className="w-full flex items-center justify-center gap-2 bg-red-950/50 border border-red-500/30 text-red-300 rounded-2xl py-4 min-h-[52px] font-bold">
                  <Trash2 className="w-4 h-4" /> Fechar sala
                </button>
              </>
            )}
          </motion.div>
        )}

        {room.status === 'playing' && imSittingOut && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-center space-y-3">
            <p className="text-white font-bold">Estás de fora</p>
            <p className="text-slate-400 text-sm">O telemóvel fica na mesa — volta quando quiseres.</p>
            <button
              type="button"
              onClick={() => socket?.emit('mm_sit_in', { code: room.code })}
              className="w-full rounded-2xl bg-white py-3 min-h-[48px] font-black text-slate-950"
            >
              Voltar ao jogo
            </button>
          </div>
        )}

        {isHost && room.status === 'playing' && currentMeme && !room.revealed && pending < expected && pending >= 1 && (
          <button
            type="button"
            onClick={() => socket?.emit('mm_skip_pending', { code: room.code })}
            className="w-full rounded-2xl border border-pink-400/30 bg-pink-500/15 py-3 min-h-[48px] text-pink-100 text-sm font-black"
          >
            Seguir sem quem falta
          </button>
        )}

        {room.status === 'playing' && !imSittingOut && (
          <button
            type="button"
            onClick={() => socket?.emit('mm_sit_out', { code: room.code })}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] py-2.5 text-slate-400 text-xs font-bold"
          >
            Ficar de fora
          </button>
        )}

        {room.status === 'playing' && (
          <AnimatePresence mode="wait">
            {!gameReady ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-300 text-sm">A carregar a tua mão…</p>
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
                  <p className="mt-3 text-center text-sm font-black uppercase tracking-[0.18em] text-slate-600">
                    Meme da ronda #{room.round}
                  </p>
                </motion.div>
                {!room.revealed && (
                  <p className="text-center text-white text-2xl font-black">Legendas {pending}/{expected}</p>
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
                          <p className="text-slate-400 text-xs">Legenda {i + 1}</p>
                          <p className="text-slate-950 font-bold">{s.text}</p>
                        </motion.button>
                      ) : (
                        <motion.div key={s.playerId} custom={i} variants={cardVariants} initial="hidden" animate="visible"
                          className="relative bg-white/[0.08] border border-white/10 rounded-[1.4rem] p-3">
                          <span className="absolute -top-1.5 left-5 h-3 w-3 rotate-45 bg-[#24172f] border-l border-t border-white/10" />
                          <p className="text-slate-500 text-xs">Legenda {i + 1}</p>
                          <p className="text-white font-medium">{s.text}</p>
                        </motion.div>
                      )
                    ))}
                  </motion.div>
                )}
                {!isJuiz && !g.mySubmission && !room.revealed && !imSittingOut && (
                  <div className="space-y-2">
                    {canPickFromHand && (
                      <>
                        <p className="text-slate-400 text-sm">
                          {canSwapLegendas
                            ? 'Escolhe uma para jogar, ou até 3 para trocar (−1 pt)'
                            : 'Escolhe uma legenda:'}
                        </p>
                        {hand.map((leg) => (
                          <button key={leg} type="button" onClick={() => toggleLegenda(leg)}
                            className={`relative w-full text-left rounded-[1.35rem] p-3 min-h-[48px] text-sm ${pickedLegendas.includes(leg) ? 'bg-pink-600 text-white ring-2 ring-pink-300/70' : 'bg-white/[0.06] text-slate-200 border border-white/10'}`}>
                            <span className="absolute -top-1.5 left-5 h-3 w-3 rotate-45 bg-inherit" />
                            {leg}
                          </button>
                        ))}
                        {canSwapLegendas && pickedLegendas.length > 0 && (
                          <button
                            type="button"
                            onClick={swapLegendas}
                            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 py-3.5 min-h-[48px] text-white font-bold"
                          >
                            <RefreshCw className="h-4 w-4" /> {swapLabel}
                          </button>
                        )}
                      </>
                    )}
                    {canType && (
                      <>
                        <p className="text-slate-400 text-sm">Escreve a tua legenda:</p>
                        <textarea value={typedLegenda} maxLength={200} rows={2}
                          onChange={(e) => { setTypedLegenda(e.target.value); if (e.target.value) setPickedLegendas([]) }}
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
                  <p className="text-center text-slate-300 text-base font-bold">Legenda enviada — {pending}/{expected}</p>
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
                <p className="text-center text-slate-300 text-base font-bold">Juiz a escolher meme…</p>
                {canPickFromHand && (
                  <>
                    <p className="text-slate-400 text-sm">
                      {canSwapLegendas
                        ? 'As tuas legendas — escolhe uma, ou até 3 para trocar (−1 pt)'
                        : 'As tuas legendas — podes ir escolhendo:'}
                    </p>
                    {hand.map((leg) => (
                      <button key={leg} type="button" onClick={() => toggleLegenda(leg)}
                        className={`relative w-full text-left rounded-[1.35rem] p-3 min-h-[48px] text-sm ${pickedLegendas.includes(leg) ? 'bg-pink-600/80 text-white ring-1 ring-pink-400/50' : 'bg-white/[0.06] text-slate-200 border border-white/10'}`}>
                        <span className="absolute -top-1.5 left-5 h-3 w-3 rotate-45 bg-inherit" />
                        {leg}
                      </button>
                    ))}
                    {canSwapLegendas && pickedLegendas.length > 0 && (
                      <button
                        type="button"
                        onClick={swapLegendas}
                        className="w-full flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 py-3.5 min-h-[48px] text-white font-bold"
                      >
                        <RefreshCw className="h-4 w-4" /> {swapLabel}
                      </button>
                    )}
                  </>
                )}
                {canType && (
                  <>
                    <p className="text-slate-400 text-sm">Prepara a tua legenda:</p>
                    <textarea value={typedLegenda} maxLength={200} rows={2}
                      onChange={(e) => { setTypedLegenda(e.target.value); if (e.target.value) setPickedLegendas([]) }}
                      placeholder="A tua legenda…"
                      className="w-full bg-white/[0.05] border border-white/10 text-white rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-pink-500/50" />
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {isHost && room.status === 'playing' && (
          <button type="button" onClick={closeRoom} className="w-full flex items-center justify-center gap-2 rounded-2xl border border-red-500/25 bg-red-950/30 py-3.5 min-h-[48px] text-red-200 text-sm font-bold">
            <Trash2 className="w-4 h-4" /> Fechar sala
          </button>
        )}
    </PageShell>
  )
}
