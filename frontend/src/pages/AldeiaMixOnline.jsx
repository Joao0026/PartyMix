import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, EyeOff, ChevronRight, Trash2, WifiOff } from 'lucide-react'
import { io } from 'socket.io-client'
import { getGlobalSocket, setGlobalSocket, peekAmLobbyHandoff, clearAmLobbyHandoff } from '../utils/socketStore'
import { saveAmSession, loadAmSession, clearAmSession, patchAmSession } from '../utils/amSession'
import { getSocketUrl } from '../utils/api'
import {
  roleLabel,
  ROLE_STYLES,
  gameResultLabel,
  playerStatusMessage,
  stepScript,
} from '../utils/aldeiaMixShared'

const API_URL = getSocketUrl()

function DayTimer({ secondsLeft }) {
  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  return (
    <div className="text-center">
      <p className="text-amber-400 font-black text-3xl tabular-nums">
        {mins}:{secs.toString().padStart(2, '0')}
      </p>
      <p className="text-slate-500 text-xs">Tempo de discussão + votação</p>
    </div>
  )
}

function VotePanel({ room, playerName, socket, amEliminated, amJuiz }) {
  const alive = (room.rolesPublic || []).filter((r) => !r.eliminated && !r.isNarrator)
  const myIdx = room.rolesPublic?.find((r) => r.name === playerName && !r.isNarrator)?.origIdx
  const myVote = room.myVote
  const closed = room.votingClosed

  if (amJuiz) {
    return (
      <p className="text-slate-500 text-sm text-center py-4">
        Estás a moderar — a votação é nos telemóveis dos jogadores.
      </p>
    )
  }

  if (amEliminated || closed) {
    return (
      <div className="space-y-2">
        {room.voteTally?.length > 0 && (
          <>
            <p className="text-white text-sm font-semibold text-center">Resultado da votação</p>
            {room.voteTally.map((t) => (
              <div key={t.origIdx} className="flex justify-between bg-white/[0.04] rounded-xl px-4 py-2 text-sm">
                <span className="text-slate-300">{t.name}</span>
                <span className="text-amber-400 font-bold">{t.votes} voto{t.votes !== 1 ? 's' : ''}</span>
              </div>
            ))}
          </>
        )}
        {room.lastVoteEliminatedName && (
          <p className="text-red-300 text-center text-sm font-semibold">
            Eliminado: {room.lastVoteEliminatedName}
          </p>
        )}
        {!room.lastVoteEliminatedName && closed && room.lastVoteTie && (
          <p className="text-amber-300 text-center text-sm font-semibold">
            Empate — ninguém eliminado. Próxima noite.
          </p>
        )}
        {!room.lastVoteEliminatedName && closed && !room.lastVoteTie && (
          <p className="text-slate-500 text-center text-sm">Ninguém foi eliminado</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-white text-sm font-semibold text-center">Quem achas que é o lobo?</p>
      <p className="text-slate-500 text-xs text-center">
        Votos: {room.votesCast}/{room.votesExpected}
      </p>
      {myVote != null && (
        <p className="text-emerald-400 text-xs text-center">
          Votaste em {room.rolesPublic?.[myVote]?.name}
        </p>
      )}
      {alive.filter((r) => r.origIdx !== myIdx).map((r) => (
        <button
          key={r.origIdx}
          type="button"
          disabled={myVote != null}
          onClick={() => socket?.emit('am_cast_vote', { code: room.code, targetOrigIdx: r.origIdx })}
          className={`w-full py-3 rounded-xl font-medium ${
            myVote === r.origIdx
              ? 'bg-red-600 text-white ring-2 ring-red-300'
              : 'bg-white/[0.06] text-slate-200 disabled:opacity-50'
          }`}
        >
          {r.name}
        </button>
      ))}
    </div>
  )
}

function NarratorPanel({ room, socket, narr, onPick, timerLeft }) {
  const alive = (room.rolesPublic || []).filter((r) => !r.eliminated && !r.isNarrator)
  const step = room.nightStep
  const script = room.nightScript || stepScript(step)

  const pickField =
    step === 'wolves' ? 'wolfTarget'
      : step === 'medic' ? 'medicTarget'
        : step === 'sheriff' ? 'sheriffTarget'
          : null

  const selected =
    pickField === 'wolfTarget' ? narr?.wolfTarget
      : pickField === 'medicTarget' ? narr?.medicTarget
        : pickField === 'sheriffTarget' ? narr?.sheriffTarget
          : null

  if (room.status === 'night') {
    return (
      <div className="space-y-4">
        <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-2xl p-4">
          <p className="text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2">Narrador — lê em voz alta</p>
          <p className="text-white text-lg leading-snug">{script}</p>
        </div>
        {pickField && (
          <div className="space-y-2">
            {alive.map((r) => (
              <button key={r.origIdx} type="button" onClick={() => onPick(pickField, r.origIdx)}
                className={`w-full py-3 px-4 rounded-xl text-left font-medium ${
                  selected === r.origIdx ? 'bg-indigo-600 text-white ring-2 ring-indigo-300' : 'bg-white/[0.06] text-slate-200'
                }`}>
                {r.name}
              </button>
            ))}
          </div>
        )}
        {step === 'sheriff' && narr?.sheriffTarget != null && narr?.sheriffIsWolf != null && (
          <div className={`rounded-xl p-4 text-center font-bold ${narr.sheriffIsWolf ? 'bg-red-900/40 text-red-200' : 'bg-green-900/40 text-green-200'}`}>
            {narr.sheriffIsWolf ? '🐺 É Lobo!' : '✓ Não é Lobo'}
          </div>
        )}
        {step === 'dawn' && room.lastNight && (
          <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4 text-center">
            <p className="text-amber-100">
              {room.lastNight.killed != null
                ? `${room.rolesPublic?.[room.lastNight.killed]?.name} morreu.`
                : 'Ninguém morreu esta noite.'}
            </p>
          </div>
        )}
        <button type="button" onClick={() => socket.emit('am_narrator_next', { code: room.code })}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold rounded-2xl py-4">
          {step === 'dawn' ? 'Aldeia acorda — ir para o Dia' : 'Seguinte'}
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    )
  }

  if (room.status === 'day') {
    return (
      <div className="space-y-4">
        <DayTimer secondsLeft={timerLeft} />
        <p className="text-amber-300 font-black text-xl text-center">☀️ Dia {room.dayNum}</p>
        <p className="text-slate-500 text-xs text-center">
          Votos: {room.votesCast}/{room.votesExpected}
          {room.votingClosed ? ' · Votação fechada' : ''}
        </p>
        {room.voteTally?.length > 0 && (
          <div className="space-y-1">
            {room.voteTally.map((t) => (
              <div key={t.origIdx} className="flex justify-between text-sm px-2">
                <span className="text-slate-400">{t.name}</span>
                <span className="text-amber-400">{t.votes}</span>
              </div>
            ))}
          </div>
        )}
        {room.lastVoteEliminatedName && (
          <p className="text-red-300 text-center text-sm">Eliminado: {room.lastVoteEliminatedName}</p>
        )}
        {!room.votingClosed && (
          <>
            <button type="button" onClick={() => socket.emit('am_close_voting', { code: room.code })}
              className="w-full bg-amber-700/50 text-amber-100 rounded-xl py-3 text-sm font-semibold">
              Fechar votação — eliminar o mais votado
            </button>
            <button type="button" onClick={() => socket.emit('am_skip_day', { code: room.code })}
              className="w-full bg-white/[0.06] border border-white/10 text-slate-300 rounded-xl py-3 text-sm font-semibold">
              ⏭️ Saltar dia — ninguém sai (próxima noite)
            </button>
          </>
        )}
        {room.votingClosed && (
          <button type="button" onClick={() => socket.emit('am_narrator_start_night', { code: room.code })}
            className="w-full bg-indigo-700 text-white font-bold rounded-2xl py-4">
            🌙 Próxima noite
          </button>
        )}
      </div>
    )
  }

  return null
}

export default function AldeiaMixOnline() {
  const navigate = useNavigate()
  const [room, setRoom] = useState(null)
  const [narr, setNarr] = useState(null)
  const [playerName, setPlayerName] = useState('')
  const [isHost, setIsHost] = useState(false)
  const [socket, setSocket] = useState(null)
  const [myRole, setMyRole] = useState(null)
  const [showRole, setShowRole] = useState(false)
  const [revealedReady, setRevealedReady] = useState(false)
  const [revealProgress, setRevealProgress] = useState({ ready: 0, total: 0 })
  const [dawnNews, setDawnNews] = useState(null)
  const [daySkippedNotice, setDaySkippedNotice] = useState(false)
  const [timerLeft, setTimerLeft] = useState(0)
  const [reconnecting, setReconnecting] = useState(false)
  const initRef = useRef(false)
  const playerNameRef = useRef('')

  const bindSocket = (s) => {
    s.off('am_your_role')
    s.off('am_game_started')
    s.off('am_phase')
    s.off('am_narrator_state')
    s.off('am_narrator_intel')
    s.off('am_dawn_news')
    s.off('am_reveal_progress')
    s.off('am_rejoined')
    s.off('am_session_ended')
    s.off('am_vote_progress')

    s.on('am_your_role', (data) => setMyRole(data))
    s.on('am_game_started', (r) => {
      setRoom(r)
      setRevealedReady(false)
      setShowRole(false)
      setDawnNews(null)
      setRevealProgress({ ready: 0, total: r.revealTotal || 0 })
    })
    s.on('am_phase', (r) => {
      setRoom((prev) => ({
        ...prev,
        ...r,
        myVote: r.myVote ?? prev?.myVote,
      }))
      if (r.discussionEndsAt) {
        setTimerLeft(Math.max(0, Math.ceil((r.discussionEndsAt - Date.now()) / 1000)))
      }
    })
    s.on('am_narrator_state', (state) => {
      setRoom(state)
      setNarr({
        wolfTarget: state.wolfTarget,
        medicTarget: state.medicTarget,
        sheriffTarget: state.sheriffTarget,
        sheriffIsWolf: state.sheriffIsWolf,
      })
      if (state.discussionEndsAt) {
        setTimerLeft(Math.max(0, Math.ceil((state.discussionEndsAt - Date.now()) / 1000)))
      }
    })
    s.on('am_narrator_intel', (intel) => {
      setNarr((prev) => ({ ...prev, sheriffTarget: intel.targetOrigIdx, sheriffIsWolf: intel.isWolf }))
    })
    s.on('am_dawn_news', (news) => {
      setDawnNews(news)
      setDaySkippedNotice(false)
      setRoom((prev) => (prev ? { ...prev, status: 'day', dayNum: news.dayNum, votingClosed: false } : prev))
    })
    s.on('am_day_skipped', ({ reason } = {}) => {
      setDawnNews(null)
      setDaySkippedNotice(reason === 'tie' ? 'tie' : 'skip')
    })
    s.on('am_reveal_progress', (p) => setRevealProgress(p))
    s.on('am_vote_progress', (p) => {
      setRoom((r) => r ? { ...r, votesCast: p.cast, votesExpected: p.total } : r)
    })
    s.on('am_rejoined', ({ room: r, playerName: pn, isHost: ih }) => {
      setRoom(r)
      setPlayerName(pn)
      playerNameRef.current = pn
      setIsHost(ih)
      patchAmSession({ isHost: ih })
      setReconnecting(false)
      s.emit('am_request_state', { code: r.code })
    })
    s.on('am_session_ended', () => {
      clearAmSession()
      navigate('/AldeiaMix', { replace: true })
    })
    s.on('error', (msg) => { if (msg) window.alert(String(msg)) })
  }

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    const handoff = peekAmLobbyHandoff()
    const saved = loadAmSession()
    const pn = handoff?.playerName || saved?.playerName || ''
    const ih = handoff?.isHost ?? saved?.isHost ?? false
    const code = handoff?.room?.code || saved?.code

    if (!code || !pn) {
      navigate('/AldeiaMixLobby', { replace: true })
      return
    }

    setPlayerName(pn)
    playerNameRef.current = pn
    setIsHost(ih)
    if (handoff?.room) setRoom(handoff.room)
    if (handoff?.myRole) setMyRole(handoff.myRole)
    saveAmSession({ code, playerName: pn, isHost: ih })
    setTimeout(() => clearAmLobbyHandoff(), 0)

    let s = getGlobalSocket()
    const setup = (sock) => {
      setSocket(sock)
      setGlobalSocket(sock)
      bindSocket(sock)
      sock.emit('am_rejoin_room', { code, playerName: pn })
    }

    if (s?.connected) {
      setup(s)
    } else {
      setReconnecting(true)
      s = io(API_URL, { transports: ['websocket', 'polling'] })
      s.once('connect', () => setup(s))
    }

    return () => {
      s?.off('am_your_role')
      s?.off('am_phase')
      s?.off('am_rejoined')
      s?.off('am_session_ended')
    }
  }, [navigate])

  useEffect(() => {
    if (room?.status !== 'day' || !room.discussionEndsAt) return
    const tick = () => {
      setTimerLeft(Math.max(0, Math.ceil((room.discussionEndsAt - Date.now()) / 1000)))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [room?.status, room?.discussionEndsAt, room?.dayNum])

  const amJuiz = room?.juizName === playerName
  const myOrigIdx = room?.rolesPublic?.find((r) => r.name === playerName && !r.isNarrator)?.origIdx
  const amEliminated = myOrigIdx != null && room?.eliminated?.includes(myOrigIdx)

  const confirmReveal = () => {
    if (!socket || !room || revealedReady) return
    socket.emit('am_reveal_ready', { code: room.code })
    setRevealedReady(true)
  }

  const playAgain = () => {
    if (!socket || !room) return
    socket.emit('am_play_again', { code: room.code })
    setRevealedReady(false)
    setShowRole(false)
    setDawnNews(null)
  }

  const closeRoom = () => {
    if (!socket || !room || !window.confirm('Fechar sala?')) return
    socket.emit('am_end_session', { code: room.code })
    clearAmSession()
    navigate('/AldeiaMix')
  }

  const onNarratorPick = (field, origIdx) => {
    socket?.emit('am_narrator_pick', { code: room.code, field, targetOrigIdx: origIdx })
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-[#080b14] flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        {reconnecting && <p className="text-slate-500 text-sm flex items-center gap-2"><WifiOff className="w-4 h-4" /> A reconectar…</p>}
      </div>
    )
  }

  const status = room.status
  const readyCount = revealProgress.total > 0 ? revealProgress.ready : room.revealReady
  const readyTotal = revealProgress.total > 0 ? revealProgress.total : room.revealTotal

  return (
    <div className="min-h-screen bg-[#080b14] flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-lg space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate('/AldeiaMix')} className="text-slate-400 p-1">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-white font-bold text-xl">🏘️ {room.code}</h1>
              <p className="text-slate-500 text-xs">
                {status === 'day' && `Dia ${room.dayNum}`}
                {status === 'night' && 'Noite'}
                {amJuiz ? ' · Narrador (tu)' : ` · Narrador: ${room.juizName}`}
              </p>
            </div>
          </div>
          {reconnecting && <WifiOff className="w-4 h-4 text-amber-400" />}
        </div>

        {amJuiz && (status === 'night' || status === 'day') && (
          <NarratorPanel room={room} socket={socket} narr={narr} onPick={onNarratorPick} timerLeft={timerLeft} />
        )}

        {!amJuiz && (
          <AnimatePresence mode="wait">
            {status === 'reveal' && (
              <motion.div key="reveal" className="space-y-4">
                <p className="text-slate-400 text-sm text-center">{playerStatusMessage(room)}</p>
                {!showRole ? (
                  <button type="button" onClick={() => setShowRole(true)}
                    className="w-full h-40 bg-white/[0.04] border border-white/[0.08] rounded-3xl flex flex-col items-center justify-center text-slate-400">
                    <EyeOff className="w-8 h-8 mb-2" /> Toca para ver o teu papel
                  </button>
                ) : myRole && (
                  <div className={`rounded-3xl p-8 border text-center ${ROLE_STYLES[myRole.role] || ''}`}>
                    <p className="text-sm opacity-80 uppercase tracking-wider">O teu papel</p>
                    <p className="text-white font-black text-3xl mt-2">{roleLabel(myRole.role)}</p>
                  </div>
                )}
                {showRole && !revealedReady && (
                  <button type="button" onClick={confirmReveal} className="w-full bg-emerald-600 text-white font-bold rounded-2xl py-4">
                    Vi o papel — pronto ✓
                  </button>
                )}
                {revealedReady && (
                  <p className="text-center text-slate-500 text-sm animate-pulse">
                    À espera dos outros… ({readyCount}/{readyTotal})
                  </p>
                )}
              </motion.div>
            )}

            {status === 'day' && (
              <motion.div key="day" className="space-y-4">
                <DayTimer secondsLeft={timerLeft} />
                {dawnNews && (
                  <p className="text-slate-300 text-sm text-center px-4">
                    {dawnNews.killedName ? `${dawnNews.killedName} morreu esta noite.` : 'Ninguém morreu esta noite.'}
                  </p>
                )}
                <VotePanel room={room} playerName={playerName} socket={socket} amEliminated={amEliminated} amJuiz={amJuiz} />
              </motion.div>
            )}

            {status === 'night' && (
              <motion.div key="night" className="text-center py-12 space-y-3">
                <p className="text-4xl">🌙</p>
                <p className="text-indigo-200 font-semibold">Olhos fechados</p>
                {daySkippedNotice && (
                  <p className="text-slate-400 text-sm">
                    {daySkippedNotice === 'tie'
                      ? 'Empate na votação — ninguém eliminado.'
                      : 'Ninguém foi eliminado hoje — nova noite.'}
                  </p>
                )}
                <p className="text-slate-500 text-sm">O narrador conduz a noite</p>
              </motion.div>
            )}

            {status === 'result' && (
              <motion.div key="result" className="text-center space-y-4">
                <p className="text-white font-black text-3xl">{gameResultLabel(room.gameResult)}</p>
                {(room.rolesPublic || []).map((r) => (
                  <p key={r.origIdx} className="text-slate-400 text-sm">{r.name}: {roleLabel(r.role)}</p>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {amJuiz && status === 'reveal' && (
          <div className="space-y-4">
            <p className="text-center text-emerald-400 text-sm font-semibold">
              Narrador — espera os jogadores verem o papel ({readyCount}/{readyTotal})
            </p>
            <p className="text-slate-500 text-xs text-center">Tu não jogas nesta partida, só conduzes.</p>
          </div>
        )}

        {amJuiz && status === 'result' && (
          <button type="button" onClick={playAgain} className="w-full bg-emerald-600 text-white rounded-2xl py-4 font-bold">
            Jogar outra vez (narrador seguinte)
          </button>
        )}

        {amEliminated && status !== 'result' && (
          <p className="text-center text-slate-600 text-sm">Eliminado — observa em silêncio</p>
        )}

        {(isHost || amJuiz) && (
          <button type="button" onClick={closeRoom}
            className="w-full flex items-center justify-center gap-2 text-red-400/80 text-xs py-2">
            <Trash2 className="w-3 h-3" /> Fechar sala
          </button>
        )}
      </div>
    </div>
  )
}
