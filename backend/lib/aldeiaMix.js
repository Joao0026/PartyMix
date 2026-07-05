/** AldeiaMix — papéis, noite/dia, vitória */

const ROLE_LABELS = {
  aldeao: 'Aldeão',
  lobo: 'Lobo',
  curandeira: 'Beijoqueira/o',
  vidente: 'Xerife',
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function defaultSettings() {
  return {
    numLobos: 1,
    numCurandeiras: 1,
    numVidentes: 1,
    discussionSeconds: 120,
    nightSeconds: 60,
  }
}

function validateSettings(settings, totalPlayers) {
  const s = { ...defaultSettings(), ...settings }
  s.numLobos = Math.max(0, Math.min(5, Number(s.numLobos) || 0))
  s.numCurandeiras = Math.max(0, Math.min(3, Number(s.numCurandeiras) || 0))
  s.numVidentes = Math.max(0, Math.min(3, Number(s.numVidentes) || 0))
  s.discussionSeconds = [60, 90, 120, 180].includes(Number(s.discussionSeconds))
    ? Number(s.discussionSeconds) : 120
  s.nightSeconds = [45, 60, 90].includes(Number(s.nightSeconds))
    ? Number(s.nightSeconds) : 60

  const playingSlots = Math.max(0, totalPlayers - 1)
  const specials = s.numLobos + s.numCurandeiras + s.numVidentes
  if (totalPlayers < 4) return { ok: false, error: 'Precisas de pelo menos 4 jogadores (3 + narrador)' }
  if (playingSlots < 3) return { ok: false, error: 'Precisas de pelo menos 3 jogadores além do narrador' }
  if (specials >= playingSlots) return { ok: false, error: 'Demasiados papéis especiais para este número de jogadores' }
  if (s.numLobos < 1) return { ok: false, error: 'Precisas de pelo menos 1 lobo' }
  return { ok: true, settings: s }
}

function assignRoles(playerNames, settings) {
  const names = playerNames.filter((n) => String(n).trim())
  const { numLobos, numCurandeiras, numVidentes } = settings
  const indices = shuffle(Array.from({ length: names.length }, (_, i) => i))
  const roleMap = {}
  let ptr = 0
  for (let i = 0; i < numLobos; i++) roleMap[indices[ptr++]] = 'lobo'
  for (let i = 0; i < numCurandeiras; i++) roleMap[indices[ptr++]] = 'curandeira'
  for (let i = 0; i < numVidentes; i++) roleMap[indices[ptr++]] = 'vidente'
  for (let i = 0; i < names.length; i++) {
    if (!roleMap[i]) roleMap[i] = 'aldeao'
  }
  return names.map((name, i) => ({
    name: String(name).trim(),
    origIdx: i,
    role: roleMap[i],
  }))
}

function assignRolesForRoom(playerNames, narratorIdx, settings) {
  const names = playerNames.filter((n) => String(n).trim())
  const roles = names.map((name, i) => ({
    name: String(name).trim(),
    origIdx: i,
    role: 'narrador',
    isNarrator: i === narratorIdx,
  }))
  const playing = names
    .map((name, i) => ({ name, i }))
    .filter(({ i }) => i !== narratorIdx)
  const assigned = assignRoles(playing.map((p) => p.name), settings)
  playing.forEach(({ i }, j) => {
    roles[i] = { ...assigned[j], isNarrator: false }
  })
  return roles
}

function checkEndCondition(roles, eliminated) {
  const alive = roles.filter((r, i) => !eliminated.includes(i) && r.role !== 'narrador' && !r.isNarrator)
  const wolves = alive.filter((r) => r.role === 'lobo').length
  const villagers = alive.filter((r) => r.role !== 'lobo').length
  if (wolves === 0) return 'aldeoes_win'
  if (wolves >= villagers) return 'lobos_win'
  return null
}

function playersWithRole(roles, eliminated, role) {
  return roles
    .map((r, i) => ({ ...r, origIdx: i }))
    .filter((r) => r.role === role && !eliminated.includes(r.origIdx))
}

function resolveNightFromNarrator(wolfTarget, medicTarget, eliminated) {
  let killed = null
  const wt = Number.isInteger(wolfTarget) ? wolfTarget : null
  const mt = Number.isInteger(medicTarget) ? medicTarget : null
  if (wt != null && wt !== mt && !eliminated.includes(wt)) killed = wt
  return {
    killed,
    wolfTarget: wt,
    medicTarget: mt,
    saved: wt != null && wt === mt,
  }
}

function resolveNight(room) {
  const na = room.narratorNight || {}
  return resolveNightFromNarrator(na.wolfTarget, na.medicTarget, room.eliminated)
}

function computeVoteCounts(votes, roles, eliminated) {
  const counts = {}
  if (!votes) return counts
  for (const [voterName, targetIdx] of Object.entries(votes)) {
    const voterIdx = roles.findIndex((r) => r.name === voterName)
    if (voterIdx < 0 || eliminated.includes(voterIdx)) continue
    const t = Number(targetIdx)
    if (!Number.isInteger(t) || eliminated.includes(t)) continue
    counts[t] = (counts[t] || 0) + 1
  }
  return counts
}

function isVoteTie(counts) {
  let max = 0
  let leaders = 0
  for (const c of Object.values(counts)) {
    const n = Number(c) || 0
    if (n > max) {
      max = n
      leaders = 1
    } else if (n === max && n > 0) {
      leaders += 1
    }
  }
  return max > 0 && leaders > 1
}

/** Vencedor único ou null (empate ou zero votos). */
function pickMostVoted(counts) {
  if (isVoteTie(counts)) return null
  let max = 0
  let winner = null
  for (const [idx, c] of Object.entries(counts)) {
    const n = Number(idx)
    const votes = Number(c) || 0
    if (votes > max) {
      max = votes
      winner = n
    }
  }
  return max > 0 ? winner : null
}

module.exports = {
  ROLE_LABELS,
  defaultSettings,
  validateSettings,
  assignRoles,
  assignRolesForRoom,
  checkEndCondition,
  playersWithRole,
  resolveNight,
  resolveNightFromNarrator,
  computeVoteCounts,
  isVoteTie,
  pickMostVoted,
}
