export default function InfoBox({ children, icon: Icon }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 flex gap-3 text-sm text-slate-500">
      {Icon && <Icon className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />}
      <div className="leading-relaxed">{children}</div>
    </div>
  )
}
