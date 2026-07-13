import { useNavigate } from 'react-router-dom'
import { Smartphone, Wifi, Users } from 'lucide-react'
import PageShell from '../components/layout/PageShell'
import ModeHeader from '../components/layout/ModeHeader'
import ModeCard from '../components/layout/ModeCard'
import InfoBox from '../components/layout/InfoBox'

export default function MisterWhiteHub() {
  const navigate = useNavigate()

  return (
    <PageShell mode="misterwhite">
      <ModeHeader
        onBack={() => navigate('/')}
        title="👁️ Mister White"
        subtitle="Como queres jogar?"
      />

      <ModeCard
        icon={Smartphone}
        title="Um telemóvel"
        description="Passa o telemóvel à volta da mesa para ver os papéis"
        onClick={() => navigate('/MisterWhiteGame')}
      />

      <ModeCard
        icon={Wifi}
        title="Sala online"
        description="Cada jogador no seu telemóvel — código da sala"
        variant="violet"
        delay={0.06}
        onClick={() => navigate('/MisterWhiteLobby')}
      />

      <InfoBox icon={Users}>
        Mínimo 3 jogadores. Na sala online, o host controla votação e eliminações; cada um vê só o seu papel.
      </InfoBox>
    </PageShell>
  )
}
