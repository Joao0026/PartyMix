import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Wifi } from 'lucide-react'
import { io } from 'socket.io-client'
import { setGlobalSocket } from '../utils/socketStore'

const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001`

export default function CardsLobby() {
  const navigate = useNavigate()
  const [name,    setName]    = useState('')
  const [code,    setCode]    = useState('')
  const [error,   setError]   = useState(null)
  const [joining, setJoining] = useState(false)
  const [room,    setRoom]    = useState(null)
  const [socket,  setSocket]  = useState(null)
  const roomRef = useRef(null)
  const handRef = useRef(null)
  const hasNavigatedRef = useRef(false)

  const join = () => {
    if (!name.trim() || !code.trim()) return
    setJoining(true); setError(null)

    const s = io(API_URL, { transports:['websocket','polling'] })
    setSocket(s)
    setGlobalSocket(s)

    const enterGame = (state) => {
      if (hasNavigatedRef.current) return
      hasNavigatedRef.current = true
      navigate('/CardsGame', { state: { online:true, socket:s, room:roomRef.current, playerName:name.trim(), gameState:state, hand:handRef.current } })
    }

    s.emit('join_room', { code:code.trim().toUpperCase(), playerName:name.trim() })
    s.on('room_joined', ({ room:r }) => {
      setRoom(r)
      roomRef.current = r
      setJoining(false)
      if (r.status === 'playing') {
        enterGame({ status:r.status, round:r.round, czarIdx:r.czarIdx, czarName:r.players[r.czarIdx]?.name, czarId:r.czarId, blackCard:r.blackCard, players:r.players })
      }
    })
    s.on('room_updated', r => {
      setRoom(r)
      roomRef.current = r
      if (r.status === 'playing') {
        enterGame({ status:r.status, round:r.round, czarIdx:r.czarIdx, czarName:r.players[r.czarIdx]?.name, czarId:r.czarId, blackCard:r.blackCard, players:r.players })
      }
    })
    s.on('your_hand', hand => { handRef.current = hand })
    s.on('error', msg => { setError(msg); setJoining(false); s.disconnect() })
    s.on('connect_error', () => { setError('Não foi possível conectar ao servidor'); setJoining(false); s.disconnect() })
    s.on('connect_failed', () => { setError('Não foi possível conectar ao servidor'); setJoining(false); s.disconnect() })

    // When host starts — navigate to game as participant
    s.on('game_started', state => {
      enterGame(state)
    })
  }

  return (
    <div className="min-h-screen bg-[#080b14] flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={()=>navigate('/')} className="text-slate-400 hover:text-white p-1"><ChevronLeft className="w-5 h-5"/></button>
          <div>
            <h1 className="text-white font-black text-xl flex items-center gap-2"><Wifi className="text-green-400 w-5 h-5"/>Entrar na Sala</h1>
            <p className="text-slate-500 text-sm">Entra numa sala criada por outra pessoa</p>
          </div>
        </div>

        {!room ? (
          <div className="space-y-4">
            <div>
              <label className="text-slate-400 text-xs uppercase tracking-wider mb-2 block">O teu nome</label>
              <input value={name} onChange={e=>setName(e.target.value)}
                placeholder="Como te chamas?" maxLength={20}
                className="w-full bg-slate-800 border border-slate-600 text-white rounded-2xl px-4 py-4 outline-none focus:border-violet-500 text-lg placeholder-slate-500"/>
            </div>
            <div>
              <label className="text-slate-400 text-xs uppercase tracking-wider mb-2 block">Código da sala</label>
              <input value={code} onChange={e=>setCode(e.target.value.toUpperCase())}
                placeholder="XXXX" maxLength={6}
                className="w-full bg-slate-800 border border-slate-600 text-white rounded-2xl px-4 py-4 outline-none focus:border-violet-500 text-2xl text-center tracking-[0.3em] font-black placeholder-slate-600"/>
            </div>
            {error && <p className="text-red-400 text-sm text-center bg-red-900/20 border border-red-500/30 rounded-xl p-3">{error}</p>}
            <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.97}}
              onClick={join} disabled={joining||!name.trim()||!code.trim()}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-700 text-white font-black rounded-2xl py-5 text-xl disabled:opacity-40">
              {joining ? '⏳ A entrar...' : '🔑 Entrar na Sala'}
            </motion.button>
            <div className="pt-4 text-center">
              <p className="text-slate-500 text-sm mb-2">Ainda não tens sala?</p>
              <button onClick={() => navigate('/CardsGame')}
                className="w-full bg-white/[0.04] border border-white/[0.08] text-white rounded-2xl py-4 text-sm hover:bg-white/[0.08] transition">
                ✨ Criar Sala de Cartas
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white/[0.04] border border-white/[0.07] rounded-3xl p-6 text-center">
              <p className="text-slate-400 text-sm mb-2">Sala</p>
              <p className="text-white font-black text-4xl tracking-[0.2em]">{room.code}</p>
            </div>
            <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 space-y-2">
              <p className="text-slate-400 text-sm font-semibold">{room.players?.length} jogador{room.players?.length!==1?'es':''}</p>
              {(room.players||[]).map((p,i)=>(
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm ${i===0?'bg-gradient-to-br from-violet-500 to-purple-600':'bg-gradient-to-br from-slate-600 to-slate-700'}`}>{p.name[0]}</div>
                  <span className="text-white font-medium">{p.name}{p.name===name?' (Tu)':''}</span>
                  {i===0&&<span className="ml-auto text-xs text-violet-400 font-bold">HOST</span>}
                </div>
              ))}
            </div>
            <div className="text-center py-4 space-y-2">
              <motion.div animate={{scale:[1,1.05,1]}} transition={{repeat:Infinity,duration:1.5}}>
                <p className="text-slate-400 text-lg">⏳ À espera que o host inicie o jogo...</p>
              </motion.div>
              <p className="text-slate-600 text-sm">Quando o host carregar em "Iniciar", o jogo começa automaticamente</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
