let startedAt = Date.now()

function currentEpoch() {
  return startedAt
}

function adoptStartedAt(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return
  startedAt = n
}

module.exports = { currentEpoch, adoptStartedAt }
