const crypto = require('crypto')
const {
  REPORT_KINDS,
  REPORT_STATUSES,
  MAX_DETAILS,
  REPORT_TTL_MS,
  hashReporter,
  normalizeReason,
  uniqueReportKey,
  canCreateReport,
  applyReview,
} = require('./ugcPolicy')

const reports = new Map()
const blocks = new Map()
const hiddenTargets = new Set()

function resetUgcStore() {
  reports.clear()
  blocks.clear()
  hiddenTargets.clear()
}

function blockKey(kind, targetId, reporterId) {
  return `${kind}\t${String(targetId || '')}\t${String(reporterId || '')}`
}

function targetKey(kind, targetId) {
  return `${kind}\t${String(targetId || '')}`
}

function pruneExpired(now = Date.now()) {
  for (const [id, row] of reports.entries()) {
    if ((row.createdAtMs || 0) + REPORT_TTL_MS < now) reports.delete(id)
  }
  return reports.size
}

function publicReport(row) {
  if (!row) return null
  return {
    id: row.id,
    kind: row.kind,
    targetId: row.targetId,
    reason: row.reason,
    details: row.details,
    status: row.status,
    roomHash: row.roomHash,
    reporterHash: row.reporterHash,
    createdAt: row.createdAt,
    reviewedAt: row.reviewedAt || null,
  }
}

function listReports({ status } = {}) {
  pruneExpired()
  const rows = [...reports.values()].sort((a, b) => b.createdAtMs - a.createdAtMs)
  const filtered = status && REPORT_STATUSES.includes(status)
    ? rows.filter((r) => r.status === status)
    : rows
  return filtered.map(publicReport)
}

function pendingCount() {
  pruneExpired()
  let n = 0
  for (const row of reports.values()) {
    if (row.status === 'pending') n += 1
  }
  return n
}

function isBlockedFor(reporterId, kind, targetId) {
  if (!reporterId || !targetId) return false
  if (hiddenTargets.has(targetKey(kind, targetId))) return true
  return blocks.has(blockKey(kind, targetId, reporterId))
}

function isHiddenTarget(kind, targetId) {
  return hiddenTargets.has(targetKey(kind, targetId))
}

function blockedIdsFor(reporterId, kind) {
  const ids = new Set()
  if (!reporterId) return ids
  const suffix = `\t${String(reporterId)}`
  const prefix = `${kind}\t`
  for (const key of blocks.keys()) {
    if (!key.startsWith(prefix) || !key.endsWith(suffix)) continue
    const targetId = key.slice(prefix.length, key.length - suffix.length)
    if (targetId) ids.add(targetId)
  }
  for (const key of hiddenTargets) {
    if (key.startsWith(prefix)) ids.add(key.slice(prefix.length))
  }
  return ids
}

function hiddenIds(kind) {
  const ids = new Set()
  const prefix = `${kind}\t`
  for (const key of hiddenTargets) {
    if (key.startsWith(prefix)) ids.add(key.slice(prefix.length))
  }
  return ids
}

function blockForReporter(kind, targetId, reporterId) {
  if (!REPORT_KINDS.includes(kind) || !targetId || !reporterId) return false
  blocks.set(blockKey(kind, targetId, reporterId), Date.now())
  return true
}

function hideTarget(kind, targetId) {
  if (!kind || !targetId) return false
  hiddenTargets.add(targetKey(kind, targetId))
  return true
}

