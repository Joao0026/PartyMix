// seeds/seed.js — UPSERT version
// Runs safely multiple times — never deletes existing data
// Only inserts cards/challenges that don't already exist (matched by text)

require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const mongoose  = require('mongoose')
const Challenge = require('../models/Challenge')
const Card      = require('../models/Card')
const DiceOption= require('../models/DiceOption')
const SexPosition=require('../models/SexPosition')

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/partymix'

// ── Helper: upsert by text field ──────────────────────────────
async function upsertMany(Model, docs) {
  let inserted = 0, skipped = 0
  for (const doc of docs) {
    const exists = await Model.findOne({ text: doc.text })
    if (exists) { skipped++; continue }
    await new Model(doc).save()
    inserted++
  }
  return { inserted, skipped }
}

// ── CHALLENGES ────────────────────────────────────────────────
const challenges = [
  // New shared Family/Friends categories
  { text:'Tema: coisas que existem numa cozinha. Dois jogadores dizem uma palavra ao mesmo tempo. Se for igual, ganham.', category:'telepatia', mode_type:'family', difficulty:'facil', time_limit:10 },
  { text:'Tema: animais. Dois jogadores contam até 3 e dizem uma palavra ao mesmo tempo.', category:'telepatia', mode_type:'family', difficulty:'facil', time_limit:10 },
  { text:'Em que ano aconteceu o 25 de Abril?', answer:'1974', category:'perguntas', mode_type:'family', difficulty:'facil' },
  { text:'Qual é o maior oceano do mundo?', answer:'Oceano Pacífico', category:'perguntas', mode_type:'family', difficulty:'facil' },
  { text:'Desenha uma caravela sem escrever letras.', category:'desenho', mode_type:'family', difficulty:'facil', time_limit:60 },
  { text:'Desenha uma ida ao supermercado em família.', category:'desenho', mode_type:'family', difficulty:'facil', time_limit:60 },
  { text:'Representa alguém que perdeu as chaves de casa.', category:'mimica', mode_type:'family', difficulty:'facil', time_limit:45 },
  { text:'Representa um turista perdido em Lisboa.', category:'mimica', mode_type:'family', difficulty:'facil', time_limit:45 },
  { text:'Palavra: Cristiano Ronaldo. Faz a equipa adivinhar sem dizer as palavras proibidas.', category:'proibido', mode_type:'family', difficulty:'facil', forbiddenWords:['futebol','Portugal','golo','Madeira','Siu'] },
  { text:'Palavra: 25 de Abril. Faz a equipa adivinhar sem dizer as palavras proibidas.', category:'proibido', mode_type:'family', difficulty:'medio', forbiddenWords:['revolução','cravos','ditadura','1974','militares'] },
  { text:'Tema: marcas conhecidas. Dois jogadores dizem uma marca ao mesmo tempo. Se coincidir, escolhem quem bebe.', category:'telepatia', mode_type:'friends', difficulty:'facil', time_limit:10, sips_penalty:2 },
  { text:'Tema: coisas de ressaca. Dois jogadores dizem uma palavra ao mesmo tempo.', category:'telepatia', mode_type:'friends', difficulty:'facil', time_limit:10, sips_penalty:2 },
  { text:'Qual foi o país vencedor do Euro 2016?', answer:'Portugal', category:'perguntas', mode_type:'friends', difficulty:'facil', sips_penalty:2 },
  { text:'Que banda lançou a música "Bohemian Rhapsody"?', answer:'Queen', category:'perguntas', mode_type:'friends', difficulty:'medio', sips_penalty:2 },
  { text:'Desenha alguém a tentar chegar a casa depois de uma noite longa.', category:'desenho', mode_type:'friends', difficulty:'facil', time_limit:60, sips_penalty:2 },
  { text:'Desenha uma desculpa esfarrapada para chegar atrasado.', category:'desenho', mode_type:'friends', difficulty:'facil', time_limit:60, sips_penalty:2 },
  { text:'Representa alguém a fingir que não está bêbedo.', category:'mimica', mode_type:'friends', difficulty:'facil', time_limit:45, sips_penalty:2 },
  { text:'Representa uma pessoa a tentar pedir comida às 3 da manhã.', category:'mimica', mode_type:'friends', difficulty:'facil', time_limit:45, sips_penalty:2 },
  { text:'Palavra: Festival. Faz a equipa adivinhar sem dizer as palavras proibidas.', category:'proibido', mode_type:'friends', difficulty:'facil', forbiddenWords:['música','pulseira','campismo','palco','cerveja'], sips_penalty:2 },
  { text:'Palavra: Ressaca. Faz a equipa adivinhar sem dizer as palavras proibidas.', category:'proibido', mode_type:'friends', difficulty:'facil', forbiddenWords:['bebida','dor','cabeça','água','noite'], sips_penalty:2 },
  { text:'Regra temporária: durante 2 rondas, quem disser nomes próprios bebe 1 golo.', category:'caos', mode_type:'friends', difficulty:'facil', is_ongoing:true, ongoing_rounds:2, ongoing_instruction:'Sem nomes próprios. Quem falhar bebe 1.', sips_penalty:2 },
  { text:'Regra temporária: até ao próximo turno desta equipa, todas as respostas têm de começar por "honestamente".', category:'caos', mode_type:'friends', difficulty:'medio', is_ongoing:true, ongoing_rounds:1, ongoing_instruction:'Começa respostas por "honestamente".', sips_penalty:2 },
  // Couple refreshed categories
  { text:'Diz uma memória pequena do vosso dia a dia que te faz gostar mais do teu parceiro.', category:'romantico', mode_type:'couple', difficulty:'facil' },
  { text:'Escolhe uma música e dança agarrado ao teu parceiro durante 45 segundos.', category:'romantico', mode_type:'couple', difficulty:'facil', time_limit:45 },
  { text:'Sussurra ao ouvido uma fantasia ou vontade que ainda não disseste claramente.', category:'picante', mode_type:'couple', difficulty:'medio' },
  { text:'Faz uma massagem lenta nas mãos durante 1 minuto.', category:'picante', mode_type:'couple', difficulty:'facil', time_limit:60 },
  { text:'Cena: reencontro inesperado num bar depois de anos sem se verem.', category:'roleplay', mode_type:'couple', difficulty:'facil' },
  { text:'Qual foi o primeiro detalhe que reparaste no teu parceiro?', category:'casal_pergunta', mode_type:'couple', difficulty:'facil' },
  // Friends - Mímica
  { text:'Imita o Cristiano Ronaldo a celebrar em câmara lenta', category:'mimica', mode_type:'friends', difficulty:'facil', time_limit:45 },
  { text:'Imita alguém a montar um móvel IKEA sem instruções e a ficar frustrado', category:'mimica', mode_type:'friends', difficulty:'medio', time_limit:60 },
  { text:'Imita um youtuber a fazer unboxing de algo dececionante', category:'mimica', mode_type:'friends', difficulty:'medio', time_limit:60 },
  { text:'Imita alguém a receber uma multa de trânsito injusta', category:'mimica', mode_type:'friends', difficulty:'facil', time_limit:45 },
  { text:'Imita um político numa entrevista difícil sem conseguir responder', category:'mimica', mode_type:'friends', difficulty:'medio', time_limit:60 },
  { text:'Imita alguém a tentar estacionar num lugar impossível', category:'mimica', mode_type:'friends', difficulty:'facil', time_limit:45 },
  { text:'Imita um professor a usar um computador moderno pela primeira vez', category:'mimica', mode_type:'friends', difficulty:'medio', time_limit:60 },
  { text:'Imita alguém a provar refeição horrível num restaurante caro e fingir que está boa', category:'mimica', mode_type:'friends', difficulty:'medio', time_limit:60 },
  { text:'Imita alguém que acabou de ver a conta do restaurante', category:'mimica', mode_type:'friends', difficulty:'facil', time_limit:30 },
  { text:'Imita um robot aprendendo a dançar Kizomba', category:'mimica', mode_type:'friends', difficulty:'medio', time_limit:45 },
  { text:'Imita um apresentador de telejornal a dar uma notícia absurda', category:'mimica', mode_type:'friends', difficulty:'dificil', time_limit:60 },
  // Friends - Desenho
  { text:'Desenha o Zé Povinho em 2025 com smartphone e problemas de habitação', category:'desenho', mode_type:'friends', difficulty:'medio', time_limit:90 },
  { text:'Desenha um dragão a fazer IRS no Portal das Finanças', category:'desenho', mode_type:'friends', difficulty:'facil', time_limit:60 },
  { text:'Desenha o que está na cabeça do teu chefe agora', category:'desenho', mode_type:'friends', difficulty:'medio', time_limit:90 },
  { text:'Desenha a reunião que podia ter sido um email de 3 linhas', category:'desenho', mode_type:'friends', difficulty:'facil', time_limit:60 },
  { text:'Desenha o Benfica, o Porto e o Sporting numa sala de reunião a discutir o árbitro', category:'desenho', mode_type:'friends', difficulty:'medio', time_limit:90 },
  { text:'Desenha a cara que um português faz quando vê a conta da luz no inverno', category:'desenho', mode_type:'friends', difficulty:'facil', time_limit:60 },
  { text:'Desenha a Lisboa do futuro com casas a 500€/mês', category:'desenho', mode_type:'friends', difficulty:'medio', time_limit:90 },
  { text:'Desenha o teu animal espiritual a fazer o teu trabalho', category:'desenho', mode_type:'friends', difficulty:'facil', time_limit:60 },
  // Friends - Verdade
  { text:'Qual foi a maior mentira que disseste aos pais e safaste-te completamente?', category:'verdade', mode_type:'friends', difficulty:'medio' },
  { text:'Se pudesses eliminar alguém do grupo sem consequências, quem seria?', category:'verdade', mode_type:'friends', difficulty:'dificil' },
  { text:'Conta a história mais embaraçosa que tens com alguém nesta sala', category:'verdade', mode_type:'friends', difficulty:'dificil' },
  { text:'Qual é o segredo que guardas há mais tempo sem contar a ninguém aqui?', category:'verdade', mode_type:'friends', difficulty:'dificil' },
  { text:'Com quem nesta sala nunca ficarias e porquê?', category:'verdade', mode_type:'friends', difficulty:'dificil' },
  { text:'Qual foi a última vez que choraste e porquê?', category:'verdade', mode_type:'friends', difficulty:'medio' },
  { text:'Qual é a coisa mais estranha que já pesquisaste no Google de madrugada?', category:'verdade', mode_type:'friends', difficulty:'facil' },
  { text:'Qual foi a desculpa mais criativa que inventaste para faltar a algo?', category:'verdade', mode_type:'friends', difficulty:'facil' },
  { text:'Qual foi a pior coisa que já fizeste e que ninguém aqui sabe?', category:'verdade', mode_type:'friends', difficulty:'dificil' },
  { text:'Se tivesses de casar com alguém desta sala, quem escolhias?', category:'verdade', mode_type:'friends', difficulty:'dificil' },
  // Friends - Ação
  { text:'Liga para o familiar mais velho e canta os parabéns sem explicar porquê', category:'acao', mode_type:'friends', difficulty:'dificil', time_limit:120, sips_penalty:3 },
  { text:'Faz 20 flexões. Por cada uma que faltares, bebes um golo', category:'acao', mode_type:'friends', difficulty:'medio', time_limit:60, sips_penalty:2 },
  { text:'Publica uma foto ridícula nas stories durante 30 minutos', category:'acao', mode_type:'friends', difficulty:'dificil', sips_penalty:3 },
  { text:'Faz a pose de yoga mais difícil que consegues e mantém 15 segundos', category:'acao', mode_type:'friends', difficulty:'facil', time_limit:30, sips_penalty:1 },
  { text:'Diz um elogio genuíno e específico a cada pessoa da sala', category:'acao', mode_type:'friends', difficulty:'facil', time_limit:120, sips_penalty:1 },
  { text:'Faz o teu melhor beatbox durante 20 segundos', category:'acao', mode_type:'friends', difficulty:'facil', time_limit:20, sips_penalty:1 },
  { text:'Convence o grupo de que a coisa mais absurda que inventares é verdade', category:'acao', mode_type:'friends', difficulty:'dificil', time_limit:60, sips_penalty:2 },
  // Friends - Consequência (ongoing)
  { text:'Fala em voz de pato até ao teu próximo turno', category:'consequencia', mode_type:'friends', difficulty:'facil', is_ongoing:true, ongoing_rounds:1, ongoing_instruction:'Fala em voz de pato!' },
  { text:'Responde apenas com perguntas até ao próximo turno', category:'consequencia', mode_type:'friends', difficulty:'medio', is_ongoing:true, ongoing_rounds:1, ongoing_instruction:'Responde só com perguntas!' },
  { text:'Termina cada frase com "e foi assim que perdi o emprego" durante 2 turnos', category:'consequencia', mode_type:'friends', difficulty:'medio', is_ongoing:true, ongoing_rounds:2, ongoing_instruction:'Termina com "...e foi assim que perdi o emprego"!' },
  { text:'Não podes usar o telemóvel durante 3 turnos. Se usares, bebes 3.', category:'consequencia', mode_type:'friends', difficulty:'medio', is_ongoing:true, ongoing_rounds:3, ongoing_instruction:'Sem telemóvel! Se usares: 3 golos!' },
  { text:'Tens de fazer mímica de tudo o que quiseres dizer durante 1 turno', category:'consequencia', mode_type:'friends', difficulty:'medio', is_ongoing:true, ongoing_rounds:1, ongoing_instruction:'Só comunicas por mímica!' },
  // Family
  { text:'Nomeia 5 capitais europeias em 10 segundos', category:'cultura', mode_type:'family', difficulty:'medio', time_limit:10 },
  { text:'Em que ano foi o 25 de Abril?', category:'cultura', mode_type:'family', difficulty:'facil' },
  { text:'Quem escreveu Os Lusíadas e em que século?', category:'cultura', mode_type:'family', difficulty:'facil' },
  { text:'Nomeia 3 países africanos de língua portuguesa', category:'cultura', mode_type:'family', difficulty:'facil', time_limit:15 },
  { text:'Qual é o maior país do mundo por área?', category:'cultura', mode_type:'family', difficulty:'facil' },
  { text:'Nomeia 5 clubes da Primeira Liga portuguesa', category:'desporto', mode_type:'family', difficulty:'facil', time_limit:15 },
  { text:'Em que ano ganhou Portugal o Euro?', category:'desporto', mode_type:'family', difficulty:'facil' },
  { text:'Canta o refrão de uma música portuguesa dos anos 80', category:'musica', mode_type:'family', difficulty:'medio', time_limit:30 },
  { text:'Nomeia 5 cantores ou bandas portuguesas', category:'musica', mode_type:'family', difficulty:'facil', time_limit:15 },
  { text:'Nomeia 5 filmes de animação da Disney ou Pixar', category:'cinema', mode_type:'family', difficulty:'facil', time_limit:15 },
  { text:'Imita um leão a caçar no Serengeti', category:'mimica', mode_type:'family', difficulty:'facil', time_limit:45 },
  { text:'Imita alguém a aprender a andar de bicicleta pela primeira vez', category:'mimica', mode_type:'family', difficulty:'facil', time_limit:45 },
  { text:'Desenha uma casa com jardim usando apenas 30 segundos', category:'desenho', mode_type:'family', difficulty:'facil', time_limit:30 },
  // Couple
  { text:'Dá uma massagem nos ombros durante 3 minutos', category:'erotico', mode_type:'couple', difficulty:'facil', time_limit:180 },
  { text:'Sussurra ao ouvido o que queres fazer mais tarde esta noite', category:'erotico', mode_type:'couple', difficulty:'facil' },
  { text:'Remove uma peça de roupa do parceiro só com os dentes', category:'erotico', mode_type:'couple', difficulty:'dificil', time_limit:60 },
  { text:'Beija o parceiro durante 30 segundos sem parar', category:'erotico', mode_type:'couple', difficulty:'facil', time_limit:30 },
  { text:'Diz 3 coisas que adoras no corpo do parceiro com detalhe específico', category:'erotico', mode_type:'couple', difficulty:'facil' },
  { text:'Qual é o prato favorito do teu parceiro?', category:'casal_pergunta', mode_type:'couple', difficulty:'facil' },
  { text:'Qual foi o primeiro filme que viram juntos?', category:'casal_pergunta', mode_type:'couple', difficulty:'facil' },
  { text:'Qual é o maior medo do teu parceiro?', category:'casal_pergunta', mode_type:'couple', difficulty:'medio' },
  { text:'O que faz o teu parceiro primeiro quando acorda?', category:'casal_pergunta', mode_type:'couple', difficulty:'facil' },
  { text:'Se o teu parceiro ganhasse 1M€, o que fazia primeiro?', category:'casal_pergunta', mode_type:'couple', difficulty:'medio' },
]

