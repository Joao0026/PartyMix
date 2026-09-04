import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Crown, RotateCcw, Copy, Check, Share2 } from 'lucide-react'
import BackButton from '../components/layout/BackButton'
import PageShell from '../components/layout/PageShell'
import GameShell from '../components/layout/GameShell'
import NightShell, {
  NightTitle, NightCta, GlowCode, NightPlayerChip, NameField, pessoaLabel,
} from '../components/layout/NightShell'
import { shuffle } from '../utils/game'
import { io } from 'socket.io-client'
import { getGlobalSocket, setGlobalSocket, peekCardsLobbyHandoff, clearCardsLobbyHandoff } from '../utils/socketStore'
import { saveCardsSession, loadCardsSession } from '../utils/cardsSession'
import { getSocketUrl } from '../utils/api'
import ReconnectBanner from '../components/layout/ReconnectBanner'
import { shareNight } from '../utils/shareNight'
import { api } from '../utils/api'
import festaPackJson from '../../../data/cards/festa.json'

const API_URL = getSocketUrl()
const ICE = '#e2e8f0'

// ── CARD PACKS (original content) ────────────────────────────
const PACKS = {
  base: {
    id:'base', name:'🇵🇹 Portugal Clássico', desc:'O essencial português',
    black:['O segredo do sucesso em Portugal é ___.','O novo plano do governo para a habitação: ___.','Em Portugal, só há duas estações: ___ e obras.','O maior problema dos millennials portugueses é ___.','Novo reality show: "___: A Sobrevivência em Lisboa".','A crise do custo de vida resolveu-se com ___.','O Cristiano Ronaldo disse que o segredo da sua carreira é ___.','Na próxima eleição, o partido vai prometer ___.','O turismo em Portugal destruiu ___.','O que nunca deves dizer numa reunião de família de domingo? ___.','A geração Z substituiu o sonho americano por ___.','Novo produto português: ___ com bacalhau.','Portugal 2030: o último português a sair apaga ___.'],
    white:['O Benfica','O Porto','O Sporting','O árbitro','A Pastelaria da Esquina','Pastéis de Belém às 3 da manhã','O senhor Zé do café','A crise da habitação','Um apartamento de 20m² por 1200€','O IRS','Saudade de algo que nunca existiu','O comboio com 2 horas de atraso','Um taxista com opinião política','A fila do SEF','O Wi-Fi da Altice','Um português a chegar a horas','O 25 de Abril mas só o feriado','Um familiar no WhatsApp de família','Fake news no Facebook de 2014','O Supremo Tribunal Administrativo','Um pato de borracha chamado António','A greve dos motoristas','Bacalhau com natas','Bifanas com mostarda','O ChatGPT a fazer o IRS','A Linha de Sintra às 8h30','Uma cerveja Sagres morna'],
  },
  dark: {
    id:'dark', name:'🔞 Lado Negro', desc:'Para os mais corajosos',
    black:['O que descobri no pesquisador do meu parceiro: ___.','A minha psicóloga disse que não me consegue ajudar com ___.','Nova série Netflix: "___: Uma História Portuguesa".','O que realmente acontece nas festas académicas de Coimbra? ___.','Acordo de confidencialidade: nunca revelar que eu e ___ fizemos ___.','O meu ex disse que o problema da nossa relação era ___.','Dating profile: "Gosto de ___, ___ e de evitar comprometimentos".','O que encontrei no quarto do meu colega de casa: ___.'],
    white:['Mandar mensagem ao ex a meio da noite','Uma traição emocional com o vizinho','Chorar no duche com música do Agir','Stalkear o Instagram do ex de 2019','Um flirt que correu muito mal','Pedir desculpa que nunca chegou','Uma noite que ninguém deve saber','Bloquear toda a gente no Instagram','Fingir que não vi a mensagem','Dois copos a mais e um arrependimento','Terapia de casal sem o casal','Uma mentira que se tornou personalidade'],
  },
  geek: {
    id:'geek', name:'🤓 Cultura Geek', desc:'Para os nerds assumidos',
    black:['O que o Elon Musk vai anunciar na próxima semana: ___.','ChatGPT não consegue substituir ___ porque ___.','Steam Summer Sale: gastei 47€ em ___ que nunca vou jogar.','Nova tecnologia revolucionária: ___ mas para ___.','No metaverso, finalmente podemos ___.','A inteligência artificial vai eliminar a profissão de ___.'],
    white:['Uma build de PC mais cara que a renda','O Copilot a escrever código errado','Linux no desktop desde 2003','NFTs de screenshots','Um framework JavaScript lançado há 3 dias','O dark mode no Excel','Um keyboard mecânico que ninguém pediu','Stack Overflow sem respostas','Git commit com mensagem "fix"','Uma reunião que era mesmo um email','Produtividade através do YouTube'],
  },
  politica: {
    id:'politica', name:'🏛️ Política Portuguesa', desc:'Rir para não chorar',
    black:['O novo ministro da saúde vai resolver o problema com ___.','O Parlamento aprovou uma lei que proíbe ___.','Novo partido político: "Portugal ___".','O orçamento de estado contempla verba para ___.','Novo escândalo político: ___ apanhado a fazer ___.','O presidente da câmara inaugurou ___ pela 4ª vez.'],
    white:['Uma circular sobre uma circular','O relatório do relatório de 2019','Inaugurar uma ponte que já existia','Um comboio com 40 anos de vida útil','Uma privatização disfarçada','O coeficiente de valorização das rendas','Uma auditoria ao tribunal de contas','Abstenção histórica','Votos nulos filosóficos','Geringonça 3.0'],
  },
  festa: {
    id: 'festa',
    name: '🎉 Festa Extra',
    desc: festaPackJson.description || 'Pack grande para noites longas',
    black: festaPackJson.black || [],
    white: festaPackJson.white || [],
  },
}
const ALL_PACKS = Object.values(PACKS)

