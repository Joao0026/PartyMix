import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { shuffle } from '../../utils/game'

// ─── MAIOR OU MENOR ──────────────────────────────────────────
// Baralho PT: do mais alto ao mais baixo — Ás, Rei, Valete, Dama, 10…2
const SUITS = ['♠', '♥', '♦', '♣']
const VALS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
const ORDER = {
  A: 13, K: 12, J: 11, Q: 10,
  10: 9, 9: 8, 8: 7, 7: 6, 6: 5, 5: 4, 4: 3, 3: 2, 2: 1,
}
const CARD_LABEL = { A: 'Ás', K: 'Rei', J: 'Valete' }
const isRed = (s) => s === '♥' || s === '♦'
function cardLabel(v) { return CARD_LABEL[v] || v }
function buildDeck() { const d = []; for (const s of SUITS) for (const v of VALS) d.push({ s, v }); return shuffle(d) }

function CardFace({card,hidden}){
  if(hidden)return<div className="w-16 h-24 rounded-xl bg-gradient-to-br from-violet-800 to-purple-900 border-2 border-white/20 flex items-center justify-center shadow-xl"><span className="text-white/20 text-2xl">?</span></div>
  return(
    <motion.div initial={{rotateY:90,opacity:0}} animate={{rotateY:0,opacity:1}} transition={{type:'spring',damping:12}}
      className="w-16 h-24 rounded-xl bg-white flex flex-col justify-between p-1.5 shadow-xl">
      <span className={`text-sm font-black ${isRed(card.s)?'text-red-500':'text-slate-900'}`}>{cardLabel(card.v)}</span>
      <span className={`text-xl text-center ${isRed(card.s)?'text-red-500':'text-slate-900'}`}>{card.s}</span>
      <span className={`text-sm font-black self-end rotate-180 ${isRed(card.s)?'text-red-500':'text-slate-900'}`}>{cardLabel(card.v)}</span>
    </motion.div>
  )
}

function HigherLowerGame({players,currentPlayer,onFinish}){
  const TARGET=8
  // Players take turns in order starting from currentPlayer
  const ordered=[...players.slice(currentPlayer),...players.slice(0,currentPlayer)]
  const [activeIdx,setActiveIdx]=useState(0)
  const [deck,setDeck]=useState(()=>buildDeck())
  const [cardIdx,setCardIdx]=useState(0)
  const [streak,setStreak]=useState(0)
  const [flipped,setFlipped]=useState(false)
  const [turnResult,setTurnResult]=useState(null) // 'win'|'fail'|null
  const [allDone,setAllDone]=useState(false)

  const cur=deck[cardIdx],nxt=deck[cardIdx+1]
  const thisPlayer=ordered[activeIdx]

  const guess=higher=>{
    if(flipped)return
    const correct=higher?ORDER[nxt.v]>ORDER[cur.v]:ORDER[nxt.v]<ORDER[cur.v]
    setFlipped(true)
    if(correct){
      const ns=streak+1
      setStreak(ns)
      if(ns>=TARGET) setTurnResult('win')
      // else just show next card button
    } else {
      setTurnResult('fail')
    }
  }

  const advanceTurn=()=>{
    const next=activeIdx+1
    if(next>=ordered.length){setAllDone(true);return}
    setActiveIdx(next)
    setDeck(buildDeck()); setCardIdx(0); setStreak(0); setFlipped(false); setTurnResult(null)
  }

  const nextCard=()=>{
    if(cardIdx+2>=deck.length){setDeck(buildDeck());setCardIdx(0)}
    else setCardIdx(i=>i+1)
    setFlipped(false)
  }

  if(allDone)return(
    <div className="text-center space-y-4">
      <p className="text-2xl">✅</p>
      <p className="text-white font-black text-xl">Mini-jogo terminado!</p>
      <button onClick={onFinish} className="w-full bg-slate-600 text-white font-bold rounded-2xl py-3">Fechar</button>
    </div>
  )

  return(
    <div className="flex flex-col items-center gap-5">
      <div className="w-full bg-white/[0.04] border border-white/[0.07] rounded-2xl p-3 text-center">
        <p className="text-slate-400 text-xs">Vez de</p>
        <p className="text-white font-black text-xl">{thisPlayer?.name}</p>
        <p className="text-slate-500 text-xs">Jogador {activeIdx+1} de {ordered.length} · Meta: {TARGET} streak</p>
      </div>
      <p className="text-amber-400 font-bold text-lg">🔥 Streak: {streak}/{TARGET}</p>
      <div className="flex items-center gap-4">
        <CardFace card={cur} hidden={false}/>
        <span className="text-white/30 text-2xl">→</span>
        <CardFace card={nxt} hidden={!flipped}/>
      </div>
      {!flipped&&!turnResult&&(
        <div className="flex gap-3 w-full">
          <motion.button whileTap={{scale:0.95}} onClick={()=>guess(true)} className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black rounded-2xl py-4 text-xl">↑ Maior</motion.button>
          <motion.button whileTap={{scale:0.95}} onClick={()=>guess(false)} className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 text-white font-black rounded-2xl py-4 text-xl">↓ Menor</motion.button>
        </div>
      )}
      {flipped&&!turnResult&&(
        <button onClick={nextCard} className="w-full bg-white/[0.07] text-white font-bold rounded-2xl py-3">Próxima Carta →</button>
      )}
      {turnResult&&(
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="w-full text-center space-y-3">
          {turnResult==='win'
            ?<><p className="text-green-400 font-black text-2xl">🏆 Chegou ao streak {TARGET}!</p><p className="text-amber-400 font-bold">🍺 Os outros bebem 3 goles!</p></>
            :<><p className="text-red-400 font-black text-2xl">❌ Falhou no streak {streak}!</p><p className="text-amber-400 font-bold">🍺 {thisPlayer?.name} bebe {Math.max(1,TARGET-streak)} gole{TARGET-streak!==1?'s':''}!</p></>
          }
          <button onClick={advanceTurn} className="w-full bg-slate-600 text-white font-bold rounded-2xl py-3">
            {activeIdx+1<ordered.length?`Próximo: ${ordered[activeIdx+1]?.name} →`:'Ver Resultados →'}
          </button>
        </motion.div>
      )}
    </div>
  )
}

