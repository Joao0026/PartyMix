export default function PlayerScoreChips({ players, scores, currentPlayer, accent = 'amber' }) {
  const activeClass = accent === 'violet' ? 'text-violet-400' : 'text-amber-400'

  return (
    <div className="flex gap-2 shrink-0">
      {players.map((p, i) => (
        <div key={p.name || i} className="text-center min-w-0">
          <div className={`text-sm font-black ${i === currentPlayer ? activeClass : 'text-white'}`}>
            {scores[i]}
          </div>
          <div className="text-slate-500 text-xs truncate max-w-10">{p.name.split(' ')[0]}</div>
        </div>
      ))}
    </div>
  )
}
