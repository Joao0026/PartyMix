import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, ChevronRight, Users, Map, Zap, Gamepad2, Target } from 'lucide-react'
import { PLAYER_COLORS, TEAM_COLORS, saveGame } from '../utils/game'
import PageShell from '../components/layout/PageShell'
import ModeHeader from '../components/layout/ModeHeader'

const MODE_CONFIG = {
  couple:  { label:'Modo Casal',   color:'from-rose-500 to-pink-600',  min:2, max:2,  cats:['romantico','picante','verdade','acao','roleplay','casal_pergunta'], hasTeams:false, hasMini:false },
  friends: { label:'Modo Amigos',  color:'from-cyan-400 to-blue-500',  min:2, max:20, cats:['telepatia','perguntas','desenho','mimica','proibido','caos'],           hasTeams:true,  hasMini:true  },
  family:  { label:'Modo Família', color:'from-sky-400 to-indigo-500', min:2, max:20, cats:['telepatia','perguntas','desenho','mimica','proibido'],           hasTeams:true,  hasMini:false },
}

const ACCENT = {
  couple: { sel: 'bg-rose-600/15 border-rose-500/40 text-white', idle: 'bg-white/[0.03] border-white/[0.07] text-slate-400 hover:border-white/[0.18]', icon: 'text-rose-400', toggle: 'bg-rose-500' },
  friends: { sel: 'bg-cyan-600/15 border-cyan-500/40 text-white', idle: 'bg-white/[0.03] border-white/[0.07] text-slate-400 hover:border-white/[0.18]', icon: 'text-cyan-400', toggle: 'bg-cyan-500' },
  family: { sel: 'bg-sky-600/15 border-sky-500/40 text-white', idle: 'bg-white/[0.03] border-white/[0.07] text-slate-400 hover:border-white/[0.18]', icon: 'text-sky-400', toggle: 'bg-sky-500' },
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

function SetupSection({ title, children }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 space-y-3">
      {title && <h3 className="text-white font-semibold text-sm">{title}</h3>}
      {children}
    </div>
  )
}

