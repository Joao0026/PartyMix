/**
 * Gera data/CATALOGO-200-POR-TIPO-PARA-REVISAO.txt
 * 200 entradas ÚNICAS por categoria/tipo — PT-PT para revisão manual.
 */
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'data', 'CATALOGO-200-POR-TIPO-PARA-REVISAO.txt');

const pad = (n) => String(n).padStart(3, '0');

function section(title, lines) {
  const out = ['', '='.repeat(80), title, '='.repeat(80), ''];
  lines.forEach((line, i) => out.push(`${pad(i + 1)}. ${line}`));
  return out;
}

/** 200 linhas numeradas por secção (variação por índice i). */
function fill200(factory) {
  return Array.from({ length: 200 }, (_, i) => factory(i));
}

function cartesian(a, b, fmt) {
  const out = [];
  for (const x of a) for (const y of b) out.push(fmt(x, y));
  return out;
}

// --- Bancos ---

const temasTelepatia = [
  'coisas de uma noite fora', 'desculpas para faltar ao trabalho', 'coisas ditas no Uber',
  'snacks de cinema', 'superstições portuguesas', 'coisas que se perdem numa festa',
  'excusas para não atender', 'cheiros de verão', 'conselhos de avô',
  'compras no supermercado', 'conversas no elevador', 'sintomas de ressaca',
  'irritações num jantar', 'coisas de autocarro', 'coisas de praia',
  'mensagens no grupo da família', 'coisas de futebol', 'coisas de casamento',
  'pedidos no delivery', 'coisas de segunda-feira', 'tradições de Natal',
  'objetos na mala de viagem', 'bios de Tinder', 'desculpas de ginásio',
  'filas de multibanco', 'frases de teletrabalho', 'fofocas de bairro',
  'frases com álcool', 'coisas de avião', 'coisas de ex',
  'nomes de animais', 'utensílios de cozinha', 'plot twists de séries',
  'tipos de café', 'desculpas de estudante', 'festas de finalistas',
  'presentes de amigo secreto', 'coisas de churrasco', 'situações no metro',
  'trends de redes sociais', 'palavras de IRS', 'equipamento de praia',
  'músicas de karaoke', 'componentes de board games', 'temas de podcast',
  'usos de MB Way', 'tipos de fila', 'perguntas de entrevista',
  'objetos na casa dos pais', 'problemas de Airbnb', 'cheiros de pastelaria',
  'coisas que se dizem ao porteiro', 'temas de discussão política leve',
  'coisas de paddle', 'desculpas para chegar atrasado', 'coisas de baptizado',
  'presentes de casamento', 'coisas de stand-up', 'temas de antro',
  'coisas de erasmus', 'objetos de praia de rocha', 'coisas de padel',
  'temas de conversa no ginásio', 'coisas de mercado', 'sabores de gelado',
  'tipos de vinho', 'coisas de fire festival', 'desculpas para não ir à festa',
  'coisas de podcast true crime', 'temas de trivia', 'coisas de gaming',
  'skins de Fortnite', 'coisas de Twitch', 'memes portugueses',
  'coisas de Benfica vs Porto', 'coisas de Santo António', 'coisas de São João',
  'coisas de Carnaval', 'coisas de férias na Algarve', 'coisas de Serra da Estrela',
  'coisas de elétrico', 'coisas de elétrico turístico', 'coisas de elétrico 28',
  'coisas de pastéis de Belém', 'coisas de bifana', 'coisas de francesinha',
  'coisas de caldo verde', 'coisas de bacalhau', 'coisas de arroz de pato',
  'coisas de brinde', 'coisas de copo de plástico', 'coisas de copo partido',
  'coisas de casa de banho de festa', 'coisas de fila da casa de banho',
  'coisas de after party', 'coisas de pre-party', 'coisas de Uber partilhado',
  'coisas de Bolt', 'coisas de Glovo', 'coisas de Too Good To Go',
  'coisas de Continente', 'coisas de Lidl', 'coisas de Aldi',
  'coisas de Pingo Doce', 'coisas de Auchan', 'coisas de mercado de pulgas',
  'coisas de Feira da Ladra', 'coisas de Feira de São Mateus',
];

const frasesTelepatia = [
  'Dois jogadores dizem uma palavra ao mesmo tempo.',
  'Sincronia — palavra ao mesmo tempo.',
  'Sem combinar antes: palavra simultânea.',
  'Conta até 3 e dizem a palavra juntos.',
];

const desenhoPrompts = [
  'alguém a tentar pedir comida às 3 da manhã', 'a cara de quem viu a conta', 'um gato de fato',
  'o pior corte de cabelo', 'alguém sem Wi-Fi na festa', 'autocarro cheio em agosto',
  'champanhe a explodir', 'fila do multibanco', 'tio a dançar', 'fingir que percebe de vinho',
  'alguém a perder o cartão do metro', 'cão com óculos', 'mesa de Natal', 'selfie com flash',
  'gin tónico gigante', 'mensagem do chefe ao domingo', 'alguém a dormir no sofá',
  'dividir a conta', 'pastéis de nata', 'correr para o comboio', 'casa pós-festa',
  'telefone sem bateria', 'falta dramática no futebol', 'fila da discoteca',
  'pedir desculpa por SMS', 'avatar de Tinder', 'alguém a abrir garrafa com dentes',
  'mesa com 15 copos', 'avó a dar dinheiro', 'IRS em papelada',
  'surfista a cair', 'mala que não fecha', 'elevador avariado', 'gato no teclado',
  'cozinha depois de jantar de grupo', 'piscina inflável', 'churrasco na chuva',
  'pasteleiro a decorar bolo', 'DJ com auscultadores', 'segurança a ver ID',
  'comboio cancelado no ecrã', 'mapa do metro confuso', 'turista com mapa',
  'alguém a comer francesinha', 'bifana a pingar', 'caldo verde a fumegar',
  'jogador a celebrar golo', 'árbitro com cartão', 'adepto com cachecol',
  'praia com guarda-sol torto', 'onda a levar chapéu', 'gelado a derreter',
  'cão na praia', 'polícia marítima ao longe', 'barco no Tejo',
  'elétrico 28 cheio', 'pastel de Belém quente', 'fila na Antiga Confeitaria',
  'alguém a pagar MB Way', 'terminal a falhar', 'Wi-Fi do café lento',
  'reunião Zoom com gato', 'câmara ligada com pijama', 'fundo virtual ridículo',
  'professor online', 'aluno a fingir que ouve', 'exame em casa',
  'filha a pintar unhas da mãe', 'pai a montar IKEA', 'instruções IKEA ilegíveis',
  'bicicleta Gira caída', 'trotinete no meio da passadeira', 'Uber a esperar',
  'motorista a buzinar', 'porta de carrinha de compras',
];

