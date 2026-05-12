const rateLimit = require('express-rate-limit')

/** Groq / IA — evita abuso e custos. */
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados pedidos de IA. Tenta daqui a um minuto.' },
})

/** Submissões e votos na comunidade (POST/PATCH). */
const communityWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET',
  message: { error: 'Demasiadas ações na comunidade. Tenta daqui a um minuto.' },
})

module.exports = { aiLimiter, communityWriteLimiter }