// ── SETUP SCREEN ─────────────────────────────────────────────
function SetupScreen({ onCreateOnline, initialName }) {
  const navigate = useNavigate()
  const [selPacks, setSelPacks] = useState(['base', 'festa', 'dark'])
  const [includeCommunity, setIncludeCommunity] = useState(true)
  const [creating, setCreating] = useState(false)
  const [playerName, setPlayerName] = useState(initialName || '')

  useEffect(() => {
    if (typeof initialName === 'string') setPlayerName(initialName)
  }, [initialName])

  const togglePack = (id) => setSelPacks((s) => s.includes(id) ? (s.length > 1 ? s.filter((x) => x !== id) : s) : [...s, id])

  const create = async () => {
    setCreating(true)
    try {
      let black = shuffle(selPacks.flatMap((id) => PACKS[id]?.black || []))
      let white = shuffle(selPacks.flatMap((id) => PACKS[id]?.white || []))
      if (includeCommunity) {
        try {
          const rows = await api.getCards({ pack: 'community' })
          if (Array.isArray(rows)) {
            black = shuffle([...black, ...rows.filter((c) => c.is_black).map((c) => c.text)])
            white = shuffle([...white, ...rows.filter((c) => !c.is_black).map((c) => c.text)])
          }
        } catch { /* offline — só packs locais */ }
      }
      onCreateOnline({ black, white }, playerName.trim())
    } finally {
      setCreating(false)
    }
  }

  return (
    <NightShell
      onBack={() => navigate('/CardsLobby')}
      footer={(
        <NightCta accent={ICE} onClick={create} disabled={selPacks.length === 0 || !playerName.trim() || creating}>
          {creating ? 'A preparar…' : 'Criar sala'}
        </NightCta>
      )}
    >
      <NightTitle>Cartas</NightTitle>
      <p className="mt-3 text-center text-[1.05rem] font-medium text-white">Baralhos</p>
      <p className="mt-1.5 text-center text-[13px] text-white/45">Escolhe o que entra nesta sala.</p>

      {!initialName && <NameField value={playerName} onChange={setPlayerName} />}

      <div className="mt-5 space-y-2.5">
        {ALL_PACKS.map((pack) => {
          const on = selPacks.includes(pack.id)
          return (
            <button
              key={pack.id}
              type="button"
              onClick={() => togglePack(pack.id)}
              className="w-full rounded-[1.4rem] border bg-[#1c1c21] p-4 text-left active:scale-[0.98]"
              style={on
                ? { borderColor: `${ICE}66`, boxShadow: `0 8px 24px -8px ${ICE}88` }
                : { borderColor: 'rgba(255,255,255,.1)' }}
            >
              <p className={`font-bold ${on ? 'text-white' : 'text-slate-400'}`}>{pack.name}</p>
              <p className="mt-0.5 text-xs text-slate-500">{pack.desc} · {pack.black.length} pretas + {pack.white.length} brancas</p>
            </button>
          )
        })}
      </div>

      <p className="mt-3 text-center text-xs text-slate-500">
        {selPacks.reduce((s, id) => s + (PACKS[id]?.black.length || 0), 0)} pretas + {selPacks.reduce((s, id) => s + (PACKS[id]?.white.length || 0), 0)} brancas
        {includeCommunity ? ' + comunidade' : ''}
      </p>

      <button
        type="button"
        onClick={() => setIncludeCommunity((v) => !v)}
        className="mt-3 w-full rounded-full border bg-[#1c1c21] px-4 py-3 text-sm font-bold text-white"
        style={includeCommunity
          ? { borderColor: `${ICE}66`, boxShadow: `0 8px 24px -8px ${ICE}88` }
          : { borderColor: 'rgba(255,255,255,.12)' }}
      >
        Cartas da comunidade {includeCommunity ? 'ligadas' : 'desligadas'}
      </button>
    </NightShell>
  )
}

