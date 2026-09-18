import { Link } from 'react-router-dom'
import { isUnder18, saveAgeGate } from '../../utils/ageGate'
import { api } from '../../utils/api'

export default function LegalLinks({ onAgeReset }) {
  return (
    <p className="mt-6 text-slate-300 text-xs text-center relative z-10 space-x-2">
      <Link to="/privacy" className="hover:text-white underline-offset-2 hover:underline">Privacidade</Link>
      <span>·</span>
      <Link to="/terms" className="hover:text-white underline-offset-2 hover:underline">Termos</Link>
      {isUnder18() && (
        <>
          <span>·</span>
          <button
            type="button"
            className="hover:text-white min-h-[44px] px-1"
            aria-label="Declarar que tenho 18 anos ou mais"
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
