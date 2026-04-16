require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Challenge = require('../models/Challenge');
const Card = require('../models/Card');
const DiceOption = require('../models/DiceOption');
const SexPosition = require('../models/SexPosition');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/partymix';

const challenges = [
  { text: 'Imita um político português sem falar', category: 'mimica', mode_type: 'friends', difficulty: 'medio', time_limit: 60 },
  { text: 'Imita um animal a dormir', category: 'mimica', mode_type: 'friends', difficulty: 'facil', time_limit: 45 },
  { text: 'Imita alguém a fazer yoga pela primeira vez', category: 'mimica', mode_type: 'friends', difficulty: 'facil', time_limit: 45 },
  { text: 'Imita um robô a aprender a dançar', category: 'mimica', mode_type: 'friends', difficulty: 'medio', time_limit: 60 },
  { text: 'Desenha o teu pior pesadelo', category: 'desenho', mode_type: 'friends', difficulty: 'medio', time_limit: 90 },
  { text: 'Desenha um peixe a conduzir um carro', category: 'desenho', mode_type: 'friends', difficulty: 'facil', time_limit: 60 },
  { text: 'Qual foi a maior mentira que disseste aos teus pais?', category: 'verdade', mode_type: 'friends', difficulty: 'medio', time_limit: 0 },
  { text: 'Qual foi a coisa mais embaracosa que ja fizeste em publico?', category: 'verdade', mode_type: 'friends', difficulty: 'facil', time_limit: 0 },
  { text: 'Se pudesses apagar uma memoria, qual seria?', category: 'verdade', mode_type: 'friends', difficulty: 'dificil', time_limit: 0 },
  { text: 'Liga para alguem aleatorio dos contactos e canta os parabens', category: 'acao', mode_type: 'friends', difficulty: 'dificil', time_limit: 120, sips_penalty: 3 },
  { text: 'Faz 20 flexoes sem parar', category: 'acao', mode_type: 'friends', difficulty: 'medio', time_limit: 60, sips_penalty: 2 },
  { text: 'Danca como se ninguem estivesse a ver durante 30 segundos', category: 'acao', mode_type: 'friends', difficulty: 'facil', time_limit: 30, sips_penalty: 1 },
  { text: 'Bebe dois goles e imita o jogador ao teu lado durante 1 ronda', category: 'consequencia', mode_type: 'friends', difficulty: 'medio', sips_penalty: 2, is_ongoing: true, ongoing_rounds: 3, ongoing_instruction: 'Imita o jogador a tua esquerda em tudo o que ele fizer!' },
  { text: 'Tens de falar com sotaque brasileiro ate ao proximo turno', category: 'consequencia', mode_type: 'friends', difficulty: 'facil', is_ongoing: true, ongoing_rounds: 2, ongoing_instruction: 'Fala com sotaque brasileiro!' },
  { text: 'Nomeia 5 capitais europeias em 10 segundos', category: 'cultura', mode_type: 'family', difficulty: 'medio', time_limit: 10 },
  { text: 'Qual e o rio mais comprido do mundo?', category: 'cultura', mode_type: 'family', difficulty: 'facil', time_limit: 0 },
  { text: 'Em que ano foi a Revolucao dos Cravos?', category: 'cultura', mode_type: 'family', difficulty: 'facil', time_limit: 0 },
  { text: 'Nomeia 10 clubes da Premier League em 20 segundos', category: 'desporto', mode_type: 'family', difficulty: 'dificil', time_limit: 20 },
  { text: 'Quantos jogadores tem uma equipa de basquetebol em campo?', category: 'desporto', mode_type: 'family', difficulty: 'facil', time_limit: 0 },
  { text: 'Canta o refrao de uma musica dos anos 80', category: 'musica', mode_type: 'family', difficulty: 'medio', time_limit: 30 },
  { text: 'Toca uma musica so com os dedos na mesa', category: 'musica', mode_type: 'family', difficulty: 'facil', time_limit: 20 },
  { text: 'Nomeia 5 filmes de animacao da Disney', category: 'cinema', mode_type: 'family', difficulty: 'facil', time_limit: 15 },
  { text: 'Qual foi o primeiro filme a ganhar o Oscar de Melhor Filme?', category: 'cinema', mode_type: 'family', difficulty: 'dificil', time_limit: 0 },
  { text: 'Imita um leao a cacrar', category: 'mimica', mode_type: 'family', difficulty: 'facil', time_limit: 45 },
  { text: 'Da uma massagem de 2 minutos ao teu parceiro', category: 'erotico', mode_type: 'couple', difficulty: 'facil', time_limit: 120 },
  { text: 'Sussurra algo provocador ao ouvido do teu parceiro', category: 'erotico', mode_type: 'couple', difficulty: 'facil', time_limit: 0 },
  { text: 'Remove uma peca de roupa do teu parceiro sem usar as maos', category: 'erotico', mode_type: 'couple', difficulty: 'dificil', time_limit: 60 },
  { text: 'Descreve em detalhe o teu fantasma mais recente', category: 'erotico', mode_type: 'couple', difficulty: 'medio', time_limit: 0 },
  { text: 'O que e que mais te atrai no teu parceiro?', category: 'verdade', mode_type: 'couple', difficulty: 'facil', time_limit: 0 },
  { text: 'Qual foi o momento em que te apaixonaste mesmo?', category: 'verdade', mode_type: 'couple', difficulty: 'facil', time_limit: 0 },
];