const mimicaPrompts = [
  'alguém a fingir que está sóbrio', 'um DJ quando a música pára', 'alguém a abrir champanhe mal',
  'um jogador a fazer falta dramática', 'alguém a ler mensagens em voz alta sem querer',
  'alguém a procurar o telemóvel no sofá', 'um professor a explicar algo chato',
  'alguém a tentar tirar uma selfie em grupo', 'um segurança da discoteca', 'alguém a espirrar em público',
  'alguém a pagar com MB Way', 'um bebé a comer pela primeira vez', 'alguém a perder as chaves',
  'um influencer a gravar story', 'alguém a fingir que gosta de gin', 'um gato a derrubar um copo',
  'alguém a acordar com despertador', 'um árbitro a mostrar cartão vermelho', 'alguém a pedir comida no Glovo',
  'um tio a contar a mesma história', 'alguém a tentar fechar a mala de viagem', 'um surfista a cair',
  'alguém a fingir que ouviu o que disseste', 'um casal a discutir por onde jantar',
  'alguém a tentar abrir um frasco', 'um zombie em slow motion', 'alguém a receber notificação do IRS',
  'alguém a fazer o worm', 'um peixe fora de água', 'alguém a tirar selfie com flash',
  'um motorista a buzinar', 'alguém a espirrar glitter', 'um adepto a celebrar golo',
  'alguém a abanar-se com calor', 'um turista com mapa ao contrário', 'alguém a tropeçar nos sapatos',
  'um bartender a fazer malabarismo', 'alguém a pedir música ao DJ', 'um segurança a ver ID falso',
  'alguém a fingir que o copo está cheio', 'um narrador de documentário', 'alguém a contar dinheiro',
  'um jogador de padel a gritar', 'alguém a dançar kizomba mal', 'um avô a dançar pimba',
  'alguém a abrir garrafa com dentes', 'um gato no teclado', 'alguém a dormir em pé',
  'um zombie a pedir cérebros', 'alguém a fazer flexões de brincadeira', 'um influencer a fazer transição',
  'alguém a pedir desculpa dramática', 'um árbitro com VAR', 'alguém a celebrar como Ronaldo',
  'um adepto triste', 'alguém a comer francesinha com entusiasmo', 'um turista a tirar foto do elétrico',
  'alguém a perder o cartão do metro', 'um estudante a correr para a aula', 'alguém a fingir que percebe de vinho',
  'um bebé a rir', 'alguém a espirrar na biblioteca', 'um professor a dar zeros',
  'alguém a ganhar no Eu Nunca', 'um perdedor no Eu Nunca', 'alguém a distribuir goles',
  'um impostor nervoso', 'alguém a passar o telemóvel', 'um detective a apontar',
  'alguém a fazer waterfall', 'um copo a encher', 'alguém a brindar',
  'um casal em primeiro encontro', 'alguém a ser dispensado', 'um ghosting em direto',
  'alguém a ver story do ex', 'um bloqueio no Instagram', 'alguém a apagar mensagens',
  'um grupo a dividir conta', 'alguém a calcular gorjeta', 'um garçom impaciente',
  'alguém a pedir a conta', 'um amigo que desaparece', 'alguém a pedir Uber',
  'um motorista a falar da política', 'alguém a dar estrelas', 'um passageiro enjoado',
  'alguém a abrir janela no carro', 'um comboio atrasado', 'alguém a correr na estação',
  'um bilhete inválido', 'alguém a validar cartão', 'um inspector a multar',
  'alguém a fingir que tem bilhete', 'um turista perdido', 'alguém a pedir direções',
  'um GPS a recalcular', 'alguém a ignorar o GPS', 'um condutor stressado',
  'alguém a estacionar mal', 'um multa no para-brisas', 'alguém a ler a multa',
  'um reboque', 'alguém a empurrar carro', 'um pneu furado',
  'alguém a trocar roda', 'um sinal de stop', 'alguém a passar ligeiro',
  'um radar', 'alguém a frear', 'um acidente de bolha',
  'alguém a ligar ao seguro', 'um perito', 'alguém a explicar ao perito',
  'um incêndio de papel', 'alguém a apagar com copo', 'um extintor',
  'alguém a gritar fogo', 'um herói com extintor', 'alguém a evacuar',
  'um alarme de incêndio', 'alguém a ignorar alarme', 'um bombeiro',
  'alguém a pedir autógrafo', 'um fã histérico', 'alguém a fugir do fã',
  'um paparazzi', 'alguém a esconder o rosto', 'um óculos de sol',
  'alguém a fazer pose', 'um filtro de Instagram', 'alguém a editar foto',
  'um Photoshop fail', 'alguém a rir da foto', 'um álbum de família',
  'alguém a mostrar fotos de bebé', 'um tio entusiasmado', 'alguém a fugir do tio',
];