// ── CARDS (white + black + drink) ────────────────────────────
const cards = [
  // White cards (sample — full list is already in DB from previous seed)
  { text:'O Cristiano Ronaldo em modo humilde', category:'geral', is_black:false },
  { text:'Pastéis de Belém às 3 da manhã', category:'geral', is_black:false },
  { text:'A saudade de não fazer absolutamente nada', category:'geral', is_black:false },
  { text:'O Sporting a ganhar a liga sem perder um jogo', category:'geral', is_black:false },
  { text:'Um português a chegar a horas', category:'geral', is_black:false },
  { text:'A avó com tupperware de comida', category:'geral', is_black:false },
  { text:'O seguro de saúde que funciona como descrito', category:'absurdo', is_black:false },
  { text:'Uma reunião que era mesmo para ser um email de 3 linhas', category:'geral', is_black:false },
  { text:'O burnout aos 24 com certificado de esgotamento', category:'geral', is_black:false },
  { text:'A bateria a 1% longe de qualquer tomada', category:'geral', is_black:false },
  // Black cards
  { text:'O novo plano do governo para a habitação: ___.', category:'geral', is_black:true },
  { text:'O que nunca deves dizer numa primeira consulta? ___.', category:'geral', is_black:true },
  { text:'O segredo do sucesso em Portugal é ___.', category:'cultura', is_black:true },
  { text:'O meu terapeuta disse que o meu maior problema é ___.', category:'geral', is_black:true },
  { text:'Misturar ___ com ___ foi o pior erro da minha vida adulta.', category:'geral', is_black:true },
  { text:'Portugal 2050. O maior problema já não é habitação, é ___.', category:'absurdo', is_black:true },
]

