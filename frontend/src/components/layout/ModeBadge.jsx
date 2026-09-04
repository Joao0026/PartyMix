export function modeKind(mode) {
  if (mode === 'family') return 'family'
  if (!mode || mode === 'hub' || mode === 'victory') return null
  return 'adult'
}

export default function ModeBadge({ mode, kind, className = '' }) {
  const k = kind || modeKind(mode)
  if (k === 'family') {
    return (
      <span className={`inline-flex items-center rounded-full bg-sky-300 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-slate-950 ${className}`}>
        Família
      </span>
    )
  }
  if (k === 'adult') {
    return (
      <span className={`inline-flex items-center rounded-full bg-rose-600 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-white ${className}`}>
        18+
      </span>
    )
  }
  return null
}
