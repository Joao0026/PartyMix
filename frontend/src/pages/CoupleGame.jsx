import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { loadGame } from '../utils/game'
import { api } from '../utils/api'
import DailyScratch from './DailyScratch'
import CoupleMap from '../components/game/CoupleMap'
import { ChevronLeft, Dice6, Heart, Film, HelpCircle, Ticket, Map, Lock, Check } from 'lucide-react'

// ── EROTIC DICE ──────────────────────────────────────────────
const BODY_OPTIONS=['Lábios','Pescoço','Orelhas','Ombros','Costas','Barriga','Pés','Mãos','Pulsos','Clavícula','Joelhos','Tornozelos','Nuca','Cotovelos','Dedos','Testa','Bochechas','Queixo','Peito','Cintura']
const ACTION_OPTIONS=['Massagem suave','Beijos lentos','Mordidas suaves','Carícias longas','Sopros quentes','Toque com pontas dos dedos','Sussurros','Beijos húmidos','Pressão com as palmas','Roçar com os lábios','Lambidas suaves','Beijinhos rápidos','Amassar gentilmente','Traçar com o dedo','Soprar frio','Friccionar devagar','Apertar com delicadeza','Deslizar com a língua','Circular com a ponta do dedo','Cobrir de beijos']

function EroticDie({options,label,color,rolling,value}){
  const [display,setDisplay]=useState(options[0])
  useState(()=>{
    if(!rolling){if(value)setDisplay(value);return}
    let c=0
    const iv=setInterval(()=>{setDisplay(options[Math.floor(Math.random()*options.length)]);if(++c>18)clearInterval(iv)},65)
    return()=>clearInterval(iv)
  })
  // Use useEffect properly
  const [,forceRender]=useState(0)
  useState(()=>{})

  return(
    <div className="flex flex-col gap-2 flex-1">
      <p className="text-slate-400 text-xs uppercase tracking-wider text-center font-semibold">{label}</p>
      <motion.div
        animate={rolling?{rotateX:[0,360,720,1080],rotateY:[0,270,540],scale:[1,1.08,0.96,1.08,1]}:value?{scale:[1.15,1]}:{}}
        transition={rolling?{duration:1.4,ease:'easeInOut'}:{duration:0.35,type:'spring',damping:10}}
        className="w-full rounded-3xl py-5 px-4 flex items-center justify-center shadow-2xl min-h-24"
        style={{background:`linear-gradient(135deg,${color}dd,${color})`,boxShadow:`0 6px 28px ${color}45`,perspective:800}}>
        <p className="text-white font-black text-base text-center leading-snug">{display}</p>
      </motion.div>
    </div>
  )
}

import { useEffect } from 'react'

function EroticDieReal({options,label,color,rolling,value}){
  const [display,setDisplay]=useState(options[0])
  useEffect(()=>{
    if(!rolling){if(value)setDisplay(value);return}
    let c=0
    const iv=setInterval(()=>{setDisplay(options[Math.floor(Math.random()*options.length)]);if(++c>18)clearInterval(iv)},65)
    return()=>clearInterval(iv)
  },[rolling,value])
  return(
    <div className="flex flex-col gap-2 flex-1">
      <p className="text-slate-400 text-xs uppercase tracking-wider text-center font-semibold">{label}</p>
      <motion.div
        animate={rolling?{rotateX:[0,360,720,1080],rotateY:[0,270,540],scale:[1,1.08,0.96,1.08,1]}:value?{scale:[1.15,1]}:{}}
        transition={rolling?{duration:1.4,ease:'easeInOut'}:{duration:0.35,type:'spring',damping:10}}
        className="w-full rounded-3xl py-5 px-4 flex items-center justify-center shadow-2xl min-h-24"
        style={{background:`linear-gradient(135deg,${color}dd,${color})`,boxShadow:`0 6px 28px ${color}45`,perspective:800}}>
        <p className="text-white font-black text-base text-center leading-snug">{display}</p>
      </motion.div>
    </div>
  )
}

