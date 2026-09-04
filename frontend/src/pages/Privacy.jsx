import { useNavigate } from 'react-router-dom'
import PageShell from '../components/layout/PageShell'
import BackButton from '../components/layout/BackButton'

export default function Privacy() {
  const navigate = useNavigate()
  return (
    <PageShell mode="hub" maxWidth="lg" innerClassName="space-y-4 text-slate-300 text-sm leading-relaxed">
      <BackButton onClick={() => navigate('/')} />
      <h1 className="text-white font-black text-2xl">Política de privacidade</h1>
      <p>Responsável: PartyMix. Contacto via o operador da instância (o URL onde jogas).</p>
      <h2 className="text-white font-bold pt-2">O que recolhemos</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>Nomes de jogadores que tu escreves, só para a sessão de jogo.</li>
        <li>Fotos no MemeMix: ficam no servidor da sala e são apagadas quando a sala acaba ou após no máximo 6 horas.</li>
        <li>Cookie HttpOnly <code>pm_vid</code>: identificador anónimo de voto na comunidade.</li>
        <li>Cookie HttpOnly <code>pm_age</code>: a tua declaração de idade (18+ ou menor), para isolar conteúdo adulto.</li>
        <li>Logs técnicos do alojamento (IP, data) para segurança e limites de utilização.</li>
        <li>Se usares desafios de IA, os nomes e o texto do pedido são enviados à Groq (EUA) para gerar a carta.</li>
      </ul>
      <h2 className="text-white font-bold pt-2">Subcontratantes</h2>
      <p>O frontend pode estar na Netlify, o backend no Render, a base no MongoDB Atlas. A Groq processa pedidos de IA se essa funcionalidade estiver ligada. Cada um trata dados segundo a respectiva política.</p>
      <h2 className="text-white font-bold pt-2">O que não fazemos</h2>
      <p>Não vendemos dados. Não criamos contas obrigatórias. Não usamos a app para publicidade comportamental de terceiros.</p>
      <h2 className="text-white font-bold pt-2">Conservação</h2>
      <p>Salas online existem só na memória do servidor: um reinício apaga o jogo. Submissões da comunidade ficam na base MongoDB até um admin as apagar. Imagens MemeMix: até 6 horas.</p>
      <h2 className="text-white font-bold pt-2">Os teus direitos (UE)</h2>
      <p>Podes pedir acesso ou apagamento dos dados que controlamos (submissões com o teu nome de autor, fotos da sala). Conteúdo gerado em grupo pode ter de ser anonimizado em vez de apagado se outros jogadores ainda dependerem dele.</p>
      <p className="text-slate-500 text-xs">Última actualização: Setembro 2026.</p>
    </PageShell>
  )
}
