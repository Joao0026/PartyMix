export default function PlayerScoreChips({ players, scores, currentPlayer, accent = 'amber' }) {
  const activeClass = accent === 'violet' ? 'text-violet-300' : accent === 'sky' ? 'text-sky-200' : 'text-amber-300'

  return (
    <div className="flex gap-1.5 shrink-0 overflow-x-auto max-w-[58vw]">
      {players.map((p, i) => (
        <div key={p.name || i} className="text-center min-w-[4.5rem] px-1">
          <div className={`text-lg font-black leading-none ${i === currentPlayer ? activeClass : 'text-white'}`}>
            {scores[i]}
          </div>
          <div className="text-slate-300 text-xs font-semibold truncate mt-0.5">{p.name?.split(' ')[0] || '—'}</div>
        </div>
      ))}
    </div>
  )
}
