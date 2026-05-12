// routes/ai.js — Groq AI integration (server-side, key never exposed)
// Node 18+ tem fetch nativo; node-fetch v3 não é compatível com require().
const fetchFn = typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : null
const router = require('express').Router()

const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant'

/** Cartas IA (endpoint legado) — PT */
const SYSTEM_DRINK_CARDS_PT = `És o escritor de cartas do PartyMix (jogos de festa, Portugal).
- Português de Portugal, tom divertido entre amigos.
- Cada carta = uma instrução clara: quem bebe, quantos golos, brinde, ou mini-regra imediata. Máx. 20 palavras por carta.
- Usa SÓ os nomes que o utilizador listar (exactos); não inventes nomes de pessoas.
- Usa bebidas indicadas quando existirem; não inventes marcas para quem não tenha bebida.
Proibido: violência, crime, ódio, discriminação, conteúdo sexual explícito, conduzir ou máquinas, contacto físico íntimo sem consentimento.
Output: APENAS um array JSON com exatamente 4 strings. Sem markdown, sem texto antes ou depois.`

/** Desafio surpresa — Modo Beber (uso atual na app) */
const SYSTEM_DRINK_SURPRISE_PT = `És o gerador de "desafios surpresa" do PartyMix — Modo Beber, em Portugal.

Objetivo
- Uma única instrução que o grupo consiga fazer na sala na próxima volta, sem apps, sem preparação elaborada e sem sair de casa.

Língua
- Português EUROPEU de Portugal (informal de festa entre amigos).
- Preferir "tu", "ti", "cada um", "toda a gente" a construções tipicamente brasileiras; evita "você" se puderes reformular.
- Vocabulário natural em Portugal quando couber: "golo/golos", "telemóvel", "fixe", etc.

NOMES — regra absoluta
- O utilizador envia a lista EXACTA de nomes. Se te referires a pessoas, SÓ podes usar nomes dessa lista, escritos exactamente como lá vêm (mesmo que sejam números, uma letra, ou um apelido curto).
- É PROIBIDO inventar nomes próprios, convidados fictícios ou "nomes típicos" (ex.: não uses Rosa, Carlos, Ana, etc., se não estiverem na lista).
- Não cries uma "terceira pessoa" com nome inventado. Para envolver o grupo inteiro: "toda a gente", "cada um", "quem quiser", ou escolhe alguém da lista pelo nome EXACTO.

Estilo e formato
- 1–2 frases curtas, no máximo 34 palavras, voz directa (imperativo ou mini-cena).
- Quando fizer sentido, diz os golos (ex.: bebe 1, distribui 3, toda a gente 1 golo).

Bebidas
- Se o utilizador listar bebidas por jogador, podes mencioná-las só em relação a quem tem bebida indicada. Se não houver bebidas, não inventes marcas nem bebidas atribuídas a nomes.

Variedade (não cries sempre o mesmo tipo)
- Verbal: categorias, rima, "eu nunca...", palavra proibida por 1 minuto.
- Social rápido: polegar na mesa, PPT melhor de 1, "último a...".
- Regra absurda por 2 minutos que se cumpra sentados.

Proibido
Violência, crime, ódio, discriminação, conteúdo sexual explícito, humilhação grave, conduzir ou tarefas inseguras, magoar alguém, ou contacto físico íntimo sem consentimento claro.

Output
Só o texto do desafio. Sem título, sem "aqui está:", sem aspas à volta, sem markdown.`

/** Desafio festa — outros modos */
const SYSTEM_PARTY_CHALLENGE_PT = `PartyMix — desafios curtos de festa em português de Portugal.
Uma instrução jogável em 1–2 frases, máximo 34 palavras. Tom amigável.
NOMES: só podes usar nomes que o utilizador listar, exactamente como escritos; é proibido inventar nomes.
Proibido: violência, crime, ódio, discriminação, conteúdo sexual explícito.
Output: só o desafio, sem título nem aspas.`

