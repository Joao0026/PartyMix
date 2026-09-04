const rateLimit = require('express-rate-limit')

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados pedidos de IA. Tenta daqui a um minuto.' },
})

const aiDailyHits = new Map()
const AI_DAILY_MAX = 80

function aiDailyLimiter(req, res, next) {
  const ip = String(req.ip || req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim()
  const day = new Date().toISOString().slice(0, 10)
  const key = `${day}:${ip}`
  const n = (aiDailyHits.get(key) || 0) + 1
  aiDailyHits.set(key, n)
  if (aiDailyHits.size > 20_000) {
    const prefix = `${day}:`
    for (const k of aiDailyHits.keys()) {
      if (!k.startsWith(prefix)) aiDailyHits.delete(k)
    }
  }
  if (n > AI_DAILY_MAX) {
    return res.status(429).json({ error: 'Limite diário de IA atingido. Tenta amanhã.' })
  }
  return next()
}

const communityWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET',
  message: { error: 'Demasiadas ações na comunidade. Tenta daqui a um minuto.' },
})

const communityVoteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados votos. Tenta daqui a um minuto.' },
})

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas tentativas de login. Espera 15 minutos.' },
})

const lobbyWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados pedidos de sala. Tenta daqui a um minuto.' },
})

module.exports = {
  aiLimiter,
  aiDailyLimiter,
  communityWriteLimiter,
  communityVoteLimiter,
  adminLoginLimiter,
  lobbyWriteLimiter,
  AI_DAILY_MAX,
}
