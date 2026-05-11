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
export function BoardDie({ onRoll, disabled, color = '#7c3aed', maxDice=6 }) {
  const [rolling, setRolling] = useState(false)
  const [faceVal, setFaceVal] = useState(Math.min(6,maxDice))
  const [result,  setResult]  = useState(null)
  const [hl,      setHl]      = useState(false)
  const ivRef = useRef(null)

  const roll = async () => {
    if (rolling || disabled) return
    setRolling(true); setResult(null); setHl(false)
    playDiceSound()
    clearInterval(ivRef.current)
    let c = 0
    ivRef.current = setInterval(() => {
      setFaceVal(Math.floor(Math.random() * maxDice) + 1)
      if (++c > 18) clearInterval(ivRef.current)
    }, 70)
    await new Promise(r => setTimeout(r, 1400))
    const v = Math.floor(Math.random() * maxDice) + 1
    setFaceVal(v); setResult(v); setRolling(false)
    playPointSound()
    setHl(true); setTimeout(() => setHl(false), 600)
    onRoll && onRoll(v)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
      {/* 3D rotating die */}
      <motion.div
        animate={rolling?{rotateX:[0,360,720],rotateY:[0,180,360,540,720],scale:[1,1.08,0.96,1.08,1]}:hl?{scale:[1.2,1]}:{}}
        transition={rolling?{duration:0.85,ease:'easeInOut'}:{duration:0.3,type:'spring'}}
        style={{
          perspective:800,
          backfaceVisibility:'hidden',
          cursor: rolling||disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.4 : 1,
        }}
        onClick={!rolling && !disabled ? roll : undefined}>
        {/* White background die with colored dots */}
        <div style={{
          width:88, height:88,
          background:'white',
          borderRadius:12,
          display:'grid',
          gridTemplateColumns:'1fr 1fr 1fr',
          gridTemplateRows:'1fr 1fr 1fr',
          padding:12,
          boxSizing:'border-box',
          boxShadow:hl?`0 0 0 3px ${color}, 0 4px 16px ${color}66`:`0 4px 12px rgba(0,0,0,0.3)`,
          gap:0,
        }}>
          {Array.from({length:9}).map((_,i)=>{
            const val=faceVal
            const hasDot=DOT_GRIDS[val]?.some(([r,c])=>r===Math.floor(i/3)&&c===i%3)
            return(
              <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
                {hasDot&&<div style={{width:14,height:14,borderRadius:'50%',background:color,boxShadow:'0 1px 3px rgba(0,0,0,0.3)'}}/>
                }
              </div>
            )
          })}
        </div>
      </motion.div>
      <div style={{ textAlign:'center', minHeight:44 }}>
        {!result && !rolling && <p style={{ color:'#64748b', fontSize:14, margin:0, fontWeight:500 }}>Toca para lançar</p>}
        {rolling  && <p style={{ color:color, fontSize:14, fontWeight:700, margin:0 }}>A rolar...</p>}
        {result && !rolling && (
          <div>
            <p style={{ color:'white', fontWeight:900, fontSize:38, margin:0, lineHeight:1 }}>{result}</p>
            <p style={{ color:'#64748b', fontSize:13, margin:0 }}>{result===1?'casa':'casas'}</p>
          </div>
        )}
      </div>
    </div>
  )
}
