# Play Store — PartyMix (Fase 4)

Wrapper escolhido: **Trusted Web Activity (TWA)**, não Capacitor.

As salas online usam cookies (`pmx_instance`, `pm_age`, `pm_vid`) e Socket.IO com `withCredentials`. Um WebView Capacitor seria outra origem e partia o sticky / a idade. O TWA abre o site HTTPS no Chrome, a mesma PWA.

Não há compras na app. Não há Advertising ID. Classificação **18+**.

Esta pasta não submete a app por ti. A Play Console exige a tua conta de programador (€25, uma vez).

## Antes de gerar o AAB

1. Frontend e backend em produção, HTTPS.
2. `PUBLIC_ORIGIN` = origem exacta da PWA (Netlify), `https://…` sem barra final.
3. `CORS_ORIGINS` inclui essa origem.
4. `VITE_API_BASE_URL` no build do frontend aponta para o backend HTTPS.
5. `/privacy` e `/terms` abrem sem login (já abrem).
6. Cria a app na Play Console, package `pt.partymix.app`.

## Assinatura e Digital Asset Links

1. Play Console → App integrity → App signing → copia o **SHA-256** do certificado de assinatura da app.
2. Mete no servidor e no build:

```
PLAY_SHA256_CERT=AA:BB:CC:... (32 pares hex)
PUBLIC_ORIGIN=https://teu-frontend
```

3. Regenera os JSON:

```bash
PUBLIC_ORIGIN=https://teu-frontend PLAY_SHA256_CERT=AA:BB:... node scripts/write-play-files.js
```

4. Publica o frontend. Confirma:

`https://teu-frontend/.well-known/assetlinks.json`

Tem de devolver JSON com `package_name: pt.partymix.app` e o mesmo SHA-256. Sem isto o TWA abre um browser com barra.

O backend também serve `GET /.well-known/assetlinks.json` se o site e a API partilharem o host.

`GET /api/features` → `play.ready === true` só com `PUBLIC_ORIGIN` + `PLAY_SHA256_CERT` válidos.

## Gerar o Android (TWA)

Na máquina com Android SDK (não no CI actual):

```bash
npx --yes @bubblewrap/cli init --manifest "$PUBLIC_ORIGIN/manifest.json"
```

Ou parte do manifesto já gerado:

```bash
npx --yes @bubblewrap/cli update --appVersionName=1.0.0
```

Usa `play/twa-manifest.json` como referência: `packageId`, `portrait`, `startUrl=/`, `minSdkVersion=21`, **sem notificações**.

Assina o **AAB** com a chave da Play (ou upload key) e envia para a faixa **testes internos**.

Permissões Android extra: **nenhuma**. O Chrome trata câmara/fotos do MemeMix.

## Ficha da loja (copia de `play/`)

| Campo | Ficheiro |
|-------|----------|
| Título / curto / longo (pt-PT) | `listing.pt-PT.json` |
| Questionário IARC | `content-rating.json` (álcool sim, sexo sim, UGC sim, compras não, crianças não) |
| Data safety | `data-safety.json` |
| Ícone 512 | `frontend/public/icon-512.png` |
| Feature graphic 1024×500 | `frontend/public/play-feature-graphic.png` |

Screenshots: tira 2 telemóvel (telefone, 16:9 ou 9:16) do hub 18+ e do AgeGate. Não inventes capturas.

Política de privacidade na consola: `$PUBLIC_ORIGIN/privacy`.

## Data safety — resumo alinhado ao código

- Não vendemos dados. Sem anúncios. Sem Advertising ID.
- Nome de jogador: só na sessão.
- Fotos MemeMix: até 6 h.
- Cookies: `pm_age`, `pm_vid`, `pmx_instance`, `pmx_io`.
- Analytics: eventos técnicos sem nomes nem códigos de sala.
- Groq: só se a IA estiver ligada (texto do pedido).

## Testes internos (Play)

Conta de revisor: a app não pede login. Dizer: «abrir, confirmar 18+, criar sala». Modo Família: no AgeGate escolher menor de 18.

## O que esta fase não faz

- Não cria a conta Play nem paga a taxa.
- Não faz upload do AAB (precisa da tua sessão Google).
- Não implementa Capacitor nem compras na app.
- Não gera o projecto Gradle aqui (precisa do Android SDK).
