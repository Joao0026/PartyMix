import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, ChevronRight, ChevronLeft, Users, Map, Zap, Gamepad2 } from 'lucide-react'
import { PLAYER_COLORS, TEAM_COLORS, saveGame } from '../utils/game'

const MODE_CONFIG = {
  couple: { label:'Modo Casal',   color:'from-rose-500 to-pink-600',  min:2, max:2,  cats:['erotico','verdade','acao'], hasTeams:false, hasMini:false },
  friends:{ label:'Modo Amigos',  color:'from-cyan-400 to-blue-500',  min:2, max:20, cats:['mimica','desenho','palavra','acao','verdade','consequencia'], hasTeams:true, hasMini:true },
  family: { label:'Modo Família', color:'from-sky-400 to-indigo-500', min:2, max:20, cats:['mimica','desenho','palavra','cultura','desporto','musica','cinema'], hasTeams:true, hasMini:false },
}
const CAT_LABELS = {
  mimica:'🎭 Mímica', desenho:'🎨 Desenho', palavra:'💬 Palavra', acao:'⚡ Ação',
  verdade:'❓ Verdade', consequencia:'🎲 Consequência', cultura:'📚 Cultura',
  desporto:'⚽ Desporto', musica:'🎵 Música', cinema:'🎬 Cinema', erotico:'🔥 Erótico',
}
const MINI_GAMES = [
  {id:'maior_menor',label:'🃏 Maior/Menor'},{id:'grupo',label:'👥 Grupo'},
  {id:'espio',label:'🕵️ Espião (5+ jogadores)'},{id:'10_segundos',label:'⏱ 10 Segundos'},
  {id:'batalha',label:'⚔️ Batalha'},{id:'sync',label:'🎊 Sync'},
  {id:'password',label:'🤔 Quem Sou Eu?'},
]
const FRIENDS_MODES = [
  { id:'map_cats',   icon:Map,      label:'Mapa + Categorias',     desc:'Dado, casas com categorias, mini-jogos opcionais' },
  { id:'map_mini',   icon:Gamepad2, label:'Só Mini-jogos no Mapa', desc:'Dado, cada casa é um mini-jogo aleatório' },
  { id:'challenges', icon:Zap,      label:'Só Desafios',           desc:'Sem mapa — desafios aleatórios contínuos' },
]

