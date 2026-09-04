import ModeGlowBackdrop from './ModeGlowBackdrop'
import { NightBlobs } from './NightShell'

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
  const night = mode === 'mememix'
  return (
    <div className={`min-h-screen flex flex-col items-center px-4 py-8 relative ${night ? 'bg-black overflow-x-hidden' : 'bg-[#080b14]'} ${className}`} style={style}>
      {night ? (
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
          <NightBlobs />
          <div className="absolute -left-20 bottom-[-5rem] h-[20rem] w-[20rem] rounded-full bg-[#ff9a3c]/40 blur-[90px]" />
          <div className="absolute -right-16 bottom-[-3rem] h-[22rem] w-[22rem] rounded-full bg-[#ff2d9b]/45 blur-[90px]" />
        </div>
      ) : (
        <ModeGlowBackdrop mode={mode} glow={glow} />
      )}
      <div className={`w-full ${MAX_WIDTH[maxWidth] || MAX_WIDTH.lg} relative z-10 ${innerClassName}`}>
        {children}
      </div>
    </div>
  )
}
