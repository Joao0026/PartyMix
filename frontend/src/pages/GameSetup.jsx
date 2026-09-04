import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Map, Zap, Gamepad2 } from 'lucide-react'
import { PLAYER_COLORS, TEAM_COLORS, saveGame } from '../utils/game'
import { loadNightRoster, saveNightRoster } from '../utils/nightRoster'
import MesaNoite from '../components/layout/MesaNoite'
import NightShell, { NightTitle, NightCta, NightChip, NightChoice, GlowDisc, NightBox } from '../components/layout/NightShell'
import { isUnder18 } from '../utils/ageGate'

const MODE_CONFIG = {
  couple:  { label:'Modo Casal',   min:2, max:2,  cats:['romantico','picante','verdade','acao','roleplay','casal_pergunta'], hasTeams:false, hasMini:false },
  friends: { label:'Modo Amigos',  min:2, max:20, cats:['telepatia','perguntas','desenho','mimica','proibido','caos'],           hasTeams:true,  hasMini:true  },
  family:  { label:'Modo Família', min:2, max:20, cats:['telepatia','perguntas','desenho','mimica','proibido'],           hasTeams:true,  hasMini:false },
}

const MODE_ACCENT = {
  couple:  '#f87171',
  friends: '#8b5cf6',
  family:  '#4ade80',
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
  { id:'map_cats',   icon:Map,      label:'🗺️ Mapa + categorias',   desc:'Dado, casas com desafios e mini-jogos' },
  { id:'map_mini',   icon:Gamepad2, label:'🎮 Só mini-jogos',       desc:'Cada casa é um mini-jogo aleatório' },
  { id:'challenges', icon:Zap,      label:'⚡ Só desafios',         desc:'Sem mapa, desafios contínuos' },
]

