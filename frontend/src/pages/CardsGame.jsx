import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Crown, RotateCcw, Copy, Check, Users, Wifi } from 'lucide-react'
import { shuffle } from '../utils/game'
import { io } from 'socket.io-client'
import { getGlobalSocket, setGlobalSocket, peekCardsLobbyHandoff, clearCardsLobbyHandoff } from '../utils/socketStore'
const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001`

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
}
const ALL_PACKS = Object.values(PACKS)

// ── SETUP SCREEN ─────────────────────────────────────────────
function SetupScreen({ onCreateOnline }) {
  const navigate = useNavigate()
  const [selPacks, setSelPacks] = useState(['base','dark'])

  const togglePack = id => setSelPacks(s=>s.includes(id)?(s.length>1?s.filter(x=>x!==id):s):[...s,id])

  return (
    <div className="min-h-screen bg-[#080b14] flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={()=>navigate('/')} className="text-slate-400 hover:text-white p-1"><ChevronLeft className="w-5 h-5"/></button>
          <div><h1 className="text-white font-black text-2xl">🃏 Modo Cartas</h1><p className="text-slate-500 text-sm">Cria sala e partilha o código no telemóvel</p></div>
        </div>

        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-4">
          <p className="text-slate-400 text-sm mb-2">Modo apenas online</p>
          <p className="text-white font-semibold">Cada jogador abre <span className="text-amber-300">/CardsLobby</span> no seu telemóvel e usa o código da sala.</p>
        </div>

        {/* Packs */}
        <div>
          <h3 className="text-white font-semibold mb-3">Baralhos</h3>
          <div className="space-y-2">
            {ALL_PACKS.map(pack=>(
              <button key={pack.id} onClick={()=>togglePack(pack.id)}
                className={`w-full p-4 rounded-2xl border flex items-start gap-3 text-left transition-all ${selPacks.includes(pack.id)?'bg-amber-500/10 border-amber-500/40':'bg-white/[0.04] border-white/[0.07]'}`}>
                <div className="flex-1">
                  <p className={`font-bold ${selPacks.includes(pack.id)?'text-white':'text-slate-400'}`}>{pack.name}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{pack.desc} · {pack.black.length} pretas + {pack.white.length} brancas</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${selPacks.includes(pack.id)?'bg-amber-500 border-amber-400':'border-white/[0.2]'}`}>
                  {selPacks.includes(pack.id)&&<div className="w-2 h-2 bg-black rounded-full"/>}
                </div>
              </button>
            ))}
          </div>
          <p className="text-slate-600 text-xs mt-2 text-center">
            Total: {selPacks.reduce((s,id)=>s+(PACKS[id]?.black.length||0),0)} pretas + {selPacks.reduce((s,id)=>s+(PACKS[id]?.white.length||0),0)} brancas
          </p>
        </div>

        <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.97}}
          onClick={() => {
            const packs = {black:shuffle(selPacks.flatMap(id=>PACKS[id]?.black||[])),white:shuffle(selPacks.flatMap(id=>PACKS[id]?.white||[]))}
            onCreateOnline(packs)
          }}
          disabled={selPacks.length===0}
          className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-black rounded-2xl py-5 text-xl disabled:opacity-40">
          📡 Criar Sala Online
        </motion.button>
      </div>
    </div>
  )
}

