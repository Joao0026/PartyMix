import { getModeVisual } from '../../theme/modes'
import ModeGlowBackdrop from './ModeGlowBackdrop'

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

  return (
    <div className={`min-h-screen flex flex-col relative ${className}`} style={{ background: bg }}>
      <ModeGlowBackdrop mode={mode} glow={glow} opacity={0.35} height="320px" />

      {header && (
        <header className="shrink-0 px-4 pb-3 pt-0 border-b border-white/[0.10] relative z-10">
          <div className="max-w-lg mx-auto">{header}</div>
        </header>
      )}

      <main className={mainClassName}>{children}</main>

      {footer && (
        <footer className="shrink-0 px-4 pt-2 pb-safe border-t border-white/[0.08] bg-[#1e2836]/85 backdrop-blur-md relative z-10">
          <div className="max-w-lg mx-auto">{footer}</div>
        </footer>
      )}
    </div>
  )
}
