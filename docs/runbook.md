# Runbook de produção — PartyMix (Fase 2)

Política WebSocket: **single-instance sticky**. As salas Cards / Mister White / Aldeia / MemeMix vivem em memória neste processo. Um segundo processo (ou um load balancer sem sticky) faz o jogador cair numa instância vazia: “Sala não encontrada”.

Não usamos Redis adapter nesta fase: exigiria um store de salas, não só o adapter de pub/sub.

## Arranque

- Um único processo Node (`WEB_CONCURRENCY=1`, sem cluster).
- Em produção o processo recusa arrancar se `WEB_CONCURRENCY` ou `CLUSTER_WORKERS` > 1.
- Cookie `pmx_instance` (HttpOnly) + cookie Engine.IO `pmx_io`. O reverse proxy / Render deve sticky neste cookie (ou 1 instância).
- Socket.IO: `connectionStateRecovery` 2 minutos para refresh/rede curta na **mesma** instância.
- Frontend liga com `withCredentials: true`.

## Health

| Rota | Significado |
|------|-------------|
| `GET /api/health` | Processo vivo. Sempre 200 depois do listen. |
| `GET /api/ready` | 200 só com Mongo `connected`. Inclui contagens de salas (sem códigos). |
| `GET /api/features` | Flags dos modos online. |

O processo só faz `listen` depois do Mongo ligar. Se o Mongo cair depois, `/api/ready` passa a 503; `/api/health` continua ok.

## Disconnect / rejoin (refresh comum)

1. O seat fica `disconnected`; a sala **não** é apagada.
2. O cliente reenvia `*_rejoin_room` com `playerToken` (MemeMix também `uploadToken`).
3. Token inválido → `rejoin_failed` (analytics) e a seat **não** migra.
4. Sala vazia: GC após **30 min** sem ninguém ligado (`EMPTY_ROOM_TTL_MS`). Sala tocada: TTL **4 h**.
5. Restart do backend: memória a zero. O frontend vê `startedAt` novo em `server_hello` e limpa a sessão local. Jogadores têm de criar/entrar outra vez.

## Restart do backend

```bash
cd backend && npm start
```

O que acontece às salas:

- Todas as salas in-memory morrem.
- Uploads MemeMix em disco são GC’d se a pasta não tiver sala activa.
- Lobbies / CardRooms Mongo continuam até ao TTL (2 h lobby, 24 h cardroom) + `purgeExpiredGameDocs` de hora a hora.
- Embeddings cache: TTL 30 dias.

## Feature flags (env)

Por omissão tudo ligado. Para desligar:

```
FEATURE_CARDS_ONLINE=0
FEATURE_ALDEIA_ONLINE=0
FEATURE_MEMEMIX_ONLINE=0
FEATURE_MW_ONLINE=0
```

O servidor rejeita create/join. O hub mostra “Online indisponível”.

## Observabilidade

Logs JSON em stdout: `ts`, `level`, `event`, `errorCode`, `roomHash` (nunca o código da sala nem nomes).

Eventos: `room_created`, `game_started`, `game_completed`, `rejoin_failed`, `socket_disconnect_reason`, `error_code`, `ugc_reported`, `ugc_reviewed`.

Crash: `uncaughtException` / `unhandledRejection` vão para log. Se `SENTRY_DSN` estiver definido, inicializa `@sentry/node` (instalar o pacote no servidor). Sem DSN, só o log.

## Mongo

Indexes: `code` unique; TTL `createdAt` em Lobby/CardRoom; `{ status, updatedAt }`; Community `{ status, votes }`; embeddings TTL 30 dias. Purge de segurança de hora a hora além do TTL monitor.

## UGC / denúncias (Fase 3)

- Jogadores denunciam cartas (`POST /api/community/:id/report`) e memes (`POST /api/mememix/rooms/:code/memes/:id/report`).
- Fila admin: `GET /api/reports?status=pending` e `POST /api/reports/:id/review` com `action=dismiss|hide|remove`.
- `PUBLIC_ORIGIN` (HTTPS) aparece em privacidade/termos e `/api/features`.

## Variáveis novas

Ver `backend/.env.example`: `INSTANCE_ID`, `SENTRY_DSN`, `ROOM_HASH_SALT`, `FEATURE_*_ONLINE`, `WEB_CONCURRENCY=1`, `PUBLIC_ORIGIN`.
