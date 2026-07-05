/** Parâmetros de pack para API (base + comunidade opcional) */
export function challengePackParams(contentPack, includeCommunity) {
  const pack = contentPack || 'base'
  const params = { pack }
  if (includeCommunity) params.include_community = 'true'
  return params
}
