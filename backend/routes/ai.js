// routes/ai.js — Groq AI integration (server-side, key never exposed)
const fetch = require('node-fetch')
const router = require('express').Router()

const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions'

async function callGroq(prompt) {
  const key = process.env.GROQ_API_KEY
  if (!key) throw new Error('GROQ_API_KEY not configured')

  const res = await fetch(GROQ_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant', // free, very fast
      max_tokens: 400,
      temperature: 0.9,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Groq error: ${err}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() || ''
}

// POST /api/ai/drink-cards
// Body: { players: [{name, drink}], lang: 'pt'|'es'|'en' }
router.post('/drink-cards', async (req, res) => {
  try {
    const { players = [], lang = 'pt' } = req.body
    if (!players.length) return res.status(400).json({ error: 'No players provided' })

    const playerList = players.map(p => `${p.name} (${p.drink || 'bebida não especificada'})`).join(', ')
    const names = players.map(p => p.name)

    const prompts = {
      pt: `Gera 4 cartas de jogo de beber engraçadas e personalizadas em português de Portugal.
Jogadores e bebidas: ${playerList}

Regras:
- Usa os nomes e bebidas dos jogadores de forma criativa e engraçada
- Tom irreverente, situações do quotidiano português
- Máximo 20 palavras por carta
- Exemplos de bom formato: "Um gole desse Gin ${names[0]}, siga siga!" ou "${names[0]} e o teu vinho — bebe 2 quando tentares impressionar alguém!"
- NÃO uses aspas no texto final
- Responde APENAS com um array JSON de 4 strings, sem texto extra, sem markdown

["carta1","carta2","carta3","carta4"]`,

      en: `Generate 4 funny personalized drinking game cards in English.
Players and drinks: ${playerList}

Rules:
- Use player names and drinks creatively
- Fun, irreverent tone
- Max 20 words per card
- No quotes inside the card text
- Reply ONLY with a JSON array of 4 strings, nothing else

["card1","card2","card3","card4"]`,

      es: `Genera 4 tarjetas de juego de beber divertidas y personalizadas en español.
Jugadores y bebidas: ${playerList}

Reglas:
- Usa los nombres y bebidas de forma creativa y divertida
- Tono irreverente, situaciones cotidianas
- Máximo 20 palabras por tarjeta
- Sin comillas dentro del texto
- Responde SOLO con un array JSON de 4 strings, sin nada más

["tarjeta1","tarjeta2","tarjeta3","tarjeta4"]`
    }

    const raw = await callGroq(prompts[lang] || prompts.pt)
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
// Body: { players: string[], mode: string, lang: string }
router.post('/challenge', async (req, res) => {
  try {
    const { players = [], mode = 'friends', lang = 'pt' } = req.body

    const prompt = `Gera 1 desafio de jogo de festa criativo e engraçado em português de Portugal.
Jogadores: ${players.join(', ')}.
Modo: ${mode}.
O desafio deve ser físico, verbal ou criativo — nunca violento ou ofensivo.
Máximo 25 palavras.
Responde APENAS com o texto do desafio, sem explicação, sem aspas.`

    const text = await callGroq(prompt)
    res.json({ text: text.replace(/^["']|["']$/g, '') })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