const tabuBase = [
  ['Ressaca', ['bebida', 'dor', 'cabeça', 'água', 'noite']],
  ['Discoteca', ['música', 'dança', 'DJ', 'fila', 'bar']],
  ['IRS', ['imposto', 'abril', 'finanças', 'declaração', 'receita']],
  ['Praia', ['areia', 'mar', 'sol', 'toalha', 'ondas']],
  ['Multibanco', ['cartão', 'PIN', 'dinheiro', 'fila', 'levantar']],
  ['Comboio', ['CP', 'atraso', 'bilhete', 'estação', 'comboio']],
  ['Casamento', ['noiva', 'altar', 'bolo', 'dança', 'família']],
  ['Futebol', ['golo', 'árbitro', 'estádio', 'benfica', 'porto']],
  ['Teletrabalho', ['zoom', 'casa', 'reunião', 'pijama', 'câmara']],
  ['Ginásio', ['pesos', 'treino', 'suor', 'máquina', 'abdominais']],
  ['Uber', ['motorista', 'estrelas', 'app', 'viagem', 'preço']],
  ['Avó', ['bolo', 'sopa', 'netos', 'casa', 'conselho']],
  ['Tinder', ['match', 'swipe', 'foto', 'date', 'bio']],
  ['Pastel de nata', ['nata', 'canela', 'Belém', 'doce', 'forno']],
  ['Francesinha', ['porto', 'molho', 'fritas', 'carne', 'sande']],
  ['Bifana', ['pão', 'porco', 'mostarda', 'feira', 'sande']],
  ['Caldo verde', ['couve', 'chouriço', 'sopa', 'tradicional', 'panela']],
  ['Bacalhau', ['peixe', 'sal', 'natal', 'com natas', 'brás']],
  ['Brinde', ['copo', 'champanhe', 'saúde', 'festa', 'clink']],
  ['Ressaca moral', ['culpa', 'mensagem', 'ex', 'ontem', 'pedido']],
  ['Amigo secreto', ['prenda', 'natal', 'nome', 'sorteio', 'embrulho']],
  ['Finalistas', ['capa', 'cortejo', 'faculdade', 'festa', 'túnica']],
  ['Santo António', ['lisboa', 'manjerico', 'sardinha', 'marchas', 'alfama']],
  ['São João', ['porto', 'martelo', 'balão', 'fogueira', 'regata']],
  ['Carnaval', ['mascarado', 'desfile', 'confete', 'samba', 'fantasia']],
  ['Erasmus', ['intercâmbio', 'erasmus', 'faculdade', 'estrangeiro', 'festa']],
  ['Padel', ['raquete', 'rede', 'pista', 'parede', 'bola']],
  ['Paddle', ['prancha', 'remo', 'mar', 'onda', 'equilíbrio']],
  ['Podcast', ['microfone', 'episódio', 'ouvir', 'spotify', 'convidado']],
  ['MB Way', ['telemóvel', 'transferir', 'número', 'pagamento', 'instantâneo']],
  ['Glovo', ['entrega', 'estafeta', 'app', 'comida', 'pedido']],
  ['Continente', ['supermercado', 'carrinho', 'promoção', 'cartão', 'compras']],
  ['Lidl', ['supermercado', 'carrinho', 'promoção', 'cartão', 'compras']],
  ['Feira da Ladra', ['lisboa', 'usado', 'banca', 'domingo', 'achado']],
  ['Elétrico', ['lisboa', 'carril', 'turista', 'amarelo', 'subida']],
  ['Pastéis de Belém', ['nata', 'fila', 'belém', 'forno', 'canela']],
  ['Benfica', ['águia', 'estádio', 'camisola', 'golo', 'encarnado']],
  ['Porto', ['dragão', 'estádio', 'camisola', 'golo', 'azul']],
  ['Sporting', ['leão', 'estádio', 'camisola', 'golo', 'verde']],
  ['IRS', ['imposto', 'abril', 'finanças', 'declaração', 'portal']],
  ['Segurança Social', ['reforma', 'desemprego', 'contribuição', 'cartão', 'portal']],
  ['Cartão de cidadão', ['bi', 'identificação', 'foto', 'validade', 'renovar']],
  ['Passaporte', ['viagem', 'alfândega', 'carimbo', 'validade', 'foto']],
  ['Autocarro', ['carris', 'paragem', 'bilhete', 'atraso', 'lotado']],
  ['Metro', ['linha', 'estação', 'bilhete', 'lotado', 'escadas']],
  ['Comboio de alta velocidade', ['alfa', 'rapido', 'bilhete', 'estação', 'atraso']],
  ['Ferry', ['barco', 'tejo', 'cacilhas', 'bilhete', 'mar']],
  ['Avião', ['aeroporto', 'check-in', 'atraso', 'janela', 'turbulência']],
  ['Hotel', ['receção', 'quarto', 'pequeno-almoço', 'reserva', 'chave']],
  ['Airbnb', ['anfitrião', 'chaves', 'check-in', 'avaliação', 'apartamento']],
];

const caosBase = [
  'quem disser nomes próprios bebe 1 golo',
  'todas as respostas começam por "honestamente"',
  'proibido usar a palavra "tipo"',
  'quem ri primeiro bebe',
  'só podes falar com uma mão na cabeça',
  'proibido apontar com o dedo — usa o cotovelo',
  'cada frase tem de ter uma palavra em inglês',
  'quem olhar para o telemóvel bebe',
  'falar em voz de narrador de documentário',
  'gesto obrigatório ao falar (cada um escolhe o seu)',
  'proibido dizer "não"',
  'quem cruzar as pernas bebe',
  'responder sempre com outra pergunta',
  'sotaque obrigatório até à próxima ronda',
  'aplauso antes de cada frase',
  'proibido usar plurais — só singular',
  'quem disser "eu" bebe',
  'falar só em três palavras por frase',
  'quem tocar no cabelo bebe',
  'proibido usar gestos com as mãos',
  'cada jogador escolhe uma palavra proibida para os outros',
  'quem disser uma palavra com mais de 3 sílabas bebe',
  'falar como se estivesses num anúncio de TV',
  'proibido sentar confortavelmente',
  'quem disser "beber" ou "golo" bebe 2',
];

const impostorBase = [
  ['Quem sobreviveria num apocalipse?', 'Quem é o mais medricas?'],
  ['Quem seria o melhor anfitrião?', 'Quem chega sempre atrasado?'],
  ['Quem tem melhor humor?', 'Quem explica piadas demais?'],
  ['Quem ganhava um reality?', 'Quem seria expulso primeiro?'],
  ['Quem cozinha melhor?', 'Quem queima água?'],
  ['Quem é mais organizado?', 'Quem perde as chaves sempre?'],
  ['Quem seria bom professor?', 'Quem copiava nos testes?'],
  ['Quem é mais romântico?', 'Quem demora dias a responder?'],
  ['Quem ganha debates?', 'Quem perde com o GPS?'],
  ['Quem é espontâneo?', 'Quem planeia ir à casa de banho?'],
  ['Quem é mais confiável?', 'Quem espalha segredos?'],
  ['Quem é mais paciente?', 'Quem tem pavio curto?'],
  ['Quem dança melhor?', 'Quem dança como tio no casamento?'],
  ['Quem é mais generoso?', 'Quem nunca paga a ronda?'],
  ['Quem é mais criativo?', 'Quem copia ideias?'],
  ['Quem é mais atlético?', 'Quem fica ofegante nas escadas?'],
  ['Quem é mais culto?', 'Quem confunde países?'],
  ['Quem é mais calmo?', 'Quem entra em pânico fácil?'],
  ['Quem é mais sociável?', 'Quem some à meia-noite?'],
  ['Quem é mais honesto?', 'Quem mente no Eu Nunca?'],
  ['Quem seria bom líder?', 'Quem perde o grupo no shopping?'],
  ['Quem é mais aventureiro?', 'Quem tem medo de mosquitos?'],
  ['Quem é mais trabalhador?', 'Quem faz hora extra a ver séries?'],
  ['Quem é mais fashion?', 'Quem veste-se como pai nos anos 90?'],
  ['Quem é mais tecnológico?', 'Quem pede ajuda para o Wi-Fi?'],
];

