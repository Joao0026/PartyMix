import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { playDiceSound, playPointSound } from '../../utils/sounds'

const DOTS = {1:[[50,50]],2:[[25,25],[75,75]],3:[[25,25],[50,50],[75,75]],4:[[25,25],[75,25],[25,75],[75,75]],5:[[25,25],[75,25],[50,50],[25,75],[75,75]],6:[[25,20],[75,20],[25,50],[75,50],[25,80],[75,80]]}

function DieFace({value,size=96}){
  const dots=DOTS[value]||[]
  return(
    <div style={{width:size,height:size,background:'white',borderRadius:16,position:'relative',boxShadow:'0 8px 32px rgba(0,0,0,0.4)',flexShrink:0}}>
      {dots.map(([x,y],i)=>(
        <div key={i} style={{position:'absolute',left:`${x}%`,top:`${y}%`,transform:'translate(-50%,-50%)',width:size*0.15,height:size*0.15,borderRadius:'50%',background:'#1e1b4b'}}/>
      ))}
    </div>
  )
}

export default function DiceRoller({onRoll,disabled,label='Toca para lançar'}){
  const [state,setState]=useState('idle')
  const [result,setResult]=useState(null)
  const [display,setDisplay]=useState(1)

  useEffect(()=>{
    if(state!=='rolling')return
    let count=0
    const iv=setInterval(()=>{ setDisplay(Math.floor(Math.random()*6)+1); if(++count>12)clearInterval(iv) },80)
    return()=>clearInterval(iv)
  },[state])

  const roll=async()=>{
    if(state!=='idle'||disabled)return
    setState('rolling')
    playDiceSound()
    await new Promise(r=>setTimeout(r,900))
    const val=Math.floor(Math.random()*6)+1
    setResult(val); setDisplay(val); setState('result')
    playPointSound()
    onRoll&&onRoll(val)
  }

  return(
    <div className="flex flex-col items-center gap-4">
      <motion.div onClick={state==='idle'&&!disabled?roll:undefined}
        animate={state==='rolling'?{rotateX:[0,360,720],rotateY:[0,180,360,540,720],scale:[1,1.1,0.95,1.1,1]}:state==='result'?{scale:[1.2,1]}:{}}
        transition={state==='rolling'?{duration:0.85,ease:'easeInOut'}:{duration:0.3,type:'spring'}}
        style={{cursor:state==='idle'&&!disabled?'pointer':'default',perspective:800,backfaceVisibility:'hidden'}}
        className={disabled?'opacity-40':''}
        whileHover={state==='idle'&&!disabled?{scale:1.08,rotateZ:5}:{}}
        whileTap={state==='idle'&&!disabled?{scale:0.92}:{}}>
        <DieFace value={display} size={96}/>
      </motion.div>
      <AnimatePresence mode="wait">
        {state==='idle'&&<motion.p key="idle" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="text-slate-400 text-sm">{label}</motion.p>}
        {state==='rolling'&&<motion.p key="rolling" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="text-amber-400 text-sm font-semibold animate-pulse">A rolar...</motion.p>}
        {state==='result'&&(
          <motion.div key="result" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="text-center">
            <motion.p initial={{scale:0}} animate={{scale:1}} transition={{type:'spring',damping:8}} className="text-white font-black text-3xl">{result}</motion.p>
            <p className="text-slate-400 text-sm">{result===1?'casa':'casas'}!</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
