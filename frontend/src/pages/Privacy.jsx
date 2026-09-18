import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import PageShell from '../components/layout/PageShell'
import BackButton from '../components/layout/BackButton'
import { api } from '../utils/api'

export default function Privacy() {
  const navigate = useNavigate()
  const [operator, setOperator] = useState('o URL HTTPS onde jogas')

  useEffect(() => {
    api.getFeatures()
      .then((d) => {
        if (d?.legal?.operatorUrl) setOperator(d.legal.operatorUrl)
      })
      .catch(() => {})
  }, [])

  return (
    <PageShell mode="hub" maxWidth="lg" innerClassName="space-y-4 text-slate-300 text-sm leading-relaxed">
      <BackButton onClick={() => navigate('/')} />
      <h1 className="text-white font-black text-2xl">Política de privacidade</h1>
      <p>Responsável: PartyMix. Contacto do operador desta instância: <strong className="text-white">{operator}</strong>. Em produção o endereço público é sempre HTTPS.</p>
      <h2 className="text-white font-bold pt-2">Idade, álcool e Modo Família</h2>
      <p>O PartyMix tem conteúdo para maiores de 18 anos (álcool, linguagem e temas adultos). Menores só usam o Modo Família, sem conteúdo adulto. A idade é uma declaração própria (cookie <code>pm_age</code> e, no browser, localStorage).</p>
      <h2 className="text-white font-bold pt-2">O que recolhemos</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>Nomes de jogadores que tu escreves, só para a sessão de jogo.</li>
        <li>Fotos no MemeMix: ficam no servidor da sala e são apagadas quando a sala acaba ou após no máximo 6 horas.</li>
        <li>Cartas da comunidade e denúncias de UGC (texto, motivo, identificador anónimo do denunciante).</li>
        <li>Cookie HttpOnly <code>pm_vid</code>: identificador anónimo de voto e denúncia na comunidade.</li>
        <li>Cookie HttpOnly <code>pm_age</code>: a tua declaração de idade (18+ ou menor), para isolar conteúdo adulto.</li>
        <li>Cookie HttpOnly <code>pmx_instance</code>: cola-te à mesma instância do servidor (salas em memória).</li>
        <li>Logs técnicos do alojamento (IP, data) para segurança e limites de utilização.</li>
        <li>Se usares desafios de IA, os nomes e o texto do pedido são enviados à Groq (EUA) para gerar a carta.</li>
      </ul>
      <h2 className="text-white font-bold pt-2">Analytics (sem publicidade)</h2>
      <p>Registamos eventos técnicos no servidor, sem nomes nem códigos de sala em claro: <code>room_created</code>, <code>game_started</code>, <code>game_completed</code>, <code>rejoin_failed</code>, <code>socket_disconnect_reason</code>, <code>error_code</code>, <code>ugc_reported</code>, <code>ugc_reviewed</code>. Não vendemos dados. Não há publicidade comportamental de terceiros.</p>
      <h2 className="text-white font-bold pt-2">Denúncias e bloqueio</h2>
      <p>Podes denunciar e bloquear cartas da comunidade e fotos do MemeMix. A denúncia entra numa fila de revisão. O conteúdo fica oculto para ti de imediato. Não guardamos o teu nome na denúncia — só um hash do identificador anónimo.</p>
      <h2 className="text-white font-bold pt-2">Subcontratantes</h2>
      <p>O frontend pode estar na Netlify, o backend no Render, a base no MongoDB Atlas. A Groq processa pedidos de IA se essa funcionalidade estiver ligada. Cada um trata dados segundo a respectiva política. Sentry só se o operador configurar <code>SENTRY_DSN</code>.</p>
      <h2 className="text-white font-bold pt-2">Retenção</h2>
      <p>Salas online existem só na memória do servidor: um reinício apaga o jogo. Submissões da comunidade ficam na base MongoDB até um admin as apagar. Imagens MemeMix: até 6 horas. Denúncias: retenção até 30 dias, depois expiram. Lobbies HTTP: 2 horas; CardRooms: 24 horas.</p>
      <h2 className="text-white font-bold pt-2">Os teus direitos (UE)</h2>
      <p>Podes pedir acesso ou apagamento dos dados que controlamos (submissões com o teu nome de autor, fotos da sala, denúncias ligadas ao cookie). Conteúdo gerado em grupo pode ter de ser anonimizado em vez de apagado se outros jogadores ainda dependerem dele.</p>
      <p className="text-slate-400 text-xs">Última actualização: Setembro 2026.</p>
    </PageShell>
  )
}
