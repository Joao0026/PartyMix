# PartyMix

**Jogos de festa numa só app** — para telemóvel, em grupo, com o telemão na mesa.

PartyMix junta desafios, perguntas, baralhos de beber, cartas e dedução numa experiência única. Serve para animar festas, jantares e encontros sem andares a saltar entre várias apps.

> **Produto proprietário** — código, textos e marca reservados. Não é open source nem está disponível para cópia ou redistribuição. Ver [LICENSE](LICENSE) · [PROPRIEDADE.md](PROPRIEDADE.md)

> **Conteúdo:** alguns modos referem álcool ou temas adultos (ex. modo Beber, Casal). Destinado a **maiores de 18 anos**. Bebe com moderação; não é obrigatório beber para jogar — podes adaptar as regras ao grupo.

---

## Ecrã principal

![Menu principal PartyMix — modos de jogo](docs/ecra-principal.png)

Abres no telemóvel (PWA), escolhes o modo e jogas — com ligação ao servidor para conteúdo e salas online. A app está em **português** (interface e conteúdos).

---

## Modos de jogo

| Modo | O que inclui |
|------|----------------|
| **Casal** | Dados, desafios, quiz, roleplay e mapa a dois |
| **Amigos** | Mapa, mini-jogos, penalizações e carta Impostor |
| **Família** | Cultura, desporto, música e cinema — tom mais leve |
| **Beber** | Baralho de regras, roleta e contagem de goles |
| **Cartas** | Estilo Cartas Contra Tugas, com sala online |
| **Mister White** | Dedução social — quem é o infiltrado? |
| **Comunidade** | Submetes cartas; as mais votadas entram no jogo |

**Extras:** packs de conteúdo (`base`, temas de festa…), Sabichão, cartas especiais no modo Beber (Agente Secreto, Aliança, Espelho, Mini Boss), IA opcional, **Raspadinha / posição do dia** (no modo Casal e em `/daily`).

---

## Tecnologias

Como a app está construída e onde corre — visão geral, sem expor detalhes de implementação.

| Camada | O que usamos |
|--------|----------------|
| **Interface** | React, Vite, Tailwind CSS, Framer Motion |
| **Experiência móvel** | PWA (instalável no telemóvel como app web) |
| **API** | Node.js, Express |
| **Base de dados** | MongoDB ([Atlas](https://www.mongodb.com/cloud/atlas) em produção) |
| **Tempo real** | Socket.IO (salas de cartas e lobby) |
| **Frontend em produção** | [Netlify](https://www.netlify.com/) |
| **Backend em produção** | [Render](https://render.com/) |
| **IA (opcional)** | Groq API — desafios e apoio no admin |
| **Qualidade** | GitHub Actions (verificação e testes automáticos) |

**Em desenvolvimento:** versão para Google Play (app nativa / wrapper), contas na cloud, ranking global e outros idiomas (ES/EN) quando houver conteúdo traduzido.

---

## Organização do projeto

```text
partymix/
├── frontend/     # App que o jogador vê (ecrãs, jogos, admin)
├── backend/      # API, regras de negócio, ligação à base de dados
├── data/         # Conteúdo em JSON — cartas, desafios, baralhos
└── docs/         # Diagramas, capturas e notas internas
```

Separámos **código** e **conteúdo**: frases e baralhos vivem em `data/`, não espalhados pelo React. Novos packs de festa ou beber entram sem reescrever a app inteira.

### Fluxo do conteúdo

![JSON → base de dados → API → app no telemóvel](docs/fluxo-conteudo.png)

1. **JSON** — packs em `data/` (amigos, beber, cartas, etc.)
2. **Base de dados** — importação interna para MongoDB
3. **Jogo** — no setup escolhes o pack; só esse conteúdo aparece

Documentação para criar packs (uso interno da equipa): [data/COMO-CRIAR-PACKS.md](data/COMO-CRIAR-PACKS.md).

---

## Licença

Copyright © 2026 João Magalhães. Todos os direitos reservados.

Desenvolvido por João.