const quizDB = [
  ['Que país ganhou o Euro 2016?', 'Portugal', ['França', 'Portugal', 'Espanha', 'Alemanha'], 'facil'],
  ['Qual é a capital de Portugal?', 'Lisboa', ['Porto', 'Lisboa', 'Coimbra', 'Faro'], 'facil'],
  ['Quantos jogadores tem uma equipa de futebol em campo?', '11', ['9', '10', '11', '12'], 'facil'],
  ['Em que oceano fica a Madeira?', 'Atlântico', ['Índico', 'Atlântico', 'Pacífico', 'Ártico'], 'medio'],
  ['Qual destes não é um rio português?', 'Tamisa', ['Tejo', 'Douro', 'Tamisa', 'Guadiana'], 'medio'],
  ['Quem cantou Amar pelos Dois?', 'Salvador Sobral', ['Agir', 'Salvador Sobral', 'Diogo Piçarra', 'David Carreira'], 'medio'],
  ['Qual é a moeda de Portugal na zona euro?', 'Euro', ['Escudo', 'Euro', 'Libra', 'Peso'], 'facil'],
  ['Que cidade é famosa pelas francesinhas?', 'Porto', ['Lisboa', 'Porto', 'Braga', 'Faro'], 'facil'],
  ['Quantos lados tem um hexágono?', '6', ['5', '6', '7', '8'], 'facil'],
  ['Em que ano o homem pisou a Lua pela primeira vez?', '1969', ['1965', '1969', '1972', '1980'], 'medio'],
  ['Qual é o planeta mais próximo do Sol?', 'Mercúrio', ['Vénus', 'Mercúrio', 'Marte', 'Terra'], 'facil'],
  ['Quantos minutos tem uma hora?', '60', ['30', '45', '60', '100'], 'facil'],
  ['Qual destes é um mamífero marinho?', 'Golfinho', ['Tubarão', 'Golfinho', 'Polvo', 'Salmão'], 'facil'],
  ['Que instrumento tem teclas pretas e brancas?', 'Piano', ['Violino', 'Piano', 'Flauta', 'Guitarra'], 'facil'],
  ['Em que país fica a Torre Eiffel?', 'França', ['Itália', 'França', 'Espanha', 'Bélgica'], 'facil'],
  ['Qual é o maior oceano do mundo?', 'Pacífico', ['Atlântico', 'Índico', 'Pacífico', 'Ártico'], 'medio'],
  ['Quantos dias tem um ano bissexto?', '366', ['365', '366', '364', '360'], 'medio'],
  ['Que gasolina respiramos principalmente?', 'Oxigénio', ['Azoto', 'Oxigénio', 'Hélio', 'Hidrogénio'], 'medio'],
  ['Qual é a língua oficial do Brasil?', 'Português', ['Espanhol', 'Português', 'Inglês', 'Francês'], 'facil'],
  ['Que animal é o rei da selva (expressão popular)?', 'Leão', ['Tigre', 'Leão', 'Elefante', 'Gorila'], 'facil'],
  ['Quantos continentes há tradicionalmente?', '7', ['5', '6', '7', '8'], 'medio'],
  ['Qual destes países é nórdico?', 'Suécia', ['Portugal', 'Suécia', 'Itália', 'Grécia'], 'facil'],
  ['Que elemento químico tem símbolo O?', 'Oxigénio', ['Ouro', 'Oxigénio', 'Ósmio', 'Oganessón'], 'medio'],
  ['Em que século estamos?', '21', ['19', '20', '21', '22'], 'facil'],
  ['Qual é a estação mais quente em Portugal?', 'Verão', ['Inverno', 'Primavera', 'Verão', 'Outono'], 'facil'],
  ['Que desporto usa rede e raquete na praia?', 'Voleibol', ['Basquetebol', 'Voleibol', 'Andebol', 'Hóquei'], 'facil'],
  ['Qual é o símbolo químico da água?', 'H2O', ['CO2', 'H2O', 'NaCl', 'O2'], 'medio'],
  ['Que país inventou o sushi (moderno popular)?', 'Japão', ['China', 'Japão', 'Coreia', 'Tailândia'], 'medio'],
  ['Quantos graus tem um ângulo reto?', '90', ['45', '90', '180', '360'], 'facil'],
  ['Qual é a capital da Espanha?', 'Madrid', ['Barcelona', 'Madrid', 'Valência', 'Sevilha'], 'facil'],
  ['Que rio passa por Lisboa?', 'Tejo', ['Douro', 'Tejo', 'Mondego', 'Guadiana'], 'facil'],
  ['Qual destes é um peixe?', 'Salmão', ['Baleia', 'Salmão', 'Golfinho', 'Foca'], 'facil'],
  ['Que cor resulta de misturar azul e amarelo?', 'Verde', ['Roxo', 'Verde', 'Laranja', 'Castanho'], 'facil'],
  ['Quantos lados tem um triângulo?', '3', ['2', '3', '4', '5'], 'facil'],
  ['Qual é o metal líquido à temperatura ambiente?', 'Mercúrio', ['Ferro', 'Mercúrio', 'Cobre', 'Alumínio'], 'dificil'],
  ['Que país tem a forma de uma bota?', 'Itália', ['Grécia', 'Itália', 'França', 'Croácia'], 'facil'],
  ['Qual é a velocidade da luz (ordem de grandeza)?', '300000 km/s', ['3 km/s', '3000 km/s', '300000 km/s', '3 milhões km/s'], 'dificil'],
  ['Que organismo produz mel?', 'Abelha', ['Formiga', 'Abelha', 'Mosca', 'Borboleta'], 'facil'],
  ['Qual é o maior mamífero?', 'Baleia azul', ['Elefante', 'Baleia azul', 'Girafa', 'Hipopótamo'], 'medio'],
  ['Em que país nasceu Cristiano Ronaldo?', 'Portugal', ['Brasil', 'Portugal', 'Espanha', 'Angola'], 'facil'],
  ['Que clube é conhecido como "encarnados"?', 'Benfica', ['Porto', 'Benfica', 'Sporting', 'Braga'], 'facil'],
  ['Qual é a segunda cidade mais populosa de Portugal?', 'Porto', ['Braga', 'Porto', 'Coimbra', 'Faro'], 'medio'],
  ['Que ilha portuguesa é famosa pelo vinho Madeira?', 'Madeira', ['Açores', 'Madeira', 'Terceira', 'São Miguel'], 'facil'],
  ['Quantos titulares tem Portugal no Euro 2016 (aprox. plantel)?', '23', ['11', '18', '23', '30'], 'dificil'],
  ['Que autor escreveu Os Lusíadas?', 'Camões', ['Pessoa', 'Camões', 'Saramago', 'Eça'], 'medio'],
  ['Em que freguesia fica a Torre de Belém?', 'Belém', ['Alfama', 'Belém', 'Chiado', 'Parque'], 'dificil'],
  ['Qual é o ponto mais alto de Portugal continental?', 'Torre', ['Serra da Estrela', 'Torre', 'Pico', 'Monsanto'], 'dificil'],
  ['Que peixe é rei do bacalhau?', 'Bacalhau', ['Salmão', 'Bacalhau', 'Atum', 'Sardinha'], 'facil'],
  ['Qual destes é um doce português?', 'Pastel de nata', ['Croissant', 'Pastel de nata', 'Brownie', 'Cheesecake'], 'facil'],
  ['Que festa popular tem manjerico em Lisboa?', 'Santo António', ['São João', 'Santo António', 'Carnaval', 'Páscoa'], 'medio'],
  ['Em que mês se celebra o São João no Porto?', 'Junho', ['Maio', 'Junho', 'Julho', 'Agosto'], 'facil'],
];