function OnlineLobby({ room, playerName, onStart }) {
  const navigate = useNavigate()
  const isHost = room?.host === playerName
  const count = room?.players?.length || 0

  if (!room) {
    return (
      <NightShell onBack={() => navigate('/CardsLobby')}>
        <NightTitle>Cartas</NightTitle>
        <p className="mt-8 text-center text-sm text-white/45">A criar a sala…</p>
      </NightShell>
    )
  }

  return (
    <NightShell
      onBack={() => navigate('/CardsLobby')}
      footer={isHost ? (
        <NightCta accent={ICE} onClick={onStart} disabled={count < 2}>
          Começar com {pessoaLabel(count)}
        </NightCta>
      ) : (
        <p className="py-2 text-center text-sm text-white/45">À espera que o host inicie…</p>
      )}
    >
      <NightTitle>Cartas</NightTitle>
      <GlowCode code={room.code} accent={ICE} mode="cards" />
      <div className="mt-5 space-y-2.5">
        {(room.players || []).map((p, i) => (
          <NightPlayerChip
            key={i}
            name={p.name}
            index={i}
            host={p.name === room.host}
            mine={p.name === playerName}
            disconnected={p.disconnected}
            accent={ICE}
          />
        ))}
      </div>
    </NightShell>
  )
}