// ─── GRUPO CHALLENGE ──────────────────────────────────────────
const GROUP_TASKS=[
  {text:'Vai buscar algo {color} em menos de 10 segundos!',colors:['vermelho','azul','verde','amarelo','preto','branco','cor-de-laranja','roxo']},
  {text:'Conta uma piada. Se alguém rir, passas. Se ninguém rir, perdes!',type:'judge'},
  {text:'Imita um animal sem fazer sons. O grupo tem 15 segundos para adivinhar.',type:'mimic'},
  {text:'O grupo escolhe o que o jogador tem de fazer:',type:'vote',options:['Ligar para alguém 📞','Cantar 15 seg 🎵','Fazer 10 flexões 💪','Dançar 30 seg 💃']},
  {text:'Equilibra o telemóvel na cabeça durante 10 segundos sem segurar.',type:'balance'},
  {text:'Diz 5 capitais europeias em 5 segundos.',type:'knowledge'},
  {text:'Faz uma pose de yoga e mantém 10 segundos.',type:'physical'},
  {text:'O grupo escolhe o que o jogador tem de fazer:',type:'vote',options:['Imitar o jogador à esquerda 🎭','Dizer um segredo 🤫','Fazer beatbox 20 seg 🎤','Escrever o alfabeto ao contrário ✏️']},
  {text:'Diz uma frase de 10 palavras sem usar a letra "a".',type:'wordgame'},
  {text:'O grupo escolhe:',type:'vote',options:['Beber 2 goles 🍺','Fazer 5 agachamentos 🏋️','Mensagem ao ex 📱','Postar story embaraçoso 📸']},
]

