import { useState } from 'react'
import { loadNightRoster, saveNightRoster, clearNightRoster } from '../utils/nightRoster'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Heart, Users, Dices, Layers, Search, Beer, Pencil, Users2, Moon, Laugh, Info } from 'lucide-react'
import { useLang } from '../contexts/LangContext'
import LegalLinks from '../components/legal/LegalLinks'
import MesaNoite from '../components/layout/MesaNoite'
import { isUnder18 } from '../utils/ageGate'

const MODE_ICONS = { couple: Heart, friends: Users, family: Dices, drink: Beer, cards: Layers, mister: Search, aldeia: Moon, mememix: Laugh }
const MODE_COLORS = {
  drink:   '#ff5c8d',
  friends: '#8b5cf6',
  family:  '#4ade80',
  couple:  '#f87171',
  mister:  '#fbbf24',
  mememix: '#fb7185',
  cards:   '#e2e8f0',
  aldeia:  '#22d3ee',
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
const MODE_BLURB = {
  drink: 'Um telemóvel. Cartas para beber até desmaiar.',
  mememix: 'Cada um no seu telemóvel. Transforma fotos do grupo em Memes',
  cards: 'Cada um no seu telemóvel. Humor antigo aguenta se conseguires.',
  aldeia: 'Cada um no seu telemóvel. Loucura na aldeia.',
  mister: 'Local ou online. Quem é o infiltrado?',
  friends: 'Um telemóvel. Mapa, desafios e mini-jogos.',
  family: 'Um telemóvel. Igual aos amigos, sem conteúdo adulto.',
  couple: 'Um telemóvel. Dois jogadores, desafios de casal.',
}
const WHEEL_MODES = ['drink', 'mememix', 'cards', 'aldeia', 'mister']
const EXTRA_MODES = ['friends', 'family', 'couple']
const ORBIT = 36
const MAX_ROSTER = 15

function hubAngle(index, total) {
  return (index / total) * Math.PI * 2 - Math.PI / 2
}

function InfoDot({ id, onInfo }) {
  return (
    <button
      type="button"
      aria-label={`O que é ${HUB_SHORT[id]}`}
      onClick={(e) => {
        e.stopPropagation()
        onInfo(id)
      }}
      className="grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-[#2a2a2e] active:scale-95"
    >
      <Info className="h-3.5 w-3.5 text-slate-200" strokeWidth={2.2} />
    </button>
  )
}

function ModeHub({ modes, navigate, t, onInfo }) {
  const total = modes.length
  const lineInner = 13
  const lineOuter = ORBIT - 9

  return (
    <div className="relative mx-auto mb-8 aspect-square w-[min(86vw,440px)]">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2">
        <motion.div
          className="h-full w-full rounded-full blur-md"
          style={{ background: 'conic-gradient(from 0deg, #ec4899, #22d3ee, #fbbf24, #ec4899)' }}
          initial={{ opacity: 0, rotate: 0 }}
          animate={{ opacity: 0.4, rotate: 360 }}
          transition={{ opacity: { duration: 0.9 }, rotate: { duration: 26, ease: 'linear', repeat: Infinity } }}
        />
      </div>

      <motion.svg
        className="pointer-events-none absolute inset-0 z-[1] h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.25 }}
      >
        {modes.map((_, i) => {
          const a = hubAngle(i, total)
          return (
            <line
              key={i}
              x1={50 + Math.cos(a) * lineInner}
              y1={50 + Math.sin(a) * lineInner}
              x2={50 + Math.cos(a) * lineOuter}
              y2={50 + Math.sin(a) * lineOuter}
              stroke="rgba(255,255,255,.14)"
              strokeWidth="0.4"
            />
          )
        })}
      </motion.svg>

      <div className="absolute left-1/2 top-1/2 z-10 h-24 w-24 -translate-x-1/2 -translate-y-1/2 sm:h-[112px] sm:w-[112px]">
        <motion.div
          className="flex h-full w-full items-center justify-center rounded-full border border-white/10 bg-[#141419]"
          style={{ boxShadow: '0 0 50px rgba(0,0,0,.6)' }}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16 }}
        >
          <span className="text-sm font-black text-white">Party<span className="text-[#ffb04f]">Mix</span></span>
        </motion.div>
      </div>

      {modes.map((id, i) => {
        const color = MODE_COLORS[id]
        const Icon = MODE_ICONS[id]
        const a = hubAngle(i, total)
        const x = 50 + Math.cos(a) * ORBIT
        const y = 50 + Math.sin(a) * ORBIT
        return (
          <div
            key={id}
            className="absolute z-20 h-[76px] w-[76px] -translate-x-1/2 -translate-y-1/2 sm:h-20 sm:w-20"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <motion.button
              type="button"
              onClick={() => navigate(MODE_PATHS[id])}
              className="relative h-full w-full"
              initial={{ opacity: 0, scale: 0.5, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.15 + i * 0.08 }}
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.9 }}
            >
              <span
                className="grid h-full w-full place-items-center rounded-full bg-[#1c1c21]"
                style={{
                  border: `1px solid ${color}66`,
                  boxShadow: `0 8px 30px -8px ${color}88`,
                }}
              >
                <Icon className="h-[30px] w-[30px]" style={{ color }} strokeWidth={1.75} />
              </span>
              <span className="absolute left-1/2 top-[calc(100%+6px)] w-24 -translate-x-1/2 text-center text-xs font-bold leading-tight text-white sm:text-sm">
                {HUB_SHORT[id] || t.modes[id]?.label}
              </span>
            </motion.button>
            <span className="absolute -right-1.5 -top-1.5 z-30">
              <InfoDot id={id} onInfo={onInfo} />
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const { t } = useLang()
  const [roster, setRoster] = useState(() => loadNightRoster())
  const [editOpen, setEditOpen] = useState(false)
  const [draftNames, setDraftNames] = useState([])
  const [draftGenders, setDraftGenders] = useState([])
  const [infoId, setInfoId] = useState(null)
  const under18 = isUnder18()
  const rosterNames = roster.names || []
  const hubModes = under18 ? ['family'] : WHEEL_MODES
  const hasGroup = rosterNames.length >= 2

  const openRoster = () => {
    setDraftNames(hasGroup ? [...rosterNames] : [])
    setDraftGenders(hasGroup ? [...(roster.genders || [])] : [])
    setEditOpen(true)
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center overflow-x-hidden overflow-y-auto bg-[#121214] px-4 py-6">
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
        style={{
          background: 'radial-gradient(circle, rgba(236,72,153,.28) 0%, rgba(34,211,238,.12) 42%, rgba(251,191,36,.08) 68%, transparent 78%)',
        }}
      />

      <div className="relative z-10 w-full max-w-lg sm:min-h-[4.5rem]">
        <motion.h1
          className="text-center text-4xl font-black tracking-tight sm:text-5xl"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <span className="bg-gradient-to-r from-[#ff4d7a] to-[#ffb04f] bg-clip-text text-transparent">Party</span>
          <span className="text-[#ffb04f]">Mix</span>
        </motion.h1>

        <motion.div
          className="mx-auto mt-5 flex justify-center"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.25, ease: 'easeOut' }}
        >
          <button
            type="button"
            onClick={openRoster}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#2a2a2e] px-4 py-2 text-sm active:scale-95"
          >
            <span className="max-w-[14rem] truncate font-medium text-white">
              {hasGroup ? rosterNames.join(' · ') : 'Adicionar jogadores'}
            </span>
            <Pencil className="h-3.5 w-3.5 shrink-0 text-[#ffb04f]" />
            {hasGroup && <span className="shrink-0 font-semibold text-[#ffb04f]">Editar grupo</span>}
          </button>
          {rosterNames.length >= 2 && (
            <button
              type="button"
              onClick={() => setRoster(clearNightRoster())}
              className="ml-2 rounded-full border border-white/10 bg-[#2a2a2e] px-3 py-2 text-xs font-bold text-slate-400 active:scale-95"
            >
              Esquecer
            </button>
          )}
        </motion.div>
      </div>

      <div className="relative z-10 my-auto w-full">
        {under18 ? (
          <button
            type="button"
            onClick={() => navigate('/GameSetup?mode=family')}
            className="mx-auto flex w-full max-w-sm items-center gap-4 rounded-[2rem] border border-white/10 bg-[#1c1c21] p-5 text-left active:scale-95"
          >
            <span className="grid h-20 w-20 place-items-center rounded-full bg-[#141419]" style={{ border: '1px solid #4ade8066', boxShadow: '0 8px 30px -8px #4ade8088' }}>
              <Dices className="h-8 w-8 text-[#4ade80]" strokeWidth={1.75} />
            </span>
            <span>
              <span className="block text-2xl font-black text-white">Família</span>
              <span className="mt-2 inline-flex text-sm font-bold text-[#ffb04f]">Jogar agora</span>
            </span>
          </button>
        ) : (
          <ModeHub modes={hubModes} navigate={navigate} t={t} onInfo={setInfoId} />
        )}
      </div>

      {infoId && (
        <p className="relative z-10 mb-3 max-w-sm px-3 text-center text-sm text-slate-300">
          <span className="font-black text-white">{HUB_SHORT[infoId]} · </span>
          {MODE_BLURB[infoId]}
        </p>
      )}

      {!under18 && (
        <div className="relative z-10 mb-3 w-full max-w-lg rounded-[1.4rem] border border-white/10 bg-[#1c1c21] p-3">
          <div className="flex justify-center gap-2">
            {EXTRA_MODES.map((id) => {
              const Icon = MODE_ICONS[id]
              const color = MODE_COLORS[id]
              return (
                <div key={id} className="relative min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => navigate(MODE_PATHS[id])}
                    className="flex w-full flex-col items-center gap-1.5 rounded-2xl bg-[#141419] px-2 py-3 active:scale-95"
                  >
                    <span
                      className="grid h-11 w-11 place-items-center rounded-full"
                      style={{ border: `1px solid ${color}66`, boxShadow: `0 8px 24px -8px ${color}88` }}
                    >
                      <Icon className="h-5 w-5" style={{ color }} strokeWidth={1.75} />
                    </span>
                    <span className="text-[11px] font-bold text-white">{HUB_SHORT[id]}</span>
                  </button>
                  <span className="absolute right-1 top-1">
                    <InfoDot id={id} onInfo={setInfoId} />
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!under18 && (
        <button
          type="button"
          onClick={() => navigate('/community')}
          className="relative z-10 mb-2 mt-2 w-full max-w-lg rounded-2xl border border-white/10 bg-[#1c1c21]/80 px-4 py-3 flex items-center gap-3 text-left active:scale-95"
        >
          <div className="grid h-10 w-10 place-items-center rounded-full bg-[#141419]">
            <Users2 className="h-5 w-5 text-[#8b5cf6]" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white">{t.community}</p>
            <p className="truncate text-xs text-slate-400">{t.communityDesc}</p>
          </div>
        </button>
      )}

      <p className="relative z-10 mt-2 text-xs text-slate-500">
        PartyMix v5
        {!under18 && (
          <>
            {' · '}
            <a onClick={() => navigate('/admin')} className="cursor-pointer transition-colors hover:text-slate-400">⚙</a>
          </>
        )}
      </p>
      <LegalLinks />

      {editOpen && (
        <div className="fixed inset-0 z-50 h-[var(--app-vh,100dvh)] overflow-hidden">
          <MesaNoite
            names={draftNames}
            genders={draftGenders}
            max={MAX_ROSTER}
            onBack={() => setEditOpen(false)}
            onChange={(nextNames, nextGenders) => {
              setDraftNames(nextNames)
              setDraftGenders(nextGenders)
            }}
            onConfirm={(nextNames, nextGenders) => {
              if (nextNames.length < 2) return
              setRoster(saveNightRoster(nextNames, nextGenders))
              setEditOpen(false)
            }}
            onForget={() => {
              setRoster(clearNightRoster())
              setDraftNames([])
              setDraftGenders([])
              setEditOpen(false)
            }}
          />
        </div>
      )}
    </div>
  )
}
