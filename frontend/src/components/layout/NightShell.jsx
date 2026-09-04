import { useState } from 'react'
import { User, X } from 'lucide-react'
import BackButton from './BackButton'
import { copyJoinLink } from '../../utils/joinUrl'

export const PLAYER_TONES = ['#ff5c8d', '#fb7185', '#e2e8f0', '#22d3ee', '#fbbf24', '#8b5cf6', '#4ade80', '#f87171']

export function pessoaLabel(n) {
  return n === 1 ? '1 pessoa' : `${n} pessoas`
}

export function GlowDisc({ color, size = 76, className = '', children }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-[#141419] ${className}`}
      style={{
        width: size,
        height: size,
        border: `1px solid ${color}66`,
        boxShadow: `0 8px 24px -8px ${color}88`,
      }}
    >
      {children}
    </span>
  )
}

export function NightTitle({ children }) {
  return (
    <h1 className="text-center text-[1.7rem] font-black leading-snug tracking-tight">
      <span className="bg-gradient-to-r from-[#ff4d7a] to-[#ffb04f] bg-clip-text text-transparent">
        {children}
      </span>
    </h1>
  )
}

export function NightCta({ accent = '#ff4d7a', disabled, onClick, children, type = 'button' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="min-h-[54px] w-full rounded-full border bg-[#1c1c21] text-[17px] font-extrabold text-white active:scale-[0.98] disabled:opacity-40"
      style={{
        borderColor: `${accent}66`,
        boxShadow: disabled ? 'none' : `0 8px 30px -8px ${accent}88`,
      }}
    >
      {children}
    </button>
  )
}

export function GlowCode({ code, accent, mode }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    const ok = await copyJoinLink(mode, code)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  return (
    <div className="text-center">
      <p className="text-[13px] text-white/45">Partilha o código</p>
      <button
        type="button"
        onClick={copy}
        aria-label="Copiar link da sala"
        className="mx-auto mt-2 grid h-[148px] w-[148px] place-items-center rounded-full bg-[#141419] text-[22px] font-black tracking-[0.18em] text-white active:scale-95"
        style={{ border: `1px solid ${accent}66`, boxShadow: `0 8px 30px -8px ${accent}88` }}
      >
        {code}
      </button>
      <p className="mt-2 text-xs text-white/45">{copied ? 'Link copiado' : 'toca para copiar o link'}</p>
    </div>
  )
}

export function CodeField({ value, onChange }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value.toUpperCase())}
      placeholder="ex. K7MQ2P"
      maxLength={6}
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      aria-label="Código da sala"
      className="mt-5 h-14 w-full rounded-full border border-white/10 bg-[#1c1c21] px-5 text-center text-[1.35rem] font-black tracking-[0.2em] text-white outline-none placeholder:text-white/25 placeholder:font-semibold placeholder:tracking-normal focus:border-white/25"
    />
  )
}

export function NameField({ value, onChange }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Nome"
      maxLength={20}
      autoComplete="off"
      aria-label="O teu nome"
      className="mt-4 h-12 w-full rounded-full border border-white/10 bg-[#1c1c21] px-5 text-[15px] text-white outline-none placeholder:text-slate-500 focus:border-white/25"
    />
  )
}