export default function GameSetup() {
  const [params] = useSearchParams()
  const navigate  = useNavigate()
  const mode = params.get('mode') || 'friends'
  const cfg  = MODE_CONFIG[mode] || MODE_CONFIG.friends

  const [step, setStep]       = useState(0)
  const [players, setPlayers] = useState([
    {name:'Jogador 1', color:PLAYER_COLORS[0], team:0},
    {name:'Jogador 2', color:PLAYER_COLORS[1], team:1},
  ])
  const [teamsOn, setTeamsOn]       = useState(false)
  const [teams, setTeams]           = useState([{name:'Equipa A',color:TEAM_COLORS[0]},{name:'Equipa B',color:TEAM_COLORS[1]}])
  const [categories, setCategories] = useState(cfg.cats.slice(0,3))
  const [miniGames, setMiniGames]   = useState(['maior_menor','grupo','batalha','sync'])
  // penalty: 'sips' | 'penalty' | 'both'
  // 'both' means each card randomly gives EITHER sips OR penalty — never both at once
  const [penalty, setPenalty]       = useState('sips')
  const [friendsMode, setFriendsMode] = useState('map_cats')
  const [mapRotation, setMapRotation] = useState('random') // equal probability each tile

  const addPlayer    = () => { if(players.length>=cfg.max)return; setPlayers(p=>[...p,{name:`Jogador ${p.length+1}`,color:PLAYER_COLORS[p.length%PLAYER_COLORS.length],team:0}]) }
  const removePlayer = i  => { if(players.length<=cfg.min)return; setPlayers(p=>p.filter((_,j)=>j!==i)) }
  const toggleCat    = c  => setCategories(cs=>cs.includes(c)?(cs.length>1?cs.filter(x=>x!==c):cs):[...cs,c])
  const toggleMini   = m  => setMiniGames(ms=>ms.includes(m)?ms.filter(x=>x!==m):[...ms,m])

  const startGame = () => {
    const data = { mode, players, teams:teamsOn?teams:null,
      selectedCategories:categories, penaltyType:penalty,
      miniGames, friendsMode, mapRotation }
    saveGame(data)
    if (mode==='couple')                navigate('/CoupleGame')
    else if (friendsMode==='challenges') navigate('/ChallengesOnly')
    else                                navigate('/MapGame')
  }

  const totalSteps = cfg.hasTeams ? 2 : 1
  const inp = 'bg-slate-800 border border-slate-600 rounded-xl px-3 py-2.5 text-white outline-none focus:border-violet-500/60 text-sm w-full'

  return (
    <div className="min-h-screen bg-[#080b14] px-4 py-8 flex flex-col items-center">
      <div className="w-full max-w-lg">
        {/* Header */}
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
                  <Plus className="w-4 h-4"/> Adicionar jogador
                </button>
              )}
              <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.98}}
                onClick={()=>cfg.hasTeams?setStep(1):startGame()}
                className={`w-full bg-gradient-to-r ${cfg.color} text-white font-bold rounded-2xl py-4 mt-4 flex items-center justify-center gap-2`}>
                {cfg.hasTeams?'Continuar':'Começar Jogo'}<ChevronRight className="w-5 h-5"/>
              </motion.button>
            </motion.div>
          )}

          {/* ── STEP 1: Options ── */}
          {step===1 && cfg.hasTeams && (
            <motion.div key="s1" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} className="space-y-5">

              {/* Friends mode */}
              {mode==='friends' && (
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

              {/* Map rotation — only for map modes */}
              {mode==='friends' && (friendsMode==='map_cats'||friendsMode==='map_mini') && (
                <div>
                  <h3 className="text-white font-semibold mb-2">🗺️ Casas do Mapa</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {id:'random',label:'🎲 Aleatório',desc:'Categorias e mini-jogos com probabilidade igual'},
                      {id:'fixed', label:'🔄 Rotação Fixa',desc:'Segue a ordem das categorias'},
                    ].map(opt=>(
                      <button key={opt.id} onClick={()=>setMapRotation(opt.id)}
                        className={`p-3 rounded-xl border text-left text-sm transition-all ${mapRotation===opt.id?'bg-violet-600/15 border-violet-500/40 text-white':'bg-white/[0.03] border-white/[0.07] text-slate-400 hover:border-white/[0.18]'}`}>
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
              {(friendsMode==='map_cats'||friendsMode==='challenges'||mode==='family') && (
                <div>
                  <h3 className="text-white font-semibold mb-2">Categorias</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {cfg.cats.map(c=>(
                      <button key={c} onClick={()=>toggleCat(c)}
                        className={`p-3 rounded-xl border text-left text-sm font-medium transition-all ${categories.includes(c)?'bg-violet-600/15 border-violet-500/40 text-white':'bg-white/[0.03] border-white/[0.07] text-slate-400 hover:border-white/[0.18]'}`}>
                        {CAT_LABELS[c]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Mini-games */}
              {cfg.hasMini && (friendsMode==='map_cats'||friendsMode==='map_mini') && (
                <div>
                  <h3 className="text-white font-semibold mb-2">Mini-jogos ({miniGames.length} selecionados)</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {MINI_GAMES.map(m=>(
                      <button key={m.id} onClick={()=>toggleMini(m.id)}
                        className={`p-3 rounded-xl border text-left text-sm font-medium transition-all ${miniGames.includes(m.id)?'bg-violet-600/15 border-violet-500/40 text-white':'bg-white/[0.03] border-white/[0.07] text-slate-400 hover:border-white/[0.18]'}`}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Penalty */}
              {mode==='friends' && (
                <div>
                  <h3 className="text-white font-semibold mb-1">Penalização</h3>
                  <p className="text-slate-500 text-xs mb-2">
                    {penalty==='both'?'🎲 Cada carta sorteia aleatoriamente golos OU penálti — nunca os dois ao mesmo tempo.':''}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {id:'sips',    label:'🍺 Golos',   desc:'Sempre golos'},
                      {id:'penalty', label:'⚽ Penáltis', desc:'Sempre penálti'},
                      {id:'both',    label:'🎲 Ambos',    desc:'Aleatório por carta'},
                    ].map(o=>(
                      <button key={o.id} onClick={()=>setPenalty(o.id)}
                        className={`p-3 rounded-xl border text-sm transition-all ${penalty===o.id?'bg-violet-600/20 border-violet-500/50 text-white':'bg-white/[0.03] border-white/[0.07] text-slate-400'}`}>
                        <p className="font-bold">{o.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{o.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.98}} onClick={startGame}
                className={`w-full bg-gradient-to-r ${cfg.color} text-white font-bold rounded-2xl py-4 flex items-center justify-center gap-2`}>
                Começar Jogo 🎉
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
