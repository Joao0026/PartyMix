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

**Fora de âmbito (Fase 3+):** UGC report/block, privacy/terms vivos alinhados, PWA polish, wrapper Play Store. Não implementar sem confirmação.

## Estado pós-fix — Fase 2

**Política WS escolhida:** `single-instance-sticky` (não Redis). Salas continuam em memória; Redis adapter sozinho não persiste o estado. Documentado em `docs/runbook.md`. Cookie `pmx_instance`, `connectionStateRecovery` 2 min, `WEB_CONCURRENCY>1` recusado em produção.

**Fechado:** logs JSON com `errorCode` + `roomHash` (sem PII); crash hooks + Sentry opcional (`SENTRY_DSN`); `/api/health` + `/api/ready`; analytics `room_created` / `game_started` / `game_completed` / `rejoin_failed` / `socket_disconnect_reason` / `error_code`; prune TTL nos Maps de rate limit; indexes + purge Lobby/CardRoom/embeddings; flags `FEATURE_*_ONLINE`; runbook.

**Ainda verdade:** restart do processo perde salas in-memory (esperado nesta política). Multi-instância sem sticky continua incorrecto — o processo recusa cluster > 1.

Não há deploy. Não há PR GitHub nesta fase.

## Estado pós-fix — Fase 3

**UGC:** `POST /api/community/:id/report` e `POST /api/mememix/rooms/:code/memes/:memeId/report` (token de upload). Denúncia entra na fila (`GET /api/reports`, admin); o conteúdo fica oculto **só para o denunciante**. Admin pode arquivar / ocultar para todos / remover. Modelo `ContentReport` com TTL 30 dias. Sem PII: `reporterHash`.

**Limites MemeMix:** 2 MB por foto, 12 fotos/jogador, 36/sala (antes 5 MB / 50). Política nos Termos e no consentimento do lobby.

**Legal:** `/privacy` e `/terms` cobrem 18+, álcool, Modo Família, denúncia/bloqueio, eventos de analytics, retenção, URL HTTPS do operador (`PUBLIC_ORIGIN`). `GET /api/features` inclui `legal`. AgeGate 18+; `/community` continua acessível a menores **só Família**.

**Rejoin:** banner distinto se a sala expirou («já não existe» + voltar ao início) vs ligação caída (Tentar).

**PWA / a11y:** `icon-192.png` / `icon-512.png`, splash Apple, `viewport-fit=cover`, safe-areas, `focus-visible`, alvos ≥44px nos CTAs críticos. Meta description sem «dados eróticos».

Testes: `backend/tests/phase3.ugc.test.js`.

**Fora de âmbito (Fase 4):** wrapper Capacitor/TWA, Play Console, Data safety form, paid packs. Não implementar sem confirmação.

