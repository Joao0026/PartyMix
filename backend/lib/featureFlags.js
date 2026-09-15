const MODE_ENV = {
  cards: 'FEATURE_CARDS_ONLINE',
  aldeia: 'FEATURE_ALDEIA_ONLINE',
  mememix: 'FEATURE_MEMEMIX_ONLINE',
  mw: 'FEATURE_MW_ONLINE',
}

const DISABLED_MESSAGE = 'Este modo online está desligado neste servidor'

function envEnabled(raw) {
  if (raw == null || raw === '') return true
  return !['0', 'false', 'off', 'no'].includes(String(raw).trim().toLowerCase())
}

function isOnlineModeEnabled(mode, env = process.env) {
  const key = MODE_ENV[mode]
  if (!key) return false
  return envEnabled(env[key])
}

function onlineFlags(env = process.env) {
  return {
    cards: isOnlineModeEnabled('cards', env),
    aldeia: isOnlineModeEnabled('aldeia', env),
    mememix: isOnlineModeEnabled('mememix', env),
    mw: isOnlineModeEnabled('mw', env),
  }
}

function assertModeEnabled(mode, env = process.env) {
  if (isOnlineModeEnabled(mode, env)) return { ok: true }
  return { ok: false, error: DISABLED_MESSAGE }
}

function guardSocketMode(socket, mode, env = process.env) {
  const check = assertModeEnabled(mode, env)
  if (check.ok) return true
  socket.emit('error', check.error)
  return false
}

module.exports = {
  MODE_ENV,
  DISABLED_MESSAGE,
  isOnlineModeEnabled,
  onlineFlags,
  assertModeEnabled,
  guardSocketMode,
}
