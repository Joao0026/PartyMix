import { useState } from 'react'
import { Plus, User, X } from 'lucide-react'
import BackButton from './BackButton'

const GENDERS = [
  { id: 'm', symbol: '♂', label: 'Ele', on: 'text-sky-300' },
  { id: 'f', symbol: '♀', label: 'Ela', on: 'text-[#ff7ab0]' },
]

const PLAYER_TONES = ['#ff5c8d', '#fb7185', '#e2e8f0', '#22d3ee', '#fbbf24', '#8b5cf6', '#4ade80', '#f87171']

function pessoaLabel(n) {
  return n === 1 ? '1 pessoa' : `${n} pessoas`
}

export default function MesaNoite({
  names = [],
  genders = [],
  onChange,
  onConfirm,
  onBack,
  onForget,
  min = 2,
  max = 15,
  confirmPrefix = 'Começar com',
}) {
  const [draft, setDraft] = useState('')
  const [gender, setGender] = useState('m')
  const count = names.length
  const canAdd = Boolean(draft.trim()) && count < max
  const canConfirm = count >= min

  const addName = () => {
    const clean = draft.trim().slice(0, 20)
    if (!clean || names.length >= max) return false
    const exists = names.some((n) => n.toLocaleLowerCase('pt-PT') === clean.toLocaleLowerCase('pt-PT'))
    if (exists) return false
    onChange([...names, clean], [...genders, gender])
    setDraft('')
    return true
  }

  const confirm = () => {
    if (count >= min) onConfirm?.(names, genders)
  }

  const removeAt = (index) => {
    onChange(
      names.filter((_, i) => i !== index),
      genders.filter((_, i) => i !== index),
    )
  }

  return (
    <div className="relative flex h-[var(--app-vh,100dvh)] min-h-0 flex-col overflow-hidden bg-black">
      <div className="pointer-events-none absolute -left-24 top-[28%] h-[22rem] w-[22rem] rounded-full bg-[#ff9a3c]/55 blur-[90px]" />
      <div className="pointer-events-none absolute -right-20 top-[30%] h-[24rem] w-[24rem] rounded-full bg-[#ff2d9b]/50 blur-[90px]" />

      {onBack && (
        <div className="absolute left-2 top-2 z-20">
          <BackButton onClick={onBack} />
        </div>
      )}

      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-[22rem] flex-1 flex-col px-6 pt-14">
        <div className="shrink-0">
          <h1 className="text-center text-[1.7rem] font-black leading-snug tracking-tight">
            <span className="bg-gradient-to-r from-[#ff4d7a] to-[#ffb04f] bg-clip-text text-transparent">
              A mesa desta noite
            </span>
          </h1>
          <p className="mt-3 text-center text-[1.05rem] font-medium text-white">Quem joga??</p>
          <p className="mt-1.5 text-center text-[13px] leading-snug text-slate-400">
            Ficam guardados quando mudares de jogo.
          </p>

          <form
            className="mt-8"
            onSubmit={(e) => {
              e.preventDefault()
              addName()
            }}
          >
            <div className="flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Nome"
                maxLength={20}
                autoComplete="off"
                aria-label="Nome do jogador"
                className="h-12 min-w-0 flex-1 rounded-full border border-white/10 bg-[#1c1c21] px-5 text-[15px] text-white outline-none placeholder:text-slate-500 focus:border-white/25"
              />
              <button
                type="submit"
                disabled={!canAdd}
                className="flex h-12 shrink-0 items-center gap-1 rounded-full border border-white/10 bg-[#2a2a2e] px-3.5 text-[13px] font-bold text-white disabled:opacity-35"
              >
                <Plus className="h-4 w-4 text-[#ffb04f]" strokeWidth={2.5} />
                Adicionar
              </button>
            </div>
          </form>

          <div className="mt-3 flex justify-center">
            <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-[#2a2a2e] px-4 py-1.5 text-[13px] font-medium">
              {GENDERS.map((opt, i) => (
                <span key={opt.id} className="flex items-center gap-1">
                  {i > 0 && <span className="text-white/25">·</span>}
                  <button
                    type="button"
                    onClick={() => setGender(opt.id)}
                    className={gender === opt.id ? opt.on : 'text-slate-400'}
                  >
                    {opt.symbol} {opt.label}
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="space-y-2.5 pb-2">
            {names.map((name, i) => {
              const color = PLAYER_TONES[i % PLAYER_TONES.length]
              return (
                <div key={`${name}-${i}`} className="relative">
                  <div className="flex w-full items-center gap-3 rounded-full border border-white/10 bg-[#1c1c21] px-2.5 py-2 pr-8">
                    <span
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#141419]"
                      style={{
                        border: `1px solid ${color}66`,
                        boxShadow: `0 8px 24px -8px ${color}88`,
                      }}
                    >
                      <User className="h-5 w-5" style={{ color }} strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-white">{name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAt(i)}
                    aria-label={`Remover ${name}`}
                    className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-[#2a2a2e] text-slate-300 active:scale-90"
                  >
                    <X className="h-3 w-3" strokeWidth={2.4} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        <div className="shrink-0 pt-3 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
          <button
            type="button"
            onClick={confirm}
            disabled={!canConfirm}
            className="min-h-[54px] w-full rounded-full border bg-[#1c1c21] text-[17px] font-extrabold text-white active:scale-[0.98] disabled:opacity-40"
            style={{
              borderColor: '#ff4d7a66',
              boxShadow: canConfirm ? '0 8px 30px -8px #ff4d7a88' : 'none',
            }}
          >
            {confirmPrefix} {pessoaLabel(count)}
          </button>
          {onForget && count >= 2 && (
            <button
              type="button"
              onClick={onForget}
              className="mt-2 w-full py-1.5 text-center text-xs font-bold text-slate-500"
            >
              Esquecer nomes
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
