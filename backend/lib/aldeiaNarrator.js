/** Textos que o narrador lê em voz alta (ecrã do juiz) */

const NIGHT_STEPS = [
  { id: 'sleep', label: 'Aldeia adormece', script: 'A aldeia adormece… (todos fecham os olhos)' },
  { id: 'wolves', label: 'Lobos', script: 'Os lobos acordam. (Apontam a uma vítima — escolhe UMA pessoa no telemóvel)' },
  { id: 'wolves_sleep', label: 'Lobos adormecem', script: 'Os lobos adormecem.' },
  { id: 'medic', label: 'Beijoqueira/o', script: 'A Beijoqueira/o acorda. (Aponta quem salvar — toca no nome; toca outra vez para desmarcar)' },
  { id: 'medic_sleep', label: 'Beijoqueira/o adormece', script: 'A Beijoqueira/o adormece.' },
  { id: 'sheriff', label: 'Xerife', script: 'O Xerife acorda. (Aponta a suspeita — vês se é Lobo ou não, só tu)' },
  { id: 'sheriff_sleep', label: 'Xerife adormece', script: 'O Xerife adormece.' },
  { id: 'dawn', label: 'Aldeia acorda', script: 'A aldeia acorda…' },
]

function nextNightStep(current, settings) {
  const order = NIGHT_STEPS.map((s) => s.id)
  let idx = order.indexOf(current)
  if (idx < 0) idx = 0
  for (let i = idx + 1; i < order.length; i++) {
    const step = order[i]
    if (step === 'medic' || step === 'medic_sleep') {
      if ((settings?.numCurandeiras || 0) < 1) continue
    }
    if (step === 'sheriff' || step === 'sheriff_sleep') {
      if ((settings?.numVidentes || 0) < 1) continue
    }
    return step
  }
  return 'dawn'
}

function stepScript(stepId) {
  return NIGHT_STEPS.find((s) => s.id === stepId)?.script || ''
}

module.exports = { NIGHT_STEPS, nextNightStep, stepScript }
