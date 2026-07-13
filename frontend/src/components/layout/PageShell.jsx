import ModeGlowBackdrop from './ModeGlowBackdrop'

const MAX_WIDTH = {
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '3xl': 'max-w-3xl',
  full: 'max-w-none',
}

export default function PageShell({
  children,
  mode = 'hub',
  glow,
  className = '',
  innerClassName = 'space-y-6',
  maxWidth = 'lg',
  style,
}) {
  return (
    <div className={`min-h-screen bg-[#080b14] flex flex-col items-center px-4 py-8 relative ${className}`} style={style}>
      <ModeGlowBackdrop mode={mode} glow={glow} />
      <div className={`w-full ${MAX_WIDTH[maxWidth] || MAX_WIDTH.lg} relative z-10 ${innerClassName}`}>
        {children}
      </div>
    </div>
  )
}
