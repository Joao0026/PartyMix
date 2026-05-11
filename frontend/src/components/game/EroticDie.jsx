import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { playDiceSound, playPointSound } from '../../utils/sounds'

// Dot layout per face value
const DOT_GRIDS = {
  1: [[1,1]],
  2: [[0,0],[2,2]],
  3: [[0,0],[1,1],[2,2]],
  4: [[0,0],[0,2],[2,0],[2,2]],
  5: [[0,0],[0,2],[1,1],[2,0],[2,2]],
  6: [[0,0],[0,2],[1,0],[1,2],[2,0],[2,2]],
}

function DieDots({ value = 1, size = 68, dotColor = 'white', bgColor = '#e11d48', highlight = false }) {
  const safe = Math.max(1, Math.min(6, value))
  const dots = DOT_GRIDS[safe] || DOT_GRIDS[1]
  const dotSize = size * 0.14
  const cells = []
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) cells.push({ r, c })

  return (
    <div style={{
      width: size, height: size,
      background: `linear-gradient(135deg, ${bgColor}ff, ${bgColor}cc)`,
      borderRadius: size * 0.16,
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gridTemplateRows: '1fr 1fr 1fr',
      padding: size * 0.1,
      boxSizing: 'border-box',
      boxShadow: highlight
        ? `0 0 0 3px white, 0 4px 16px ${bgColor}66`
        : `0 4px 16px ${bgColor}55`,
      flexShrink: 0,
      // NO transform here
    }}>
      {cells.map(({ r, c }) => {
        const has = dots.some(([dr, dc]) => dr === r && dc === c)
        return (
          <div key={`${r}${c}`} style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
            {has && (
              <div style={{
                width: dotSize, height: dotSize,
                borderRadius: '50%',
                background: dotColor,
                boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
              }}/>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── EROTIC DIE ────────────────────────────────────────────────
export function EroticDie({ options, label, color, rolling, value }) {
  const [display,  setDisplay]  = useState(options[0])
  const [faceVal,  setFaceVal]  = useState(1)
  const [highlight,setHighlight]= useState(false)
  const [isRolling,setIsRolling]= useState(false)
  const ivRef = useRef(null)

  useEffect(() => {
    clearInterval(ivRef.current)
    setIsRolling(rolling)
    if (!rolling) {
      if (value) {
        setDisplay(value)
        setHighlight(true)
        setTimeout(() => setHighlight(false), 500)
      }
      return
    }
    let c = 0
    ivRef.current = setInterval(() => {
      setDisplay(options[Math.floor(Math.random() * options.length)])
      setFaceVal(Math.floor(Math.random() * 6) + 1)
      if (++c > 24) clearInterval(ivRef.current)
    }, 55)
    return () => clearInterval(ivRef.current)
  }, [rolling, value, options])

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
      {/* Label */}
      <p style={{ margin:0, color:'#94a3b8', fontSize:10, textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:700, textAlign:'center' }}>
        {label}
      </p>

      {/* Die with 3D rotation + TEXT ONLY (no dots) */}
      <motion.div
        animate={isRolling?{rotateX:[0,360,720],rotateY:[0,180,360,540,720],scale:[1,1.08,0.96,1.08,1]}:highlight?{scale:[1.2,1]}:{}}
        transition={isRolling?{duration:0.85,ease:'easeInOut'}:{duration:0.3,type:'spring'}}
        style={{
          perspective:800,
          backfaceVisibility:'hidden',
          position:'relative',
          display:'flex',
          alignItems:'center',
          justifyContent:'center',
          width:78,
          height:78,
          background:`linear-gradient(135deg, ${color}ff, ${color}cc)`,
          borderRadius:14,
          boxShadow:highlight?`0 0 0 3px white, 0 4px 16px ${color}66`:`0 4px 16px ${color}55`,
          flexShrink:0,
          padding:8,
          boxSizing:'border-box',
        }}>
        {/* Text ONLY - no dots */}
        <span style={{
          fontSize:9,
          fontWeight:800,
          color:'white',
          textAlign:'center',
          lineHeight:1.2,
          maxWidth:64,
          textShadow:`0 1px 3px rgba(0,0,0,0.8), 0 0 6px rgba(0,0,0,0.6)`,
          wordBreak:'break-word',
        }}>
          {display}
        </span>
      </motion.div>
    </div>
  )
}

// ── NUMERIC DIE (board) ───────────────────────────────────────
export function NumericDie({ value, size = 72, dotColor = '#7c3aed' }) {
  return <DieDots value={value} size={size} dotColor={dotColor} bgColor="white"/>
}

// ── BOARD DIE ─────────────────────────────────────────────────
/** confirmAfterRoll: mostra o resultado e só chama onRoll depois de tocares em "Jogar" */
export function BoardDie({
  onRoll,
  disabled,
  color = '#7c3aed',
  maxDice = 6,
  whiteDice = false,
  confirmAfterRoll = true,
}) {
  const [rolling, setRolling] = useState(false)
  const [faceVal, setFaceVal] = useState(Math.min(6, maxDice))
  const [result, setResult] = useState(null)
  const [hl, setHl] = useState(false)
  const [awaitingConfirm, setAwaitingConfirm] = useState(false)
  const ivRef = useRef(null)

  // Dado “branco”: face clara + pintas escuras (branco sobre branco não se vê)
  const dotColor = whiteDice ? '#0f172a' : color
  const dieFaceBg = whiteDice
    ? 'linear-gradient(145deg, #ffffff 0%, #e2e8f0 55%, #cbd5e1 100%)'
    : 'white'

  const roll = async () => {
    if (rolling || disabled || awaitingConfirm) return
    setRolling(true)
    setResult(null)
    setHl(false)
    setAwaitingConfirm(false)
    playDiceSound()
    clearInterval(ivRef.current)
    let c = 0
    ivRef.current = setInterval(() => {
      setFaceVal(Math.floor(Math.random() * maxDice) + 1)
      if (++c > 18) clearInterval(ivRef.current)
    }, 70)
    await new Promise((r) => setTimeout(r, 1400))
    const v = Math.floor(Math.random() * maxDice) + 1
    setFaceVal(v)
    setResult(v)
    setRolling(false)
    playPointSound()
    setHl(true)
    setTimeout(() => setHl(false), 600)
    if (!confirmAfterRoll) {
      onRoll?.(v)
    } else {
      setAwaitingConfirm(true)
    }
  }

  const confirmMove = () => {
    if (result == null || !awaitingConfirm) return
    setAwaitingConfirm(false)
    onRoll?.(result)
    setResult(null)
  }

  const safeFace = Math.min(maxDice, Math.max(1, faceVal))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div
        style={{
          perspective: 900,
          transformStyle: 'preserve-3d',
        }}
      >
        <motion.div
          animate={
            rolling
              ? { rotateX: [12, 420, 840], rotateY: [-14, 200, 420, 620, 840], scale: [1, 1.08, 0.96, 1.05, 1] }
              : hl
                ? { rotateX: 12, rotateY: -14, scale: [1.18, 1] }
                : { rotateX: 12, rotateY: -14, scale: 1 }
          }
          transition={rolling ? { duration: 0.9, ease: 'easeInOut' } : { duration: 0.35, type: 'spring' }}
          style={{
            transformStyle: 'preserve-3d',
            cursor: rolling || disabled || awaitingConfirm ? 'default' : 'pointer',
            opacity: disabled ? 0.4 : 1,
          }}
          onClick={!rolling && !disabled && !awaitingConfirm ? roll : undefined}
        >
          <div
            style={{
              width: 92,
              height: 92,
              background: dieFaceBg,
              borderRadius: 14,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gridTemplateRows: '1fr 1fr 1fr',
              padding: 12,
              boxSizing: 'border-box',
              transform: 'translateZ(0)',
              border: whiteDice ? '1px solid rgba(15,23,42,0.12)' : '1px solid rgba(0,0,0,0.06)',
              boxShadow: hl
                ? whiteDice
                  ? '0 10px 22px rgba(0,0,0,0.25), 0 0 0 2px rgba(255,255,255,0.85), inset 0 1px 0 rgba(255,255,255,0.9)'
                  : `0 0 0 3px ${color}, 0 8px 20px ${color}55`
                : '0 12px 28px rgba(0,0,0,0.35), inset 0 -6px 12px rgba(15,23,42,0.08), inset 0 2px 0 rgba(255,255,255,0.65)',
              gap: 0,
            }}
          >
            {Array.from({ length: 9 }).map((_, i) => {
              const hasDot = DOT_GRIDS[safeFace]?.some(([r, c]) => r === Math.floor(i / 3) && c === i % 3)
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {hasDot ? (
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        background: dotColor,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.35)',
                      }}
                    />
                  ) : null}
                </div>
              )
            })}
          </div>
        </motion.div>
      </div>

      <div style={{ textAlign: 'center', minHeight: 52, width: '100%', maxWidth: 280 }}>
        {!result && !rolling && !awaitingConfirm && (
          <p style={{ color: '#94a3b8', fontSize: 14, margin: 0, fontWeight: 500 }}>Toca no dado para lançar</p>
        )}
        {rolling && (
          <p style={{ color: whiteDice ? '#e2e8f0' : color, fontSize: 14, fontWeight: 700, margin: 0 }}>A rolar…</p>
        )}
        {result != null && !rolling && (
          <div>
            <p style={{ color: '#f8fafc', fontWeight: 900, fontSize: 40, margin: 0, lineHeight: 1 }}>{result}</p>
            <p style={{ color: '#94a3b8', fontSize: 13, margin: '4px 0 0' }}>
              {result === 1 ? '1 casa' : `${result} casas`}
            </p>
            {confirmAfterRoll && awaitingConfirm && (
              <button
                type="button"
                onClick={confirmMove}
                className="mt-3 w-full rounded-2xl py-3 font-bold text-white shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${color}, ${color}cc)`,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Jogar →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
