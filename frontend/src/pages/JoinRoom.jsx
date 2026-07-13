import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { JOIN_MODES } from '../utils/joinUrl'

export default function JoinRoom() {
  const { mode, code } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    const key = String(mode || '').toLowerCase()
    const cfg = JOIN_MODES[key]
    const c = String(code || '').trim().toUpperCase()
    if (!cfg || !/^[A-Z0-9]{4,12}$/.test(c)) {
      navigate('/', { replace: true })
      return
    }
    navigate(`${cfg.path}?code=${encodeURIComponent(c)}`, { replace: true })
  }, [mode, code, navigate])

  return (
    <div className="min-h-screen bg-[#080b14] flex items-center justify-center p-6">
      <p className="text-slate-400 text-sm">A abrir sala…</p>
    </div>
  )
}
