import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { loadGame, CATEGORY_CONFIG } from '../utils/game'
import { api } from '../utils/api'
import DiceRoller from '../components/game/DiceRoller'
import ChallengeCard from '../components/game/ChallengeCard'
import MiniGameModal from '../components/game/MiniGameModal'
import { Trophy, ChevronLeft } from 'lucide-react'

const WINNING_SCORE = 5

function buildMap(cats, miniGames, friendsMode, rotation, length = 60) {
  const isMiniOnly = friendsMode === 'map_mini'
  return Array.from({ length }, (_, i) => {
    if (i === 0) return { type:'start', emoji:'🏁', bg:'#059669' }
    if (isMiniOnly) {
      if (!miniGames.length) return { type:'start', emoji:'⭐', bg:'#6d28d9' }
      const mg = miniGames[Math.floor(Math.random() * miniGames.length)]
      return { type:'minigame', mini:mg, emoji:'🎮', bg:'#7c3aed' }
    }
    if (rotation === 'random') {
      // Equal probability: 50% category, 50% mini-game (if mini-games available)
      const hasMini = miniGames.length > 0
      if (hasMini && Math.random() < 0.5) {
        const mg = miniGames[Math.floor(Math.random() * miniGames.length)]
        return { type:'minigame', mini:mg, emoji:'🎲', bg:'#d97706' }
      }
      const cat = cats[Math.floor(Math.random() * cats.length)]
      const cfg = CATEGORY_CONFIG[cat] || { emoji:'⭐' }
      return { type:'challenge', category:cat, emoji:cfg.emoji, bg:'#6d28d9' }
    }
    // Fixed rotation: mini-games on multiples of 5
    if (i % 5 === 0 && miniGames.length > 0) {
      return { type:'minigame', mini:miniGames[Math.floor(Math.random()*miniGames.length)], emoji:'🎲', bg:'#d97706' }
    }
    const cat = cats[i % cats.length]
    const cfg = CATEGORY_CONFIG[cat] || { emoji:'⭐' }
    return { type:'challenge', category:cat, emoji:cfg.emoji, bg:'#6d28d9' }
  })
}

