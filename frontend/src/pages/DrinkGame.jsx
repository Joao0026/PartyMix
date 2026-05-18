import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, RotateCcw, Check, Sparkles, Lock, PartyPopper } from 'lucide-react'
import { shuffle } from '../utils/game'
import { api } from '../utils/api'

// ── DECK CATEGORIES ──────────────────────────────────────────
const DECK_CATEGORIES = [
  {
    id: 'waterfall', label: '🌊 Waterfall & Beber', desc: 'Quem bebe, bebe muito', premium: false,
    cards: [
      {type:'beber',emoji:'🌊',title:'Waterfall!',text:'O da esquerda começa a beber. Só podes parar quando a pessoa à tua esquerda parar!'},
      {type:'beber',emoji:'🍺',title:'Bebe 2!',text:'O jogador com o cabelo mais comprido bebe 2 golos.'},
      {type:'beber',emoji:'🍺',title:'Último a reagir!',text:'O último a pôr o dedo no nariz bebe 3 golos.'},
      {type:'beber',emoji:'🍺',title:'Redes Sociais!',text:'Toda a gente com redes sociais instaladas bebe 1 golo.'},
      {type:'beber',emoji:'🍺',title:'Mais velho / Mais novo!',text:'O mais novo bebe 2. O mais velho distribui 2.'},
      {type:'beber',emoji:'🍺',title:'Bateria!',text:'Quem tem o telemóvel com menos de 30% bebe 2 golos.'},
      {type:'beber',emoji:'🍺',title:'Notificações!',text:'O jogador com mais notificações não lidas bebe 3 golos.'},
      {type:'beber',emoji:'💪',title:'Ginásio!',text:'Quem foi ao ginásio esta semana não bebe. Os outros bebem 2.'},
      {type:'beber',emoji:'🏁',title:'Corrida!',text:'Vira o copo — quem acabar primeiro distribui 3. O último bebe mais 2.'},
      {type:'beber',emoji:'💬',title:'WhatsApp!',text:'Quem tiver mais de 100 contactos no WhatsApp bebe 1.'},
      {type:'beber',emoji:'🎨',title:'Tatuagens!',text:'Quem tiver tatuagens bebe 1 por cada tatuagem (máx. 3).'},
      {type:'beber',emoji:'👟',title:'Sapatos!',text:'Quem está de sapatilhas distribui 2. Quem está descalço bebe 2.'},
      {type:'beber',emoji:'😴',title:'Dorminhoco!',text:'Quem acordou depois das 10h hoje bebe 2 golos.'},
      {type:'beber',emoji:'🎵',title:'Música!',text:'O último a nomear uma música portuguesa bebe 2.'},
      {type:'beber',emoji:'📱',title:'Ecrã partido!',text:'Quem tem o ecrã do telemóvel partido bebe 1.'},
    ]
  },
  {
    id: 'eununca', label: '🙅 Eu Nunca', desc: 'Confissões garantidas', premium: false,
    cards: [
      {type:'desafio',emoji:'🙅',title:'Eu Nunca',text:'EU NUNCA — Diz algo que nunca fizeste. Quem já fez bebe 1!'},
      {type:'desafio',emoji:'🙅',title:'Eu Nunca',text:'EU NUNCA bebi até adormecer numa festa.'},
      {type:'desafio',emoji:'🙅',title:'Eu Nunca',text:'EU NUNCA fiz algo ilegal e não fui apanhado.'},
      {type:'desafio',emoji:'🙅',title:'Eu Nunca',text:'EU NUNCA fingi estar doente para não ir trabalhar.'},
      {type:'desafio',emoji:'🙅',title:'Eu Nunca',text:'EU NUNCA li as mensagens de outra pessoa sem ela saber.'},
      {type:'desafio',emoji:'🙅',title:'Eu Nunca',text:'EU NUNCA fui a uma consulta médica de ressaca.'},
      {type:'desafio',emoji:'🙅',title:'Eu Nunca',text:'EU NUNCA enviei uma mensagem ao ex que me arrependi.'},
      {type:'desafio',emoji:'🙅',title:'Eu Nunca',text:'EU NUNCA menti numa entrevista de emprego.'},
      {type:'desafio',emoji:'🙅',title:'Eu Nunca',text:'EU NUNCA chorei com um filme de animação.'},
      {type:'desafio',emoji:'🙅',title:'Eu Nunca',text:'EU NUNCA passei uma noite inteira sem dormir.'},
      {type:'desafio',emoji:'🙅',title:'Eu Nunca',text:'EU NUNCA bloqueei alguém sem dar explicação.'},
      {type:'desafio',emoji:'🙅',title:'Eu Nunca',text:'EU NUNCA comprei algo que nunca usei.'},
      {type:'desafio',emoji:'🙅',title:'Eu Nunca',text:'EU NUNCA roubei algo (mesmo que pequeno).'},
      {type:'desafio',emoji:'🙅',title:'Eu Nunca',text:'EU NUNCA fiz xixi numa piscina.'},
      {type:'desafio',emoji:'🙅',title:'Eu Nunca',text:'EU NUNCA dei um beijo em alguém do grupo.'},
    ]
  },
  {
    id: 'regras', label: '📜 Regras', desc: 'Cria caos', premium: false,
    cards: [
      {type:'regra',emoji:'📜',title:'Nova Regra!',text:'Quem disser "sim" ou "não" bebe 1 golo até ao fim do jogo!'},
      {type:'regra',emoji:'📜',title:'Nova Regra!',text:'Toda a gente fala com sotaque britânico até à próxima regra.'},
      {type:'regra',emoji:'📜',title:'Nova Regra!',text:'Não podes apontar com o dedo. Usa o cotovelo. Quem apontar bebe.'},
      {type:'regra',emoji:'📜',title:'Nova Regra!',text:'Tens de dizer "com licença" antes de falar. Quem se esquecer bebe.'},
      {type:'regra',emoji:'📜',title:'Nova Regra!',text:'O teu nome agora é "Rei/Rainha [apelido]". Quem não usar o título bebe.'},
      {type:'regra',emoji:'📜',title:'Nova Regra!',text:'Só podes beber com a mão não dominante.'},
      {type:'regra',emoji:'📜',title:'Nova Regra!',text:'Quem rir bebe 1 golo. Sorrisos também contam.'},
      {type:'regra',emoji:'📜',title:'Nova Regra!',text:'Termina cada frase com "...e foi assim que perdi o emprego".'},
      {type:'regra',emoji:'📜',title:'Nova Regra!',text:'Fala em voz de pato durante as próximas 3 rondas.'},
      {type:'regra',emoji:'📜',title:'Nova Regra!',text:'Só podes falar se nomeares alguém antes: "João, eu acho que..."'},
      {type:'regra',emoji:'📜',title:'Nova Regra!',text:'Beber só após contar até 3 em voz alta. Quem se esquecer bebe extra.'},
      {type:'regra',emoji:'📜',title:'Nova Regra!',text:'Ninguém pode dizer o nome de ninguém. Só alcunhas. Quem errar bebe.'},
      {type:'regra',emoji:'💥',title:'REGRAS CANCELADAS!',text:'Todas as regras ativas ficam canceladas. Alívio geral! Brindem!'},
    ]
  },
  {
    id: 'caos', label: '💥 Caos', desc: 'Regras temporárias e viragens de mesa', premium: false,
    cards: [
      {type:'caos',emoji:'💥',title:'Caos!',text:'Durante 3 rondas, quem disser nomes próprios bebe 1 golo.'},
      {type:'caos',emoji:'💥',title:'Caos!',text:'Até sair outra carta Caos, todos têm de beber com a mão trocada.'},
      {type:'caos',emoji:'💥',title:'Caos!',text:'Durante 5 minutos, quem fizer perguntas bebe. Responder com pergunta também conta.'},
      {type:'caos',emoji:'💥',title:'Caos!',text:'O grupo cria uma palavra proibida. Quem a disser bebe 2.'},
      {type:'caos',emoji:'💥',title:'Caos!',text:'Inverte a ordem dos turnos. Quem se enganar bebe 1.'},
      {type:'caos',emoji:'💥',title:'Caos!',text:'Todos escolhem uma alcunha. Até ao fim da ronda, usar nomes reais faz beber.'},
    ]
  },
  {
    id: 'especiais', label: '🛡️ Especiais', desc: 'Agentes, alianças, espelhos e mini bosses', premium: false,
    cards: [
      {type:'alliance',emoji:'🤝',title:'Aliança!',text:'Escolhe o jogador à tua esquerda. Durante 2 rondas ficam ligados: se um beber, o outro bebe 1; se um falhar desafio, sofre junto.'},
      {type:'alliance',emoji:'🤝',title:'Aliança Cruzada!',text:'Ficas ligado ao próximo jogador durante 2 rondas: quando um beber ou falhar, o outro sofre junto.'},
      {type:'mirror',emoji:'🛡️',title:'Espelho!',text:'Ganhas um escudo. Ficas imune à próxima carta de beber e podes passar essa penalização para outro jogador.'},
      {type:'mirror',emoji:'🪞',title:'Reflexo Rápido!',text:'Guarda esta proteção: a próxima penalização que te calhar pode ser refletida para outra pessoa.'},
      {type:'miniboss',emoji:'👹',title:'Mini Boss!',text:'Todos têm 20 segundos para nomear 10 marcas portuguesas. Se conseguirem, todos distribuem 2. Se falharem, todos bebem 2.'},
      {type:'miniboss',emoji:'👹',title:'Mini Boss!',text:'A mesa tem 30 segundos para cantar em conjunto um refrão inteiro sem parar. Vitória: todos distribuem 2. Falha: todos bebem 2.'},
      {type:'miniboss',emoji:'👹',title:'Mini Boss!',text:'Sem repetir, digam 12 cidades portuguesas em 25 segundos. Vitória: todos distribuem 2. Falha: todos bebem 2.'},
    ]
  },
  {
    id: 'desafios', label: '⚡ Desafios', desc: 'Mini-jogos relâmpago', premium: false,
    cards: [
      {type:'desafio',emoji:'⚡',title:'Categories',text:'Escolhe uma categoria. Cada um diz uma palavra. Quem repetir ou parar bebe 2.'},
      {type:'desafio',emoji:'⚡',title:'Rima!',text:'Diz uma palavra. Cada um diz uma rima. Quem falhar bebe 2.'},
      {type:'desafio',emoji:'⚡',title:'2 Verdades 1 Mentira',text:'2 verdades e 1 mentira. Quem não adivinhar a mentira bebe.'},
      {type:'desafio',emoji:'⚡',title:'Thumbmaster',text:'Quando quiseres pões o polegar na mesa. O último bebe.'},
      {type:'desafio',emoji:'⚡',title:'Contagem 21',text:'Contam até 21, cada um diz 1, 2 ou 3 números. Quem diz 21 bebe e cria regra.'},
      {type:'desafio',emoji:'⚡',title:'Telefone Estragado',text:'Sussurra frase ao ouvido. O último diz em voz alta. Quem errou mais bebe 2.'},
      {type:'desafio',emoji:'⚡',title:'Duelo!',text:'Escolhe adversário. Pedra-papel-tesoura melhor de 3. Perdedor bebe 3.'},
      {type:'desafio',emoji:'⚡',title:'Mímica Rápida',text:'30s para imitar o que o jogador à esquerda escreve em papel.'},
      {type:'desafio',emoji:'⚡',title:'Confissão Anónima',text:'Todos escrevem uma confissão. Lê em voz alta. Grupo vota em quem é.'},
      {type:'desafio',emoji:'⚡',title:'Nomes Famosos',text:'Diz nome famoso. Seguinte diz outro começando pela última letra. Quem parar bebe.'},
      {type:'desafio',emoji:'⚡',title:'Verdade ou Bebida',text:'O grupo faz uma pergunta comprometedora. Respondes ou bebes 3.'},
      {type:'desafio',emoji:'⚡',title:'Copos!',text:'Bate a mesa 3 vezes. Toda a gente bebe. Quem bater 4 vezes distribui mais 2.'},
    ]
  },
  {
    id: 'poder', label: '👑 Poder & Sorte', desc: 'Distribui e recebe', premium: false,
    cards: [
      {type:'poder',emoji:'👑',title:'Poder!',text:'Distribui 4 golos como quiseres pelo grupo.'},
      {type:'poder',emoji:'👑',title:'Poder!',text:'Escolhe quem é imune à próxima carta.'},
      {type:'poder',emoji:'👑',title:'Poder!',text:'Crias uma nova regra por 5 minutos. O que quiseres.'},
      {type:'poder',emoji:'👑',title:'Poder!',text:'Podes trocar o teu copo com qualquer jogador.'},
      {type:'poder',emoji:'👑',title:'Poder!',text:'Escolhe 2 jogadores para pedra-papel-tesoura. Perdedor bebe 3.'},
      {type:'poder',emoji:'👑',title:'Poder!',text:'Dá uma missão secreta a um jogador. Eles têm de a cumprir até ao fim.'},
      {type:'sorte',emoji:'🍀',title:'Sorte!',text:'Não bebes durante 2 rondas. Imune a tudo!'},
      {type:'sorte',emoji:'🍀',title:'Sorte!',text:'Devolves a próxima carta que te calhar a quem a tirou.'},
      {type:'sorte',emoji:'🍀',title:'Sorte!',text:'Escolhes o que o jogador à tua esquerda bebe.'},
      {type:'azar',emoji:'💀',title:'Azar!',text:'Bebes o dobro de tudo até ao fim desta ronda.'},
      {type:'azar',emoji:'💀',title:'Azar!',text:'O grupo decide o que bebes a seguir. Tens de aceitar.'},
      {type:'azar',emoji:'💀',title:'Azar!',text:'Bebe 2 agora + o grupo vota se bebes mais 1 ou não.'},
    ]
  },
  {
    id: 'picante', label: '🔥 Picante', desc: 'Para adultos', premium: false,
    cards: [
      {type:'desafio',emoji:'🔥',title:'Picante!',text:'Conta algo que nunca disseste a ninguém aqui — vida amorosa. Ou bebe 3.'},
      {type:'desafio',emoji:'🔥',title:'Picante!',text:'Com quem da sala ficarias se fosse o fim do mundo?'},
      {type:'desafio',emoji:'🔥',title:'Picante!',text:'Descreve o teu maior fantasma em 30 segundos. Quem não o fizer bebe 3.'},
      {type:'desafio',emoji:'🔥',title:'Picante!',text:'Troca uma item de roupa com o jogador à tua esquerda durante 5 minutos.'},
      {type:'desafio',emoji:'🔥',title:'Picante!',text:'Manda uma mensagem ao teu ex: "Estava a pensar em ti." Mostra a resposta.'},
      {type:'desafio',emoji:'🔥',title:'Picante!',text:'Revela o crush secreto mais embaraçoso da tua vida.'},
      {type:'desafio',emoji:'🔥',title:'Picante!',text:'Liga para alguém fora desta sala e diz "precisamos de falar". Mostra a reação.'},
      {type:'desafio',emoji:'🔥',title:'Picante!',text:'Mostra o histórico de pesquisa do teu telemóvel ao grupo. Ou bebe 4.'},
      {type:'desafio',emoji:'🔥',title:'Picante!',text:'Diz o nome da pessoa da sala que mais te atrai. Ou bebe 3.'},
      {type:'desafio',emoji:'🔥',title:'Picante!',text:'Lê a última mensagem enviada no WhatsApp em voz alta. Ou bebe 2.'},
    ]
  },
  // Premium placeholder — easy to unlock
  {
    id: 'extreme', label: '💣 Extremo 🔒', desc: 'Só para os verdadeiramente corajosos', premium: false,
    cards: []
  },
]