function GroupChallengeGame({players,currentPlayer,onFinish}){
  const [task]=useState(()=>{
    const t=GROUP_TASKS[Math.floor(Math.random()*GROUP_TASKS.length)]
    let text=t.text
    if(t.colors) text=text.replace('{color}',t.colors[Math.floor(Math.random()*t.colors.length)])
    return{...t,text}
  })
  const [choice,setChoice]=useState(null)
  const [result,setResult]=useState(null)
  const [sips]=useState(Math.floor(Math.random()*4)+1)
  const player=players[currentPlayer]

  return(
    <div className="flex flex-col gap-5">
      <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-5 text-center">
        <p className="text-green-300 text-xs mb-2 font-semibold">DESAFIO PARA {player?.name?.toUpperCase()}</p>
        <p className="text-white font-bold text-lg leading-snug">{task.text}</p>
      </div>
      {task.options&&!choice&&(
        <div className="space-y-2">
          <p className="text-slate-400 text-sm text-center">O grupo decide:</p>
          {task.options.map((opt,i)=>(
            <motion.button key={i} whileTap={{scale:0.97}} onClick={()=>setChoice(opt)}
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white font-medium hover:bg-white/[0.10] transition-all text-left">
              {opt}
            </motion.button>
          ))}
        </div>
      )}
      {choice&&<div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-center"><p className="text-amber-300 font-bold">Escolha do grupo: {choice}</p></div>}
      {result===null&&(!task.options||choice)&&(
        <div className="flex gap-3">
          <motion.button whileTap={{scale:0.95}} onClick={()=>setResult('win')} className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black rounded-2xl py-4 text-lg">✅ Conseguiu!</motion.button>
          <motion.button whileTap={{scale:0.95}} onClick={()=>setResult('fail')} className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 text-white font-black rounded-2xl py-4 text-lg">❌ Falhou!</motion.button>
        </div>
      )}
      {result&&(
        <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} className="text-center space-y-3">
          {result==='win'
            ?<><p className="text-green-400 font-black text-xl">🏆 Conseguiu!</p><p className="text-amber-400 font-bold">🍺 Os outros bebem {sips} gole{sips>1?'s':''}!</p></>
            :<><p className="text-red-400 font-black text-xl">💀 Falhou!</p><p className="text-amber-400 font-bold">🍺 {player?.name} bebe {sips} gole{sips>1?'s':''}!</p></>
          }
          <button onClick={onFinish} className="w-full bg-slate-600 text-white font-bold rounded-2xl py-3">Fechar</button>
        </motion.div>
      )}
    </div>
  )
}

// ─── ESPIÃO (min 5 players) ───────────────────────────────────
const SPY_WORDS=['Aeroporto','Hospital','Banco','Restaurante','Praia','Cinema','Escola','Museu','Hotel','Supermercado','Estádio','Biblioteca','Farmácia','Submarino','Casino','Teatro','Universidade','Piscina','Igreja','Fábrica','Quartel','Navio','Parque','Aquário']