// ── DICE OPTIONS ─────────────────────────────────────────────
const diceOptions = [
  { text:'Lábios', dice_type:'body_part' },   { text:'Pescoço', dice_type:'body_part' },
  { text:'Orelhas', dice_type:'body_part' },  { text:'Ombros', dice_type:'body_part' },
  { text:'Costas', dice_type:'body_part' },   { text:'Pés', dice_type:'body_part' },
  { text:'Mãos', dice_type:'body_part' },     { text:'Ventre', dice_type:'body_part' },
  { text:'Pulsos', dice_type:'body_part' },   { text:'Clavícula', dice_type:'body_part' },
  { text:'Joelhos', dice_type:'body_part' },  { text:'Tornozelos', dice_type:'body_part' },
  { text:'Nuca', dice_type:'body_part' },     { text:'Dedos', dice_type:'body_part' },
  { text:'Peito', dice_type:'body_part' },    { text:'Cintura', dice_type:'body_part' },
  { text:'Massagem suave', dice_type:'action' },         { text:'Beijos lentos', dice_type:'action' },
  { text:'Mordidas suaves', dice_type:'action' },        { text:'Carícias longas', dice_type:'action' },
  { text:'Sopros quentes', dice_type:'action' },         { text:'Toque com pontas dos dedos', dice_type:'action' },
  { text:'Sussurros', dice_type:'action' },              { text:'Beijos húmidos', dice_type:'action' },
  { text:'Pressão com as palmas', dice_type:'action' },  { text:'Roçar com os lábios', dice_type:'action' },
  { text:'Lambidas suaves', dice_type:'action' },        { text:'Beijinhos rápidos', dice_type:'action' },
  { text:'Amassar gentilmente', dice_type:'action' },    { text:'Traçar com o dedo', dice_type:'action' },
  { text:'Cobrir de beijos', dice_type:'action' },       { text:'Friccionar devagar', dice_type:'action' },
]

