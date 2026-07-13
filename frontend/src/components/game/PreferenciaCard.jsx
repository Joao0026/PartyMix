import { motion } from 'framer-motion'

export default function PreferenciaCard({ choices = [], ruleText = '' }) {
  const [optionA, optionB] = choices
  const rule = ruleText?.trim() || 'Minoria bebe 1'

  return (
    <div className="mx-auto w-full max-w-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-[1.75rem] border border-white/20"
      >
        <div className="flex min-h-[9.5rem] items-center justify-center bg-blue-600 px-6 py-10 text-center">
          <p className="text-lg font-black leading-snug text-white sm:text-xl">{optionA}</p>
        </div>

        <div className="flex min-h-[9.5rem] items-center justify-center bg-red-600 px-6 py-10 text-center">
          <p className="text-lg font-black leading-snug text-white sm:text-xl">{optionB}</p>
        </div>

        <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <span className="rounded-full border-2 border-white/40 bg-white px-6 py-2 text-sm font-black tracking-[0.3em] text-slate-800">
            OU
          </span>
        </div>
      </motion.div>

      <p className="mt-3 text-center text-sm font-medium text-white/85">{rule}</p>
    </div>
  )
}
