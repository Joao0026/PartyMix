import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, XCircle, Clock } from 'lucide-react'
import { CATEGORY_CONFIG, weightedSips } from '../../utils/game'

export default function ChallengeCard({challenge,player,mode,penaltyType,onResult,onClose}){
  const [timeLeft,setTimeLeft]=useState(challenge?.time_limit||0)
  const [sips]=useState(weightedSips())
  const [hasPenalty]=useState(Math.random()<0.15)
  const [accepted,setAccepted]=useState(false)
  const cat=CATEGORY_CONFIG[challenge?.category]||{emoji:'🎲',label:'Desafio',color:'from-violet-500 to-purple-600'}
  const maxTime=challenge?.time_limit||0
  const timerPct=maxTime>0?(timeLeft/maxTime)*100:100

  useEffect(()=>{
    if(!challenge?.time_limit||timeLeft<=0)return
    const t=setInterval(()=>setTimeLeft(s=>{if(s<=1){clearInterval(t);return 0}return s-1}),1000)
    return()=>clearInterval(t)
  },[challenge?.time_limit])

  if(!challenge)return null
  return(
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center p-4">
      <motion.div initial={{opacity:0,y:100}} animate={{opacity:1,y:0}} exit={{opacity:0,y:100}} transition={{type:'spring',damping:18}}
        className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className={`bg-gradient-to-r ${cat.color} p-4 relative overflow-hidden`}>
          <div className="absolute inset-0 bg-black/20"/>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.span animate={{scale:[1,1.2,1],rotate:[0,10,-10,0]}} transition={{duration:2,repeat:Infinity}} className="text-3xl">{cat.emoji}</motion.span>
              <div><div className="text-white/70 text-xs">{player?.name}</div><div className="text-white font-bold text-lg">{cat.label}</div></div>
            </div>
            <div className="flex items-center gap-3">
              {maxTime>0&&(
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-white/70"/>
                  <motion.span animate={timeLeft<=5?{scale:[1,1.3,1]}:{}} transition={{repeat:Infinity,duration:0.5}}
                    className={`text-white font-mono font-black text-xl ${timeLeft<=5?'text-red-200':''}`}>{timeLeft}</motion.span>
                </div>
              )}
              <button onClick={onClose} className="text-white/50 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all"><X className="w-5 h-5"/></button>
            </div>
          </div>
          {maxTime>0&&(
            <div className="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
              <motion.div className={`h-full rounded-full ${timeLeft<=5?'bg-red-300':'bg-white'}`} animate={{width:`${timerPct}%`}} transition={{duration:1,ease:'linear'}}/>
            </div>
          )}
        </div>
        <div className="p-5 space-y-4">
          <motion.p initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.1}} className="text-white text-xl font-semibold leading-relaxed text-center py-2">{challenge.text}</motion.p>
          <div className="flex justify-center">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${challenge.difficulty==='facil'?'bg-green-500/20 text-green-400':challenge.difficulty==='dificil'?'bg-red-500/20 text-red-400':'bg-amber-500/20 text-amber-400'}`}>
              {challenge.difficulty==='facil'?'🟢 Fácil':challenge.difficulty==='dificil'?'🔴 Difícil':'🟡 Médio'}
            </span>
          </div>
          {mode==='friends'&&!challenge.is_ongoing&&(
            <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.2}} className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 text-center">
              <p className="text-slate-400 text-xs mb-1">Penalização se falhar</p>
              <p className="text-amber-400 font-bold text-base">🍺 {typeof sips==='number'?`${sips} golo${sips>1?'s':''}`:sips}</p>
              {hasPenalty&&<p className="text-green-400 text-xs mt-1">⚽ + Marca um penálti!</p>}
            </motion.div>
          )}
          {challenge.is_ongoing&&!accepted?(
            <div className="flex gap-3 pt-1">
              <motion.button whileHover={{scale:1.03}} whileTap={{scale:0.95}} onClick={()=>{setAccepted(true);onResult('accepted',challenge)}}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-2xl py-4 text-lg">Aceito! 🤝</motion.button>
              <motion.button whileHover={{scale:1.03}} whileTap={{scale:0.95}} onClick={()=>onResult('refused',challenge)}
                className="flex-1 bg-white/10 border border-white/10 text-white font-bold rounded-2xl py-4">Recuso</motion.button>
            </div>
          ):challenge.is_ongoing&&accepted?(
            <div className="text-center space-y-3">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3">
                <p className="text-emerald-400 font-bold mb-1">🔁 Desafio Contínuo Ativo!</p>
                <p className="text-slate-300 text-sm">{challenge.ongoing_instruction}</p>
              </div>
              <button onClick={()=>onResult('done',challenge)} className="w-full bg-white/10 text-white rounded-2xl py-3 font-medium">Continuar →</button>
            </div>
          ):(
            <div className="flex gap-3 pt-1">
              <motion.button whileHover={{scale:1.03}} whileTap={{scale:0.95}} onClick={()=>onResult('success',challenge)}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-2xl py-4 text-lg flex items-center justify-center gap-2">
                <Check className="w-5 h-5"/>Consegui!
              </motion.button>
              <motion.button whileHover={{scale:1.03}} whileTap={{scale:0.95}} onClick={()=>onResult('fail',challenge)}
                className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold rounded-2xl py-4 text-lg flex items-center justify-center gap-2">
                <XCircle className="w-5 h-5"/>Falhei
              </motion.button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
