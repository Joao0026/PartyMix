import { motion } from 'framer-motion'

const VARIANTS = {
  default: 'border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.06]',
  violet: 'border-violet-500/25 bg-violet-500/10 hover:bg-violet-500/15',
  pink: 'border-pink-500/25 bg-pink-500/10 hover:bg-pink-500/15',
  emerald: 'border-emerald-500/25 bg-emerald-500/10 hover:bg-emerald-500/15',
  amber: 'border-amber-500/25 bg-amber-500/10 hover:bg-amber-500/15',
}

const ICON_GRADIENTS = {
  default: 'from-slate-500 to-slate-700',
  violet: 'from-violet-500 to-purple-700',
  pink: 'from-pink-500 to-rose-600',
  emerald: 'from-emerald-500 to-teal-700',
  amber: 'from-amber-400 to-orange-600',
}

export default function ModeCard({
  icon: Icon,
  title,
  description,
  onClick,
  variant = 'default',
  delay = 0,
  type = 'button',
}) {
  return (
    <motion.button
      type={type}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full rounded-2xl p-5 flex items-center gap-4 text-left border transition-all ${VARIANTS[variant] || VARIANTS.default}`}
    >
      {Icon && (
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${ICON_GRADIENTS[variant] || ICON_GRADIENTS.default} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-white font-bold text-lg leading-tight">{title}</p>
        {description && <p className="text-slate-400 text-sm mt-0.5">{description}</p>}
      </div>
    </motion.button>
  )
}
