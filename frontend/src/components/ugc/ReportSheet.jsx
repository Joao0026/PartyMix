import { Flag } from 'lucide-react'
import { useState } from 'react'
import { REPORT_REASONS } from '../../utils/ugcPolicy'

export default function ReportSheet({ open, title = 'Denunciar conteúdo', onClose, onSubmit, busy }) {
  const [reason, setReason] = useState('other')
  const [details, setDetails] = useState('')

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/70 px-4 overlay-safe-pad" role="dialog" aria-modal="true" aria-labelledby="report-sheet-title">
      <div className="w-full max-w-md rounded-3xl border border-white/15 bg-[#12141c] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Flag className="w-4 h-4 text-red-300" />
          <h2 id="report-sheet-title" className="text-white font-black">{title}</h2>
        </div>
        <p className="text-slate-300 text-sm">A denúncia vai para revisão. Este conteúdo fica oculto para ti de imediato.</p>
        <label className="block text-slate-300 text-xs font-bold" htmlFor="report-reason">Motivo</label>
        <select
          id="report-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="input-field min-h-[48px]"
        >
          {REPORT_REASONS.map((r) => (
            <option key={r.id} value={r.id}>{r.label}</option>
          ))}
        </select>
        <label className="block text-slate-300 text-xs font-bold" htmlFor="report-details">Detalhes (opcional)</label>
        <textarea
          id="report-details"
          value={details}
          onChange={(e) => setDetails(e.target.value.slice(0, 400))}
          rows={3}
          className="input-field"
          placeholder="O que está errado?"
        />
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="rounded-2xl border border-white/15 py-3 min-h-[48px] text-white font-bold">
            Cancelar
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onSubmit({ reason, details })}
            className="rounded-2xl bg-red-600 py-3 min-h-[48px] text-white font-black disabled:opacity-50"
          >
            {busy ? 'A enviar…' : 'Denunciar'}
          </button>
        </div>
      </div>
    </div>
  )
}