function SpyGame({players,onFinish}){
  if(players.length<5)return(
    <div className="text-center space-y-4 py-4">
      <p className="text-6xl">🕵️</p>
      <p className="text-white font-bold text-lg">O Espião precisa de<br/>pelo menos 5 jogadores!</p>
      <p className="text-slate-400">({players.length} jogadores actuais)</p>
      <button onClick={onFinish} className="w-full bg-slate-600 text-white font-bold rounded-2xl py-3">Fechar</button>
    </div>
  )

  const [word]=useState(()=>SPY_WORDS[Math.floor(Math.random()*SPY_WORDS.length)])
  const [spyIdx]=useState(()=>Math.floor(Math.random()*players.length))
  const [step,setStep]=useState('reveal')
  const [revealIdx,setRevealIdx]=useState(0)
  const [show,setShow]=useState(false)
  const [voted,setVoted]=useState(null)
  const [result,setResult]=useState(null)
  const [sips]=useState(Math.floor(Math.random()*3)+2)

  const nextReveal=()=>{if(revealIdx<players.length-1){setRevealIdx(i=>i+1);setShow(false)}else setStep('playing')}
  const vote=i=>{setVoted(i);setResult(i===spyIdx?'caught':'escaped')}

  return(
    <div className="flex flex-col gap-4">
      {step==='reveal'&&(
        <>
          <p className="text-white font-bold text-center text-lg">Vez de <b>{players[revealIdx]?.name}</b></p>
          {!show
            ?<button onClick={()=>setShow(true)} className="w-full h-28 bg-white/[0.04] border border-white/[0.08] rounded-2xl text-slate-400 hover:bg-white/[0.08] transition-all flex flex-col items-center justify-center gap-2">
               <span className="text-3xl">👆</span><span>Toca para ver o teu papel</span>
             </button>
            :<motion.div initial={{scale:0.8}} animate={{scale:1}} className={`w-full h-28 rounded-2xl flex flex-col items-center justify-center gap-1 border ${revealIdx===spyIdx?'bg-red-900/25 border-red-500/30':'bg-green-900/25 border-green-500/30'}`}>
               <span className="text-slate-300 text-sm">{revealIdx===spyIdx?'🕵️ Espião!':'✅ Civil'}</span>
               <span className="text-white font-black text-3xl">{revealIdx===spyIdx?'Sem palavra':word}</span>
             </motion.div>
          }
          {show&&<button onClick={nextReveal} className="w-full bg-slate-600 text-white font-bold rounded-2xl py-3">{revealIdx<players.length-1?'Próximo →':'Começar →'}</button>}
          <p className="text-slate-600 text-xs text-center">{revealIdx+1} / {players.length}</p>
        </>
      )}
      {step==='playing'&&!result&&(
        <>
          <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 text-center">
            <p className="text-slate-300 text-sm">Cada um diz uma pista sobre a palavra. O espião tenta adivinhar. Depois votem!</p>
          </div>
          <div className="space-y-2">
            {players.map((p,i)=>(
              <motion.button key={i} whileTap={{scale:0.97}} onClick={()=>vote(i)}
                className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3 text-white font-medium hover:bg-red-900/20 hover:border-red-500/40 transition-all flex items-center gap-3 text-left">
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${p.color} flex items-center justify-center text-white text-xs font-black flex-shrink-0`}>{p.name[0]}</div>
                {p.name}
                <span className="ml-auto text-slate-600 text-xs">votar</span>
              </motion.button>
            ))}
          </div>
        </>
      )}
      {result&&(
        <motion.div initial={{scale:0.9}} animate={{scale:1}} className="text-center space-y-4">
          <div className="text-5xl">{result==='caught'?'🎉':'🕵️'}</div>
          <h3 className="text-white font-black text-xl">{result==='caught'?'Espião apanhado!':'O espião escapou!'}</h3>
          <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 space-y-1 text-sm">
            <p className="text-slate-400">Palavra: <span className="text-white font-bold">{word}</span></p>
            <p className="text-slate-400">Espião: <span className="text-red-400 font-bold">{players[spyIdx]?.name}</span></p>
          </div>
          {result==='caught'
            ?<p className="text-amber-400 font-bold">🍺 {players[spyIdx]?.name} bebe {sips} goles!</p>
            :<p className="text-amber-400 font-bold">🍺 Todos os outros bebem {sips} goles!</p>
          }
          <button onClick={onFinish} className="w-full bg-slate-600 text-white font-bold rounded-2xl py-3">Fechar</button>
        </motion.div>
      )}
    </div>
  )
}

// ─── 10 SEGUNDOS ─────────────────────────────────────────────
const TEN_CATS=[
  {cat:'Marcas de carros',n:5},{cat:'Países da Europa',n:6},{cat:'Frutas tropicais',n:5},
  {cat:'Futebolistas portugueses',n:5},{cat:'Capitais europeias',n:5},{cat:'Animais selvagens',n:6},
  {cat:'Músicos portugueses',n:4},{cat:'Filmes da Disney',n:5},{cat:'Desportos olímpicos',n:6},
  {cat:'Países de língua portuguesa',n:4},{cat:'Ingredientes de pizza',n:5},{cat:'Marcas de telemóvel',n:5},
  {cat:'Rios europeus',n:4},{cat:'Instrumentos musicais',n:5},{cat:'Tipos de queijo',n:4},
  {cat:'Cidades de Portugal',n:6},{cat:'Marcas de roupa',n:5},{cat:'Personagens de cartoon',n:5},
  {cat:'Capitais da América do Sul',n:5},{cat:'Animais marinhos',n:6},{cat:'Tipos de massa italiana',n:5},
]

function TenSecondsGame({players,currentPlayer,onFinish}){
  const [ch]=useState(()=>TEN_CATS[Math.floor(Math.random()*TEN_CATS.length)])
  const [t,setT]=useState(10)
  const [started,setStarted]=useState(false)
  const [ended,setEnded]=useState(false)
  const [ok,setOk]=useState(null)
  const [sips]=useState(Math.floor(Math.random()*5)+1)
  const player=players[currentPlayer]

  useEffect(()=>{
    if(!started||ended)return
    if(t<=0){setEnded(true);return}
    const tm=setTimeout(()=>setT(s=>s-1),1000)
    return()=>clearTimeout(tm)
  },[started,t,ended])

  return(
    <div className="flex flex-col items-center gap-5">
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-center w-full">
        <p className="text-amber-300 text-sm mb-1">{player?.name} deve nomear:</p>
        <p className="text-white font-black text-xl">{ch.n} {ch.cat}</p>
        <p className="text-slate-400 text-sm">em 10 segundos!</p>
      </div>
      {!started&&!ended&&(
        <motion.button whileTap={{scale:0.95}} onClick={()=>setStarted(true)}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black rounded-2xl py-5 text-2xl">
          ▶ COMEÇAR
        </motion.button>
      )}
      {started&&!ended&&(
        <div className="w-full space-y-3">
          <div className="relative h-5 bg-white/[0.08] rounded-full overflow-hidden">
            <motion.div className={`absolute inset-y-0 left-0 rounded-full ${t<=3?'bg-red-500':'bg-amber-500'}`}
              animate={{width:`${(t/10)*100}%`}} transition={{duration:1,ease:'linear'}}/>
          </div>
          <motion.p animate={t<=3?{scale:[1,1.3,1]}:{}} transition={{repeat:Infinity,duration:0.5}}
            className={`text-center font-black text-6xl ${t<=3?'text-red-400':'text-white'}`}>{t}</motion.p>
        </div>
      )}
      {ended&&ok===null&&(
        <div className="w-full space-y-3 text-center">
          <p className="text-white font-bold text-lg">{player?.name} conseguiu?</p>
          <div className="flex gap-3">
            <motion.button whileTap={{scale:0.95}} onClick={()=>setOk(true)}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black rounded-2xl py-5 text-xl">✅ Sim</motion.button>
            <motion.button whileTap={{scale:0.95}} onClick={()=>setOk(false)}
              className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 text-white font-black rounded-2xl py-5 text-xl">❌ Não</motion.button>
          </div>
        </div>
      )}
      {ok!==null&&(
        <motion.div initial={{scale:0.8}} animate={{scale:1}} className="text-center space-y-3 w-full">
          <p className={`font-black text-2xl ${ok?'text-green-400':'text-red-400'}`}>{ok?'🏆 Conseguiu!':'😅 Não conseguiu!'}</p>
          <p className="text-amber-400 font-bold text-lg">
            🍺 {ok?`Os outros bebem ${sips} gole${sips>1?'s':''}!`:`${player?.name} bebe ${sips} gole${sips>1?'s':''}!`}
          </p>
          <button onClick={onFinish} className="w-full bg-slate-600 text-white font-bold rounded-2xl py-3">Fechar</button>
        </motion.div>
      )}
    </div>
  )
}

// ─── BATALHA ─────────────────────────────────────────────────
const BATTLE_TOPICS=[
  'Pizza hawaiiana: crime ou obra de arte?','Porto é melhor que Lisboa.',
  'Os gatos são superiores aos cães.','Trabalhar em casa é melhor que no escritório.',
  'Os videojogos são desperdício de tempo.','Ananás na pizza devia ser ilegal.',
  'Dormir a sesta é sinal de preguiça.','O Verão é a melhor estação do ano.',
  'As redes sociais fizeram mais mal que bem.','O dinheiro compra a felicidade.',
  'É melhor ser temido que amado.','Café ou chá — qual é melhor?',
  'Trabalho às 8h devia ser proibido.','Os gatos são mais inteligentes que os cães.',
  'A geração Z é mais preguiçosa que as anteriores.','Os ricos merecem ser ricos.',
]

function BattleGame({players,currentPlayer,onFinish}){
  const [topic]=useState(()=>BATTLE_TOPICS[Math.floor(Math.random()*BATTLE_TOPICS.length)])
  const [phase,setPhase]=useState('pick')
  const [p1,setP1]=useState(currentPlayer)
  const [p2,setP2]=useState(null)
  const [t,setT]=useState(30)
  const [arguer,setArguer]=useState(0)
  const [winner,setWinner]=useState(null)
  const [sips]=useState(Math.floor(Math.random()*3)+2)

  useEffect(()=>{
    if(phase!=='argue')return
    if(t<=0){if(arguer===0){setArguer(1);setT(30)}else setPhase('vote');return}
    const tm=setTimeout(()=>setT(s=>s-1),1000)
    return()=>clearTimeout(tm)
  },[phase,t,arguer])

  const curArguerIdx=arguer===0?p1:p2

  return(
    <div className="flex flex-col gap-4">
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-center">
        <p className="text-amber-400 text-xs font-bold mb-1">TEMA DO DEBATE</p>
        <p className="text-white font-black text-lg leading-snug">{topic}</p>
      </div>

      {phase==='pick'&&(
        <>
          <p className="text-slate-400 text-sm text-center">
            {players[currentPlayer]?.name} deve debater.<br/>Escolhe o adversário:
          </p>
          <div className="space-y-2">
            {players.map((p,i)=>{
              if(i===currentPlayer)return null
              return(
                <motion.button key={i} whileTap={{scale:0.97}} onClick={()=>setP2(i)}
                  className={`w-full px-4 py-3 rounded-xl border flex items-center gap-3 transition-all ${p2===i?'bg-rose-600/20 border-rose-500 text-white':'bg-white/[0.04] border-white/[0.07] text-slate-300 hover:border-white/20'}`}>
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${p.color} flex items-center justify-center text-white text-xs font-black flex-shrink-0`}>{p.name[0]}</div>
                  {p.name}
                  {p2===i&&<span className="ml-auto text-rose-400 text-xs font-bold">CONTRA ✓</span>}
                </motion.button>
              )
            })}
          </div>
          <div className="flex gap-3 text-sm text-center">
            <div className="flex-1 bg-cyan-600/10 border border-cyan-500/30 rounded-xl p-3">
              <p className="text-cyan-400 font-bold">PRO</p>
              <p className="text-white">{players[p1]?.name}</p>
            </div>
            <div className="flex-1 bg-rose-600/10 border border-rose-500/30 rounded-xl p-3">
              <p className="text-rose-400 font-bold">CONTRA</p>
              <p className="text-white">{p2!==null?players[p2]?.name:'?'}</p>
            </div>
          </div>
          <button onClick={()=>setPhase('argue')} disabled={p2===null}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-2xl py-4 disabled:opacity-40">
            Começar ⚔️
          </button>
        </>
      )}

      {phase==='argue'&&(
        <>
          <div className={`text-center p-4 rounded-2xl border ${arguer===0?'bg-cyan-600/10 border-cyan-500/30':'bg-rose-600/10 border-rose-500/30'}`}>
            <p className="text-slate-400 text-xs mb-1">{arguer===0?'PRO':'CONTRA'}</p>
            <p className="text-white font-black text-xl">{players[curArguerIdx]?.name} argumenta</p>
          </div>
          <div className="relative w-full h-4 bg-white/[0.08] rounded-full overflow-hidden">
            <motion.div className={`absolute inset-y-0 left-0 rounded-full ${t<=5?'bg-red-500':arguer===0?'bg-cyan-500':'bg-rose-500'}`}
              animate={{width:`${(t/30)*100}%`}} transition={{duration:1,ease:'linear'}}/>
          </div>
          <motion.p animate={t<=5?{scale:[1,1.3,1]}:{}} transition={{repeat:Infinity,duration:0.5}}
            className={`font-black text-6xl text-center ${t<=5?'text-red-400':'text-white'}`}>{t}</motion.p>
        </>
      )}

      {phase==='vote'&&winner===null&&(
        <>
          <p className="text-white font-bold text-center text-lg">Quem foi mais convincente?</p>
          <p className="text-slate-400 text-sm text-center">Votem com thumbs up!</p>
          <div className="flex gap-4">
            {[{idx:p1,side:'PRO',color:'bg-cyan-600/20 border-cyan-500'},{idx:p2,side:'CONTRA',color:'bg-rose-600/20 border-rose-500'}].map(({idx,side,color})=>(
              <motion.button key={idx} whileHover={{scale:1.03}} whileTap={{scale:0.95}}
                onClick={()=>setWinner(idx)}
                className={`flex-1 py-6 rounded-2xl font-bold border flex flex-col items-center gap-2 ${color}`}>
                <span className="text-4xl">👍</span>
                <span className="text-white font-black">{players[idx]?.name}</span>
                <span className="text-xs text-slate-400">{side}</span>
              </motion.button>
            ))}
          </div>
        </>
      )}

      {winner!==null&&(
        <motion.div initial={{scale:0.8}} animate={{scale:1}} className="text-center space-y-4">
          <div className="text-6xl">🏆</div>
          <p className="text-white font-black text-2xl">{players[winner]?.name} venceu!</p>
          <p className="text-amber-400 font-bold text-lg">🍺 {players[winner===p1?p2:p1]?.name} bebe {sips} goles!</p>
          <button onClick={onFinish} className="w-full bg-slate-600 text-white font-bold rounded-2xl py-3">Fechar</button>
        </motion.div>
      )}
    </div>
  )
}

