const mongoose = require('mongoose')
const { startedAt } = require('./runtime')
const { WS_POLICY, instanceId } = require('./wsPolicy')
const { onlineFlags } = require('./featureFlags')

function healthPayload() {
  return {
    status: 'ok',
    startedAt,
    wsPolicy: WS_POLICY,
    instanceId: instanceId(),
    roomsEphemeral: true,
  }
}

function readyPayload(roomCounts = {}, env = process.env) {
  const dbReady = mongoose.connection.readyState === 1
  return {
    ready: dbReady,
    db: dbReady ? 'connected' : 'disconnected',
    startedAt,
    wsPolicy: WS_POLICY,
    instanceId: instanceId(env),
    roomsEphemeral: true,
    rooms: {
      cards: roomCounts.cards || 0,
      mw: roomCounts.mw || 0,
      aldeia: roomCounts.aldeia || 0,
      mememix: roomCounts.mememix || 0,
    },
    online: onlineFlags(env),
  }
}

module.exports = { healthPayload, readyPayload }
