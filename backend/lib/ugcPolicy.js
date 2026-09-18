const crypto = require('crypto')
const { EVENTS } = require('./observability')

const REPORT_REASONS = [
  'illegal',
  'sexual_minors',
  'hate',
  'harassment',
  'personal_data',
  'spam',
  'other',
]

const REPORT_REASON_LABELS = {
  illegal: 'Conteúdo ilegal',
  sexual_minors: 'Exploração de menores',
  hate: 'Ódio ou discriminação',
  harassment: 'Assédio ou humilhação',
  personal_data: 'Dados pessoais sem consentimento',
  spam: 'Spam ou lixo',
  other: 'Outro',
}

const REPORT_KINDS = ['community', 'mememix']
const REPORT_STATUSES = ['pending', 'dismissed', 'hidden', 'removed']
const REVIEW_ACTIONS = ['dismiss', 'hide', 'remove']

const MAX_DETAILS = 400
const MAX_REPORTS_PER_REPORTER_HOUR = 8
const REPORT_TTL_MS = 30 * 24 * 60 * 60 * 1000

const MM_MAX_BYTES = 2 * 1024 * 1024
const MM_MAX_MEMES_PER_PLAYER = 12
const MM_MAX_MEMES_PER_ROOM = 36
const MM_DEFAULT_MEMES_PER_PLAYER = 8
const MM_ALLOWED_MEMES_PER_PLAYER = [3, 5, 8, 12]

function hashReporter(id, env = process.env) {
  const raw = String(id || '').trim()
  if (!raw) return ''
  const salt = env.ROOM_HASH_SALT || env.JWT_SECRET || 'dev-ugc-hash'
  return crypto.createHash('sha256').update(`${salt}:ugc:${raw}`).digest('hex').slice(0, 16)
}

function normalizeReason(value) {
  const reason = String(value || '').trim()
  if (!REPORT_REASONS.includes(reason)) return null
  return reason
}

function clampMaxMemesPerPlayer(n) {
  const num = Number(n)
  if (!Number.isFinite(num)) return MM_DEFAULT_MEMES_PER_PLAYER
  return Math.min(MM_MAX_MEMES_PER_PLAYER, Math.max(1, Math.round(num)))
}

function assertImageSize(byteLength) {
  const n = Number(byteLength) || 0
  if (n <= 0) return { ok: false, error: 'Imagem inválida' }
  if (n > MM_MAX_BYTES) return { ok: false, error: 'Imagem demasiado grande (máx. 2 MB)' }
  return { ok: true }
}

function uniqueReportKey(kind, targetId, reporterId) {
  return `${kind}:${String(targetId || '')}:${String(reporterId || '')}`
}

function canCreateReport({ existingForReporter = [], reporterId, now = Date.now() } = {}) {
  if (!reporterId) return { ok: false, error: 'Identidade em falta' }
  const hourAgo = now - 60 * 60 * 1000
  const recent = existingForReporter.filter((r) => (r.createdAtMs || 0) >= hourAgo)
  if (recent.length >= MAX_REPORTS_PER_REPORTER_HOUR) {
    return { ok: false, error: 'Demasiadas denúncias. Tenta mais tarde.' }
  }
  return { ok: true }
}

function publicOrigin(env = process.env) {
  const raw = String(env.PUBLIC_ORIGIN || '').trim().replace(/\/$/, '')
  if (/^https:\/\//i.test(raw)) return raw
  return ''
}

function legalPayload(env = process.env) {
  const origin = publicOrigin(env)
  return {
    publicOrigin: origin,
    operatorUrl: origin || 'o URL HTTPS onde jogas',
    privacyPath: '/privacy',
    termsPath: '/terms',
    ageRating: '18+',
    familyMode: true,
    analyticsEvents: EVENTS.slice(),
    ugc: {
      reportReasons: REPORT_REASONS.slice(),
      mmMaxBytes: MM_MAX_BYTES,
      mmMaxMemesPerPlayer: MM_MAX_MEMES_PER_PLAYER,
      mmMaxMemesPerRoom: MM_MAX_MEMES_PER_ROOM,
    },
  }
}

function isExpiredRoomMessage(message) {
  const m = String(message || '')
  return /Sala não encontrada/i.test(m) || /room_not_found/i.test(m)
}

function reconnectBannerCopy({ reconnecting = false, disconnected = false, expired = false } = {}) {
  if (expired) {
    return {
      tone: 'expired',
      title: 'Esta sala já não existe.',
      body: 'O servidor pode ter reiniciado, ou a sala expirou. Cria ou entra noutra sala.',
      action: 'Voltar ao início',
    }
  }
  if (disconnected) {
    return {
      tone: 'disconnected',
      title: 'Ligação perdida.',
      body: 'Tenta outra vez. Se o servidor reiniciou, a sala já não existe.',
      action: 'Tentar',
    }
  }
  if (reconnecting) {
    return {
      tone: 'reconnecting',
      title: 'A reconectar…',
      body: '',
      action: null,
    }
  }
  return null
}

function applyReview(report, action) {
  if (!REPORT_STATUSES.includes(report?.status) && report?.status !== undefined) {
    return { ok: false, error: 'Denúncia inválida' }
  }
  if (!REVIEW_ACTIONS.includes(action)) return { ok: false, error: 'Ação inválida' }
  const next = {
    dismiss: 'dismissed',
    hide: 'hidden',
    remove: 'removed',
  }[action]
  return { ok: true, status: next, hide: action === 'hide' || action === 'remove', remove: action === 'remove' }
}

function filterVisibleItems(items, { hiddenIds = new Set(), blockedIds = new Set() } = {}) {
  return (items || []).filter((item) => {
    const id = String(item?._id || item?.id || '')
    if (!id) return true
    if (hiddenIds.has(id)) return false
    if (blockedIds.has(id)) return false
    return true
  })
}

const REQUIRED_PRIVACY_NEEDLES = [
  '18',
  'álcool',
  'denúncia',
  'bloquear',
  'room_created',
  'retenção',
  'HTTPS',
  'Modo Família',
  '6 horas',
  'MemeMix',
]

const REQUIRED_TERMS_NEEDLES = [
  '18',
  'álcool',
  'denunciar',
  'Modo Família',
  'conteúdo ilegal',
  'Play Store',
  'UGC',
]

module.exports = {
  REPORT_REASONS,
  REPORT_REASON_LABELS,
  REPORT_KINDS,
  REPORT_STATUSES,
  REVIEW_ACTIONS,
  MAX_DETAILS,
  MAX_REPORTS_PER_REPORTER_HOUR,
  REPORT_TTL_MS,
  MM_MAX_BYTES,
  MM_MAX_MEMES_PER_PLAYER,
  MM_MAX_MEMES_PER_ROOM,
  MM_DEFAULT_MEMES_PER_PLAYER,
  MM_ALLOWED_MEMES_PER_PLAYER,
  hashReporter,
  normalizeReason,
  clampMaxMemesPerPlayer,
  assertImageSize,
  uniqueReportKey,
  canCreateReport,
  publicOrigin,
  legalPayload,
  isExpiredRoomMessage,
  reconnectBannerCopy,
  applyReview,
  filterVisibleItems,
  REQUIRED_PRIVACY_NEEDLES,
  REQUIRED_TERMS_NEEDLES,
}
