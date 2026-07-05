/** Contrações PT (m / f / desconhecido) para placeholders com sufixo _a, _de, etc. */
const PT_FORMS = {
  a: { m: (n) => `ao ${n}`, f: (n) => `à ${n}`, x: (n) => `a ${n}` },
  de: { m: (n) => `do ${n}`, f: (n) => `da ${n}`, x: (n) => `de ${n}` },
  com: { m: (n) => `com o ${n}`, f: (n) => `com a ${n}`, x: (n) => `com ${n}` },
  pelo: { m: (n) => `pelo ${n}`, f: (n) => `pela ${n}`, x: (n) => `por ${n}` },
  no: { m: (n) => `no ${n}`, f: (n) => `na ${n}`, x: (n) => `em ${n}` },
  o: { m: (n) => `o ${n}`, f: (n) => `a ${n}`, x: (n) => n },
}

function genderKey(gender) {
  if (gender === 'm' || gender === 'f') return gender
  return 'x'
}

function playerRef(list, slot) {
  if (slot === 'reader') return null
  const idx = slot - 1
  if (idx < 0 || idx >= list.length) return null
  const p = list[idx]
  if (typeof p === 'string') return { name: p.trim() || null, gender: null }
  const name = String(p?.name || '').trim()
  return name ? { name, gender: p?.gender ?? null } : null
}

function formatContracted(suffix, name, gender, fallback) {
  const form = PT_FORMS[suffix.toLowerCase()]
  if (!form) return fallback
  if (!name) return fallback
  return form[genderKey(gender)](name)
}

/**
 * Substitui placeholders de jogador no texto das cartas Beber.
 * player1 = 1.º jogador no setup, reader = quem tirou a carta nesta ronda.
 * Com sufixo de género (requer ♂/♀ no setup): reader_a → ao João / à Maria / a Ana (sem género).
 */
export function substitutePlayerTokens(text, players, { reader, readerGender } = {}) {
  if (text == null || text === '') return text
  const list = Array.isArray(players) ? players : []
  const readerName = String(reader || '').trim() || null
  const readerLabel = readerName || 'reader'

  const resolveSlot = (who) => {
    if (who.toLowerCase() === 'reader') {
      return { name: readerName, gender: readerGender ?? null }
    }
    const num = parseInt(who.replace(/^player/i, ''), 10)
    return playerRef(list, num) || { name: null, gender: null }
  }

  let out = String(text)

  // reader_a, player3_de, {reader_a}, …
  out = out.replace(/\{(reader|player\d{1,2})_([a-z]+)\}/gi, (full, who, suffix) => {
    const ref = resolveSlot(who)
    return formatContracted(suffix, ref.name, ref.gender, full.slice(1, -1))
  })
  out = out.replace(/\b(reader|player\d{1,2})_([a-z]+)\b/gi, (full, who, suffix) => {
    const ref = resolveSlot(who)
    return formatContracted(suffix, ref.name, ref.gender, full)
  })

  out = out.replace(/\{reader\}/gi, readerLabel)
  out = out.replace(/\{player(\d{1,2})\}/gi, (_, num) => {
    const ref = playerRef(list, parseInt(num, 10))
    return ref?.name || `player${num}`
  })
  out = out.replace(/\breader\b/gi, readerLabel)
  out = out.replace(/\bplayer(\d{1,2})\b/gi, (_, num) => {
    const ref = playerRef(list, parseInt(num, 10))
    return ref?.name || `player${num}`
  })

  return out
}