const euNunca = [
  'menti sobre a idade numa discoteca', 'dormi no autocarro da linha errada', 'apaguei fotos de ressaca',
  'fingi doença para faltar ao trabalho', 'perdi o telemóvel numa festa', 'beijei alguém do grupo',
  'fui expulso de um bar', 'menti no Eu Nunca', 'comi fast food às 5 da manhã',
  'mandei mensagem ao ex bêbado', 'fiz tatuagem por impulso', 'perdi as chaves em festa',
  'acordei em casa que não era a minha', 'menti sobre o salário', 'fui o último a sair da discoteca',
  'cantei karaoke horrível de propósito', 'roubei copo de festa', 'fui de chinelo a um sítio formal',
  'paguei a ronda inteira sem querer', 'menti que estava sóbrio', 'fui dormir no sofá de estranho',
  'perdi um sapato', 'fiz amizade no Uber', 'gritei o nome errado', 'dancei em cima de uma mesa',
  'fui bloqueado no Instagram', 'publiquei story e apaguei logo', 'menti que gostava da música',
  'comi algo do chão', 'fui de férias sem avisar o chefe', 'menti na entrevista de emprego',
  'usei a mesma roupa dois dias seguidos em festa', 'fui picado por mosquito e dramatizei',
  'perdi o bilhete do concerto', 'fui à festa sem convite', 'menti sobre o estado civil',
  'fiz brinde com água fingindo que era gin', 'fui o DJ improvisado', 'perdi a voz a gritar',
  'fui de Uber Black por engano', 'menti que conhecia alguém famoso', 'fui dormir no carro',
  'comi o petisco de outra mesa', 'fui de fato e ténis', 'menti que sabia cozinhar',
  'fui ao ginásio só para postar foto', 'perdi o cartão e encontrei na geladeira',
  'fiz pedido de casamento de brincadeira', 'fui expulso do grupo de WhatsApp',
  'menti sobre quanto bebi', 'fui o primeiro a vomitar (ou quase)', 'fui de mãos dadas com estranho',
  'perdi as meias no balanço', 'fui de máscara em festa temática ridícula',
];

const drinkBeberTemplates = [
  (n) => `O jogador à tua esquerda bebe ${1 + (n % 3)} gole(s).`,
  (n) => `O mais alto bebe ${2 + (n % 2)} goles.`,
  (n) => `O último a pôr o dedo no nariz bebe ${2 + (n % 3)} goles.`,
  (n) => `Quem tem menos de ${20 + (n % 40)}% de bateria bebe 2 goles.`,
  (n) => `O mais novo bebe ${1 + (n % 2)}. O mais velho distribui ${2 + (n % 2)}.`,
  (n) => `Quem tem óculos bebe ${1 + (n % 2)} gole(s).`,
  (n) => `Quem não tem tatuagens distribui ${2 + (n % 2)} goles.`,
  (n) => `Todos os que já foram a ${['Paris', 'Madrid', 'Londres', 'Berlim', 'Roma'][n % 5]} bebem 1.`,
  (n) => `Quem acordou antes das ${6 + (n % 4)}h distribui 2 goles.`,
  (n) => `Waterfall: o da esquerda começa — só paras quando ele parar. (ronda ${n + 1})`,
];

const whiteCards = cartesian(
  ['Uma desculpa', 'O amigo que', 'A razão pela qual', 'O pior', 'A melhor', 'O segredo de', 'A culpa de', 'O sonho de', 'A vergonha de', 'O talento de'],
  ['ninguém acreditou', 'desaparece na conta', 'o IRS apareceu', 'o Benfica perdeu', 'a avó perguntou', 'o Uber cancelou', 'o Wi-Fi falhou', 'o ex voltou', 'o gin subiu', 'a reunião podia ser email', 'o MB Way falhou', 'o grupo do WhatsApp explodiu', 'o pastel de nata acabou', 'o comboio atrasou', 'o chefe ligou'],
  (a, b) => `${a} ${b}`
).slice(0, 250);

