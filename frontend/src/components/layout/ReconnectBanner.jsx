import { WifiOff } from 'lucide-react'
import { reconnectBannerCopy } from '../../utils/reconnectUi'

export default function ReconnectBanner({ reconnecting, disconnected, expired, onRetry, onLeave }) {
  const copy = reconnectBannerCopy({ reconnecting, disconnected, expired })
  if (!copy) return null

  const danger = copy.tone === 'expired' || copy.tone === 'disconnected'

  return (
    <div
      role="status"
      aria-live="polite"
      className={`surface-sm px-3 py-2.5 flex items-center gap-2 text-sm ${
        danger ? 'border-red-400/30 bg-red-500/10' : 'border-amber-400/25 bg-amber-500/10'
      }`}
    >
      <WifiOff className={`w-4 h-4 shrink-0 ${danger ? 'text-red-300' : 'text-amber-300'}`} />
      <div className={`flex-1 font-semibold ${danger ? 'text-red-200' : 'text-amber-100'}`}>
        <p>{copy.title}</p>
        {copy.body ? <p className="text-xs font-medium text-red-100/80 mt-0.5">{copy.body}</p> : null}
      </div>
      {copy.tone === 'expired' && onLeave && (
        <button
          type="button"
          onClick={onLeave}
          aria-label="Voltar ao início porque a sala já não existe"
          className="shrink-0 text-xs font-black rounded-lg bg-white text-slate-950 px-2.5 py-2 min-h-[44px]"
        >
          {copy.action}
        </button>
      )}
      {copy.tone === 'disconnected' && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          aria-label="Tentar voltar a ligar à sala"
          className="shrink-0 text-xs font-black rounded-lg bg-white/10 px-2.5 py-2 min-h-[44px] text-white"
        >
          {copy.action}
        </button>
      )}
    </div>
  )
}
