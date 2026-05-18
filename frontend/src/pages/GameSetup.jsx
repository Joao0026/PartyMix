import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, ChevronRight, ChevronLeft, Users, Map, Zap, Gamepad2, Target } from 'lucide-react'
import { PLAYER_COLORS, TEAM_COLORS, saveGame } from '../utils/game'
import { NumericDie } from '../components/game/EroticDie'

const MODE_CONFIG = {
  couple:  { label:'Modo Casal',   color:'from-rose-500 to-pink-600',  min:2, max:2,  cats:['romantico','picante','verdade','acao','roleplay','casal_pergunta'], hasTeams:false, hasMini:false },
  friends: { label:'Modo Amigos',  color:'from-cyan-400 to-blue-500',  min:2, max:20, cats:['telepatia','perguntas','desenho','mimica','proibido','caos'],           hasTeams:true,  hasMini:true  },
  family:  { label:'Modo Família', color:'from-sky-400 to-indigo-500', min:2, max:20, cats:['telepatia','perguntas','desenho','mimica','proibido'],           hasTeams:true,  hasMini:false },
}

const CAT_LABELS = {
  telepatia:'🧠 Sincronia', perguntas:'📚 Sabichão', desenho:'🎨 Rabiscos',
  mimica:'🎭 Gestos', proibido:'🚫 Palavra Tabu', caos:'💥 Caos',
  palavra:'💬 Palavra', acao:'⚡ Ação',
  verdade:'❓ Verdade', consequencia:'🎲 Consequência', cultura:'📚 Cultura',
  desporto:'⚽ Desporto', musica:'🎵 Música', cinema:'🎬 Cinema',
  erotico:'🔥 Erótico', romantico:'🌹 Conexão', picante:'🔥 Picante',
  roleplay:'🎭 Cena', casal_pergunta:'💬 Quanto me conheces?',
}

const MINI_GAMES = [
  {id:'maior_menor', label:'🃏 Maior/Menor'}, {id:'grupo',label:'👥 Grupo'},
  {id:'espio',label:'🕵️ Espião (5+)'}, {id:'10_segundos',label:'⏱ 10 Segundos'},
  {id:'batalha',label:'⚔️ Batalha'}, {id:'sync',label:'🎊 Sync'}, {id:'password',label:'🤔 Quem Sou Eu?'},
]

const FRIENDS_MODES = [
  { id:'map_cats',   icon:Map,      label:'Mapa + Categorias',   desc:'Dado, casas com desafios e mini-jogos' },
  { id:'map_mini',   icon:Gamepad2, label:'Só Mini-jogos',       desc:'Cada casa é um mini-jogo aleatório' },
  { id:'challenges', icon:Zap,      label:'Só Desafios',         desc:'Sem mapa, desafios contínuos' },
]

