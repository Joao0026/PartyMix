import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Smartphone, Wifi } from 'lucide-react'
import NightShell, { GlowDisc, NightTitle } from '../components/layout/NightShell'
import { loadOnlineFeatures } from '../utils/features'

const GOLD = '#fbbf24'

export default function MisterWhiteHub() {
  const navigate = useNavigate()
  const [onlineOk, setOnlineOk] = useState(true)

  useEffect(() => {
    loadOnlineFeatures().then((f) => setOnlineOk(f.mw !== false))
  }, [])

  return (
    <NightShell onBack={() => navigate('/')}>
      <NightTitle>Mister White</NightTitle>
      <p className="mt-3 text-center text-[1.05rem] font-medium text-white">Como queres jogar?</p>
      <p className="mt-1.5 text-center text-[13px] text-white/45">Mínimo 3 pessoas.</p>

      <div className="my-8 flex justify-center">
        <GlowDisc color={GOLD} size={76}>
          <Search className="h-[30px] w-[30px]" style={{ color: GOLD }} strokeWidth={1.75} />
        </GlowDisc>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => navigate('/MisterWhiteGame')}
          className="flex items-center gap-3.5 rounded-[1.75rem] border border-white/10 bg-[#1c1c21] px-4 py-3.5 text-left active:scale-[0.98]"
        >
          <GlowDisc color="#22d3ee" size={56}>
            <Smartphone className="h-[22px] w-[22px] text-[#22d3ee]" strokeWidth={1.75} />
          </GlowDisc>
          <span>
            <span className="block text-[17px] font-extrabold text-white">Um telemóvel</span>
            <span className="mt-0.5 block text-xs text-slate-400">Passa à volta da mesa. Vê os papéis.</span>
          </span>
        </button>

        <button
          type="button"
          disabled={!onlineOk}
          onClick={() => onlineOk && navigate('/MisterWhiteLobby')}
          className="flex items-center gap-3.5 rounded-[1.75rem] border border-white/10 bg-[#1c1c21] px-4 py-3.5 text-left active:scale-[0.98] disabled:opacity-40"
        >
          <GlowDisc color="#8b5cf6" size={56}>
            <Wifi className="h-[22px] w-[22px] text-[#8b5cf6]" strokeWidth={1.75} />
          </GlowDisc>
          <span>
            <span className="block text-[17px] font-extrabold text-white">
              {onlineOk ? 'Sala online' : 'Online indisponível'}
            </span>
            <span className="mt-0.5 block text-xs text-slate-400">
              {onlineOk ? 'Cada um no seu. Código da sala.' : 'Este modo está desligado neste servidor.'}
            </span>
          </span>
        </button>
      </div>
    </NightShell>
  )
}
