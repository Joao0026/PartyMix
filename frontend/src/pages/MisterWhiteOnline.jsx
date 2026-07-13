import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'
import BackButton from '../components/layout/BackButton'
import PageShell from '../components/layout/PageShell'
import ReconnectBanner from '../components/layout/ReconnectBanner'
import { io } from 'socket.io-client'
import { getGlobalSocket, setGlobalSocket, peekMwLobbyHandoff, clearMwLobbyHandoff } from '../utils/socketStore'
import { saveMwSession, loadMwSession } from '../utils/mwSession'
import { getSocketUrl } from '../utils/api'
import { MW_COLORS, roleLabel } from '../utils/misterWhiteShared'

const API_URL = getSocketUrl()

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
  const playerNameRef = useRef('')

  const bindGameSocket = (s) => {
    s.off('mw_your_role')
    s.off('mw_reveal_progress')
    s.off('mw_phase')
    s.off('mw_vote_update')
    s.off('mw_room_updated')
    s.off('mw_guess_prompt')
    s.off('mw_rejoined')
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
        s.emit('mw_rejoin_room', { code: saved.code, playerName: playerNameRef.current })
      }
    })

    s.on('mw_rejoined', ({ room: r, playerName: pn, isHost: ih }) => {
      setRoom(r)
      setPlayerName(pn)
      setIsHost(ih)
      saveMwSession({ code: r.code, playerName: pn, isHost: ih })
      setReconnecting(false)
      setDisconnected(false)
      if (r.status === 'playing') setRevealedReady(true)
    })
    s.on('mw_your_role', (data) => setMyRole(data))
    s.on('mw_reveal_progress', ({ ready, total }) => {
      setRoom((r) => r ? { ...r, revealReady: ready, revealTotal: total } : r)
    })
    s.on('mw_phase', (r) => {
      setRoom(r)
      setTimeLeft(r.timeLeft ?? r.settings?.discussionSeconds ?? 90)
      setVoteTarget(null)
      if (r.status === 'vote') setMyVote(null)
      if (r.status === 'playing') setRevealedReady(true)
    })
    s.on('mw_vote_update', (r) => setRoom(r))
    s.on('mw_room_updated', (r) => {
      if (r.status === 'waiting') {
        const saved = loadMwSession()
        saveMwSession({
          code: r.code,
          playerName: playerNameRef.current || saved?.playerName,
          isHost: saved?.isHost,
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
      sock.emit('mw_rejoin_room', { code, playerName: pn })
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

  const activeRoles = (room?.rolesPublic || []).filter((r) => !r.eliminated && !room.eliminated?.includes(r.origIdx))
  const myOrigIdx = room?.rolesPublic?.find((r) => r.name === playerName)?.origIdx
  const amEliminated = myOrigIdx != null && room.eliminated?.includes(myOrigIdx)
  const voteCounts = room?.voteCounts || {}
  const disconnectedNames = new Set((room?.players || []).filter((p) => p.disconnected).map((p) => p.name))

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
    socket.emit('mw_restart', { code: room.code })
    navigate('/MisterWhiteLobby', { replace: true, state: { returnToLobby: true } })
  }

  if (!room) {
    return (
      <PageShell mode="misterwhite" className="justify-center" innerClassName="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
        {reconnecting && (
          <p className="text-slate-500 text-sm">A reconectar…</p>
        )}
      </PageShell>
    )
  }

  const status = room.status
  const isMwGuesser = status === 'mw_guess' && room.mwGuessIdx != null
    && room.rolesPublic?.[room.mwGuessIdx]?.name === playerName
  const mysteryBackground = {
    background: 'radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.20) 0%, #111827 45%, #050711 100%)',
  }

  return (
    <PageShell mode="misterwhite" innerClassName="space-y-0 w-full" style={mysteryBackground}>
      <div className="w-full max-w-lg">
        <ReconnectBanner
          reconnecting={reconnecting && !disconnected}
          disconnected={disconnected}
          onRetry={() => socket?.connect()}
        />
        <div className="flex items-center gap-3 mb-6">
          <BackButton onClick={() => navigate('/MisterWhite')} />
          <div>
            <h1 className="text-white font-bold text-xl">👁️ Sala {room.code}</h1>
            {status !== 'reveal' && status !== 'waiting' && (
              <p className="text-slate-500 text-xs">Ronda {room.roundNum} · {playerName}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
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
                  className="group relative w-full h-48 overflow-hidden rounded-[2rem] border border-violet-300/20 bg-gradient-to-br from-slate-950 via-violet-950/50 to-black shadow-2xl flex flex-col items-center justify-center gap-3 text-slate-300"
                >
                  <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/70 to-transparent" />
                  <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-500/20 blur-2xl transition group-active:scale-125" />
                  <div className="grid h-16 w-16 place-items-center rounded-3xl border border-white/10 bg-white/[0.06]">
                    <EyeOff className="w-8 h-8 text-violet-200" />
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
              {showRole && !revealedReady && (
                <div className="sticky-cta !bg-gradient-to-t !from-[#080b14] !via-[#080b14]/95 !to-transparent">
                  <button onClick={confirmReveal} className="w-full bg-gradient-to-r from-violet-600 to-slate-700 text-white font-bold rounded-2xl py-4">
                    Pronto — vi o meu papel ✓
                  </button>
                </div>
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
              {isHost && (
                <button onClick={startVote} className="w-full bg-gradient-to-r from-red-600 to-rose-700 text-white font-bold rounded-2xl py-4">
                  🗳️ Iniciar votação
                </button>
              )}
              {!isHost && <p className="text-center text-slate-600 text-sm">O host inicia a votação quando estiverem prontos</p>}
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
              {myVote == null && voteTarget != null && (
                <div className="sticky-cta !bg-gradient-to-t !from-[#080b14] !via-[#080b14]/95 !to-transparent">
                  <button onClick={castVote} className="w-full bg-gradient-to-r from-red-600 to-rose-700 text-white font-black rounded-2xl py-4">
                    Votar em {activeRoles.find((r) => r.origIdx === voteTarget)?.name} 🗳️
                  </button>
                </div>
              )}
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
              <div className="sticky-cta !bg-gradient-to-t !from-[#080b14] !via-[#080b14]/95 !to-transparent">
                <button onClick={submitGuess} disabled={!mwGuess.trim()}
                  className="w-full bg-gradient-to-r from-violet-600 to-slate-700 text-white font-bold rounded-2xl py-4 disabled:opacity-40">
                  Revelar 🎭
                </button>
              </div>
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
              {isHost ? (
                <button onClick={restart} className="w-full bg-violet-600 text-white font-bold rounded-2xl py-3">Nova sala</button>
              ) : (
                <button onClick={() => navigate('/MisterWhite')} className="w-full bg-white/[0.07] text-white rounded-2xl py-3">Início</button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageShell>
  )
}
