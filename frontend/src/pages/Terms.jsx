import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import PageShell from '../components/layout/PageShell'
import BackButton from '../components/layout/BackButton'
import { api } from '../utils/api'

export default function Terms() {
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
      <h1 className="text-white font-black text-2xl">Termos de uso</h1>
      <p>O PartyMix é um conjunto de jogos de festa. Ao usares a app aceitas estes termos. Operador desta instância: <strong className="text-white">{operator}</strong>.</p>
      <h2 className="text-white font-bold pt-2">Idade e classificação 18+</h2>
      <p>Conteúdo com álcool, sexo ou linguagem adulta destina-se a maiores de 18 anos (classificação alinhada com a Play Store). Confirmas a idade por declaração própria. Mentir sobre a idade é violação destes termos. Menores só podem usar o Modo Família, sem conteúdo adulto.</p>
      <h2 className="text-white font-bold pt-2">Álcool e segurança</h2>
      <p>Beber é opcional e da tua responsabilidade. Não conduzas nem operes máquinas sob o efeito de álcool. Não humilhes nem forces ninguém a beber.</p>
      <h2 className="text-white font-bold pt-2">UGC — conteúdo da comunidade e fotos</h2>
      <p>Cartas submetidas só entram no jogo depois de um admin aprovar. Fotos do MemeMix são UGC: só envias imagens de que tens permissão, máximo 2 MB e 12 por jogador. Não submetas dados de terceiros sem consentimento, nem conteúdo ilegal, ódio, assédio ou exploração de menores. A IA pode gerar texto inadequado; usa o Modo Família se houver crianças.</p>
      <h2 className="text-white font-bold pt-2">Denunciar e bloquear</h2>
      <p>Podes denunciar cartas e memes e bloqueá-los para ti. Um admin revê a fila. Conteúdo que viole estes termos pode ser ocultado ou removido sem aviso.</p>
      <h2 className="text-white font-bold pt-2">Salas online</h2>
      <p>O servidor pode reiniciar. Jogos em curso podem desaparecer sem aviso. Isto não é um serviço com SLA.</p>
      <h2 className="text-white font-bold pt-2">Packs «em breve»</h2>
      <p>Alguns packs aparecem bloqueados. Não há compras dentro da app nesta versão. Não são um produto pago activo.</p>
      <p className="text-slate-400 text-xs">Última actualização: Setembro 2026. Lei aplicável: Portugal / UE.</p>
    </PageShell>
  )
}
