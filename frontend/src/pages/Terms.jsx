import { useNavigate } from 'react-router-dom'
import PageShell from '../components/layout/PageShell'
import BackButton from '../components/layout/BackButton'

export default function Terms() {
  const navigate = useNavigate()
  return (
    <PageShell mode="hub" maxWidth="lg" innerClassName="space-y-4 text-slate-300 text-sm leading-relaxed">
      <BackButton onClick={() => navigate('/')} />
      <h1 className="text-white font-black text-2xl">Termos de uso</h1>
      <p>O PartyMix é um conjunto de jogos de festa. Ao usares a app aceitas estes termos.</p>
      <h2 className="text-white font-bold pt-2">Idade</h2>
      <p>Conteúdo com álcool, sexo ou linguagem adulta destina-se a maiores de 18 anos. Confirmas a idade por declaração própria. Mentir sobre a idade é violação destes termos. Menores só podem usar o Modo Família.</p>
      <h2 className="text-white font-bold pt-2">Álcool e segurança</h2>
      <p>Beber é opcional e da tua responsabilidade. Não conduzas nem operes máquinas sob o efeito de álcool. Não humilhes nem forces ninguém a beber.</p>
      <h2 className="text-white font-bold pt-2">Conteúdo da comunidade e IA</h2>
      <p>Cartas submetidas só entram no jogo depois de um admin aprovar. A IA pode gerar texto inadequado; usa o modo família se houver crianças. Não submetas dados de terceiros sem consentimento, nem conteúdo ilegal.</p>
      <h2 className="text-white font-bold pt-2">Salas online</h2>
      <p>O servidor pode reiniciar. Jogos em curso podem desaparecer sem aviso. Isto não é um serviço com SLA.</p>
      <h2 className="text-white font-bold pt-2">Packs «em breve»</h2>
      <p>Alguns packs aparecem bloqueados. Não há compras dentro da app nesta versão. Não são um produto pago activo.</p>
      <p className="text-slate-500 text-xs">Última actualização: Setembro 2026. Lei aplicável: Portugal / UE.</p>
    </PageShell>
  )
}