export default function GameSetup() {
  const [params]  = useSearchParams()
  const navigate  = useNavigate()
  const mode      = params.get('mode') || 'friends'
  const cfg       = MODE_CONFIG[mode] || MODE_CONFIG.friends
  const accent    = ACCENT[mode] || ACCENT.friends
  const isFamily  = mode === 'family'

  const [step,        setStep]        = useState(0)
  const [players,     setPlayers]     = useState([
    {name:'Jogador 1', color:PLAYER_COLORS[0], team:0},
    {name:'Jogador 2', color:PLAYER_COLORS[1], team:1},
  ])
  const [teamsOn,    setTeamsOn]    = useState(false)
  const [teams,      setTeams]      = useState([{name:'Equipa A',color:TEAM_COLORS[0]},{name:'Equipa B',color:TEAM_COLORS[1]}])
  const [categories, setCategories] = useState(cfg.cats.slice(0,3))
  const [miniGames,  setMiniGames]  = useState(['grupo','batalha','sync','10_segundos'])
  const [penalty,    setPenalty]    = useState('sips')
  const [friendsMode,setFriendsMode]= useState('map_cats')
  const [mapRotation,setMapRotation]= useState('random')
  const [mapStyle,   setMapStyle]   = useState('classic')
  const [scoreMode,  setScoreMode]  = useState('max_points')
  const [maxPoints,  setMaxPoints]  = useState(5)

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
      contentPack: 'base',
      includeCommunity: true,
    })
    if (mode==='couple')                 navigate('/CoupleGame')
    else if (friendsMode==='challenges') navigate('/ChallengesOnly')
    else                                 navigate('/MapGame')
  }

  const totalSteps = cfg.hasTeams ? 2 : 1
  const inp = 'bg-slate-800 border border-slate-600 rounded-xl px-3 py-2.5 text-white outline-none focus:border-white/30 text-sm w-full'
  const optBtn = (active) => `p-3 rounded-xl border text-left text-sm transition-all ${active ? accent.sel : accent.idle}`

  const setupSummary = [
    mode === 'friends' && FRIENDS_MODES.find((f) => f.id === friendsMode)?.label,
    (mode !== 'friends' || friendsMode !== 'map_mini') && `${categories.length} categorias`,
    `${winningScore} pts`,
    mode === 'friends' && { sips: 'Goles', penalty: 'Penáltis', both: 'Goles + penáltis' }[penalty],
  ].filter(Boolean).join(' · ')

  return (
    <PageShell mode={mode} innerClassName="space-y-5">
      <ModeHeader
        onBack={() => (step > 0 ? setStep((s) => s - 1) : navigate('/'))}
        title={cfg.label}
        subtitle={`Passo ${step + 1} de ${totalSteps}`}
      />

      <div className="w-full bg-white/[0.06] rounded-full h-1">
        <div className={`bg-gradient-to-r ${cfg.color} h-1 rounded-full transition-all`} style={{ width: `${((step + 1) / totalSteps) * 100}%` }} />
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                <Users className={`w-5 h-5 ${accent.icon}`} />
                Jogadores
              </h3>
              <span className="text-slate-500 text-xs">{players.length} / {cfg.max}</span>
            </div>
            {players.map((p, i) => (
              <div key={i} className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-3 flex items-center gap-3">
                <div className={`bg-gradient-to-br ${p.color} w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>{p.name[0]?.toUpperCase()}</div>
                <input
                  value={p.name}
                  onChange={(e) => setPlayers((ps) => ps.map((pl, j) => (j === i ? { ...pl, name: e.target.value } : pl)))}
                  className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-white font-medium outline-none focus:border-white/20 placeholder-slate-600"
                  placeholder="Nome"
                />
                {players.length > cfg.min && (
                  <button type="button" onClick={() => removePlayer(i)} className="text-slate-600 hover:text-red-400 p-2 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {players.length < cfg.max && (
              <button type="button" onClick={addPlayer} className="w-full border border-dashed border-white/[0.1] rounded-xl py-2.5 text-slate-500 hover:text-white hover:border-white/[0.25] transition-all flex items-center justify-center gap-2 text-sm">
                <Plus className="w-4 h-4" />
                Adicionar jogador
              </button>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => (cfg.hasTeams ? setStep(1) : startGame())}
              className={`w-full bg-gradient-to-r ${cfg.color} text-white font-bold rounded-2xl py-4 mt-2 flex items-center justify-center gap-2`}
            >
              {cfg.hasTeams ? 'Continuar' : 'Começar Jogo'}
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </motion.div>
        )}

        {step === 1 && cfg.hasTeams && (
          <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            {mode === 'friends' && (
              <SetupSection title="Como jogar">
                <div className="space-y-2">
                  {FRIENDS_MODES.map((fm) => (
                    <button key={fm.id} type="button" onClick={() => setFriendsMode(fm.id)}
                      className={`w-full p-3 rounded-xl border flex items-center gap-3 text-left transition-all ${friendsMode === fm.id ? accent.sel : accent.idle}`}>
                      <fm.icon className={`w-5 h-5 flex-shrink-0 ${friendsMode === fm.id ? accent.icon : 'text-slate-500'}`} />
                      <div>
                        <p className={`font-bold text-sm ${friendsMode === fm.id ? 'text-white' : 'text-slate-400'}`}>{fm.label}</p>
                        <p className="text-slate-600 text-xs">{fm.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {(friendsMode === 'map_cats' || friendsMode === 'map_mini') && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {[{ id: 'random', label: '🎲 Aleatório', desc: '50% desafios, 50% mini-jogos' }, { id: 'fixed', label: '🔄 Fixo', desc: 'Ordem das categorias' }].map((opt) => (
                      <button key={opt.id} type="button" onClick={() => setMapRotation(opt.id)} className={optBtn(mapRotation === opt.id)}>
                        <p className="font-bold">{opt.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                )}

                {(mode === 'family' || friendsMode === 'map_cats' || friendsMode === 'map_mini') && (
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'classic', label: 'Clássico', desc: 'Categorias e mini-jogos' },
                      { id: 'special', label: 'Especial', desc: mode === 'family' ? 'Duelos, bónus e risco' : 'Caos, duelos e roubo' },
                    ].map((opt) => (
                      <button key={opt.id} type="button" onClick={() => setMapStyle(opt.id)} className={optBtn(mapStyle === opt.id)}>
                        <p className="font-bold">{opt.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                )}
              </SetupSection>
            )}

            {mode === 'family' && (
              <SetupSection title="Como jogar">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'classic', label: 'Clássico', desc: 'Categorias e mini-jogos' },
                    { id: 'special', label: 'Especial', desc: 'Duelos, bónus e risco' },
                  ].map((opt) => (
                    <button key={opt.id} type="button" onClick={() => setMapStyle(opt.id)} className={optBtn(mapStyle === opt.id)}>
                      <p className="font-bold">{opt.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </SetupSection>
            )}

            <SetupSection title="Conteúdo">
              {(mode !== 'friends' || friendsMode !== 'map_mini') && (
                <div className="grid grid-cols-2 gap-2">
                  {cfg.cats.map((c) => (
                    <button key={c} type="button" onClick={() => toggleCat(c)} className={`${optBtn(categories.includes(c))} font-medium`}>
                      {CAT_LABELS[c]}
                    </button>
                  ))}
                </div>
              )}
              {mode === 'friends' && friendsMode === 'map_mini' && (
                <p className="text-slate-400 text-sm">No modo <strong className="text-white">Só Mini-jogos</strong>, as categorias não entram no tabuleiro.</p>
              )}

              {cfg.hasMini && (friendsMode === 'map_cats' || friendsMode === 'map_mini') && (
                <div className="grid grid-cols-2 gap-2">
                  {MINI_GAMES.map((m) => (
                    <button key={m.id} type="button" onClick={() => toggleMini(m.id)} className={`${optBtn(miniGames.includes(m.id))} font-medium`}>
                      {m.label}
                    </button>
                  ))}
                </div>
              )}
            </SetupSection>

            <SetupSection title="Competição">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 text-sm">Equipas</span>
                <button type="button" onClick={() => setTeamsOn((t) => !t)} className={`w-12 h-6 rounded-full transition-all ${teamsOn ? accent.toggle : 'bg-white/[0.1]'} relative`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${teamsOn ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
              {teamsOn && (
                <div className="space-y-2">
                  {teams.map((t, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className={`bg-gradient-to-br ${t.color} w-8 h-8 rounded-lg flex-shrink-0`} />
                      <input value={t.name} onChange={(e) => setTeams((ts) => ts.map((tm, j) => (j === i ? { ...tm, name: e.target.value } : tm)))} className={inp} />
                    </div>
                  ))}
                  <div className="mt-2 space-y-1">
                    {players.map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">{p.name}</span>
                        <div className="flex gap-1">
                          {teams.map((_, ti) => (
                            <button key={ti} type="button" onClick={() => setPlayers((ps) => ps.map((pl, j) => (j === i ? { ...pl, team: ti } : pl)))}
                              className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${p.team === ti ? `${accent.toggle} text-white` : 'bg-white/[0.08] text-slate-500'}`}>
                              E{ti + 1}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-1">
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Target className={`w-3.5 h-3.5 ${accent.icon}`} />
                  Objetivo de pontos
                </p>
                {isFamily ? (
                  <div className={`rounded-xl border p-3 flex items-center justify-between ${accent.sel}`}>
                    <span className="text-slate-300 text-sm">{categories.length} categorias × 3</span>
                    <span className="text-white font-black text-2xl">{winningScore} pts</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: '3_per_cat', label: '📦 3 por tipo', desc: 'Cada tipo vale 3' },
                        { id: 'max_points', label: '🎯 Máximo', desc: 'Escolhes o número' },
                      ].map((opt) => (
                        <button key={opt.id} type="button" onClick={() => setScoreMode(opt.id)} className={optBtn(scoreMode === opt.id)}>
                          <p className="font-bold">{opt.label}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                    {scoreMode === '3_per_cat' && (
                      <div className={`rounded-xl border p-3 flex items-center justify-between ${accent.sel}`}>
                        <span className="text-slate-300 text-sm">{categories.length} categorias × 3</span>
                        <span className="text-white font-black text-2xl">{winningScore} pts</span>
                      </div>
                    )}
                    {scoreMode === 'max_points' && (
                      <div className="flex gap-2 flex-wrap">
                        {[3, 5, 7, 10, 15, 20].map((n) => (
                          <button key={n} type="button" onClick={() => setMaxPoints(n)}
                            className={`flex-1 min-w-[2.5rem] py-3 rounded-xl border text-sm font-bold transition-all ${maxPoints === n ? accent.sel : accent.idle}`}>
                            {n}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </SetupSection>

            {mode === 'friends' && (
              <SetupSection title="Penalização">
                <div className="grid grid-cols-3 gap-2">
                  {[{ id: 'sips', label: '🍺 Goles', desc: '1–3 goles' }, { id: 'penalty', label: '⚽ Penáltis', desc: 'Sempre penálti' }, { id: 'both', label: '🎲 Ambos', desc: '90% goles' }].map((o) => (
                    <button key={o.id} type="button" onClick={() => setPenalty(o.id)} className={optBtn(penalty === o.id)}>
                      <p className="font-bold">{o.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-tight">{o.desc}</p>
                    </button>
                  ))}
                </div>
              </SetupSection>
            )}

            {setupSummary && <p className="text-slate-500 text-xs text-center">{setupSummary}</p>}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={startGame}
              className={`w-full bg-gradient-to-r ${cfg.color} text-white font-bold rounded-2xl py-4 flex flex-col items-center justify-center gap-0.5`}
            >
              <span>Começar Jogo 🎉</span>
              <span className="text-sm opacity-70 font-medium">Objetivo: {winningScore} pts</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  )
}
