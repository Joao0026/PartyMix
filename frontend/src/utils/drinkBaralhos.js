/** Baralhos oficiais do Modo Beber (ids = decks.json) — não confundir com type da carta. */
export const DRINK_BARALHOS = [
  { id: 'waterfall', label: '🌊 Waterfall & Beber' },
  { id: 'eununca', label: '🙅 Eu Nunca' },
  { id: 'regras', label: '📜 Regras' },
  { id: 'caos', label: '💥 Caos' },
  { id: 'especiais', label: '🛡️ Especiais' },
  { id: 'desafios', label: '⚡ Desafios' },
  { id: 'poder', label: '👑 Poder & Sorte' },
  { id: 'picante', label: '🔥 Picante' },
  { id: 'preferias', label: '🤔 Preferias?' },
  { id: 'provavel', label: '👉 Quem é mais provável?' },
  { id: 'bluff', label: '🎭 Bluff' },
  { id: 'maldicao', label: '🔮 Maldição' },
  { id: 'historia', label: '🎬 História' },
  { id: 'cadeia', label: '🔗 Cadeia' },
  { id: 'extreme', label: '💣 Extremo' },
]

export const DRINK_ESPECIAL_TYPES = [
  { id: 'agent', label: '🕵️ Agente Secreto' },
  { id: 'impostor', label: '🎭 Impostor' },
  { id: 'alliance', label: '🤝 Aliança' },
  { id: 'miniboss', label: '👹 Mini Boss' },
]

export const DRINK_BARALHO_PLACEHOLDERS = {
  waterfall: 'Ex: O jogador com o aniversário mais próximo do teu bebe 2 goles.',
  eununca: 'Ex: EU NUNCA enviei mensagem ao ex que me arrependi. Quem já fez bebe 1 gole.',
  regras: 'Ex: Quem disser «sim» ou «não» bebe 1 gole até ao fim do jogo.',
  caos: 'Ex: Durante 3 rondas, quem disser nomes próprios bebe 1 gole.',
  desafios: 'Ex: Pedra-papel-tesoura com o jogador à tua esquerda. Perdedor bebe 3 goles.',
  cadeia: 'Ex: Tema: géneros musicais. Começa quem tirou a carta, sentido horário. Quem repetir ou travar bebe 2 goles.',
  historia: 'Ex: Começa: «Era uma vez numa festa…» Cada um acrescenta UMA frase. Quem travar bebe 2 goles.',
  provavel: 'Ex: Quem é mais provável de adormecer primeiro? Contagem 3-2-1 — apontem! Quem receber mais dedos bebe 2 goles.',
  bluff: 'Ex: Conta uma história verdade ou mentira. Grupo vota. Enganas todos → distribuis 3 goles. Descobrem-te → bebes 3 goles.',
  maldicao: 'Ex: Amaldiçoado: só frases de 3 palavras. Passa a maldição a quem te fizer rir.',
  picante: 'Ex: Revela o crush mais embaraçoso da tua vida. Ou bebe 3 goles.',
  poder: 'Ex: Distribui 4 goles como quiseres pelo grupo.',
  preferias: 'Minoritários bebem 2 goles. Empate = todos bebem 1 gole.',
  extreme: 'Ex: Bebe 3 goles ou responde à pergunta mais incómoda que o grupo inventar.',
  alliance: 'Ex: Dupla com o jogador à tua direita. Se um beber, o outro bebe metade.',
  miniboss: 'Ex: Em 25 segundos, nomeiem 12 programas de TV portugueses. Sucesso → mesa distribui 6 goles. Falha → mesa bebe 6 goles.',
}

export function drinkBaralhoLabel(id) {
  return DRINK_BARALHOS.find((b) => b.id === id)?.label
    || DRINK_ESPECIAL_TYPES.find((b) => b.id === id)?.label
    || id
}

/** Label oficial na UI (mesmo que a BD ainda tenha nome antigo). Mantém label da BD se não houver entrada oficial. */
export function normalizeDrinkCategories(categories) {
  return (categories || []).map((cat) => {
    const official = DRINK_BARALHOS.find((b) => b.id === cat.id)?.label
      || DRINK_ESPECIAL_TYPES.find((b) => b.id === cat.id)?.label
    return official ? { ...cat, label: official } : cat
  })
}

/** Baralhos escolhíveis no setup (Comunidade usa o toggle à parte). */
export function selectableDrinkCategories(categories) {
  return normalizeDrinkCategories(categories).filter((cat) => cat.id !== 'comunidade')
}
