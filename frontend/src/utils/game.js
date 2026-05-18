export const PLAYER_COLORS = ['from-pink-400 to-rose-500','from-cyan-400 to-blue-500','from-emerald-400 to-teal-500','from-amber-400 to-orange-500','from-violet-400 to-purple-500','from-fuchsia-400 to-pink-500','from-lime-400 to-green-500','from-sky-400 to-indigo-500']
export const TEAM_COLORS   = ['from-blue-500 to-cyan-600','from-red-500 to-rose-600','from-green-500 to-emerald-600','from-amber-500 to-yellow-600']

export const CATEGORY_CONFIG = {
  telepatia:   { emoji:'🧠', label:'Sincronia',    color:'from-cyan-500 to-blue-600' },
  perguntas:   { emoji:'📚', label:'Sabichão',     color:'from-indigo-500 to-blue-600' },
  desenho:     { emoji:'🎨', label:'Rabiscos',     color:'from-blue-500 to-cyan-600' },
  mimica:      { emoji:'🎭', label:'Gestos',       color:'from-purple-500 to-violet-600' },
  proibido:    { emoji:'🚫', label:'Palavra Tabu', color:'from-amber-500 to-orange-600' },
  caos:        { emoji:'💥', label:'Caos',         color:'from-red-500 to-rose-600' },
  palavra:     { emoji:'💬', label:'Palavra',      color:'from-green-500 to-emerald-600' },
  acao:        { emoji:'⚡', label:'Ação',         color:'from-yellow-500 to-amber-600' },
  verdade:     { emoji:'❓', label:'Verdade',      color:'from-pink-500 to-rose-600' },
  consequencia:{ emoji:'🎲', label:'Consequência', color:'from-red-500 to-orange-600' },
  cultura:     { emoji:'📚', label:'Cultura',      color:'from-indigo-500 to-blue-600' },
  desporto:    { emoji:'⚽', label:'Desporto',     color:'from-green-500 to-lime-600' },
  musica:      { emoji:'🎵', label:'Música',       color:'from-fuchsia-500 to-pink-600' },
  cinema:      { emoji:'🎬', label:'Cinema',       color:'from-orange-500 to-red-600' },
  erotico:     { emoji:'🔥', label:'Erótico',      color:'from-red-500 to-rose-700' },
  romantico:   { emoji:'🌹', label:'Conexão',      color:'from-rose-400 to-pink-500' },
  picante:     { emoji:'🔥', label:'Picante',      color:'from-red-500 to-rose-700' },
  roleplay:    { emoji:'🎭', label:'Cena',         color:'from-slate-500 to-slate-700' },
  casal_pergunta:{ emoji:'💬', label:'Quanto me conheces?', color:'from-violet-500 to-purple-700' },
  dados:       { emoji:'🎲', label:'Dados',        color:'from-slate-500 to-slate-700' },
}

export const SIPS_WEIGHTS = [
  {value:1,weight:20},{value:2,weight:35},{value:3,weight:25},
  {value:'meio copo',weight:12},{value:'copo inteiro',weight:5},{value:'dobro p/ grupo',weight:3}
]
export function weightedSips(){
  const t=SIPS_WEIGHTS.reduce((s,w)=>s+w.weight,0); let r=Math.random()*t
  for(const w of SIPS_WEIGHTS){if(r<w.weight)return w.value; r-=w.weight}
}
export function saveGame(d){sessionStorage.setItem('partyMixGame',JSON.stringify(d))}
export function loadGame(){try{return JSON.parse(sessionStorage.getItem('partyMixGame'))}catch{return null}}
export function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a}