function EroticDiceSection({onNext}){
  const [rolling,setRolling]=useState(false),[body,setBody]=useState(null),[action,setAction]=useState(null)
  const roll=async()=>{
    if(rolling)return
    setRolling(true);setBody(null);setAction(null)
    await new Promise(r=>setTimeout(r,1450))
    setBody(BODY_OPTIONS[Math.floor(Math.random()*BODY_OPTIONS.length)])
    setAction(ACTION_OPTIONS[Math.floor(Math.random()*ACTION_OPTIONS.length)])
    setRolling(false)
  }
  return(
    <div className="space-y-4">
      <div className="flex gap-3">
        <EroticDieReal options={BODY_OPTIONS} label="Parte do Corpo" color="#e11d48" rolling={rolling} value={body}/>
        <EroticDieReal options={ACTION_OPTIONS} label="Ação" color="#be185d" rolling={rolling} value={action}/>
      </div>
      {body&&action&&!rolling&&(
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
          className="rounded-2xl p-4 text-center border border-rose-500/30" style={{background:'rgba(225,29,72,0.08)'}}>
          <p className="text-rose-300 text-xs mb-1">O que fazer:</p>
          <p className="text-white font-black text-2xl">{action} nos {body}</p>
        </motion.div>
      )}
      <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.97}} onClick={roll} disabled={rolling}
        className="w-full text-white font-black rounded-2xl py-5 text-lg disabled:opacity-50"
        style={{background:'linear-gradient(135deg,#e11d48,#be185d)',boxShadow:'0 4px 20px rgba(225,29,72,0.3)'}}>
        {rolling?'🎲 A rolar...':body?'🎲 Rolar de Novo':'🎲 Rolar Dados'}
      </motion.button>
      <button onClick={onNext} className="w-full bg-white/[0.05] border border-white/[0.07] text-white font-medium rounded-2xl py-3">Próximo Turno →</button>
    </div>
  )
}

// ── CHALLENGES ───────────────────────────────────────────────
const TYPE_LABELS={sensorial:'🌸',fisico:'💪',romantico:'🌹',emocional:'💫',playful:'🎭',bold:'🔥'}
const UNIQUE_CHALLENGES=[
  {text:'Vendas os olhos ao teu parceiro e fá-lo adivinhar onde tocas com 3 dedos.',type:'sensorial'},
  {text:'Escreve com o dedo nas costas uma palavra — ele adivinha. Quem acertar, manda.',type:'sensorial'},
  {text:'Massagem nas mãos durante 2 minutos. Só nas mãos. Com toda a atenção.',type:'fisico'},
  {text:'Remove uma peça de roupa do teu parceiro usando apenas os dentes.',type:'fisico'},
  {text:'Dança com o teu parceiro 2 minutos sem música. Inventem o ritmo juntos.',type:'romantico'},
  {text:'Beija o teu parceiro em 5 sítios diferentes que não sejam os lábios.',type:'sensorial'},
  {text:'Faz uma striptrease com pelo menos 2 peças de roupa.',type:'fisico'},
  {text:'Olha nos olhos do teu parceiro durante 1 minuto sem falar.',type:'emocional'},
  {text:'Sussurra ao ouvido a coisa mais ousada que gostarias de fazer.',type:'emocional'},
  {text:'Diz 3 coisas que adoras no corpo do teu parceiro com detalhes específicos.',type:'emocional'},
  {text:'Descreve em detalhes o momento mais excitante que passaram juntos.',type:'emocional'},
  {text:'Conta um fantasma que nunca partilhaste. Completamente.',type:'emocional'},
  {text:'Desenha com o dedo no braço algo que gostas. Parceiro adivinha.',type:'playful'},
  {text:'Inventa um cocktail com o nome do teu parceiro. Descreve os ingredientes.',type:'playful'},
  {text:'Durante 3 minutos, o teu parceiro pode pedir qualquer coisa. Dizes sim a tudo.',type:'bold'},
  {text:'Tira a foto mais sensual que consegues do teu parceiro agora.',type:'bold'},
  {text:'Mostra ao teu parceiro exatamente como gostas de ser beijado.',type:'bold'},
  {text:'Escolhe uma parte do teu parceiro e dá-lhe atenção exclusiva durante 1 minuto.',type:'bold'},
]

