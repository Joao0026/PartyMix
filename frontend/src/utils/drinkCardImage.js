/** URL de imagem opcional numa carta Modo Beber (public/cards ou URL externa). */
export function drinkCardImageSrc(image) {
  const raw = String(image || '').trim()
  if (!raw) return ''

  if (/^https?:\/\//i.test(raw)) return raw

  if (raw.startsWith('/')) return raw

  return `/cards/${raw.replace(/^\.?\/?(?:cards?\/)?/, '')}`
}
