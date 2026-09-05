import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { EyeOff, Trash2, WifiOff } from 'lucide-react'
import NightShell, { NightTitle, NightCta } from '../components/layout/NightShell'
import ReconnectBanner from '../components/layout/ReconnectBanner'
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
  nightPickVisible,
} from '../utils/aldeiaMixShared'

const API_URL = getSocketUrl()
const CYAN = '#22d3ee'
const GOLD = '#fbbf24'

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

function isDeadPlayer(room, r) {
  if (!r || !room) return false
  if (r.eliminated) return true
  if ((room.eliminated || []).includes(r.origIdx)) return true
  if ((room.deadNames || []).includes(r.name)) return true
  if (room.lastNight?.killed != null && r.origIdx === room.lastNight.killed) return true
  if (room.lastNight?.killedName && r.name === room.lastNight.killedName) return true
  return false
}

function mergeRoomState(prev, next) {
  if (!prev) return next
  if (!next) return prev
  const phaseChanged = next.status !== prev.status
    || next.dayNum !== prev.dayNum
    || (next.matchNum || 1) !== (prev.matchNum || 1)
  const myVote = next.myVote !== undefined
    ? next.myVote
    : (phaseChanged ? null : prev.myVote)
  const merged = { ...prev, ...next, myVote }
  const sameMatch = (next.matchNum || 1) === (prev.matchNum || 1)
  if (sameMatch) {
    merged.eliminated = [...new Set([...(prev.eliminated || []), ...(next.eliminated || [])])]
    merged.deadNames = [...new Set([...(prev.deadNames || []), ...(next.deadNames || [])])]
    merged.rolesPublic = (next.rolesPublic || prev.rolesPublic || []).map((r) => ({
      ...r,
      eliminated: r.eliminated
        || merged.eliminated.includes(r.origIdx)
        || merged.deadNames.includes(r.name),
    }))
  }
  if (
    prev.votingClosed
    && prev.status === 'day'
    && next.status === 'day'
    && prev.dayNum === next.dayNum
    && !next.votingClosed
  ) {
    merged.votingClosed = true
    if (!next.voteTally?.length && prev.voteTally?.length) merged.voteTally = prev.voteTally
    merged.lastVoteEliminatedName = next.lastVoteEliminatedName || prev.lastVoteEliminatedName
    merged.lastVoteTie = next.lastVoteTie || prev.lastVoteTie
  }
  return merged
}

function VotePanel({ room, playerName, amEliminated, amJuiz, voteTarget, onSelect }) {
  const alive = (room.rolesPublic || []).filter((r) => !r.isNarrator && !isDeadPlayer(room, r))
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
        <p className="text-center text-xs text-[#22d3ee]">
          Votaste em {room.rolesPublic?.[myVote]?.name}
        </p>
      )}
      {voteTarget != null && myVote == null && (
        <p className="text-center text-sm text-white/70">
          Votar em <span className="font-bold text-white">{room.rolesPublic?.[voteTarget]?.name}</span>?
        </p>
      )}
      {alive.filter((r) => r.origIdx !== myIdx).map((r) => (
        <button
          key={r.origIdx}
          type="button"
          disabled={myVote != null}
          onClick={() => onSelect(r.origIdx)}
          className={`w-full rounded-full border py-3 text-[15px] font-bold disabled:opacity-50 ${
            voteTarget === r.origIdx || myVote === r.origIdx
              ? 'border-[#ff4d7a]/50 bg-[#1c1c21] text-white'
              : 'border-white/10 bg-[#1c1c21] text-slate-200'
          }`}
        >
          {r.name}
        </button>
      ))}
    </div>
  )
}

