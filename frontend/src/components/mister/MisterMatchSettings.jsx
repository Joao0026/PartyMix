import { NightTitle, NightChip, NightBox } from '../layout/NightShell'
import {
  DIFFICULTY_IDS,
  DIFFICULTY_LABELS,
  DISCUSSION_SECONDS,
  sanitizeMisterPair,
} from '../../utils/misterWhiteShared'

const GOLD = '#fbbf24'

export default function MisterMatchSettings({
  packIds,
  packLabels,
  wordPacks,
  onTogglePack,
  onAllPacks,
  difficulties,
  onToggleDifficulty,
  onAllDifficulties,
  customPairs,
  draftCivil,
  draftUndercover,
  onDraftCivil,
  onDraftUndercover,
  onAddPair,
  onRemovePair,
  discussionSeconds,
  onDiscussionSeconds,
}) {
  const allPacksOn = packIds.length > 0 && packIds.every((id) => wordPacks.includes(id))
  const allDiffsOn = DIFFICULTY_IDS.every((id) => difficulties.includes(id))

  return (
    <>
      <NightTitle>Mister White</NightTitle>
      <p className="mt-3 text-center text-[1.05rem] font-medium text-white">A ronda</p>
      <p className="mt-1.5 text-center text-[13px] text-white/45">Escolhe packs, pares, dificuldade e tempo.</p>

      <p className="mt-6 text-[13px] font-bold text-white/70">Packs</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <NightChip selected={allPacksOn} accent={GOLD} onClick={onAllPacks}>Todas</NightChip>
        {packIds.map((id) => (
          <NightChip
            key={id}
            selected={wordPacks.includes(id)}
            accent={GOLD}
            onClick={() => onTogglePack(id)}
          >
            {packLabels[id] || id}
          </NightChip>
        ))}
      </div>

      <NightBox title="Pares da sala" className="mt-4">
        <p className="mb-2 text-[12px] text-white/45">Escreve um par. Mistura com os packs escolhidos.</p>
        <div className="flex gap-1.5">
          <input
            value={draftCivil}
            onChange={(e) => onDraftCivil(e.target.value)}
            placeholder="Civil"
            maxLength={40}
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-[#141419] px-3 text-sm text-white outline-none"
          />
          <input
            value={draftUndercover}
            onChange={(e) => onDraftUndercover(e.target.value)}
            placeholder="Undercover"
            maxLength={40}
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-[#141419] px-3 text-sm text-white outline-none"
          />
          <button
            type="button"
            onClick={onAddPair}
            disabled={!sanitizeMisterPair({ civil: draftCivil, undercover: draftUndercover })}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#fbbf24]/40 text-lg font-black text-[#fbbf24] disabled:opacity-30"
          >
            +
          </button>
        </div>
        {customPairs.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {customPairs.map((pair, i) => (
              <div key={`${pair.civil}-${pair.undercover}-${i}`} className="flex items-center justify-between gap-2 rounded-xl bg-[#141419] px-3 py-2 text-[13px]">
                <span className="min-w-0 truncate text-white">{pair.civil} · {pair.undercover}</span>
                <button type="button" onClick={() => onRemovePair(i)} className="text-xs font-bold text-white/40">tirar</button>
              </div>
            ))}
          </div>
        )}
      </NightBox>

      <p className="mt-4 text-[13px] font-bold text-white/70">Dificuldade</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <NightChip selected={allDiffsOn} accent={GOLD} onClick={onAllDifficulties}>Todas</NightChip>
        {DIFFICULTY_IDS.map((id) => (
          <NightChip
            key={id}
            selected={difficulties.includes(id)}
            accent={GOLD}
            onClick={() => onToggleDifficulty(id)}
          >
            {DIFFICULTY_LABELS[id]}
          </NightChip>
        ))}
      </div>

      <p className="mt-4 text-[13px] font-bold text-white/70">Tempo</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {DISCUSSION_SECONDS.map((seconds) => (
          <button
            key={seconds}
            type="button"
            onClick={() => onDiscussionSeconds(seconds)}
            className={`rounded-full border py-2 text-xs font-bold ${discussionSeconds === seconds ? 'border-[#fbbf24]/40 text-[#fbbf24]' : 'border-white/10 bg-[#2a2a2e] text-slate-400'}`}
          >
            {seconds}s
          </button>
        ))}
      </div>
    </>
  )
}
