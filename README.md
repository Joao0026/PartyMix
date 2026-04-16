# 🎉 PartyMix

App de jogos de festa — React + Node.js/Express + MongoDB

---

## ⚡ Início Rápido

### 1. Requisitos
- Node.js 18+
- MongoDB instalado e a correr (ou MongoDB Atlas)

### 2. Instalar dependências
```bash
# Na raiz do projeto
cd backend && npm install
cd ../frontend && npm install
```

### 3. Configurar variáveis de ambiente
```bash
cd backend
cp .env.example .env
# Edita .env com a tua MONGODB_URI
```

### 4. Popular a base de dados (seed)
```bash
cd backend
npm run seed
```

### 5. Iniciar os servidores

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# Corre em http://localhost:3001
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# Corre em http://localhost:5173
```

### 6. Abrir no browser
```
http://localhost:5173
```

---

## 📁 Estrutura do Projeto

```
partymix/
├── backend/
│   ├── models/         # Schemas MongoDB (Challenge, Card, DiceOption, Lobby, SexPosition)
│   ├── routes/         # API REST (challenges, cards, dice, lobby, positions)
│   ├── seeds/          # Script de população inicial da base de dados
│   ├── server.js       # Entry point do servidor Express
│   └── .env.example    # Variáveis de ambiente (copia para .env)
│
└── frontend/
    └── src/
        ├── pages/      # Home, GameSetup, MapGame, CoupleGame, CardsLobby, CardsGame, MisterWhiteGame, Admin
        ├── components/
        │   └── game/   # DiceRoller, ChallengeCard
        └── utils/      # api.js (fetch helpers), game.js (utilitários)
```

---

## 🔌 API Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/challenges | Listar desafios (filtros: category, mode_type, difficulty) |
| GET | /api/challenges/random | Desafio aleatório |
| POST | /api/challenges | Criar desafio |
| DELETE | /api/challenges/:id | Apagar desafio |
| GET | /api/cards | Listar cartas |
| POST | /api/cards | Criar carta |
| DELETE | /api/cards/:id | Apagar carta |
| GET | /api/dice | Listar opções de dados |
| GET | /api/dice/roll | Rolar dados eróticos |
| POST | /api/lobby/create | Criar sala de cartas |
| GET | /api/lobby/:code | Ver sala |
| POST | /api/lobby/:code/join | Entrar na sala |
| POST | /api/lobby/:code/start | Iniciar jogo |

---

## 🛠️ MongoDB Atlas (alternativa ao local)

1. Cria conta em [mongodb.com/atlas](https://mongodb.com/atlas)
2. Cria um cluster gratuito (M0)
3. Obtém a connection string
4. Coloca em `backend/.env`:
   ```
   MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/partymix
   ```

---

## 🎮 Modos de Jogo

- **💕 Casal** — Dados eróticos + desafios
- **🎉 Amigos** — Mapa + mini-jogos + penalizações
- **🏡 Família** — Mapa + categorias de cultura/desporto
- **🃏 Cartas** — Cards Against Humanity estilo PT
- **👁️ Mister White** — Dedução social