export default function MapGame() {
  const navigate   = useNavigate()
  const game       = loadGame()
  const players    = game?.players || []
  const cats       = game?.selectedCategories || ['mimica','verdade','acao']
  const miniGames  = game?.miniGames || []
  const friendsMode= game?.friendsMode || 'map_cats'
  const mapRotation= game?.mapRotation || 'random'
  const penaltyType= game?.penaltyType || 'sips'

  const MAP = useRef(buildMap(cats, miniGames, friendsMode, mapRotation)).current

  const [positions,    setPositions]    = useState(players.map(()=>0))
  const [scores,       setScores]       = useState(players.map(()=>0))
  const [currentPlayer,setCurrentPlayer]= useState(0)
  const [rolled,       setRolled]       = useState(false)
  const [moving,       setMoving]       = useState(false)
  const [challenge,    setChallenge]    = useState(null)
  const [showChallenge,setShowChallenge]= useState(false)
  const [miniGame,     setMiniGame]     = useState(null)
  const [ongoings,     setOngoings]     = useState([])
  const [penaltyAnim,  setPenaltyAnim]  = useState(null)
  const [round,        setRound]        = useState(1)
  const mapRef = useRef(null)

  useEffect(()=>{ if(!game) navigate('/') },[])

  const scrollTo = p => {
    if(!mapRef.current)return
    mapRef.current.scrollTo({left:Math.max(0,p*70-mapRef.current.clientWidth/2+35),behavior:'smooth'})
  }

  const handleRoll = async val => {
    if(rolled||moving)return
    setRolled(true); setMoving(true)
    const start = positions[currentPlayer]
    for(let s=1;s<=val;s++){
      await new Promise(r=>setTimeout(r,190))
      const np=Math.min(start+s,MAP.length-1)
      setPositions(p=>p.map((pos,i)=>i===currentPlayer?np:pos))
      scrollTo(np)
    }
    setMoving(false)
    const final = Math.min(start+val,MAP.length-1)
    const tile  = MAP[final]
    setTimeout(async ()=>{
      if(tile.type==='minigame'){
        setMiniGame(tile.mini)
      } else if(tile.type==='challenge'){
        try{
          const c=await api.getRandomChallenge({category:tile.category,mode_type:game?.mode||'friends'})
          if(c&&!c.error){setChallenge(c);setShowChallenge(true)}
        }catch{}
      }
    },350)
  }

  const showPenalty = (playerName) => {
    let anim
    if(penaltyType==='sips'){
      const sips=[1,1,2,2,2,3][Math.floor(Math.random()*6)]
      anim={name:playerName,type:'sips',sips}
    } else if(penaltyType==='penalty'){
      anim={name:playerName,type:'penalty'}
    } else {
      // 'both' → randomly pick ONE
      if(Math.random()<0.5){
        const sips=[1,1,2,2,2,3][Math.floor(Math.random()*6)]
        anim={name:playerName,type:'sips',sips}
      } else {
        anim={name:playerName,type:'penalty'}
      }
    }
    setPenaltyAnim(anim)
    setTimeout(()=>setPenaltyAnim(null),2800)
  }

  const handleResult = result => {
    setShowChallenge(false)
    if(result==='success'){
      const ns=scores.map((sc,i)=>i===currentPlayer?sc+1:sc)
      setScores(ns)
      if(ns[currentPlayer]>=WINNING_SCORE){
        setTimeout(()=>navigate('/VictoryScreen',{state:{players,scores:ns,mode:game?.mode}}),400)
        return
      }
    }
    if(result==='fail') showPenalty(players[currentPlayer]?.name)
    if(result==='accepted'&&challenge?.is_ongoing){
      setOngoings(o=>[...o,{instruction:challenge.ongoing_instruction,playerIdx:currentPlayer,turnsLeft:challenge.ongoing_rounds}])
    }
  }

  const nextPlayer = () => {
    setRolled(false);setChallenge(null);setShowChallenge(false);setMiniGame(null)
    const next=(currentPlayer+1)%players.length
    if(next===0) setRound(r=>r+1)
    setCurrentPlayer(next)
    scrollTo(positions[next])
    setOngoings(os=>os.map(o=>({...o,turnsLeft:o.turnsLeft-1})).filter(o=>o.turnsLeft>0))
  }

  const player   = players[currentPlayer]
  const maxScore = Math.max(...scores)
  const modeLabel= friendsMode==='map_mini'?'🎮 Mini-jogos':mapRotation==='random'?'🎲 50/50 Aleatório':'🔄 Fixo'

  return(
    <div className="min-h-screen bg-[#080b14] flex flex-col">
      <div className="p-4 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <button onClick={()=>navigate('/')} className="text-slate-400 hover:text-white p-1"><ChevronLeft className="w-5 h-5"/></button>
          <div className="flex items-center gap-2"><Trophy className="text-amber-400 w-4 h-4"/><span className="text-white font-bold text-sm">R{round} · {modeLabel}</span></div>
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
            <div key={i} className="bg-orange-500/10 border border-orange-500/25 rounded-xl px-3 py-1.5 text-orange-300 text-xs flex gap-2">
              🔁 <span><b>{players[o.playerIdx]?.name}:</b> {o.instruction} ({o.turnsLeft})</span>
            </div>
          ))}
        </div>
      )}

      {/* MAP */}
      <div className="px-4 py-3 max-w-lg mx-auto w-full">
        <div ref={mapRef} className="flex gap-2 overflow-x-scroll pb-2" style={{scrollbarWidth:'none'}}>
          {MAP.map((tile,idx)=>{
            const here=players.map((p,pi)=>({p,pi})).filter(({pi})=>positions[pi]===idx)
            const isCur=positions[currentPlayer]===idx
            return(
              <motion.div key={idx} animate={isCur?{scale:1.1,boxShadow:'0 0 14px rgba(167,139,250,0.5)'}:{scale:1}}
                className="relative flex-shrink-0 flex flex-col items-center justify-end rounded-2xl"
                style={{width:62,height:66,background:tile.bg+'99',border:`0.5px solid ${isCur?'rgba(167,139,250,0.65)':'rgba(255,255,255,0.06)'}`}}>
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {here.map(({p,pi})=>(
                    <motion.div key={pi} layout initial={{scale:0}} animate={{scale:1}}
                      className={`w-6 h-6 rounded-full bg-gradient-to-br ${p.color} border-2 border-white/50 flex items-center justify-center text-white text-xs font-black shadow`}>
                      {p.name[0]}
                    </motion.div>
                  ))}
                </div>
                <span className="text-2xl mb-1">{tile.emoji}</span>
                <span className="text-white/25 text-xs mb-1 font-mono">{idx}</span>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Score bars */}
      <div className="px-4 max-w-lg mx-auto w-full mb-2">
        {players.map((p,i)=>(
          <div key={i} className="flex items-center gap-2 mb-1">
            <span className="text-xs text-slate-600 w-12 truncate">{p.name.split(' ')[0]}</span>
            <div className="flex-1 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
              <motion.div animate={{width:`${(scores[i]/WINNING_SCORE)*100}%`}} className={`h-full rounded-full bg-gradient-to-r ${p.color}`} transition={{type:'spring',damping:12}}/>
            </div>
            <span className="text-xs text-slate-600 w-6 text-right">{scores[i]}</span>
          </div>
        ))}
      </div>

      {/* Player card */}
      <div className="flex-1 flex flex-col items-center px-4 pb-6 max-w-lg mx-auto w-full gap-4">
        <motion.div layout className="bg-white/[0.04] border border-white/[0.07] rounded-3xl p-5 w-full">
          <div className="flex items-center gap-4 mb-5">
            <motion.div layout className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${player?.color} flex items-center justify-center text-white font-black text-3xl shadow-xl`}>{player?.name?.[0]}</motion.div>
            <div>
              <p className="text-slate-500 text-xs">É a vez de</p>
              <motion.h2 key={currentPlayer} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} className="text-white font-black text-2xl">{player?.name}</motion.h2>
              <p className="text-slate-600 text-xs">Casa {positions[currentPlayer]} · {scores[currentPlayer]} pts</p>
            </div>
            {scores[currentPlayer]===maxScore&&maxScore>0&&<Trophy className="text-amber-400 w-5 h-5 ml-auto"/>}
          </div>
          {!rolled
            ?<DiceRoller onRoll={handleRoll} disabled={moving}/>
            :!moving&&(
              <motion.button initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} whileHover={{scale:1.02}} whileTap={{scale:0.97}} onClick={nextPlayer}
                className="w-full bg-gradient-to-r from-violet-600 to-purple-700 text-white font-bold rounded-2xl py-4 mt-2">
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
            <div className={`backdrop-blur-sm rounded-3xl px-8 py-6 text-center shadow-2xl ${penaltyAnim.type==='penalty'?'bg-emerald-500/85':'bg-amber-500/85'}`}>
              <div className="text-5xl mb-2">{penaltyAnim.type==='penalty'?'⚽':'🍺'}</div>
              <div className="text-black font-black text-2xl">{penaltyAnim.name}</div>
              <div className="text-black/80 font-bold">{penaltyAnim.type==='penalty'?'marca um penálti!':`bebe ${penaltyAnim.sips} golo${penaltyAnim.sips>1?'s':''}!`}</div>
            </div>
          </motion.div>
        )}
        {showChallenge&&challenge&&(
          <ChallengeCard challenge={challenge} player={player} mode={game?.mode} penaltyType={game?.penaltyType}
            onResult={handleResult} onClose={()=>setShowChallenge(false)}/>
        )}
        {miniGame&&(
          <MiniGameModal type={miniGame} players={players} currentPlayer={currentPlayer} onClose={nextPlayer}/>
        )}
      </AnimatePresence>
    </div>
  )
}
