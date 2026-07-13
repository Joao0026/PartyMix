import { useNavigate } from 'react-router-dom'
import { Wifi } from 'lucide-react'
import PageShell from '../components/layout/PageShell'
import ModeHeader from '../components/layout/ModeHeader'
import ModeCard from '../components/layout/ModeCard'
import InfoBox from '../components/layout/InfoBox'

export default function MemeMixHub() {
  const navigate = useNavigate()

  return (
    <PageShell mode="mememix">
      <ModeHeader
        onBack={() => navigate('/')}
        title="😂 MemeMix"
        subtitle="Memes + legendas — estilo What Do You Meme"
      />

      <ModeCard
        icon={Wifi}
        title="Sala online"
        description="Cada um envia fotos do telemóvel — apagadas no fim"
        variant="pink"
        onClick={() => navigate('/MemeMixLobby')}
      />

      <InfoBox>
        Host escolhe pontos (1–7). Juiz só memes; os outros 5 legendas. Fotos da sessão não ficam guardadas.
      </InfoBox>
    </PageShell>
  )
}
