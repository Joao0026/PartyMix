import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { loadGame } from '../utils/game'
import { api } from '../utils/api'
import ChallengeCard from '../components/game/ChallengeCard'
import MiniGameModal from '../components/game/MiniGameModal'
import { BoardDie } from '../components/game/EroticDie'
import { Trophy, ChevronLeft } from 'lucide-react'

const CATEGORY_CONFIG = {
  mimica:       { emoji:'🎭', color:'#7c3aed' },
  desenho:      { emoji:'🎨', color:'#db2777' },
  palavra:      { emoji:'💬', color:'#2563eb' },
  acao:         { emoji:'⚡', color:'#d97706' },
  verdade:      { emoji:'❓', color:'#dc2626' },
  consequencia: { emoji:'🎲', color:'#475569' },
  cultura:      { emoji:'📚', color:'#059669' },
  desporto:     { emoji:'⚽', color:'#16a34a' },
  musica:       { emoji:'🎵', color:'#9333ea' },
  cinema:       { emoji:'🎬', color:'#334155' },
}

function buildMap(cats, miniGames, friendsMode, rotation, n = 30) {
  const isMiniOnly = friendsMode === 'map_mini'
  return Array.from({ length: n }, (_, i) => {
    if (i === 0) return { type:'start', emoji:'🏁', color:'#059669', label:'Início' }
    if (isMiniOnly) {
      if (!miniGames?.length) return { type:'minigame', mini:{id:'random',label:'Mini-jogo aleatório'}, emoji:'🎮', color:'#6d28d9' }
      const mg = miniGames[Math.floor(Math.random()*miniGames.length)]
      return { type:'minigame', mini:mg, emoji:'🎮', color:'#7c3aed' }
    }
    if (rotation === 'random') {
      if (miniGames?.length && Math.random() < 0.5) {
        const mg = miniGames[Math.floor(Math.random()*miniGames.length)]
        return { type:'minigame', mini:mg, emoji:'🎮', color:'#d97706' }
      }
      const cat = cats[Math.floor(Math.random()*cats.length)]
      const cfg = CATEGORY_CONFIG[cat] || { emoji:'⭐', color:'#6d28d9' }
      return { type:'challenge', category:cat, emoji:cfg.emoji, color:cfg.color }
    }
    if (i%5===0 && miniGames?.length) {
      return { type:'minigame', mini:miniGames[Math.floor(Math.random()*miniGames.length)], emoji:'🎮', color:'#d97706' }
    }
    const cat = cats[i%cats.length]
    const cfg = CATEGORY_CONFIG[cat] || { emoji:'⭐', color:'#6d28d9' }
    return { type:'challenge', category:cat, emoji:cfg.emoji, color:cfg.color }
  })
}

