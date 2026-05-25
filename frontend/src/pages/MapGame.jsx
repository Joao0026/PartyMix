import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { loadGame } from '../utils/game'
import { api } from '../utils/api'
import ChallengeCard from '../components/game/ChallengeCard'
import ImpostorCard, { IMPOSTOR_PAIRS, mergeImpostorPairs } from '../components/game/ImpostorCard'
import MiniGameModal from '../components/game/MiniGameModal'
import { BoardDie } from '../components/game/EroticDie'
import { Trophy, ChevronLeft } from 'lucide-react'

const CATEGORY_CONFIG = {
  telepatia:    { emoji:'🧠', color:'#0891b2' },
  perguntas:    { emoji:'📚', color:'#2563eb' },
  proibido:     { emoji:'🚫', color:'#b45309' },
  caos:         { emoji:'💥', color:'#dc2626' },
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

const FRIENDS_SPECIALS = [
  { type:'special', special:'duel', emoji:'⚔️', color:'#dc2626', label:'Duelo' },
  { type:'special', special:'shot', emoji:'🍻', color:'#f97316', label:'Shot/Duelo' },
  { type:'special', special:'rule', emoji:'📜', color:'#9333ea', label:'Regra ativa' },
  { type:'special', special:'steal', emoji:'🕵️', color:'#0891b2', label:'Roubo' },
  { type:'special', special:'shield', emoji:'🛡️', color:'#059669', label:'Proteção' },
  { type:'special', special:'impostor', emoji:'🎭', color:'#c026d3', label:'Impostor' },
  { type:'challenge', category:'caos', emoji:'💥', color:'#dc2626', label:'Caos' },
]

const FAMILY_SPECIALS = [
  { type:'special', special:'team_duel', emoji:'⚔️', color:'#2563eb', label:'Duelo' },
  { type:'special', special:'bonus', emoji:'⭐', color:'#ca8a04', label:'Bónus' },
  { type:'special', special:'risk', emoji:'⚠️', color:'#dc2626', label:'Risco' },
  { type:'special', special:'all_play', emoji:'👨‍👩‍👧', color:'#7c3aed', label:'Todos' },
]

function fallbackChallenge(category, mode = 'friends') {
  const shared = {
    telepatia: { text:'Tema: coisas que existem numa cozinha. Dois jogadores dizem uma palavra ao mesmo tempo.', category:'telepatia', time_limit:10, sips_penalty:2 },
    desenho: { text:'Desenha alguém a tentar encontrar o telemóvel perdido.', category:'desenho', time_limit:60, sips_penalty:2 },
    mimica: { text:'Representa alguém a tentar chegar atrasado sem fazer barulho.', category:'mimica', time_limit:45, sips_penalty:2 },
    proibido: { text:'Palavra: Férias. Faz a equipa adivinhar sem dizer as palavras proibidas.', category:'proibido', forbiddenWords:['praia','viagem','hotel','avião','verão'], sips_penalty:2 },
    caos: { text:'Regra temporária: durante 2 turnos, quem disser nomes próprios perde/bebe.', category:'caos', is_ongoing:true, ongoing_rounds:2, ongoing_instruction:'Sem nomes próprios até acabar a regra.', sips_penalty:2 },
  }
  if (category === 'perguntas') {
    return mode === 'family'
      ? { text:'Qual é o maior oceano do mundo?', category:'perguntas', answer:'Oceano Pacífico', choices:['Atlântico','Índico','Pacífico','Ártico'], difficulty:'facil' }
      : { text:'Que país ganhou o Euro 2016?', category:'perguntas', answer:'Portugal', choices:['França','Portugal','Espanha','Alemanha'], difficulty:'facil', sips_penalty:2 }
  }
  return shared[category] || { text:'Completa um desafio escolhido pelo grupo.', category:category || 'acao', sips_penalty:2 }
}

function buildMap(cats, miniGames, friendsMode, rotation, mapStyle, mode, n = 30) {
  const isMiniOnly = friendsMode === 'map_mini'
  return Array.from({ length: n }, (_, i) => {
    if (i === 0) return { type:'start', emoji:'🏁', color:'#059669', label:'Início' }
    if (mapStyle === 'special' && i > 2 && i < n - 2) {
      const specials = mode === 'family' ? FAMILY_SPECIALS : FRIENDS_SPECIALS
      const chance = mode === 'family' ? 0.26 : 0.36
      if (Math.random() < chance) return specials[Math.floor(Math.random()*specials.length)]
    }
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
function MapGrid({ tiles, positions, players, currentPlayer, layout = 'classic' }) {
  const COLS = 6
  const tileW = 50, tileH = 48, gapX = 6, gapY = 10
  const rows  = Math.ceil(tiles.length / COLS)
  const boardW = layout === 'party' ? 340 : COLS*(tileW+gapX)-gapX
  const boardH = layout === 'party' ? 340 : rows*(tileH+gapY)-gapY

  function tilePos(idx) {
    if (layout === 'party') {
      if (idx === 0) return { x: boardW/2-tileW/2, y: boardH/2-tileH/2 }
      const ring = idx <= 12 ? 86 : 145
      const ringIdx = idx <= 12 ? idx - 1 : idx - 13
      const ringCount = idx <= 12 ? 12 : Math.max(1, tiles.length - 13)
      const angle = -Math.PI / 2 + (ringIdx / ringCount) * Math.PI * 2
      return {
        x: boardW/2 - tileW/2 + Math.cos(angle) * ring,
        y: boardH/2 - tileH/2 + Math.sin(angle) * ring,
      }
    }
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
  const teams       = game?.teams      || null
  const cats        = game?.selectedCategories || ['telepatia','perguntas','mimica']
  const miniGames   = game?.miniGames  || []
  const friendsMode = game?.friendsMode || 'map_cats'
  const mapRotation = game?.mapRotation || 'random'
  const mapStyle    = game?.mapStyle || 'classic'
  const penaltyType = game?.penaltyType || 'sips'
  const isFamily    = game?.mode === 'family'
  const WINNING     = game?.winningScore || 5

  const MAP = useRef(buildMap(cats, miniGames, friendsMode, mapRotation, mapStyle, game?.mode || 'friends', 30)).current

  const [positions,     setPositions]     = useState(players.map(()=>0))
  const [scores,        setScores]        = useState(players.map(()=>0))
  const [categoryScores,setCategoryScores]= useState(() => players.map(()=>Object.fromEntries(cats.map(cat=>[cat,0]))))
  const [fails,         setFails]         = useState(players.map(()=>0))
  const [shields,       setShields]       = useState(players.map(()=>0))
  const [currentPlayer, setCurrentPlayer] = useState(0)
  const [rolled,        setRolled]        = useState(false)
  const [moving,        setMoving]        = useState(false)
  const [challenge,     setChallenge]     = useState(null)
  const [showChallenge, setShowChallenge] = useState(false)
  const [miniGame,      setMiniGame]      = useState(null)
  const [ongoings,      setOngoings]      = useState([])
  const [penaltyAnim,   setPenaltyAnim]   = useState(null)
  const [specialNotice, setSpecialNotice] = useState(null)
  const [specialPicker, setSpecialPicker] = useState(null)
  const [finalBossFor,  setFinalBossFor]  = useState(null)
  const [round,         setRound]         = useState(1)
  const [impostorRound, setImpostorRound] = useState(null)
  const [impostorPairs, setImpostorPairs] = useState(IMPOSTOR_PAIRS)
  const usesCategoryProgress = (game?.mode === 'family' || game?.mode === 'friends') && cats.length > 0

  const playerColors = [
    'from-pink-400 to-rose-500',
    'from-cyan-400 to-blue-500',
    'from-emerald-400 to-teal-500',
    'from-amber-400 to-orange-500',
    'from-violet-400 to-purple-500',
    'from-fuchsia-400 to-pink-500',
    'from-rose-400 to-red-500',
    'from-sky-400 to-blue-500',
  ]
  const rosterForImpostor = players.map((p, i) => ({
    name: p.name,
    color: playerColors[i % playerColors.length],
  }))

  const competitiveOptions = () => {
    if (!challenge) return []
    if (challenge.special === 'team_duel') {
      const teamList = teams?.length ? teams : [
        {name:'Equipa A', color:'from-blue-500 to-cyan-600'},
        {name:'Equipa B', color:'from-red-500 to-rose-600'},
      ]
      return teamList.map((team, idx)=>({label:team.name || `Equipa ${idx+1}`, winnerTeam:idx}))
    }
    if (challenge.special === 'all_play') return [{label:'A mesa conseguiu', winnerIndex:currentPlayer}]
    if (['duel','shot'].includes(challenge.special)) {
      return players.map((p, idx)=>({label:p.name, winnerIndex:idx}))
    }
    return []
  }

  useEffect(() => { if (!game) navigate('/') }, [])

  useEffect(() => {
    let cancelled = false
    const pack = game?.contentPack || 'base'
    void api.getChallenges({ category: 'impostor', mode_type: 'friends', pack }).then((rows) => {
      if (cancelled || !Array.isArray(rows)) return
      setImpostorPairs(mergeImpostorPairs(IMPOSTOR_PAIRS, rows))
    }).catch(() => {})
    return () => { cancelled = true }
  }, [game?.contentPack])

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
      if(tile.type==='special'){handleSpecialTile(tile);return}
      if(tile.type==='minigame'){setMiniGame(tile.mini);return}
      if(tile.type==='challenge'||tile.type==='start'){
        const category = tile.category || cats[0]
        try{
          const c=await api.getRandomChallenge({category,mode_type:game?.mode||'friends',...(game?.contentPack?{pack:game.contentPack}:{})})
          if(c&&!c.error){setChallenge(c);setShowChallenge(true);return}
        }catch{}
        setChallenge(fallbackChallenge(category, game?.mode || 'friends'))
        setShowChallenge(true)
      }
    },400)
  }

  const openSpecialChallenge = async (tile, category) => {
    const effectiveCategory = category || cats[Math.floor(Math.random()*cats.length)] || 'perguntas'
    const intro = {
      all_play: { emoji:'👨‍👩‍👧', title:'Todos jogam!', text:'Toda a mesa participa neste desafio. Se acertarem, o jogador da vez ganha ponto.' },
      team_duel:{ emoji:'⚔️', title:'Duelo de equipas', text:'A equipa adversária lê. Quem responder melhor ganha o ponto.' },
      duel:     { emoji:'⚔️', title:'Duelo', text:'Escolhe um adversário. Quem vencer fica com o ponto.' },
      shot:     { emoji:'🍻', title:'Shot/Duelo', text:'Escolhe um adversário. Perdedor bebe 2 golos.' },
      bonus:    { emoji:'⭐', title:'Bónus difícil', text:'Pergunta difícil. Se acertar, vale 2 pontos.' },
      risk:     { emoji:'⚠️', title:'Risco', text:'Se falhar, perde 1 ponto. Pensa bem antes de responder.' },
    }[tile.special]
    setSpecialNotice({...intro, continueAction: async () => {
      setSpecialNotice(null)
      const specialPrefix = tile.special === 'all_play'
        ? 'Todos jogam: '
        : tile.special === 'team_duel'
        ? 'Duelo de equipas: '
        : tile.special === 'bonus'
        ? 'Bónus valendo 2 pontos: '
        : tile.special === 'risk'
        ? 'Risco, se falhar perde 1 ponto: '
        : 'Duelo: '
      try{
        const params = {category:effectiveCategory,mode_type:game?.mode||'friends',...(game?.contentPack?{pack:game.contentPack}:{})}
        if (tile.special === 'bonus') params.difficulty = 'dificil'
        const c=await api.getRandomChallenge(params)
        const base = (c&&!c.error) ? c : fallbackChallenge(effectiveCategory, game?.mode || 'friends')
        setChallenge({...base, special:tile.special, text:`${specialPrefix}${base.text}`})
      }catch{
        const base = fallbackChallenge(effectiveCategory, game?.mode || 'friends')
        setChallenge({...base, special:tile.special, text:`${specialPrefix}${base.text}`})
      }
      setShowChallenge(true)
    }})
  }

  const handleSpecialTile = async tile => {
    const randomCat = cats[Math.floor(Math.random()*cats.length)] || 'perguntas'
    if (['duel','shot','team_duel','bonus','risk','all_play'].includes(tile.special)) {
      if (['duel','shot','team_duel'].includes(tile.special)) {
        setSpecialPicker({tile, title: tile.special === 'shot' ? 'Escolhe categoria do Shot/Duelo' : 'Escolhe categoria do Duelo'})
        return
      }
      await openSpecialChallenge(tile, tile.special === 'bonus' ? 'perguntas' : randomCat)
      return
    }
    if (tile.special === 'rule') {
      setOngoings(o=>[...o,{instruction:'Regra ativa: o grupo cria uma regra por 2 turnos.',playerIdx:currentPlayer,turnsLeft:2}])
      setSpecialNotice({emoji:'📜',title:'Regra ativa',text:'Criem uma regra temporária por 2 turnos. Quem quebrar, bebe.'})
      return
    }
    if (tile.special === 'steal') {
      const target = scores.findIndex((score, idx)=>idx!==currentPlayer&&score>0)
      if (target >= 0) {
        setScores(s=>s.map((score,idx)=>idx===target?Math.max(0,score-1):idx===currentPlayer?score+1:score))
        setSpecialNotice({emoji:'🕵️',title:'Roubo!',text:`${players[currentPlayer]?.name} roubou 1 ponto a ${players[target]?.name}.`})
      } else {
        setSpecialNotice({emoji:'🕵️',title:'Roubo falhou',text:'Ninguém tinha pontos para roubar.'})
      }
      return
    }
    if (tile.special === 'shield') {
      setShields(s=>s.map((v,idx)=>idx===currentPlayer?v+1:v))
      setSpecialNotice({emoji:'🛡️',title:'Proteção!',text:'Imune à próxima penalização.'})
      return
    }
    if (tile.special === 'impostor') {
      if (players.length < 3) {
        setSpecialNotice({emoji:'🎭',title:'Impostor',text:'Precisas de pelo menos 3 jogadores para esta carta.'})
        return
      }
      const pair = impostorPairs[Math.floor(Math.random() * impostorPairs.length)]
      setImpostorRound({
        correctQuestion: pair.correctQuestion,
        wrongQuestion: pair.wrongQuestion,
        impostorIndex: Math.floor(Math.random() * players.length),
      })
    }
  }

  const finishImpostorRound = ({ guessedCorrect, impostorIndex }) => {
    const impostorName = players[impostorIndex]?.name
    setImpostorRound(null)
    if (guessedCorrect) {
      triggerPenalty(impostorName, null, impostorIndex)
      setFails((f) => f.map((v, i) => (i === impostorIndex ? v + 1 : v)))
    } else {
      playPenaltySound('sips')
      setPenaltyAnim({ name: impostorName, type: 'distribute', sips: 3 })
      setTimeout(() => setPenaltyAnim(null), 2800)
    }
    setTimeout(nextPlayer, 3200)
  }

  const triggerPenalty = (playerName, failedChallenge, playerIdx = currentPlayer) => {
    if(isFamily)return
    if ((shields[playerIdx] || 0) > 0) {
      setShields(s=>s.map((v,idx)=>idx===playerIdx?Math.max(0,v-1):v))
      setPenaltyAnim({ name: playerName, type: 'shield' })
      setTimeout(()=>setPenaltyAnim(null),2800)
      return
    }
    if (game?.mode === 'friends') {
      if (failedChallenge?.category === 'perguntas') {
        playPenaltySound('sips')
        setPenaltyAnim({ name: playerName, type: 'sips', sips: 2 })
        setTimeout(()=>setPenaltyAnim(null),2800)
        return
      }
      if (['mimica','desenho','telepatia','proibido'].includes(failedChallenge?.category)) {
        playPenaltySound('sips')
        setPenaltyAnim({ name: playerName, type: 'sips', sips: 2 })
        setTimeout(()=>setPenaltyAnim(null),2800)
        return
      }
    }
    const sips=Math.floor(Math.random()*3)+1
    let anim
    if(penaltyType==='sips')      anim={name:playerName,type:'sips',sips}
    else if(penaltyType==='penalty') anim={name:playerName,type:'penalty'}
    else anim=Math.random()<0.10?{name:playerName,type:'penalty'}:{name:playerName,type:'sips',sips}
    playPenaltySound(anim.type)
    setPenaltyAnim(anim)
    setTimeout(()=>setPenaltyAnim(null),2800)
  }

  const handleResult = (result, options = {}) => {
    setShowChallenge(false)
    let autoNext = false
    if (finalBossFor !== null) {
      if (result === 'success') {
        setTimeout(()=>navigate('/VictoryScreen',{state:{players,scores,fails,mode:game?.mode,finalBoss:true}}),400)
      } else {
        setScores(s=>s.map((score,i)=>i===finalBossFor?Math.max(0,score-1):score))
        setSpecialNotice({emoji:'👑',title:'Desafio final falhado',text:'Perde 1 ponto e tem de tentar chegar à meta outra vez.'})
      }
      setFinalBossFor(null)
      return
    }
    if(result==='success'){
      const points = challenge?.special === 'bonus' ? 2 : 1
      const awardTargets = options.winnerTeam !== undefined
        ? players.map((p, idx)=>p.team===options.winnerTeam?idx:null).filter(idx=>idx!==null)
        : [options.winnerIndex ?? currentPlayer]
      const targets = awardTargets.length ? awardTargets : [currentPlayer]
      let ns
      let categoryDone = false
      if (usesCategoryProgress && cats.includes(challenge?.category)) {
        const nextCategoryScores = categoryScores.map((row, i) => {
          if (!targets.includes(i)) return row
          return {...row, [challenge.category]: Math.min(3, (row[challenge.category] || 0) + points)}
        })
        setCategoryScores(nextCategoryScores)
        ns = nextCategoryScores.map(row => cats.reduce((sum, cat) => sum + (row[cat] || 0), 0))
        categoryDone = targets.some(target => cats.every(cat => (nextCategoryScores[target][cat] || 0) >= 3))
      } else {
        ns=scores.map((sc,i)=>targets.includes(i)?sc+points:sc)
      }
      setScores(ns)
      if((usesCategoryProgress ? categoryDone : targets.some(target => ns[target]>=WINNING))){
        setFinalBossFor(targets[0] ?? currentPlayer)
        setChallenge({
          text: isFamily ? 'Desafio final: a equipa adversária escolhe uma categoria. Se acertarem, ganham o jogo.' : 'Boss final: completa um último desafio escolhido pelo grupo para confirmar a vitória.',
          category: 'caos',
          special: 'final_boss',
        })
        setShowChallenge(true)
        return
      }
      autoNext = options.autoNext
    }
    if(result==='fail'){
      setFails(f=>f.map((v,i)=>i===currentPlayer?v+1:v))
      if (challenge?.special === 'risk') {
        if (usesCategoryProgress && cats.includes(challenge?.category)) {
          const nextCategoryScores = categoryScores.map((row, i) => {
            if (i !== currentPlayer) return row
            return {...row, [challenge.category]: Math.max(0, (row[challenge.category] || 0) - 1)}
          })
          setCategoryScores(nextCategoryScores)
          setScores(nextCategoryScores.map(row => cats.reduce((sum, cat) => sum + (row[cat] || 0), 0)))
        } else {
          setScores(s=>s.map((score,i)=>i===currentPlayer?Math.max(0,score-1):score))
        }
      }
      triggerPenalty(players[currentPlayer]?.name, challenge, currentPlayer)
      autoNext = options.autoNext
    }
    if(result==='accepted'&&challenge?.is_ongoing){
      setOngoings(o=>[...o,{instruction:challenge.ongoing_instruction,playerIdx:currentPlayer,turnsLeft:challenge.ongoing_rounds||2}])
    }
    if (autoNext) setTimeout(nextPlayer, result === 'fail' && !isFamily ? 3000 : 500)
  }

  const nextPlayer = () => {
    setRolled(false);setChallenge(null);setShowChallenge(false);setMiniGame(null);setSpecialPicker(null);setSpecialNotice(null)
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
            <span className="text-white font-bold text-sm">R{round} · {usesCategoryProgress ? '3 por categoria' : `Meta: ${WINNING} pts`}</span>
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
        <MapGrid tiles={MAP} positions={positions} players={players} currentPlayer={currentPlayer} layout="party"/>
      </div>

      {/* Score bars */}
      <div className="px-4 max-w-lg mx-auto w-full mb-2">
        {usesCategoryProgress&&(
          <div className="mb-3 rounded-2xl border border-white/[0.07] bg-white/[0.04] p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-white text-xs font-black uppercase tracking-[0.18em]">Falta a {player?.name}</p>
              <p className="text-slate-500 text-xs">{scores[currentPlayer]}/{cats.length*3}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {cats.map(cat=>{
                const count=categoryScores[currentPlayer]?.[cat]||0
                return(
                  <div key={cat} className="rounded-xl border border-white/[0.06] bg-black/15 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-bold text-slate-300">{CATEGORY_CONFIG[cat]?.emoji || '🎴'} {cat}</span>
                      <span className={`text-xs font-black ${count>=3?'text-emerald-300':'text-white'}`}>{count}/3</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500" style={{width:`${Math.min(100,(count/3)*100)}%`}}/>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
        {!usesCategoryProgress&&players.map((p,i)=>(
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
              {shields[currentPlayer]>0&&<p className="text-emerald-400 text-xs">🛡️ Proteção ativa</p>}
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
            <div className={`backdrop-blur-sm rounded-3xl px-8 py-6 text-center shadow-2xl ${penaltyAnim.type==='penalty'||penaltyAnim.type==='shield'?'bg-emerald-500/90':'bg-amber-500/90'}`}>
              <div className="text-5xl mb-2">{penaltyAnim.type==='penalty'?'⚽':penaltyAnim.type==='shield'?'🛡️':penaltyAnim.type==='distribute'?'👑':'🍺'}</div>
              <div className="text-black font-black text-2xl">{penaltyAnim.name}</div>
              <div className="text-black/80 font-bold text-lg">
                {penaltyAnim.type==='penalty'
                  ? 'marca um penálti!'
                  : penaltyAnim.type==='shield'
                  ? 'usou a proteção!'
                  : penaltyAnim.type==='distribute'
                  ? `distribui ${penaltyAnim.sips} golos!`
                  : `bebe ${penaltyAnim.sips} golo${penaltyAnim.sips>1?'s':''}!`}
              </div>
            </div>
          </motion.div>
        )}
        {showChallenge&&challenge&&(
          <ChallengeCard challenge={challenge} player={player} mode={game?.mode} penaltyType={isFamily?'none':penaltyType}
            competitors={competitiveOptions()} onResult={handleResult} onClose={()=>setShowChallenge(false)}/>
        )}
        {miniGame&&<MiniGameModal type={miniGame} players={players} currentPlayer={currentPlayer} onClose={nextPlayer}/>}
        {specialNotice&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#111827] p-6 text-center space-y-4">
              <div className="text-6xl">{specialNotice.emoji}</div>
              <h3 className="text-white font-black text-2xl">{specialNotice.title}</h3>
              <p className="text-slate-300">{specialNotice.text}</p>
              <button onClick={()=>specialNotice.continueAction?void specialNotice.continueAction():(()=>{setSpecialNotice(null);nextPlayer()})()} className="w-full rounded-2xl bg-violet-600 py-4 text-white font-black">
                {specialNotice.continueAction?'Revelar desafio':'Continuar'}
              </button>
            </div>
          </motion.div>
        )}
        {specialPicker&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#111827] p-6 space-y-4">
              <div className="text-center">
                <div className="text-6xl mb-2">{specialPicker.tile.emoji}</div>
                <h3 className="text-white font-black text-2xl">{specialPicker.title}</h3>
                <p className="text-slate-400 text-sm mt-1">A categoria define que tipo de desafio sai.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {cats.map(cat=>(
                  <button key={cat} onClick={()=>{setSpecialPicker(null);void openSpecialChallenge(specialPicker.tile, cat)}}
                    className="rounded-2xl border border-white/[0.08] bg-white/[0.05] p-3 text-left text-white font-bold">
                    <span className="mr-2">{CATEGORY_CONFIG[cat]?.emoji || '🎴'}</span>{cat}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
        {impostorRound && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55] bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          >
            <div className="w-full max-w-lg rounded-3xl border border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-950 to-slate-950 p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="text-center mb-4">
                <div className="text-5xl mb-2">🎭</div>
                <h3 className="text-white font-black text-2xl">Carta Impostor</h3>
                <p className="text-slate-400 text-sm mt-1">Passa o telemóvel — 1 jogador viu outra pergunta.</p>
              </div>
              <ImpostorCard
                players={rosterForImpostor}
                correctQuestion={impostorRound.correctQuestion}
                wrongQuestion={impostorRound.wrongQuestion}
                impostorIndex={impostorRound.impostorIndex}
                mode="friends"
                onComplete={finishImpostorRound}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
