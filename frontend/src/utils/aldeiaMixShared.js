export const ROLE_LABELS = {
  aldeao: 'Aldeão',
  lobo: 'Lobo',
  curandeira: 'Beijoqueira/o',
  vidente: 'Xerife',
  narrador: 'Narrador',
}

export const ROLE_STYLES = {
  aldeao: 'bg-green-900/25 border-green-500/30 text-green-200',
  lobo: 'bg-red-900/25 border-red-500/30 text-red-200',
  curandeira: 'bg-blue-900/25 border-blue-500/30 text-blue-200',
  vidente: 'bg-purple-900/25 border-purple-500/30 text-purple-200',
}

export const NIGHT_STEPS = [
  { id: 'sleep', script: 'A aldeia adormece… (todos fecham os olhos)' },
  { id: 'wolves', script: 'Os lobos acordam. (Na mesa apontam — tu escolhes UMA vítima abaixo)' },
  { id: 'wolves_sleep', script: 'Os lobos adormecem.' },
  { id: 'medic', script: 'A Beijoqueira/o acorda. (Salva quem apontarem — toca no nome)' },
  { id: 'medic_sleep', script: 'A Beijoqueira/o adormece.' },
  { id: 'sheriff', script: 'O Xerife acorda. (Suspeita — vês se é Lobo, só tu)' },
  { id: 'sheriff_sleep', script: 'O Xerife adormece.' },
  { id: 'dawn', script: 'A aldeia acorda…' },
]

export function stepScript(stepId) {
  return NIGHT_STEPS.find((s) => s.id === stepId)?.script || ''
}

export function roleLabel(role) {
  return ROLE_LABELS[role] || role
}

export function gameResultLabel(result) {
  if (result === 'aldeoes_win') return 'Aldeões ganham!'
  if (result === 'lobos_win') return 'Lobos ganham!'
  return ''
}

export function playerStatusMessage(room) {
  if (!room) return ''
  if (room.status === 'reveal') return 'Vê o teu papel desta partida'
  if (room.status === 'night') return 'Noite — olhos fechados. O narrador conduz.'
  if (room.status === 'day') return `Dia ${room.dayNum || 1} — discussão à mesa`
  if (room.status === 'result') return 'Partida terminada'
  return ''
}
