import { Link } from 'react-router-dom'
import { isUnder18, saveAgeGate } from '../../utils/ageGate'
import { api } from '../../utils/api'

export default function LegalLinks({ onAgeReset }) {
  return (
    <p className="mt-6 text-slate-400 text-xs text-center relative z-10 space-x-2">
      <Link to="/privacy" className="hover:text-slate-400">Privacidade</Link>
      <span>·</span>
      <Link to="/terms" className="hover:text-slate-400">Termos</Link>
      {isUnder18() && (
        <>
          <span>·</span>
          <button
            type="button"
            className="hover:text-slate-400"
            onClick={() => {
              saveAgeGate('')
              api.clearAgeGate().catch(() => {})
              onAgeReset?.()
              window.location.reload()
            }}
          >
            Tenho 18+
          </button>
        </>
      )}
    </p>
  )
}
