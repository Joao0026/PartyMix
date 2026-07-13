import { useNavigate } from 'react-router-dom'
import { Wifi } from 'lucide-react'
import PageShell from '../components/layout/PageShell'
import ModeHeader from '../components/layout/ModeHeader'
import ModeCard from '../components/layout/ModeCard'
import InfoBox from '../components/layout/InfoBox'

export default function AldeiaMixHub() {
  const navigate = useNavigate()

  return (
    <PageShell mode="aldeia">
      <ModeHeader
        onBack={() => navigate('/')}
        title="🏘️ AldeiaMix"
        subtitle="Lobos, videntes e curandeiros — online"
      />

      <ModeCard
        icon={Wifi}
        title="Sala online"
        description="Cada jogador no telemóvel — host escolhe papéis; narrador conduz a noite"
        variant="emerald"
        onClick={() => navigate('/AldeiaMixLobby')}
      />

      <InfoBox>
        Mínimo 4 jogadores. No fim: «Jogar outra vez» — o juiz passa ao jogador seguinte.
      </InfoBox>
    </PageShell>
  )
}