// ─── SYNC ─────────────────────────────────────────────────────
const SYNC_TOPICS=['Cores','Animais','Países','Desportos','Comidas','Frutas','Marcas famosas','Nomes masculinos','Nomes femininos','Cidades de Portugal','Profissões','Filmes','Séries de TV','Músicos','Meios de transporte','Bebidas alcoólicas','Desportos olímpicos','Marcas de roupa','Personagens Disney','Animais marinhos']

function SyncGame({players,currentPlayer,onFinish}){
  const [topic]=useState(()=>SYNC_TOPICS[Math.floor(Math.random()*SYNC_TOPICS.length)])
  const [syncPlayers]=useState(()=>{
    const others=players.map((_,i)=>i).filter(i=>i!==currentPlayer)
    const n=Math.min(2,others.length) // 1 or 2 additional players
    const picked=shuffle([...others]).slice(0,n)
    return [currentPlayer,...picked]
  })
  const [result,setResult]=useState(null)
  const [sips]=useState(Math.floor(Math.random()*3)+1)
  const syncNames=syncPlayers.map(i=>players[i]?.name).join(' + ')

  return(
    <div className="flex flex-col gap-5">
      <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-2xl p-5 text-center">
        <p className="text-cyan-300 text-xs font-semibold mb-2">TEMA</p>
        <p className="text-white font-black text-3xl">{topic}</p>
      </div>

      <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4">
        <p className="text-slate-400 text-xs text-center mb-3">Jogadores que participam:</p>
        <div className="flex justify-center gap-2 flex-wrap">
          {syncPlayers.map(i=>(
            <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${players[i]?.color}`}>
              <span className="text-white text-sm font-bold">{players[i]?.name}</span>
              {i===currentPlayer&&<span className="text-white/60 text-xs">(obrigatório)</span>}
            </div>
          ))}
        </div>
      </div>

      <p className="text-slate-300 text-sm text-center leading-relaxed">
        <b className="text-white">{syncNames}</b> dizem simultaneamente uma palavra do tema.<br/>
        Se coincidirem: os <b className="text-white">outros bebem</b>!<br/>
        Se não: <b className="text-white">eles bebem</b>!
      </p>

      {result===null&&(
        <div className="flex gap-3">
          <motion.button whileTap={{scale:0.95}} onClick={()=>setResult('win')}
            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black rounded-2xl py-4 text-lg">
            🎊 Sincronizaram!
          </motion.button>
          <motion.button whileTap={{scale:0.95}} onClick={()=>setResult('fail')}
            className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 text-white font-black rounded-2xl py-4 text-lg">
            😅 Não
          </motion.button>
        </div>
      )}

      {result&&(
        <motion.div initial={{scale:0.8}} animate={{scale:1}} className="text-center space-y-3">
          {result==='win'
            ?<><p className="text-green-400 font-black text-2xl">🎊 SYNC!</p><p className="text-amber-400 font-bold text-lg">🍺 Os outros bebem {sips} gole{sips>1?'s':''}!</p></>
            :<><p className="text-red-400 font-black text-2xl">😅 Sem sync!</p><p className="text-amber-400 font-bold text-lg">🍺 {syncNames} bebe{syncPlayers.length>1?'m':''} {sips} gole{sips>1?'s':''}!</p></>
          }
          <button onClick={onFinish} className="w-full bg-slate-600 text-white font-bold rounded-2xl py-3">Fechar</button>
        </motion.div>
      )}
    </div>
  )
}

// ─── QUEM SOU EU? (só para o jogador que calhou) ─────────────
const FAMOUS_PEOPLE=['Cristiano Ronaldo','Lionel Messi','Elon Musk','Taylor Swift','Barack Obama','Beyoncé','Steve Jobs','Albert Einstein','Napoleon Bonaparte','Cleopatra','Harry Potter','Darth Vader','Mickey Mouse','James Bond','Batman','António Costa','José Mourinho','Figo','Pauleta','Salvador Sobral','Ana Moura','Tony Carreira','Madonna','Michael Jackson','Shakira','Drake','Billie Eilish','The Rock','Oprah Winfrey','Cristina Ferreira','Bruno Aleixo','Rita Ora','Pedro Pascal','Margot Robbie','Zendaya']

function PasswordGame({players,currentPlayer,onFinish}){
  const [name]=useState(()=>FAMOUS_PEOPLE[Math.floor(Math.random()*FAMOUS_PEOPLE.length)])
  const [showName,setShowName]=useState(false)
  const [guesses,setGuesses]=useState(0)
  const [revealed,setRevealed]=useState(false)
  const player=players[currentPlayer]

  return(
    <div className="flex flex-col gap-4">
      <div className="bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-2xl p-4 text-center">
        <p className="text-fuchsia-300 text-sm font-bold">Só para {player?.name}</p>
        <p className="text-slate-400 text-xs mt-1">Mostra o nome ao grupo — menos a {player?.name}!</p>
      </div>

      <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-5 text-center">
        <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${player?.color} flex items-center justify-center text-white font-black text-3xl mb-3`}>{player?.name?.[0]}</div>
        <p className="text-slate-400 text-sm">O telemóvel vai na testa de</p>
        <p className="text-white font-black text-2xl">{player?.name}</p>
      </div>

      {!showName?(
        <button onClick={()=>setShowName(true)}
          className="w-full bg-fuchsia-600/20 border border-fuchsia-500/40 rounded-2xl py-4 text-fuchsia-300 font-bold hover:bg-fuchsia-600/30 transition-all">
          👁️ Mostrar nome ao grupo (menos a {player?.name})
        </button>
      ):(
        <motion.div initial={{scale:0.8}} animate={{scale:1}}
          className="bg-fuchsia-900/30 border border-fuchsia-500/40 rounded-2xl py-8 text-center">
          <p className="text-white font-black text-4xl">{name}</p>
        </motion.div>
      )}

      {showName&&!revealed&&(
        <div className="space-y-3">
          <p className="text-slate-300 text-sm text-center">{player?.name} faz perguntas de SIM ou NÃO.<br/><span className="text-slate-500">{guesses} tentativas até agora.</span></p>
          <div className="flex gap-3">
            <button onClick={()=>setGuesses(g=>g+1)}
              className="flex-1 bg-white/[0.06] border border-white/[0.08] text-slate-300 rounded-2xl py-3 font-medium">
              + Tentativa ({guesses})
            </button>
            <motion.button whileTap={{scale:0.95}} onClick={()=>setRevealed(true)}
              className="flex-1 bg-green-500/20 border border-green-500/40 text-green-400 rounded-2xl py-3 font-bold">
              ✅ Adivinhou!
            </motion.button>
          </div>
          <button onClick={()=>setRevealed(true)} className="w-full text-slate-600 text-xs hover:text-slate-400 transition-colors py-2">
            Desistiu / Revelar →
          </button>
        </div>
      )}

      {revealed&&(
        <motion.div initial={{scale:0.8}} animate={{scale:1}} className="text-center space-y-3">
          <p className="text-green-400 font-black text-xl">✅ Era: {name}!</p>
          <p className="text-slate-400 text-sm">{guesses} tentativa{guesses!==1?'s':''}</p>
          <button onClick={onFinish} className="w-full bg-slate-600 text-white font-bold rounded-2xl py-3">Fechar</button>
        </motion.div>
      )}
    </div>
  )
}

// ─── WRAPPER ─────────────────────────────────────────────────
export const MINI_GAME_META={
  maior_menor: {title:'🃏 Maior ou Menor',  color:'from-blue-600 to-cyan-600'},
  grupo:       {title:'👥 Desafio Grupo',   color:'from-green-600 to-emerald-600'},
  espio:       {title:'🕵️ Espião',          color:'from-slate-600 to-slate-800'},
  '10_segundos':{title:'⏱ 10 Segundos',    color:'from-orange-500 to-amber-600'},
  batalha:     {title:'⚔️ Batalha',         color:'from-red-600 to-rose-700'},
  sync:        {title:'🎊 Sync',            color:'from-cyan-600 to-blue-700'},
  password:    {title:'🤔 Quem Sou Eu?',   color:'from-fuchsia-600 to-pink-700'},
}

export default function MiniGameModal({type,players,currentPlayer,onClose}){
  const meta=MINI_GAME_META[type]||{title:'🎲 Mini-Jogo',color:'from-violet-600 to-purple-700'}
  return(
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center overlay-safe-pad">
      <motion.div initial={{y:120,opacity:0}} animate={{y:0,opacity:1}} exit={{y:120,opacity:0}}
        transition={{type:'spring',damping:20}}
        className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        <div className={`bg-gradient-to-r ${meta.color} px-5 py-4 flex items-center justify-between flex-shrink-0`}>
          <h3 className="text-white font-black text-xl">{meta.title}</h3>
          <button onClick={onClose} className="text-white/60 hover:text-white text-2xl font-bold w-8 h-8 flex items-center justify-center">✕</button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">
          {type==='maior_menor' &&<HigherLowerGame    players={players} currentPlayer={currentPlayer} onFinish={onClose}/>}
          {type==='espio'       &&<SpyGame            players={players}                               onFinish={onClose}/>}
          {type==='10_segundos' &&<TenSecondsGame     players={players} currentPlayer={currentPlayer} onFinish={onClose}/>}
          {type==='batalha'     &&<BattleGame         players={players} currentPlayer={currentPlayer} onFinish={onClose}/>}
          {type==='grupo'       &&<GroupChallengeGame players={players} currentPlayer={currentPlayer} onFinish={onClose}/>}
          {type==='sync'        &&<SyncGame           players={players} currentPlayer={currentPlayer} onFinish={onClose}/>}
          {type==='password'    &&<PasswordGame       players={players} currentPlayer={currentPlayer} onFinish={onClose}/>}
        </div>
      </motion.div>
    </div>
  )
}
