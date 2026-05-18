# PartyMix

PartyMix é uma web app de jogos de festa feita com React, Node.js, MongoDB e Socket.IO. O objetivo é juntar vários modos de jogo num produto mobile-first que funcione bem em telemóvel, em casal, com amigos ou em família.

O projeto está em desenvolvimento. Ainda não há aplicação nativa publicada, planos pagos, reviews reais, ranking global ou sistema de contas de utilizador.

## Funcionalidades Atuais

- Modos principais: Casal, Amigos, Família, Beber, Cartas e Mister White.
- Configuração de jogadores, equipas, categorias, mini-jogos e pontuação.
- Jogos com mapa, desafios contínuos, mini-jogos e ecrã de vitória.
- Modo de cartas com lobby/sala e sincronização via Socket.IO.
- Modo comunidade para submeter, votar, aprovar e rejeitar cartas ou ideias.
- Painel admin protegido por password e JWT.
- Geração de desafios/cartas com IA via backend usando Groq.
- PWA com manifest, service worker, ícones e layout otimizado para mobile.
- Idiomas no frontend: português, inglês e espanhol.

## Modos de Jogo

- **Casal**: experiência para 2 jogadores, com desafios, perguntas e componentes específicos para casal.
- **Amigos**: modo flexível com mapa, categorias, mini-jogos, equipas e objetivos de pontuação.
- **Família**: variação mais leve do modo por categorias, pensada para grupos.
- **Beber**: jogo de bebida com cartas, regras, desafios surpresa e geração opcional por IA.
- **Cartas**: lobby e jogo de cartas em tempo real, com cartas brancas/pretas.
- **Mister White**: jogo de dedução/impostor.
- **Daily Scratch**: página disponível em `/daily`, ainda separada do fluxo principal.
- **Admin**: página em `/admin` para gerir conteúdo e submissões.

## Stack

- **Frontend**: React 18, Vite, React Router, Tailwind CSS, Framer Motion, Socket.IO Client, Vite PWA.
- **Backend**: Node.js, Express, MongoDB/Mongoose, Socket.IO, JWT, express-rate-limit.
- **Base de dados**: MongoDB local ou MongoDB Atlas.
- **Deploy previsto**: frontend em Netlify e backend em Render.

## Estrutura

```text
backend/
  lib/                 Configuração partilhada, como CORS
  middleware/          Auth admin e rate limits
  models/              Modelos Mongoose
  routes/              Rotas REST da API
  seeds/               Dados iniciais
  server.js            Entrada do backend HTTP + Socket.IO
  websocket.js         Eventos em tempo real

frontend/
  public/              Manifest, service worker e ícones
  src/
    components/        Componentes reutilizáveis
    contexts/          Contextos React
    i18n/              Traduções
    pages/             Páginas principais
    utils/             API, sockets, sons e estado de jogo
```

## Requisitos

- Node.js 20 recomendado.
- npm.
- MongoDB local ou uma ligação MongoDB Atlas.

## Instalação

```bash
npm run install:all
```

Também podes instalar separadamente:

```bash
cd backend
npm install

cd ../frontend
npm install
```

## Variáveis de Ambiente

Cria um ficheiro `backend/.env` a partir de `backend/.env.example`.

Variáveis usadas pelo backend:

```env
MONGODB_URI=mongodb://localhost:27017/partymix
PORT=3001
NODE_ENV=development
ADMIN_PASSWORD=uma_password_segura
JWT_SECRET=um_segredo_longo
GROQ_API_KEY=opcional_para_ia
GROQ_MODEL=llama-3.1-8b-instant
CORS_ORIGINS=http://localhost:5173
```

No frontend, em produção, define:

```env
VITE_API_BASE_URL=https://url-do-backend
```

Em desenvolvimento, se não definires `VITE_API_BASE_URL`, o frontend tenta usar `http://<host-atual>:3001`.

## Desenvolvimento

Para correr frontend e backend ao mesmo tempo:

```bash
npm run dev
```

Ou separadamente:

```bash
npm run dev:backend
npm run dev:frontend
```

URLs locais por defeito:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`
- Health check: `http://localhost:3001/api/health`

## Scripts

- `npm run install:all`: instala dependências do backend e frontend.
- `npm run dev`: corre backend e frontend em paralelo.
- `npm run dev:backend`: corre apenas o backend.
- `npm run dev:frontend`: corre apenas o frontend.
- `npm run seed`: popula a base de dados com dados iniciais.
- `npm run import:pack -- ../data/cards/base.json`: importa um pack JSON para a base de dados, sem duplicar textos existentes.
- `npm test`: corre os testes mínimos do backend.
- `npm run check`: verifica sintaxe do backend e faz build do frontend.
- `cd frontend && npm run build`: gera o build do frontend.

## Importar Packs

Podes adicionar cartas e desafios sem os escrever diretamente no código. Os packs ficam separados por modo:

```text
data/
  cards/
    base.json
  family/
    base.json
  friends/
    base.json
  couple/
    base.json
  drink/
    base.json
```

Importa um pack de cada vez:

```bash
npm run import:pack -- ../data/cards/base.json
npm run import:pack -- ../data/family/base.json
npm run import:pack -- ../data/friends/base.json
npm run import:pack -- ../data/couple/base.json
npm run import:pack -- ../data/drink/base.json
```

O importador:

- insere cartas brancas/pretas na coleção `cards`;
- insere desafios dos modos Família, Amigos, Casal e Beber na coleção `challenges`;
- salta qualquer item que já exista com o mesmo texto;
- lê `answer` para perguntas e `forbiddenWords` para Palavra Tabu;
- usa `backend/.env` para ligar ao MongoDB.

Conteúdo submetido pela comunidade fica em revisão. Votos ajudam a ordenar/priorizar, mas só entra no jogo quando o admin aprova.

## API Principal

O backend expõe rotas em `/api` para:

- `/api/admin`
- `/api/challenges`
- `/api/cards`
- `/api/dice`
- `/api/lobby`
- `/api/cardroom`
- `/api/positions`
- `/api/ai`
- `/api/community`
- `/api/health`

As rotas de IA e ações de escrita da comunidade têm rate limit básico.

## Estado Atual

Já existe uma base jogável, com vários modos e algum suporte multiplayer. O projeto ainda precisa de validação mais consistente, testes automatizados, revisão de segurança e polimento de UX antes de ser tratado como produto pronto para publicação.

## Próximas Melhorias Recomendadas

- Alargar testes para cobrir rotas reais com base de dados de teste.
- Rever vulnerabilidades do `npm audit` e atualizar dependências com cuidado.
- Melhorar instruções de instalação PWA para iOS, onde o prompt automático é limitado.
- Criar onboarding simples para o primeiro jogo.
- Adicionar estatísticas locais ou rankings apenas depois de decidir se haverá contas de utilizador.
- Dividir o bundle frontend com lazy loading se o tamanho começar a afetar o carregamento.

## Documentação Relacionada

- `MONGODB_ATLAS_SETUP.md`
- `DEPLOYMENT_GUIDE.md`
- `MOBILE_ACCESS_GUIDE.md`
- `FILE_STRUCTURE_GUIDE.md`
- `ANIMATIONS_GUIDE.md`


## Licença

Ver `LICENSE`.

---

Desenvolvido por João.