const SECRET_AGENT_CARDS = [
  {
    type:'agent', emoji:'🕵️', title:'Agente Secreto',
    publicText:'Missão pública: faz uma pergunta inocente ao grupo e continua o jogo normalmente.',
    secretMission:'Missão secreta: faz alguém dizer o nome de um cantor. Se conseguires antes do teu próximo turno, distribuis 3 golos.',
  },
  {
    type:'agent', emoji:'🕵️', title:'Agente Secreto',
    publicText:'Missão pública: elogia alguém da mesa.',
    secretMission:'Missão secreta: faz outro jogador tocar no teu ombro. Se conseguires, escolhes alguém para beber 2.',
  },
  {
    type:'agent', emoji:'🕵️', title:'Agente Secreto',
    publicText:'Missão pública: escolhe uma pessoa para contar uma história rápida.',
    secretMission:'Missão secreta: faz alguém dizer uma cor. Se conseguires, ficas imune à próxima carta.',
  },
  {
    type:'agent', emoji:'🕵️', title:'Agente Secreto',
    publicText:'Missão pública: todos brindam e alguém escolhe o próximo tema de conversa.',
    secretMission:'Missão secreta: faz alguém perguntar “porquê?”. Se conseguires, essa pessoa bebe 2.',
  },
]

// ── ROULETTE ─────────────────────────────────────────────────
const ROULETTE_SEGS=[
  {label:'Bebe 2',color:'#f59e0b',action:'drink',val:2},
  {label:'Desafio!',color:'#06b6d4',action:'challenge'},
  {label:'Distribui 3',color:'#8b5cf6',action:'give',val:3},
  {label:'Bebe 1',color:'#ef4444',action:'drink',val:1},
  {label:'Sorte!',color:'#10b981',action:'lucky'},
  {label:'Bebe 3',color:'#f43f5e',action:'drink',val:3},
  {label:'Regra!',color:'#a855f7',action:'rule'},
  {label:'Waterfall',color:'#3b82f6',action:'waterfall'},
]

