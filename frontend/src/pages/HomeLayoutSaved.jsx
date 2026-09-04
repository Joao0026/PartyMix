import { useState } from 'react'
import { loadNightRoster, clearNightRoster } from '../utils/nightRoster'
import { useNavigate } from 'react-router-dom'
import { Heart, Users, Home as HomeIcon, Layers, Eye, Beer, Pencil, Users2, Moon, Laugh } from 'lucide-react'
import { useLang } from '../contexts/LangContext'
import LegalLinks from '../components/legal/LegalLinks'
import { isUnder18 } from '../utils/ageGate'

const MODE_ICONS = { couple: Heart, friends: Users, family: HomeIcon, drink: Beer, cards: Layers, mister: Eye, aldeia: Moon, mememix: Laugh }
const MODE_COLORS = {
  drink:   { icon: '#f472b6', glow: '#ec4899' },
  mememix: { icon: '#fb7185', glow: '#f43f5e' },
  cards:   { icon: '#e2e8f0', glow: '#cbd5e1' },
  aldeia:  { icon: '#34d399', glow: '#10b981' },
  family:  { icon: '#6ee7b7', glow: '#2dd4bf' },
  couple:  { icon: '#fb7185', glow: '#ef4444' },
  friends: { icon: '#a78bfa', glow: '#8b5cf6' },
  mister:  { icon: '#fbbf24', glow: '#f59e0b' },
}
const MODE_PATHS = {
  couple: '/GameSetup?mode=couple', friends: '/GameSetup?mode=friends', family: '/GameSetup?mode=family',
  drink: '/DrinkGame', cards: '/CardsLobby', mister: '/MisterWhite',
  aldeia: '/AldeiaMix', mememix: '/MemeMixLobby',
}
const HUB_SHORT = {
  drink: 'Beber',
  mememix: 'MemeMix',
  cards: 'Cartas',
  mister: 'Mister White',
  aldeia: 'AldeiaMix',
  friends: 'Amigos',
  family: 'Família',
  couple: 'Casal',
}
const HUB_ORDER = ['drink', 'mememix', 'cards', 'aldeia', 'family', 'couple', 'friends', 'mister']

const HUB_ORBIT = 37
const HUB_ICON = 17
const HUB_CORE = 25

function hubAngle(index, total) {
  return (index / total) * Math.PI * 2 - Math.PI / 2
}