// Snake layout grid
function MapGrid({ tiles, positions, players, currentPlayer }) {
  const COLS = 6
  const tileW = 50, tileH = 48, gapX = 6, gapY = 10
  const rows  = Math.ceil(tiles.length / COLS)
  const boardW = COLS*(tileW+gapX)-gapX
  const boardH = rows*(tileH+gapY)-gapY

  function tilePos(idx) {
    const row = Math.floor(idx/COLS)
    const col = row%2===0 ? idx%COLS : COLS-1-(idx%COLS)
    return { x:col*(tileW+gapX), y:(rows-1-row)*(tileH+gapY) }
  }

  const PLAYER_COLORS_CSS = [
    'linear-gradient(135deg,#ec4899,#f43f5e)',
    'linear-gradient(135deg,#06b6d4,#3b82f6)',
    'linear-gradient(135deg,#10b981,#059669)',
    'linear-gradient(135deg,#f59e0b,#d97706)',
    'linear-gradient(135deg,#8b5cf6,#7c3aed)',
    'linear-gradient(135deg,#f43f5e,#dc2626)',
  ]

  return (
    <div style={{ position:'relative', width:boardW, height:boardH, margin:'0 auto' }}>
      <svg style={{ position:'absolute', inset:0, width:boardW, height:boardH, pointerEvents:'none', zIndex:0 }}>
        {tiles.map((_,i) => {
          if (i===0) return null
          const a=tilePos(i-1), b=tilePos(i)
          return <line key={i} x1={a.x+tileW/2} y1={a.y+tileH/2} x2={b.x+tileW/2} y2={b.y+tileH/2}
            stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeDasharray="4 3"/>
        })}
      </svg>
      {tiles.map((tile, idx) => {
        const { x, y } = tilePos(idx)
        const here = players.filter((_,pi)=>positions[pi]===idx)
        const isCur = positions[currentPlayer]===idx
        return (
          <motion.div key={idx}
            animate={isCur?{scale:1.12,boxShadow:`0 0 12px ${tile.color}bb`}:{scale:1,boxShadow:'none'}}
            style={{
              position:'absolute', left:x, top:y, width:tileW, height:tileH,
              background:tile.color+'cc', borderRadius:10, zIndex:isCur?2:1,
              border:`1.5px solid ${isCur?tile.color:'rgba(255,255,255,0.07)'}`,
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end',
              paddingBottom:2, overflow:'visible',
            }}>
            <div style={{ position:'absolute', top:-10, left:'50%', transform:'translateX(-50%)', display:'flex', gap:2 }}>
              {here.map((p,i)=>(
                <div key={i} style={{
                  width:17, height:17, borderRadius:'50%',
                  background: PLAYER_COLORS_CSS[players.indexOf(p)%PLAYER_COLORS_CSS.length],
                  border:'1.5px solid rgba(255,255,255,0.7)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color:'white', fontSize:9, fontWeight:900, boxShadow:'0 2px 6px rgba(0,0,0,0.5)',
                }}>{p.name?.[0]}</div>
              ))}
            </div>
            <span style={{ fontSize:18, lineHeight:1 }}>{tile.emoji}</span>
            <span style={{ fontSize:8, color:'rgba(255,255,255,0.3)', fontFamily:'monospace' }}>{idx}</span>
          </motion.div>
        )
      })}
    </div>
  )
}

function playPenaltySound(type) {
  try {
    const ctx=new(window.AudioContext||window.webkitAudioContext)()
    const o=ctx.createOscillator(),g=ctx.createGain()
    o.connect(g);g.connect(ctx.destination)
    o.frequency.setValueAtTime(type==='sips'?350:500,ctx.currentTime)
    o.frequency.setValueAtTime(type==='sips'?250:400,ctx.currentTime+0.2)
    g.gain.setValueAtTime(0.2,ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.5)
    o.start(ctx.currentTime);o.stop(ctx.currentTime+0.55)
  } catch {}
}