function Roulette({players,currentPlayerIdx}){
  const [totalRot,setTotalRot]=useState(0)
  const [spinning,setSpinning]=useState(false)
  const [result,setResult]=useState(null)
  const n=ROULETTE_SEGS.length
  const step=360/n
  const cx=130,cy=130,r=122
  const player=players[currentPlayerIdx]

  const spin=()=>{
    if(spinning)return
    setSpinning(true);setResult(null)
    const extra=1800+Math.floor(Math.random()*720)
    const newRot=totalRot+extra
    setTotalRot(newRot)
    setTimeout(()=>{
      // Calculate which segment the arrow points to
      // Arrow is at top (270deg). The wheel rotates clockwise.
      const normalised=(newRot%360+360)%360
      const arrowDeg=270 // top
      const offset=(arrowDeg-normalised+360)%360
      const idx=Math.floor(offset/step)%n
      setResult(ROULETTE_SEGS[idx])
      setSpinning(false)
    },3500)
  }

  const getResultText=(seg)=>{
    if(!seg)return''
    if(seg.action==='drink') return `${player?.name} bebe ${seg.val} golo${seg.val>1?'s':''}!`
    if(seg.action==='give') return `${player?.name} distribui ${seg.val} golos!`
    if(seg.action==='challenge') return `${player?.name} tem um desafio!`
    if(seg.action==='lucky') return `${player?.name} tem sorte — imune à próxima!`
    if(seg.action==='rule') return `${player?.name} cria uma regra!`
    if(seg.action==='waterfall') return `WATERFALL! ${player?.name} começa!`
    return seg.label
  }

  return(
    <div className="flex flex-col items-center gap-4">
      {/* Arrow */}
      <div className="relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
          <div className="w-0 h-0 border-l-8 border-r-8 border-b-16 border-l-transparent border-r-transparent border-b-white" style={{borderBottomWidth:20}}/>
        </div>
        <motion.div
          animate={{rotate:totalRot}}
          transition={{duration:3.5,ease:[0.23,1,0.32,1]}}
          style={{width:260,height:260}}>
          <svg width="260" height="260">
            {ROULETTE_SEGS.map((seg,i)=>{
              const sa=(i*step-90)*Math.PI/180
              const ea=((i+1)*step-90)*Math.PI/180
              const x1=cx+r*Math.cos(sa),y1=cy+r*Math.sin(sa)
              const x2=cx+r*Math.cos(ea),y2=cy+r*Math.sin(ea)
              const ma=((i+0.5)*step-90)*Math.PI/180
              const tx=cx+r*0.65*Math.cos(ma),ty=cy+r*0.65*Math.sin(ma)
              return(
                <g key={i}>
                  <path d={`M ${cx},${cy} L ${x1},${y1} A ${r},${r} 0 0,1 ${x2},${y2} Z`} fill={seg.color} stroke="rgba(0,0,0,0.3)" strokeWidth="1.5"/>
                  <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="9.5" fontWeight="bold"
                    transform={`rotate(${(i+0.5)*step},${tx},${ty})`}>{seg.label}</text>
                </g>
              )
            })}
            <circle cx={cx} cy={cy} r={16} fill="#0f172a" stroke="white" strokeWidth="2"/>
          </svg>
        </motion.div>
      </div>

      <motion.button whileHover={{scale:1.04}} whileTap={{scale:0.95}} onClick={spin} disabled={spinning}
        className="w-full text-white font-black rounded-2xl py-4 text-xl disabled:opacity-50"
        style={{background:'linear-gradient(135deg,#f59e0b,#d97706)'}}>
        {spinning?'🌀 A girar...':'🎰 GIRAR!'}
      </motion.button>

      {result&&!spinning&&(
        <motion.div initial={{scale:0.8,opacity:0}} animate={{scale:1,opacity:1}}
          className="w-full rounded-2xl p-4 text-center border"
          style={{background:`${result.color}20`,borderColor:`${result.color}50`}}>
          <p className="text-white font-black text-xl">{result.label}!</p>
          <p className="text-slate-300 text-sm mt-1">{getResultText(result)}</p>
        </motion.div>
      )}
    </div>
  )
}

