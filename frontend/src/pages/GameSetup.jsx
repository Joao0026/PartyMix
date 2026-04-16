import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, ChevronRight, ChevronLeft, Users } from 'lucide-react'
import { PLAYER_COLORS, TEAM_COLORS, saveGame } from '../utils/game'

const MODE_CONFIG = {
  couple: { label: 'Modo Casal', color: 'from-red-500 to-rose-700', minPlayers: 2, maxPlayers: 2, categories: ['erotico','verdade','acao','dados'], hasTeams: false, hasMiniGames: false },
  friends: { label: 'Modo Amigos', color: 'from-cyan-400 to-blue-600', minPlayers: 2, maxPlayers: 20, categories: ['mimica','desenho','palavra','acao','verdade','consequencia'], hasTeams: true, hasMiniGames: true },
  family: { label: 'Modo Família', color: 'from-sky-400 to-blue-400', minPlayers: 2, maxPlayers: 20, categories: ['mimica','desenho','palavra','cultura','desporto','musica','cinema'], hasTeams: true, hasMiniGames: true },
}

const CATEGORY_LABELS = { mimica:'🎭 Mímica', desenho:'🎨 Desenho', palavra:'💬 Palavra', acao:'⚡ Ação', verdade:'❓ Verdade', consequencia:'🎲 Consequência', cultura:'📚 Cultura', desporto:'⚽ Desporto', musica:'🎵 Música', cinema:'🎬 Cinema', erotico:'🔥 Erótico', dados:'🎲 Dados' }
const MINI_GAMES = ['maior_menor','grupo','espio','10_segundos','batalha']
const MINI_GAME_LABELS = { maior_menor:'🃏 Maior/Menor', grupo:'👥 Desafio Grupo', espio:'🕵️ Espião', '10_segundos':'⏱ 10 Segundos', batalha:'⚔️ Batalha' }
const PENALTY_OPTIONS = [{ id:'sips', label:'🍺 Goles' }, { id:'penalty', label:'⚽ Penáltis' }, { id:'both', label:'🎲 Ambos' }]

