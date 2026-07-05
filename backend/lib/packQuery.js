const { cleanString } = require('./validate')

/** Filtro MongoDB para pack + comunidade opcional */
function buildPackFilter(pack, includeCommunity) {
  const base = cleanString(pack, { defaultValue: 'base', max: 60 }) || 'base'
  const include = includeCommunity === true
    || includeCommunity === 'true'
    || includeCommunity === '1'
  if (include) {
    const packs = [...new Set([base, 'community'])]
    return { $in: packs }
  }
  return base
}

module.exports = { buildPackFilter }