// Die preview - no framer motion, no transforms
function DiePreview() {
  const [val, setVal] = useState(6)
  const [rolling, setRolling] = useState(false)
  const [showing, setShowing] = useState(false)

  const roll = async () => {
    if (rolling) return
    setRolling(true); setShowing(false)
    let c = 0
    const iv = setInterval(() => { setVal(Math.floor(Math.random()*6)+1); if(++c>14) clearInterval(iv) }, 70)
    await new Promise(r => setTimeout(r, 1100))
    const v = Math.floor(Math.random()*6)+1
    setVal(v); setRolling(false); setShowing(true)
  }

  return (
    <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 space-y-3">
      <p className="text-slate-400 text-sm font-semibold">🎲 Dado do jogo — toca para testar</p>
      <div className="flex items-center gap-6">
        <div onClick={roll} style={{ cursor:'pointer' }}>
          <NumericDie value={val} size={70} dotColor="#7c3aed"/>
        </div>
        <div className="flex-1">
          {rolling && <p className="text-violet-400 text-sm font-semibold">A rolar...</p>}
          {showing && !rolling && (
            <div>
              <p className="text-white font-black text-4xl leading-none">{val}</p>
              <p className="text-slate-500 text-sm">{val===1?'casa':'casas'}</p>
            </div>
          )}
          {!rolling && !showing && (
            <p className="text-slate-500 text-sm">O resultado aparece aqui antes de avançar no jogo</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function GameSetup() {
  const [params]  = useSearchParams()
  const navigate  = useNavigate()
  const mode      = params.get('mode') || 'friends'
  const cfg       = MODE_CONFIG[mode] || MODE_CONFIG.friends
  const isFamily  = mode === 'family'

  const [step,        setStep]        = useState(0)
  const [players,     setPlayers]     = useState([
    {name:'Jogador 1', color:PLAYER_COLORS[0], team:0},
    {name:'Jogador 2', color:PLAYER_COLORS[1], team:1},
  ])
  const [teamsOn,    setTeamsOn]    = useState(false)
  const [teams,      setTeams]      = useState([{name:'Equipa A',color:TEAM_COLORS[0]},{name:'Equipa B',color:TEAM_COLORS[1]}])
  const [categories, setCategories] = useState(cfg.cats.slice(0,3))
  const [miniGames,  setMiniGames]  = useState(['maior_menor','grupo','batalha','sync'])
  const [penalty,    setPenalty]    = useState('sips')
  const [friendsMode,setFriendsMode]= useState('map_cats')
  const [mapRotation,setMapRotation]= useState('random')
  const [mapStyle,   setMapStyle]   = useState('classic')

  // Score mode for friends: '3_per_cat' (like Party & Co) or 'max_points'
  const [scoreMode,  setScoreMode]  = useState('max_points')
  const [maxPoints,  setMaxPoints]  = useState(5)

  // Computed winning scores
  // Family: always 3 × categories (mandatory, like Party & Co)
  // Friends '3_per_cat': 3 × selected categories
  // Friends 'max_points': custom number
  const winningScore = isFamily
    ? categories.length * 3
    : scoreMode === '3_per_cat'
    ? categories.length * 3
    : maxPoints

  const addPlayer    = () => { if(players.length>=cfg.max)return; setPlayers(p=>[...p,{name:`Jogador ${p.length+1}`,color:PLAYER_COLORS[p.length%PLAYER_COLORS.length],team:0}]) }
  const removePlayer = i  => { if(players.length<=cfg.min)return; setPlayers(p=>p.filter((_,j)=>j!==i)) }
  const toggleCat    = c  => setCategories(cs=>cs.includes(c)?(cs.length>1?cs.filter(x=>x!==c):cs):[...cs,c])
  const toggleMini   = m  => setMiniGames(ms=>ms.includes(m)?ms.filter(x=>x!==m):[...ms,m])

  const startGame = () => {
    saveGame({
      mode, players, teams:teamsOn?teams:null,
      selectedCategories: friendsMode==='map_mini' ? [] : categories,
      penaltyType:penalty,
      miniGames: isFamily ? [] : miniGames,
      friendsMode,
      mapRotation,
      mapStyle,
      winningScore,
    })
    if (mode==='couple')                 navigate('/CoupleGame')
    else if (friendsMode==='challenges') navigate('/ChallengesOnly')
    else                                 navigate('/MapGame')
  }

  const totalSteps = cfg.hasTeams ? 2 : 1
  const inp = 'bg-slate-800 border border-slate-600 rounded-xl px-3 py-2.5 text-white outline-none focus:border-violet-500/60 text-sm w-full'

  return (
    <div className="min-h-screen bg-[#080b14] px-4 py-8 flex flex-col items-center">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={()=>step>0?setStep(s=>s-1):navigate('/')} className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/[0.05] transition-all"><ChevronLeft className="w-5 h-5"/></button>
          <div><h2 className="text-white font-bold text-xl">{cfg.label}</h2><p className="text-slate-500 text-sm">Passo {step+1} de {totalSteps}</p></div>
        </div>
        <div className="w-full bg-white/[0.06] rounded-full h-1 mb-6">
          <div className={`bg-gradient-to-r ${cfg.color} h-1 rounded-full transition-all`} style={{width:`${((step+1)/totalSteps)*100}%`}}/>
        </div>

        <AnimatePresence mode="wait">
          {/* ── STEP 0: Players ── */}
          {step===0 && (
            <motion.div key="s0" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} className="space-y-3">
              <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-slate-500"/>Jogadores</h3>
              {players.map((p,i)=>(
                <div key={i} className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-3 flex items-center gap-3">
                  <div className={`bg-gradient-to-br ${p.color} w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>{p.name[0]?.toUpperCase()}</div>
                  <input value={p.name} onChange={e=>setPlayers(ps=>ps.map((pl,j)=>j===i?{...pl,name:e.target.value}:pl))} className="flex-1 bg-transparent text-white font-medium outline-none placeholder-slate-600" placeholder="Nome"/>
                  {players.length>cfg.min&&<button onClick={()=>removePlayer(i)} className="text-slate-600 hover:text-red-400 p-1 transition-colors"><Trash2 className="w-4 h-4"/></button>}
                </div>
              ))}
              {players.length<cfg.max&&(
                <button onClick={addPlayer} className="w-full border border-dashed border-white/[0.1] rounded-2xl p-3 text-slate-500 hover:text-white hover:border-white/[0.25] transition-all flex items-center justify-center gap-2 text-sm">
                  <Plus className="w-4 h-4"/>Adicionar jogador
                </button>
              )}
              <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.98}} onClick={()=>cfg.hasTeams?setStep(1):startGame()}
                className={`w-full bg-gradient-to-r ${cfg.color} text-white font-bold rounded-2xl py-4 mt-4 flex items-center justify-center gap-2`}>
                {cfg.hasTeams?'Continuar':'Começar Jogo'}<ChevronRight className="w-5 h-5"/>
              </motion.button>
            </motion.div>
          )}

          {/* ── STEP 1: Options ── */}
          {step===1 && cfg.hasTeams && (
            <motion.div key="s1" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} className="space-y-5">

              {/* Die preview */}
              <DiePreview/>

              {/* Friends mode */}
              {mode==='friends'&&(
                <div>
                  <h3 className="text-white font-semibold mb-2">🎮 Modo de Jogo</h3>
                  <div className="space-y-2">
                    {FRIENDS_MODES.map(fm=>(
                      <button key={fm.id} onClick={()=>setFriendsMode(fm.id)}
                        className={`w-full p-4 rounded-2xl border flex items-center gap-3 text-left transition-all ${friendsMode===fm.id?'bg-cyan-600/15 border-cyan-500/40':'bg-white/[0.03] border-white/[0.07] hover:border-white/[0.18]'}`}>
                        <fm.icon className={`w-5 h-5 flex-shrink-0 ${friendsMode===fm.id?'text-cyan-400':'text-slate-500'}`}/>
                        <div>
                          <p className={`font-bold text-sm ${friendsMode===fm.id?'text-white':'text-slate-400'}`}>{fm.label}</p>
                          <p className="text-slate-600 text-xs">{fm.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Map rotation */}
              {mode==='friends'&&(friendsMode==='map_cats'||friendsMode==='map_mini')&&(
                <div>
                  <h3 className="text-white font-semibold mb-2">🗺️ Casas do Mapa</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[{id:'random',label:'🎲 Aleatório',desc:'50% desafios, 50% mini-jogos'},{id:'fixed',label:'🔄 Fixo',desc:'Segue ordem das categorias'}].map(opt=>(
                      <button key={opt.id} onClick={()=>setMapRotation(opt.id)}
                        className={`p-3 rounded-xl border text-left text-sm transition-all ${mapRotation===opt.id?'bg-violet-600/15 border-violet-500/40 text-white':'bg-white/[0.03] border-white/[0.07] text-slate-400'}`}>
                        <p className="font-bold">{opt.label}</p><p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(mode==='family'||(mode==='friends'&&(friendsMode==='map_cats'||friendsMode==='map_mini')))&&(
                <div>
                  <h3 className="text-white font-semibold mb-2">🧩 Modo de Regras</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {id:'classic',label:'Clássico',desc:'Só categorias e mini-jogos no tabuleiro'},
                      {id:'special',label:'Especial',desc:mode==='family'?'Adiciona duelos, bónus, risco e todos jogam':'Adiciona caos, duelos, roubo e proteção'},
                    ].map(opt=>(
                      <button key={opt.id} onClick={()=>setMapStyle(opt.id)}
                        className={`p-3 rounded-xl border text-left text-sm transition-all ${mapStyle===opt.id?'bg-emerald-600/15 border-emerald-500/40 text-white':'bg-white/[0.03] border-white/[0.07] text-slate-400'}`}>
                        <p className="font-bold">{opt.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Teams */}
              <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white font-semibold">Equipas</span>
                  <button onClick={()=>setTeamsOn(t=>!t)} className={`w-12 h-6 rounded-full transition-all ${teamsOn?'bg-violet-500':'bg-white/[0.1]'} relative`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${teamsOn?'left-7':'left-1'}`}/>
                  </button>
                </div>
                {teamsOn&&(
                  <div className="space-y-2">
                    {teams.map((t,i)=>(
                      <div key={i} className="flex items-center gap-2">
                        <div className={`bg-gradient-to-br ${t.color} w-8 h-8 rounded-lg flex-shrink-0`}/>
                        <input value={t.name} onChange={e=>setTeams(ts=>ts.map((tm,j)=>j===i?{...tm,name:e.target.value}:tm))} className={inp}/>
                      </div>
                    ))}
                    <div className="mt-2 space-y-1">
                      {players.map((p,i)=>(
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">{p.name}</span>
                          <div className="flex gap-1">
                            {teams.map((_,ti)=>(
                              <button key={ti} onClick={()=>setPlayers(ps=>ps.map((pl,j)=>j===i?{...pl,team:ti}:pl))}
                                className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${p.team===ti?'bg-violet-600 text-white':'bg-white/[0.08] text-slate-500'}`}>E{ti+1}</button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Categories */}
              {(mode !== 'friends' || friendsMode !== 'map_mini') && (
                <div>
                  <h3 className="text-white font-semibold mb-2">Categorias</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {cfg.cats.map(c=>(
                      <button key={c} onClick={()=>toggleCat(c)}
                        className={`p-3 rounded-xl border text-left text-sm font-medium transition-all ${categories.includes(c)?'bg-violet-600/15 border-violet-500/40 text-white':'bg-white/[0.03] border-white/[0.07] text-slate-400'}`}>
                        {CAT_LABELS[c]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {mode==='friends' && friendsMode==='map_mini' && (
                <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 text-slate-400 text-sm">
                  No modo <strong>Só Mini-jogos</strong>, as categorias não são usadas no tabuleiro.
                </div>
              )}

              {/* Mini-games — friends only */}
              {cfg.hasMini&&(friendsMode==='map_cats'||friendsMode==='map_mini')&&(
                <div>
                  <h3 className="text-white font-semibold mb-2">Mini-jogos</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {MINI_GAMES.map(m=>(
                      <button key={m.id} onClick={()=>toggleMini(m.id)}
                        className={`p-3 rounded-xl border text-left text-sm font-medium transition-all ${miniGames.includes(m.id)?'bg-violet-600/15 border-violet-500/40 text-white':'bg-white/[0.03] border-white/[0.07] text-slate-400'}`}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── SCORING ── */}
              <div>
                <h3 className="text-white font-semibold mb-2 flex items-center gap-2"><Target className="w-4 h-4 text-amber-400"/>Objetivo de Pontos</h3>

                {isFamily ? (
                  // Family: always 3 per category, mandatory
                  <div className="bg-sky-500/8 border border-sky-500/20 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sky-300 text-sm font-bold">🏡 3 pontos por categoria (obrigatório)</span>
                    </div>
                    <p className="text-slate-400 text-xs">Cada tipo de desafio vale 3 pontos.</p>
                    <div className="bg-sky-900/30 rounded-xl p-3 flex items-center justify-between">
                      <span className="text-slate-300 text-sm">{categories.length} categori{categories.length===1?'a':'as'} × 3 pontos</span>
                      <span className="text-white font-black text-2xl">= {winningScore} pts</span>
                    </div>
                    <p className="text-slate-500 text-xs">Adiciona ou remove categorias acima para ajustar a duração.</p>
                  </div>
                ) : (
                  // Friends: choose between 3/cat or custom max
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        {id:'3_per_cat', label:'📦 3 por tipo', desc:'Cada tipo vale 3 pontos'},
                        {id:'max_points', label:'🎯 Pontuação máxima', desc:'Escolhes o número'},
                      ].map(opt=>(
                        <button key={opt.id} onClick={()=>setScoreMode(opt.id)}
                          className={`p-3 rounded-xl border text-left text-sm transition-all ${scoreMode===opt.id?'bg-amber-500/20 border-amber-500/50 text-white':'bg-white/[0.03] border-white/[0.07] text-slate-400'}`}>
                          <p className="font-bold">{opt.label}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                        </button>
                      ))}
                    </div>

                    {scoreMode === '3_per_cat' && (
                      <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-3 flex items-center justify-between">
                        <span className="text-slate-300 text-sm">{categories.length} categori{categories.length===1?'a':'as'} × 3 pontos</span>
                        <span className="text-white font-black text-2xl">= {winningScore} pts</span>
                      </div>
                    )}

                    {scoreMode === 'max_points' && (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          {[3,5,7,10,15,20].map(n=>(
                            <button key={n} onClick={()=>setMaxPoints(n)}
                              className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all ${maxPoints===n?'bg-amber-500/20 border-amber-500/50 text-amber-300':'bg-white/[0.03] border-white/[0.07] text-slate-400'}`}>
                              {n}
                            </button>
                          ))}
                        </div>
                        <p className="text-slate-500 text-xs text-center">Objetivo: {maxPoints} pontos para vencer</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Penalty — friends only */}
              {mode==='friends'&&(
                <div>
                  <h3 className="text-white font-semibold mb-2">Penalização</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {[{id:'sips',label:'🍺 Golos',desc:'Sempre 1-3 golos'},{id:'penalty',label:'⚽ Penáltis',desc:'Sempre penálti'},{id:'both',label:'🎲 Ambos',desc:'90% golos, 10% penálti'}].map(o=>(
                      <button key={o.id} onClick={()=>setPenalty(o.id)}
                        className={`p-3 rounded-xl border text-left text-sm transition-all ${penalty===o.id?'bg-violet-600/15 border-violet-500/40 text-white':'bg-white/[0.03] border-white/[0.07] text-slate-400'}`}>
                        <p className="font-bold">{o.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5 leading-tight">{o.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.98}} onClick={startGame}
                className={`w-full bg-gradient-to-r ${cfg.color} text-white font-bold rounded-2xl py-4 flex items-center justify-center gap-2`}>
                Começar Jogo 🎉
                <span className="text-sm opacity-70">(Objetivo: {winningScore} pts)</span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