// ── POSITIONS ────────────────────────────────────────────────
const positions = [
  { name:'Missionário Clássico', description:'Face a face, máxima intimidade. Ideal para conexão profunda.', difficulty:'facil' },
  { name:'Colher', description:'Deitados de lado, um atrás do outro. Íntimo e relaxante.', difficulty:'facil' },
  { name:'Cowgirl', description:'Um parceiro por cima, controla o ritmo e profundidade.', difficulty:'facil' },
  { name:'Doggy Style', description:'Um parceiro por detrás com controlo máximo do ritmo.', difficulty:'medio' },
  { name:'Reversa Cowgirl', description:'Cowgirl de costas voltadas. Ângulo completamente diferente.', difficulty:'medio' },
  { name:'Lotus', description:'Um de pernas cruzadas, o outro ao colo de frente. Ultra-íntimo.', difficulty:'medio' },
  { name:'Em Pé', description:'Ambos de pé, um por detrás. Espontâneo e excitante.', difficulty:'medio' },
  { name:'Arco', description:'De costas com ancas elevadas. Profundidade máxima.', difficulty:'medio' },
  { name:'Serpente', description:'Ambos de barriga para baixo, um em cima. Estimulação única.', difficulty:'dificil' },
  { name:'Tesoura', description:'De lado com pernas entrelaçadas. Ritmo lento e sensual.', difficulty:'dificil' },
  { name:'Carrossel', description:'O parceiro de cima roda 360 graus. Requer equilíbrio!', difficulty:'dificil' },
  { name:'Fusão', description:'De lado totalmente enlaçados, movimentos mínimos mas profundos.', difficulty:'facil' },
  { name:'Valsa', description:'Movimento circular suave em pé, próximos.', difficulty:'medio' },
  { name:'Âncora', description:'Um estável como âncora, o outro em movimento total.', difficulty:'medio' },
  { name:'Último do Mês', description:'Escolham juntos a posição favorita do mês para repetir!', difficulty:'facil' },
]

