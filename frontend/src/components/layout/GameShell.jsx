import { getModeVisual } from '../../theme/modes'
import ModeGlowBackdrop from './ModeGlowBackdrop'
import ModeBadge, { modeKind } from './ModeBadge'

export default function GameShell({
  mode = 'friends',
  background,
  glow,
  header,
  footer,
  children,
  className = '',
  mainClassName = 'flex-1 flex flex-col overflow-y-auto relative z-10 min-h-0',
}) {
  const visual = getModeVisual(mode)
  const bg = background || visual.background
  const kind = modeKind(mode)

  return (
    <div className={`min-h-screen flex flex-col relative ${className}`} style={{ background: bg }}>
      <ModeGlowBackdrop mode={mode} glow={glow} opacity={kind === 'family' ? 0.55 : 0.35} height="320px" />

      {header && (
        <header className="shrink-0 px-4 pb-3 pt-1 border-b border-white/[0.10] relative z-10">
          <div className="max-w-lg mx-auto space-y-2">
            {kind && <ModeBadge kind={kind} />}
            {header}
          </div>
        </header>
      )}

      <main className={mainClassName}>{children}</main>

      {footer && (
        <footer className="shrink-0 px-4 pt-2 pb-safe border-t border-white/[0.08] bg-black/40 backdrop-blur-md relative z-10">
          <div className="max-w-lg mx-auto">{footer}</div>
        </footer>
      )}
    </div>
  )
}
