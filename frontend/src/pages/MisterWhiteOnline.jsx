import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'
import NightShell, { NightTitle, NightCta } from '../components/layout/NightShell'
import ReconnectBanner from '../components/layout/ReconnectBanner'
import { io } from 'socket.io-client'
import { getGlobalSocket, setGlobalSocket, peekMwLobbyHandoff, clearMwLobbyHandoff } from '../utils/socketStore'
import { saveMwSession, loadMwSession, clearMwSession } from '../utils/mwSession'
import { confirmHostRestart } from '../utils/confirmHost'
import { isExpiredRoomMessage } from '../utils/reconnectUi'
import { getSocketUrl } from '../utils/api'
import { socketIoOptions } from '../utils/socketOptions'
import { MW_COLORS, roleLabel } from '../utils/misterWhiteShared'

const API_URL = getSocketUrl()
const GOLD = '#fbbf24'

export default function MisterWhiteOnline() {
  const navigate = useNavigate()
  const [room, setRoom] = useState(null)
  const [playerName, setPlayerName] = useState('')
  const [isHost, setIsHost] = useState(false)
  const [socket, setSocket] = useState(null)
  const [myRole, setMyRole] = useState(null)
  const [showRole, setShowRole] = useState(false)
  const [revealedReady, setRevealedReady] = useState(false)
  const [timeLeft, setTimeLeft] = useState(90)
  const [voteTarget, setVoteTarget] = useState(null)
  const [myVote, setMyVote] = useState(null)
  const [mwGuess, setMwGuess] = useState('')
  const [reconnecting, setReconnecting] = useState(false)
  const [disconnected, setDisconnected] = useState(false)
  const [expired, setExpired] = useState(false)
  const playerNameRef = useRef('')

  const bindGameSocket = (s) => {
    s.off('mw_your_role')
    s.off('mw_reveal_progress')
    s.off('mw_phase')
    s.off('mw_vote_update')
    s.off('mw_room_updated')
    s.off('mw_guess_prompt')
    s.off('mw_rejoined')
    s.off('error')
    s.off('disconnect')
    s.off('connect')

    s.on('disconnect', () => {
      setDisconnected(true)
      setReconnecting(true)
    })
    s.on('connect', () => {
      setDisconnected(false)
      setReconnecting(false)
      const saved = loadMwSession()
      if (saved?.code && playerNameRef.current) {
        s.emit('mw_rejoin_room', { code: saved.code, playerName: playerNameRef.current, playerToken: saved.playerToken })
      }
    })

    s.on('mw_rejoined', ({ room: r, playerName: pn, isHost: ih, playerToken }) => {
      setRoom(r)
      setPlayerName(pn)
      setIsHost(ih)
      saveMwSession({ code: r.code, playerName: pn, isHost: ih, playerToken })
      setReconnecting(false)
      setDisconnected(false)
      setRevealedReady(r.status !== 'reveal')
    })
    s.on('mw_your_role', (data) => setMyRole(data))
    s.on('mw_reveal_progress', ({ ready, total }) => {
      setRoom((r) => r ? { ...r, revealReady: ready, revealTotal: total } : r)
    })
    s.on('mw_phase', (r) => {
      setRoom(r)
      const nowHost = r.host === playerNameRef.current
      setIsHost(nowHost)
      const saved = loadMwSession()
      if (saved) saveMwSession({ ...saved, isHost: nowHost })
      setTimeLeft(r.timeLeft ?? r.settings?.discussionSeconds ?? 90)
      setVoteTarget(null)
      if (r.status === 'vote') setMyVote(null)
      if (r.status === 'playing') setRevealedReady(true)
    })
    s.on('mw_vote_update', (r) => {
      setRoom(r)
      if ((r.votesCast ?? 0) === 0) {
        setMyVote(null)
        setVoteTarget(null)
      }
    })
    s.on('error', (msg) => {
      if (isExpiredRoomMessage(msg)) {
        setExpired(true)
        setDisconnected(true)
        setReconnecting(false)
        clearMwSession()
        return
      }
      if (msg) window.alert(String(msg))
    })
    s.on('mw_room_updated', (r) => {
      const nowHost = r.host === playerNameRef.current
      setIsHost(nowHost)
      if (r.status === 'waiting') {
        const saved = loadMwSession()
        saveMwSession({
          code: r.code,
          playerName: playerNameRef.current || saved?.playerName,
          isHost: nowHost,
        })
        navigate('/MisterWhiteLobby', { replace: true, state: { returnToLobby: true } })
      } else {
        setRoom(r)
      }
    })
    s.on('mw_guess_prompt', () => setMwGuess(''))
  }

  useEffect(() => {
    let cancelled = false
    let s = null

    const handoff = peekMwLobbyHandoff()
    const saved = loadMwSession()
    const pn = handoff?.playerName || saved?.playerName || ''
    const ih = handoff?.isHost ?? saved?.isHost ?? false
    const code = handoff?.room?.code || saved?.code

    if (!code || !pn) {
      navigate('/MisterWhiteLobby', { replace: true })
      return
    }

    setPlayerName(pn)
    playerNameRef.current = pn
    setIsHost(ih)
    if (handoff?.room) {
      setRoom(handoff.room)
      if (handoff.myRole) setMyRole(handoff.myRole)
      setTimeLeft(handoff.room.timeLeft ?? handoff.room.settings?.discussionSeconds ?? 90)
      if (handoff.room.status === 'playing') setRevealedReady(true)
    }
    saveMwSession({ code, playerName: pn, isHost: ih })
    setTimeout(() => clearMwLobbyHandoff(), 0)

    const setup = (sock) => {
      if (cancelled) return
      s = sock
      setSocket(sock)
      setGlobalSocket(sock)
      bindGameSocket(sock)
      sock.emit('mw_rejoin_room', { code, playerName: pn, playerToken: saved?.playerToken || handoff?.playerToken })
    }

    const existing = getGlobalSocket()
    if (existing?.connected) {
      setup(existing)
    } else {
      setReconnecting(true)
      s = io(API_URL, socketIoOptions())
      setGlobalSocket(s)
      s.once('connect', () => setup(s))
      s.on('connect_error', () => setReconnecting(true))
    }

    return () => {
      cancelled = true
      s?.off('disconnect')
      s?.off('connect')
      s?.off('mw_your_role')
      s?.off('mw_reveal_progress')
      s?.off('mw_phase')
      s?.off('mw_vote_update')
      s?.off('mw_room_updated')
      s?.off('mw_guess_prompt')
      s?.off('mw_rejoined')
    }
  }, [navigate])

  useEffect(() => {
    if (!room || room.status !== 'playing' || timeLeft <= 0) return
    const t = setTimeout(() => setTimeLeft((x) => Math.max(0, x - 1)), 1000)
    return () => clearTimeout(t)
  }, [room?.status, timeLeft, room])

  const disconnectedNames = new Set((room?.players || []).filter((p) => p.disconnected).map((p) => p.name))
  const activeRoles = (room?.rolesPublic || []).filter((r) => (
    !r.eliminated
    && !room.eliminated?.includes(r.origIdx)
    && !disconnectedNames.has(r.name)
  ))
  const myOrigIdx = room?.rolesPublic?.find((r) => r.name === playerName)?.origIdx
  const amEliminated = myOrigIdx != null && room.eliminated?.includes(myOrigIdx)
  const voteCounts = room?.voteCounts || {}

  const confirmReveal = () => {
    if (!socket || !room || revealedReady) return
    socket.emit('mw_reveal_ready', { code: room.code })
    setRevealedReady(true)
  }

  const startVote = () => {
    if (!socket || !room || !isHost) return
    socket.emit('mw_start_vote', { code: room.code })
  }

  const castVote = () => {
    if (!socket || !room || voteTarget == null || myVote != null) return
    socket.emit('mw_cast_vote', { code: room.code, targetOrigIdx: voteTarget })
    setMyVote(voteTarget)
  }

  const submitGuess = () => {
    if (!socket || !room || !mwGuess.trim()) return
    socket.emit('mw_guess', { code: room.code, guess: mwGuess.trim() })
  }

  const restart = () => {
    if (!socket || !room || !isHost) return
    if (!confirmHostRestart('Voltar ao lobby e começar outra partida?')) return
    socket.emit('mw_restart', { code: room.code })
    navigate('/MisterWhiteLobby', { replace: true, state: { returnToLobby: true } })
  }

  if (!room) {
    return (
      <NightShell onBack={() => navigate('/MisterWhite')}>
        <div className="flex flex-col items-center gap-3 pt-16">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#fbbf24] border-t-transparent" />
          {reconnecting && <p className="text-sm text-slate-500">A reconectar…</p>}
        </div>
      </NightShell>
    )
  }

  const status = room.status
  const isMwGuesser = status === 'mw_guess' && room.mwGuessIdx != null
    && room.rolesPublic?.[room.mwGuessIdx]?.name === playerName

  const footer = status === 'reveal' && showRole && !revealedReady ? (
    <NightCta accent={GOLD} onClick={confirmReveal}>Pronto — vi o meu papel</NightCta>
  ) : status === 'playing' && isHost ? (
    <NightCta accent="#ff4d7a" onClick={startVote}>Iniciar votação</NightCta>
  ) : status === 'vote' && !amEliminated && myVote == null && voteTarget != null ? (
    <NightCta accent="#ff4d7a" onClick={castVote}>
      Votar em {activeRoles.find((r) => r.origIdx === voteTarget)?.name}
    </NightCta>
  ) : status === 'mw_guess' && isMwGuesser ? (
    <NightCta accent={GOLD} onClick={submitGuess} disabled={!mwGuess.trim()}>Revelar</NightCta>
  ) : status === 'result' ? (
    isHost ? (
      <NightCta accent={GOLD} onClick={restart}>Nova sala</NightCta>
    ) : (
      <NightCta accent={GOLD} onClick={() => navigate('/MisterWhite')}>Início</NightCta>
    )
  ) : null

  return (
    <NightShell wide onBack={() => navigate('/MisterWhite')} footer={footer}>
        <ReconnectBanner
          reconnecting={reconnecting && !disconnected && !expired}
          disconnected={disconnected && !expired}
          expired={expired}
          onRetry={() => socket?.connect()}
          onLeave={() => { clearMwSession(); navigate('/', { replace: true }) }}
        />
        <NightTitle>Sala {room.code}</NightTitle>
        {status !== 'reveal' && status !== 'waiting' && (
          <p className="mt-1.5 text-center text-[13px] text-white/45">Ronda {room.roundNum} · {playerName}</p>
        )}

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {(room.players || []).map((p) => (
            <span
              key={p.id || p.name}
              className={`text-xs px-2 py-1 rounded-lg ${p.disconnected ? 'opacity-40 line-through' : ''} ${p.name === playerName ? 'bg-violet-600/30 text-violet-200' : 'bg-white/[0.05] text-slate-400'}`}
            >
              {p.name}
            </span>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {status === 'reveal' && (
            <motion.div key="reveal" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center space-y-5">
              <p className="text-slate-400 text-sm">Vê o teu papel — só tu vês isto no teu telemóvel</p>
              {!showRole ? (
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setShowRole(true)}
                  className="group relative flex h-48 w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-[2rem] border border-white/10 bg-[#1c1c21] text-slate-300"
                >
                  <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#fbbf24]/70 to-transparent" />
                  <div className="grid h-16 w-16 place-items-center rounded-3xl border border-white/10 bg-[#141419]">
                    <EyeOff className="h-8 w-8 text-[#fbbf24]" />
                  </div>
                  <span className="font-black text-white">Toca para revelar</span>
                  <span className="text-xs text-slate-500">Mantém o ecrã virado só para ti</span>
                </motion.button>
              ) : myRole && (
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className={`relative w-full overflow-hidden rounded-[2rem] p-7 border shadow-2xl ${myRole.role === 'civil' ? 'bg-green-900/25 border-green-500/30' : myRole.role === 'undercover' ? 'bg-blue-900/25 border-blue-500/30' : 'bg-red-900/25 border-red-500/30'}`}>
                  <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
                  <p className="text-slate-300 text-sm">{roleLabel(myRole.role)}</p>
                  <p className="text-white font-black text-3xl mt-2">{myRole.word || 'Sem palavra'}</p>
                  {myRole.role === 'undercover' && <p className="text-blue-300 text-xs mt-2">Palavra parecida, mas diferente!</p>}
                  {myRole.role === 'mister_white' && <p className="text-red-300 text-xs mt-2">Descobre a palavra civil!</p>}
                </motion.div>
              )}
              {revealedReady && (
                <p className="text-slate-500 text-sm animate-pulse">
                  À espera dos outros ({room.revealReady}/{room.revealTotal})…
                </p>
              )}
            </motion.div>
          )}

          {status === 'playing' && (
            <motion.div key="playing" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 text-center">
                <p className="text-slate-300 text-sm">Cada um dá uma pista sobre a sua palavra</p>
                <p className={`font-black text-3xl mt-2 ${timeLeft === 0 ? 'text-red-300' : 'text-white'}`}>
                  {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                </p>
              </div>
              <div className="space-y-2">
                {activeRoles.map((r) => (
                  <div key={r.origIdx} className={`bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center gap-3 ${disconnectedNames.has(r.name) ? 'opacity-40' : ''}`}>
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${MW_COLORS[r.colorIdx % MW_COLORS.length]} flex items-center justify-center text-white text-sm font-black`}>
                      {r.name[0]}
                    </div>
                    <span className={`text-white font-medium ${disconnectedNames.has(r.name) ? 'line-through' : ''}`}>{r.name}</span>
                    <Eye className="text-slate-700 w-4 h-4 ml-auto" />
                  </div>
                ))}
              </div>
              {!isHost && <p className="text-center text-sm text-white/45">O host inicia a votação quando estiverem prontos</p>}
            </motion.div>
          )}

          {status === 'vote' && !amEliminated && (
            <motion.div key="vote" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="text-center space-y-1">
                <p className="text-white font-bold">Vota em quem eliminar</p>
                <p className="text-slate-500 text-sm">
                  {myVote != null
                    ? `Voto registado · ${room.votesCast ?? 0}/${room.votesNeeded ?? activeRoles.length}`
                    : 'Quem tiver mais votos é eliminado'}
                </p>
              </div>
              <div className="space-y-2">
                {activeRoles.map((r) => {
                  const isMe = r.origIdx === myOrigIdx
                  const count = voteCounts[r.origIdx] || 0
                  return (
                    <button
                      key={r.origIdx}
                      type="button"
                      disabled={myVote != null || isMe}
                      onClick={() => setVoteTarget(r.origIdx)}
                      className={`w-full px-4 py-3 rounded-xl border flex items-center gap-3 text-left disabled:opacity-60 ${
                        voteTarget === r.origIdx && myVote == null
                          ? 'bg-red-900/25 border-red-500/50'
                          : myVote === r.origIdx
                            ? 'bg-green-900/20 border-green-500/40'
                            : 'bg-white/[0.04] border-white/[0.07]'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${MW_COLORS[r.colorIdx % MW_COLORS.length]} flex items-center justify-center text-white text-sm font-black`}>
                        {r.name[0]}
                      </div>
                      <span className="text-white font-medium flex-1">
                        {r.name}{isMe ? ' (tu)' : ''}
                      </span>
                      {count > 0 && (
                        <span className="text-xs font-bold text-red-300 bg-red-900/30 px-2 py-0.5 rounded-full">
                          {count} {count === 1 ? 'voto' : 'votos'}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              {myVote != null && (room.votesCast ?? 0) < (room.votesNeeded ?? activeRoles.length) && (
                <p className="text-center text-slate-500 text-sm animate-pulse">
                  À espera dos outros votos ({room.votesCast}/{room.votesNeeded})…
                </p>
              )}
            </motion.div>
          )}

          {status === 'vote' && amEliminated && (
            <motion.div key="vote-obs" className="text-center py-12 space-y-3">
              <p className="text-slate-400">Foste eliminado — a observar a votação</p>
              <div className="space-y-2">
                {activeRoles.map((r) => {
                  const count = voteCounts[r.origIdx] || 0
                  return (
                    <div key={r.origIdx} className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center gap-3">
                      <span className="text-white font-medium flex-1">{r.name}</span>
                      {count > 0 && (
                        <span className="text-xs font-bold text-red-300">{count} {count === 1 ? 'voto' : 'votos'}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {status === 'mw_guess' && isMwGuesser && (
            <motion.div key="mwguess" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-5">
              <div className="text-5xl">👁️</div>
              <h3 className="text-white font-black text-xl">Foste apanhado!</h3>
              <p className="text-slate-400 text-sm">Adivinha a palavra civil para vencer</p>
              <input value={mwGuess} onChange={(e) => setMwGuess(e.target.value)} placeholder="A palavra civil é…"
                className="w-full bg-white/[0.05] text-white text-center text-lg font-bold rounded-2xl px-4 py-4 outline-none border border-white/[0.08]"
                onKeyDown={(e) => e.key === 'Enter' && mwGuess.trim() && submitGuess()} />
            </motion.div>
          )}

          {status === 'mw_guess' && !isMwGuesser && (
            <motion.div key="mw-wait" className="text-center py-12 space-y-2">
              <p className="text-white font-bold">Mister White foi eliminado!</p>
              <p className="text-slate-500 text-sm animate-pulse">À espera do palpite…</p>
            </motion.div>
          )}

          {status === 'result' && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-5">
              <div className="text-6xl">
                {room.gameResult === 'civils_win' ? '✅' : room.gameResult === 'mw_wins' ? '🕵️' : '🔵'}
              </div>
              <h2 className="text-white font-black text-2xl">
                {room.gameResult === 'civils_win' ? 'Os Civis venceram!' : room.gameResult === 'mw_wins' ? 'Mister White venceu!' : 'Infiltrados venceram!'}
              </h2>
              <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 text-left text-sm space-y-1">
                <p className="text-slate-400 mb-2">
                  Civil: <span className="text-green-400 font-bold">{room.civilWord}</span>
                  {' · '}
                  Undercover: <span className="text-blue-400 font-bold">{room.undercoverWord}</span>
                </p>
                {(room.rolesPublic || []).map((r) => (
                  <div key={r.origIdx} className="flex items-center gap-2 py-1 border-b border-white/[0.05] last:border-0">
                    <span className="text-white flex-1">{r.name}</span>
                    <span className="text-xs text-slate-500">{roleLabel(r.role)}</span>
                    <span className="text-xs text-slate-600">{r.word || '—'}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
    </NightShell>
  )
}
