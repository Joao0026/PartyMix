import { Navigate } from 'react-router-dom'

/** Hub extra saltado — links antigos `/MemeMix` vão directo ao lobby. */
export default function MemeMixHub() {
  return <Navigate to="/MemeMixLobby" replace />
}