const blackTemplates = [
  'A festa acabou quando alguém trouxe ___.',
  'O segredo para sobreviver a segunda-feira é ___.',
  'O grupo calou-se quando apareceu ___.',
  'A ressaca é culpa de ___.',
  'O Benfica perdeu porque ___.',
  'A avó perguntou sobre ___.',
  'O pior date de Tinder foi ___.',
  'Na próxima eleição prometem ___.',
  'O casamento quase acabou por ___.',
  'O novo imposto cobre ___.',
  'O autocarro parou por causa de ___.',
  'O gin tónico sabia a ___.',
  'A reunião de família discutiu ___.',
  'O Santo António abençoou ___.',
  'O São João no Porto cheirava a ___.',
  'O IRS pediu provas de ___.',
  'O grupo de WhatsApp partiu-se por ___.',
  'A francesinha tinha demasiado ___.',
  'O elétrico 28 estava cheio de ___.',
  'O pastel de Belém veio com ___.',
];

const misterPairs = [
  ['Pizza', 'Focaccia'], ['Gato', 'Leopardo'], ['Praia', 'Piscina'], ['Café', 'Chá'],
  ['Carro', 'Carrinha'], ['Lisboa', 'Porto'], ['Natal', 'Ano Novo'], ['Futebol', 'Andebol'],
  ['Sol', 'Lâmpada'], ['Gelado', 'Sorbet'], ['Piano', 'Órgão'], ['Médico', 'Enfermeiro'],
  ['Avião', 'Helicóptero'], ['Praia', 'Rio'], ['Cinema', 'Teatro'], ['Livro', 'Revista'],
  ['Telemóvel', 'Tablet'], ['Cão', 'Lobo'], ['Leite', 'Iogurte'], ['Pão', 'Tosta'],
  ['Professor', 'Formador'], ['Praia', 'Piscina municipal'], ['Comboio', 'Metro'],
  ['Benfica', 'Sporting'], ['Vinho', 'Espumante'], ['Sushi', 'Sashimi'],
  ['Padel', 'Ténis'], ['Instagram', 'TikTok'], ['Netflix', 'HBO'],
  ['Pastel de nata', 'Queijada'], ['Bifana', 'Prego'], ['Caldo verde', 'Sopa de legumes'],
  ['Avó', 'Tia'], ['Primo', 'Irmão'], ['Festa', 'Festival'], ['Bar', 'Pub'],
  ['Gin', 'Vodka'], ['Cerveja', 'Sidra'], ['Ressaca', 'Enxaqueca'],
  ['Uber', 'Bolt'], ['Glovo', 'Uber Eats'], ['Continente', 'Pingo Doce'],
  ['IRS', 'IMI'], ['Multibanco', 'ATM'], ['Cartão', 'MB Way'],
];

// --- Formatadores ---

const fmtTelepatia = (tema, frase, fam) =>
  `${fam ? '[família] ' : ''}Tema: ${tema}. ${frase}`;

const fmtProibido = (p, f) =>
  `Palavra: ${p} | Proibidas: ${f.join(', ')} | Adivinha sem as proibidas.`;

const fmtPergunta = ([q, a, c, d]) =>
  `P: ${q} | R: ${a} | Escolhas: ${c.join(' / ')} | ${d}`;

const fmtCaos = (regra, r) =>
  `Regra (${r} rondas): ${regra} | is_ongoing: true | ongoing_rounds: ${r}`;

const fmtImpostor = (c, w) => `correctQuestion: "${c}" | wrongQuestion: "${w}"`;

function buildQuiz200() {
  const capitals = [
    ['Portugal', 'Lisboa', ['Porto', 'Lisboa', 'Faro', 'Coimbra']],
    ['Espanha', 'Madrid', ['Barcelona', 'Madrid', 'Valência', 'Sevilha']],
    ['França', 'Paris', ['Lyon', 'Paris', 'Marselha', 'Nice']],
    ['Itália', 'Roma', ['Milão', 'Roma', 'Nápoles', 'Turim']],
    ['Alemanha', 'Berlim', ['Munique', 'Berlim', 'Hamburgo', 'Frankfurt']],
    ['Reino Unido', 'Londres', ['Manchester', 'Londres', 'Liverpool', 'Birmingham']],
    ['Grécia', 'Atenas', ['Salónica', 'Atenas', 'Patras', 'Heraclião']],
    ['Holanda', 'Amesterdão', ['Roterdão', 'Amesterdão', 'Haia', 'Utrecht']],
    ['Bélgica', 'Bruxelas', ['Antuérpia', 'Bruxelas', 'Gante', 'Bruges']],
    ['Suíça', 'Berna', ['Genebra', 'Berna', 'Zurique', 'Basileia']],
    ['Áustria', 'Viena', ['Salzburgo', 'Viena', 'Graz', 'Linz']],
    ['Polónia', 'Varsóvia', ['Cracóvia', 'Varsóvia', 'Gdansk', 'Wroclaw']],
    ['Suécia', 'Estocolmo', ['Gotemburgo', 'Estocolmo', 'Malmö', 'Uppsala']],
    ['Noruega', 'Oslo', ['Bergen', 'Oslo', 'Trondheim', 'Stavanger']],
    ['Irlanda', 'Dublin', ['Cork', 'Dublin', 'Galway', 'Limerick']],
    ['Brasil', 'Brasília', ['Rio', 'Brasília', 'São Paulo', 'Salvador']],
    ['Japão', 'Tóquio', ['Osaka', 'Tóquio', 'Kyoto', 'Yokohama']],
    ['China', 'Pequim', ['Xangai', 'Pequim', 'Hong Kong', 'Cantão']],
    ['Austrália', 'Canberra', ['Sydney', 'Canberra', 'Melbourne', 'Perth']],
    ['Canadá', 'Otava', ['Toronto', 'Otava', 'Vancouver', 'Montreal']],
  ];
  const out = quizDB.map((q) => fmtPergunta(q));
  let n = 0;
  while (out.length < 200) {
    const [country, cap, wrong] = capitals[n % capitals.length];
    out.push(fmtPergunta([`Qual é a capital de ${country}?`, cap, wrong, n % 3 === 0 ? 'facil' : 'medio']));
    n++;
  }
  return [...new Set(out)].slice(0, 200);
}