// ── MAIN GAME (works for both local and online) ──────────────
function GameScreen({ mode, socket, room: initialRoom, playerName, players: localPlayers, packs, initialHand, initialGameState, isHost }) {
  const navigate  = useNavigate()

  // Local state
  const [players,      setPlayers]      = useState(localPlayers || [])
  const [czarIdx,      setCzarIdx]      = useState(0)
  const [blackDeck,    setBlackDeck]    = useState([])
  const [whiteDeck,    setWhiteDeck]    = useState([])
  const [hands,        setHands]        = useState({})
  const [myHand,       setMyHand]       = useState(initialHand || []) // online: only your cards
  const [currentBlack, setCurrentBlack] = useState(null)
  const [submissions,  setSubmissions]  = useState({})
  const [revealed,     setRevealed]     = useState(false)
  const [roundWinner,  setRoundWinner]  = useState(null)
  const [scores,       setScores]       = useState({})
  const [roundNum,     setRoundNum]     = useState(1)
  const [subCount,     setSubCount]     = useState({count:0,total:0,allDone:false})
  const [selectedWhiteCards, setSelectedWhiteCards] = useState([])
  const [submittedThisRound, setSubmittedThisRound] = useState(false)
  const [gameEnded,    setGameEnded]    = useState(false)
  const [finalScores,  setFinalScores]  = useState([])
  const [czarId,       setCzarId]       = useState(null)
  const [onlineHost,   setOnlineHost]   = useState(initialRoom?.host || null)
  const [playerMeta,   setPlayerMeta]   = useState(initialRoom?.players || initialGameState?.players || [])
  const [reconnecting, setReconnecting] = useState(false)
  const [disconnected, setDisconnected] = useState(false)
  const playerNameRef = useRef(playerName)
  playerNameRef.current = playerName

  const HAND_SIZE = 7
  const czar       = players[czarIdx]

  // ── LOCAL GAME INIT ──────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'local') return
    const whites = [...packs.white]
    const blacks = [...packs.black]
    const newHands = {}
    let wi = 0
    localPlayers.forEach(name => { newHands[name]=whites.slice(wi,wi+HAND_SIZE); wi+=HAND_SIZE })
    setBlackDeck(blacks.slice(1))
    setWhiteDeck(whites.slice(wi))
    setHands(newHands)
    setCurrentBlack(blacks[0])
    setScores(Object.fromEntries(localPlayers.map(n=>[n,0])))
    setPlayers(localPlayers)
  }, [])

  // ── ONLINE: snapshot ao entrar (separado dos listeners para não re-subscrever a cada mudança de state)
  useEffect(() => {
    if (mode !== 'online' || !initialGameState) return
    setPlayers(initialGameState.players.map((p) => p.name))
    setCurrentBlack(initialGameState.blackCard)
    setCzarIdx(initialGameState.czarIdx ?? 0)
    setCzarId(initialGameState.czarId)
    setRoundNum(initialGameState.round)
    setScores(Object.fromEntries(initialGameState.players.map((p) => [p.name, p.score])))
    setSubmissions({})
    setRevealed(false)
    setRoundWinner(null)
  }, [mode, initialGameState])

  // ── ONLINE SOCKET EVENTS (deps só socket/mode — evita socket.off que remove your_hand a meio do jogo)
  useEffect(() => {
    if (mode !== 'online' || !socket) return

    const onGameStarted = (state) => {
      setPlayers(state.players.map((p) => p.name))
      setCurrentBlack(state.blackCard)
      setCzarIdx(state.czarIdx ?? 0)
      setCzarId(state.czarId)
      setRoundNum(state.round)
      setScores(Object.fromEntries(state.players.map((p) => [p.name, p.score])))
      const restoredSubmissions = {}
      ;(state.submissions || []).forEach((s) => { restoredSubmissions[s.playerId] = s.card })
      setSubmissions(restoredSubmissions)
      setRevealed(!!state.revealed)
      setRoundWinner(state.roundWinner || null)
      setSubCount(state.submissionUpdate || { count: 0, total: 0, allDone: false })
      setPlayerMeta(state.players || [])
      setSelectedWhiteCards([])
      setSubmittedThisRound(!!state.submittedThisRound)
    }
    const onYourHand = (hand) => setMyHand(Array.isArray(hand) ? [...hand] : [])
    const onSubUpdate = (d) => setSubCount(d)
    const onCardsRevealed = ({ submissions: subs }) => {
      setRevealed(true)
      const map = {}
      subs.forEach((s) => { map[s.playerId] = s.card })
      setSubmissions(map)
    }
    const onRoundEnded = (d) => {
      setRoundWinner(d.winnerId || d.winnerName || null)
      setScores(Object.fromEntries(d.scores.map((s) => [s.name, s.score])))
    }
    const onNewRound = (d) => {
      setRoundNum(d.round)
      setCzarId(d.czarId)
      if (typeof d.czarIdx === 'number') setCzarIdx(d.czarIdx)
      setCurrentBlack(d.blackCard)
      if (d.preserveRound) return
      setSubmissions({})
      setRevealed(false)
      setRoundWinner(null)
      setSubCount({ count: 0, total: 0, allDone: false })
      setSelectedWhiteCards([])
      setSubmittedThisRound(false)
    }
    const onGameEnded = (d) => {
      setGameEnded(true)
      setFinalScores(d.scores)
    }

    const onCardsRejoined = ({ room: r, playerName: pn, isHost: ih, playerToken }) => {
      saveCardsSession({ code: r.code, playerName: pn, isHost: ih, playerToken })
      setOnlineHost(r.host)
      setReconnecting(false)
      setDisconnected(false)
    }
    const onDisconnect = () => {
      setDisconnected(true)
      setReconnecting(true)
    }
    const onConnect = () => {
      setDisconnected(false)
      const saved = loadCardsSession()
      if (saved?.code && playerNameRef.current) {
        socket.emit('cards_rejoin_room', { code: saved.code, playerName: playerNameRef.current, playerToken: saved.playerToken })
      }
    }
    const onRoomUpdated = (r) => {
      setPlayers(r.players.map((p) => p.name))
      setScores(Object.fromEntries(r.players.map((p) => [p.name, p.score])))
      setCzarIdx(r.czarIdx ?? 0)
      setCzarId(r.czarId)
      setOnlineHost(r.host)
      setPlayerMeta(r.players || [])
    }

    socket.on('disconnect', onDisconnect)
    socket.on('connect', onConnect)
    socket.on('cards_rejoined', onCardsRejoined)
    socket.on('room_updated', onRoomUpdated)
    socket.on('game_started', onGameStarted)
    socket.on('your_hand', onYourHand)
    socket.on('submission_update', onSubUpdate)
    socket.on('cards_revealed', onCardsRevealed)
    socket.on('round_ended', onRoundEnded)
    socket.on('new_round', onNewRound)
    socket.on('game_ended', onGameEnded)
    return () => {
      socket.off('disconnect', onDisconnect)
      socket.off('connect', onConnect)
      socket.off('cards_rejoined', onCardsRejoined)
      socket.off('room_updated', onRoomUpdated)
      socket.off('game_started', onGameStarted)
      socket.off('your_hand', onYourHand)
      socket.off('submission_update', onSubUpdate)
      socket.off('cards_revealed', onCardsRevealed)
      socket.off('round_ended', onRoundEnded)
      socket.off('new_round', onNewRound)
      socket.off('game_ended', onGameEnded)
    }
  }, [socket, mode])

  // ── LOCAL HELPERS ────────────────────────────────────────────
  const localSubmit = (playerName, card) => {
    if (submissions[playerName]) return
    const newSubs = {...submissions, [playerName]:card}
    setSubmissions(newSubs)
    const newCard = whiteDeck[0]||''
    setWhiteDeck(d=>d.slice(1))
    setHands(h=>({...h,[playerName]:[...h[playerName].filter(c=>c!==card),newCard].filter(Boolean)}))
    const czarName = players[czarIdx]
    const nonCzars = players.filter(p=>p!==czarName)
    if(nonCzars.every(p=>newSubs[p])) setSubCount({allDone:true})
  }

  const localReveal = () => setRevealed(true)

  const localPickWinner = (winnerName) => {
    setRoundWinner(winnerName)
    setScores(s=>({...s,[winnerName]:(s[winnerName]||0)+1}))
  }

  const localNextRound = () => {
    if(!blackDeck.length){setGameEnded(true);setFinalScores(Object.entries(scores).map(([name,score])=>({name,score})).sort((a,b)=>b.score-a.score));return}
    const next=(czarIdx+1)%players.length
    setCzarIdx(next);setRoundNum(r=>r+1);setCurrentBlack(blackDeck[0]);setBlackDeck(d=>d.slice(1))
    setSubmissions({});setRevealed(false);setRoundWinner(null);setSubCount({allDone:false,count:0,total:0})
  }

  // Online helpers
  const onlineSubmit = cards => {
    const payload = Array.isArray(cards) ? cards : [cards]
    socket.emit('submit_card',{code:initialRoom.code,cardText:payload})
    setSubmittedThisRound(true)
    setSelectedWhiteCards([])
  }
  const onlineReveal = () => socket.emit('reveal_cards',{code:initialRoom.code})
  const onlinePickWinner = id => socket.emit('pick_winner',{code:initialRoom.code,winnerId:id})
  const onlineNextRound = () => socket.emit('next_round',{code:initialRoom.code})

  const submit = mode==='local'?localSubmit:onlineSubmit
  const doReveal = mode==='local'?localReveal:onlineReveal
  const pickWinner = mode==='local'?localPickWinner:onlinePickWinner
  const nextRound = mode==='local'?localNextRound:onlineNextRound

  const czarName = players[czarIdx]
  const nonCzars = players.filter(p=>p!==czarName)
  const myName = mode==='local'?null:playerName
  const imCzar = mode==='online'?(czarName===playerName):false
  const imSittingOut = mode === 'online' && playerMeta.some((p) => p.name === playerName && p.sittingOut)
  const hostNow = mode === 'online' && (onlineHost === playerName || isHost)
  const waitingOthers = mode === 'online' && !revealed && !subCount.allDone && !gameEnded

  useEffect(() => {
    if (!waitingOthers || !hostNow || !socket || (subCount.count || 0) < 1) return
    const t = setTimeout(() => {
      socket.emit('cards_skip_pending', { code: initialRoom.code })
    }, 45000)
    return () => clearTimeout(t)
  }, [waitingOthers, hostNow, socket, subCount.count, roundNum, initialRoom?.code])
  const requiredCards = Math.min(2, Math.max(1, (String(currentBlack || '').match(/___/g) || []).length))

  // For local: current player whose turn it is to play
  const [localTurnIdx, setLocalTurnIdx] = useState(0)
  const localTurnPlayer = mode==='local'?(nonCzars[localTurnIdx]||null):null

  const submissionCards = submission => {
    if (Array.isArray(submission?.cards)) return submission.cards
    if (Array.isArray(submission)) return submission
    return String(submission || '').split(' + ').filter(Boolean)
  }

  const handleLocalCardPick = (card) => {
    localSubmit(localTurnPlayer, card)
    const next = localTurnIdx+1
    if(next>=nonCzars.length) setLocalTurnIdx(0)
    else setLocalTurnIdx(next)
  }

  // Game ended
  if(gameEnded) return(
    <PageShell mode="victory" className="justify-center" innerClassName="flex flex-col items-center text-center gap-6">
      <span className="text-7xl">🏆</span>
      <h1 className="text-white font-black text-3xl">Jogo Terminado!</h1>
      <div className="space-y-2 w-full max-w-xs">
        {finalScores.map((s,i)=>(
          <div key={s.name} className={`flex items-center justify-between px-4 py-3 rounded-2xl border ${i===0?'bg-amber-500/15 border-amber-500/40':'bg-white/[0.04] border-white/[0.07]'}`}>
            <span className={`font-bold ${i===0?'text-amber-400':'text-white'}`}>{i===0?'👑 ':''}{s.name}</span>
            <span className={`font-black text-lg ${i===0?'text-amber-400':'text-white'}`}>{s.score} pts</span>
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={() => shareNight({ title: 'Modo Cartas — PartyMix', text: ['🃏 Modo Cartas — PartyMix', ...finalScores.map((s, i) => `${i + 1}. ${s.name} — ${s.score} pts`)].join('\n') })} className="px-6 py-3 rounded-2xl bg-white text-slate-950 font-black flex items-center gap-2"><Share2 className="w-4 h-4"/>Partilhar</button>
        <button onClick={()=>window.location.reload()} className="px-6 py-3 rounded-2xl bg-white/[0.07] text-white font-bold flex items-center gap-2"><RotateCcw className="w-4 h-4"/>Novo</button>
        <button onClick={()=>navigate('/')} className="px-6 py-3 rounded-2xl bg-violet-600 text-white font-bold">Início</button>
      </div>
    </PageShell>
  )

  // Current hand to display
  const displayHand = mode==='online' ? myHand : (hands[localTurnPlayer]||[])
  const allSub = mode==='local' ? nonCzars.every(p=>submissions[p]) : subCount.allDone
  const mySubmitted = mode==='online' ? submittedThisRound : (localTurnPlayer && submissions[localTurnPlayer])
  const toggleSelectedWhiteCard = card => {
    setSelectedWhiteCards(prev => {
      if (prev.includes(card)) return prev.filter(c => c !== card)
      if (prev.length >= requiredCards) return prev
      return [...prev, card]
    })
  }

  return(
    <GameShell
      mode="cards"
      header={
          <div className="flex items-center justify-between">
          <BackButton onClick={() => navigate('/')} />
          <div className="flex items-center gap-2 min-w-0"><Crown className="text-amber-400 w-4 h-4 shrink-0"/><span className="text-white font-bold text-base truncate">R{roundNum} · Czar: {czarName}</span></div>
          <div className="flex gap-2 overflow-x-auto max-w-[42vw]">{players.map(p=>{
            const row = playerMeta.find((m) => m.name === p)
            return (
              <div key={p} className={`text-center min-w-[3.25rem] ${row?.sittingOut || row?.disconnected ? 'opacity-40' : ''}`}>
                <p className={`text-base font-black ${p===czarName?'text-amber-400':'text-white'}`}>{scores[p]||0}</p>
                <p className="text-slate-300 text-xs font-semibold truncate">{p.split(' ')[0]}</p>
                {row?.sittingOut && <p className="text-[9px] text-slate-500 font-bold">fora</p>}
              </div>
            )
          })}</div>
        </div>
      }
    >

      <div className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-4">
        {mode === 'online' && (
          <ReconnectBanner
            reconnecting={reconnecting && !disconnected}
            disconnected={disconnected}
            onRetry={() => socket?.connect()}
          />
        )}
        {/* Black card */}
        <div className="bg-black border border-white/20 rounded-3xl p-6 text-center min-h-28 flex items-center justify-center">
          <p className="text-white font-black text-xl leading-snug">{currentBlack}</p>
        </div>

        {mode === 'online' && imSittingOut && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-center space-y-3">
            <p className="text-white font-bold">Estás de fora</p>
            <p className="text-slate-400 text-sm">O telemóvel fica na mesa — volta quando quiseres.</p>
            <button
              type="button"
              onClick={() => socket?.emit('cards_sit_in', { code: initialRoom.code })}
              className="w-full rounded-2xl bg-white py-3 min-h-[48px] font-black text-slate-950"
            >
              Voltar ao jogo
            </button>
          </div>
        )}

        {/* Submission status */}
        {!revealed&&(
          <div className="flex items-center justify-between gap-2">
            <p className="text-slate-400 text-sm">
              {mode==='online'?`${subCount.count||0}/${subCount.total||nonCzars.length} submeteram`:`${Object.keys(submissions).length}/${nonCzars.length} submeteram`}
            </p>
            {allSub&&(mode==='local'||imCzar)&&!revealed&&(
              <button onClick={doReveal} className="bg-amber-500 text-black font-bold rounded-xl px-4 py-2 text-sm">Revelar →</button>
            )}
          </div>
        )}
        {mode === 'online' && !revealed && !allSub && hostNow && (subCount.count || 0) >= 1 && (
          <button
            type="button"
            onClick={() => socket?.emit('cards_skip_pending', { code: initialRoom.code })}
            className="w-full rounded-2xl border border-amber-400/30 bg-amber-500/15 py-3 min-h-[48px] text-amber-100 text-sm font-black"
          >
            Seguir sem quem falta
          </button>
        )}
        {mode === 'online' && !imSittingOut && !revealed && (
          <button
            type="button"
            onClick={() => socket?.emit('cards_sit_out', { code: initialRoom.code })}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] py-2.5 text-slate-400 text-xs font-bold"
          >
            Ficar de fora
          </button>
        )}

        {/* LOCAL: show current player's hand */}
        {mode==='local'&&!revealed&&localTurnPlayer&&!submissions[localTurnPlayer]&&(
          <div>
            <p className="text-white font-bold mb-2 text-center">{localTurnPlayer}, escolhe a tua carta:</p>
            <div className="flex gap-2 overflow-x-auto pb-2" style={{scrollbarWidth:'none'}}>
              {displayHand.map((card,i)=>(
                <motion.button key={i} whileHover={{y:-4}} whileTap={{scale:0.96}}
                  onClick={()=>handleLocalCardPick(card)}
                  className="flex-shrink-0 w-32 bg-white rounded-2xl p-3 text-slate-900 text-xs font-semibold text-center leading-snug shadow-lg min-h-20 flex items-center justify-center">
                  {card}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* ONLINE: your hand */}
        {mode==='online'&&!revealed&&!imCzar&&!mySubmitted&&!imSittingOut&&(
          <div className="min-h-0 shrink-0">
            <p className="text-white font-bold mb-2 text-center">
              {playerName}, escolhe {requiredCards === 2 ? 'duas cartas' : 'a tua carta'}:
            </p>
            {requiredCards === 2 && (
              <div className="mb-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3">
                <p className="text-amber-300 text-xs font-bold text-center uppercase tracking-[0.18em]">Escolhe 2 cartas</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {[0,1].map(idx=>(
                    <div key={idx} className="min-h-16 rounded-xl border border-white/[0.08] bg-black/25 p-2 text-center">
                      <p className="text-slate-500 text-[10px] font-bold uppercase">{idx+1}.º espaço</p>
                      <p className="mt-1 text-xs font-bold text-white">{selectedWhiteCards[idx] || 'Ainda vazio'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 overflow-x-auto pb-2 min-h-[5.5rem] touch-pan-x" style={{scrollbarWidth:'none'}}>
              {myHand.map((card,i)=>(
                <motion.button key={i} whileHover={{y:-4}} whileTap={{scale:0.96}}
                  onClick={()=>requiredCards === 1 ? onlineSubmit([card]) : toggleSelectedWhiteCard(card)}
                  className={`flex-shrink-0 w-32 bg-white rounded-2xl p-3 text-slate-900 text-xs font-semibold text-center leading-snug shadow-lg min-h-20 flex items-center justify-center transition-all ${selectedWhiteCards.includes(card)?'ring-4 ring-amber-400 -translate-y-1':''}`}>
                  {card}
                </motion.button>
              ))}
            </div>
            {requiredCards === 2 && (
              <button
                onClick={() => onlineSubmit(selectedWhiteCards)}
                disabled={selectedWhiteCards.length !== requiredCards}
                className="mt-3 w-full rounded-2xl bg-amber-500 py-3 text-sm font-black text-black disabled:opacity-40"
              >
                Submeter {selectedWhiteCards.length}/{requiredCards}
              </button>
            )}
          </div>
        )}
        {mode==='online'&&!revealed&&!imCzar&&mySubmitted&&!imSittingOut&&(
          <div className="text-center py-4 bg-white/[0.04] rounded-2xl border border-white/[0.07]">
            <p className="text-green-400 font-bold">✅ Carta submetida!</p>
            <p className="text-slate-500 text-sm mt-1">À espera dos outros...</p>
          </div>
        )}
        {mode==='online'&&!revealed&&imCzar&&!imSittingOut&&(
          <div className="text-center py-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
            <Crown className="text-amber-400 w-6 h-6 mx-auto mb-1"/>
            <p className="text-amber-400 font-bold">És o Czar!</p>
            <p className="text-slate-400 text-sm">Aguarda que todos submetam as cartas.</p>
          </div>
        )}

        {/* Revealed submissions */}
        {revealed&&(
          <div className="space-y-3">
            {roundWinner && (
              <div className="rounded-2xl border border-amber-400/35 bg-amber-500/15 px-4 py-3 text-center">
                <p className="text-amber-200 text-xs font-black uppercase tracking-[0.16em]">Vencedor da ronda</p>
                <p className="text-white font-black text-lg mt-0.5">👑 {roundWinner}</p>
              </div>
            )}
            {roundWinner ? (
              <p className="text-slate-400 text-sm text-center">Ronda decidida — {imCzar ? 'carrega em «Próxima Ronda»' : 'à espera do host'}</p>
            ) : (
              <p className="text-white font-bold text-center">{czarName}, escolhe a melhor carta!</p>
            )}
            {Object.entries(submissions).map(([pid,card])=>(
              <motion.button key={pid} whileHover={{scale:1.02}} whileTap={{scale:0.97}}
                onClick={()=>{
                  if (roundWinner) return
                  if (mode==='online' && !imCzar) return
                  pickWinner(pid)
                }}
                className={`w-full text-left bg-white rounded-2xl p-5 transition-all ${roundWinner===pid?'ring-4 ring-amber-400 shadow-xl':''} ${roundWinner&&roundWinner!==pid?'opacity-40':''} ${mode==='online'&&!imCzar?'opacity-60 pointer-events-none':''}`}>
                {submissionCards(card).length > 1 ? (
                  <div className="space-y-2">
                    {submissionCards(card).map((slotCard, idx)=>(
                      <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-wide">{idx+1}.º espaço</p>
                        <p className="text-slate-900 font-black text-base">{slotCard}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-900 font-black text-lg">{submissionCards(card)[0] || card}</p>
                )}
                {roundWinner===pid&&<p className="text-amber-600 text-sm font-bold mt-2">👑 Vencedor desta ronda!</p>}
              </motion.button>
            ))}
            {roundWinner&&(mode!=='online'||onlineHost===playerName)&&(
              <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.97}} onClick={nextRound}
                className="w-full bg-gradient-to-r from-violet-600 to-purple-700 text-white font-bold rounded-2xl py-4">
                Próxima Ronda →
              </motion.button>
            )}
            {roundWinner && mode === 'online' && !imCzar && (
              <p className="text-slate-500 text-center text-sm">À espera do host avançar a ronda…</p>
            )}
          </div>
        )}
      </div>
    </GameShell>
  )
}

// ── ROOT COMPONENT ────────────────────────────────────────────
export default function CardsGame() {
  const location = useLocation()
  const navigate = useNavigate()
  const [phase,      setPhase]      = useState('setup')  // setup | lobby | game
  const [gameMode,   setGameMode]   = useState('local')
  const [socket,     setSocket]     = useState(null)
  const [room,       setRoom]       = useState(null)
  const [playerName, setPlayerName] = useState('')
  const [packs,      setPacks]      = useState(null)
  const [localPlayers,setLocalPlayers]=useState([])
  const [initialHand,setInitialHand]=useState([])
  const [myHand,       setMyHand]       = useState([])
  const [gameState,  setGameState]  = useState(null)
  const [isHost,     setIsHost]     = useState(false)

  // Pré-preencher o nome quando vier da CardsLobby
  useEffect(() => {
    const preset = location.state?.presetPlayerName
    if (typeof preset === 'string') setPlayerName(preset)
  }, [location.state])

  useEffect(() => {
    if (!location.state?.online) return

    const handoff = peekCardsLobbyHandoff()
    const legacy = location.state?.room ? location.state : null
    const src = handoff || legacy
    if (!src?.room) return

    const storedSocket = getGlobalSocket()
    if (!storedSocket) return

    const { room: incomingRoom, playerName: incomingPlayerName, gameState, hand } = src

    setSocket(storedSocket)
    setGlobalSocket(storedSocket)
    setRoom(incomingRoom)
    setPlayerName(incomingPlayerName || '')
    const incomingHand = hand || []
    setInitialHand(incomingHand)
    setMyHand(incomingHand)
    setGameState(gameState || null)
    setIsHost(incomingRoom.host === incomingPlayerName)
    setGameMode('online')
    setPhase(gameState ? 'game' : 'lobby')
    saveCardsSession({
      code: incomingRoom.code,
      playerName: incomingPlayerName || '',
      isHost: incomingRoom.host === incomingPlayerName,
    })

    if (handoff) {
      setTimeout(() => clearCardsLobbyHandoff(), 0)
    }
  }, [location.state])

  useEffect(() => {
    if (gameMode !== 'online' || !socket) return
    const onConnect = () => {
      const saved = loadCardsSession()
      if (saved?.code && playerName) {
        socket.emit('cards_rejoin_room', { code: saved.code, playerName, playerToken: saved.playerToken })
      }
    }
    const onRejoined = ({ room: r }) => setRoom(r)
    socket.on('connect', onConnect)
    socket.on('cards_rejoined', onRejoined)
    return () => {
      socket.off('connect', onConnect)
      socket.off('cards_rejoined', onRejoined)
    }
  }, [gameMode, socket, playerName])

  // Connect socket for online mode
  const connectSocket = () => {
    const s = io(API_URL, { transports:['websocket','polling'] })
    setSocket(s)
    return s
  }

  const handleStartLocal = (players, packs) => {
    setLocalPlayers(players); setPacks(packs); setGameMode('local'); setPhase('game')
  }

  const handleCreateOnline = (packs, name) => {
    if (!name?.trim()) return
    const s = connectSocket()
    setGlobalSocket(s)
    setPlayerName(name.trim()); setPacks(packs); setIsHost(true); setGameMode('online'); setPhase('connecting')
    const selectedIds = ALL_PACKS.filter(p=>packs.black.some(c=>PACKS[p.id]?.black.includes(c))).map(p=>p.id)
    s.emit('create_room', { playerName:name.trim(), packs:selectedIds.length>0?selectedIds:['base'] })
    s.on('room_created', ({code,room:r,playerToken})=>{
      setRoom({...r,code})
      setPhase('lobby')
      saveCardsSession({ code, playerName: name.trim(), isHost: true, playerToken })
    })
    s.on('room_updated', r=>setRoom(r))
    s.on('error', msg=>{ alert(msg); setPhase('setup'); s.disconnect() })
    s.on('connect_error', ()=>{ alert('Não foi possível conectar. Tenta de novo.'); setPhase('setup'); s.disconnect() })
    s.on('connect_failed', ()=>{ alert('Não foi possível conectar. Tenta de novo.'); setPhase('setup'); s.disconnect() })
  }

  const handleStartOnlineGame = () => {
    if (!socket||!room) return
    socket.once('game_started', state => {
      setGameState(state)
      setPhase('game')
    })
    socket.once('your_hand', hand => {
      setInitialHand(hand)
      setMyHand(hand)
    })
    socket.emit('start_game',{code:room.code,cardData:packs})
  }

  if(phase==='setup') return <SetupScreen onCreateOnline={handleCreateOnline} initialName={playerName}/>
  if(phase==='connecting') return (
    <NightShell onBack={() => navigate('/CardsLobby')}>
      <NightTitle>Cartas</NightTitle>
      <p className="mt-8 text-center text-sm text-white/45">A criar a sala…</p>
    </NightShell>
  )
  if(phase==='lobby') return <OnlineLobby room={room} playerName={playerName} onStart={handleStartOnlineGame}/>
  return <GameScreen mode={gameMode} socket={socket} room={room} playerName={playerName} players={localPlayers} packs={packs} initialHand={initialHand} initialGameState={gameState} isHost={isHost}/>
}
