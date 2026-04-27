import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Flame, X, Calendar } from 'lucide-react'

// 31 posições — uma por dia do mês
const POSITIONS_31 = [
  { name: 'Missionário Clássico', description: 'Face a face, máxima intimidade. Ideal para conexão profunda.', difficulty: 1, tip: '💡 Coloca uma almofada debaixo das ancas para mudar o ângulo.' },
  { name: 'Colher', description: 'Deitados de lado, um atrás do outro. Íntimo e relaxante.', difficulty: 1, tip: '💡 O parceiro de trás tem as mãos completamente livres.' },
  { name: 'Cowgirl', description: 'Um parceiro por cima, controla o ritmo e profundidade.', difficulty: 1, tip: '💡 Inclinar para a frente ou trás muda completamente a sensação.' },
  { name: 'Doggy Style', description: 'Um parceiro por detrás com controlo máximo do ritmo.', difficulty: 2, tip: '💡 Baixar o tronco cria um ângulo diferente e intenso.' },
  { name: 'Reversa Cowgirl', description: 'Cowgirl de costas voltadas. Ângulo completamente diferente.', difficulty: 2, tip: '💡 Segurar nos tornozelos do parceiro dá mais estabilidade.' },
  { name: 'Lotus', description: 'Um de pernas cruzadas, o outro ao colo de frente. Ultra-íntimo.', difficulty: 2, tip: '💡 Perfeito para movimentos lentos e conexão emocional máxima.' },
  { name: 'Em Pé', description: 'Ambos de pé, um por detrás. Espontâneo e excitante.', difficulty: 2, tip: '💡 Funciona melhor com superfície de apoio ao nível certo.' },
  { name: 'Cadeira', description: 'Um senta-se, o outro ao colo de frente ou de costas.', difficulty: 2, tip: '💡 A cadeira permite movimentos rítmicos controlados por ambos.' },
  { name: 'Arco', description: 'De costas com ancas elevadas por almofada. Profundidade máxima.', difficulty: 2, tip: '💡 Quanto mais elevadas as ancas, mais intenso o ângulo.' },
  { name: 'Fusão', description: 'De lado totalmente enlaçados, movimentos mínimos mas profundos.', difficulty: 1, tip: '💡 Perfeito para manhãs lentas e proximidade máxima.' },
  { name: 'Serpente', description: 'Ambos de barriga para baixo, um em cima. Estimulação única.', difficulty: 3, tip: '💡 O parceiro de cima apoia-se nos cotovelos para controlar pressão.' },
  { name: 'Tesoura', description: 'De lado com pernas entrelaçadas. Ritmo lento e sensual.', difficulty: 3, tip: '💡 Ideal para maratonas — pouca energia, muito prazer.' },
  { name: 'Bambolê', description: 'Movimentos circulares em sincronia. Requer comunicação.', difficulty: 3, tip: '💡 Começa devagar e aumenta o ritmo gradualmente.' },
  { name: 'Carrossel', description: 'O parceiro de cima roda 360 graus. Requer equilíbrio!', difficulty: 3, tip: '💡 Faz pausas entre cada 90 graus para não perder o equilíbrio.' },
  { name: 'Polvo', description: 'Todos os membros entrelaçados criativamente. Criativo!', difficulty: 3, tip: '💡 Sem pressão — experimentem e riam muito.' },
  { name: 'Bote', description: 'Um sentado, o outro deitado de costas com pernas para cima.', difficulty: 2, tip: '💡 Permite profundidade controlada pelo parceiro sentado.' },
  { name: 'Cavaleiro', description: 'Um de joelhos, o outro deitado. O de cima controla tudo.', difficulty: 2, tip: '💡 Excelente para quem quer controlo total do ritmo.' },
  { name: 'Ponte', description: 'Um faz a ponte enquanto o outro se aproxima. Requer flexibilidade.', difficulty: 3, tip: '💡 Usa um apoio para facilitar a posição da ponte.' },
  { name: 'Ângulo de 90°', description: 'Um deitado, o outro perpendicular. Ângulo completamente novo.', difficulty: 2, tip: '💡 Permite ao parceiro deitado relaxar completamente.' },
  { name: 'Tripé', description: 'Em pé, um levanta a perna apoiada no ombro do outro.', difficulty: 3, tip: '💡 Começa com a perna ao nível da anca e vai subindo.' },
  { name: 'Deitado de Frente', description: 'Frente a frente, deitados, completamente enlaçados.', difficulty: 1, tip: '💡 Permite beijos e contacto visual constante.' },
  { name: 'Escorpião', description: 'De joelhos com torção única. Ângulos inesperados.', difficulty: 3, tip: '💡 Começa devagar para encontrar o ângulo certo.' },
  { name: 'Mergulho', description: 'Um mergulha sobre o outro que está inclinado. Intenso.', difficulty: 3, tip: '💡 Comunicação constante é essencial nesta posição.' },
  { name: 'Abraço de Urso', description: 'Abraço total pela frente com movimento mínimo. Muito íntimo.', difficulty: 1, tip: '💡 O contacto corporal é total — maximum warmth.' },
  { name: 'Espiral', description: 'Torção suave a partir do missionário. Novo ângulo delicado.', difficulty: 2, tip: '💡 Transição suave a partir do missionário clássico.' },
  { name: 'Swivel', description: 'Rotação lenta a partir do cowgirl. Requer sincronia.', difficulty: 3, tip: '💡 Comunicação e ritmo lento são essenciais.' },
  { name: 'Deitado de Costas', description: 'Um de costas, o outro em cima de frente. Reconfortante.', difficulty: 1, tip: '💡 Muito relaxante para ambos os parceiros.' },
  { name: 'Elevador', description: 'Em pé, o parceiro mais alto levanta levemente o outro.', difficulty: 3, tip: '💡 Use a parede como apoio para segurança.' },
  { name: 'Valsa', description: 'Movimento circular suave em pé, próximos.', difficulty: 2, tip: '💡 Põe música lenta e deixa o ritmo guiar.' },
  { name: 'Âncora', description: 'Um estável como âncora, o outro em movimento total.', difficulty: 2, tip: '💡 Perfeito para quando um parceiro está cansado.' },
  { name: 'Último do Mês', description: 'A posição especial do último dia — escolhem juntos qual querem repetir do mês!', difficulty: 0, tip: '💡 Olhem para o calendário e escolham o favorito do mês.' },
]