export default function GameSetup() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const mode = params.get('mode') || 'friends'
  const cfg = MODE_CONFIG[mode] || MODE_CONFIG.friends
  const [step, setStep] = useState(0)
  const [players, setPlayers] = useState([
    { name: 'Jogador 1', color: PLAYER_COLORS[0], team: 0 },
    { name: 'Jogador 2', color: PLAYER_COLORS[1], team: 1 },
  ])
  const [teamsOn, setTeamsOn] = useState(false)
  const [teams, setTeams] = useState([{ name: 'Equipa A', color: TEAM_COLORS[0] }, { name: 'Equipa B', color: TEAM_COLORS[1] }])
  const [categories, setCategories] = useState(cfg.categories.slice(0, 3))
  const [miniGames, setMiniGames] = useState(['maior_menor','grupo'])
  const [penalty, setPenalty] = useState('sips')

  const addPlayer = () => {
    if (players.length >= cfg.maxPlayers) return
    setPlayers(p => [...p, { name: `Jogador ${p.length + 1}`, color: PLAYER_COLORS[p.length % PLAYER_COLORS.length], team: 0 }])
  }
  const removePlayer = (i) => { if (players.length <= cfg.minPlayers) return; setPlayers(p => p.filter((_,idx) => idx !== i)) }
  const toggleCategory = (c) => setCategories(cs => cs.includes(c) ? (cs.length > 1 ? cs.filter(x => x !== c) : cs) : [...cs, c])
  const toggleMini = (m) => setMiniGames(ms => ms.includes(m) ? ms.filter(x => x !== m) : [...ms, m])

  const startGame = () => {
    const gameData = { mode, players, teams: teamsOn ? teams : null, selectedCategories: categories, penaltyType: penalty, miniGames }
    saveGame(gameData)
    navigate(mode === 'couple' ? '/CoupleGame' : '/MapGame')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 px-4 py-8 flex flex-col items-center">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => step > 0 ? setStep(s=>s-1) : navigate('/')} className="text-slate-400 hover:text-white p-2"><ChevronLeft /></button>
          <div>
            <h2 className="text-white font-bold text-xl">{cfg.label}</h2>
            <p className="text-slate-400 text-sm">Passo {step + 1} de {cfg.hasTeams ? 2 : 1}</p>
          </div>
        </div>
        <div className="w-full bg-white/5 rounded-full h-1 mb-6">
          <div className={`bg-gradient-to-r ${cfg.color} h-1 rounded-full transition-all`} style={{ width: `${((step+1)/(cfg.hasTeams?2:1))*100}%` }} />
        </div>
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="step0" initial={{opacity:0,x:30}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-30}} className="space-y-3">
              <h3 className="text-white font-semibold text-lg mb-4"><Users className="inline w-5 h-5 mr-2" />Jogadores</h3>
              {players.map((p, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center gap-3">
                  <div className={`bg-gradient-to-br ${p.color} w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>{p.name[0]?.toUpperCase()}</div>
                  <input value={p.name} onChange={e => setPlayers(ps => ps.map((pl,idx) => idx===i ? {...pl,name:e.target.value} : pl))}
                    className="flex-1 bg-transparent text-white font-medium outline-none placeholder-slate-500" placeholder="Nome do jogador" />
                  {players.length > cfg.minPlayers && <button onClick={() => removePlayer(i)} className="text-slate-500 hover:text-red-400 p-1"><Trash2 className="w-4 h-4" /></button>}
                </div>
              ))}
              {players.length < cfg.maxPlayers && (
                <button onClick={addPlayer} className="w-full border border-dashed border-white/20 rounded-2xl p-3 text-slate-400 hover:text-white hover:border-white/40 transition-all flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" /> Adicionar jogador
                </button>
              )}
              <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.98}}
                onClick={() => cfg.hasTeams ? setStep(1) : startGame()}
                className={`w-full bg-gradient-to-r ${cfg.color} text-white font-bold rounded-2xl py-4 mt-4 flex items-center justify-center gap-2`}>
                {cfg.hasTeams ? 'Continuar' : 'Começar Jogo'} <ChevronRight className="w-5 h-5" />
              </motion.button>
            </motion.div>
          )}
          {step === 1 && cfg.hasTeams && (
            <motion.div key="step1" initial={{opacity:0,x:30}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-30}} className="space-y-5">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white font-semibold">Equipas</span>
                  <button onClick={() => setTeamsOn(t=>!t)} className={`w-12 h-6 rounded-full transition-all ${teamsOn ? 'bg-violet-500' : 'bg-slate-700'} relative`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${teamsOn ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
                {teamsOn && (
                  <div className="space-y-2">
                    {teams.map((t,i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className={`bg-gradient-to-br ${t.color} w-8 h-8 rounded-lg flex-shrink-0`} />
                        <input value={t.name} onChange={e => setTeams(ts => ts.map((tm,idx) => idx===i ? {...tm,name:e.target.value} : tm))}
                          className="flex-1 bg-white/5 text-white rounded-lg px-3 py-1.5 outline-none text-sm" />
                      </div>
                    ))}
                    <div className="mt-3 space-y-1">
                      {players.map((p,i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="text-slate-300">{p.name}</span>
                          <div className="flex gap-1">
                            {teams.map((_,ti) => (
                              <button key={ti} onClick={() => setPlayers(ps => ps.map((pl,idx) => idx===i ? {...pl,team:ti} : pl))}
                                className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${p.team===ti ? 'bg-violet-600 text-white' : 'bg-white/10 text-slate-400'}`}>
                                E{ti+1}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-white font-semibold mb-2">Categorias</h3>
                <div className="grid grid-cols-2 gap-2">
                  {cfg.categories.map(c => (
                    <button key={c} onClick={() => toggleCategory(c)}
                      className={`p-3 rounded-xl border text-left text-sm font-medium transition-all ${categories.includes(c) ? 'bg-violet-600/30 border-violet-500 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/30'}`}>
                      {CATEGORY_LABELS[c]}
                    </button>
                  ))}
                </div>
              </div>
              {cfg.hasMiniGames && (
                <div>
                  <h3 className="text-white font-semibold mb-2">Mini-jogos</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {MINI_GAMES.map(m => (
                      <button key={m} onClick={() => toggleMini(m)}
                        className={`p-3 rounded-xl border text-left text-sm font-medium transition-all ${miniGames.includes(m) ? 'bg-violet-600/30 border-violet-500 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/30'}`}>
                        {MINI_GAME_LABELS[m]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {mode === 'friends' && (
                <div>
                  <h3 className="text-white font-semibold mb-2">Penalização</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {PENALTY_OPTIONS.map(o => (
                      <button key={o.id} onClick={() => setPenalty(o.id)}
                        className={`p-3 rounded-xl border text-sm font-medium transition-all ${penalty===o.id ? 'bg-violet-600/30 border-violet-500 text-white' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                        {o.label}
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
