import modelos from '../../../data/MODELOS-ESCREVER-CARTAS.json'

/** Packs completos importáveis no Admin → Importar */
export const PACK_IMPORT_TEMPLATES = [
  {
    id: 'friends',
    label: '👥 Amigos (mapa)',
    hint: 'data/friends/base.json — categories: telepatia, perguntas, desenho, mimica, proibido, caos, impostor',
    pack: modelos.pack_amigos_exemplo,
  },
  {
    id: 'family',
    label: '🏡 Família',
    hint: 'data/family/base.json — sem caos, tom leve',
    pack: modelos.pack_familia_exemplo,
  },
  {
    id: 'couple',
    label: '💕 Casal',
    hint: 'data/couple/base.json — romantico, picante, verdade, acao, roleplay, quiz',
    pack: modelos.pack_casal_exemplo,
  },
  {
    id: 'cards',
    label: '🃏 Cartas (CAH)',
    hint: 'data/cards/base.json — arrays white e black',
    pack: modelos.pack_cartas_exemplo,
  },
  {
    id: 'drink',
    label: '🍺 Beber (baralhos)',
    hint: 'data/drink/decks.json — ATENÇÃO: substitui todos os baralhos do pack na BD',
    pack: modelos.pack_beber_exemplo,
  },
]

/** Snippets — colar manualmente dentro de packs existentes */
export const SNIPPET_TEMPLATES = [
  {
    id: 'beber_carta',
    label: '🍺 Snippet — 1 carta Beber',
    hint: 'Cola em decks.{baralho}.cards[] no teu decks.json',
    json: modelos.snippet_adicionar_carta_beber.por_type.desafio,
  },
  {
    id: 'beber_preferencia',
    label: '🤔 Snippet — Preferias?',
    hint: 'Baralho preferias — type preferencia + choices (A em cima, B em baixo)',
    json: modelos.snippet_adicionar_carta_beber.por_type.preferencia,
  },
  {
    id: 'beber_historia',
    label: '🎬 Snippet — História',
    hint: 'Baralho historia — type desafio + Começa: …',
    json: modelos.snippet_adicionar_carta_beber.por_type.historia_cadeia,
  },
  {
    id: 'beber_bluff',
    label: '🎭 Snippet — Bluff / Opinião',
    hint: 'Baralho bluff — type desafio',
    json: modelos.snippet_adicionar_carta_beber.por_type.bluff_opiniao,
  },
  {
    id: 'beber_sorte',
    label: '🍀 Snippet — Sorte',
    hint: 'Baralho poder — type sorte (cartão verde na app)',
    json: modelos.snippet_adicionar_carta_beber.por_type.sorte,
  },
  {
    id: 'beber_azar',
    label: '💀 Snippet — Azar',
    hint: 'Baralho poder — type azar (cartão cinza na app)',
    json: modelos.snippet_adicionar_carta_beber.por_type.azar,
  },
  {
    id: 'beber_poder',
    label: '👑 Snippet — Poder',
    hint: 'Baralho poder — type poder (cartão amarelo na app)',
    json: modelos.snippet_adicionar_carta_beber.por_type.poder,
  },
  {
    id: 'beber_provavel',
    label: '👉 Snippet — Quem é mais provável?',
    hint: 'Baralho provavel',
    json: {
      type: 'desafio',
      emoji: '👉',
      title: 'Quem é mais provável?',
      text: 'Quem é mais provável de [X]? Contagem 1-2-3 — apontem! Quem receber mais dedos bebe 2.',
    },
  },
  {
    id: 'mapa_pergunta',
    label: '📚 Snippet — Sabichão',
    hint: 'Cola em categories.perguntas[]',
    json: modelos.snippet_adicionar_carta_mapa.perguntas,
  },
  {
    id: 'mapa_impostor',
    label: '🎭 Snippet — Impostor',
    hint: 'Cola em categories.impostor[]',
    json: modelos.snippet_adicionar_carta_mapa.impostor,
  },
]

export const COLOCAR_NA_APP = modelos._meta.como_colocar_na_app