const cards = [
  { text: 'O que nunca deve acontecer numa ___ ?', category: 'geral', is_black: true },
  { text: 'A nova serie da Netflix e sobre ___ .', category: 'absurdo', is_black: true },
  { text: 'O segredo do sucesso e ___ .', category: 'geral', is_black: true },
  { text: 'Porque e que os portugueses adoram ___ ?', category: 'cultura', is_black: true },
  { text: 'O que acontece quando misturar ___ com ___ ?', category: 'absurdo', is_black: true },
  { text: 'A razao pela qual perdi o emprego foi ___ .', category: 'geral', is_black: true },
  { text: 'Bacalhau com natas', category: 'cultura', is_black: false },
  { text: 'Uma cabra a tocar guitarra', category: 'absurdo', is_black: false },
  { text: 'O Pedro Pascal', category: 'geral', is_black: false },
  { text: 'Comer sopa as 3 da manha', category: 'geral', is_black: false },
  { text: 'Um professor de Educacao Fisica em crise existencial', category: 'absurdo', is_black: false },
  { text: 'Demasiado amor por gatos', category: 'geral', is_black: false },
  { text: 'A Cristina Ferreira', category: 'cultura', is_black: false },
  { text: 'Chamar a policia por causa de barulho', category: 'geral', is_black: false },
  { text: 'Uma reuniao que podia ser um email', category: 'geral', is_black: false },
  { text: 'Pasteis de Belem', category: 'cultura', is_black: false },
  { text: 'Existencialismo as 2 da manha', category: 'absurdo', is_black: false },
  { text: 'A tia que traz Tupperware para todo o lado', category: 'geral', is_black: false },
  { text: 'Fazer yoga nu', category: 'adulto', is_black: false },
  { text: 'O ego de um musico de jazz', category: 'absurdo', is_black: false },
  { text: 'Chorar no IKEA', category: 'geral', is_black: false },
  { text: 'Pedir desconto no cafe', category: 'cultura', is_black: false },
];

const diceOptions = [
  { text: 'Labios', dice_type: 'body_part' },
  { text: 'Pescoco', dice_type: 'body_part' },
  { text: 'Orelha', dice_type: 'body_part' },
  { text: 'Ombros', dice_type: 'body_part' },
  { text: 'Costas', dice_type: 'body_part' },
  { text: 'Pes', dice_type: 'body_part' },
  { text: 'Maos', dice_type: 'body_part' },
  { text: 'Ventre', dice_type: 'body_part' },
  { text: 'Massagem', dice_type: 'action' },
  { text: 'Beijos', dice_type: 'action' },
  { text: 'Mordidas suaves', dice_type: 'action' },
  { text: 'Caricias', dice_type: 'action' },
  { text: 'Sopros', dice_type: 'action' },
  { text: 'Beijos lentos', dice_type: 'action' },
  { text: 'Toque leve', dice_type: 'action' },
  { text: 'Sussurros', dice_type: 'action' },
];

const positions = [
  { name: 'Missionario', description: 'A posicao classica. Intimidade face a face, ideal para conexao emocional.', difficulty: 'facil' },
  { name: 'Colher', description: 'Deitados de lado, um abraca o outro por tras. Perfeito para noites relaxantes.', difficulty: 'facil' },
  { name: 'Cowgirl', description: 'Um parceiro fica por cima, controlando o ritmo. Empoderador e divertido.', difficulty: 'facil' },
  { name: 'Doggy Style', description: 'Um parceiro fica por detras. Intenso e apaixonante.', difficulty: 'medio' },
  { name: 'Cadeira', description: 'Um parceiro senta-se ao colo do outro numa cadeira. Intimo e diferente.', difficulty: 'medio' },
  { name: 'Bambolê', description: 'Posicao circular em que ambos se movem em sincronia. Requer coordenacao.', difficulty: 'dificil' },
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');
    await Promise.all([Challenge.deleteMany({}), Card.deleteMany({}), DiceOption.deleteMany({}), SexPosition.deleteMany({})]);
    console.log('Cleared existing data');
    await Promise.all([Challenge.insertMany(challenges), Card.insertMany(cards), DiceOption.insertMany(diceOptions), SexPosition.insertMany(positions)]);
    console.log('Seed complete!');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();
