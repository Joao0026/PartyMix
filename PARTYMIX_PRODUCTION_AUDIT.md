# PartyMix — auditoria de produção (Fase 1)

Fonte de verdade dos problemas de integridade multiplayer, segurança de regras e publicação. Não misturar com Fases 2–4.

## P0 — obrigatório antes de qualquer loja

| ID | Problema | Ficheiros (confirmado no código) | Estado |
|----|----------|----------------------------------|--------|
| **P1** | Aldeia: disconnect do narrador transferia `juizIdx` / `am_narrator_state` (mapa de papéis) para um jogador vivo | `backend/lib/aldeiaMixSocket.js` (`isJuiz`, `broadcastPhase`, `finishRejoin`, `handleAldeiaDisconnect`) | **Fechado** |
| **P2** | Um `socket.id` podia ocupar vários seats no mesmo modo | `backend/lib/gameAuth.js` (`socketSeatedIn`, `detachSocketFromRooms`); create/join em `websocket.js`, `aldeiaMixSocket.js`, `mememixSocket.js` | **Fechado** |
| **P3** | MemeMix rejoin migrava seat/hands/hostId antes de validar tokens; upload token não rodava | `backend/lib/mememixSocket.js` (`mm_rejoin_room`); `backend/lib/mememixSessions.js` (`rotateUploadToken`) | **Fechado** |
| **P4** | MemeMix reveal contava submissions de desligados / lixo de sockets antigos | `allExpectedHaveSubmitted`, `handleMemeMixDisconnect` (prune `submissions[socket.id]`) | **Fechado** |
| **P5** | MW/MM `start` fazia `await` sem lock; double-start podia double-deal | `mw_start_game` / `mm_start_game`: `status === 'waiting'` → `starting` **antes** de `await`; falha → `waiting`; join/settings/start bloqueados fora de `waiting` | **Fechado** |
| **P6** | Aldeia/MemeMix apagavam a sala no último disconnect | `handleAldeiaDisconnect` / `handleMemeMixDisconnect` mantêm a sala; GC `EMPTY_ROOM_TTL_MS` + `onDestroy` só no GC do MM | **Fechado** |
| **P7** | CardRoom `POST /:code/result` aceitava fora de turno / pontos do cliente / double result | `backend/lib/cardroomPlay.js` (`applyCardRoomResult` + lock); `routes/cardroom.js` `findOneAndUpdate` | **Fechado** |
| **P8** | Cards `pick_winner` sem playing/revealed/roundWinner/czar/submission | `backend/websocket.js` `pick_winner` | **Fechado** |
| **P9** | `start_*` a meio do jogo; `play_again`/`restart` fora de `result`/`ended` | Cards `start_game` só `waiting`\|`ended`; MW `mw_restart` só `result`; AM `am_play_again` só `result`; MM `mm_play_again` só `ended`; lobby/cardroom HTTP start atómico em `waiting`; UI `confirmHost` no host | **Fechado** |
| **P14** | `mw_eliminate` matava um alvo arbitrário do cliente | Handler ignora `targetOrigIdx`; só `mwResolveVotes` (votos já cast) se host + `status === 'vote'` | **Fechado** |

## P1 (ainda Fase 1)

| ID | Problema | Estado |
|----|----------|--------|
| **P10** | Aldeia votos: índice fora do range / papel não jogável | **Fechado** — `isAlivePlayingTarget` |
| **P11** | Remover carta/legenda com `.filter` apagava duplicados todos | **Fechado** — `removeCardsFromHand` (um índice) |
| **P12** | Lobby join não atómico (nome duplicado / overfill / sem player token) | **Fechado** — `findOneAndUpdate` + `lobbyJoinFilter` + token |
| **P13** | CardRoom join não atómico | **Fechado** — `cardroomJoinFilter` |
| **P15** | `io.to(code)` / `socket.join` com casing do cliente | **Fechado** — lookup uppercase + `room.code` / `c` |
| **P16** | Start com seats disconnected; czar/juiz offline | **Fechado** — drop/`filter` `!disconnected`; `firstInPlayIdx` / `pickRandomConnectedIdx` |
| **P17** | Upload MM sem identidade de seat; token não rodava | **Fechado** — `isAuthorizedMemeViewer` (socketId + name + `!disconnected`); rotate no rejoin **e** após upload |

## Testes Fase 1

Correr na raiz ou em `backend/`:

```bash
cd backend && npm test && npm run check
```

Na raiz do repo: `npm test` (backend) e `npm run check` (syntax backend + build frontend).

Cobertura mínima pedida:

- multi-seat no mesmo socket rejeitado
- narrator não recebe mapa de papéis após disconnect (transfer impossível)
- MM rejoin com upload token inválido não migra seat
- MM reveal não conta submissions de disconnected
- double start MW/MM/Cards não double-deal
- AM/MM room sobrevive último disconnect (TTL/GC)
- CardRoom result fora de turno / não-playing / double round rejeitado
- `pick_winner` sem revealed / double pick / self rejeitado
- start a meio de playing rejeitado
- `mw_eliminate` abusivo não mata alvo arbitrário
- lobby/cardroom join filter (nome único, max, waiting)
- voto Aldeia out-of-range

## Estado pós-fix — Fase 1

**Fechado nesta fase:** P1–P17 (P0 + P1-level). Testes de integração Socket.IO em `backend/tests/phase1.multiplayer.test.js`; unidade em `gameAuth.test.js`, `onlineQuorum.test.js`, `cardroomPlay.test.js`.

**Fora de âmbito (Fase 2+):** sticky/Redis, Sentry/logs estruturados, analytics, feature flags, runbook, UGC report/block, privacy/terms vivos, PWA polish, wrapper Play Store. Não implementar sem confirmação.

**Riscos remanescentes (não são P0 desta lista):**

- Salas in-memory: restart do processo perde todas as salas (Fase 2).
- Multi-instância sem sticky/Redis parte joins (Fase 2).
- CardRoom result lock é optimista (`findOneAndUpdate` no snapshot); correcto em Mongo, sem replica-set tests aqui.
- MemeMix ainda transfere o juiz da ronda se o juiz actual desligar a meio do jogo (não é o leak P1 do mapa de papéis da Aldeia).
- Confirmação host é `window.confirm` (PT-PT); não substitui as regras no servidor.

Não há deploy. Não há PR GitHub nesta fase.
