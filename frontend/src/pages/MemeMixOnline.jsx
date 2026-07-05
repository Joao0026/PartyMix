import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Trash2, WifiOff } from 'lucide-react'
import { io } from 'socket.io-client'
import { getGlobalSocket, setGlobalSocket, clearMmLobbyHandoff, peekMmLobbyHandoff } from '../utils/socketStore'
import { saveMmSession, loadMmSession, clearMmSession, patchMmSession } from '../utils/mmSession'
import { memeUrlWithToken } from '../utils/mememixImage'
import { getSocketUrl } from '../utils/api'

const API_URL = getSocketUrl()

function fullMemeUrl(path, token) {
  if (!path) return ''
  if (path.startsWith('http')) return memeUrlWithToken(path, token)
  const base = getSocketUrl().replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return memeUrlWithToken(`${base}${p}`, token)
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
  const [reconnecting, setReconnecting] = useState(false)
  const initRef = useRef(false)
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

    s.on('mm_state', (state) => setGame(state))
    s.on('mm_round_update', (r) => { setRoom(r); setGame((g) => ({ ...g, ...r, pendingSubmissions: r.submissions })) })
    s.on('mm_reveal_submissions', (r) => setRoom(r))
    s.on('mm_next_round', (r) => { setRoom(r); setPickedLegenda(null) })
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
      s.emit('mm_request_state', { code: r.code })
    })
  }

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

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
    if (handoff?.room) setRoom(handoff.room)
    saveMmSession({ code, playerName: pn, uploadToken: tok, isHost: ih })
    setTimeout(() => clearMmLobbyHandoff(), 0)

    let s = getGlobalSocket()
    const setup = (sock) => {
      setSocket(sock)
      setGlobalSocket(sock)
      bindGameSocket(sock)
      sock.emit('mm_rejoin_room', { code, playerName: pn, uploadToken: tok })
    }

    if (s?.connected) {
      setup(s)
    } else {
      setReconnecting(true)
      s = io(API_URL, { transports: ['websocket', 'polling'] })
      s.once('connect', () => setup(s))
      s.on('connect_error', () => setReconnecting(true))
    }

    return () => {
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
    if (!socket || !room || !pickedLegenda) return
    socket.emit('mm_submit_legenda', { code: room.code, text: pickedLegenda })
    setPickedLegenda(null)
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
      <div className="min-h-screen bg-[#080b14] flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
        {reconnecting && (
          <p className="text-slate-500 text-sm flex items-center gap-2">
            <WifiOff className="w-4 h-4" /> A reconectar…
          </p>
        )}
      </div>
    )
  }

  const g = game || {}
  const isJuiz = g.isJuiz
  const hand = g.hand || []
  const memeHand = g.memeHand || []
  const currentMeme = room.currentMeme
  const submissions = g.submissionsPublic || []
  const scores = room.players || []
  const pending = g.pendingSubmissions ?? room.submissions ?? 0
  const expected = room.submissionsExpected ?? Math.max(0, scores.filter((p) => !p.disconnected).length - 1)

  return (
    <div className="min-h-screen bg-[#080b14] flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-lg space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate('/MemeMix')} className="text-slate-400 p-1">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-white font-bold">😂 {room.code}</h1>
              <p className="text-slate-500 text-xs">
                Ronda {room.round} · Juiz: {room.juizName} · Meta: {room.settings?.maxPoints} pts
              </p>
            </div>
          </div>
          {reconnecting && <WifiOff className="w-4 h-4 text-amber-400 animate-pulse" />}
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
            {currentMeme ? (
              <motion.div key={`round-${room.round}-${currentMeme.id}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="rounded-2xl overflow-hidden bg-black/30 border border-white/10">
                  <img src={fullMemeUrl(currentMeme.url, uploadToken)} alt="Meme" className="w-full max-h-72 object-contain mx-auto" />
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
                          className="w-full text-left bg-white/[0.06] hover:bg-pink-600/25 border border-white/10 rounded-xl p-4">
                          <p className="text-slate-400 text-xs">{s.playerName}</p>
                          <p className="text-white font-medium">{s.text}</p>
                        </motion.button>
                      ) : (
                        <motion.div key={s.playerId} custom={i} variants={cardVariants} initial="hidden" animate="visible"
                          className="bg-white/[0.04] rounded-xl p-3">
                          <p className="text-slate-500 text-xs">{s.playerName}</p>
                          <p className="text-white">{s.text}</p>
                        </motion.div>
                      )
                    ))}
                  </motion.div>
                )}
                {!isJuiz && !g.mySubmission && !room.revealed && (
                  <div className="space-y-2">
                    <p className="text-slate-400 text-sm">Escolhe uma legenda:</p>
                    {hand.map((leg) => (
                      <button key={leg} type="button" onClick={() => setPickedLegenda(leg)}
                        className={`w-full text-left rounded-xl p-3 text-sm ${pickedLegenda === leg ? 'bg-pink-600 text-white' : 'bg-white/[0.05] text-slate-200'}`}>
                        {leg}
                      </button>
                    ))}
                    <button type="button" disabled={!pickedLegenda} onClick={submitLegenda}
                      className="w-full bg-pink-600 text-white rounded-xl py-3 font-bold disabled:opacity-40">
                      Jogar legenda
                    </button>
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
                    className="w-full rounded-xl overflow-hidden border border-white/10">
                    <img src={fullMemeUrl(m.url, uploadToken)} alt="" className="w-full h-32 object-cover" />
                  </button>
                ))}
              </motion.div>
            ) : (
              <p className="text-center text-slate-500 animate-pulse">Juiz a escolher meme…</p>
            )}
          </AnimatePresence>
        )}

        {isHost && room.status === 'playing' && (
          <button type="button" onClick={closeRoom} className="w-full flex items-center justify-center gap-2 text-red-400/80 text-xs py-2">
            <Trash2 className="w-3 h-3" /> Fechar sala
          </button>
        )}
      </div>
    </div>
  )
}
