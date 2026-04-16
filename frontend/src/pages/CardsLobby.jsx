import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../utils/api'
import { Copy, Users } from 'lucide-react'

export default function CardsLobby() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [lobby, setLobby] = useState(null)
  const [myName, setMyName] = useState('')
  const [joinCode, setJoinCode] = useState(params.get('code') || '')
  const [mode, setMode] = useState('choose')
  const [isHost, setIsHost] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!lobby) return
    const interval = setInterval(async () => {
      const updated = await api.getLobby(lobby.code)
      if (updated && !updated.error) setLobby(updated)
    }, 2000)
    return () => clearInterval(interval)
  }, [lobby])

  const createLobby = async () => {
    if (!myName.trim()) return
    const l = await api.createLobby(myName.trim())
    setLobby(l)
    setIsHost(true)
    setMode('waiting')
  }

  const joinLobby = async () => {
    if (!myName.trim() || !joinCode.trim()) return
    const l = await api.joinLobby(joinCode.trim().toUpperCase(), myName.trim())
    if (l.error) { alert('Lobby não encontrado!'); return }
    setLobby(l)
    setMode('waiting')
  }

  const startGame = async () => {
    await api.startLobby(lobby.code, { players: lobby.players })
    navigate('/CardsGame', { state: { lobby } })
  }

  const copyCode = () => {
    navigator.clipboard.writeText(lobby.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-amber-900/20 to-slate-900 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white text-sm">← Sair</button>
          <h1 className="text-white font-bold text-xl">🃏 Modo Cartas</h1>
        </div>
        {mode === 'choose' && (
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <label className="text-slate-400 text-sm block mb-2">O teu nome</label>
              <input value={myName} onChange={e=>setMyName(e.target.value)} placeholder="Escreve o teu nome..."
                className="w-full bg-white/5 text-white rounded-xl px-4 py-3 outline-none border border-white/10 focus:border-amber-500/50" />
            </div>
            <button onClick={() => { if(myName.trim()) { setMode('join') } }}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white hover:bg-white/10 transition-all font-medium">
              Entrar com código
            </button>
            <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.98}} onClick={createLobby}
              className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold rounded-2xl py-4">
              Criar Sala (Host)
            </motion.button>
          </motion.div>
        )}
        {mode === 'join' && (
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <label className="text-slate-400 text-sm block mb-2">Código da sala</label>
              <input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} placeholder="ABCD" maxLength={4}
                className="w-full bg-white/5 text-white text-center text-3xl font-black rounded-xl px-4 py-4 outline-none border border-white/10 focus:border-amber-500/50 tracking-widest" />
            </div>
            <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.98}} onClick={joinLobby}
              className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold rounded-2xl py-4">
              Entrar na Sala
            </motion.button>
          </motion.div>
        )}
        {mode === 'waiting' && lobby && (
          <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
              <p className="text-slate-400 text-sm mb-2">Código da sala</p>
              <div className="text-5xl font-black text-white tracking-widest mb-3">{lobby.code}</div>
              <button onClick={copyCode} className="flex items-center gap-2 mx-auto text-amber-400 text-sm hover:text-amber-300">
                <Copy className="w-4 h-4" /> {copied ? 'Copiado!' : 'Copiar código'}
              </button>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="text-slate-400 w-4 h-4" />
                <span className="text-slate-400 text-sm">{lobby.players?.length || 0} jogadores</span>
              </div>
              <div className="space-y-2">
                {lobby.players?.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-white text-sm">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center font-bold text-xs">{p.name[0]}</div>
                    {p.name} {i === 0 && <span className="text-amber-400 text-xs">(Host)</span>}
                  </div>
                ))}
              </div>
            </div>
            {isHost ? (
              <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.98}} onClick={startGame}
                disabled={!lobby.players || lobby.players.length < 3}
                className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold rounded-2xl py-4 disabled:opacity-50">
                Iniciar Jogo ({lobby.players?.length || 0}/3 mín.)
              </motion.button>
            ) : (
              <div className="text-center text-slate-400 text-sm py-4 animate-pulse">A aguardar que o host inicie...</div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}
