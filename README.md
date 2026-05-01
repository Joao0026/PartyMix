# 🎉 PartyMix

PartyMix é uma app de jogos de festa desenvolvida com **React + Node.js/Express + MongoDB**, criada para reunir amigos, casais e família em diferentes modos de jogo interativos.

---

## ✨ Sobre o Projeto

O PartyMix combina vários estilos de jogos sociais numa única plataforma, incluindo desafios, cartas, dedução social e mini-jogos.

A aplicação foi construída com foco em:

* Experiência divertida e rápida
* Múltiplos modos de jogo
* Estrutura modular para adicionar novos jogos facilmente
* Backend API para gestão dinâmica de conteúdo
* Base de dados MongoDB para persistência

---

## 🧩 Tecnologias Utilizadas

### Deploy

* Frontend hospedado em Netlify
* Backend hospedado em Render

### Frontend

* React
* Vite
* JavaScript
* CSS
* Netlify

### Backend

* Node.js
* Express
* MongoDB
* Mongoose
* Render

### Backend

* Node.js
* Express
* MongoDB
* Mongoose

---

## 🎮 Modos de Jogo

### 💕 Casal

Modo focado em desafios, perguntas e interações entre duas pessoas.

### 🎉 Amigos

Mapa de progressão com mini-jogos, penalizações e momentos aleatórios.

### 🏡 Família

Versão mais leve com categorias adaptadas para grupos familiares.

### 🃏 Cartas

Inspirado em jogos de humor e respostas criativas.

### 👁️ Mister White

Jogo social de dedução onde um jogador desconhece a palavra principal.

---

## 📁 Estrutura do Projeto

```text
partymix/
├── backend/
│   ├── models/         # Schemas MongoDB
│   ├── routes/         # API REST
│   ├── seeds/          # Dados iniciais
│   ├── server.js       # Entry point do Express
│   └── .env.example    # Variáveis de ambiente
│
└── frontend/
    └── src/
        ├── pages/      # Páginas principais
        ├── components/ # Componentes reutilizáveis
        └── utils/      # Helpers e lógica auxiliar
```

---

## 🔌 API

O backend expõe endpoints REST para:

* Gestão de desafios
* Sistema de cartas
* Dados interativos
* Criação de lobbies
* Gestão de salas multiplayer

Exemplos de endpoints:

| Método | Endpoint                 | Descrição               |
| ------ | ------------------------ | ----------------------- |
| GET    | `/api/challenges`        | Lista desafios          |
| GET    | `/api/challenges/random` | Obtém desafio aleatório |
| GET    | `/api/cards`             | Lista cartas            |
| GET    | `/api/dice/roll`         | Rola dados              |
| POST   | `/api/lobby/create`      | Cria lobby              |

---

## 🚀 Objetivo

O objetivo do PartyMix é criar uma plataforma flexível de jogos sociais que possa evoluir com novos modos, desafios e experiências multiplayer.

---

## 📌 Estado do Projeto

🚧 Em desenvolvimento ativo

Novas funcionalidades, melhorias de UI e expansão dos modos de jogo estão a ser adicionadas continuamente.
