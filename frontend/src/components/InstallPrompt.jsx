import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

const DISMISSED_KEY = 'partymix_install_prompt_dismissed_until'
const DISMISS_DAYS = 7

export default function InstallPrompt() {
  const [promptEvent, setPromptEvent] = useState(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const dismissedUntil = Number(localStorage.getItem(DISMISSED_KEY) || 0)
    if (Date.now() < dismissedUntil) return

    const onBeforeInstallPrompt = (event) => {
      event.preventDefault()
      setPromptEvent(event)
      setVisible(true)
    }

    const onAppInstalled = () => {
      setVisible(false)
      setPromptEvent(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  const install = async () => {
    if (!promptEvent) return
    promptEvent.prompt()
    await promptEvent.userChoice.catch(() => null)
    setVisible(false)
    setPromptEvent(null)
  }

  const dismiss = () => {
    const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000
    localStorage.setItem(DISMISSED_KEY, String(until))
    setVisible(false)
  }

  if (!visible || !promptEvent) return null

  return (
    <div className="fixed bottom-4 left-3 right-3 z-[90] mx-auto max-w-lg rounded-3xl border border-violet-400/30 bg-[#111322]/95 p-4 shadow-2xl backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white">
          <Download className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-black text-white">Instalar PartyMix</p>
          <p className="mt-0.5 text-sm text-slate-400">Abre mais rápido e fica no ecrã inicial do telemóvel.</p>
          <button
            onClick={install}
            className="mt-3 rounded-2xl bg-violet-600 px-4 py-2 text-sm font-black text-white"
          >
            Instalar app
          </button>
        </div>
        <button onClick={dismiss} className="rounded-xl p-1 text-slate-500 hover:bg-white/5 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
