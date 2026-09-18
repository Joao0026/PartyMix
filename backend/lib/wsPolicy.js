const os = require('os')
const { startedAt } = require('./runtime')

const WS_POLICY = 'single-instance-sticky'
const STICKY_COOKIE = 'pmx_instance'

function instanceId(env = process.env) {
  return String(env.INSTANCE_ID || `${os.hostname()}:${process.pid}`)
}

function configuredWorkerCount(env = process.env) {
  const n = Number(env.WEB_CONCURRENCY || env.CLUSTER_WORKERS || 1)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1
}

function assertSingleInstance(env = process.env) {
  if (configuredWorkerCount(env) > 1) {
    return {
      ok: false,
      error: 'PartyMix usa WebSocket single-instance sticky. Corre um só processo (WEB_CONCURRENCY=1).',
    }
  }
  return { ok: true, policy: WS_POLICY, instanceId: instanceId(env) }
}

function helloPayload(env = process.env) {
  return {
    startedAt,
    roomsEphemeral: true,
    wsPolicy: WS_POLICY,
    instanceId: instanceId(env),
  }
}

function stickyCookieHeader(env = process.env) {
  const secure = env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${STICKY_COOKIE}=${encodeURIComponent(instanceId(env))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${secure}`
}

function socketServerOptions(corsOrigin) {
  return {
    cors: { origin: corsOrigin, methods: ['GET', 'POST'], credentials: true },
    maxHttpBufferSize: 2e5,
    pingInterval: 25000,
    pingTimeout: 20000,
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: true,
    },
    cookie: {
      name: 'pmx_io',
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
    },
  }
}

module.exports = {
  WS_POLICY,
  STICKY_COOKIE,
  instanceId,
  configuredWorkerCount,
  assertSingleInstance,
  helloPayload,
  stickyCookieHeader,
  socketServerOptions,
}