export default function GameSetup() {
  const [params]  = useSearchParams()
  const navigate  = useNavigate()
  const mode      = params.get('mode') || 'friends'

  useEffect(() => {
    if (isUnder18() && mode !== 'family') navigate('/GameSetup?mode=family', { replace: true })
  }, [mode, navigate])
  const cfg       = MODE_CONFIG[mode] || MODE_CONFIG.friends
  const accent    = MODE_ACCENT[mode] || MODE_ACCENT.friends
  const isFamily  = mode === 'family'

  const [step,        setStep]        = useState(0)
  const [players,     setPlayers]     = useState(() => {
    const { names, genders } = loadNightRoster()
    const limit = MODE_CONFIG[mode]?.max || 20
    if (names.length < 2) return []
    const take = names.slice(0, mode === 'couple' ? 2 : limit)
    return take.map((name, i) => ({
      name,
      gender: genders[i] ?? null,
      color: PLAYER_COLORS[i % PLAYER_COLORS.length],
      team: i % 2,
    }))
  })
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

  const normalizedPlayerNames = players.map((player) => player.name.trim())
  const duplicatePlayerNames = new Set(
    normalizedPlayerNames
      .map((name) => name.toLocaleLowerCase('pt-PT'))
      .filter((name, index, names) => name && names.indexOf(name) !== index)
  )
  const hasEmptyPlayerNames = normalizedPlayerNames.some((name) => !name)
  const hasDuplicatePlayerNames = duplicatePlayerNames.size > 0
  const playersValid = !hasEmptyPlayerNames && !hasDuplicatePlayerNames

  const winningScore = isFamily
    ? categories.length * 3
    : scoreMode === '3_per_cat'
    ? categories.length * 3
    : maxPoints

  const toPlayers = (names, genders = []) => names.map((name, i) => ({
    name,
    gender: genders[i] ?? null,
    color: PLAYER_COLORS[i % PLAYER_COLORS.length],
    team: i % 2,
  }))

  const toggleCat    = c  => setCategories(cs=>cs.includes(c)?(cs.length>1?cs.filter(x=>x!==c):cs):[...cs,c])
  const toggleMini   = m  => setMiniGames(ms=>ms.includes(m)?(ms.length>1?ms.filter(x=>x!==m):ms):[...ms,m])
  const needsMiniGames = mode === 'friends' && (friendsMode === 'map_cats' || friendsMode === 'map_mini')
  const canStart = playersValid && (!needsMiniGames || miniGames.length > 0)

  const startGame = (list = players) => {
    const cleanPlayers = list
      .map((player) => ({ ...player, name: String(player.name || '').trim() }))
      .filter((player) => player.name)
    if (cleanPlayers.length < cfg.min) return
    if (mode === 'friends' && (friendsMode === 'map_cats' || friendsMode === 'map_mini') && miniGames.length === 0) return
    saveNightRoster(cleanPlayers.map((p) => p.name), cleanPlayers.map((p) => p.gender ?? null))
    saveGame({
      mode, players:cleanPlayers, teams:teamsOn?teams:null,
      selectedCategories: friendsMode==='map_mini' ? [] : categories,
      penaltyType: isFamily ? 'none' : penalty,
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

  const showMapOptions = isFamily || (mode === 'friends' && (friendsMode === 'map_cats' || friendsMode === 'map_mini'))
  const showCats = mode !== 'friends' || friendsMode !== 'map_mini'

  if (step === 0) {
    return (
      <MesaNoite
        names={players.map((p) => p.name).filter(Boolean)}
        genders={players.filter((p) => p.name?.trim()).map((p) => p.gender ?? null)}
        min={cfg.min}
        max={cfg.max}
        confirmPrefix={cfg.hasTeams ? 'Continuar com' : 'Começar com'}
        onBack={() => navigate('/')}
        onChange={(nextNames, nextGenders) => setPlayers(toPlayers(nextNames, nextGenders))}
        onConfirm={(nextNames, nextGenders) => {
          const next = toPlayers(nextNames, nextGenders)
          setPlayers(next)
          if (next.length < cfg.min) return
          if (cfg.hasTeams) setStep(1)
          else startGame(next)
        }}
      />
    )
  }

  return (
    <NightShell
      onBack={() => setStep(0)}
      footer={(
        <NightCta accent={accent} onClick={() => startGame()} disabled={!canStart}>
          Começar · {winningScore} pts 🎉
        </NightCta>
      )}
    >
      <NightTitle>{cfg.label}</NightTitle>
      <p className="mt-3 text-center text-[1.05rem] font-medium text-white">Como jogas esta noite?</p>
      <p className="mt-1.5 text-center text-[13px] text-white/45">O Começar fica sempre em baixo.</p>

      <div className="mt-6 space-y-3">
        {mode === 'friends' && (
          <NightBox title="Como jogar">
            <div className="space-y-1.5">
              {FRIENDS_MODES.map((fm) => (
                <NightChoice
                  key={fm.id}
                  selected={friendsMode === fm.id}
                  accent={accent}
                  onClick={() => setFriendsMode(fm.id)}
                  title={fm.label}
                  desc={fm.desc}
                  icon={(
                    <GlowDisc color={friendsMode === fm.id ? accent : '#64748b'} size={36}>
                      <fm.icon className="h-4 w-4" style={{ color: friendsMode === fm.id ? accent : '#94a3b8' }} strokeWidth={1.75} />
                    </GlowDisc>
                  )}
                />
              ))}
            </div>
          </NightBox>
        )}

        {showMapOptions && (
          <NightBox title="Tabuleiro">
            <div className="grid grid-cols-2 gap-1.5">
              {mode === 'friends' && (friendsMode === 'map_cats' || friendsMode === 'map_mini') && (
                <>
                  <NightChip className="w-full justify-center" selected={mapRotation === 'random'} accent={accent} onClick={() => setMapRotation('random')}>🎲 Aleatório</NightChip>
                  <NightChip className="w-full justify-center" selected={mapRotation === 'fixed'} accent={accent} onClick={() => setMapRotation('fixed')}>🔄 Fixo</NightChip>
                </>
              )}
              <NightChip className="w-full justify-center" selected={mapStyle === 'classic'} accent={accent} onClick={() => setMapStyle('classic')}>🗺️ Clássico</NightChip>
              <NightChip className="w-full justify-center" selected={mapStyle === 'special'} accent={accent} onClick={() => setMapStyle('special')}>⭐ Especial</NightChip>
            </div>
          </NightBox>
        )}

        {showCats && (
          <NightBox title="Categorias">
            <div className="grid grid-cols-2 gap-1.5">
              {cfg.cats.map((c) => (
                <NightChip key={c} className="w-full justify-center" selected={categories.includes(c)} accent={accent} onClick={() => toggleCat(c)}>
                  {CAT_LABELS[c]}
                </NightChip>
              ))}
            </div>
          </NightBox>
        )}
        {mode === 'friends' && friendsMode === 'map_mini' && (
          <p className="text-center text-[13px] text-white/45">Só mini-jogos — as categorias não entram no tabuleiro.</p>
        )}

        {cfg.hasMini && (friendsMode === 'map_cats' || friendsMode === 'map_mini') && (
          <NightBox title="Mini-jogos">
            <div className="grid grid-cols-2 gap-1.5">
              {MINI_GAMES.map((m) => (
                <NightChip key={m.id} className="w-full justify-center" selected={miniGames.includes(m.id)} accent={accent} onClick={() => toggleMini(m.id)}>
                  {m.label}
                </NightChip>
              ))}
            </div>
          </NightBox>
        )}

        <NightBox title="Competição">
          <div className="grid grid-cols-2 gap-1.5">
            <NightChip className="w-full justify-center" selected={!teamsOn} accent={accent} onClick={() => setTeamsOn(false)}>👤 Individual</NightChip>
            <NightChip className="w-full justify-center" selected={teamsOn} accent={accent} onClick={() => setTeamsOn(true)}>👥 Equipas</NightChip>
          </div>
          {teamsOn && (
            <div className="mt-3 space-y-2">
              {players.map((p, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-[13px] font-bold text-white">{p.name}</span>
                  <div className="flex gap-1">
                    {teams.map((t, ti) => (
                      <NightChip
                        key={ti}
                        selected={p.team === ti}
                        accent={accent}
                        onClick={() => setPlayers((ps) => ps.map((pl, j) => (j === i ? { ...pl, team: ti } : pl)))}
                      >
                        {t.name.replace('Equipa ', 'E')}
                      </NightChip>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </NightBox>

        <NightBox title="Objetivo">
          {isFamily ? (
            <p className="text-[13px] text-white/70">{categories.length} categorias × 3 = {winningScore} pts</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-1.5">
                <NightChip className="w-full justify-center" selected={scoreMode === '3_per_cat'} accent={accent} onClick={() => setScoreMode('3_per_cat')}>📦 3 por tipo</NightChip>
                <NightChip className="w-full justify-center" selected={scoreMode === 'max_points'} accent={accent} onClick={() => setScoreMode('max_points')}>🎯 Máximo</NightChip>
              </div>
              {scoreMode === '3_per_cat' && (
                <p className="mt-2 text-[13px] text-white/70">{categories.length} categorias × 3 = {winningScore} pts</p>
              )}
              {scoreMode === 'max_points' && (
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {[3, 5, 7, 10, 15, 20].map((n) => (
                    <NightChip key={n} className="w-full justify-center" selected={maxPoints === n} accent={accent} onClick={() => setMaxPoints(n)}>{n}</NightChip>
                  ))}
                </div>
              )}
            </>
          )}
        </NightBox>

        {mode === 'friends' && (
          <NightBox title="Penalização">
            <div className="grid grid-cols-3 gap-1.5">
              <NightChip className="w-full justify-center" selected={penalty === 'sips'} accent={accent} onClick={() => setPenalty('sips')}>🍺 Goles</NightChip>
              <NightChip className="w-full justify-center" selected={penalty === 'penalty'} accent={accent} onClick={() => setPenalty('penalty')}>⚽ Penáltis</NightChip>
              <NightChip className="w-full justify-center" selected={penalty === 'both'} accent={accent} onClick={() => setPenalty('both')}>🎲 Ambos</NightChip>
            </div>
          </NightBox>
        )}
      </div>
    </NightShell>
  )
}