export function RosterChips({ names, value, onChange, accent }) {
  if (!names?.length) return null
  const on = (n) => value.trim().toLocaleLowerCase('pt-PT') === n.toLocaleLowerCase('pt-PT')
  return (
    <div className="mt-5 flex flex-wrap justify-center gap-2">
      {names.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="rounded-full border bg-[#1c1c21] px-3.5 py-2 text-[13px] font-bold text-white"
          style={on(n)
            ? { borderColor: `${accent}66`, boxShadow: `0 8px 24px -8px ${accent}88` }
            : { borderColor: 'rgba(255,255,255,.12)' }}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

export function NightTabs({ tab, onChange }) {
  return (
    <div className="mt-5 flex rounded-full border border-white/10 bg-[#1c1c21] p-1">
      <button
        type="button"
        onClick={() => onChange('create')}
        className={`flex-1 rounded-full py-2.5 text-[13px] font-extrabold ${tab === 'create' ? 'bg-[#141419] text-white' : 'text-slate-400'}`}
      >
        Criar
      </button>
      <button
        type="button"
        onClick={() => onChange('join')}
        className={`flex-1 rounded-full py-2.5 text-[13px] font-extrabold ${tab === 'join' ? 'bg-[#141419] text-white' : 'text-slate-400'}`}
      >
        Entrar
      </button>
    </div>
  )
}

export function NightPlayerChip({
  name,
  index,
  host,
  mine,
  badge,
  disconnected,
  accent = '#fbbf24',
  onRemove,
  removeLabel = 'Remover',
}) {
  const color = PLAYER_TONES[index % PLAYER_TONES.length]
  return (
    <div className={`relative ${disconnected ? 'opacity-40' : ''}`}>
      <div className="flex w-full items-center gap-3 rounded-full border border-white/10 bg-[#1c1c21] px-2.5 py-2 pr-8">
        <GlowDisc color={color} size={44}>
          <User className="h-5 w-5" style={{ color }} strokeWidth={1.75} />
        </GlowDisc>
        <span className={`min-w-0 flex-1 truncate text-[15px] font-bold text-white ${disconnected ? 'line-through' : ''}`}>
          {name}{mine ? ' (Tu)' : ''}
        </span>
        {host && <span className="text-[11px] font-extrabold" style={{ color: accent }}>HOST</span>}
        {badge}
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-[#2a2a2e] text-slate-300 active:scale-90"
        >
          <X className="h-3 w-3" strokeWidth={2.4} />
        </button>
      )}
    </div>
  )
}

export function NightBlobs() {
  return (
    <>
      <div className="pointer-events-none absolute -left-24 top-[22%] h-[22rem] w-[22rem] rounded-full bg-[#ff9a3c]/55 blur-[90px]" />
      <div className="pointer-events-none absolute -right-20 top-[28%] h-[24rem] w-[24rem] rounded-full bg-[#ff2d9b]/50 blur-[90px]" />
    </>
  )
}

export function NightChip({ selected, accent, onClick, children, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-2xl border px-3 py-2.5 text-left text-[13px] font-bold ${className}`}
      style={selected
        ? { borderColor: `${accent}66`, boxShadow: `0 8px 20px -10px ${accent}88`, background: '#1c1c21', color: '#fff' }
        : { borderColor: 'rgba(255,255,255,.1)', background: '#141419', color: '#94a3b8' }}
    >
      {children}
    </button>
  )
}

export function NightBox({ title, children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-[#1c1c21]/80 p-3 ${className}`}>
      {title && <p className="mb-2.5 text-[13px] font-bold text-white">{title}</p>}
      {children}
    </div>
  )
}

export function NightChoice({ selected, accent, onClick, title, desc, icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-2xl border bg-[#141419] px-2.5 py-2 text-left active:scale-[0.98]"
      style={selected
        ? { borderColor: `${accent}66`, boxShadow: `0 8px 20px -10px ${accent}88` }
        : { borderColor: 'rgba(255,255,255,.1)' }}
    >
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-bold text-white">{title}</span>
        {desc && <span className="block truncate text-[11px] font-medium text-white/45">{desc}</span>}
      </span>
    </button>
  )
}

export default function NightShell({ onBack, children, footer, wide = false }) {
  return (
    <div className="relative flex h-[var(--app-vh,100dvh)] min-h-0 flex-col overflow-hidden bg-black">
      <NightBlobs />

      {onBack && (
        <div className="absolute left-2 top-2 z-20">
          <BackButton onClick={onBack} />
        </div>
      )}

      <div className={`relative z-10 mx-auto flex min-h-0 w-full flex-1 flex-col px-6 pt-14 ${wide ? 'max-w-lg' : 'max-w-[22rem]'}`}>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {children}
        </div>
        {footer && (
          <div className="shrink-0 pt-3 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
