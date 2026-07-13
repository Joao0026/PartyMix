import BackButton from './BackButton'

export default function ModeHeader({ onBack, title, subtitle, action }) {
  return (
    <div className="flex items-center gap-3">
      {onBack && <BackButton onClick={onBack} />}
      <div className="flex-1 min-w-0">
        <h1 className="text-white font-black text-2xl leading-tight">{title}</h1>
        {subtitle && <p className="text-slate-500 text-sm mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
