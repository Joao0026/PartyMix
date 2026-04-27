import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const BODY_PARTS=['Lábios','Pescoço','Orelhas','Ombros','Costas','Barriga','Pés','Mãos','Pulsos','Clavícula','Joelhos','Tornozelos','Nuca','Dedos','Peito','Cintura']
const ACTIONS=['Massagem suave','Beijos lentos','Mordidas suaves','Carícias longas','Sopros quentes','Toque com pontas dos dedos','Beijos húmidos','Lambidas suaves','Friccionar devagar','Cobrir de beijos']

const DARE_CARDS=[
  'Massagem nas costas durante 2 minutos',
  'Beija o teu parceiro no pescoço durante 30 segundos',
  'Sussurra o teu fantasma mais ousado ao ouvido',
  'Remove uma peça de roupa do teu parceiro',
  'Diz 3 elogios específicos ao corpo do teu parceiro',
  'Beija em 5 sítios diferentes sem ser os lábios',
  'Dança sensualmente durante 1 minuto',
  'Venda os olhos e surpreende o parceiro com um toque',
  'Escreve com o dedo nas costas — ele/ela adivinha',
  'Olha nos olhos durante 30 segundos sem falar',
  'Beija o teu parceiro durante 1 minuto sem parar',
  'Diz a coisa mais ousada que nunca disseste',
  'Faz uma massagem nos pés durante 1 minuto',
  'Sussurra 3 coisas que adoras no corpo do teu parceiro',
]

const QUIZ_Q=[
  'Qual é a parte favorita do teu parceiro no teu corpo?',
  'O que faz o teu parceiro primeiro quando acorda?',
  'Qual é o maior fantasma do teu parceiro?',
  'Qual foi o momento mais íntimo que passaram juntos?',
  'O que é que o teu parceiro adora que tu faças?',
  'Qual seria o destino de férias perfeito para o teu parceiro?',
]

const ROLEPLAY_SCENARIOS=[
  {title:'Desconhecidos no Bar',desc:'Fingem que nunca se conheceram. Um conquista o outro.'},
  {title:'Médico e Paciente',desc:'Consulta muito profissional... ou não.'},
  {title:'Vizinhos',desc:'O ruído do apartamento ao lado leva a um encontro.'},
  {title:'Chef e Crítico',desc:'Uma refeição avaliada com muita exigência.'},
  {title:'Estranhos num Elevador',desc:'Presos juntos. 5 minutos. Sem sair.'},
]

// Tile types with probabilities
const TILE_DEFS=[
  {id:'dare',     emoji:'🔥',label:'Desafio',       bg:'#9d174d',prob:0.30},
  {id:'dice',     emoji:'🎲',label:'Dados Eróticos', bg:'#7c2d12',prob:0.18},
  {id:'quiz',     emoji:'💬',label:'Quiz',           bg:'#581c87',prob:0.14},
  {id:'roleplay', emoji:'🎭',label:'Roleplay',       bg:'#134e4a',prob:0.10},
  {id:'forward',  emoji:'💘',label:'+2 Casas',       bg:'#14532d',prob:0.14},
  {id:'back',     emoji:'💔',label:'-1 Casa',        bg:'#7f1d1d',prob:0.14},
]

function pickTile(){
  let r=Math.random(),cum=0
  for(const t of TILE_DEFS){cum+=t.prob;if(r<cum)return t}
  return TILE_DEFS[0]
}

function buildBoard(n=24){
  return Array.from({length:n},(_,i)=>{
    if(i===0) return {id:'start',emoji:'💕',label:'Início',bg:'#7c3aed'}
    if(i===n-1) return {id:'end',emoji:'🏆',label:'Fim!',bg:'#b45309'}
    return pickTile()
  })
}

// Die component for board movement (1-4 so board doesn't drag)
function BoardDie({onRoll,disabled}){
  const [rolling,setRolling]=useState(false),[val,setVal]=useState(null)
  const roll=async()=>{
    if(rolling||disabled)return
    setRolling(true);setVal(null)
    await new Promise(r=>setTimeout(r,900))
    const v=Math.floor(Math.random()*4)+1
    setVal(v);setRolling(false);onRoll(v)
  }
  return(
    <div className="flex flex-col items-center gap-2">
      <motion.button onClick={roll} disabled={rolling||disabled}
        whileHover={!rolling&&!disabled?{scale:1.06}:{}}
        whileTap={!rolling&&!disabled?{scale:0.92}:{}}
        animate={rolling?{rotate:[0,18,-18,14,-14,0],scale:[1,1.1,0.95,1.1,1]}:val?{scale:[1.2,1]}:{}}
        transition={{duration:rolling?0.9:0.3}}
        className="w-24 h-24 rounded-3xl flex items-center justify-center text-white font-black text-5xl shadow-2xl disabled:opacity-40 select-none"
        style={{background:'linear-gradient(135deg,#be185d,#9d174d)',boxShadow:'0 6px 28px rgba(190,24,93,0.45)'}}>
        {rolling?'💕':val||'🎲'}
      </motion.button>
      {val&&!rolling&&<p className="text-white font-black text-2xl">+{val} casas!</p>}
      {!val&&!rolling&&<p className="text-slate-500 text-sm">Toca para lançar</p>}
    </div>
  )
}

