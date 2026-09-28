import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import { getSocketUrl } from '../utils/api'

const TYPE_LABELS = {
  beber: 'Beber',
  regra: 'Regra da mesa',
  desafio: 'Desafio',
  poder: 'Poder',
  sorte: 'Sorte',
  azar: 'Azar',
  caos: 'Caos',
  preferencia: 'Preferias?',
  impostor: 'Impostor',
  alliance: 'Aliança',
  miniboss: 'Mini Boss',
  maldicao: 'Maldição',
  historia: 'História',
  roulette: 'Roleta',
  house: 'Carta da casa',
}

export default function DrinkTv() {
  const { code = '' } = useParams()
  const roomCode = String(code).toUpperCase()
  const [state, setState] = useState(null)
  const [error, setError] = useState('')
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const socket = io(getSocketUrl(), { transports: ['websocket', 'polling'] })
    const join = () => {
      setConnected(true)
      setError('')
      socket.emit('drink_tv_join', { code: roomCode })
    }
    socket.on('connect', join)
    socket.on('disconnect', () => setConnected(false))
    socket.on('drink_tv_state', (next) => setState(next))
    socket.on('drink_tv_error', (message) => setError(String(message || 'Ecrã indisponível')))
    return () => socket.disconnect()
  }, [roomCode])

  const card = state?.card

  return (
    <main className="min-h-screen bg-[#09090c] px-[5vw] py-[4vh] text-white">
      <header className="flex items-center justify-between gap-6 border-b border-white/10 pb-5">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.28em] text-[#ff5c8d]">PartyMix · Beber</p>
          <h1 className="mt-1 text-2xl font-black">Ecrã da mesa</h1>
        </div>
        <div className="text-right">
          <p className="text-sm text-white/45">Código</p>
          <p className="text-3xl font-black tracking-[0.18em] text-[#ffb04f]">{roomCode}</p>
        </div>
      </header>

      {error ? (
        <div className="grid min-h-[70vh] place-items-center text-center">
          <div>
            <p className="text-5xl">📺</p>
            <p className="mt-5 text-2xl font-black">{error}</p>
          </div>
        </div>
      ) : !state ? (
        <div className="grid min-h-[70vh] place-items-center text-center">
          <div>
            <p className="text-6xl">📱</p>
            <p className="mt-5 text-3xl font-black">À espera do telemóvel…</p>
            <p className="mt-2 text-lg text-white/45">{connected ? 'Ligado à sala' : 'A ligar ao servidor'}</p>
          </div>
        </div>
      ) : (
        <div className="grid min-h-[78vh] grid-cols-1 gap-6 py-6 lg:grid-cols-[1fr_18rem]">
          <section className="flex min-h-[60vh] flex-col justify-center rounded-[2.5rem] border border-[#ff5c8d]/30 bg-gradient-to-br from-[#25151f] to-[#111116] p-[clamp(2rem,5vw,5rem)] text-center shadow-[0_30px_120px_rgba(255,92,141,.12)]">
            <p className="text-lg font-black uppercase tracking-[0.24em] text-[#ffb04f]">
              {card ? (TYPE_LABELS[card.type] || 'Carta') : 'Próxima carta'}
            </p>
            <p className="mt-5 text-[clamp(1.8rem,4vw,4rem)] font-black leading-tight">
              {state.reader ? `${state.reader} lê` : 'Preparem-se'}
            </p>
            {card ? (
              <>
                <div className="mt-8 text-7xl" aria-hidden>{card.emoji || '🃏'}</div>
                {card.title && <h2 className="mt-5 text-[clamp(2rem,4.5vw,4.5rem)] font-black leading-tight">{card.title}</h2>}
                {card.choices?.length >= 2 && (
                  <p className="mt-6 text-[clamp(1.6rem,3.2vw,3.2rem)] font-bold leading-snug">
                    {card.choices[0]} <span className="text-[#ff5c8d]">ou</span> {card.choices[1]}?
                  </p>
                )}
                {card.text && <p className="mx-auto mt-6 max-w-5xl text-[clamp(1.4rem,2.7vw,2.7rem)] leading-snug text-white/85">{card.text}</p>}
              </>
            ) : (
              <p className="mt-6 text-2xl text-white/55">O telemóvel continua a comandar o jogo.</p>
            )}
          </section>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">Turno</p>
              <p className="mt-1 text-4xl font-black">{state.turn || 0}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">Baralhos ativos</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(state.activeDecks || []).map((deck) => (
                  <span key={deck} className="rounded-full bg-[#ff5c8d]/15 px-3 py-1 text-sm font-bold text-[#ff9cba]">{deck}</span>
                ))}
              </div>
            </div>
            {state.rules?.length > 0 && (
              <div className="rounded-3xl border border-violet-400/20 bg-violet-400/10 p-5">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-200">Regras ativas</p>
                <ul className="mt-3 space-y-2 text-sm text-white/80">
                  {state.rules.map((rule, index) => <li key={`${rule}-${index}`}>• {rule}</li>)}
                </ul>
              </div>
            )}
          </aside>
        </div>
      )}
    </main>
  )
}