function createReport({
  kind,
  targetId,
  reporterId,
  reason,
  details = '',
  roomHash = '',
  now = Date.now(),
} = {}) {
  if (!REPORT_KINDS.includes(kind)) return { ok: false, error: 'Tipo inválido' }
  const tid = String(targetId || '').trim().slice(0, 80)
  if (!tid) return { ok: false, error: 'Alvo inválido' }
  const rid = String(reporterId || '').trim()
  if (!rid) return { ok: false, error: 'Identidade em falta' }
  const why = normalizeReason(reason)
  if (!why) return { ok: false, error: 'Motivo inválido' }

  const key = uniqueReportKey(kind, tid, rid)
  for (const row of reports.values()) {
    if (uniqueReportKey(row.kind, row.targetId, row.reporterId) === key) {
      blockForReporter(kind, tid, rid)
      return { ok: false, error: 'Já denunciaste este conteúdo', code: 'already_reported', blocked: true }
    }
  }

  const mine = [...reports.values()].filter((r) => r.reporterId === rid)
  const rate = canCreateReport({ existingForReporter: mine, reporterId: rid, now })
  if (!rate.ok) return rate

  const id = crypto.randomUUID()
  const row = {
    id,
    kind,
    targetId: tid,
    reporterId: rid,
    reporterHash: hashReporter(rid),
    reason: why,
    details: String(details || '').trim().slice(0, MAX_DETAILS),
    status: 'pending',
    roomHash: roomHash ? String(roomHash).slice(0, 24) : '',
    createdAtMs: now,
    createdAt: new Date(now).toISOString(),
    reviewedAt: null,
  }
  reports.set(id, row)
  blockForReporter(kind, tid, rid)
  persist(row)
  return { ok: true, report: publicReport(row), blocked: true }
}

function reviewReport(id, action, { now = Date.now() } = {}) {
  const row = reports.get(String(id || ''))
  if (!row) return { ok: false, error: 'Denúncia não encontrada' }
  const next = applyReview(row, action)
  if (!next.ok) return next
  row.status = next.status
  row.reviewedAt = new Date(now).toISOString()
  if (next.hide) hideTarget(row.kind, row.targetId)
  persist(row)
  return {
    ok: true,
    report: publicReport(row),
    hide: next.hide,
    remove: next.remove,
    kind: row.kind,
    targetId: row.targetId,
  }
}

function persist(row) {
  try {
    const mongoose = require('mongoose')
    if (mongoose.connection.readyState !== 1) return
    const ContentReport = require('../models/ContentReport')
    ContentReport.updateOne(
      { reportId: row.id },
      {
        reportId: row.id,
        kind: row.kind,
        targetId: row.targetId,
        reason: row.reason,
        details: row.details,
        status: row.status,
        roomHash: row.roomHash,
        reporterHash: row.reporterHash,
        createdAt: row.createdAt,
        reviewedAt: row.reviewedAt,
      },
      { upsert: true }
    ).catch(() => {})
  } catch { /* mongo optional */ }
}

async function hydrateFromMongo() {
  try {
    const mongoose = require('mongoose')
    if (mongoose.connection.readyState !== 1) return 0
    const ContentReport = require('../models/ContentReport')
    const rows = await ContentReport.find({}).lean()
    for (const doc of rows) {
      if (!doc.reportId || reports.has(doc.reportId)) continue
      reports.set(doc.reportId, {
        id: doc.reportId,
        kind: doc.kind,
        targetId: doc.targetId,
        reporterId: '',
        reporterHash: doc.reporterHash,
        reason: doc.reason,
        details: doc.details || '',
        status: doc.status || 'pending',
        roomHash: doc.roomHash || '',
        createdAtMs: doc.createdAt ? new Date(doc.createdAt).getTime() : Date.now(),
        createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
        reviewedAt: doc.reviewedAt || null,
      })
      if (doc.status === 'hidden' || doc.status === 'removed') {
        hideTarget(doc.kind, doc.targetId)
      }
    }
    return reports.size
  } catch {
    return 0
  }
}

module.exports = {
  resetUgcStore,
  pruneExpired,
  listReports,
  pendingCount,
  isBlockedFor,
  isHiddenTarget,
  blockedIdsFor,
  hiddenIds,
  blockForReporter,
  hideTarget,
  createReport,
  reviewReport,
  publicReport,
  hydrateFromMongo,
}
