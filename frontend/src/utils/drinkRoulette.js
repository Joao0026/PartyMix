export const ROULETTE_EVERY = 13

export const ROULETTE_PRIZES = [
  {
    id: 'escudo',
    emoji: '🛡️',
    title: 'Escudo',
    text: 'O teu próximo gole não conta.',
  },
  {
    id: 'passa',
    emoji: '⏭️',
    title: 'Passas a vez',
    text: 'A próxima carta lê outra pessoa — saltas uma.',
  },
  {
    id: 'picante',
    emoji: '🔥',
    title: 'Próxima picante',
    text: 'A próxima carta vem do baralho Picante, se houver.',
  },
  {
    id: 'leitor',
    emoji: '📣',
    title: 'Tu lês 3',
    text: 'Lês as próximas 3 cartas em voz alta.',
  },
  {
    id: 'casa',
    emoji: '🏠',
    title: 'Carta da casa',
    text: 'Inventa já uma carta. O leitor escreve no telemóvel.',
  },
  {
    id: 'comunidade',
    emoji: '🌍',
    title: 'Carta da comunidade',
    text: 'A próxima carta vem da Comunidade, se houver.',
  },
  {
    id: 'distribui',
    emoji: '🍻',
    title: 'Distribui 3',
    text: 'Distribui 3 goles pela mesa. Tu não bebes.',
  },
]

export function shouldSpinRoulette({ drawnCount = 0, recentTypes = [], random = Math.random } = {}) {
  if (drawnCount < 2) return false
  if (recentTypes.slice(-10).includes('roleta')) return false
  return random() < 1 / ROULETTE_EVERY
}

export function pickRoulettePrize({ hasPicante = true, hasCommunity = true, random = Math.random } = {}) {
  const pool = ROULETTE_PRIZES.filter((prize) => {
    if (prize.id === 'picante' && !hasPicante) return false
    if (prize.id === 'comunidade' && !hasCommunity) return false
    return true
  })
  const list = pool.length ? pool : ROULETTE_PRIZES.filter((prize) => prize.id !== 'picante' && prize.id !== 'comunidade')
  return list[Math.floor(random() * list.length)] || ROULETTE_PRIZES[0]
}

export function rouletteCard(prize) {
  return {
    type: 'roleta',
    deckId: 'roleta',
    pack: 'base',
    emoji: prize?.emoji || '🎰',
    title: prize?.title || 'Roleta',
    text: prize?.text || 'A roleta da noite.',
    prizeId: prize?.id || 'escudo',
  }
}