// ── CARD DECK ────────────────────────────────────────────────
function CardDeck({ activeDeck, players, deckSessionId, onCardDrawn, onAgentResult, onMiniBossResult }) {
  const [deck, setDeck] = useState(() => shuffle([...activeDeck]))
  const [current, setCurrent] = useState(null)
  const [agentOpen, setAgentOpen] = useState(false)
  const [agentResult, setAgentResult] = useState(null)
  const [bossResult, setBossResult] = useState(null)
  const [recentTypes, setRecentTypes] = useState([])
  /** Índice do jogador que deve tirar a próxima carta (ou que acabou de tirar, conforme ecrã) */
  const [nextReaderIdx, setNextReaderIdx] = useState(0)
  /** Quem tirou a carta atualmente visível */
  const [lastReaderIdx, setLastReaderIdx] = useState(null)

  useEffect(() => {
    setDeck(shuffle([...activeDeck]))
    setCurrent(null)
    setAgentOpen(false)
    setAgentResult(null)
    setBossResult(null)
    setNextReaderIdx(0)
    setLastReaderIdx(null)
    setRecentTypes([])
  }, [deckSessionId, activeDeck])

  const draw = () => {
    if (!deck.length) return
    const drinkSpam = recentTypes.slice(-2).every(type => type === 'beber')
    const safeIdx = drinkSpam ? deck.findIndex(card => card.type !== 'beber') : -1
    const injectAgent = recentTypes.length >= 2 && Math.random() < 0.12
    const idx = safeIdx > 0 ? safeIdx : 0
    const card = injectAgent
      ? SECRET_AGENT_CARDS[Math.floor(Math.random()*SECRET_AGENT_CARDS.length)]
      : deck[idx]
    const rest = injectAgent ? deck : deck.filter((_, i) => i !== idx)
    const reader = nextReaderIdx % players.length
    setLastReaderIdx(reader)
    setCurrent(card)
    setAgentOpen(false)
    setAgentResult(null)
    setBossResult(null)
    setDeck(rest)
    setRecentTypes(types => [...types.slice(-2), card.type])
    setNextReaderIdx((reader + 1) % players.length)
    onCardDrawn?.(card, reader)
  }

  const n = players.length || 1
  const whoReads = current == null ? players[nextReaderIdx % n] : players[(lastReaderIdx ?? nextReaderIdx) % n]

  const TYPE_COLORS = {
    beber: 'from-amber-500 to-orange-600',
    regra: 'from-violet-600 to-purple-700',
    desafio: 'from-cyan-600 to-blue-700',
    poder: 'from-amber-400 to-yellow-500',
    sorte: 'from-emerald-600 to-teal-700',
    azar: 'from-slate-600 to-slate-800',
    caos: 'from-red-600 to-rose-700',
    ai: 'from-violet-700 to-purple-800',
    agent: 'from-slate-800 to-zinc-950',
    alliance: 'from-pink-600 to-rose-700',
    mirror: 'from-sky-600 to-indigo-700',
    miniboss: 'from-red-700 to-orange-700',
  }
  const TYPE_LABELS = {
    beber: 'Golos',
    regra: 'Regra da Mesa',
    desafio: 'Missão',
    poder: 'Poder',
    sorte: 'Sorte',
    azar: 'Azar',
    caos: 'Caos',
    ai: 'Surpresa IA',
    agent: 'Agente Secreto',
    alliance: 'Aliança',
    mirror: 'Espelho',
    miniboss: 'Mini Boss',
  }

  const resolveAgent = (outcome) => {
    setAgentResult(outcome)
    onAgentResult?.(outcome, lastReaderIdx ?? nextReaderIdx)
  }

  const resolveBoss = (outcome) => {
    setBossResult(outcome)
    onMiniBossResult?.(outcome)
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="flex items-center gap-3 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3">
        <div
          className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${whoReads?.color || 'from-slate-500 to-slate-700'} flex items-center justify-center text-white font-black text-lg flex-shrink-0`}
        >
          {whoReads?.name?.[0] || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-slate-400 text-xs uppercase tracking-[0.2em] mb-0.5">
            {current ? 'Carta tirada por' : 'Agora é a vez de'}
          </p>
          <p className="text-white font-black text-lg leading-tight truncate">{whoReads?.name || '—'}</p>
          <p className="text-slate-500 text-xs mt-1">{deck.length} cartas no baralho</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {current ? (
          <motion.div
            key={`${current.title}-${current.text || current.publicText || current.secretMission}`}
            initial={{ scale: 0.85, opacity: 0, y: -16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={`relative w-full overflow-hidden bg-gradient-to-br ${TYPE_COLORS[current.type] || 'from-violet-600 to-purple-700'} rounded-[2rem] p-8 text-center shadow-2xl min-h-[20rem] flex flex-col justify-center`}
          >
            <div className="absolute -right-8 -top-10 text-9xl opacity-15">{current.emoji}</div>
            <div className="absolute left-5 top-5 rounded-full border border-white/20 bg-black/15 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-white/75">
              {TYPE_LABELS[current.type] || 'Carta'}
            </div>
            <div className="mx-auto mb-4 grid h-24 w-24 place-items-center rounded-3xl border border-white/20 bg-white/15 text-6xl shadow-inner">
              {current.emoji}
            </div>
            <h3 className="text-white font-black text-3xl mb-4">{current.title}</h3>
            {current.type === 'agent' ? (
              <div className="space-y-3">
                {!agentOpen ? (
                  <>
                    <p className="text-white/80 text-sm font-bold">Só {whoReads?.name} deve ver a missão secreta.</p>
                    <button onClick={()=>setAgentOpen(true)} className="w-full rounded-2xl bg-white/15 border border-white/20 py-3 text-white font-black">
                      Ver missão secreta
                    </button>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4">
                      <p className="text-amber-200 text-xs font-black uppercase tracking-[0.18em] mb-1">Missão secreta</p>
                      <p className="text-white font-bold leading-relaxed">{current.secretMission}</p>
                    </div>
                    <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                      <p className="text-white/60 text-xs font-black uppercase tracking-[0.18em] mb-1">Lê isto em voz alta</p>
                      <p className="text-white/90 font-medium leading-relaxed">{current.publicText}</p>
                    </div>
                    {!agentResult ? (
                      <div className="grid grid-cols-1 gap-2 pt-1">
                        <button type="button" onClick={() => resolveAgent('success')} className="rounded-2xl bg-emerald-500 text-black py-3 font-black">
                          Consegui a missão · distribui 3
                        </button>
                        <button type="button" onClick={() => resolveAgent('fail')} className="rounded-2xl bg-white/[0.12] border border-white/15 text-white py-3 font-bold">
                          Falhei · bebe 2
                        </button>
                        <button type="button" onClick={() => resolveAgent('caught')} className="rounded-2xl bg-red-500 text-white py-3 font-black">
                          Fui apanhado · bebe 4
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-emerald-100 font-black">
                        {agentResult === 'success' && 'Missão cumprida: distribui 3 golos.'}
                        {agentResult === 'fail' && 'Missão falhada: bebe 2 golos.'}
                        {agentResult === 'caught' && 'Foste apanhado: bebe 4 golos.'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : current.type === 'miniboss' ? (
              <div className="space-y-4">
                <p className="text-white/90 font-medium leading-relaxed text-lg">{current.text}</p>
                {!bossResult ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => resolveBoss('success')} className="rounded-2xl bg-emerald-500 text-black py-3 font-black">
                      Grupo ganhou
                    </button>
                    <button type="button" onClick={() => resolveBoss('fail')} className="rounded-2xl bg-red-500 text-white py-3 font-black">
                      Grupo falhou
                    </button>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/20 bg-white/15 p-3 text-white font-black">
                    {bossResult === 'success' ? 'Vitória: todos distribuem 2 golos.' : 'Falha: todos bebem 2 golos.'}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-white/90 font-medium leading-relaxed text-lg">{current.text}</p>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="placeholder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full min-h-[14rem] bg-white/[0.04] border-2 border-dashed border-amber-500/25 rounded-[2rem] flex flex-col items-center justify-center gap-4 px-6 py-8"
          >
            <span className="text-5xl">🃏</span>
            <p className="text-white font-bold text-center text-lg">Próxima carta é tua, {whoReads?.name}!</p>
            <p className="text-slate-400 text-sm text-center leading-relaxed">
              Carrega em <span className="text-amber-400 font-semibold">Ver carta</span> em baixo. Lê em voz alta para o grupo.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {deck.length > 0 ? (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={draw}
          className="w-full bg-gradient-to-r from-violet-600 to-purple-700 text-white font-black rounded-2xl py-4 text-lg"
        >
          {current ? 'Próxima carta →' : 'Ver carta'}
        </motion.button>
      ) : (
        <div className="text-center space-y-3 w-full">
          <p className="text-emerald-400 font-bold text-lg">🏆 Baralho esgotado!</p>
          <button
            type="button"
            onClick={() => {
              setDeck(shuffle([...activeDeck]))
              setCurrent(null)
              setNextReaderIdx(0)
              setLastReaderIdx(null)
              setRecentTypes([])
            }}
            className="w-full bg-white/[0.07] text-white rounded-2xl py-3 flex items-center justify-center gap-2 font-medium"
          >
            <RotateCcw className="w-4 h-4" /> Baralhar de novo
          </button>
        </div>
      )}
    </div>
  )
}

// ── MAIN ─────────────────────────────────────────────────────
export default function DrinkGame(){
  const navigate=useNavigate()
  const [phase,setPhase]=useState('setup')
  const [playerNames,setPlayerNames]=useState(['','',''])
  const [playerDrinks,setPlayerDrinks]=useState(['','',''])
  const [selectedCats,setSelectedCats]=useState(['waterfall','eununca','desafios','especiais'])
  const [tab,setTab]=useState('deck')
  const [deckSessionId, setDeckSessionId] = useState(0)
  const [drinkStats,setDrinkStats]=useState([])
  const [activeRules,setActiveRules]=useState([])
  const [activeAlliances,setActiveAlliances]=useState([])
  const [mirrorShields,setMirrorShields]=useState([])
  const [turnCount,setTurnCount]=useState(0)
  const [surpriseCue, setSurpriseCue] = useState(false)
  const [surpriseOpen,setSurpriseOpen]=useState(false)
  const [surpriseLoading,setSurpriseLoading]=useState(false)
  const [surpriseText,setSurpriseText]=useState('')
  const [surpriseErr,setSurpriseErr]=useState(null)

  const toggleCat=id=>{
    const cat=DECK_CATEGORIES.find(c=>c.id===id)
    if(cat?.premium)return
    setSelectedCats(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id])
  }

  const players=playerNames
    .map((name,i)=>({
      name:name.trim(),
      drink:(playerDrinks[i]??'').trim(),
      color:['from-pink-400 to-rose-500','from-cyan-400 to-blue-500','from-emerald-400 to-teal-500','from-amber-400 to-orange-500','from-violet-400 to-purple-500','from-fuchsia-400 to-pink-500','from-rose-400 to-red-500','from-sky-400 to-blue-500'][i%8]
    }))
    .filter(p=>p.name)

  const activeDeck = useMemo(
    () => DECK_CATEGORIES.filter((c) => selectedCats.includes(c.id)).flatMap((c) => c.cards),
    [selectedCats]
  )

  const cardsUntilSurpriseRef = useRef(3)

  const freshStats = (count) => Array.from({ length: count }, () => ({
    drinks: 0,
    distributed: 0,
    agentSuccess: 0,
    rulesCreated: 0,
    unlucky: 0,
  }))

  const startGame = () => {
    setDrinkStats(freshStats(players.length))
    setActiveRules([])
    setActiveAlliances([])
    setMirrorShields([])
    setTurnCount(0)
    setDeckSessionId((k) => k + 1)
    setPhase('playing')
  }

  const updatePlayerStat = (playerIndex, patcher) => {
    setDrinkStats((stats) => {
      const base = stats.length === players.length ? stats : freshStats(players.length)
      return base.map((stat, idx) => (idx === playerIndex ? patcher(stat) : stat))
    })
  }

  const activeAllianceList = activeAlliances.filter((alliance) => alliance.expiresAt > turnCount)

  const registerDrink = (playerIndex, amount = 1, options = {}) => {
    if (playerIndex == null || playerIndex < 0) return
    const linkedPlayers = activeAllianceList
      .filter((alliance) => alliance.players.includes(playerIndex))
      .flatMap((alliance) => alliance.players.filter((idx) => idx !== playerIndex))

    setDrinkStats((stats) => {
      const base = stats.length === players.length ? stats : freshStats(players.length)
      return base.map((stat, idx) => {
        if (idx === playerIndex) {
          return {
            ...stat,
            drinks: stat.drinks + amount,
            unlucky: stat.unlucky + (options.unlucky ?? 1),
          }
        }
        if (linkedPlayers.includes(idx)) {
          return {
            ...stat,
            drinks: stat.drinks + 1,
            unlucky: stat.unlucky + 1,
          }
        }
        return stat
      })
    })
  }

  const registerDistributed = (playerIndex, amount = 1) => {
    if (playerIndex == null || playerIndex < 0) return
    updatePlayerStat(playerIndex, (stat) => ({ ...stat, distributed: stat.distributed + amount }))
  }

  const registerGroupDrink = (amount = 2) => {
    setDrinkStats((stats) => {
      const base = stats.length === players.length ? stats : freshStats(players.length)
      return base.map((stat) => ({ ...stat, drinks: stat.drinks + amount, unlucky: stat.unlucky + 1 }))
    })
  }

  const registerGroupDistributed = (amount = 2) => {
    setDrinkStats((stats) => {
      const base = stats.length === players.length ? stats : freshStats(players.length)
      return base.map((stat) => ({ ...stat, distributed: stat.distributed + amount }))
    })
  }

  const onCardDrawn = (card, readerIndex) => {
    const nextTurn = turnCount + 1
    setTurnCount(nextTurn)

    cardsUntilSurpriseRef.current -= 1
    if (cardsUntilSurpriseRef.current <= 0) {
      setSurpriseCue(true)
      cardsUntilSurpriseRef.current = 2 + Math.floor(Math.random() * 5)
    }

    if (card?.type === 'regra' || card?.type === 'caos') {
      if (/regras canceladas/i.test(card.title || '') || /canceladas/i.test(card.text || '')) {
        setActiveRules([])
      } else {
        setActiveRules((rules) => [
          ...rules,
          {
            id: `${Date.now()}-${Math.random()}`,
            text: card.text,
            ownerIndex: readerIndex,
            type: card.type,
            expiresAt: card.type === 'caos' ? nextTurn + 3 : null,
          },
        ])
        updatePlayerStat(readerIndex, (stat) => ({ ...stat, rulesCreated: stat.rulesCreated + 1 }))
      }
    }

    if (card?.type === 'alliance' && players.length > 1) {
      const targetIndex = (readerIndex + 1) % players.length
      setActiveAlliances((alliances) => [
        ...alliances.filter((alliance) => alliance.expiresAt > nextTurn),
        {
          id: `${Date.now()}-${Math.random()}`,
          players: [readerIndex, targetIndex],
          expiresAt: nextTurn + 2,
        },
      ])
    }

    if (card?.type === 'mirror') {
      setMirrorShields((shields) => {
        const next = [...shields]
        next[readerIndex] = (next[readerIndex] || 0) + 1
        return next
      })
    }
  }

  const handleAgentResult = (outcome, readerIndex) => {
    if (outcome === 'success') {
      registerDistributed(readerIndex, 3)
      updatePlayerStat(readerIndex, (stat) => ({ ...stat, agentSuccess: stat.agentSuccess + 1 }))
      return
    }
    registerDrink(readerIndex, outcome === 'caught' ? 4 : 2, { unlucky: outcome === 'caught' ? 2 : 1 })
  }

  const handleMiniBossResult = (outcome) => {
    if (outcome === 'success') registerGroupDistributed(2)
    else registerGroupDrink(2)
  }

  const fetchSurpriseChallenge = async () => {
    const roster = players.map((p) => ({ name: p.name, drink: p.drink || '' }))
    if (roster.length < 1) return
    setSurpriseLoading(true)
    setSurpriseErr(null)
    setSurpriseText('')
    const run = async () => {
      const out = await api.generateChallenge(roster, 'drink', 'pt')
      if (out?.error) throw new Error(out.error)
      setSurpriseText(String(out?.text || '').trim() || 'Sem texto — tenta outra vez.')
    }
    try {
      await run()
    } catch (e1) {
      try {
        await new Promise((r) => setTimeout(r, 600))
        await run()
      } catch (e2) {
        setSurpriseErr(e2?.message || e1?.message || 'Erro ao gerar desafio')
      }
    } finally {
      setSurpriseLoading(false)
    }
  }

  useEffect(() => {
    cardsUntilSurpriseRef.current = 2 + Math.floor(Math.random() * 5)
    setSurpriseCue(false)
    setSurpriseOpen(false)
  }, [deckSessionId])

  const topBy = (field) => {
    if (!players.length) return null
    return players
      .map((player, idx) => ({ player, value: drinkStats[idx]?.[field] || 0 }))
      .sort((a, b) => b.value - a.value)[0]
  }

  if(phase==='results'){
    const mostDrinks = topBy('drinks')
    const bestAgent = topBy('agentSuccess')
    const ruleKing = topBy('rulesCreated')
    const unluckiest = topBy('unlucky')
    return(
      <div className="min-h-screen flex flex-col items-center px-4 py-8" style={{background:'radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.08) 0%, #080b14 60%)'}}>
        <div className="w-full max-w-lg">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={()=>setPhase('playing')} className="text-slate-400 hover:text-white"><ChevronLeft className="w-5 h-5"/></button>
            <div>
              <h1 className="text-white font-black text-2xl">🏆 Estatísticas finais</h1>
              <p className="text-slate-500 text-sm">Resumo desta sessão do Modo Beber</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              ['🍺 Quem bebeu mais', mostDrinks, 'golos'],
              ['🕵️ Maior agente secreto', bestAgent, 'missões'],
              ['📜 Rei das regras', ruleKing, 'regras'],
              ['💀 Maior azarado', unluckiest, 'azares'],
            ].map(([label, entry, suffix])=>(
              <div key={label} className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-4">
                <p className="text-slate-400 text-xs font-black uppercase tracking-[0.14em] mb-2">{label}</p>
                <p className="text-white font-black text-xl leading-tight">{entry?.player?.name || '—'}</p>
                <p className="text-amber-300 text-sm font-bold mt-1">{entry?.value || 0} {suffix}</p>
              </div>
            ))}
          </div>

          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.04] overflow-hidden mb-5">
            {players.map((player, idx)=>{
              const stat = drinkStats[idx] || freshStats(1)[0]
              return(
                <div key={player.name} className="flex items-center gap-3 p-4 border-b border-white/[0.06] last:border-b-0">
                  <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${player.color} flex items-center justify-center text-white font-black`}>{player.name[0]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold truncate">{player.name}</p>
                    <p className="text-slate-500 text-xs">Distribuiu {stat.distributed} · Agente {stat.agentSuccess} · Regras {stat.rulesCreated}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-amber-300 font-black">{stat.drinks}</p>
                    <p className="text-slate-500 text-xs">golos</p>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={()=>setPhase('playing')} className="rounded-2xl bg-white/[0.08] border border-white/10 text-white py-3 font-bold">
              Voltar ao jogo
            </button>
            <button type="button" onClick={startGame} className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-black py-3 font-black">
              Nova sessão
            </button>
          </div>
        </div>
      </div>
    )
  }

  if(phase==='setup')return(
    <div className="min-h-screen flex flex-col items-center px-4 py-8" style={{background:'radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.08) 0%, #080b14 60%)'}}>
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={()=>navigate('/')} className="text-slate-400 hover:text-white"><ChevronLeft className="w-5 h-5"/></button>
          <div><h1 className="text-white font-black text-2xl">🍺 Modo Beber</h1><p className="text-slate-500 text-sm">Configura o teu baralho</p></div>
        </div>
        {/* Players */}
        <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 mb-4">
          <h3 className="text-white font-semibold mb-1">Quem joga?</h3>
          <p className="text-slate-500 text-xs mb-3">Opcional: o que cada um está a beber — a IA usa nos desafios surpresa (só nomes e bebidas que escreveres).</p>
          {playerNames.map((n,i)=>(
            <div key={i} className="mb-3 last:mb-0 space-y-1.5">
              <input value={n} onChange={e=>setPlayerNames(ns=>ns.map((x,j)=>j===i?e.target.value:x))}
                placeholder="Nome"
                className="w-full bg-white/[0.05] text-white rounded-xl px-4 py-2.5 outline-none border border-white/[0.08] focus:border-amber-500/50 text-sm"/>
              <input value={playerDrinks[i]??''} onChange={e=>setPlayerDrinks(ds=>ds.map((x,j)=>j===i?e.target.value:x))}
                placeholder="O que está a beber? (opcional)"
                className="w-full bg-white/[0.03] text-slate-200 rounded-xl px-4 py-2 outline-none border border-white/[0.06] focus:border-amber-500/40 text-sm placeholder-slate-600"/>
            </div>
          ))}
          {playerNames.length<8&&<button type="button" onClick={()=>{setPlayerNames(n=>[...n,'']); setPlayerDrinks(d=>[...d,''])}} className="text-amber-400 text-sm hover:text-amber-300 transition-colors">+ Adicionar jogador</button>}
        </div>
        {/* Deck categories */}
        <div className="mb-6">
          <h3 className="text-white font-semibold mb-3">Categorias do baralho</h3>
          <div className="space-y-2">
            {DECK_CATEGORIES.map(cat=>{
              const isSel=selectedCats.includes(cat.id)
              return(
                <motion.button key={cat.id} whileTap={!cat.premium?{scale:0.98}:{}} onClick={()=>toggleCat(cat.id)}
                  className={`w-full rounded-2xl p-4 flex items-center gap-3 border transition-all text-left ${cat.premium?'opacity-50 cursor-not-allowed border-white/[0.04] bg-white/[0.02]':isSel?'border-amber-500/40 bg-amber-500/8':'border-white/[0.06] bg-white/[0.03] hover:border-white/[0.15]'}`}>
                  <div className="text-2xl flex-shrink-0 w-10 text-center">{cat.label.split(' ')[0]}</div>
                  <div className="flex-1">
                    <p className={`font-bold text-sm ${isSel||cat.premium?'text-white':'text-slate-400'}`}>{cat.label}</p>
                    <p className="text-slate-500 text-xs">{cat.desc}{!cat.premium&&` · ${cat.cards.length} cartas`}</p>
                    {cat.premium&&<p className="text-amber-600 text-xs mt-0.5">Em breve — conteúdo premium</p>}
                  </div>
                  {cat.premium?<Lock className="text-slate-600 w-4 h-4 flex-shrink-0"/>
                    :<div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSel?'border-amber-400 bg-amber-500':'border-white/[0.20]'}`}>
                      {isSel&&<Check className="text-white w-3 h-3"/>}
                    </div>
                  }
                </motion.button>
              )
            })}
          </div>
        </div>
        <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.97}} onClick={startGame}
          disabled={players.length<2||selectedCats.length===0}
          className="w-full text-black font-black rounded-2xl py-5 text-xl disabled:opacity-40"
          style={{background:'linear-gradient(135deg,#f59e0b,#d97706)'}}>
          🍻 Começar! ({activeDeck.length} cartas)
        </motion.button>
      </div>
    </div>
  )

  return(
    <div className="min-h-screen flex flex-col" style={{background:'radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.08) 0%, #080b14 60%)'}}>
      <div className="p-4 border-b border-white/[0.06]">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <button onClick={()=>setPhase('setup')} className="text-slate-400 hover:text-white"><ChevronLeft className="w-5 h-5"/></button>
          <h1 className="text-white font-bold">🍺 Modo Beber</h1>
          <button type="button" onClick={()=>setPhase('results')} className="text-amber-300 text-xs font-black rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2">
            Fim
          </button>
        </div>
      </div>
      {/* Tabs */}
      <div className="flex bg-white/[0.04] mx-4 mt-4 rounded-2xl p-1 max-w-lg mx-auto w-full border border-white/[0.06]">
        {[['deck','🃏 Baralho']].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${tab===id?'bg-amber-500 text-black':'text-slate-400 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="flex-1 flex flex-col items-center px-4 py-5 max-w-lg mx-auto w-full">
        <div className="w-full mb-4 space-y-3">
          {(activeRules.length > 0 || activeAllianceList.length > 0 || mirrorShields.some(Boolean)) && (
            <div className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-white font-black text-sm">Estado da mesa</p>
                <p className="text-slate-500 text-xs">Turno {turnCount}</p>
              </div>

              {activeRules.length > 0 && (
                <div className="space-y-2">
                  <p className="text-violet-300 text-xs font-black uppercase tracking-[0.16em]">Regras ativas</p>
                  {activeRules.map((rule)=>(
                    <div key={rule.id} className="rounded-2xl border border-violet-400/20 bg-violet-400/10 p-3">
                      <div className="flex gap-2">
                        <p className="text-white text-sm leading-snug flex-1">{rule.text}</p>
                        <button type="button" onClick={()=>setActiveRules((rules)=>rules.filter((item)=>item.id!==rule.id))} className="text-violet-200 text-xs font-black rounded-xl bg-white/10 px-2 h-8">
                          remover
                        </button>
                      </div>
                      <p className="text-violet-200/70 text-xs mt-1">
                        Criada por {players[rule.ownerIndex]?.name || 'jogador'}
                        {rule.expiresAt ? ` · ${Math.max(0, rule.expiresAt - turnCount)} rondas` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {activeAllianceList.length > 0 && (
                <div className="space-y-2">
                  <p className="text-pink-300 text-xs font-black uppercase tracking-[0.16em]">Alianças</p>
                  {activeAllianceList.map((alliance)=>(
                    <div key={alliance.id} className="rounded-2xl border border-pink-400/20 bg-pink-400/10 p-3 text-sm text-white">
                      🤝 {players[alliance.players[0]]?.name} + {players[alliance.players[1]]?.name}
                      <span className="text-pink-200/80"> · {Math.max(0, alliance.expiresAt - turnCount)} rondas</span>
                    </div>
                  ))}
                </div>
              )}

              {mirrorShields.some(Boolean) && (
                <div className="space-y-2">
                  <p className="text-sky-300 text-xs font-black uppercase tracking-[0.16em]">Espelhos</p>
                  {mirrorShields.map((count, idx)=>count ? (
                    <div key={players[idx]?.name || idx} className="rounded-2xl border border-sky-400/20 bg-sky-400/10 p-3 flex items-center justify-between gap-3">
                      <p className="text-white text-sm">🛡️ {players[idx]?.name} pode refletir {count} penalização{count > 1 ? 'ões' : ''}</p>
                      <button
                        type="button"
                        onClick={()=>setMirrorShields((shields)=>shields.map((value, shieldIdx)=>shieldIdx===idx ? Math.max(0, (value || 0) - 1) : value))}
                        className="text-sky-100 text-xs font-black rounded-xl bg-white/10 px-3 py-2"
                      >
                        Usar
                      </button>
                    </div>
                  ) : null)}
                </div>
              )}
            </div>
          )}

          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-3">
            <p className="text-slate-400 text-xs font-black uppercase tracking-[0.16em] mb-2">Contador rápido</p>
            <div className="grid grid-cols-2 gap-2">
              {players.map((player, idx)=>(
                <div key={player.name} className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-2">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-white text-sm font-bold truncate">{player.name}</p>
                    <p className="text-amber-300 text-xs font-black">{drinkStats[idx]?.drinks || 0}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {[1,2,3].map((amount)=>(
                      <button key={amount} type="button" onClick={()=>registerDrink(idx, amount)} className="rounded-xl bg-amber-500/15 border border-amber-400/20 text-amber-200 py-1.5 text-xs font-black">
                        +{amount}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <AnimatePresence>
          {surpriseCue && (
            <motion.div
              key="surprise-cue"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full mb-4 rounded-2xl border border-cyan-500/40 bg-gradient-to-br from-cyan-950/80 to-slate-900/90 p-4 flex flex-col gap-3"
            >
              <div className="flex items-start gap-2">
                <PartyPopper className="w-5 h-5 text-cyan-300 shrink-0 mt-0.5" />
                <p className="text-white text-sm font-semibold leading-snug">
                  Surpresa IA — queres um desafio extra para o grupo? (Não substitui cartas do baralho.)
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSurpriseCue(false)
                    setSurpriseOpen(true)
                    setSurpriseText('')
                    setSurpriseErr(null)
                    void fetchSurpriseChallenge()
                  }}
                  className="flex-1 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl py-3 text-sm font-black"
                >
                  Abrir desafio
                </button>
                <button
                  type="button"
                  onClick={() => setSurpriseCue(false)}
                  className="flex-1 bg-white/[0.08] border border-white/10 text-slate-200 rounded-xl py-3 text-sm font-bold hover:bg-white/[0.12]"
                >
                  Agora não
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="w-full">
            {tab==='deck'&&(
              <CardDeck
                key={deckSessionId}
                activeDeck={activeDeck}
                players={players}
                deckSessionId={deckSessionId}
                onCardDrawn={onCardDrawn}
                onAgentResult={handleAgentResult}
                onMiniBossResult={handleMiniBossResult}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {surpriseOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => !surpriseLoading && setSurpriseOpen(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', damping: 22 }}
              className="w-full max-w-lg rounded-3xl overflow-hidden border border-cyan-500/30 bg-[#0f1120] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-4 flex items-center gap-3 bg-gradient-to-r from-cyan-600 to-teal-700">
                <PartyPopper className="text-white w-5 h-5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-black text-lg leading-tight">Desafio surpresa</h3>
                  <p className="text-cyan-100/90 text-xs">Modo beber · IA (Groq)</p>
                </div>
                <button
                  type="button"
                  disabled={surpriseLoading}
                  onClick={() => setSurpriseOpen(false)}
                  className="text-white/80 hover:text-white font-bold text-xl w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/10 disabled:opacity-40"
                >
                  ✕
                </button>
              </div>
              <div className="p-5 space-y-4">
                {surpriseLoading && (
                  <div className="text-center py-8 space-y-3">
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                      <Sparkles className="text-cyan-400 w-10 h-10 mx-auto" />
                    </motion.div>
                    <p className="text-slate-400 text-sm">A inventar um desafio para o grupo…</p>
                  </div>
                )}
                {!surpriseLoading && surpriseErr && (
                  <p className="text-red-400 text-sm text-center bg-red-900/20 border border-red-500/30 rounded-xl p-3">{surpriseErr}</p>
                )}
                {!surpriseLoading && surpriseText && !surpriseErr && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                    <p className="text-white text-lg font-semibold leading-relaxed text-center">{surpriseText}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={surpriseLoading}
                    onClick={() => void fetchSurpriseChallenge()}
                    className="flex-1 bg-white/[0.08] border border-white/10 text-white rounded-2xl py-3 text-sm font-bold hover:bg-white/[0.12] disabled:opacity-40"
                  >
                    Outro desafio
                  </button>
                  <button
                    type="button"
                    disabled={surpriseLoading}
                    onClick={() => setSurpriseOpen(false)}
                    className="flex-1 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-2xl py-3 text-sm font-black"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
