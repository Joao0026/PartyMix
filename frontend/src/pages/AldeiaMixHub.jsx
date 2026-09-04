import { useNavigate } from 'react-router-dom'
import { Moon, Wifi } from 'lucide-react'
import NightShell, { GlowDisc, NightTitle } from '../components/layout/NightShell'

const CYAN = '#22d3ee'

export default function AldeiaMixHub() {
  const navigate = useNavigate()

  return (
    <NightShell onBack={() => navigate('/')}>
      <NightTitle>AldeiaMix</NightTitle>
      <p className="mt-3 text-center text-[1.05rem] font-medium text-white">Sala online</p>
      <p className="mt-1.5 text-center text-[13px] text-white/45">Mínimo 4 pessoas. Cada um no seu telemóvel.</p>

      <div className="my-8 flex justify-center">
        <GlowDisc color={CYAN} size={76}>
          <Moon className="h-[30px] w-[30px]" style={{ color: CYAN }} strokeWidth={1.75} />
        </GlowDisc>
      </div>

      <button
        type="button"
        onClick={() => navigate('/AldeiaMixLobby')}
        className="flex w-full items-center gap-3.5 rounded-[1.75rem] border border-white/10 bg-[#1c1c21] px-4 py-3.5 text-left active:scale-[0.98]"
      >
        <GlowDisc color="#8b5cf6" size={56}>
          <Wifi className="h-[22px] w-[22px] text-[#8b5cf6]" strokeWidth={1.75} />
        </GlowDisc>
        <span>
          <span className="block text-[17px] font-extrabold text-white">Criar ou entrar</span>
          <span className="mt-0.5 block text-xs text-slate-400">Código da sala. O host conduz a noite.</span>
        </span>
      </button>
    </NightShell>
  )
}
