import { useState, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { EroticDie, BoardDie } from './EroticDie'
import { playDiceSound, playPointSound } from '../../utils/sounds'

const BODY_PARTS = ['Lábios','Pescoço','Orelhas','Ombros','Costas','Barriga','Pés','Mãos','Pulsos','Clavícula','Joelhos','Tornozelos','Nuca','Dedos','Peito','Cintura']
const ACTIONS    = ['Massagem suave','Beijos lentos','Mordidas suaves','Carícias longas','Sopros quentes','Toque com dedos','Beijos húmidos','Lambidas suaves','Friccionar devagar','Cobrir de beijos']
const DARE_CARDS = ['Massagem nas costas durante 2 minutos','Beija no pescoço durante 30 segundos','Sussurra o teu maior fantasma ao ouvido','Remove uma peça de roupa do parceiro','Diz 3 elogios específicos ao corpo do parceiro','Beija em 5 sítios diferentes sem ser os lábios','Dança sensualmente durante 1 minuto','Venda os olhos e surpreende o parceiro com um toque','Escreve com o dedo nas costas — parceiro adivinha','Olha nos olhos durante 30 segundos sem falar','Beija o parceiro durante 1 minuto sem parar','Faz uma massagem nos pés durante 1 minuto','Mostra ao teu parceiro como gostas de ser beijado']
const QUIZ_Q     = ['O que é que o teu parceiro mais gosta em ti?','Qual foi o momento mais íntimo que passaram juntos?','O que o teu parceiro adora que tu faças?','Qual seria o destino de férias perfeito para o teu parceiro?','O que faz o teu parceiro quando está com medo?','Qual é o maior sonho do teu parceiro?','O que faz o teu parceiro sorrir mesmo nos dias maus?']
const ROLEPLAY   = [{title:'Desconhecidos no Bar',desc:'Fingem que nunca se conheceram.'},{title:'Médico e Paciente',desc:'Consulta muito profissional... ou não.'},{title:'Vizinhos',desc:'O ruído ao lado leva a um encontro.'},{title:'Estranhos no Elevador',desc:'Presos. 5 minutos. Sem sair.'}]
const LAP_PRIZES = [
  'Abre uma raspadinha/posição especial agora.',
  'Escolhe o próximo desafio do parceiro.',
  'Podes trocar o próximo resultado do dado por uma nova rolagem.',
  'Escolhe: beijo longo, massagem ou pergunta íntima.',
  'Prémio de poder: no próximo turno escolhes entre Dados, Desafio ou Quiz.',
]

const TILE_DEFS_SELECTABLE = [
  {id:'dare',    emoji:'🔥',label:'Desafio',       bg:'#9d174d',prob:0.28, activity:'challenges'},
  {id:'dice',    emoji:'🎲',label:'Dados Eróticos', bg:'#7c2d12',prob:0.22, activity:'dice'},
  {id:'quiz',    emoji:'💬',label:'Quiz',           bg:'#581c87',prob:0.16, activity:'quiz'},
  {id:'roleplay',emoji:'🎭',label:'Roleplay',       bg:'#134e4a',prob:0.12, activity:'roleplay'},
]
const TILE_DEFS_FIXED = [
  {id:'forward', emoji:'💘',label:'+1 Casa',        bg:'#14532d',prob:0.10},
  {id:'back',    emoji:'💔',label:'-1 Casa',        bg:'#7f1d1d',prob:0.11},
  {id:'prize',   emoji:'🎁',label:'Prémio',         bg:'#b45309',prob:0.10},
]

function getTileDefs(selected){
  const selectable = TILE_DEFS_SELECTABLE.filter(t => selected.includes(t.activity))
  return [...selectable, ...TILE_DEFS_FIXED]
}

function pickTile(defs){
  const totalProb = defs.reduce((sum,t)=>sum+t.prob,0)
  let r=Math.random()*totalProb, cum=0
  for(const t of defs){cum+=t.prob; if(r<cum) return {...t}}
  return {...defs[0]}
}
const TOTAL=18
function buildBoard(tileDefs){
  const board = Array.from({length:TOTAL},(_,i)=>{
    if(i===0) return {id:'start',emoji:'💕',label:'Início',bg:'#7c3aed'}
    return pickTile(tileDefs)
  })

  for (let i = 2; i < board.length - 1; i++) {
    const curr = board[i].id
    const prev = board[i-1].id
    if ((curr === 'forward' || curr === 'back') && (prev === 'forward' || prev === 'back')) {
      const alt = tileDefs.find(t => t.id !== 'forward' && t.id !== 'back')
      board[i] = alt ? {...alt} : {id:'dare',emoji:'🔥',label:'Desafio',bg:'#9d174d'}
    }
  }
  return board
}
const HEART_POINTS = [
  [0.50,0.92],[0.38,0.82],[0.28,0.70],[0.18,0.56],[0.12,0.40],
  [0.15,0.25],[0.24,0.14],[0.39,0.12],[0.42,0.24],[0.50,0.36],
  [0.58,0.24],[0.61,0.12],[0.76,0.14],[0.85,0.25],[0.88,0.40],
  [0.82,0.56],[0.72,0.70],[0.62,0.82],
]

function posToBoard(pos, tileW, tileH, boardW, boardH) {
  const [x, y] = HEART_POINTS[pos % HEART_POINTS.length]
  return {
    left: x * boardW - tileW / 2,
    top: y * boardH - tileH / 2,
  }
}

// Erotic dice inside modal — the modal is on document.body so NO ancestor 3D context
function EroticDiceInModal({onDone}){
  const [rolling,setRolling]=useState(false),[body,setBody]=useState(null),[action,setAction]=useState(null)
  const roll=async()=>{
    if(rolling)return
    setRolling(true);setBody(null);setAction(null)
    playDiceSound()
    await new Promise(r=>setTimeout(r,1350))
    setBody(BODY_PARTS[Math.floor(Math.random()*BODY_PARTS.length)])
    setAction(ACTIONS[Math.floor(Math.random()*ACTIONS.length)])
    playPointSound()
    setRolling(false)
  }
  return(
    <div className="space-y-4">
      <div className="flex gap-3">
        <EroticDie options={BODY_PARTS} label="Parte do Corpo" color="#e11d48" rolling={rolling} value={body}/>
        <EroticDie options={ACTIONS}    label="Ação"           color="#be185d" rolling={rolling} value={action}/>
      </div>
      {body&&action&&!rolling&&(
        <div className="rounded-2xl p-4 text-center border border-rose-500/30" style={{background:'rgba(225,29,72,0.1)'}}>
          <p className="text-rose-300 text-xs mb-1">O que fazer:</p>
          <p className="text-white font-black text-xl">{action} nos {body}</p>
        </div>
      )}
      <button onClick={roll} disabled={rolling}
        className="w-full text-white font-black rounded-2xl py-4 text-lg disabled:opacity-50"
        style={{background:'linear-gradient(135deg,#e11d48,#be185d)'}}>
        {rolling?'🎲 A rolar...':body?'🎲 Rolar de Novo':'🎲 Rolar Dados Eróticos'}
      </button>
      {(body||rolling)&&<button onClick={onDone} className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-2xl py-3 font-medium">✅ Feito!</button>}
    </div>
  )
}

function TileModal({tile,players,turn,onDone}){
  const player=players[turn%2]
  const [content]=useState(()=>{
    if(tile.id==='dare')return DARE_CARDS[Math.floor(Math.random()*DARE_CARDS.length)]
    if(tile.id==='quiz')return QUIZ_Q[Math.floor(Math.random()*QUIZ_Q.length)]
    if(tile.id==='roleplay')return ROLEPLAY[Math.floor(Math.random()*ROLEPLAY.length)]
    if(tile.id==='prize')return ['Abre a raspadinha/posição do dia.','Escolhe o próximo desafio do parceiro.','Vale trocar o próximo dado por outro lançamento.','Prémio: escolhe entre beijo, massagem ou pergunta íntima.'][Math.floor(Math.random()*4)]
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
          <div><h3 className="text-white font-black text-xl">{tile.label}</h3><p className="text-white/70 text-sm">Vez de {player?.name}</p></div>
        </div>
        <div className="p-5 space-y-4">
          {tile.id==='dare'&&<p className="text-white text-xl font-semibold text-center leading-relaxed py-3">{content}</p>}
          {/* Dice rendered here — inside modal on document body, no ancestor 3D context */}
          {tile.id==='dice'&&<EroticDiceInModal onDone={onDone}/>}
          {tile.id==='quiz'&&(
            <div className="text-center space-y-3 py-2">
              <p className="text-violet-300 text-sm">Respondam os dois em voz alta:</p>
              <p className="text-white font-bold text-xl leading-snug">{content}</p>
              <p className="text-slate-500 text-xs">Sem resposta na app!</p>
            </div>
          )}
          {tile.id==='roleplay'&&content&&(
            <div className="text-center space-y-3">
              <p className="text-teal-300 text-sm">Cenário:</p>
              <p className="text-white font-black text-xl">{content.title}</p>
              <p className="text-slate-300 text-sm">{content.desc}</p>
            </div>
          )}
          {tile.id==='forward'&&<p className="text-green-400 font-black text-2xl text-center py-2">💘 Avança 1 casa extra!</p>}
          {tile.id==='back'&&<p className="text-red-400 font-black text-2xl text-center py-2">💔 Recua 1 casa!</p>}
          {tile.id==='prize'&&<p className="text-amber-300 font-black text-xl text-center py-2">{content}</p>}
          {tile.id!=='dice'&&(
            <button onClick={onDone} className="w-full text-white font-black rounded-2xl py-4 text-lg" style={{background:tile.bg}}>
              {['dare','roleplay','quiz'].includes(tile.id)?'✅ Feito!':'Continuar →'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default function CoupleMap({players,onExit,selected=[],maxDice=6,loopGoal='free',targetLaps=3}){
  const tileDefs = getTileDefs(selected)
  const BOARD=useRef(buildBoard(tileDefs)).current
  const [positions,setPositions]=useState([0,0])
  const [laps,setLaps]=useState([0,0])
  const [turn,setTurn]=useState(0)
  const [diceResult,setDiceResult]=useState(null)
  const [animatingPos,setAnimatingPos]=useState(null)
  const [rolled,setRolled]=useState(false)
  const [activeTile,setActiveTile]=useState(null)
  const [lapPrize,setLapPrize]=useState(null)
  const [winner,setWinner]=useState(null)
  const [diceSides,setDiceSides]=useState(maxDice)
  const player=players[turn%2],pos=positions[turn%2]

  const handleRoll=async(val)=>{
    if(rolled)return
    setRolled(true)
    setDiceResult(val)
    
    let currentPos=pos
    let finalPos=(pos+val)%TOTAL
    let completedLap=false
    
    // Animate step by step
    for(let step=1;step<=val;step++){
      await new Promise(r=>setTimeout(r,300))
      const stepPos=(pos+step)%TOTAL
      if(pos+step>=TOTAL) completedLap=true
      setAnimatingPos(stepPos)
      setPositions(p=>p.map((v,i)=>i===turn%2?stepPos:v))
    }
    
    finalPos=finalPos%TOTAL
    let tileToCheck=BOARD[finalPos]
    
    if(tileToCheck.id==='forward'){
      const startForward = finalPos
      finalPos=(finalPos+1)%TOTAL
      if(startForward+1>=TOTAL) completedLap=true
      // Animate the +1 bonus
      for(let step=1;step<=1;step++){
        await new Promise(r=>setTimeout(r,300))
        const stepPos=(startForward+step)%TOTAL
        setAnimatingPos(stepPos)
        setPositions(p=>p.map((v,i)=>i===turn%2?stepPos:v))
      }
      // Get the tile at final position after bonus
      tileToCheck=BOARD[finalPos]
    }
    
    if(tileToCheck.id==='back'){
      const backPos=(finalPos-1+TOTAL)%TOTAL
      // Animate going back
      await new Promise(r=>setTimeout(r,300))
      setAnimatingPos(backPos)
      setPositions(p=>p.map((v,i)=>i===turn%2?backPos:v))
      finalPos=backPos
      tileToCheck=BOARD[finalPos]
    }
    
    setAnimatingPos(null)
    await new Promise(r=>setTimeout(r,600))
    if(completedLap){
      const nextLaps=laps.map((lap,i)=>i===turn%2?lap+1:lap)
      setLaps(nextLaps)
      const prize = LAP_PRIZES[Math.floor(Math.random()*LAP_PRIZES.length)]
      setLapPrize({playerIdx:turn%2,prize,laps:nextLaps[turn%2]})
      if(loopGoal==='laps'&&nextLaps[turn%2]>=targetLaps){
        setWinner(turn%2)
      }
      return
    }
    setActiveTile(tileToCheck)
  }
  const nextTurn=()=>{setActiveTile(null);setLapPrize(null);setRolled(false);setDiceResult(null);setTurn(t=>t+1)}

  const tileW=38,tileH=36
  const boardW=390,boardH=370

  return(
    <div className="flex flex-col flex-1">
      {/* Legend */}
      <div className="px-4 pt-2 pb-1">
        <div className="flex gap-1.5 overflow-x-auto" style={{scrollbarWidth:'none'}}>
          {tileDefs.map(t=>(
            <div key={t.id} className="flex items-center gap-1 flex-shrink-0 rounded-lg px-2 py-1" style={{background:t.bg+'35',border:`0.5px solid ${t.bg}70`}}>
              <span className="text-xs">{t.emoji}</span><span className="text-xs text-white/60 whitespace-nowrap">{t.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {players.map((p,i)=>(
            <div key={i} className={`rounded-xl border px-3 py-2 text-xs ${i===turn%2?'border-rose-500/40 bg-rose-500/10':'border-white/[0.07] bg-white/[0.03]'}`}>
              <span className="text-white font-bold">{p.name}</span>
              <span className="text-slate-500"> · {laps[i]} volta{laps[i]===1?'':'s'}</span>
              {loopGoal==='laps'&&<span className="text-rose-300"> / {targetLaps}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Board — NO Framer Motion on tiles, pure CSS only */}
      <div className="overflow-x-auto px-4 py-3" style={{scrollbarWidth:'thin'}}>
        {diceResult&&<div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-white/[0.1] border border-rose-500/30 rounded-2xl px-6 py-3"><p className="text-white font-black text-2xl">🎲 {diceResult}</p></div>}
        <div style={{position:'relative',width:boardW,height:boardH,margin:'0 auto'}}>
          {BOARD.map((tile,idx)=>{
            const {left,top}=posToBoard(idx,tileW,tileH,boardW,boardH)
            const p0here=positions[0]===idx,p1here=positions[1]===idx
            const isCur=(turn%2===0?p0here:p1here)
            const isAnimating=animatingPos===idx
            return(
              <div key={idx}
                style={{
                  position:'absolute',
                  left,
                  top,
                  width:tileW, height:tileH,
                  background:tile.bg+'cc',
                  borderRadius:8,
                  border:`0.5px solid ${isCur||isAnimating?tile.bg:'rgba(255,255,255,0.07)'}`,
                  boxShadow:(isCur||isAnimating)?`0 0 10px ${tile.bg}cc`:'none',
                  outline:(isCur||isAnimating)?`2px solid ${tile.bg}`:'none',
                  transition:'box-shadow 0.3s, outline 0.3s, background 0.2s',
                  display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',
                  paddingBottom:2,overflow:'visible',zIndex:(isCur||isAnimating)?2:1,
                }}>
                <div style={{position:'absolute',top:-10,left:'50%',transform:'translateX(-50%)',display:'flex',gap:2}}>
                  {p0here&&<div style={{width:17,height:17,borderRadius:'50%',background:'linear-gradient(135deg,#ec4899,#f43f5e)',border:'1.5px solid rgba(255,255,255,0.7)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:9,fontWeight:900,boxShadow:'0 2px 6px rgba(0,0,0,0.5)'}}>{players[0]?.name?.[0]}</div>}
                  {p1here&&<div style={{width:17,height:17,borderRadius:'50%',background:'linear-gradient(135deg,#06b6d4,#3b82f6)',border:'1.5px solid rgba(255,255,255,0.7)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:9,fontWeight:900,boxShadow:'0 2px 6px rgba(0,0,0,0.5)'}}>{players[1]?.name?.[0]}</div>}
                </div>
                <span style={{fontSize:16,lineHeight:1}}>{tile.emoji}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Player card */}
      <div className="flex-1 flex flex-col items-center px-4 pb-4 gap-3">
        <div className="bg-white/[0.04] border border-white/[0.07] rounded-3xl p-5 w-full max-w-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${player?.color} flex items-center justify-center text-white font-black text-2xl shadow-xl`}>{player?.name?.[0]}</div>
            <div><p className="text-slate-500 text-xs">Vez de</p><h2 className="text-white font-black text-xl">{player?.name}</h2><p className="text-slate-600 text-xs">Mapa em loop · sem fim obrigatório</p></div>
          </div>
          {!rolled?(
            <div className="w-full space-y-3">
              <div className="flex items-center justify-center gap-2">
                <span className="text-slate-400 text-sm">Máximo definido antes do jogo: {diceSides}</span>
              </div>
              <BoardDie onRoll={handleRoll} disabled={false} color="#be185d" maxDice={diceSides} whiteDice={true}/>
            </div>
          )
            :!activeTile&&<button onClick={nextTurn} className="w-full text-white font-bold rounded-2xl py-4" style={{background:'linear-gradient(135deg,#be185d,#9d174d)'}}>Próximo Turno 💕</button>}
        </div>
        <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
          {players.map((p,i)=>(
            <div key={i} className={`bg-white/[0.04] rounded-2xl p-3 flex items-center gap-3 border ${i===turn%2?'border-rose-500/40':'border-white/[0.05]'}`}>
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center text-white text-sm font-black shadow`}>{p.name[0]}</div>
              <div><p className="text-white text-sm font-semibold">{p.name}</p><p className="text-slate-500 text-xs">A jogar no coração</p></div>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {activeTile&&<TileModal tile={activeTile} players={players} turn={turn} onDone={nextTurn}/>}
        {lapPrize&&(
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end justify-center p-4">
            <motion.div initial={{y:100,opacity:0}} animate={{y:0,opacity:1}} exit={{y:100,opacity:0}}
              transition={{type:'spring',damping:20}}
              className="w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-amber-500/40 bg-[#140812]">
              <div className="px-5 py-4 flex items-center gap-3 bg-gradient-to-r from-amber-500 to-orange-600">
                <span className="text-4xl">{winner!==null?'🏆':'🎁'}</span>
                <div>
                  <h3 className="text-white font-black text-xl">{winner!==null?'Vitória por voltas!':'Prémio de Volta'}</h3>
                  <p className="text-white/75 text-sm">{players[lapPrize.playerIdx]?.name} completou {lapPrize.laps} volta{lapPrize.laps===1?'':'s'}</p>
                </div>
              </div>
              <div className="p-5 space-y-4 text-center">
                {winner!==null&&<p className="text-amber-300 font-black text-2xl">{players[winner]?.name} venceu o loop!</p>}
                <p className="text-white text-xl font-semibold leading-relaxed">{lapPrize.prize}</p>
                <button onClick={winner!==null?onExit:nextTurn} className="w-full text-white font-black rounded-2xl py-4 text-lg bg-gradient-to-r from-amber-500 to-orange-600">
                  {winner!==null?'Terminar 💕':'Continuar →'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
