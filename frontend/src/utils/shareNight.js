export async function shareNight({ title, text }) {
  const payload = { title: title || 'PartyMix', text: String(text || '').trim() }
  if (!payload.text) return false
  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share(payload)
      return 'shared'
    }
  } catch (err) {
    if (err?.name === 'AbortError') return false
  }
  try {
    await navigator.clipboard.writeText(payload.text)
    return 'copied'
  } catch {
    return false
  }
}
