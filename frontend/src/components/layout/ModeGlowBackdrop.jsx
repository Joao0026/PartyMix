import { getModeGlow } from '../../theme/modes'

export default function ModeGlowBackdrop({ mode = 'hub', glow, opacity = 0.4, height = '380px' }) {
  const color = glow || getModeGlow(mode)

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[min(600px,100vw)] rounded-full"
        style={{
          height,
          opacity,
          background: `radial-gradient(ellipse, ${color} 0%, transparent 70%)`,
        }}
      />
    </div>
  )
}