function ChallengesSection({players,turn,onNext}){
  const [current,setCurrent]=useState(null),[done,setDone]=useState(false)
  const used=useState(new Set())[0]
  const player=players[turn%2]
  const draw=()=>{
    const rem=UNIQUE_CHALLENGES.filter((_,i)=>!used.has(i))
    if(!rem.length)used.clear()
    const pool=rem.length?rem:UNIQUE_CHALLENGES
    const pi=Math.floor(Math.random()*pool.length)
    used.add(UNIQUE_CHALLENGES.indexOf(pool[pi]));setCurrent(pool[pi]);setDone(false)
  }
  return(
    <div className="space-y-4">
      {!current?(
        <div className="bg-white/[0.04] border border-white/[0.07] rounded-3xl p-6 text-center">
          <div className={`w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br ${player?.color} flex items-center justify-center text-white font-black text-4xl mb-3 shadow-xl`}>{player?.name?.[0]}</div>
          <p className="text-slate-400 text-sm mb-1">Desafio para</p>
          <h2 className="text-white font-black text-2xl mb-5">{player?.name}</h2>
          <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.97}} onClick={draw}
            className="w-full text-white font-black rounded-2xl py-4 text-lg"
            style={{background:'linear-gradient(135deg,#e11d48,#9d174d)'}}>
            🎴 Tirar Desafio
          </motion.button>
        </div>
      ):(
        <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}
          className="bg-white/[0.04] border border-white/[0.07] rounded-3xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{TYPE_LABELS[current.type]||'🎴'}</span>
            <span className="text-xs px-2 py-1 rounded-full bg-white/[0.06] text-slate-400 capitalize">{current.type}</span>
          </div>
          <p className="text-white text-xl font-semibold leading-relaxed">{current.text}</p>
          {!done?(
            <div className="flex gap-3 pt-2">
              <motion.button whileTap={{scale:0.95}} onClick={()=>setDone(true)} className="flex-1 bg-green-500/20 border border-green-500/40 text-green-400 font-bold rounded-2xl py-4">✅ Feito!</motion.button>
              <motion.button whileTap={{scale:0.95}} onClick={draw} className="flex-1 bg-white/[0.06] border border-white/[0.08] text-white font-bold rounded-2xl py-4">🎲 Outro</motion.button>
            </div>
          ):(
            <motion.div initial={{opacity:0}} animate={{opacity:1}} className="space-y-3">
              <p className="text-green-400 text-center font-bold">✨ Muito bem!</p>
              <div className="flex gap-3">
                <button onClick={draw} className="flex-1 bg-white/[0.06] text-white rounded-2xl py-3 font-medium">Mais um</button>
                <button onClick={onNext} className="flex-1 bg-rose-600/20 border border-rose-500/40 text-rose-300 rounded-2xl py-3 font-medium">Próximo →</button>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
      {!current&&<button onClick={onNext} className="w-full bg-white/[0.04] text-slate-400 rounded-2xl py-3 text-sm">Passar Turno →</button>}
    </div>
  )
}

// ── QUIZ ────────────────────────────────────────────────────
const QUIZ_QUESTIONS=['Qual é o prato favorito do teu parceiro?','Qual foi o primeiro filme que viram juntos?','Qual é o maior medo do teu parceiro?','O que faz o teu parceiro primeiro quando acorda?','Se ganhasse 1M€, o que fazia primeiro?','Qual é o sonho maior do teu parceiro?','O que o teu parceiro mais aprecia em ti?','Qual o melhor momento que já partilharam juntos?','O que mais odeia no trabalho?','Qual a maior insegurança do teu parceiro?','Qual seria o destino de férias perfeito?','Qual é a música que ouve quando está triste?']

function QuizSection({players,turn,onNext}){
  const [q,setQ]=useState(()=>QUIZ_QUESTIONS[Math.floor(Math.random()*QUIZ_QUESTIONS.length)])
  const [answer,setAnswer]=useState(''),[revealed,setRevealed]=useState(false),[correct,setCorrect]=useState(null)
  const asker=players[turn%2],answerer=players[(turn+1)%2]
  const next=()=>{setQ(QUIZ_QUESTIONS[Math.floor(Math.random()*QUIZ_QUESTIONS.length)]);setAnswer('');setRevealed(false);setCorrect(null)}
  return(
    <div className="space-y-4">
      <div className="rounded-2xl p-4 text-center border border-violet-500/30" style={{background:'rgba(124,58,237,0.08)'}}>
        <p className="text-violet-300 text-xs mb-1">{asker?.name} imagina a resposta de {answerer?.name}:</p>
        <p className="text-white font-bold text-lg leading-snug">{q}</p>
      </div>
      {!revealed?(<>
        <input value={answer} onChange={e=>setAnswer(e.target.value)} placeholder={`${asker?.name}, o que achas?`}
          className="w-full bg-white/[0.05] text-white rounded-2xl px-4 py-4 outline-none border border-white/[0.08] focus:border-violet-500/50"/>
        <button onClick={()=>setRevealed(true)} disabled={!answer.trim()} className="w-full bg-gradient-to-r from-violet-600 to-purple-700 text-white font-bold rounded-2xl py-4 disabled:opacity-40">Revelar →</button>
      </>):(
        <div className="space-y-3">
          <div className="bg-white/[0.05] border border-white/[0.07] rounded-2xl p-4"><p className="text-slate-500 text-xs mb-1">{asker?.name} disse:</p><p className="text-white font-semibold">{answer}</p></div>
          <div className="flex gap-3">
            {[['✅ Sim!',true,'bg-green-500/20 border-green-500/40 text-green-400'],['❌ Não',false,'bg-red-500/20 border-red-500/40 text-red-400']].map(([l,v,c])=>(
              <button key={String(v)} onClick={()=>setCorrect(v)} className={`flex-1 rounded-2xl py-3 font-bold border transition-all ${correct===v?c:'bg-white/[0.06] border-white/[0.08] text-white'}`}>{l}</button>
            ))}
          </div>
          {correct!==null&&(
            <motion.div initial={{opacity:0}} animate={{opacity:1}} className="space-y-2">
              <p className={`text-center font-bold ${correct?'text-green-400':'text-red-400'}`}>{correct?'🎉 Conheces bem o teu parceiro!':'💔 Ainda há surpresas!'}</p>
              <div className="flex gap-3">
                <button onClick={next} className="flex-1 bg-violet-600/20 border border-violet-500/40 text-violet-300 rounded-2xl py-3">Outra →</button>
                <button onClick={onNext} className="flex-1 bg-white/[0.06] border border-white/[0.08] text-white rounded-2xl py-3">Próximo →</button>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  )
}

// ── ROLEPLAY ─────────────────────────────────────────────────
const SCENARIOS=[{title:'Desconhecidos no Bar',desc:'Fingem que nunca se conheceram.',d:'Fácil'},{title:'Chefe e Secretário/a',desc:'Reunião que toma um rumo inesperado.',d:'Médio'},{title:'Detetive e Suspeito',desc:'Interrogatório imaginário.',d:'Médio'},{title:'Médico e Paciente',desc:'Consulta muito profissional... ou não.',d:'Fácil'},{title:'Vizinhos',desc:'O ruído ao lado leva a um encontro.',d:'Fácil'},{title:'Chef e Crítico',desc:'Uma refeição avaliada com exigência.',d:'Fácil'},{title:'Estranhos no Elevador',desc:'Presos. 5 minutos. Sem sair.',d:'Médio'}]

function RoleplaySection({onNext}){
  const [s,setS]=useState(()=>SCENARIOS[Math.floor(Math.random()*SCENARIOS.length)])
  const [timer,setTimer]=useState(0),[running,setRunning]=useState(false)
  useEffect(()=>{if(!running)return;const iv=setInterval(()=>setTimer(t=>t+1),1000);return()=>clearInterval(iv)},[running])
  const m=Math.floor(timer/60),s2=timer%60
  const dc={Fácil:'text-green-400',Médio:'text-amber-400',Difícil:'text-red-400'}
  return(
    <div className="space-y-4">
      <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-5">
        <div className="flex justify-between mb-2"><span className="text-slate-400 text-xs uppercase tracking-wider">Cenário</span><span className={`text-xs font-bold ${dc[s.d]}`}>{s.d}</span></div>
        <h3 className="text-white font-black text-xl mb-1">{s.title}</h3>
        <p className="text-slate-300 text-sm">{s.desc}</p>
      </div>
      <div className="flex gap-3 items-center">
        <div className="flex-1 bg-white/[0.04] rounded-2xl py-3 text-center"><p className="text-white font-mono font-black text-3xl">{String(m).padStart(2,'0')}:{String(s2).padStart(2,'0')}</p></div>
        <div className="flex gap-2">
          <button onClick={()=>setRunning(r=>!r)} className={`px-4 py-3 rounded-xl font-bold ${running?'bg-red-500 text-white':'bg-green-500 text-white'}`}>{running?'⏸':'▶'}</button>
          <button onClick={()=>{setTimer(0);setRunning(false)}} className="px-4 py-3 rounded-xl bg-white/[0.07] text-slate-300 font-bold">↺</button>
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={()=>{setS(SCENARIOS[Math.floor(Math.random()*SCENARIOS.length)]);setTimer(0);setRunning(false)}} className="flex-1 bg-white/[0.05] border border-white/[0.07] text-white rounded-2xl py-3 font-medium">🎲 Novo</button>
        <button onClick={onNext} className="flex-1 bg-white/[0.07] text-white rounded-2xl py-3 font-medium">Próximo →</button>
      </div>
    </div>
  )
}

// ── ACTIVITIES CONFIG ─────────────────────────────────────────
const ACTIVITIES=[
  {id:'map',        icon:Map,        label:'Mapa do Casal',    desc:'Board erótico — Snakes & Ladders',    color:'from-rose-500 to-pink-600',    premium:false,once:true},
  {id:'dice',       icon:Dice6,      label:'Dados Eróticos',   desc:'20 ações × 20 partes do corpo',       color:'from-rose-500 to-pink-600',    premium:false},
  {id:'challenges', icon:Heart,      label:'Desafios',          desc:'Físicos, sensoriais e emocionais',    color:'from-red-500 to-rose-600',     premium:false},
  {id:'quiz',       icon:HelpCircle, label:'Quiz do Casal',    desc:'Conheces bem o teu parceiro?',         color:'from-violet-600 to-purple-700',premium:false},
  {id:'roleplay',   icon:Film,       label:'Roleplay',          desc:'10 cenários com timer',               color:'from-slate-600 to-slate-800',  premium:false},
  {id:'scratch',    icon:Ticket,     label:'Posição do Dia',   desc:'Raspadinha diária Kamasutra',          color:'from-amber-500 to-orange-500', premium:false,once:true},
  {id:'kinky',      icon:Lock,       label:'Modo Intenso 🔒',  desc:'Desafios para os mais corajosos',     color:'from-red-700 to-rose-900',     premium:true},
]

// When multiple activities selected (excluding map/scratch), rotate randomly
function pickNextActivity(pool){
  return pool[Math.floor(Math.random()*pool.length)]
}

export default function CoupleGame(){
  const navigate=useNavigate()
  const game=loadGame()
  const [phase,setPhase]=useState('menu') // menu | playing | map
  const [selected,setSelected]=useState(['dice','challenges'])
  const [showScratch,setShowScratch]=useState(false)
  const [turn,setTurn]=useState(0)
  const [currentAct,setCurrentAct]=useState(null)

  const players=game?.players||[{name:'Jogador 1',color:'from-pink-400 to-rose-500'},{name:'Jogador 2',color:'from-cyan-400 to-blue-500'}]
  const player=players[turn%2]

  const playableActs=selected.filter(s=>s!=='scratch'&&s!=='map')

  const toggle=id=>{
    const act=ACTIVITIES.find(a=>a.id===id)
    if(act?.premium)return
    if(id==='scratch'){setShowScratch(true);return}
    setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id])
  }

  const start=()=>{
    if(selected.includes('map')&&playableActs.length===0){setPhase('map');return}
    // Pick first activity randomly
    const pool=playableActs
    setCurrentAct(pickNextActivity(pool))
    setPhase('playing')
  }

  const nextTurn=()=>{
    setTurn(t=>t+1)
    if(selected.includes('map')&&playableActs.length>0){
      // Randomly decide: map or activity
      const goMap=Math.random()<0.3
      if(goMap){setPhase('map');return}
    }
    setCurrentAct(pickNextActivity(playableActs))
  }

  // ── MENU ──────────────────────────────────────────────────
  if(phase==='menu')return(
    <div className="min-h-screen flex flex-col" style={{background:'radial-gradient(ellipse at 50% -10%, rgba(225,29,72,0.15) 0%, #080b14 55%)'}}>
      <div className="p-4 flex items-center gap-3 max-w-lg mx-auto w-full">
        <button onClick={()=>navigate('/')} className="text-slate-400 hover:text-white"><ChevronLeft className="w-5 h-5"/></button>
        <div><h1 className="text-white font-black text-xl">💕 Modo Casal</h1><p className="text-slate-500 text-sm">Escolhe o que queres jogar</p></div>
      </div>
      <div className="flex-1 px-4 pb-8 max-w-lg mx-auto w-full space-y-2.5">
        {ACTIVITIES.map((act,i)=>{
          const isSel=selected.includes(act.id)
          return(
            <motion.button key={act.id}
              initial={{opacity:0,x:-12}} animate={{opacity:1,x:0}} transition={{delay:i*0.05}}
              whileHover={!act.premium?{scale:1.01}:{}} whileTap={!act.premium?{scale:0.98}:{}}
              onClick={()=>toggle(act.id)}
              className={`w-full rounded-2xl p-4 flex items-center gap-4 border transition-all text-left
                ${act.premium?'opacity-50 cursor-not-allowed border-white/[0.04] bg-white/[0.02]'
                  :isSel?'border-rose-500/40 bg-rose-500/8 shadow-lg'
                  :'border-white/[0.06] bg-white/[0.03] hover:border-white/[0.15]'}`}
              style={isSel&&!act.premium?{boxShadow:`0 0 20px rgba(225,29,72,0.12)`}:{}}>
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${act.color} flex items-center justify-center flex-shrink-0 shadow-lg ${!isSel&&!act.premium?'opacity-50':''}`}>
                <act.icon className="text-white w-6 h-6"/>
              </div>
              <div className="flex-1">
                <p className={`font-bold ${isSel||act.premium?'text-white':'text-slate-400'}`}>{act.label}</p>
                <p className="text-slate-500 text-sm">{act.desc}</p>
                {act.premium&&<p className="text-amber-600 text-xs mt-0.5">Em breve disponível</p>}
              </div>
              {act.premium?<Lock className="text-slate-600 w-5 h-5 flex-shrink-0"/>
                :act.once?<span className="text-amber-400 text-xs font-bold flex-shrink-0">{act.id==='map'?isSel?'✓ Incluído':'INCLUIR':isSel?'✓':'ABRIR →'}</span>
                :<div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSel?'border-rose-400 bg-rose-500':'border-white/[0.15]'}`}>
                  {isSel&&<Check className="text-white w-3.5 h-3.5"/>}
                </div>
              }
            </motion.button>
          )
        })}
        {playableActs.length>1&&(
          <div className="bg-cyan-500/8 border border-cyan-500/20 rounded-2xl p-3 text-center">
            <p className="text-cyan-400 text-xs">🎲 Com {playableActs.length} atividades selecionadas, vão sair aleatoriamente!</p>
          </div>
        )}
        <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.97}} onClick={start}
          disabled={selected.filter(s=>s!=='scratch').length===0}
          className="w-full text-white font-black rounded-2xl py-5 text-lg mt-2 disabled:opacity-40"
          style={{background:'linear-gradient(135deg,#e11d48,#9d174d)',boxShadow:'0 4px 24px rgba(225,29,72,0.3)'}}>
          Começar 💕
        </motion.button>
      </div>
      <AnimatePresence>{showScratch&&<DailyScratch onClose={()=>setShowScratch(false)}/>}</AnimatePresence>
    </div>
  )

  // ── MAP MODE ──────────────────────────────────────────────
  if(phase==='map')return(
    <div className="min-h-screen flex flex-col" style={{background:'radial-gradient(ellipse at 50% -10%, rgba(225,29,72,0.12) 0%, #080b14 55%)'}}>
      <div className="p-4 border-b border-white/[0.06] flex items-center justify-between max-w-lg mx-auto w-full">
        <button onClick={()=>setPhase('menu')} className="text-slate-400 hover:text-white"><ChevronLeft className="w-5 h-5"/></button>
        <h1 className="text-white font-bold">💕 Mapa do Casal</h1>
        <div className="w-5"/>
      </div>
      <CoupleMap players={players} onExit={()=>setPhase('menu')}/>
    </div>
  )

  // ── PLAYING ───────────────────────────────────────────────
  return(
    <div className="min-h-screen flex flex-col" style={{background:'radial-gradient(ellipse at 50% -10%, rgba(225,29,72,0.12) 0%, #080b14 55%)'}}>
      <div className="p-4 border-b border-white/[0.06] flex items-center justify-between max-w-lg mx-auto w-full">
        <button onClick={()=>setPhase('menu')} className="text-slate-400 hover:text-white"><ChevronLeft className="w-5 h-5"/></button>
        <div className="text-center">
          <p className="text-white font-bold text-sm">💕 Modo Casal</p>
          <p className="text-slate-500 text-xs">Turno {turn+1} · {player?.name}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${player?.color} flex items-center justify-center text-white font-black`}>{player?.name?.[0]}</div>
      </div>
      {/* Activity indicator */}
      {currentAct&&(
        <div className="px-4 pt-3 max-w-lg mx-auto w-full">
          <div className="flex gap-1.5 flex-wrap">
            {playableActs.map(id=>{
              const act=ACTIVITIES.find(a=>a.id===id)
              return(
                <span key={id} className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all ${currentAct===id?'bg-rose-500/20 border-rose-500/40 text-rose-300':'bg-white/[0.03] border-white/[0.06] text-slate-600'}`}>
                  {act?.label}
                </span>
              )
            })}
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col items-center px-4 py-5 max-w-lg mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div key={`${currentAct}-${turn}`} initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="w-full">
            {currentAct==='dice'       &&<EroticDiceSection onNext={nextTurn}/>}
            {currentAct==='challenges' &&<ChallengesSection players={players} turn={turn} onNext={nextTurn}/>}
            {currentAct==='quiz'       &&<QuizSection players={players} turn={turn} onNext={nextTurn}/>}
            {currentAct==='roleplay'   &&<RoleplaySection onNext={nextTurn}/>}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
