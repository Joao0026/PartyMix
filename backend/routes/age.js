const router = require('express').Router()
const { asyncRoute, oneOf } = require('../lib/validate')
const { setAgeCookie, clearAgeCookie, readAge } = require('../lib/ageCookie')

router.post('/', asyncRoute(async (req, res) => {
  const age = oneOf(req.body.age, ['18', 'under'], { field: 'age', required: true })
  setAgeCookie(res, age)
  res.json({ ok: true, age })
}))

router.delete('/', asyncRoute(async (req, res) => {
  clearAgeCookie(res)
  res.json({ ok: true, age: null })
}))

router.get('/', (req, res) => {
  res.json({ age: readAge(req) })
})

module.exports = router