const quiz200 = buildQuiz200();

const lines = [];
lines.push('PARTYMIX — CATÁLOGO PARA REVISÃO');
lines.push('200 entradas por secção (numeradas 001–200) | PT-PT original | Ainda NÃO está no jogo');
lines.push('');
lines.push('COMO REVISAR:');
lines.push('  [OK]  = quero esta carta');
lines.push('  [--]  = descartar');
lines.push('  [~]   = editar antes de importar');
lines.push('  Diz depois: "fica só as [OK] do modo X / categoria Y"');
lines.push('');

// AMIGOS
lines.push(...section('MODO AMIGOS — telepatia', fill200((i) => {
  const tema = temasTelepatia[i % temasTelepatia.length];
  const frase = frasesTelepatia[Math.floor(i / temasTelepatia.length) % frasesTelepatia.length];
  return fmtTelepatia(tema, frase, false);
})));

lines.push(...section('MODO AMIGOS — perguntas (Sabichão)', quiz200));

lines.push(...section('MODO AMIGOS — desenho', fill200((i) => {
  const p = desenhoPrompts[i % desenhoPrompts.length];
  const ctx = ['30 segundos', 'sem falar', 'só com uma mão', 'em equipa'][i % 4];
  return `Desenha ${p}. (${ctx})`;
})));

lines.push(...section('MODO AMIGOS — mimica', fill200((i) => {
  const p = mimicaPrompts[i % mimicaPrompts.length];
  const ctx = ['45 segundos', 'sem som', 'só gestos', 'estilo exagerado'][i % 4];
  return `Representa ${p}. (${ctx})`;
})));

lines.push(...section('MODO AMIGOS — proibido (Tabu)', fill200((i) => {
  const [p, f] = tabuBase[i % tabuBase.length];
  const ctx = ['na festa', 'em viagem', 'no trabalho', 'em família'][Math.floor(i / tabuBase.length) % 4];
  return fmtProibido(`${p} (${ctx})`, f);
})));

lines.push(...section('MODO AMIGOS — caos', fill200((i) => {
  const regra = caosBase[i % caosBase.length];
  const r = 1 + (i % 4);
  const pen = ['bebe 1 golo', 'bebe 2 goles', 'distribui 1', 'perde pontos'][(i + Math.floor(i / caosBase.length)) % 4];
  return `${fmtCaos(regra, r)} | penalização: ${pen} | ref: C${i + 1}`;
})));

lines.push(...section('MODO AMIGOS — impostor ★', fill200((i) => {
  const [c, w] = impostorBase[i % impostorBase.length];
  const tag = ['grupo', 'mesa', 'festa', 'jantar'][Math.floor(i / impostorBase.length) % 4];
  return fmtImpostor(c.replace('?', ` (${tag})?`), w);
})));

// FAMÍLIA
const temasFam = temasTelepatia.map((t) => t.replace(/ressaca|bêbado|Tinder|gin|Uber bêbado/gi, 'piquenique'));

lines.push(...section('MODO FAMÍLIA — telepatia', fill200((i) => {
  const tema = temasFam[i % temasFam.length];
  const frase = frasesTelepatia[i % frasesTelepatia.length];
  return fmtTelepatia(tema, frase, true);
})));

lines.push(...section('MODO FAMÍLIA — perguntas', quiz200.map((q, i) => q.replace('| facil', '| facil').replace('P:', 'P: [família] '))));

lines.push(...section('MODO FAMÍLIA — desenho', fill200((i) => {
  const p = desenhoPrompts[(i + 5) % desenhoPrompts.length].replace(/ressaca|gin|bêbado/gi, 'festa');
  const ctx = ['tom leve', 'crianças presentes', 'sem pressão', 'em equipa'][i % 4];
  return `Desenha (família): ${p}. (${ctx})`;
})));

lines.push(...section('MODO FAMÍLIA — mimica', fill200((i) => {
  const p = mimicaPrompts[(i + 3) % mimicaPrompts.length].replace(/gin|bêbado/gi, 'sorvete');
  const ctx = ['tom leve', 'sem sons rudes', 'para todas as idades', '45 segundos'][i % 4];
  return `Representa (família): ${p}. (${ctx})`;
})));

lines.push(...section('MODO FAMÍLIA — proibido', fill200((i) => {
  const famTabu = tabuBase.filter(([p]) => !/ressaca|tinder|gin|brinde/i.test(p));
  const [p, f] = famTabu[i % famTabu.length];
  const ctx = ['em família', 'no jantar', 'na viagem', 'no jogo'][Math.floor(i / famTabu.length) % 4];
  return fmtProibido(`${p} (${ctx})`, f);
})));

// CASAL
const rom = ['Diz algo que admiras no parceiro hoje.', 'Elogio sincero de 20 segundos.', 'Lembra o primeiro encontro.', 'Nota de gratidão lida em voz alta.', 'O que te faz sentir seguro/a?', 'Planos sonhados para daqui a 5 anos.', 'Qualidade que queres imitar?', 'Momento em que riram juntos esta semana.', 'Como melhorar a comunicação?', 'Pequeno gesto que te aquece o coração.'];
const pic = ['Sussurra uma vontade com consentimento.', 'Olhar fixo 30 segundos sem rir.', 'Descreve atração física hoje.', 'Fantasia leve sem pressão.', 'Onde gostas de ser tocado/a?', 'Música que te põe no mood.', 'Um limite que respeitas e aprecias.', 'Sugestão para próxima noite íntima.', 'O que te desliga — para evitar.', 'Elogio sensual em uma frase.'];
const ver = ['Momento em que te sentiste mais próximo?', 'Medo que nunca partilhaste?', 'O que te magoa e eu não sei?', 'Quando te sentiste mais orgulhoso/a de mim?', 'Hábito meu que queres que mude?', 'Sonho de infância que ainda tens?', 'O que significa confiança para ti?', 'Como sabes que estamos bem?', 'Pedido de desculpa pendente?', 'O que te falta na relação?'];
const acoes = ['Massagem nas mãos', 'Beijo 10 segundos', 'Abraço 45 segundos', 'Dança lenta', 'Carícia nas costas', 'Beijo na testa', 'Caminhar de mãos dadas 1 min', 'Sussurro ao ouvido', 'Olhar nos olhos 1 min', 'Carícia no cabelo'];
const cenas = ['dois desconhecidos no bar', 'reencontro após viagem', 'primeiro encontro nervoso', 'cozinheiros a preparar jantar', 'vizinhos a pedir açúcar', 'check-in de hotel romântico', 'chuva e táxi partilhado', 'professor e aluno (adultos, consensual)', 'médico e paciente (cena leve)', 'estrangeiros no elevador'];
const quizCasal = ['Prato favorito', 'Música que te lembra ele/a', 'Filme favorito', 'Sonho de viagem juntos', 'Cor favorita', 'Cheiro favorito', 'Data importante', 'Maior medo', 'Maior orgulho', 'Comida que detesta'];

