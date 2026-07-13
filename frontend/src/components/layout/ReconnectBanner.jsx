import { WifiOff } from 'lucide-react'

export default function ReconnectBanner({ reconnecting, disconnected, onRetry }) {
  if (!reconnecting && !disconnected) return null

  return (
    <div
      className={`surface-sm px-3 py-2.5 flex items-center gap-2 text-sm ${
        disconnected ? 'border-red-400/30 bg-red-500/10' : 'border-amber-400/25 bg-amber-500/10'
      }`}
    >
      <WifiOff className={`w-4 h-4 shrink-0 ${disconnected ? 'text-red-300' : 'text-amber-300'}`} />
      <p className={`flex-1 font-semibold ${disconnected ? 'text-red-200' : 'text-amber-100'}`}>
        {disconnected ? 'Ligação perdida. A tentar voltar…' : 'A reconectar…'}
      </p>
      {disconnected && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 text-xs font-black rounded-lg bg-white/10 px-2.5 py-1.5 text-white"
        >
          Tentar
        </button>
      )}
    </div>
  )
}