// Tile action modal
function TileModal({tile,players,turn,onDone}){
  const player=players[turn%2],other=players[(turn+1)%2]
  const [content]=useState(()=>{
    if(tile.id==='dare') return DARE_CARDS[Math.floor(Math.random()*DARE_CARDS.length)]
    if(tile.id==='dice') return {body:BODY_PARTS[Math.floor(Math.random()*BODY_PARTS.length)],action:ACTIONS[Math.floor(Math.random()*ACTIONS.length)]}
    if(tile.id==='quiz') return QUIZ_Q[Math.floor(Math.random()*QUIZ_Q.length)]
    if(tile.id==='roleplay') return ROLEPLAY_SCENARIOS[Math.floor(Math.random()*ROLEPLAY_SCENARIOS.length)]
    return null
  })

  return(
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end justify-center p-4">
      <motion.div initial={{y:100,opacity:0}} animate={{y:0,opacity:1}} exit={{y:100,opacity:0}}
        transition={{type:'spring',damping:20}}
        className="w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
        style={{background:'#100518',border:`1px solid ${tile.bg}60`}}>
        <div className="px-5 py-4 flex items-center gap-3" style={{background:tile.bg}}>
          <span className="text-4xl">{tile.emoji}</span>
          <div>
            <h3 className="text-white font-black text-xl">{tile.label}</h3>
            <p className="text-white/70 text-sm">Vez de {player?.name}</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          {tile.id==='dare'&&<p className="text-white text-xl font-semibold text-center leading-relaxed py-3">{content}</p>}
          {tile.id==='dice'&&content&&(
            <div className="text-center space-y-3">
              <p className="text-rose-300 text-sm">Resultado dos dados:</p>
              <p className="text-white font-black text-2xl">{content.action} nos {content.body}</p>
            </div>
          )}
          {tile.id==='quiz'&&(
            <div className="text-center space-y-3">
              <p className="text-violet-300 text-sm">{player?.name} responde sobre {other?.name}:</p>
              <p className="text-white font-bold text-lg leading-snug">{content}</p>
              <p className="text-slate-500 text-sm">{other?.name} confirma se acertou!</p>
            </div>
          )}
          {tile.id==='roleplay'&&content&&(
            <div className="text-center space-y-3">
              <p className="text-teal-300 text-sm">Cenário:</p>
              <p className="text-white font-black text-xl">{content.title}</p>
              <p className="text-slate-300 text-sm">{content.desc}</p>
              <p className="text-slate-500 text-xs">5 minutos — GO! ⏱</p>
            </div>
          )}
          {tile.id==='forward'&&<p className="text-green-400 font-black text-2xl text-center">💘 Avança 2 casas extra!</p>}
          {tile.id==='back'&&<p className="text-red-400 font-black text-2xl text-center">💔 Recua 1 casa!</p>}
          <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.97}} onClick={onDone}
            className="w-full text-black font-black rounded-2xl py-4 text-lg"
            style={{background:`linear-gradient(135deg,${tile.bg},${tile.bg}cc)`,color:'white'}}>
            {['dare','roleplay','quiz'].includes(tile.id)?'✅ Feito!':'Continuar →'}
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}