// ── MAIN ─────────────────────────────────────────────────────
async function seed() {
  try {
    await mongoose.connect(MONGO_URI)
    console.log('✅ MongoDB connected')
    console.log('🔄 Running UPSERT seed (safe — never deletes existing data)\n')

    const [ch, ca, di] = await Promise.all([
      upsertMany(Challenge,  challenges),
      upsertMany(Card,       cards),
      upsertMany(DiceOption, diceOptions),
    ])

    // Positions: upsert by name
    let posInserted = 0, posSkipped = 0
    for (const pos of positions) {
      const exists = await require('../models/SexPosition').findOne({ name: pos.name })
      if (exists) { posSkipped++; continue }
      await new (require('../models/SexPosition'))(pos).save()
      posInserted++
    }

    console.log('✅ SEED COMPLETO (UPSERT):')
    console.log(`  📋 Desafios: ${ch.inserted} inseridos, ${ch.skipped} já existiam`)
    console.log(`  🃏 Cartas:   ${ca.inserted} inseridas, ${ca.skipped} já existiam`)
    console.log(`  🎲 Dados:    ${di.inserted} inseridos, ${di.skipped} já existiam`)
    console.log(`  💋 Posições: ${posInserted} inseridas, ${posSkipped} já existiam`)
    console.log('\n💡 Podes correr este seed quantas vezes quiseres — nunca apaga dados existentes!')
    process.exit(0)
  } catch (err) {
    console.error('❌ Erro:', err.message)
    process.exit(1)
  }
}

seed()