export default function MapGame() {
  const navigate    = useNavigate()
  const game        = loadGame()
  const players     = game?.players    || []
  const cats        = game?.selectedCategories || ['mimica','verdade','acao']
  const miniGames   = game?.miniGames  || []
  const friendsMode = game?.friendsMode || 'map_cats'
  const mapRotation = game?.mapRotation || 'random'
  const penaltyType = game?.penaltyType || 'sips'
  const isFamily    = game?.mode === 'family'
  const WINNING     = game?.winningScore || 5

  const MAP = useRef(buildMap(cats, miniGames, friendsMode, mapRotation, 30)).current

  const [positions,     setPositions]     = useState(players.map(()=>0))
  const [scores,        setScores]        = useState(players.map(()=>0))
  const [fails,         setFails]         = useState(players.map(()=>0))
  const [currentPlayer, setCurrentPlayer] = useState(0)
  const [rolled,        setRolled]        = useState(false)
  const [moving,        setMoving]        = useState(false)
  const [challenge,     setChallenge]     = useState(null)
  const [showChallenge, setShowChallenge] = useState(false)
  const [miniGame,      setMiniGame]      = useState(null)
  const [ongoings,      setOngoings]      = useState([])
  const [penaltyAnim,   setPenaltyAnim]   = useState(null)
  const [round,         setRound]         = useState(1)

  useEffect(() => { if (!game) navigate('/') }, [])

  const handleRoll = async val => {
    if (rolled||moving) return
    setRolled(true); setMoving(true)
    const start = positions[currentPlayer]
    for (let s=1; s<=val; s++) {
      await new Promise(r=>setTimeout(r,200))
      const np=(start+s)%MAP.length
      setPositions(p=>p.map((pos,i)=>i===currentPlayer?np:pos))
    }
    setMoving(false)
    const final=(start+val)%MAP.length
    const tile=MAP[final]
    setTimeout(async()=>{
      if(tile.type==='minigame'){setMiniGame(tile.mini);return}
      if(tile.type==='challenge'||tile.type==='start'){
        try{
          const c=await api.getRandomChallenge({category:tile.category||cats[0],mode_type:game?.mode||'friends'})
          if(c&&!c.error){setChallenge(c);setShowChallenge(true);return}
        }catch{}
        setChallenge({text:`Desafio de ${tile.category||'mímica'}!`,category:tile.category||cats[0],sips_penalty:2})
        setShowChallenge(true)
      }
    },400)
  }

  const triggerPenalty = playerName => {
    if(isFamily)return
    const sips=Math.floor(Math.random()*3)+1
    let anim
    if(penaltyType==='sips')      anim={name:playerName,type:'sips',sips}
    else if(penaltyType==='penalty') anim={name:playerName,type:'penalty'}
    else anim=Math.random()<0.10?{name:playerName,type:'penalty'}:{name:playerName,type:'sips',sips}
    playPenaltySound(anim.type)
    setPenaltyAnim(anim)
    setTimeout(()=>setPenaltyAnim(null),2800)
  }

  const handleResult = result => {
    setShowChallenge(false)
    if(result==='success'){
      const ns=scores.map((sc,i)=>i===currentPlayer?sc+1:sc)
      setScores(ns)
      if(ns[currentPlayer]>=WINNING){
        setTimeout(()=>navigate('/VictoryScreen',{state:{players,scores:ns,fails,mode:game?.mode}}),400)
        return
      }
    }
    if(result==='fail'){
      setFails(f=>f.map((v,i)=>i===currentPlayer?v+1:v))
      triggerPenalty(players[currentPlayer]?.name)
    }
    if(result==='accepted'&&challenge?.is_ongoing){
      setOngoings(o=>[...o,{instruction:challenge.ongoing_instruction,playerIdx:currentPlayer,turnsLeft:challenge.ongoing_rounds||2}])
    }
  }

  const nextPlayer = () => {
    setRolled(false);setChallenge(null);setShowChallenge(false);setMiniGame(null)
    const next=(currentPlayer+1)%players.length
    if(next===0)setRound(r=>r+1)
    setCurrentPlayer(next)
    setOngoings(os=>os.map(o=>({...o,turnsLeft:o.turnsLeft-1})).filter(o=>o.turnsLeft>0))
  }

  if(!players.length)return null
  const player=players[currentPlayer]
  const maxScore=Math.max(...scores,0)

  return(
    <div className="min-h-screen flex flex-col" style={{background:'linear-gradient(160deg,#0f0c1a 0%,#1a0a2e 50%,#0d1a2e 100%)'}}>
      {/* Header */}
      <div className="p-4 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <button onClick={()=>navigate('/')} className="text-slate-400 hover:text-white p-1"><ChevronLeft className="w-5 h-5"/></button>
          <div className="flex items-center gap-2">
            <Trophy className="text-amber-400 w-4 h-4"/>
            <span className="text-white font-bold text-sm">R{round} · Meta: {WINNING} pts</span>
          </div>
          <div className="flex gap-2">
            {players.map((p,i)=>(
              <div key={i} className="text-center">
                <div className={`text-sm font-black ${i===currentPlayer?'text-amber-400':'text-white'}`}>{scores[i]}</div>
                <div className="text-slate-600 text-xs truncate max-w-10">{p.name.split(' ')[0]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {ongoings.length>0&&(
        <div className="px-4 pt-2 space-y-1 max-w-lg mx-auto w-full">
          {ongoings.map((o,i)=>(
            <div key={i} className="bg-orange-500/10 border border-orange-500/25 rounded-xl px-3 py-1.5 text-orange-300 text-xs">
              🔁 <b>{players[o.playerIdx]?.name}:</b> {o.instruction} ({o.turnsLeft} turnos)
            </div>
          ))}
        </div>
      )}

      {/* Map */}
      <div className="px-4 py-3 overflow-x-auto max-w-lg mx-auto w-full">
        <MapGrid tiles={MAP} positions={positions} players={players} currentPlayer={currentPlayer}/>
      </div>

      {/* Score bars */}
      <div className="px-4 max-w-lg mx-auto w-full mb-2">
        {players.map((p,i)=>(
          <div key={i} className="flex items-center gap-2 mb-1">
            <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${p.color} flex items-center justify-center text-white text-xs font-black flex-shrink-0`}>{p.name[0]}</div>
            <div className="flex-1 h-2 bg-white/[0.05] rounded-full overflow-hidden">
              <motion.div animate={{width:`${(scores[i]/WINNING)*100}%`}}
                className={`h-full rounded-full bg-gradient-to-r ${p.color}`} transition={{type:'spring',damping:12}}/>
            </div>
            <span className="text-xs text-slate-500 w-12 text-right">{scores[i]}/{WINNING}</span>
          </div>
        ))}
      </div>

      {/* Player card */}
      <div className="flex-1 flex flex-col items-center px-4 pb-6 max-w-lg mx-auto w-full gap-3">
        <motion.div layout className="bg-white/[0.04] border border-white/[0.07] rounded-3xl p-5 w-full">
          <div className="flex items-center gap-4 mb-4">
            <motion.div layout className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${player?.color} flex items-center justify-center text-white font-black text-2xl shadow-xl flex-shrink-0`}>{player?.name?.[0]}</motion.div>
            <div>
              <p className="text-slate-500 text-xs">Vez de</p>
              <motion.h2 key={currentPlayer} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} className="text-white font-black text-xl">{player?.name}</motion.h2>
              <p className="text-slate-600 text-xs">Casa {positions[currentPlayer]} · {scores[currentPlayer]}/{WINNING} pts</p>
            </div>
            {scores[currentPlayer]===maxScore&&maxScore>0&&<Trophy className="text-amber-400 w-5 h-5 ml-auto flex-shrink-0"/>}
          </div>
          {!rolled
            ?<BoardDie onRoll={handleRoll} disabled={moving} color="#7c3aed" whiteDice={true}/>
            :!moving&&(
              <motion.button initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} whileHover={{scale:1.02}} whileTap={{scale:0.97}} onClick={nextPlayer}
                className="w-full bg-gradient-to-r from-violet-600 to-purple-700 text-white font-bold rounded-2xl py-4">
                Próximo Jogador →
              </motion.button>
            )
          }
        </motion.div>
      </div>

      <AnimatePresence>
        {penaltyAnim&&(
          <motion.div key="pen" initial={{opacity:0,scale:0.6,y:40}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.6,y:-40}}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className={`backdrop-blur-sm rounded-3xl px-8 py-6 text-center shadow-2xl ${penaltyAnim.type==='penalty'?'bg-emerald-500/90':'bg-amber-500/90'}`}>
              <div className="text-5xl mb-2">{penaltyAnim.type==='penalty'?'⚽':'🍺'}</div>
              <div className="text-black font-black text-2xl">{penaltyAnim.name}</div>
              <div className="text-black/80 font-bold text-lg">{penaltyAnim.type==='penalty'?'marca um penálti!':`bebe ${penaltyAnim.sips} golo${penaltyAnim.sips>1?'s':''}!`}</div>
            </div>
          </motion.div>
        )}
        {showChallenge&&challenge&&(
          <ChallengeCard challenge={challenge} player={player} mode={game?.mode} penaltyType={isFamily?'none':penaltyType}
            onResult={handleResult} onClose={()=>setShowChallenge(false)}/>
        )}
        {miniGame&&<MiniGameModal type={miniGame} players={players} currentPlayer={currentPlayer} onClose={nextPlayer}/>}
      </AnimatePresence>
    </div>
  )
}
