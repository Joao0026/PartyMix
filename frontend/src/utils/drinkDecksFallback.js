/** Baralho mínimo se a API/BD ainda não tiver packs importados */
export const FALLBACK_DRINK_DECKS = [
  {
    id: 'waterfall',
    label: '🌊 Waterfall & Beber',
    desc: 'Quem bebe, bebe muito',
    premium: false,
    cards: [
      { type: 'beber', emoji: '🍺', title: 'Bebe 2!', text: 'O jogador com o cabelo mais comprido bebe 2 goles.' },
    ],
  },
  {
    id: 'eununca',
    label: '🙅 Eu Nunca',
    desc: 'Confissões garantidas',
    premium: false,
    cards: [
      { type: 'desafio', emoji: '🙅', title: 'Eu Nunca', text: 'EU NUNCA — Diz algo que nunca fizeste. Quem já fez bebe 1!' },
    ],
  },
  {
    id: 'regras',
    label: '📜 Regras',
    desc: 'Cria caos',
    premium: false,
    cards: [
      { type: 'regra', emoji: '📜', title: 'Nova Regra!', text: 'Quem disser "sim" ou "não" bebe 1 gole até ao fim do jogo!' },
    ],
  },
  {
    id: 'preferias',
    label: '🤔 Preferias?',
    desc: 'Would you rather — escolhas impossíveis',
    premium: false,
    cards: [
      {
        type: 'preferencia',
        emoji: '🤔',
        title: 'Preferias?',
        text: 'Minoria bebe 1',
        choices: ['Ter 10 dedos das mãos nos pés', 'Ter 10 dedos dos pés nas mãos'],
      },
    ],
  },
  {
    id: 'comunidade',
    label: '🌍 Comunidade',
    desc: 'Cartas aprovadas pela comunidade',
    premium: false,
    cards: [],
  },
]
