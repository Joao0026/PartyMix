import { getModeVisual } from '../../theme/modes'
import ModeGlowBackdrop from './ModeGlowBackdrop'
import ModeBadge, { modeKind } from './ModeBadge'
import { NightBlobs } from './NightShell'

export default function GameShell({
  mode = 'friends',
  background,
  glow,
  header,
  footer,
  className = '',
  mainClassName = 'flex-1 flex flex-col overflow-y-auto relative z-10 min-h-0',
  children,
}) {
  const visual = getModeVisual(mode)
  const night = ['drink', 'friends', 'family', 'couple', 'challenges'].includes(mode)
  const bg = night ? '#000' : (background || visual.background)
  const kind = modeKind(mode)

  return (
    <div className={`relative flex min-h-screen flex-col overflow-hidden ${className}`} style={{ background: bg }}>
      {night ? <NightBlobs /> : <ModeGlowBackdrop mode={mode} glow={glow} opacity={kind === 'family' ? 0.55 : 0.35} height="320px" />}

      {header && (
        <header className={`relative z-10 shrink-0 px-4 pb-3 pt-1 ${night ? 'border-b border-white/[0.06]' : 'border-b border-white/[0.10]'}`}>
          <div className="mx-auto max-w-lg space-y-2">
            {!night && kind && <ModeBadge kind={kind} />}
            {header}
          </div>
        </header>
      )}

      <main className={mainClassName}>{children}</main>

      {footer && (
        <footer className={`relative z-10 shrink-0 px-4 pt-2 pb-safe ${night ? '' : 'border-t border-white/[0.08] bg-black/40 backdrop-blur-md'}`}>
          <div className="mx-auto max-w-lg">{footer}</div>
        </footer>
      )}
    </div>
  )
}
