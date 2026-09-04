import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../utils/api'
import { drinkBaralhoLabel } from '../../utils/drinkBaralhos'

const PACK_ORDER = ['base', 'noite-academica', 'sem-filtros', 'casais-festa']
const KEY_TO_PACK = { 1: 'base', 2: 'noite-academica', 3: 'sem-filtros', 4: 'casais-festa' }
const PACK_TONE = {
  base: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200',
  'noite-academica': 'border-amber-500/35 bg-amber-500/10 text-amber-200',
  'sem-filtros': 'border-rose-500/35 bg-rose-500/10 text-rose-200',
  'casais-festa': 'border-violet-500/35 bg-violet-500/10 text-violet-200',
}

export default function DrinkAssignTab() {
  const [packs, setPacks] = useState([])
  const [cards, setCards] = useState([])
  const [deckCounts, setDeckCounts] = useState({})
  const [sourcePack, setSourcePack] = useState('base')
  const [deckFilter, setDeckFilter] = useState('')
  const [skip, setSkip] = useState(0)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [undo, setUndo] = useState(null)
  const [loading, setLoading] = useState(true)
  const currentRef = useRef(null)
  const busyRef = useRef(false)
  const undoRef = useRef(null)

  const applyState = (state) => {
    if (Array.isArray(state?.packs)) setPacks(state.packs)
    if (Array.isArray(state?.cards)) setCards(state.cards)
    if (state?.deckCounts) setDeckCounts(state.deckCounts)
  }

  const load = useCallback(async () => {
    setLoading(true)
    setErr('')
    try {
      applyState(await api.listDrinkAssign())
    } catch (e) {
      setErr(e?.message || 'Não foi possível carregar as cartas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const orderedPacks = useMemo(() => (
    PACK_ORDER.map((id) => packs.find((pack) => pack.pack === id)).filter(Boolean)
  ), [packs])

  const queue = useMemo(() => cards.filter((card) => {
    if (sourcePack && card.pack !== sourcePack) return false
    if (deckFilter && card.deckId !== deckFilter) return false
    return true
  }), [cards, sourcePack, deckFilter])

  const current = skip < queue.length ? queue[skip] : null
  currentRef.current = current
  busyRef.current = busy
  undoRef.current = undo

  const assign = useCallback(async (toPack) => {
    const card = currentRef.current
    if (!card || busyRef.current || card.pack === toPack) return
    setBusy(true)
    setErr('')
    try {
      const result = await api.assignDrinkCard({
        fromPack: card.pack,
        fromDeck: card.deckId,
        index: card.index,
        fingerprint: card.fingerprint,
        toPack,
      })
      applyState(result)
      setUndo(result.moved)
    } catch (e) {
      setErr(e?.message || 'Não foi possível mover a carta')
    } finally {
      setBusy(false)
    }
  }, [])

  const undoLast = useCallback(async () => {
    const last = undoRef.current
    if (!last || busyRef.current) return
    setBusy(true)
    setErr('')
    try {
      const result = await api.assignDrinkCard({
        fromPack: last.toPack,
        fromDeck: last.fromDeck,
        index: last.destIndex,
        fingerprint: last.fingerprint,
        toPack: last.fromPack,
      })
      applyState(result)
      setUndo(null)
    } catch (e) {
      setErr(e?.message || 'Não foi possível desfazer')
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    const onKey = (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return
      if (event.key === ' ' || event.key === 'ArrowRight') {
        event.preventDefault()
        setSkip((value) => value + 1)
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setSkip((value) => Math.max(0, value - 1))
      }
      if (event.key === 'z' || event.key === 'Z') undoLast()
      if (KEY_TO_PACK[event.key]) assign(KEY_TO_PACK[event.key])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [assign, undoLast])

  const decks = Object.entries(deckCounts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([id, count]) => ({ id, count }))

  return (
    <div className="space-y-4">
    <p className="text-slate-400 text-sm leading-relaxed">
      Para não triar aqui: no JSON da carta (ex. decks.json) mete <span className="text-white font-mono text-xs">"pack": "noite-academica"</span> e corre <span className="text-white font-mono text-xs">npm run drink:distribute</span>.
    </p>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {orderedPacks.map((pack) => (
          <div key={pack.pack} className={`rounded-2xl border px-3 py-3 text-center ${PACK_TONE[pack.pack] || 'border-white/10 bg-white/[0.04]'}`}>
            <p className="text-[11px] text-white/70 truncate">{pack.name}</p>
            <p className="text-white font-black text-2xl leading-none mt-1">{pack.count}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <select
          value={sourcePack}
          onChange={(e) => { setSourcePack(e.target.value); setSkip(0) }}
          className="bg-slate-800 border border-slate-600 text-white rounded-xl px-3 py-2.5 outline-none text-sm"
        >
          {orderedPacks.map((pack) => (
            <option key={pack.pack} value={pack.pack}>A triar: {pack.name}</option>
          ))}
        </select>
        <select
          value={deckFilter}
          onChange={(e) => { setDeckFilter(e.target.value); setSkip(0) }}
          className="bg-slate-800 border border-slate-600 text-white rounded-xl px-3 py-2.5 outline-none text-sm"
        >
          <option value="">Todos os tipos</option>
          {decks.map((deck) => (
            <option key={deck.id} value={deck.id}>{drinkBaralhoLabel(deck.id)} · {deck.count}</option>
          ))}
        </select>
      </div>

      {err && <p className="text-red-300 text-sm bg-red-500/10 border border-red-500/30 rounded-xl p-3">{err}</p>}

      {loading ? (
        <p className="text-slate-500 text-center py-12">A carregar…</p>
      ) : !current ? (
        <div className="rounded-2xl border border-white/[0.07] p-8 text-center space-y-3">
          <p className="text-white font-bold">Fila vazia</p>
          <p className="text-slate-500 text-sm">Já viste todas as cartas deste filtro.</p>
          {skip > 0 && (
            <button type="button" onClick={() => setSkip(0)} className="text-violet-300 text-sm font-bold">
              Voltar ao início
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-slate-500 text-xs text-center">
            {skip + 1} / {queue.length} · {drinkBaralhoLabel(current.deckId)}
          </p>
          <div className="rounded-[1.75rem] border border-white/[0.1] bg-white/[0.05] p-6 text-center space-y-2 min-h-[180px] flex flex-col justify-center">
            <p className="text-3xl">{current.card.emoji || '🍺'}</p>
            <p className="text-white font-black text-xl">{current.card.title || 'Carta'}</p>
            <p className="text-slate-200 text-base leading-relaxed">{current.card.text}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {orderedPacks.map((pack, i) => {
              const currentPack = pack.pack === current.pack
              return (
                <button
                  key={pack.pack}
                  type="button"
                  disabled={busy || currentPack}
                  onClick={() => assign(pack.pack)}
                  className={`rounded-2xl border px-3 py-3 text-left disabled:opacity-35 ${PACK_TONE[pack.pack] || 'border-white/10 bg-white/[0.05]'}`}
                >
                  <p className="text-white font-black text-sm">{i + 1}. {pack.name}</p>
                  <p className="text-white/50 text-[11px]">{currentPack ? 'Já está aqui' : pack.premium ? 'Premium' : 'Grátis'}</p>
                </button>
              )
            })}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setSkip((value) => value + 1)}
              className="flex-1 rounded-2xl border border-white/[0.08] py-3 text-slate-200 font-bold"
            >
              Saltar
            </button>
            <button
              type="button"
              disabled={busy || !undo}
              onClick={undoLast}
              className="flex-1 rounded-2xl border border-white/[0.08] py-3 text-slate-200 font-bold disabled:opacity-30"
            >
              Desfazer
            </button>
          </div>
          <p className="text-slate-600 text-[11px] text-center">1–4 envia · Espaço salta · Z desfaz</p>
        </div>
      )}
    </div>
  )
}
