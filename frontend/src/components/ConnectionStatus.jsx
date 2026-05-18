import { useEffect, useState } from 'react'
import { Wifi, WifiOff } from 'lucide-react'
import { getSocketStatus, subscribeSocketStatus } from '../utils/socketStore'

export default function ConnectionStatus() {
  const [online, setOnline] = useState(() => navigator.onLine)
  const [socketStatus, setSocketStatus] = useState(() => getSocketStatus())

  useEffect(() => {
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    const unsubscribe = subscribeSocketStatus(setSocketStatus)

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      unsubscribe()
    }
  }, [])

  if (!online) {
    return (
      <StatusBanner tone="red" icon={<WifiOff className="w-4 h-4" />}>
        Sem internet. O jogo pode deixar de sincronizar.
      </StatusBanner>
    )
  }

  if (socketStatus === 'reconnecting') {
    return (
      <StatusBanner tone="amber" icon={<Wifi className="w-4 h-4" />}>
        A ligar ao servidor...
      </StatusBanner>
    )
  }

  if (socketStatus === 'disconnected') {
    return (
      <StatusBanner tone="red" icon={<WifiOff className="w-4 h-4" />}>
        Ligação ao jogo perdida. A tentar recuperar.
      </StatusBanner>
    )
  }

  return null
}

function StatusBanner({ children, icon, tone }) {
  const color = tone === 'red'
    ? 'border-red-500/40 bg-red-950/90 text-red-100'
    : 'border-amber-500/40 bg-amber-950/90 text-amber-100'

  return (
    <div className={`fixed left-3 right-3 top-3 z-[100] mx-auto max-w-lg rounded-2xl border px-4 py-3 shadow-xl backdrop-blur ${color}`}>
      <div className="flex items-center justify-center gap-2 text-center text-sm font-bold">
        {icon}
        <span>{children}</span>
      </div>
    </div>
  )
}
