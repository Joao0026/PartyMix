import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { isAdultPath, loadAgeGate, saveAgeGate } from '../../utils/ageGate'
import { api } from '../../utils/api'

export default function AgeGate({ children }) {
  const location = useLocation()
  const [choice, setChoice] = useState(() => loadAgeGate())
  const [busy, setBusy] = useState(false)

  const legal = location.pathname === '/privacy' || location.pathname === '/terms'
  if (legal) return children

  const confirm = async (value) => {
    setBusy(true)
    saveAgeGate(value)
    try {
      await api.setAgeGate(value)
    } catch { /* cookie opcional se o backend estiver em baixo; o header X-PartyMix-Age ainda restringe */ }
    setChoice(value)
    setBusy(false)
  }

  if (!choice) {
    return (
      <div className="min-h-screen bg-[#080b14] flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-6 space-y-4">
          <p className="text-3xl text-center">🎉</p>
          <h1 className="text-white text-2xl font-black text-center">Tens 18 anos ou mais?</h1>
          <p className="text-slate-400 text-sm leading-relaxed text-center">
            O PartyMix inclui jogos com álcool e conteúdo sexual para adultos.
            A Play Store e a lei portuguesa exigem confirmação de idade.
            Se tiveres menos de 18 anos, só o Modo Família fica disponível.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => confirm('18')}
            className="w-full rounded-2xl bg-violet-600 py-4 min-h-[52px] text-white font-black disabled:opacity-50"
          >
            Sim, tenho 18 ou mais
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => confirm('under')}
            className="w-full rounded-2xl border border-white/15 py-4 min-h-[52px] text-slate-100 font-bold disabled:opacity-50"
          >
            Não, sou menor de 18
          </button>
          <p className="text-slate-400 text-xs text-center">
            Declaração própria. Não verificamos documentos. Mentir sobre a idade viola os termos.
          </p>
        </div>
      </div>
    )
  }

  if (choice === 'under' && isAdultPath(location.pathname, location.search)) {
    return <Navigate to="/" replace />
  }

  return children
}
