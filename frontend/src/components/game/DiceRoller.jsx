import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const DICE_DOTS = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 20], [75, 20], [25, 50], [75, 50], [25, 80], [75, 80]],
}

function DiceFace({ value, size = 80 }) {
  const dots = DICE_DOTS[value] || []
  return (
    <div style={{ width: size, height: size }}
      className="bg-white rounded-2xl shadow-2xl relative flex-shrink-0"
      style={{ width: size, height: size, background: 'white', borderRadius: 16, position: 'relative', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
      {dots.map(([x, y], i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${x}%`, top: `${y}%`,
          transform: 'translate(-50%, -50%)',
          width: size * 0.15, height: size * 0.15,
          borderRadius: '50%', background: '#1e1b4b'
        }} />
      ))}
    </div>
  )
}

export default function DiceRoller({ onRoll, disabled, label = 'Toca para lançar' }) {
  const [state, setState] = useState('idle') // idle | rolling | result
  const [result, setResult] = useState(null)
  const [displayVal, setDisplayVal] = useState(1)
  const [trembleValues, setTrembleValues] = useState([])

  useEffect(() => {
    if (state !== 'rolling') return
    let count = 0
    const interval = setInterval(() => {
      const newVal = Math.floor(Math.random() * 6) + 1
      setDisplayVal(newVal)
      setTrembleValues(prev => [...prev.slice(-4), { val: newVal, id: Math.random() }])
      count++
      if (count > 15) clearInterval(interval)
    }, 60)
    return () => clearInterval(interval)
  }, [state])

  const roll = async () => {
    if (state !== 'idle' || disabled) return
    setState('rolling')
    setTrembleValues([])
    await new Promise(r => setTimeout(r, 950))
    const val = Math.floor(Math.random() * 6) + 1
    setResult(val)
    setDisplayVal(val)
    setState('result')
    onRoll && onRoll(val)
  }

  const reset = () => { setState('idle'); setResult(null); setDisplayVal(1); setTrembleValues([]) }

  return (
    <div className="flex flex-col items-center gap-4">
      <motion.div
        onClick={state === 'idle' && !disabled ? roll : undefined}
        animate={state === 'rolling' ? {
          rotateX: [0, 360, 720, 900], 
          rotateY: [0, 180, 360, 540, 720],
          x: [0, -4, 4, -3, 3, 0],
          y: [0, -3, 3, -2, 2, 0],
          scale: [1, 1.1, 0.98, 1.08, 1],
        } : state === 'result' ? {
          rotateX: 0, rotateY: 0, scale: [1.2, 1], x: 0, y: 0,
        } : {}}
        transition={state === 'rolling' ? { duration: 0.9, ease: 'easeInOut' } : { duration: 0.35, type: 'spring', damping: 10 }}
        style={{ cursor: state === 'idle' && !disabled ? 'pointer' : 'default', perspective: 1000 }}
        className={`${disabled ? 'opacity-40' : ''}`}
        whileHover={state === 'idle' && !disabled ? { scale: 1.08, rotateZ: 5 } : {}}
        whileTap={state === 'idle' && !disabled ? { scale: 0.92 } : {}}>
        <DiceFace value={displayVal} size={96} />
      </motion.div>

      <AnimatePresence mode="wait">
        {state === 'idle' && (
          <motion.p key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-slate-400 text-sm">{label}</motion.p>
        )}
        {state === 'rolling' && (
          <motion.div key="rolling" className="text-center">
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-amber-400 text-sm font-semibold animate-pulse">A rolar...</motion.p>
            {trembleValues.length > 0 && (
              <motion.p className="text-slate-500 text-xs mt-1">
                {trembleValues.map(tv => tv.val).join(' → ')}
              </motion.p>
            )}
          </motion.div>
        )}
        {state === 'result' && (
          <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="text-center">
            <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 8 }}
              className="text-white font-black text-3xl">{result}</motion.p>
            <p className="text-slate-400 text-sm">{result === 1 ? 'casa' : 'casas'}!</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
