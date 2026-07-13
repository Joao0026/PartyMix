import { useState } from 'react'
import { Link2, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { copyJoinLink } from '../../utils/joinUrl'

export default function ShareRoomLink({ mode, code, codeSize = 'lg', showLabel = true }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    if (!code) return
    const ok = await copyJoinLink(mode, code)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  if (!code) return null

  const codeClass = codeSize === 'xl'
    ? 'text-5xl tracking-[0.2em]'
    : 'text-4xl tracking-[0.25em]'

  return (
    <div className="text-center">
      {showLabel && <p className="text-slate-400 text-sm mb-2">Código da sala</p>}
      <div className="flex items-center justify-center gap-2">
        <p className={`text-white font-black ${codeClass}`}>{code}</p>
        <button
          type="button"
          onClick={copy}
          title="Copiar link da sala"
          aria-label="Copiar link da sala para partilhar"
          className={`min-h-[44px] min-w-[44px] rounded-2xl transition-all flex items-center justify-center active:scale-95 ${
            copied
              ? 'bg-green-500/15 text-green-400/90'
              : 'bg-white/[0.04] text-slate-500 hover:text-slate-300 opacity-80 hover:opacity-100'
          }`}
        >
          {copied ? <Check className="w-5 h-5" /> : <Link2 className="w-5 h-5" />}
        </button>
      </div>
      <p className="text-slate-600 text-[11px] mt-1.5">Ícone = Copiar link</p>
      <AnimatePresence>
        {copied && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="text-green-400/90 text-xs font-medium mt-2"
          >
            Link da sala copiado com sucesso!
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
