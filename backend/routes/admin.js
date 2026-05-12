const router = require('express').Router()
const jwt = require('jsonwebtoken')

router.post('/login', (req, res) => {
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) {
    return res.status(503).json({ error: 'ADMIN_PASSWORD not configured on server' })
  }
  const secret = process.env.JWT_SECRET
  if (!secret) {
    return res.status(503).json({ error: 'JWT_SECRET not configured on server' })
  }

  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  if (password !== adminPassword) {
    return res.status(401).json({ error: 'Invalid password' })
  }

  const token = jwt.sign({ role: 'admin' }, secret, { expiresIn: '12h' })
  res.json({ token })
})

module.exports = router
