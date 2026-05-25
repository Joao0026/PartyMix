import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export function challengeToImpostorPair(entry) {
  const correctQuestion = String(entry?.correct_question || entry?.correctQuestion || '').trim()
  const wrongQuestion = String(entry?.wrong_question || entry?.wrongQuestion || '').trim()
  if (!correctQuestion || !wrongQuestion) return null
  return {
    type: 'impostor',
    emoji: '🎭',
    title: 'Impostor',
    correctQuestion,
    wrongQuestion,
  }
}

export function mergeImpostorPairs(builtin, remote = []) {
  const seen = new Set()
  const out = []
  for (const pair of [...builtin, ...remote.map(challengeToImpostorPair).filter(Boolean)]) {
    const key = `${pair.correctQuestion}::${pair.wrongQuestion}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(pair)
  }
  return out.length ? out : builtin
}

export const IMPOSTOR_PAIRS = [
  {
    type: 'impostor',
    emoji: '🎭',
    title: 'Impostor',
    correctQuestion: 'Quem do grupo sobreviveria num apocalipse?',
    wrongQuestion: 'Quem é o mais medricas?',
  },
  {
    type: 'impostor',
    emoji: '🎭',
    title: 'Impostor',
    correctQuestion: 'Quem é o mais engraçado da mesa?',
    wrongQuestion: 'Quem é o mais chato da mesa?',
  },
  {
    type: 'impostor',
    emoji: '🎭',
    title: 'Impostor',
    correctQuestion: 'Quem seria o melhor líder num grupo?',
    wrongQuestion: 'Quem seria o primeiro a ser votado fora?',
  },
  {
    type: 'impostor',
    emoji: '🎭',
    title: 'Impostor',
    correctQuestion: 'Quem demora mais a ficar pronto?',
    wrongQuestion: 'Quem tem o pior gosto musical?',
  },
  {
    type: 'impostor',
    emoji: '🎭',
    title: 'Impostor',
    correctQuestion: 'Quem contaria a melhor história de terror?',
    wrongQuestion: 'Quem mente mais vezes?',
  },
  {
    type: 'impostor',
    emoji: '🎭',
    title: 'Impostor',
    correctQuestion: 'Qual é o tamanho ideal de um brinquedo sexual?',
    wrongQuestion: 'Dá nota ao teu beijo de 1 a 10.',
  },
]

/**
 * Ronda Impostor: o telemóvel passa por todos; 1 jogador vê pergunta errada.
 * Acertam quem era → impostor bebe. Falham → impostor distribui.
 */
export default function ImpostorCard({
  players,
  correctQuestion,
  wrongQuestion,
  impostorIndex,
  mode = 'drink',
  onComplete,
}) {
  const [phase, setPhase] = useState('pass')
  const [passIdx, setPassIdx] = useState(0)
  const [viewed, setViewed] = useState(false)
  const [accusedIdx, setAccusedIdx] = useState(null)

  const n = players.length
  const impostor = players[impostorIndex]
  const drinkAmount = 3
  const guessedCorrect = accusedIdx === impostorIndex

  const advancePass = () => {
    setViewed(false)
    if (passIdx + 1 >= n) setPhase('reveal')
    else setPassIdx((i) => i + 1)
  }

  const pickAccusation = (idx) => {
    setAccusedIdx(idx)
    setPhase('done')
  }

  const finish = () => {
    onComplete?.({ guessedCorrect, impostorIndex, accusedIndex: accusedIdx })
  }

  const currentPlayer = players[passIdx]
  const isImpostorTurn = passIdx === impostorIndex
  const privateQuestion = isImpostorTurn ? wrongQuestion : correctQuestion

  return (
    <div className="w-full space-y-4">
      <div className="rounded-2xl border border-fuchsia-400/25 bg-fuchsia-500/10 px-3 py-2 text-center">
        <p className="text-fuchsia-200 text-xs font-black uppercase tracking-[0.18em]">Carta Impostor</p>
        <p className="text-white/80 text-xs mt-0.5">1 jogador viu outra pergunta. Descubram-no no fim.</p>
      </div>

      <AnimatePresence mode="wait">
        {phase === 'pass' && (
          <motion.div
            key={`pass-${passIdx}-${viewed}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div className="rounded-3xl border border-white/15 bg-black/20 p-5 text-center">
              <p className="text-slate-400 text-xs uppercase tracking-[0.16em] mb-2">Passa o telemóvel a</p>
              <p className="text-white font-black text-2xl">{currentPlayer?.name}</p>
              <p className="text-slate-500 text-xs mt-2">
                {passIdx + 1} de {n} · só esta pessoa pode ver a carta
              </p>
            </div>

            {!viewed ? (
              <button
                type="button"
                onClick={() => setViewed(true)}
                className="w-full rounded-2xl bg-white/15 border border-white/20 py-4 text-white font-black text-lg"
              >
                Ver carta
              </button>
            ) : (
              <div className="space-y-3">
                <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4">
                  <p className="text-amber-200 text-xs font-black uppercase tracking-[0.16em] mb-2">A tua pergunta</p>
                  <p className="text-white font-bold text-lg leading-relaxed">{privateQuestion}</p>
                </div>
                <p className="text-center text-slate-400 text-xs">Responde mentalmente. Não mostres o ecrã ao grupo.</p>
                <button
                  type="button"
                  onClick={advancePass}
                  className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-600 to-purple-700 py-4 text-white font-black"
                >
                  Já vi — passar ao próximo
                </button>
              </div>
            )}
          </motion.div>
        )}

        {phase === 'reveal' && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4">
              <p className="text-emerald-200 text-xs font-black uppercase tracking-[0.16em] mb-2">Pergunta certa</p>
              <p className="text-white font-bold text-lg leading-relaxed">{correctQuestion}</p>
            </div>
            <p className="text-slate-300 text-sm text-center leading-relaxed">
              Todos responderam? Comparem as respostas e decidam quem tinha a pergunta errada.
            </p>
            <button
              type="button"
              onClick={() => setPhase('guess')}
              className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-600 to-purple-700 py-4 text-white font-black"
            >
              Acusar o impostor
            </button>
          </motion.div>
        )}

        {phase === 'guess' && (
          <motion.div
            key="guess"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <p className="text-white font-bold text-center">Quem tinha a pergunta errada?</p>
            <div className="grid grid-cols-2 gap-2">
              {players.map((p, idx) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => pickAccusation(idx)}
                  className={`rounded-2xl border py-3 font-black text-sm ${
                    p.color
                      ? `bg-gradient-to-br ${p.color} text-white border-white/20`
                      : 'bg-white/10 border-white/15 text-white'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {phase === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <div
              className={`rounded-2xl border p-4 text-center ${
                guessedCorrect
                  ? 'border-emerald-400/30 bg-emerald-400/10'
                  : 'border-amber-400/30 bg-amber-400/10'
              }`}
            >
              <p className="text-white font-black text-xl mb-2">
                {guessedCorrect ? 'Mesa acertou!' : 'Mesa falhou!'}
              </p>
              <p className="text-white/90 text-sm leading-relaxed">
                O impostor era <span className="font-black">{impostor?.name}</span>.
                {guessedCorrect ? (
                  <>
                    {' '}
                    {mode === 'drink'
                      ? `${impostor?.name} bebe ${drinkAmount} gole${drinkAmount === 1 ? '' : 's'}.`
                      : `${impostor?.name} bebe 2 goles.`}
                  </>
                ) : (
                  <>
                    {' '}
                    {mode === 'drink'
                      ? `${impostor?.name} distribui ${drinkAmount} gole${drinkAmount === 1 ? '' : 's'}.`
                      : `${impostor?.name} distribui ${drinkAmount} gole${drinkAmount === 1 ? '' : 's'}.`}
                  </>
                )}
              </p>
              {accusedIdx !== impostorIndex && (
                <p className="text-slate-400 text-xs mt-2">
                  Acusaram {players[accusedIdx]?.name}.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={finish}
              className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-black py-4 font-black"
            >
              Continuar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