const STORAGE_KEY = 'partymix_daily_v2'

function getToday() {
  const d = new Date()
  return { day: d.getDate(), month: d.getMonth(), year: d.getFullYear(), str: d.toDateString() }
}

function loadScratchState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}
function saveScratchState(s) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) }

function ScratchCanvas({ onScratched }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const [pct, setPct] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = canvas.offsetWidth * window.devicePixelRatio
    canvas.height = canvas.offsetHeight * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    const w = canvas.offsetWidth, h = canvas.offsetHeight

    // Silver gradient
    const g = ctx.createLinearGradient(0, 0, w, h)
    g.addColorStop(0, '#94a3b8')
    g.addColorStop(0.4, '#e2e8f0')
    g.addColorStop(0.7, '#94a3b8')
    g.addColorStop(1, '#64748b')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)

    // Shimmer texture
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    for (let x = 0; x < w; x += 6) for (let y = 0; y < h; y += 6)
      if ((x + y) % 12 === 0) ctx.fillRect(x, y, 3, 3)

    // Text
    ctx.fillStyle = 'rgba(15,23,42,0.55)'
    ctx.font = `bold ${Math.min(w * 0.055, 18)}px Plus Jakarta Sans, sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText('✨ Raspa para revelar ✨', w / 2, h / 2 - 12)
    ctx.font = `${Math.min(w * 0.038, 13)}px Plus Jakarta Sans, sans-serif`
    ctx.fillStyle = 'rgba(15,23,42,0.35)'
    ctx.fillText('Posição do Dia', w / 2, h / 2 + 14)
    ctx.globalCompositeOperation = 'destination-out'
  }, [])

  const getXY = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const touch = e.touches ? e.touches[0] : e
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
  }

  const scratch = (e) => {
    e.preventDefault()
    if (!drawing.current || done) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const { x, y } = getXY(e, canvas)
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath(); ctx.arc(x, y, 28, 0, Math.PI * 2); ctx.fill()
    // Check pct
    const id = ctx.getImageData(0, 0, canvas.width, canvas.height)
    let t = 0
    for (let i = 3; i < id.data.length; i += 4) if (id.data[i] < 128) t++
    const p = Math.round(t / (id.data.length / 4) * 100)
    setPct(p)
    if (p > 55 && !done) {
      setDone(true)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      onScratched()
    }
  }

  return (
    <canvas ref={canvasRef}
      className="absolute inset-0 w-full h-full rounded-2xl touch-none"
      style={{ cursor: done ? 'default' : 'crosshair', zIndex: 10 }}
      onMouseDown={e => { drawing.current = true; scratch(e) }}
      onMouseMove={e => { if (drawing.current) scratch(e) }}
      onMouseUp={() => { drawing.current = false }}
      onMouseLeave={() => { drawing.current = false }}
      onTouchStart={e => { drawing.current = true; scratch(e) }}
      onTouchMove={e => { if (drawing.current) scratch(e) }}
      onTouchEnd={() => { drawing.current = false }}
    />
  )
}

function FlameRating({ count }) {
  return (
    <div className="flex gap-0.5 justify-center">
      {[1,2,3].map(i => (
        <Flame key={i} className={`w-4 h-4 ${i <= count ? 'text-rose-500 fill-rose-500' : 'text-white/10'}`}/>
      ))}
    </div>
  )
}

export default function DailyScratch({ onClose, standalone = false }) {
  const today = getToday()
  const posIdx = (today.day - 1) % 31 // 0-30
  const position = POSITIONS_31[posIdx]

  const [state, setState] = useState(() => {
    const s = loadScratchState()
    return s.date === today.str ? s : { date: today.str, scratched: false, streak: s.date ? (s.streak || 1) : 1 }
  })

  const [showHint, setShowHint] = useState(false)

  useEffect(() => {
    const saved = loadScratchState()
    // Calculate streak
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
    const hadYesterday = saved.date === yesterday.toDateString()
    const newStreak = saved.date === today.str ? (saved.streak || 1) : hadYesterday ? (saved.streak || 1) + 1 : 1
    if (saved.date !== today.str) {
      const newState = { date: today.str, scratched: false, streak: newStreak }
      setState(newState); saveScratchState(newState)
    }
    const t = setTimeout(() => setShowHint(true), 2500)
    return () => clearTimeout(t)
  }, [])

  const handleScratched = () => {
    const newState = { ...state, scratched: true }
    setState(newState); saveScratchState(newState)
  }

  const reveal = () => handleScratched()

  const wrap = standalone
    ? 'min-h-screen bg-[#080b14] flex items-center justify-center p-4'
    : 'fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4'

  return (
    <div className={wrap}>
      <motion.div initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 16 }}
        className="w-full max-w-sm flex flex-col gap-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="text-rose-400 w-5 h-5"/>
            <div>
              <h2 className="text-white font-black text-lg">Posição do Dia</h2>
              <p className="text-slate-500 text-xs">Dia {today.day} de cada mês</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {state.streak > 1 && (
              <div className="flex items-center gap-1 bg-orange-500/15 border border-orange-500/30 rounded-full px-3 py-1">
                <Flame className="text-orange-400 w-3.5 h-3.5 fill-orange-400"/>
                <span className="text-orange-400 text-xs font-bold">{state.streak} dias</span>
              </div>
            )}
            {!standalone && <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5"/></button>}
          </div>
        </div>

        {/* Scratch card */}
        <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl" style={{ height: 280, background: 'linear-gradient(135deg, #1a0a2e, #2d1b4e)' }}>
          {/* Position content underneath */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-5 text-center">
            <motion.div animate={state.scratched ? { scale: [0, 1.2, 1] } : {}} transition={{ delay: 0.1, type: 'spring', damping: 10 }}>
              <div className="text-5xl mb-1">💋</div>
            </motion.div>
            <div>
              <h3 className="text-white font-black text-2xl leading-tight">{position.name}</h3>
              <div className="mt-1"><FlameRating count={position.difficulty}/></div>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">{position.description}</p>
            {state.scratched && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                <p className="text-rose-300 text-xs">{position.tip}</p>
              </motion.div>
            )}
          </div>
          {!state.scratched && <ScratchCanvas onScratched={handleScratched}/>}
          {state.scratched && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
              className="absolute bottom-3 right-3 bg-green-500/20 border border-green-500/30 rounded-full px-3 py-1">
              <span className="text-green-400 text-xs font-bold">✨ Revelado!</span>
            </motion.div>
          )}
        </div>

        {/* Month mini-calendar preview */}
        {state.scratched && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4">
            <p className="text-slate-400 text-xs mb-3 uppercase tracking-wider">Posições do Mês</p>
            <div className="grid grid-cols-7 gap-1">
              {POSITIONS_31.slice(0, 31).map((pos, i) => (
                <div key={i}
                  className={`aspect-square rounded-lg flex items-center justify-center text-xs font-bold transition-all ${i === posIdx ? 'bg-rose-500 text-white' : i < posIdx ? 'bg-white/10 text-slate-400' : 'bg-white/[0.04] text-slate-600'}`}
                  title={pos.name}>
                  {i + 1}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Hint / Actions */}
        <AnimatePresence>
          {!state.scratched && showHint && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-slate-500 text-xs text-center">
              👆 Usa o dedo para raspar
            </motion.p>
          )}
        </AnimatePresence>

        <div className="flex gap-3">
          {!state.scratched && (
            <button onClick={reveal} className="text-slate-600 text-xs hover:text-slate-400 transition-colors">Revelar →</button>
          )}
          <button onClick={onClose || (() => {})}
            className={`${!state.scratched ? 'flex-1' : 'w-full'} bg-gradient-to-r from-rose-600 to-pink-700 text-white font-bold rounded-2xl py-3`}>
            {state.scratched ? 'Até amanhã! 🌙' : 'Fechar'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