export default function CoupleMap({players,onExit}){
  const BOARD=useRef(buildBoard(24)).current
  const [positions,setPositions]=useState([0,0])
  const [turn,setTurn]=useState(0)
  const [rolled,setRolled]=useState(false)
  const [activeTile,setActiveTile]=useState(null)
  const [winner,setWinner]=useState(null)
  const mapRef=useRef(null)

  const player=players[turn%2]
  const pos=positions[turn%2]

  const scrollTo=p=>{
    if(!mapRef.current)return
    mapRef.current.scrollTo({left:Math.max(0,p*70-mapRef.current.clientWidth/2+35),behavior:'smooth'})
  }

  const handleRoll=async val=>{
    if(rolled)return
    setRolled(true)
    let finalPos=Math.min(pos+val,BOARD.length-1)
    const tile=BOARD[finalPos]
    if(tile.id==='forward') finalPos=Math.min(finalPos+2,BOARD.length-1)
    if(tile.id==='back') finalPos=Math.max(finalPos-1,0)
    setPositions(p=>p.map((v,i)=>i===turn%2?finalPos:v))
    scrollTo(finalPos)
    if(finalPos>=BOARD.length-1){setWinner(turn%2);return}
    setTimeout(()=>setActiveTile(BOARD[finalPos]),550)
  }

  const nextTurn=()=>{
    setActiveTile(null);setRolled(false)
    setTurn(t=>t+1)
    setTimeout(()=>scrollTo(positions[(turn+1)%2]),100)
  }

  // ── LEGEND ──────────────────────────────────────────────────
  const legend=TILE_DEFS.map(t=>({...t}))

  if(winner!==null)return(
    <div className="flex-1 flex flex-col items-center justify-center px-4 text-center gap-5">
      <motion.div animate={{scale:[1,1.15,1]}} transition={{repeat:Infinity,duration:2}}>
        <span className="text-7xl">🏆</span>
      </motion.div>
      <h2 className="text-white font-black text-3xl">{players[winner]?.name} chegou primeiro!</h2>
      <p className="text-rose-300 text-lg">Escolhe uma recompensa especial 💕</p>
      <button onClick={onExit}
        className="text-white font-bold rounded-2xl px-8 py-4"
        style={{background:'linear-gradient(135deg,#be185d,#9d174d)'}}>
        Terminar 💕
      </button>
    </div>
  )

  return(
    <div className="flex flex-col flex-1">
      {/* Board scroll */}
      <div className="px-4 py-3">
        <div ref={mapRef} className="flex gap-2 overflow-x-scroll pb-2" style={{scrollbarWidth:'none'}}>
          {BOARD.map((tile,idx)=>{
            const p0=positions[0]===idx,p1=positions[1]===idx,isCur=(turn%2===0?p0:p1)
            return(
              <motion.div key={idx}
                animate={isCur?{scale:1.12,boxShadow:`0 0 16px ${tile.bg}99`}:{scale:1}}
                className="relative flex-shrink-0 flex flex-col items-center justify-end rounded-2xl"
                style={{width:60,height:64,background:tile.bg+'aa',border:`0.5px solid ${isCur?tile.bg:'rgba(255,255,255,0.06)'}`}}>
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {p0&&<div className={`w-6 h-6 rounded-full bg-gradient-to-br ${players[0]?.color} border-2 border-white/50 flex items-center justify-center text-white text-xs font-black shadow-lg`}>{players[0]?.name?.[0]}</div>}
                  {p1&&<div className={`w-6 h-6 rounded-full bg-gradient-to-br ${players[1]?.color} border-2 border-white/50 flex items-center justify-center text-white text-xs font-black shadow-lg`}>{players[1]?.name?.[0]}</div>}
                </div>
                <span className="text-xl mb-1">{tile.emoji}</span>
                <span className="text-white/25 text-xs mb-1 font-mono">{idx}</span>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 mb-2">
        <div className="flex gap-1.5 overflow-x-auto" style={{scrollbarWidth:'none'}}>
          {legend.map(t=>(
            <div key={t.id} className="flex items-center gap-1 flex-shrink-0 rounded-lg px-2 py-1" style={{background:t.bg+'30',border:`0.5px solid ${t.bg}60`}}>
              <span className="text-xs">{t.emoji}</span>
              <span className="text-xs text-white/60 whitespace-nowrap">{t.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Player card + die */}
      <div className="flex-1 flex flex-col items-center px-4 pb-4 gap-4">
        <div className="bg-white/[0.04] border border-white/[0.07] rounded-3xl p-5 w-full">
          <div className="flex items-center gap-4 mb-5">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${player?.color} flex items-center justify-center text-white font-black text-2xl shadow-xl`}>
              {player?.name?.[0]}
            </div>
            <div>
              <p className="text-slate-500 text-xs">Vez de</p>
              <h2 className="text-white font-black text-xl">{player?.name}</h2>
              <p className="text-slate-600 text-xs">Casa {pos} / {BOARD.length-1}</p>
            </div>
          </div>
          {!rolled
            ?<BoardDie onRoll={handleRoll} disabled={false}/>
            :!activeTile&&(
              <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.97}} onClick={nextTurn}
                className="w-full text-white font-bold rounded-2xl py-4"
                style={{background:'linear-gradient(135deg,#be185d,#9d174d)'}}>
                Próximo Turno 💕
              </motion.button>
            )
          }
        </div>

        {/* Positions mini scoreboard */}
        <div className="grid grid-cols-2 gap-2 w-full">
          {players.map((p,i)=>(
            <div key={i} className={`bg-white/[0.04] rounded-2xl p-3 flex items-center gap-3 border ${i===turn%2?'border-rose-500/40':'border-white/[0.05]'}`}>
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center text-white text-sm font-black shadow`}>{p.name[0]}</div>
              <div>
                <p className="text-white text-sm font-semibold">{p.name}</p>
                <p className="text-slate-500 text-xs">Casa {positions[i]}</p>
              </div>
              {i===turn%2&&<motion.div animate={{scale:[1,1.3,1]}} transition={{repeat:Infinity,duration:1.2}} className="ml-auto w-2 h-2 rounded-full bg-rose-400 flex-shrink-0"/>}
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {activeTile&&(
          <TileModal tile={activeTile} players={players} turn={turn} onDone={nextTurn}/>
        )}
      </AnimatePresence>
    </div>
  )
}