const SYSTEM_DRINK_CARDS_EN = `Write 4 short drinking-game lines for PartyMix. Max 20 words each. JSON array of 4 strings only. Fun tone. No violence, hate, explicit sex, drunk driving.`

const SYSTEM_DRINK_CARDS_ES = `Escribe 4 tarjetas cortas para un juego de beber (PartyMix). Máx. 20 palabras cada una. Solo un array JSON de 4 strings. Sin violencia, odio, sexo explícito, conducir borracho.`

async function callGroq(userContent, { system } = {}) {
  if (!fetchFn) throw new Error('Global fetch not available — usa Node.js 18+ no servidor (Render: defina versão Node ≥ 18).')
  const key = process.env.GROQ_API_KEY
  if (!key) throw new Error('GROQ_API_KEY not configured')

  const messages = system
    ? [
        { role: 'system', content: system },
        { role: 'user', content: userContent },
      ]
    : [{ role: 'user', content: userContent }]

  const res = await fetchFn(GROQ_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: 400,
      temperature: 0.88,
      messages,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Groq error: ${err}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() || ''
}

/** Aceita players: string[] OU { name, drink? }[] */
function rosterFromPlayersField(players) {
  if (!Array.isArray(players) || players.length === 0) return []
  const first = players[0]
  if (typeof first === 'object' && first !== null && 'name' in first) {
    return players
      .map((p) => ({
        name: String(p?.name ?? '').trim(),
        drink: String(p?.drink ?? '').trim(),
      }))
      .filter((r) => r.name)
  }
  return players.map((n) => ({ name: String(n ?? '').trim(), drink: '' })).filter((r) => r.name)
}

// POST /api/ai/drink-cards
// Body: { players: [{name, drink}], lang: 'pt'|'es'|'en' }
router.post('/drink-cards', async (req, res) => {
  try {
    const { players = [], lang = 'pt' } = req.body
    if (!players.length) return res.status(400).json({ error: 'No players provided' })

    const playerList = players.map(p => `${p.name} (${p.drink || 'bebida não especificada'})`).join(', ')
    const names = players.map(p => p.name)

    const userPrompts = {
      pt: `Jogadores e bebidas: ${playerList}

Gera 4 cartas diferentes (varia: brinde, regra rápida, "último a...", distribuir golos, mini-duelo verbal).
Exemplos de estilo (não copies): Um gole desse gin ${names[0]}, siga! | ${names[1] || names[0]} distribui 3 golos como quiseres. | Último a tocar no teto bebe 2.

Responde só com JSON neste formato:
["...","...","...","..."]`,

      en: `Players and drinks: ${playerList}

Generate 4 different cards. Reply ONLY with a JSON array of 4 strings, nothing else.

["card1","card2","card3","card4"]`,

      es: `Jugadores y bebidas: ${playerList}

Genera 4 tarjetas distintas. Responde SOLO con un array JSON de 4 strings.

["tarjeta1","tarjeta2","tarjeta3","tarjeta4"]`,
    }

    const systemByLang = { pt: SYSTEM_DRINK_CARDS_PT, en: SYSTEM_DRINK_CARDS_EN, es: SYSTEM_DRINK_CARDS_ES }
    const langKey = ['pt', 'en', 'es'].includes(lang) ? lang : 'pt'
    const raw = await callGroq(userPrompts[langKey], { system: systemByLang[langKey] })
    // Strip any markdown fences if model adds them
    const clean = raw.replace(/```json|```/g, '').trim()
    const cards = JSON.parse(clean)

    if (!Array.isArray(cards)) throw new Error('Invalid response format')

    res.json({
      cards: cards.filter(Boolean).map(text => ({
        text: String(text),
        type: 'ai',
        emoji: '🤖',
        title: 'Carta IA',
        is_ai: true,
      }))
    })
  } catch (err) {
    console.error('AI error:', err.message)
    // Return fallback cards — never fail the user
    const { players = [] } = req.body
    const names = players.map(p => p.name)
    const drinks = players.map(p => p.drink).filter(Boolean)
    res.json({
      cards: [
        { text: `${names[0] || 'Jogador 1'}, um gole de ${drinks[0] || 'bebida'} agora — siga siga!`, type:'ai', emoji:'🤖', title:'Carta IA', is_ai:true },
        { text: `Brinde ao ${names[Math.floor(Math.random()*names.length)] || 'grupo'}! Toda a gente bebe 1!`, type:'ai', emoji:'🤖', title:'Carta IA', is_ai:true },
        { text: `${names[1] || names[0] || 'Jogador'} distribui 2 golos como quiser. Poder!`, type:'ai', emoji:'🤖', title:'Carta IA', is_ai:true },
        { text: `Quem tem ${drinks[0] || 'a bebida'} mais fraca bebe 2!`, type:'ai', emoji:'🤖', title:'Carta IA', is_ai:true },
      ],
      fallback: true,
    })
  }
})

// POST /api/ai/challenge
// Body: { players: string[] | { name, drink? }[], mode, lang }
router.post('/challenge', async (req, res) => {
  try {
    const { players: playersField = [], mode = 'friends', lang = 'pt' } = req.body
    const roster = rosterFromPlayersField(playersField)
    if (!roster.length) return res.status(400).json({ error: 'At least one player name required' })

    const listaExacta = roster.map((r) => `«${r.name}»`).join(', ')
    const drinkBlock = roster.some((r) => r.drink)
      ? `Bebidas indicadas (só menciona quando fizer sentido; não inventes bebidas para quem não tenha linha):\n${roster
          .filter((r) => r.drink)
          .map((r) => `- «${r.name}»: ${r.drink}`)
          .join('\n')}`
      : 'Não há bebidas indicadas; não inventes marcas nem bebidas atribuídas a pessoas específicas.'

    const userPt = `NOMES VÁLIDOS (única fonte de nomes próprios no desafio — copia literalmente se falares com alguém): ${listaExacta}

${drinkBlock}

Gera UM desafio surpresa: imediato, em grupo, jogável na sala agora. Sem meta-comentários.`

    let text
    if (lang === 'pt') {
      const system = mode === 'drink' ? SYSTEM_DRINK_SURPRISE_PT : SYSTEM_PARTY_CHALLENGE_PT
      const user =
        mode === 'drink'
          ? userPt
          : `Modo (etiqueta): ${mode}.
NOMES VÁLIDOS: ${listaExacta}
${drinkBlock}
Gera UM desafio de festa criativo e inclusivo.`
      text = await callGroq(user, { system })
    } else {
      const rosterEn = roster.map((r) => `${r.name}${r.drink ? ` (${r.drink})` : ''}`).join(', ')
      let prompt
      if (lang === 'en') {
        prompt = `Players (use ONLY these exact names if you name people; do not invent names): ${rosterEn}.
${mode === 'drink' ? 'One short playable drinking-game challenge for the room.' : `Party mode: ${mode}. One short challenge.`}
Max 34 words. ONLY the challenge text, no quotes.`
      } else if (lang === 'es') {
        prompt = `Jugadores (usa SOLO estos nombres exactos si nombras a alguien; no inventes nombres): ${rosterEn}.
${mode === 'drink' ? 'Un reto corto de beber, jugable ya en el grupo.' : `Modo fiesta: ${mode}. Un reto corto.`}
Máximo 34 palabras. SOLO el texto del reto, sin comillas.`
      } else {
        prompt = `Players (ONLY these exact names; no invented names): ${rosterEn}.
One short party challenge. Max 34 words. ONLY the challenge text, no quotes.`
      }
      text = await callGroq(prompt)
    }

    res.json({ text: text.replace(/^["']|["']$/g, '').trim() })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