function ModeHub({ modes, navigate, t }) {
  const total = modes.length
  const lineInner = HUB_CORE / 2
  const lineOuter = HUB_ORBIT - HUB_ICON / 2

  return (
    <div className="relative mx-auto w-full max-w-[22rem] pb-8">
      <div className="relative aspect-square w-full">
        {modes.map((id, i) => {
          const cfg = MODE_COLORS[id]
          const a = hubAngle(i, total)
          const x = 50 + Math.cos(a) * 30
          const y = 50 + Math.sin(a) * 30
          return (
            <div
              key={`glow-${id}`}
              className="pointer-events-none absolute rounded-full"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                width: '48%',
                height: '48%',
                transform: 'translate(-50%, -50%)',
                background: `radial-gradient(circle, ${cfg.glow} 0%, transparent 68%)`,
                filter: 'blur(28px)',
                opacity: 0.55,
              }}
            />
          )
        })}

        <svg className="pointer-events-none absolute inset-0 z-[1] h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden>
          {modes.map((_, i) => {
            const a = hubAngle(i, total)
            const c = Math.cos(a)
            const s = Math.sin(a)
            return (
              <line
                key={i}
                x1={50 + c * lineInner}
                y1={50 + s * lineInner}
                x2={50 + c * lineOuter}
                y2={50 + s * lineOuter}
                stroke="rgba(226,232,240,0.32)"
                strokeWidth="0.45"
                strokeLinecap="round"
              />
            )
          })}
        </svg>

        <div
          className="absolute z-10 flex flex-col items-center justify-center rounded-full bg-[#161616]"
          style={{
            left: '50%',
            top: '50%',
            width: `${HUB_CORE}%`,
            height: `${HUB_CORE}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <span className="text-[11px] font-black leading-none tracking-tight text-white sm:text-[13px]">Party<span className="text-orange-400">Mix</span></span>
        </div>

        {modes.map((id, i) => {
          const cfg = MODE_COLORS[id]
          const Icon = MODE_ICONS[id]
          const a = hubAngle(i, total)
          const x = 50 + Math.cos(a) * HUB_ORBIT
          const y = 50 + Math.sin(a) * HUB_ORBIT
          return (
            <button
              key={id}
              type="button"
              onClick={() => navigate(MODE_PATHS[id])}
              className="absolute z-20 p-0"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                width: `${HUB_ICON}%`,
                height: `${HUB_ICON}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <span
                className="grid h-full w-full place-items-center rounded-full bg-[#1c1c1c]"
                style={{ boxShadow: `0 0 22px ${cfg.glow}90, 0 0 40px ${cfg.glow}40` }}
              >
                <Icon className="h-[46%] w-[46%]" style={{ color: cfg.icon }} strokeWidth={2.1} />
              </span>
              <span className="absolute left-1/2 top-[calc(100%+5px)] w-[5.2rem] -translate-x-1/2 text-center text-[10px] font-bold leading-tight text-white">
                {HUB_SHORT[id] || t.modes[id]?.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Cópia do hub anterior (círculos escuros + luz por modo). Para voltar: em App.jsx importa este ficheiro em vez de Home. */
export default function HomeLayoutSaved() {
  const navigate = useNavigate()
  const { t } = useLang()
  const [roster, setRoster] = useState(() => loadNightRoster())
  const under18 = isUnder18()
  const rosterNames = roster.names || []
  const hubModes = under18 ? ['family'] : HUB_ORDER

  return (
    <div className="min-h-screen bg-black flex flex-col items-center px-4 py-6 overflow-x-hidden overflow-y-auto relative">
      <div className="relative z-10 w-full max-w-lg">
        <div className="mb-3">
          <button
            type="button"
            onClick={() => navigate(under18 ? '/GameSetup?mode=family' : '/DrinkGame')}
            className="inline-flex items-center gap-2 rounded-full bg-[#1c1c1c] px-3.5 py-2 text-left"
          >
            <span className="text-[12px] font-semibold text-white">
              {rosterNames.length >= 2 ? rosterNames.slice(0, 3).join(', ') : 'Adicionar jogadores'}
            </span>
            <Pencil className="h-3.5 w-3.5 text-orange-400 shrink-0" />
            <span className="text-[12px] font-semibold text-orange-400">Editar grupo</span>
          </button>
          {rosterNames.length >= 2 && (
            <button
              type="button"
              onClick={() => setRoster(clearNightRoster())}
              className="ml-2 rounded-full bg-[#1c1c1c] px-3 py-2 text-[10px] font-bold text-slate-400"
            >
              Esquecer
            </button>
          )}
        </div>

        <div className="text-center mb-2">
          <h1 className="text-[2.35rem] font-black tracking-tight leading-none">
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg, #f472b6, #fb7185)' }}>Party</span>
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg, #fb923c, #fbbf24)' }}>Mix</span>
          </h1>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-lg mt-2">
        {under18 ? (
          <button
            type="button"
            onClick={() => navigate('/GameSetup?mode=family')}
            className="mx-auto flex w-full max-w-sm items-center gap-4 rounded-[2rem] border border-sky-400/40 bg-sky-500/10 p-5 text-left"
          >
            <span className="grid h-20 w-20 place-items-center rounded-[1.4rem] bg-gradient-to-br from-sky-400 to-indigo-500">
              <HomeIcon className="h-9 w-9 text-white" />
            </span>
            <span>
              <span className="block text-white text-2xl font-black">Modo Família</span>
              <span className="mt-2 inline-flex rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950">Jogar agora</span>
            </span>
          </button>
        ) : (
          <ModeHub modes={hubModes} navigate={navigate} t={t} />
        )}
      </div>

      {!under18 && (
        <button
          type="button"
          onClick={() => navigate('/community')}
          className="relative z-10 mt-4 w-full max-w-lg rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] px-4 py-3 flex items-center gap-3 text-left"
        >
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center shrink-0">
            <Users2 className="text-white w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-sm">{t.community}</p>
            <p className="text-slate-400 text-xs truncate">{t.communityDesc}</p>
          </div>
        </button>
      )}

      <p className="mt-6 text-slate-400 text-xs relative z-10">
        PartyMix v5
        {!under18 && (
          <>
            {' · '}
            <a onClick={() => navigate('/admin')} className="hover:text-slate-500 cursor-pointer transition-colors">⚙</a>
          </>
        )}
      </p>
      <LegalLinks />
    </div>
  )
}
