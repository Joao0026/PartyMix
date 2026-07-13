/**
 * Tokens visuais por modo — fonte única para glow + fundo de jogo.
 *
 * - `glow` → mancha colorida no topo (PageShell / GameShell)
 * - `background` → gradiente do ecrã durante o jogo (GameShell)
 *
 * Uso: `<PageShell mode="drink">` ou `<GameShell mode="friends">`
 */
export const MODE_VISUAL = {
  hub: {
    glow: 'rgba(139,92,246,0.10)',
    background: '#080b14',
  },
  friends: {
    glow: 'rgba(34,211,238,0.14)',
    background: 'radial-gradient(ellipse at 50% 0%, rgba(34,211,238,0.11) 0%, #1e2836 44%, #243044 100%)',
  },
  family: {
    glow: 'rgba(56,189,248,0.12)',
    background: 'radial-gradient(ellipse at 50% 0%, rgba(56,189,248,0.10) 0%, #1e2836 44%, #243044 100%)',
  },
  drink: {
    glow: 'rgba(245,158,11,0.18)',
    background: 'radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.18) 0%, #1e2836 42%, #243044 100%)',
  },
  challenges: {
    glow: 'rgba(139,92,246,0.15)',
    background: 'radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.12) 0%, #1e2836 44%, #243044 100%)',
  },
  couple: {
    glow: 'rgba(244,114,182,0.16)',
    background: 'radial-gradient(ellipse at 50% 0%, rgba(244,114,182,0.13) 0%, #1e2836 44%, #243044 100%)',
  },
  cards: {
    glow: 'rgba(234,179,8,0.16)',
    background: 'radial-gradient(ellipse at 50% 0%, rgba(234,179,8,0.12) 0%, #1e2836 44%, #243044 100%)',
  },
  mememix: {
    glow: 'rgba(236,72,153,0.16)',
    background: 'radial-gradient(ellipse at 50% 0%, rgba(236,72,153,0.10) 0%, #1a1528 45%, #243044 100%)',
  },
  aldeia: {
    glow: 'rgba(16,185,129,0.14)',
    background: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.10) 0%, #1a1528 45%, #243044 100%)',
  },
  misterwhite: {
    glow: 'rgba(139,92,246,0.14)',
    background: 'radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.10) 0%, #1a1528 45%, #243044 100%)',
  },
  victory: {
    glow: 'rgba(245,158,11,0.16)',
    background: 'radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.14) 0%, #1e2836 40%, #243044 100%)',
  },
}

/** Alias usado no Home e rotas antigas */
export const MODE_ALIASES = {
  mister: 'misterwhite',
  mememix: 'mememix',
}

export function getModeVisual(mode) {
  const key = MODE_ALIASES[mode] || mode
  return MODE_VISUAL[key] || MODE_VISUAL.hub
}

export function getModeGlow(mode) {
  return getModeVisual(mode).glow
}