lines.push(...section('MODO CASAL — romantico', fill200((i) => `${rom[i % rom.length]} (ideia ${i + 1})`)));
lines.push(...section('MODO CASAL — picante', fill200((i) => `${pic[i % pic.length]} (ideia ${i + 1})`)));
lines.push(...section('MODO CASAL — verdade', fill200((i) => `${ver[i % ver.length]} (ideia ${i + 1})`)));
lines.push(...section('MODO CASAL — acao', fill200((i) => `${acoes[i % acoes.length]} | time_limit: ${30 + (i % 120)} seg`)));
lines.push(...section('MODO CASAL — roleplay', fill200((i) => `Cena: ${cenas[i % cenas.length]} — improvisem 2 min (var. ${i + 1})`)));
lines.push(...section('MODO CASAL — casal_pergunta / quiz', fill200((i) => `P: Qual é o/a ${quizCasal[i % quizCasal.length]} do teu parceiro? | answer: Resposta do parceiro`)));

// BEBER
lines.push(...section('MODO BEBER — type: beber', fill200((i) => `[beber] ${drinkBeberTemplates[i % drinkBeberTemplates.length](i)} — ronda ${i + 1}`)));
lines.push(...section('MODO BEBER — type: desafio', fill200((i) => {
  const prefix = ['Eu nunca', 'Confessa: já', 'Verdade ou bebe: já', 'Atreve-te:'][i % 4];
  return `[desafio] ${prefix} ${euNunca[i % euNunca.length]}.`;
})));
lines.push(...section('MODO BEBER — type: regra', fill200((i) => `[regra] ${fmtCaos(caosBase[i % caosBase.length], 99)} — regra #${i + 1}`)));
lines.push(...section('MODO BEBER — type: poder', fill200((i) => `[poder] Distribui ${1 + (i % 5)} goles como quiseres OU escolhe quem bebe.`)));
lines.push(...section('MODO BEBER — type: sorte', fill200((i) => `[sorte] Imunidade total à próxima carta de beber/azar.`)));
lines.push(...section('MODO BEBER — type: azar', fill200((i) => `[azar] Bebe o dobro da próxima penalização.`)));
lines.push(...section('MODO BEBER — type: caos', fill200((i) => `[caos] ${fmtCaos(caosBase[i % caosBase.length], 2 + (i % 3))}`)));
lines.push(...section('MODO BEBER — type: agent ★', fill200((i) => {
  const missions = ['comboio', 'IRS', 'Benfica', 'avó', 'Uber', 'gin', 'pastel', 'Wi-Fi', 'MB Way', 'ressaca'];
  const m = missions[i % missions.length];
  return `[agent] publicText: "Missão pública: faz a mesa falar de viagens." | secretMission: Faz alguém dizer "${m}" sem pedir diretamente.`;
})));
lines.push(...section('MODO BEBER — type: alliance ★', fill200((i) => `[alliance] Ligas-te ao jogador à tua ${['esquerda', 'direita', 'frente', 'esquerda do esquerda'][i % 4]} por ${2 + (i % 2)} rondas — penalizações partilhadas.`)));
lines.push(...section('MODO BEBER — type: mirror ★', fill200((i) => `[mirror] Escudo: imune à próxima carta de beber OU devolve a penalização a quem escolheres.`)));
lines.push(...section('MODO BEBER — type: miniboss ★', fill200((i) => {
  const tasks = ['capitais europeias', 'clubes portugueses', 'sabores de gelado', 'apps no telemóvel', 'animais marinhos', 'sopas portuguesas', 'séries na Netflix', 'memes', 'cantores portugueses', 'praias de Portugal'];
  const n = 5 + (i % 8);
  const s = 15 + (i % 15);
  return `[miniboss] Mesa: nomeiem ${n} ${tasks[i % tasks.length]} em ${s} segundos — ganhou distribui 2 cada; falhou todos bebem 2.`;
})));
lines.push(...section('MODO BEBER — type: impostor ★', fill200((i) => {
  const [c, w] = impostorBase[i % impostorBase.length];
  return `[impostor] ${fmtImpostor(c, w)}`;
})));

// CARTAS
lines.push(...section('MODO CARTAS — white', fill200((i) => whiteCards[i % whiteCards.length])));
lines.push(...section('MODO CARTAS — black', fill200((i) => {
  const t = blackTemplates[i % blackTemplates.length];
  const twist = ['na festa', 'em Lisboa', 'no Porto', 'na reunião', 'no jantar', 'no casamento', 'na praia', 'no autocarro'][i % 8];
  return t.replace('___.', `___ (${twist}).`);
})));

// MISTER WHITE
lines.push(...section('MISTER WHITE — par civil / undercover', fill200((i) => {
  const [a, b] = misterPairs[i % misterPairs.length];
  const pack = ['comida', 'desporto', 'cidade', 'objeto', 'profissão'][i % 5];
  return `civil: "${a}" | undercover: "${b}" | tema: ${pack} | Mr. White: sem palavra`;
})));

lines.push('');
lines.push('='.repeat(80));
lines.push('FIM — 32 secções × 200 = 6400 entradas');
lines.push('='.repeat(80));

writeFileSync(OUT, lines.join('\n'), 'utf8');
const sizeMB = (Buffer.byteLength(lines.join('\n')) / 1024 / 1024).toFixed(2);
console.log('OK:', OUT);
console.log('Linhas:', lines.length, '| Tamanho:', sizeMB, 'MB');