function NarratorPanel({ room, socket, narr, onPick, timerLeft }) {
  const alive = (room.rolesPublic || []).filter((r) => !r.isNarrator && !isDeadPlayer(room, r))
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
        <div className="rounded-2xl border border-white/10 bg-[#1c1c21] p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#22d3ee]">Narrador — lê em voz alta</p>
          <p className="text-lg leading-snug text-white">{script}</p>
        </div>
        {pickField && (
          <div className="space-y-2">
            {alive.filter((r) => {
              const role = narr?.roleByIdx?.[r.origIdx]
              if (role == null) return true
              return nightPickVisible(step, role)
            }).map((r) => (
              <button key={r.origIdx} type="button" onClick={() => onPick(pickField, r.origIdx)}
                className={`w-full rounded-full border px-4 py-3 text-left text-[15px] font-bold ${
                  selected === r.origIdx ? 'border-[#22d3ee]/50 bg-[#1c1c21] text-white' : 'border-white/10 bg-[#1c1c21] text-slate-200'
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
          <button type="button" onClick={() => socket.emit('am_skip_day', { code: room.code })}
            className="w-full py-2 text-center text-xs font-bold text-white/40">
            Saltar dia — ninguém sai
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
  const [disconnected, setDisconnected] = useState(false)
  const [voteTarget, setVoteTarget] = useState(null)
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
    s.off('am_voting_closed')

    s.on('disconnect', () => {
      setDisconnected(true)
      setReconnecting(true)
    })
    s.on('connect', () => {
      setDisconnected(false)
      setReconnecting(false)
      const saved = loadAmSession()
      const code = saved?.code
      const name = playerNameRef.current || saved?.playerName
      if (code && name) {
        s.emit('am_rejoin_room', { code, playerName: name, playerToken: saved?.playerToken })
      }
    })

    s.on('am_your_role', (data) => setMyRole(data))
    s.on('am_game_started', (r) => {
      setRoom(r)
      setRevealedReady(false)
      setShowRole(false)
      setDawnNews(null)
      setRevealProgress({ ready: 0, total: r.revealTotal || 0 })
    })
    s.on('am_phase', (r) => {
      setRoom((prev) => mergeRoomState(prev, r))
      if (r.discussionEndsAt) {
        setTimerLeft(Math.max(0, Math.ceil((r.discussionEndsAt - Date.now()) / 1000)))
      }
    })
    s.on('am_voting_closed', (payload) => {
      setRoom((prev) => (prev ? {
        ...prev,
        votingClosed: true,
        voteTally: payload?.tally || prev.voteTally || [],
        lastVoteEliminatedName: payload?.eliminatedName || null,
        lastVoteTie: !!payload?.tied,
      } : prev))
    })
    s.on('am_narrator_state', (state) => {
      setRoom((prev) => mergeRoomState(prev, state))
      setNarr({
        wolfTarget: state.wolfTarget,
        medicTarget: state.medicTarget,
        sheriffTarget: state.sheriffTarget,
        sheriffIsWolf: state.sheriffIsWolf,
        roleByIdx: state.roleByIdx,
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
      setRoom((prev) => {
        if (!prev) return prev
        const killed = news.killed
        const eliminated = [...(prev.eliminated || [])]
        if (killed != null && !eliminated.includes(killed)) eliminated.push(killed)
        const sameDay = prev.status === 'day' && prev.dayNum === news.dayNum
        return {
          ...prev,
          status: 'day',
          dayNum: news.dayNum,
          votingClosed: sameDay ? prev.votingClosed : false,
          eliminated,
          deadNames: news.killedName
            ? [...new Set([...(prev.deadNames || []), news.killedName])]
            : (prev.deadNames || []),
          rolesPublic: (prev.rolesPublic || []).map((r) => ({
            ...r,
            eliminated: eliminated.includes(r.origIdx) || r.name === news.killedName,
          })),
        }
      })
    })
    s.on('am_day_skipped', ({ reason } = {}) => {
      setDawnNews(null)
      setDaySkippedNotice(reason === 'tie' ? 'tie' : 'skip')
    })
    s.on('am_reveal_progress', (p) => setRevealProgress(p))
    s.on('am_vote_progress', (p) => {
      setRoom((r) => r ? { ...r, votesCast: p.cast, votesExpected: p.total } : r)
    })
    s.on('am_rejoined', ({ room: r, playerName: pn, isHost: ih, playerToken }) => {
      setRoom(r)
      setPlayerName(pn)
      playerNameRef.current = pn
      setIsHost(ih)
      patchAmSession({ isHost: ih, playerToken })
      setReconnecting(false)
      setDisconnected(false)
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
      sock.emit('am_rejoin_room', { code, playerName: pn, playerToken: saved?.playerToken || handoff?.playerToken })
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

  useEffect(() => {
    setVoteTarget(null)
  }, [room?.status, room?.dayNum, room?.myVote])

  const amJuiz = room?.juizName === playerName
  const myPublic = room?.rolesPublic?.find((r) => r.name === playerName && !r.isNarrator)
  const amEliminated = isDeadPlayer(room, myPublic)

  const confirmVote = () => {
    if (!socket || !room || voteTarget == null || room.myVote != null || room.votingClosed) return
    if (amEliminated) return
    const target = room.rolesPublic?.find((r) => r.origIdx === voteTarget)
    if (!target || isDeadPlayer(room, target)) return
    socket.emit('am_cast_vote', { code: room.code, targetOrigIdx: voteTarget })
    setVoteTarget(null)
  }

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
      <NightShell onBack={() => navigate('/AldeiaMix')}>
        <div className="flex flex-col items-center gap-3 pt-16">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#22d3ee] border-t-transparent" />
          {reconnecting && (
            <p className="flex items-center gap-2 text-sm text-slate-500"><WifiOff className="h-4 w-4" /> A reconectar…</p>
          )}
        </div>
      </NightShell>
    )
  }

  const status = room.status
  const readyCount = revealProgress.total > 0 ? revealProgress.ready : room.revealReady
  const readyTotal = revealProgress.total > 0 ? revealProgress.total : room.revealTotal
  const phase = status === 'day' ? 'day' : status === 'night' ? 'night' : undefined

  const footer = !amJuiz && status === 'reveal' && showRole && !revealedReady ? (
    <NightCta accent={CYAN} onClick={confirmReveal}>Vi o papel — pronto</NightCta>
  ) : !amJuiz && status === 'day' && !amEliminated && !room.votingClosed && room.myVote == null && voteTarget != null ? (
    <NightCta accent="#ff4d7a" onClick={confirmVote}>
      Votar em {room.rolesPublic?.[voteTarget]?.name}
    </NightCta>
  ) : amJuiz && status === 'night' ? (
    <NightCta accent={CYAN} onClick={() => socket.emit('am_narrator_next', { code: room.code })}>
      {room.nightStep === 'dawn' ? 'Aldeia acorda' : 'Seguinte'}
    </NightCta>
  ) : amJuiz && status === 'day' && !room.votingClosed ? (
    <NightCta accent={GOLD} onClick={() => socket?.emit('am_close_voting', { code: room.code })}>
      Fechar votação
    </NightCta>
  ) : amJuiz && status === 'day' && room.votingClosed ? (
    <NightCta accent={CYAN} onClick={() => socket.emit('am_narrator_start_night', { code: room.code })}>
      Próxima noite
    </NightCta>
  ) : (amJuiz || isHost) && status === 'result' ? (
    <NightCta accent={CYAN} onClick={playAgain}>Jogar outra vez</NightCta>
  ) : null

  return (
    <NightShell wide phase={phase} onBack={() => navigate('/AldeiaMix')} footer={footer}>
        <ReconnectBanner
          reconnecting={reconnecting && !disconnected}
          disconnected={disconnected}
          onRetry={() => socket?.connect()}
        />
        <NightTitle>Sala {room.code}</NightTitle>
        <p className="mt-1.5 text-center text-[13px] text-white/45">
          {status === 'day' && `Dia ${room.dayNum} · `}
          {status === 'night' && 'Noite · '}
          {status === 'reveal' && 'Papéis · '}
          {amJuiz ? 'Narrador (tu)' : `Narrador: ${room.juizName}`}
        </p>

        {amJuiz && (status === 'night' || status === 'day') && (
          <div className="mt-5">
            <NarratorPanel room={room} socket={socket} narr={narr} onPick={onNarratorPick} timerLeft={timerLeft} />
          </div>
        )}

        {!amJuiz && (
          <AnimatePresence mode="wait">
            {status === 'reveal' && (
              <motion.div key="reveal" className="mt-5 space-y-4">
                <p className="text-center text-sm text-white/45">{playerStatusMessage(room)}</p>
                {!showRole ? (
                  <button
                    type="button"
                    onClick={() => setShowRole(true)}
                    className="flex h-48 w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-[2rem] border border-white/10 bg-[#1c1c21] text-slate-400"
                  >
                    <EyeOff className="h-8 w-8 text-[#22d3ee]" />
                    <span className="font-black text-white">Toca para ver o teu papel</span>
                  </button>
                ) : myRole && (
                  <div className={`rounded-[2rem] border p-8 text-center ${ROLE_STYLES[myRole.role] || 'border-white/10 bg-[#1c1c21]'}`}>
                    <p className="text-sm uppercase tracking-wider text-white/60">O teu papel</p>
                    <p className="mt-2 text-3xl font-black text-white">{roleLabel(myRole.role)}</p>
                  </div>
                )}
                {revealedReady && (
                  <p className="animate-pulse text-center text-sm text-slate-500">
                    À espera dos outros… ({readyCount}/{readyTotal})
                  </p>
                )}
              </motion.div>
            )}

            {status === 'day' && (
              <motion.div key="day" className="mt-5 space-y-4">
                <DayTimer secondsLeft={timerLeft} />
                {dawnNews && (
                  <p className="px-4 text-center text-sm text-slate-300">
                    {dawnNews.killedName ? `${dawnNews.killedName} morreu esta noite.` : 'Ninguém morreu esta noite.'}
                  </p>
                )}
                <VotePanel
                  room={room}
                  playerName={playerName}
                  amEliminated={amEliminated}
                  amJuiz={amJuiz}
                  voteTarget={voteTarget}
                  onSelect={setVoteTarget}
                />
              </motion.div>
            )}

            {status === 'night' && (
              <motion.div key="night" className="space-y-3 py-12 text-center">
                <p className="text-4xl">🌙</p>
                <p className="font-semibold text-white">Olhos fechados</p>
                {daySkippedNotice && (
                  <p className="text-sm text-slate-400">
                    {daySkippedNotice === 'tie'
                      ? 'Empate na votação — ninguém eliminado.'
                      : 'Ninguém foi eliminado hoje — nova noite.'}
                  </p>
                )}
                <p className="text-sm text-slate-500">O narrador conduz a noite</p>
              </motion.div>
            )}

            {status === 'result' && (
              <motion.div key="result" className="mt-5 space-y-4 text-center">
                <p className="text-3xl font-black text-white">{gameResultLabel(room.gameResult)}</p>
                {(room.rolesPublic || []).map((r) => (
                  <p key={r.origIdx} className="text-sm text-slate-400">{r.name}: {roleLabel(r.role)}</p>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {amJuiz && status === 'reveal' && (
          <div className="mt-5 space-y-2">
            <p className="text-center text-sm font-semibold text-[#22d3ee]">
              À espera dos papéis ({readyCount}/{readyTotal})
            </p>
            <p className="text-center text-xs text-slate-500">Tu não jogas nesta partida, só conduzes.</p>
          </div>
        )}

        {amEliminated && status !== 'result' && (
          <p className="mt-4 text-center text-sm text-slate-500">Eliminado — observa em silêncio</p>
        )}

        {(isHost || amJuiz) && (
          <button type="button" onClick={closeRoom}
            className="mt-4 flex w-full items-center justify-center gap-2 py-2 text-xs font-bold text-red-400/80">
            <Trash2 className="h-3 w-3" /> Fechar sala
          </button>
        )}
    </NightShell>
  )
}