// ── ONLINE LOBBY ─────────────────────────────────────────────
function OnlineLobby({ socket, room, playerName, packs, onStart }) {
  const [copied, setCopied] = useState(false)
  const isHost = room?.host === playerName
  const nonSelf = (room?.players||[]).filter(p=>p.name!==playerName)

  const copy = async () => {
    try { await navigator.clipboard.writeText(room.code) }
    catch { const el=document.createElement('input');el.value=room.code;document.body.appendChild(el);el.select();document.execCommand('copy');document.body.removeChild(el) }
    setCopied(true); setTimeout(()=>setCopied(false),2000)
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-[#080b14] flex items-center justify-center px-4 py-8">
        <div className="text-center space-y-4 p-6 rounded-3xl border border-white/[0.08] bg-white/[0.04]">
          <p className="text-white font-bold text-xl">A carregar a sala...</p>
          <p className="text-slate-400 text-sm">A sala está a ser criada. Aguarda um momento e não feches a página.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#080b14] flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex items-center gap-2">
          <Wifi className="text-green-400 w-5 h-5"/>
          <h2 className="text-white font-black text-xl">Sala Online</h2>
        </div>

        <div className="bg-white/[0.04] border border-white/[0.07] rounded-3xl p-6 text-center space-y-4">
          <p className="text-slate-400 text-sm">Código da sala</p>
          <p className="text-white font-black text-5xl tracking-[0.2em]">{room?.code}</p>
          <button onClick={copy}
            className={`w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all ${copied?'bg-green-500/20 border border-green-500/50 text-green-400':'bg-violet-600/20 border border-violet-500/50 text-violet-300'}`}>
            {copied?<><Check className="w-5 h-5"/>Copiado!</>:<><Copy className="w-5 h-5"/>Copiar Código</>}
          </button>
          <p className="text-slate-600 text-xs">Abre <span className="text-white">{window.location.origin}/CardsLobby</span> nos outros telemóveis</p>
        </div>

        <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="text-slate-400 w-4 h-4"/>
            <p className="text-slate-400 text-sm font-semibold">{room?.players?.length||1} jogador{room?.players?.length!==1?'es':''}</p>
            <motion.div animate={{rotate:360}} transition={{repeat:Infinity,duration:2,ease:'linear'}} className="ml-auto w-3 h-3 border border-violet-500 border-t-transparent rounded-full"/>
          </div>
          {(room?.players||[]).map((p,i)=>(
            <div key={i} className="flex items-center gap-3 mb-2">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm ${i===0?'bg-gradient-to-br from-violet-500 to-purple-600':'bg-gradient-to-br from-slate-600 to-slate-700'}`}>{p.name[0]}</div>
              <span className="text-white font-medium">{p.name}{p.name===playerName?' (Tu)':''}</span>
              {i===0&&<span className="ml-auto text-xs text-violet-400 font-bold">HOST</span>}
            </div>
          ))}
        </div>

        {isHost?(
          <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.97}} onClick={onStart}
            disabled={(room?.players?.length||0)<2}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black rounded-2xl py-5 text-xl disabled:opacity-40">
            ▶ Iniciar Jogo ({room?.players?.length} jogadores)
          </motion.button>
        ):(
          <p className="text-slate-400 text-center py-4">⏳ À espera que o host inicie...</p>
        )}
      </div>
    </div>
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
  const [gameEnded,    setGameEnded]    = useState(false)
  const [finalScores,  setFinalScores]  = useState([])
  const [czarId,       setCzarId]       = useState(null)

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
      setSubmissions({})
      setRevealed(false)
      setRoundWinner(null)
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
      setRoundWinner(d.winnerId)
      setScores(Object.fromEntries(d.scores.map((s) => [s.name, s.score])))
    }
    const onNewRound = (d) => {
      setRoundNum(d.round)
      setCzarId(d.czarId)
      if (typeof d.czarIdx === 'number') setCzarIdx(d.czarIdx)
      setCurrentBlack(d.blackCard)
      setSubmissions({})
      setRevealed(false)
      setRoundWinner(null)
      setSubCount({ count: 0, total: 0, allDone: false })
    }
    const onGameEnded = (d) => {
      setGameEnded(true)
      setFinalScores(d.scores)
    }

    socket.on('game_started', onGameStarted)
    socket.on('your_hand', onYourHand)
    socket.on('submission_update', onSubUpdate)
    socket.on('cards_revealed', onCardsRevealed)
    socket.on('round_ended', onRoundEnded)
    socket.on('new_round', onNewRound)
    socket.on('game_ended', onGameEnded)
    return () => {
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
  const onlineSubmit = card => socket.emit('submit_card',{code:initialRoom.code,cardText:card})
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
  const imCzar = mode==='online'?(czarId===socket?.id):false

  // For local: current player whose turn it is to play
  const [localTurnIdx, setLocalTurnIdx] = useState(0)
  const localTurnPlayer = mode==='local'?(nonCzars[localTurnIdx]||null):null

  const handleLocalCardPick = (card) => {
    localSubmit(localTurnPlayer, card)
    const next = localTurnIdx+1
    if(next>=nonCzars.length) setLocalTurnIdx(0)
    else setLocalTurnIdx(next)
  }

  // Game ended
  if(gameEnded) return(
    <div className="min-h-screen bg-[#080b14] flex flex-col items-center justify-center px-4 text-center gap-6">
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
        <button onClick={()=>window.location.reload()} className="px-6 py-3 rounded-2xl bg-white/[0.07] text-white font-bold flex items-center gap-2"><RotateCcw className="w-4 h-4"/>Novo</button>
        <button onClick={()=>navigate('/')} className="px-6 py-3 rounded-2xl bg-violet-600 text-white font-bold">Início</button>
      </div>
    </div>
  )

  // Current hand to display
  const displayHand = mode==='online' ? myHand : (hands[localTurnPlayer]||[])
  const allSub = mode==='local' ? nonCzars.every(p=>submissions[p]) : subCount.allDone
  const mySubmitted = mode==='online' ? (socket && Object.keys(submissions).includes(socket.id)) : (localTurnPlayer && submissions[localTurnPlayer])

  return(
    <div className="min-h-screen bg-[#080b14] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/[0.06]">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <button onClick={()=>navigate('/')} className="text-slate-400 hover:text-white p-1"><ChevronLeft className="w-5 h-5"/></button>
          <div className="flex items-center gap-2"><Crown className="text-amber-400 w-4 h-4"/><span className="text-white font-bold text-sm">R{roundNum} · Czar: {czarName}</span></div>
          <div className="flex gap-1.5">{players.map(p=><div key={p} className="text-center"><p className={`text-xs font-black ${p===czarName?'text-amber-400':'text-white'}`}>{scores[p]||0}</p><p className="text-slate-600 text-xs">{p.split(' ')[0]}</p></div>)}</div>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-4">
        {/* Black card */}
        <div className="bg-black border border-white/20 rounded-3xl p-6 text-center min-h-28 flex items-center justify-center">
          <p className="text-white font-black text-xl leading-snug">{currentBlack}</p>
        </div>

        {/* Submission status */}
        {!revealed&&(
          <div className="flex items-center justify-between">
            <p className="text-slate-400 text-sm">
              {mode==='online'?`${subCount.count||0}/${subCount.total||nonCzars.length} submeteram`:`${Object.keys(submissions).length}/${nonCzars.length} submeteram`}
            </p>
            {allSub&&(mode==='local'||imCzar)&&!revealed&&(
              <button onClick={doReveal} className="bg-amber-500 text-black font-bold rounded-xl px-4 py-2 text-sm">Revelar →</button>
            )}
          </div>
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
        {mode==='online'&&!revealed&&!imCzar&&!mySubmitted&&(
          <div className="min-h-0 shrink-0">
            <p className="text-white font-bold mb-2 text-center">{playerName}, escolhe a tua carta:</p>
            <div className="flex gap-2 overflow-x-auto pb-2 min-h-[5.5rem] touch-pan-x" style={{scrollbarWidth:'none'}}>
              {myHand.map((card,i)=>(
                <motion.button key={i} whileHover={{y:-4}} whileTap={{scale:0.96}}
                  onClick={()=>onlineSubmit(card)}
                  className="flex-shrink-0 w-32 bg-white rounded-2xl p-3 text-slate-900 text-xs font-semibold text-center leading-snug shadow-lg min-h-20 flex items-center justify-center">
                  {card}
                </motion.button>
              ))}
            </div>
          </div>
        )}
        {mode==='online'&&!revealed&&!imCzar&&mySubmitted&&(
          <div className="text-center py-4 bg-white/[0.04] rounded-2xl border border-white/[0.07]">
            <p className="text-green-400 font-bold">✅ Carta submetida!</p>
            <p className="text-slate-500 text-sm mt-1">À espera dos outros...</p>
          </div>
        )}
        {mode==='online'&&!revealed&&imCzar&&(
          <div className="text-center py-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
            <Crown className="text-amber-400 w-6 h-6 mx-auto mb-1"/>
            <p className="text-amber-400 font-bold">És o Czar!</p>
            <p className="text-slate-400 text-sm">Aguarda que todos submetam as cartas.</p>
          </div>
        )}

        {/* Revealed submissions */}
        {revealed&&(
          <div className="space-y-3">
            <p className="text-white font-bold text-center">{czarName}, escolhe a melhor carta!</p>
            {Object.entries(submissions).map(([pid,card])=>(
              <motion.button key={pid} whileHover={{scale:1.02}} whileTap={{scale:0.97}}
                onClick={()=>{
                  if (roundWinner) return
                  if (mode==='online' && !imCzar) return
                  pickWinner(pid)
                }}
                className={`w-full text-left bg-white rounded-2xl p-5 transition-all ${roundWinner===pid?'ring-4 ring-amber-400 shadow-xl':''} ${roundWinner&&roundWinner!==pid?'opacity-40':''} ${mode==='online'&&!imCzar?'opacity-60 pointer-events-none':''}`}>
                <p className="text-slate-900 font-black text-lg">{card}</p>
                {roundWinner===pid&&<p className="text-amber-600 text-sm font-bold mt-2">👑 Vencedor desta ronda!</p>}
              </motion.button>
            ))}
            {roundWinner&&(mode!=='online'||isHost)&&(
              <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.97}} onClick={nextRound}
                className="w-full bg-gradient-to-r from-violet-600 to-purple-700 text-white font-bold rounded-2xl py-4">
                Próxima Ronda →
              </motion.button>
            )}
            {roundWinner&&mode==='online'&&!isHost&&(
              <p className="text-slate-500 text-center text-sm">O host vai avançar para a próxima ronda.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── ROOT COMPONENT ────────────────────────────────────────────
export default function CardsGame() {
  const location = useLocation()
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

    if (handoff) {
      setTimeout(() => clearCardsLobbyHandoff(), 0)
    }
  }, [location.state])

  // Connect socket for online mode
  const connectSocket = () => {
    const s = io(API_URL, { transports:['websocket','polling'] })
    setSocket(s)
    return s
  }

  const handleStartLocal = (players, packs) => {
    setLocalPlayers(players); setPacks(packs); setGameMode('local'); setPhase('game')
  }

  const handleCreateOnline = (packs) => {
    const name = prompt('O teu nome?')
    if (!name?.trim()) return
    const s = connectSocket()
    setGlobalSocket(s)
    setPlayerName(name.trim()); setPacks(packs); setIsHost(true); setGameMode('online'); setPhase('connecting')
    const selectedIds = ALL_PACKS.filter(p=>packs.black.some(c=>PACKS[p.id]?.black.includes(c))).map(p=>p.id)
    s.emit('create_room', { playerName:name.trim(), packs:selectedIds.length>0?selectedIds:['base'] })
    s.on('room_created', ({code,room:r})=>{ setRoom({...r,code}); setPhase('lobby') })
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

  if(phase==='setup') return <SetupScreen onCreateOnline={handleCreateOnline}/>
  if(phase==='connecting') return (
    <div className="min-h-screen bg-[#080b14] flex items-center justify-center px-4 py-8">
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full border-4 border-violet-500 border-t-transparent animate-spin" />
        <h1 className="text-white font-black text-2xl">A criar sala...</h1>
        <p className="text-slate-400">Aguarda enquanto a sala é gerada e os outros jogadores se podem juntar.</p>
      </div>
    </div>
  )
  if(phase==='lobby') return <OnlineLobby socket={socket} room={room} playerName={playerName} packs={packs} onStart={handleStartOnlineGame}/>
  return <GameScreen mode={gameMode} socket={socket} room={room} playerName={playerName} players={localPlayers} packs={packs} initialHand={initialHand} initialGameState={gameState} isHost={isHost}/>
}
