import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../utils/api'
import { readDrinkTvLocal } from '../utils/drinkTvSession'

export default function DrinkTv() {
  const { code: rawCode } = useParams()
  const code = String(rawCode || '').trim().toUpperCase()
  const [board, setBoard] = useState(() => readDrinkTvLocal(code))
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const tick = async () => {
      const local = readDrinkTvLocal(code)
      try {
        const remote = await api.getDrinkTv(code)
        if (!cancelled && remote) {
          setBoard(remote)
          setError('')
          return
        }
      } catch {
        if (!cancelled) setError('')
      }
      if (!cancelled) setBoard(local)
    }
    tick()
    const id = window.setInterval(tick, 900)
    const onStorage = (event) => {
      if (event.key && event.key.includes(code)) tick()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      cancelled = true
      window.clearInterval(id)
      window.removeEventListener('storage', onStorage)
    }
  }, [code])

  const card = board?.card
  const waiting = !card?.title && !card?.text

  return (
    <div className="relative flex min-h-[var(--app-vh,100dvh)] flex-col items-center justify-center overflow-hidden bg-black px-6 py-8 text-center">
      <div className="pointer-events-none absolute -left-24 top-[20%] h-[22rem] w-[22rem] rounded-full bg-[#ff9a3c]/40 blur-[90px]" />
      <div className="pointer-events-none absolute -right-20 top-[30%] h-[24rem] w-[24rem] rounded-full bg-[#ff2d9b]/35 blur-[90px]" />
      <p className="relative z-10 text-xs font-black uppercase tracking-[0.28em] text-white/45">PartyMix · TV · {code}</p>
      {waiting ? (
        <div className="relative z-10 mt-8 max-w-xl">
          <p className="text-4xl font-black text-white sm:text-5xl">À espera da carta</p>
          <p className="mt-4 text-lg text-white/60">O telemóvel comanda. Abre o Beber, toca em TV e tira uma carta.</p>
          {error && <p className="mt-3 text-sm text-amber-300">{error}</p>}
        </div>
      ) : (
        <div className="relative z-10 mt-8 w-full max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#ffb04f]">
            {board.readerName ? `${board.readerName} lê` : 'A mesa lê'}
            {board.turnCount ? ` · turno ${board.turnCount}` : ''}
          </p>
          <p className="mt-4 text-6xl" aria-hidden>{card.emoji || '🍺'}</p>
          <h1 className="mt-4 text-4xl font-black leading-tight text-white sm:text-6xl">{card.title || 'Carta'}</h1>
          <p className="mx-auto mt-6 max-w-2xl text-xl leading-relaxed text-white/85 sm:text-2xl">{card.text}</p>
          {Array.isArray(board.rules) && board.rules.length > 0 && (
            <div className="mx-auto mt-8 max-w-xl rounded-3xl border border-white/10 bg-white/[0.04] p-4 text-left">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-300">Regras activas</p>
              <ul className="mt-2 space-y-1 text-sm text-white/80">
                {board.rules.map((rule) => <li key={rule}>{rule}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
