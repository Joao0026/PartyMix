import { ChevronLeft } from 'lucide-react'

export default function BackButton({ onClick, label = 'Voltar', showLabel = false, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`text-slate-400 hover:text-white p-2 -ml-2 rounded-xl hover:bg-white/[0.05] min-w-[44px] min-h-[44px] flex items-center justify-center gap-1 flex-shrink-0 ${className}`}
    >
      <ChevronLeft className="w-5 h-5" />
      {showLabel && <span className="text-sm font-medium">{label}</span>}
    </button>
  )
}
