# PartyMix — Foco: Beber, Cartas, MemeMix, AldeiaMix, Mister White

Análise de conteúdo e game design com base no código e nos JSON de `master` (app em produção). Nenhum pack, carta ou ficheiro de conteúdo foi alterado neste entregável.

**Fonte:** checkout `master` (`b4f6d54`).  
**Regra de copy nova:** português de Portugal (PT-PT). Álcool no Beber = consequência opcional, nunca o objectivo da noite. Mecânicas e conceitos apenas — sem clonar textos, nomes ou cartas de outros jogos.

---

## 0. Âmbito e tese

### O que isto cobre

A roda da Home (`WHEEL_MODES` em `frontend/src/pages/Home.jsx`) é o produto-noite: **Beber, MemeMix, Cartas, AldeiaMix, Mister White**. Amigos / Família / Casal (modos mapa) ficam de fora, excepto cruzamentos pontuais — sobretudo o mini **Impostor** de `ImpostorCard.jsx`, que o Beber reutiliza e que o Mister White **não** deve copiar.

### Tese

Estes cinco modos já têm motor. O que falta não é «mais do mesmo loop». É **uma noite com arco**: o Beber trata o gole como ranking; as Cartas esgotam o pack fino; o MemeMix tem fotos da festa mas legendas-template; o Mister White sorteia o mesmo par; a AldeiaMix narra sempre as mesmas oito frases. Replayabilidade vem de **memória de sessão, formatos novos e vitória social** — não de duplicar lobos para o Beber nem pretas/brancas para o MemeMix.

### Como ler as propostas

Cada ideia nova leva **nota /10** (impacto × diferença face ao que já existe × esforço relativo) e prioridade:

| Símbolo | Significado |
|---|---|
| 🔴 | Mudar agora: altera o que a mesa sente nesta noite |
| 🟡 | Segunda vaga: aprofunda um modo que já funciona |
| 🟢 | Depois: polish, conteúdo, ou código morto a aproveitar |

Álcool: nas propostas do Beber, **nunca** «quem bebe mais ganha», **nunca** ranking de goles como objectivo, **nunca** desafios de esvaziar copo / *chug* / «meio copo / copo inteiro» como meta de design. `SIPS_WEIGHTS` em `frontend/src/utils/game.js` inclui esses valores — e **o Beber nem os usa**. Não os ligar.

---

## 1. Beber (deep)

### Estado atual (estrutura, ficheiros, volume, fluxo UI, campos)

Um telemóvel no centro da mesa. Sem Socket.IO. Rota `/DrinkGame` (`App.jsx`), age gate 18+ (`frontend/src/utils/ageGate.js`).

| Camada | Ficheiros-âncora |
|---|---|
| UI | `frontend/src/pages/DrinkGame.jsx` (**1631** linhas) — setup, jogo, resultados **inline** |
| Motor de baralho | `frontend/src/utils/drinkAgentCompose.js` (actos, peso igual por baralho, filtro `agent`) |
| Baralhos / merge | `frontend/src/utils/drinkBaralhos.js` (14 ids oficiais + tipos especiais) |
| Nomes | `frontend/src/utils/drinkPlayerText.js` (`reader`, `playerN`, contrações `_a` / `_de` / `_com`) |
| Caos upgrade | `frontend/src/utils/drinkChaosUpgrade.js` (`CAOS_MOMENT_CHANCE = 0.3`) |
| Impostor fantasma | `frontend/src/utils/drinkImpostorGhost.js` |
| Fallback | `frontend/src/utils/drinkDecksFallback.js` |
| API | `backend/routes/drink.js`, `backend/models/DrinkPack.js`, `backend/lib/communityDrink.js` |
| Packs jogáveis | `data/drink/decks.json`, `noite-academica-pack.json`, `sem-filtros-pack.json`, `casais-festa-pack.json` |

**Volume jogável (4 packs):** **817 cartas**.

| Pack | Ficheiro | `pack` id | Cartas | Acto 1 / 2 / 3 |
|---|---|---|---:|---|
| Essencial | `data/drink/decks.json` | `base` | 230 | 77 / 119 / 34 |
| Noite Académica | `data/drink/noite-academica-pack.json` | `noite-academica` | 280 | 101 / 135 / 44 |
| Sem Filtros | `data/drink/sem-filtros-pack.json` | `sem-filtros` | 200 | 12 / 109 / 79 |
| Casais na Festa | `data/drink/casais-festa-pack.json` | `casais-festa` | 107 | 2 / 30 / 75 |
| Comunidade (JSON) | `data/drink/communitydrink.json` | `base` / deck `comunidade` | **0** | — |

Não jogáveis (não seedar como pack): `data/drink/cartas-classificadas.json` (**600** cartas em arrays por baralho, staging); `data/drink/agent-secreto-arquivo.json` (**24** cartas `agent`, retiradas em `2026-07-05`).

**Tipos de carta no corpus jogável (13 chaves):**

| `type` | N | Papel no motor |
|---|---:|---|
| `desafio` | **370** (45%) | Baralhos eununca / provavel / bluff / cadeia / desafios / picante / parte de historia |
| `beber` | 99 | Baralho `waterfall` |
| `preferencia` | 53 | Baralho `preferias` (`choices` A/B) |
| `caos` | 49 | Vira regra activa (default 3 rondas) |
| `poder` | 41 | Baralho `poder` |
| `regra` | 40 | Regra activa (default 5 rondas) |
| `historia` | 37 | Continuação à mesa |
| `maldicao` | 34 | Fica no jogador até falhar / passar |
| `impostor` | 23 | Mini-ronda de perguntas (não palavras) |
| `azar` | 22 | Baralho `poder` |
| `sorte` | 18 | Baralho `poder` |
| `alliance` | 16 | Escolher parceiro; se um «bebe», o outro +1 no contador |
| `miniboss` | 15 | Desafio de grupo cronometrado (só texto) |
| `agent` | 0 jogável | Filtrado em `buildPlayableDrinkDeck` |

**Baralhos (`deckId`) ≠ `type`.** UI lista 14 ids em `DRINK_BARALHOS`: `waterfall`, `eununca`, `regras`, `caos`, `especiais`, `desafios`, `poder`, `picante`, `preferias`, `provavel`, `bluff`, `maldicao`, `historia`, `cadeia`. Totais cross-pack: `provavel` 103, `waterfall` 99, `desafios` 84, `poder` 81, `eununca` 76, `preferias` 53, `especiais` 54, `caos` 49, `historia` 48, `regras` 40, `maldicao` 37, `cadeia` 37, `picante` 29, `bluff` 27.

**Campos de carta usados no runtime:** `type`, `text`, `title`, `emoji`, `act`, `rarity`, `deckId` (injectado), `pack`, `choices` (preferência), `correctQuestion` / `wrongQuestion` (impostor), bloco opcional `caos` (`text`, `cost`, `readerDrinks`, …). Placeholders de nome: `reader`, `reader_a`, `reader_com` — **34 cartas** nos 4 packs (8+9+13+4). **Zero** `{name}` / `{player}`.

**Fluxo UI (3 passos + jogo + resultados):**

1. Setup 0 — `MesaNoite`, 2–15 jogadores, género opcional, roster em `nightRoster`.
2. Setup 1 — toggle multi-pack (Essencial / Noite Académica / Sem Filtros / Casais).
3. Setup 2 — toggle de baralhos por pack (`packOff`); CTA «Começar · N cartas».
4. Playing — `CardDeck`: tirar carta, painel Mesa (regras / maldições / alianças), contador manual de goles (+1/+2/+3), adicionar/remover jogador a meio.
5. Results — fase `'results'` **no mesmo ficheiro**. `VictoryScreen.jsx` **não é usado**.

Default de baralhos no estado inicial: `['waterfall','eununca','desafios','cadeia','especiais']` — depois o `useEffect` substitui por **todos** os baralhos disponíveis após o fetch.

`includeCommunity = false` (hardcoded, linha ~860 de `DrinkGame.jsx`).

### Mecânicas existentes (o que o jogador realmente faz)

1. **Lê em voz alta** a carta do leitor da vez (`nextReaderName` roda).
2. **Cumpre ou recusa** o texto — o motor **não parseia** «bebe 2» para o contador (excepto impostor / caos upgrade / aliança).
3. **Regista goles à mão** nos chips +1/+2/+3 (`registerDrink`).
4. **Regras / Caos activos:** `parseActiveDuration` lê «rondas», «voltas», «até sair outra regra»; default caos=3, regra=5. Carta que cancele regras limpa o painel.
5. **Aliança:** o leitor escolhe parceiro; duração parseada; se um aliado incrementa drinks, o outro leva **+1**.
6. **Maldição:** fica no `playerIndex`; UI «Falhou» / passar / remover. Sem auto-goles.
7. **Impostor:** 23 cartas + 6 pares built-in em `ImpostorCard.jsx` + pares da API `fetchChallenges({ category: 'impostor' })`. Um jogador (ou «fantasma» de quem saiu) tem a pergunta errada. Penalização fixa: *«Se a mesa descobrir o impostor, ele bebe 2 goles. Se falhar, distribui 2 goles.»*
8. **Mini-boss:** 15 cartas; o grupo tenta uma lista cronometrada; goles manuais.
9. **Curva de actos:** `sessionAct` — primeiros 25% acto 1, 25–70% acto 2, último 30% acto 3; *leak* 15% para o acto seguinte (`drinkAgentCompose.js`).
10. **Sorteio:** peso **igual por baralho** (não por volume); evita 2 `beber` seguidas; suprime impostor ~60% + se já saiu; raros (`impostor`/`miniboss`/`alliance`) evitados se saíram nos últimos 8 tipos.
11. **Momento Caos:** se a carta tem bloco `caos`, 30% de chance de oferecer upgrade. **1 carta em 817** tem o bloco (Sem Filtros / `waterfall`).
12. **Agente Secreto:** UI residual + `composeAgentCard`; cartas filtradas. Arquivo com 24 missões.
13. **Roleta:** `ROULETTE_SEGS` definido em `DrinkGame.jsx` (**código morto**, nunca renderizado). Segmentos: Bebe 2, Desafio, Distribui 3, Bebe 1, Sorte, Bebe 3, Regra, Waterfall — o design antigo da noite.
14. **IA surpresa:** `POST /api/ai/challenge` em `backend/routes/ai.js` (prompt PT-PT). O DrinkGame **não chama**.
15. **Fim:** botão «Fim» → quatro prémios: **Quem bebeu mais**, Maior agente secreto (sempre 0), Rei das regras, Maior azarado + tabela de goles.

`SIPS_WEIGHTS` / `weightedSips()` existem só em `game.js` e **não são importados** por lado nenhum. Não ligar. Incluem «meio copo», «copo inteiro», «dobro p/ grupo» — incompatíveis com a tese de consequência opcional.

### Tom e linguagem

- **UI:** PT-PT informal de mesa («Baralhar de novo», «Missão secreta», «goles» no ecrã de resultados e nos placeholders de `DRINK_BARALHO_PLACEHOLDERS`).
- **JSON:** dominante «golo/golos» como gole de bebida — **81+155+40+36 = 312 «golos»** nos 4 packs; a UI diz **goles**. Em PT-PT, *golo* é futebol; *gole* é o trago. O prompt da IA em `ai.js` recomenda incorrectamente «golo/golos». Placeholders de criação usam «goles». **Não corrigir packs neste PR**; nas propostas novas usar **goles** só quando o álcool for consequência opcional, e preferir «consequência / falha / paga».
- Vocabulário PT-PT real no corpus: «telemóvel», praxe, ERASMUS, «à mesa». **0** «você» / «celular». **2** «shot» (Sem Filtros).
- Home (`MODE_BLURB`): *«Um telemóvel. Cartas para beber até desmaiar.»* — contradiz a tese e é o pior slogan possível para o modo. `translations.js`: *«Cartas, desafios e caos para a tua noite»* (melhor, ainda vago).

Álcool no conteúdo: no baralho `waterfall` é o **texto-objectivo**; nos outros é **penálti de falha** ou «revela X ou bebe». O **score da noite**, porém, é o contador de goles. O design em código trata o álcool como meta mesmo quando a carta individual o trata como castigo.

### Pontos fortes

- Volume real (**817**) com 4 noites misturáveis e toggle por baralho.
- Curva de actos e peso igual por baralho — a noite **não** joga igual ao minuto 0 e ao minuto 50.
- Painel Mesa (regras / maldições / alianças) é o que distingue o Beber de um baralho de *prompts*.
- Impostor fantasma (jogador que foi embora) é uma ideia de festa rara e útil.
- Placeholders com contrações (`reader_a` → «ao João» / «à Maria») — PT-PT a sério, subusado (34 cartas).
- Um telemóvel: zero fricção de sala. Encaixa na tese «mesa cheia, alguém diz e agora?».

### Problemas / repetição / gaps

1. **Vitória = quem bebeu mais.** Quatro tiles, mas o primeiro e a coluna direita da tabela são goles. `agentSuccess` é um fantasma.
2. **Home a vender desmaio.** Copy da roda vs. motor.
3. **`desafio` é um saco:** 370 cartas, 7 baralhos, o mesmo badge. A mesa não sente a diferença entre Eu Nunca e Cadeia.
4. **Casais na Festa sem** `regras` / `caos` / `maldicao` / `cadeia` — o painel Mesa quase não existe nesse pack.
5. **Acto 3 desequilibrado:** Casais 75/107 em acto 3; Essencial só 34/230. Misturar packs anula a curva.
6. **Momento Caos de papel:** 1 carta com bloco `caos`.
7. **Agente, roleta, IA, comunidade, `SIPS_WEIGHTS`:** código ou API sem experiência.
8. **Contador manual** + aliança a incrementar «drinks» mesmo que o grupo jogue sem álcool.
9. **Impostor do Beber = Impostor do mapa Amigos** (perguntas certa/errada). Confunde com Mister White (palavras).
10. **Inconsistência comunidade:** `communityDrink.js` mapeia baralho `maldicao` → `type: 'desafio'` para submissões novas; JSON oficial usa `type: 'maldicao'`.
11. Staging `cartas-classificadas.json` (600) vs. 817 oficiais — risco de duplicar se alguém «colar».

### O que falta para replayabilidade

- **Memória da noite:** quem criou regras, quem sobreviveu a maldições, quem ganhou mini-bosses, quem foi o impostor certo — hoje quase nada disto pontua.
- **Consequência à escolha** (álcool / desafio extra / passar a vez), para o mesmo baralho servir mesas sóbrias.
- **Formatos com UI própria** para história, cadeia, bluff, preferência (já tem componente), mini-boss (timer real).
- **Acto visível** («1.º terço — aquecimento») para o grupo sentir arco.
- **Não** mais cartas `beber` nem ranking de goles.

### Propostas concretas

#### B1. Vitória da Mesa (redesign do ecrã de resultados) — 9/10 — 🔴

Substituir o tile «Quem bebeu mais» e a coluna de goles-como-score por **quatro títulos sociais**, usando campos que o motor já quase tem ou que são triviais de incrementar:

| Título | Métrica (já existe ou falta 1 incremento) |
|---|---|
| Rei das regras | `rulesCreated` (já existe) |
| Amaldiçoado-mor | maldições recebidas / passadas |
| Elo da noite | alianças formadas + voltas sobrevivídas |
| Chefe da mesa | mini-boss ganhos (falta flag sucesso/falha) |

O contador de goles, **se existir**, passa a nota de rodapé opcional («consequências pagas em goles — não conta para o recap») ou desaparece quando a mesa escolhe «sem álcool» no setup. **Porque é diferente:** o ecrã actual *já* tem 4 tiles, mas o primeiro é o anti-design. Não é pack novo; é o que a noite celebra.

#### B2. Consequência à escolha (nunca o objectivo) — 9/10 — 🔴

No setup: **Álcool na mesa?** Sim / não / «só se quiserem». Quando uma carta pede gole, a UI oferece **3 pagamentos**: cumprir o desafio extra da carta · passar a vez e perder o próximo poder · (se álcool ligado) 1–2 goles. **Proibido no design:** *chug*, «esvazia o copo», ranking, `SIPS_WEIGHTS`. **Porque é diferente:** hoje o texto manda beber e o chip +3 treina a mesa a pontuar álcool. Isto desliga o objectivo sem reescrever 817 JSON (o parser de «bebe N» pode ficar para mais tarde; a UI do pagamento chega).

#### B3. Acto visível + «clima da mesa» — 8/10 — 🟡

Barra 1 / 2 / 3 com copy: *Aquecimento* / *A casa aquece* / *Último terço*. Não muda o sorteio (`sessionAct` já existe). **Porque é diferente:** a curva é invisível; o grupo não sabe que o baralho está a apertar.

#### B4. Mini-jogos de carta (não os do mapa Amigos) — 8/10 — 🟡

UI específica para tipos que hoje são só texto:

- **História:** um campo «frase da vez» + «travou».
- **Cadeia:** tema + lista de palavras ditas (repetir = falha).
- **Bluff:** dois botões «a mesa acredita / não acredita».
- **Mini-boss:** timer nativo (o texto já diz «20 segundos»).

**Não** importar `MiniGameModal.jsx` do mapa. **Porque é diferente:** 370 `desafio` colapsam; a UI é que os separa.

#### B5. Momento Caos a sério (formato, não 200 clones) — 8/10 — 🟡

O bloco `caos` já está especificado (`drinkChaosUpgrade.js`). Falta conteúdo **novo** no *formato* (quando se escrever packs — fora deste PR) e um **Caos de mesa** 1× por acto: o leitor escolhe evoluir *qualquer* carta activa. **Porque é diferente:** hoje 1/817 e 30% escondido.

#### B6. Agente Secreto no telemóvel que passa — 7/10 — 🟢

O arquivo (`agent-secreto-arquivo.json`) descreve a ideia certa: texto público + missão privada ao virar o ecrã. Reactivar **sem** o pôr no ranking de goles: sucesso = ponto de «Agente» no recap. **Porque é diferente:** a UI quase existe; as 24 cartas estão na caixa. Não clonar o Impostor nem o Mister White — a missão é *fazer a mesa fazer X*, não esconder uma palavra.

#### B7. Copy da Home + resultados sem desmaio — 8/10 — 🔴

Trocar `MODE_BLURB.drink` para algo na linha: *«Um telemóvel. Regras, caos e a mesa a conduzir a noite.»* Resultados: zero «quem bebeu mais». **Porque é diferente:** é a primeira frase que o produto diz sobre o modo.

### Exemplos originais PT-PT (ilustrar, não clonar o corpus)

Novos. Não copiar cartas existentes. Álcool só como pagamento opcional.

**Regra (acto 1):**  
«Até sair outra regra, ninguém pode apontar com o dedo. Quem apontar paga uma consequência à escolha da mesa.»

**Caos (acto 2):**  
«Durante 3 rondas, todas as respostas têm de começar pela última palavra que alguém disse. Falhaste? Consequência. Cumpriste 3 seguidas? Tu defines a próxima regra.»

**Maldição:**  
«Estás amaldiçoado: só podes fazer perguntas. Passa a maldição a quem te responder com outra pergunta.»

**Aliança:**  
«Escolhe parceiro até à próxima aliança. Se um cumprir um desafio da mesa, o outro pode recusar o seguinte sem pagar.»

**Mini-boss (timer):**  
«Em 20 segundos, a mesa nomeia 8 estações de comboio portuguesas. Conseguem → o leitor cria uma regra de 1 volta. Falham → o leitor fica amaldiçoado até passar.»

**História (formato):**  
«Começa: “A porta da casa abriu-se e ninguém se lembra de a ter fechado…” Cada um acrescenta uma frase. Quem travar escolhe: consequência **ou** perder o direito a criar a próxima regra.»

**Impostor (perguntas — manter o formato actual, texto novo):**  
Certa: «Quem nesta mesa organizaria melhor uma fuga de fim-de-semana?»  
Errada: «Quem nesta mesa cancelaria o plano à última da hora?»

**Preferias:**  
A) «Dizer a verdade no grupo da família»  
B) «Deixar o telemóvel na mesa durante uma hora»  
Minoria paga consequência; empate = os dois lados escolhem um campeão para um bluff.

**Placeholders:**  
«{reader_a} cabe defender a última regra activa. Se recusar, {player1_com} herda a maldição.»

### Scores /10 (resumo Beber) e porquê diferente

| # | Ideia | /10 | O que já existe e não é isto |
|---|---|---:|---|
| B1 | Vitória da Mesa | 9 | Há 4 tiles, mas o #1 é goles; `agentSuccess` morto |
| B2 | Consequência à escolha | 9 | Texto manda beber; chips +1/+2/+3; sem toggle sóbrio |
| B3 | Acto visível | 8 | `sessionAct` invisível |
| B4 | Mini-UI por tipo | 8 | Tudo é cartão de texto; MiniGameModal é do mapa |
| B5 | Caos de mesa | 8 | 1 bloco `caos` / 817 |
| B7 | Copy Home/resultados | 8 | «beber até desmaiar» |
| B6 | Agente ao passar o ecrã | 7 | 24 cartas no arquivo, filtro `type !== 'agent'` |

### Prioridade Beber

🔴 B1, B2, B7  
🟡 B3, B4, B5  
🟢 B6, ligar IA surpresa *só* se a consequência for opcional, **não** ligar roleta nem `SIPS_WEIGHTS`

---

## 2. Cartas (deep)

### Estado atual

Cada um no seu telemóvel. Online Socket.IO. Rotas `/CardsLobby` → `/CardsGame`.

| Camada | Ficheiros |
|---|---|
| Lobby / jogo | `frontend/src/pages/CardsLobby.jsx`, `CardsGame.jsx` (**789** linhas) |
| Sessão | `frontend/src/utils/cardsSession.js` |
| Motor | `backend/websocket.js` (salas em memória, czar, mãos, pontos) |
| Auth rejoin | `backend/lib/gameAuth.js` (`HAND_SIZE` 7, `sanitizeDeck`) |
| Modelo BD | `backend/models/Card.js` (`is_black`, `pack`, `mode_type: 'cards'`) |
| JSON oficial | `data/cards/festa.json` (51 pretas + 50 brancas) |
| Placeholder comunidade | `data/cards/festacommunity.json` (**0/0**) |
| **Não é este modo** | `backend/routes/cardroom.js` + `models/CardRoom.js` (dare/truth/drinking/trivia) |

**Packs no setup (`PACKS` em `CardsGame.jsx`) vs realidade:**

| ID UI | Nome | Pretas | Brancas | Origem |
|---|---|---:|---:|---|
| `base` | Portugal Clássico | 13 | 27 | **Inline JS** — **não existe** `data/cards/base.json` |
| `dark` | Lado Negro | 8 | 12 | Inline JS |
| `geek` | Cultura Geek | 6 | 11 | Inline JS |
| `politica` | Política Portuguesa | 6 | 10 | Inline JS |
| `festa` | Festa Extra | **51** | **50** | `data/cards/festa.json` |
| **Total** | | **84** | **110** | **194 cartas** |

Default seleccionado: `['base', 'festa', 'dark']` → **72 pretas + 89 brancas** (161). Toggle comunidade default **ligado** → MongoDB `pack: 'community'`, não o JSON vazio.

Blanks: `requiredCards = min(2, max(1, count('___')))`. Packs `base` e `festa`: **100% 1 blank**. Só **5 pretas** em todo o produto têm 2 blanks (`dark` 2, `geek` 2, `politica` 1).

Servidor recusa baralho com `< 5` pretas ou `< 14` brancas. Máx. **12** jogadores. Fim quando `blackDeck` esgota. Host (não o czar) avança ronda. Sit-out + skip de pendentes (45s) existem.

Modo `local` (pass-and-play) está **codificado em `GameScreen` e nunca é chamado** (`handleStartLocal` morto).

IA `POST /api/ai/cards` + `AICardsGenerator.jsx`: **órfãos** (não ligados ao fluxo Cartas). Comunidade: `/community` → aprovação admin → `Card`.

Docs desactualizados: `data/CONTEUDO-NOVO.md` diz «45 brancas + 25 pretas» para `festa.json`; o ficheiro tem **50+51**. `packJsonTemplates.js` ainda aponta a `data/cards/base.json`.

### Mecânicas existentes

1. Host cria sala, escolhe packs, partilha código.
2. ≥2 jogadores; host `start_game` com `cardData` montado **no cliente**.
3. Cada não-czar recebe 7 brancas; sai uma preta.
4. Submeter 1 ou 2 brancas; servidor repõe do `whiteDeck`.
5. Czar revela, escolhe vencedor → **+1 ponto**.
6. Host «Próxima ronda»; czar roda (salta desligados / sit-out).
7. Esgotaram pretas → ranking.

O jogador **não** escreve cartas no momento (isso é comunidade, fora da ronda). O czar **não** joga branca.

### Tom e linguagem

PT-PT claro no pack `festa` (CP, MB Way, EMEL, Piçarra, francesinha, «à meia-noite»). `base` inline: SEF, IRS, Linha de Sintra, Sagres. `dark`: «Dating profile» em inglês. `translations.js`: *«Jogo online estilo Cartas Contra Tugas»* — aponta para outro produto; o modo deve descrever a mecânica, não um clone.

Sem pack PT-BR. «Tu», «telemóvel», «autocarro».

### Pontos fortes

- Loop czar completo, rejoin, sit-out, skip — mesa real, não demo.
- `festa.json` é o único pack com volume de uma noite (~18 rondas a 4 jogadores nas 72 pretas default).
- Tom português de mesa, não tradução.
- Comunidade já encaixa no baralho da sala.

### Problemas / repetição / gaps

1. **Três packs inline anémicos** (geek 17, politica 16, dark 20). Sem JSON, o Admin/seed não os gere.
2. **`base.json` fantasma** na documentação.
3. **Quase não há 2 blanks** — a mecânica de 2 cartas está subalimentada.
4. **Zero pretas sem blank** (pergunta seca / «escolhe a pior») e zero 3+ blanks (o motor caparia em 2).
5. Packs `geek`/`politica` quase irrelevantes se o default já enche.
6. Fim = acabar pretas, não um arco («final da noite», recap das melhores combinações).
7. Czar escolhe em silêncio — a mesa não «assina» a ronda.
8. Modo local morto; IA morta.
9. `cardroom.js` com o nome errado — armadilha para o próximo programador.

### O que falta para replayabilidade

- **Profundidade de pack em JSON** (o motor aguenta; o conteúdo não).
- **Formatos de preta** além de 1 `___`.
- **Memória da noite:** melhores combinações, «carta da sala» escrita no lobby.
- **Voz do czar** (uma linha obrigatória ao escolher).
- Não: mais um pack «dark» de 8 cartas inline.

### Propostas concretas

#### C1. Packs como ficheiros, `base` fora do JS — 9/10 — 🔴

Mover `base` / `dark` / `geek` / `politica` para `data/cards/*.json` (quando se implementar — **não neste PR**). O setup lê a mesma fonte que o seed. **Porque é diferente:** hoje o pack «oficial» da BD é só `festa`; os outros são um anexo do bundle.

#### C2. Formatos de preta: 0, 1, 2 blanks + «escolhe duas» — 8/10 — 🟡

- 0 blanks: a preta é um veredicto («Isto explica o grupo melhor do que qualquer desculpa.») — uma branca como *prova*.
- 2 blanks já existem no motor; falta volume **original**.
- «O czar lê duas pretas, o grupo joga uma branca que sirva as duas» — formato novo, sem clonar decks alheios.

**Porque é diferente:** 79/84 pretas são o mesmo molde `___`.

#### C3. Recap da combinação + frase do czar — 8/10 — 🟡

Ao `pick_winner`, o czar escreve **uma frase** (máx. 80 chars) que fica no recap da sala: *«Ganhou porque a mesa ficou em silêncio.»* No fim, as 3 melhores. **Porque é diferente:** hoje +1 e segue; a noite não tem quotes.

#### C4. Baralho «Da sala» no lobby — 8/10 — 🟡

Antes de começar, cada jogador manda **1 preta ou 2 brancas** (não um pack de inside jokes estático). Entram só nesta sessão. **Porque é diferente:** comunidade é assíncrona e admin; isto é a mesa de hoje. Não copiar o pack MemeMix `amigos` (nomes reais).

#### C5. Pretas de ritmo (não de volume) — 7/10 — 🟢

A cada N rondas, uma preta «de mesa»: o czar aponta um jogador e as brancas têm de ser sobre *essa pessoa* (sem a nomear no pack). **Porque é diferente:** o conteúdo actual é Portugal-genérico; a replayabilidade de CAH-like está nas pessoas, não em mais IRS.

#### C6. Modo local já escrito — 6/10 — 🟢

Expor o pass-and-play que já está em `GameScreen`. Útil para 2–3 pessoas e um ecrã. **Porque é diferente:** é ligar código, não inventar modo.

### Exemplos originais PT-PT

**Pretas (1 blank):**  
- «O grupo decidiu que o lema desta noite é ___.»  
- «Se a PSP parasse o Uber agora, encontrava ___.»  
- «A desculpa oficial para amanhã no trabalho: ___.»

**Preta (2 blanks):**  
- «Primeiro foi ___; depois, inexplicavelmente, ___.»

**Preta (0 blanks):**  
- «Isto devia ser proibido em jantares de família.»

**Brancas:**  
- «O silêncio depois de alguém dizer “estou bem”»  
- «Uma sandes de leitão no comboio da linha de Cascais»  
- «O primo que ainda fala do 11.º ano»  
- «Pôr o telemóvel virado para baixo e falhar em 40 segundos»  
- «A playlist que começa no Quim Barreiros e acaba num TED Talk»

Não reutilizar frases de `festa.json` nem do `PACKS.base`.

### Scores /10 e prioridade Cartas

| # | Ideia | /10 | Prioridade |
|---|---|---:|---|
| C1 | Packs em JSON | 9 | 🔴 |
| C2 | Formatos de preta | 8 | 🟡 |
| C3 | Frase do czar + recap | 8 | 🟡 |
| C4 | Da sala | 8 | 🟡 |
| C5 | Pretas de ritmo | 7 | 🟢 |
| C6 | Local já codificado | 6 | 🟢 |

---

## 3. MemeMix (deep)

### Estado atual

**Só online** (um telemóvel por pessoa). `MemeMixHub.jsx` redirecciona para `/MemeMixLobby`. Jogo em `/MemeMixOnline`.

| Camada | Ficheiros |
|---|---|
| Lobby / jogo | `MemeMixLobby.jsx` (725), `MemeMixOnline.jsx` (548) |
| Sessão / imagem | `mmSession.js`, `mememixImage.js` (JPEG 82%, máx. 1200px) |
| Socket / uploads | `backend/lib/mememixSocket.js` (913), `mememixSessions.js` (TTL 6h, view 15 min) |
| REST | `backend/routes/mememix.js` |
| Fallback JSON | `backend/lib/localMememix.js` |
| Conteúdo | `data/mememix/*.json` |

**Legendas locais: 352** em 8 packs com texto (+ community 0).

| Pack id | Ficheiro | UI lobby | N |
|---|---|---|---:|
| `base` | `legendas-pack.json` | Portugal (PT) | 74 |
| `house-party` | `legendas-house-party-pack.json` | #House Party | **83** |
| `amigos` | `legendasamigos.json` | A malta | 56 |
| `br` | `legendas-br-pack.json` | Portugal Extra | 39 |
| `picante` | `legendas-picante-pack.json` | Picante 18+ | 25 |
| `trabalho` | `legendas-trabalho-pack.json` | Trabalho/Escola | 25 |
| `relacionamentos` | `legendas-relacionamentos-pack.json` | Relacionamentos | 25 |
| `nostalgia` | `legendas-nostalgia-pack.json` | Nostalgia | 25 |
| `community` | `legendascommunity-pack.json` | (label existe; pack não está em `FALLBACK_LEGENDA_PACKS`) | 0 |

`includeCommunity` no backend entra por defeito; o lobby **não** mostra um toggle claro equivalente ao das Cartas.

**Distribuição de formatos (352 legendas):**

| Prefixo | N | % |
|---|---:|---:|
| Quando | 130 | 37% |
| Eu (minúsculas) | 45 | 13% |
| POV | 42 | 12% |
| EU (caps) | 41 | 12% |
| A cara de | 31 | 9% |
| Outro | 36 | 10% |
| A energia de | 14 | 4% |
| A reação ao | 6 | 2% |
| Ninguém | 4 | 1% |
| Aquele momento | 3 | 1% |

**Pack `amigos` / «A malta»:** ~15/56 legendas com nomes ou marcas de grupo (Jel, Pe, Brunex, Bruno, Jorge, Jo, Guids, Alisson, Joel, Bozen, Dona Rosa, Somersby). Inside jokes. **Impróprio para distribuição pública** — e está no fallback do lobby.

**Memes oficiais:** `memes-pack.json` declara **1** imagem `/memes/extreme-teste.png`. Em `frontend/public/memes/` só existe `LEIA-ME.txt`. Toggle lobby: «Só fotos da sala» (default no estado React `false`) vs «Fotos + oficiais». Mínimo **3 fotos** na sala para começar. 5–50 por jogador (default 30). Consentimento: «Tenho permissão das pessoas nas fotos».

`localMememix.js` é **fonte de dados**, não pass-and-play.

### Mecânicas existentes

1. Upload de fotos comprimidas → pasta `uploads/mememix/{CODE}/`.
2. Host: pontos para ganhar (3–7, default 5), modo legendas **pack** vs **escritas na hora** (200 chars), packs, oficiais sim/não.
3. Juiz rotativo: mão de **5 memes**; os outros **5 legendas** (se modo pack).
4. Juiz escolhe o meme da ronda → os outros submetem → reveal → juiz escolhe vencedor → **+1**.
5. Troca de legendas: **−1 ponto**, até 3 cartas, precisa de ≥1 ponto, só modo pack.
6. Sit-out. Quórum ignora quem está de fora (`onlineQuorum` tests).
7. Vitória ao atingir `maxPoints`. «Nova sessão» volta ao lobby **com as fotos**.

O jogador **faz** duas coisas: (a) ser a câmara da festa, (b) casar uma foto com uma frase. Não há templates visuais (barra, sticker, dois painéis). A legenda é texto sobre / ao lado da foto.

### Tom e linguagem

Packs genéricos: Uber, MB Way, ressaca, «só mais um copo», Nokia, cassete — PT-PT reconhecível. Inconsistência **EU** vs **Eu**. Pack `br` chama-se «Portugal Extra» (não é brasileiro). Picante 18+ explícito, age gate. «A malta» é outro produto: humor de grupo fechado, por vezes cru.

UI rosa `#fb7185`, copy «TU JULGAS».

### Pontos fortes

- As **fotos daquela noite** são o baralho — replayabilidade natural se a mesa fotografar.
- Compressão + consentimento + TTL: pensado para telemóvel e privacidade (`Privacy.jsx`).
- Juiz + swap + meta de pontos: há tensão, não só scroll de legendas.
- 352 legendas chegam para o mínimo do servidor (`max(10, (activos-1)*5)`).

### Problemas / repetição / gaps

1. **37% «Quando…»** — a mão parece a mesma frase com foto diferente.
2. **Pack amigos com nomes reais** no catálogo público.
3. **0 memes oficiais reais** — o toggle «oficiais» é um buraco.
4. Sem álbum de vencedores para partilhar (há `shareNight` genérico).
5. Swap punido: mãos más no início = sem troca.
6. Comunidade no backend sem controlo de UI.
7. Não há modo 1 telemóvel — faz sentido (fotos privadas), mas a Home não explica o porquê.
8. Juiz vê a foto e as legendas; a mesa no sofá pode não ver o ecrã de cada um — o «meme» vive no telemóvel, não na parede.

### O que falta para replayabilidade

- **Formatos de legenda** (diálogo, notificação falsa, dois tempos) — não mais 80 «Quando».
- **A malta gerada** a partir do roster da noite, não de Jel/Pe.
- **Recap visual** das rondas ganhas.
- **Layouts** (não imagens copyright de memes oficiais).
- Troca justa na ronda 1.

### Propostas concretas

#### M1. Sanitizar «A malta» + gerar da mesa — 9/10 — 🔴

Retirar o pack de nomes reais do fallback público (quando se implementar conteúdo — **não neste PR**). No lobby: *«Usar os nomes da mesa»* — templates com `{reader}` / nomes do roster: *«Quando o {n1} diz que vai embora e o casaco fica»*. **Porque é diferente:** o pack actual é um grupo específico; a mecânica certa é o *slot* de nomes, que o Beber já tem em `drinkPlayerText.js`.

#### M2. Formatos além de «Quando» — 8/10 — 🔴

Quota de mão: no máximo 2 «Quando» nas 5 cartas; obrigar 1 diálogo ou 1 «Notificação:». **Porque é diferente:** o volume já existe; a distribuição é que satura.

#### M3. Layouts oficiais (não memes copyright) — 8/10 — 🟡

Em vez de `extreme-teste.png`: **molduras** (barra preta, polaroid, «breaking», dois painéis). A foto da sala é o conteúdo; o layout é PartyMix. **Porque é diferente:** o JSON de memes oficiais está vazio e, se se enchesse com imagens virais, era o caminho errado.

#### M4. Álbum da noite — 8/10 — 🟡

No `mm_game_ended`, grelha das fotos vencedoras + legenda + autor. Partilha uma imagem. **Porque é diferente:** a vitória hoje é um nome e um número.

#### M5. Swap de abertura — 7/10 — 🟡

1 troca grátis na primeira mão (depois −1 pt). **Porque é diferente:** a regra actual tranca novatos.

#### M6. Juiz mostra à mesa — 7/10 — 🟢

Botão «espelhar no ecrã do host» a combinação final da ronda. **Porque é diferente:** o meme é social; agora vive no polegar do juiz.

### Exemplos originais PT-PT (legendas)

Não copiar os packs. Evitar «Quando» em série.

- «POV: o grupo a negociar Uber como se fosse o Tratado de Tordesilhas»
- «Notificação: a tua mãe. Pré-visualização: “já comeste?”»
- «Ninguém: / A playlist: o mesmo refrão pela quarta vez»
- «A energia de quem disse “eu conduzo de volta” às 18h»
- «Diálogo — “Estás bem?” / “Sim.” / (não estava)»
- «A cara de quem viu o MB Way a pedir 0,04 € de gorjeta»
- «EU a explicar o meme e a matá-lo ao mesmo tempo»
- «Dois tempos: foto da entrada da festa / foto do táxi com o casaco do outro»

**Template «da mesa»:**  
«A teoria do {n1} vs a prova do {n2}»

### Scores /10 e prioridade MemeMix

| # | Ideia | /10 | Prioridade |
|---|---|---:|---|
| M1 | Malta = roster, não nomes reais | 9 | 🔴 |
| M2 | Quota de formatos na mão | 8 | 🔴 |
| M3 | Layouts em vez de memes oficiais | 8 | 🟡 |
| M4 | Álbum da noite | 8 | 🟡 |
| M5 | Swap de abertura | 7 | 🟡 |
| M6 | Espelhar no host | 7 | 🟢 |

---

## 4. Mister White (deep)

### Estado atual

**Local** (1 telemóvel) **e online**. Hub `/MisterWhite` → `MisterWhiteGame.jsx` (514) ou lobby + `MisterWhiteOnline.jsx` (442).

| Camada | Ficheiros |
|---|---|
| Partilhado FE | `frontend/src/utils/misterWhiteShared.js` (packs, papéis, timer) |
| Settings UI | `frontend/src/components/mister/MisterMatchSettings.jsx` |
| Backend | `backend/lib/misterWhite.js`, `misterPairs.js`, handlers `mw_*` em `websocket.js` |
| Comunidade | `backend/routes/mister.js`, `communityMister.js` |
| JSON temas | `data/mister/pares.json` (**89** pares em 8 temas) |

**Papéis:** Civil (palavra A), Undercover/Infiltrado (palavra B próxima), Mister White (**sem** palavra; se eliminado, tenta adivinhar). Sempre ≥2 civis (`adjustSpecialRoleCounts`).

**Pool único oficiais (JS `WORD_PAIRS` + JSON + packs finos, dedupe):** **126 pares** — fácil 28, normal 83, difícil 15.

| Fonte | Pares | Notas |
|---|---:|---|
| `pares.json` | 89 | comida 14, animais 13, casa 9, objetos 12, profissões 11, desporto 11, transportes 9, entretenimento 10. Metadata diz «15 por tema» — **falso**. Casa e transportes: **0 difícil**. |
| `WORD_PAIRS` (geral) | 23 | hardcoded |
| portugal / marcas / filmes / escola | 4 cada | marcas/filmes sobrepõem-se a `geral` (Coca-Cola, Cinema…) |
| `sala` / `comunidade` | 0 no JSON | runtime: custom até 30; BD |

Timer discussão: **60 / 90 / 120 s** (default 90). Online máx. 12 jogadores; local 15. Default MW no local: **0** (só infiltrados); backend online default MW **1** (o lobby pode mandar 0).

Fases online: `waiting` → `reveal` → `playing` → `vote` → (`mw_guess`) → `result`.

**Não há** histórico de pares usados na sessão: `pickWordPair` sorteia do pool filtrado. «Nova ronda» pode repetir já.

### Mecânicas existentes

1. Host escolhe packs, dificuldades, nº MW / infiltrados, pares da sala.
2. Cada um vê o papel (pass-and-play local ou ecrã próprio).
3. Discussão cronometrada: pistas sobre a palavra (o jogo **não** estrutura o tipo de pista).
4. Votação: local = o dono do telemóvel aponta; online = cada um vota, maioria (`mwResolveVotes`).
5. Se o MW morre: palpite da palavra civil.
6. Fim: `civils_win` / `undercover_wins` / `mw_wins` (`checkEndCondition`).

O jogador **faz** pistas e acusa. Não há rondas de «pista obrigatória», não há recap do que cada um disse.

### Diferença face ao Impostor do Beber / mapa (não clonar)

| | Mister White | Impostor (`ImpostorCard.jsx`) |
|---|---|---|
| Unidade | **Par de palavras** | **Par de perguntas** |
| Especiais | N infiltrados + MW opcional sem palavra | **Exactamente 1** impostor |
| Duração | Multi-ronda até vitória | **Uma carta** |
| Online | Sim | Não |
| Castigo | Vitória social | Goles no Beber / mapa |
| Conteúdo | 126 pares | 6 pares built-in + API amigos |

**Não** trazer papéis de AldeiaMix (lobo, xerife) para aqui. **Não** transformar o MW num «eu nunca». O mini Impostor fica no Beber como *pergunta*; o Mister White fica como *vocabulário*.

### Tom e linguagem

Pares PT-PT de família semântica: Hambúrguer/Prego, Frigorífico/Congelador, Cabeleireiro/Barbeiro, Fado/Cante alentejano. «Objetos» no JSON sem acento no id; label «Objetos». Sem PT-BR.

### Pontos fortes

- Dois jeitos de sentar a mesa (local + online) — único dos cinco modos com isto tão claro.
- Palavra vizinha (não «impostor sem pista») dá discussão de verdade.
- Pack «Da sala» + comunidade: válvula contra saturação.
- Vitória já **não** é álcool.

### Problemas / repetição / gaps

1. **126 pares sem memória** — 1–2 packs activos = repetição na mesma noite.
2. Packs portugal/marcas/filmes/escola **cosméticos** (4, e ainda por cima duplicados).
3. Discussão é um timer vazio: não há estrutura de pista (categoria / gesto / uma palavra).
4. Local: o telemóvel vaza se alguém virar o ecrã cedo; online resolve isso.
5. Default MW 0 vs 1 consoante o caminho — a mesa não percebe a diferença do papel «mudo».
6. Recap fraco: sabe-se quem ganhou, não «quem se entregou na 2.ª pista».

### O que falta para replayabilidade

- Anti-repetição na sessão e entre noites (mesmo device).
- **Formato de pista** por ronda.
- Pares difíceis de verdade (só 15 no pool).
- Recap da discussão.

### Propostas concretas

#### W1. Memória de pares (sessão + localStorage) — 9/10 — 🔴

Não repetir o par nesta sessão; no device, arrefecer os últimos N. **Porque é diferente:** o sorteio actual é sem estado.

#### W2. Ronda de pista obrigatória — 8/10 — 🟡

Ronda 1: só **categoria** («é comida»). Ronda 2: **uma palavra**. Ronda 3: livre. O MW continua sem palavra — tem de imitar o *formato*, não o conteúdo. **Porque é diferente:** hoje todos falam igual desde o segundo 0; o MW perde-se cedo demais ou mistura-se demais. Não é AldeiaMix.

#### W3. Recap «quem disse o quê» (online) — 8/10 — 🟡

No voto, cada um submeteu uma pista de uma linha (opcional mas default on). No resultado, lista. **Porque é diferente:** a acusação fica sem prova; a noite não se conta.

#### W4. Packs finos: ou fundir ou aprofundar — 7/10 — 🟡

Fundir portugal+marcas+filmes+escola em «Cultura» **ou** (mais tarde) encher com pares originais. **Porque é diferente:** 4 pares não são um pack; são um chip mentiroso.

#### W5. Tutorial de 30s do papel MW — 7/10 — 🟢

«Não tens palavra. Copia o tipo de pista, não inventes objecto.» **Porque é diferente:** o default 0 MW existe porque o papel é difícil, não porque a mesa não o quer.

### Exemplos originais PT-PT (pares — conceitos, não copiar o JSON)

Família próxima, um detalhe que parte:

| Civil | Infiltrado | Dificuldade |
|---|---|---|
| Ginjinha | Aguardente | difícil |
| Eléctrico | Autocarro | fácil |
| Tosta mista | Croque-monsieur | difícil |
| Praxe | Bénção | normal |
| Multibanco | Caixa da loja | normal |
| Sardinhas | Carapaus | difícil |

Pista-formato (copy UI): *«Esta ronda: só podes dizer a categoria. Proibido nomear a coisa.»*

### Scores /10 e prioridade Mister White

| # | Ideia | /10 | Prioridade |
|---|---|---:|---|
| W1 | Memória de pares | 9 | 🔴 |
| W2 | Pistas estruturadas | 8 | 🟡 |
| W3 | Recap de pistas | 8 | 🟡 |
| W4 | Packs honestos | 7 | 🟡 |
| W5 | Tutorial MW | 7 | 🟢 |

---

## 5. AldeiaMix (deep)

### Estado atual

**Só online.** Mínimo **4** (3 jogadores + narrador). Máx. **15**. Sem JSON de conteúdo — papéis e scripts em código.

| Camada | Ficheiros |
|---|---|
| Hub / lobby / jogo | `AldeiaMixHub.jsx`, `AldeiaMixLobby.jsx`, `AldeiaMixOnline.jsx` (647) |
| FE partilhado | `frontend/src/utils/aldeiaMixShared.js` |
| Motor | `backend/lib/aldeiaMix.js` (192), `aldeiaMixSocket.js`, `aldeiaNarrator.js` |
| Sessão | `amSession.js` |

**Papéis (5 ids, 4 jogáveis):**

| id | Label PT | Config |
|---|---|---|
| `narrador` | Narrador | 1, **não joga**, conduz a noite |
| `aldeao` | Aldeão | resto |
| `lobo` | Lobo | 1–5 |
| `curandeira` | Beijoqueira/o | 1–3 |
| `vidente` | Xerife | 1–3 |

Validação: pelo menos 1 de cada especial; especiais ≤ slots jogáveis. Vitória: `aldeoes_win` se 0 lobos vivos; `lobos_win` se lobos ≥ aldeões vivos.

**Noite — 8 passos** (`aldeiaNarrator.js` / `NIGHT_STEPS`): adormece → lobos (1 vítima) → dormem → beijoqueira (salva, toggle) → dorme → xerife (1 investigação, vê se é lobo) → dorme → amanhecer. Resolução: morte se `wolfTarget !== medicTarget`.

**Dia:** timer discussão **60/90/120/180 s** (default 120) + voto nos telemóveis. Empate = ninguém sai, volta à noite. `nightSeconds` (45/60/90, default 60) existe no backend e **não está no lobby**.

Reconexão, sit-out de mortos (não votam — testes em `backend/tests/onlineQuorum.test.js` / `priorityFixes.test.js`), `am_play_again` com novo narrador.

Home: *«Cada um no seu telemóvel. Loucura na aldeia.»*

### Mecânicas existentes

O jogador, conforme o papel:

- **Narrador:** lê o script, escolhe no ecrã o alvo que a mesa aponta, avança passo, fecha voto.
- **Lobo:** aponta à noite (o narrador confirma; **não** há chat secreto).
- **Beijoqueira/o:** 1 salvamento / noite.
- **Xerife:** 1 visto / noite (lobo sim/não).
- **Aldeão:** discute de dia, vota.
- **Morto:** assiste, não vota.

Isto **cabe na noite PartyMix** como o modo longo, de confiança e silêncio — o oposto do Beber barulhento. O narrador humano é a tese: a app não substitui a mesa, conduz.

### Tom e linguagem

Rename consciente: Beijoqueira/o, Xerife — evita o léxico de um clone óbvio, mas o ciclo é o clássico noite/dia/voto. Scripts em PT-PT curto, instrução de mesa entre parênteses. Sem packs de flavour. Sem PT-BR.

### Pontos fortes

- Narrador dedicado (o juiz da mesa) — encaixa no PartyMix melhor do que um servidor a falar sozinho.
- Quórum e mortos bem testados (commit recente em `master`).
- Config de N papéis especiais para mesas grandes.
- Vitória social, zero álcool.

### Problemas / repetição / gaps

1. **8 frases para sempre.** A saturação não é de cartas; é de *ritmo igual*.
2. Sem histórico de investigações do xerife no ecrã do narrador.
3. Sem `nightSeconds` na UI — noites eternas se o narrador se perder.
4. Empate = skip: mesas passivas nunca matam de dia.
5. Lobos não confirmam o alvo entre si na app (dependem do apontar físico — frágil online se não estão na mesma sala… mas o modo assume a mesma sala).
6. **Não há conteúdo em ficheiro** — impossível variar tom sem deploy.

### O que falta para replayabilidade (sem clonar mais lobisomem noutros modos)

- Variantes de **script** e de **regra de dia**, não 12 papéis novos.
- Recap da noite (quem morreu, se houve beijo, sem revelar papéis cedo demais).
- Um papel *PartyMix* se algum dia crescer: informação pública, não um «caçador» clássico.

**O que NÃO fazer:** meter lobos no Beber, xerife no Mister White, noite/dia no MemeMix. A AldeiaMix é o sítio desta fantasia; os outros modos têm os seus infiltrados (MW, Impostor-pergunta).

### Propostas concretas

#### A1. Timer de noite no lobby + auto-avanço suave — 8/10 — 🔴

Expor `nightSeconds` já normalizado. O narrador pode sempre saltar à frente. **Porque é diferente:** o campo existe e a UI mente por omissão.

#### A2. Caderno do narrador — 8/10 — 🟡

Log só no juiz: «Noite 2 — xerife viu X (lobo/não). Beijo em Y. Alvo dos lobos Z.» **Porque é diferente:** o narrador humano esquece; a app já tem os alvos em `narratorNight`.

#### A3. Scripts de tom (festa / tenso / curto) — 8/10 — 🟡

Três JSON futuros `data/aldeia/scripts-*.json` — **mesmos 8 passos**, copy diferente. Ex.: festa *«Luzes baixas. Os que uivam abrem um olho.»* vs curto *«Lobos. Um nome.»* **Porque é diferente:** hoje o texto está hardcoded duas vezes (FE+BE). Não são papéis novos.

#### A4. Dia com «rumor» (informação pública, não papel extra) — 8/10 — 🟡

Uma vez por partida, o narrador lê **uma frase verdadeira ou falsa** gerada pela app a partir do estado (ex.: «Esta noite alguém foi salvo» / «Ninguém foi salvo» — 50% mentira). A aldeia discute o rumor. **Porque é diferente:** não é bruxa/cupido/caçador; é *informação*, o recurso que a AldeiaMix ainda não joga. Não exportar para o Mister White.

#### A5. Empate activo — 7/10 — 🟢

Empate de dia → segundo voto só entre os empatados (já conhecidos em `isVoteTie`). **Porque é diferente:** o skip actual protege os lobos em mesas educadas.

#### A6. Recap de papéis no fim + «narrador da próxima» — 7/10 — 🟢

Já há `am_play_again`; falta a tabela «era lobo / beijou N noites». **Porque é diferente:** a noite termina em «Lobos ganham!» e a mesa quer a autópsia.

### Exemplos originais PT-PT (scripts / rumor — não papéis copiados)

**Script curto (passo lobos):**  
«Quem mata escolhe um nome. Um só. O resto da casa não olha.»

**Script festa:**  
«A aldeia finge que está a dormir. Tu não. Aponta. Eu marco.»

**Rumor (público):**  
- «Ouviu-se um beijo esta noite — ou foi o vento.»  
- «O xerife hoje não dormiu. Isso é tudo o que sabemos.»  
- «Ninguém desapareceu. Estranho? Talvez.»

**Copy de resultado:**  
«Os que restam à mesa não uivam. Os outros, sim.» / «A aldeia acredita demais. Os lobos chegam ao dia.»

### Scores /10 e prioridade AldeiaMix

| # | Ideia | /10 | Prioridade |
|---|---|---:|---|
| A1 | `nightSeconds` na UI | 8 | 🔴 |
| A2 | Caderno do narrador | 8 | 🟡 |
| A3 | Scripts de tom | 8 | 🟡 |
| A4 | Rumor (info, não role) | 8 | 🟡 |
| A5 | Desempate de dia | 7 | 🟢 |
| A6 | Autópsia de papéis | 7 | 🟢 |

---

## 6. Sobreposições entre estes modos (e o que NÃO duplicar)

### Mapa de «infiltrado»

| Modo | O que está escondido | Não copiar de |
|---|---|---|
| Beber | Pergunta errada (1 carta) | Palavras do MW; papéis da Aldeia |
| Mister White | Palavra vizinha / sem palavra | Perguntas do Impostor; noite/dia |
| AldeiaMix | Equipa e papéis a noite inteira | Mini-impostor; czar |
| Cartas | Nada escondido (czar público) | — |
| MemeMix | Autor da legenda até ao reveal | Czar das Cartas **como clone** (já há juiz; chega) |

**Regra:** um tipo de segredo por modo. A mesa que jogue os cinco na mesma noite deve sentir cinco desportos, não cinco skins de lobo.

### O que já se sobrepõe (e convém cortar ou especializar)

| Sobreposição | Onde | Acção de design |
|---|---|---|
| Impostor-perguntas | Beber + tile do mapa Amigos | Manter no Beber; **não** trazer ao MW |
| Juiz / czar escolhe o vencedor | Cartas + MemeMix | OK — um escolhe frase+carta, o outro foto+legenda. Não unificar UI. |
| Código de sala + rejoin + sit-out | Cartas, MemeMix, MW, Aldeia | Infra partilhada, bem. Não é conteúdo. |
| «Da sala» / nomes da mesa | MW custom pairs; Beber `{reader}`; MemeMix *devia* | **Uma** mecânica de nomes da noite, três usos. Pack `amigos` do MemeMix é o anti-padrão. |
| Comunidade | Todos via `/community` | Manter; Beber tem toggle off; MemeMix inclui sem UI |
| Humor PT-PT de CP / MB Way / Uber | Cartas `festa` + legendas MemeMix | Normal; variar **formato** (preta vs POV), não o tema |
| Timer de discussão | MW 60–120; Aldeia 60–180 | OK — um é pistas, o outro é linchamento. Não fundir. |
| Vitória por pontos | Cartas +1/ronda; MemeMix até N | Não pôr pontos no Beber-álcool nem na Aldeia |

### O que NÃO duplicar (lista explícita)

1. **Não** pôr noite/dia/voto no Mister White nem no Beber.  
2. **Não** pôr pretas/brancas no MemeMix (o juiz já escolhe; as legendas não são respostas a `___`).  
3. **Não** pôr fotos no Cartas.  
4. **Não** usar ranking de goles noutros modos (o mapa Amigos já tem penalizações — fora de âmbito).  
5. **Não** clonar papéis clássicos (caçador, cupido, bruxa) para «variar» a Aldeia — usar rumor/scripts.  
6. **Não** encher o Beber de mini-jogos do `MiniGameModal`.  
7. **Não** ligar `SIPS_WEIGHTS` em lado nenhum.  
8. **Não** criar pack MemeMix com nomes reais de um grupo.  
9. **Não** descrever Cartas como «Contra Tugas / Contra a Humanidade» na Home — mecânica, não marca alheia.  
10. **Não** fazer do Agente Secreto um segundo Mister White.

### Encaixe na noite (sequência sugerida, não código)

Mesa de 6, uma noite: **Beber (arco curto, 20 cartas, vitória social)** → **Cartas (1 pack fundo)** → **MemeMix (fotos que já tiraram)** → **Mister White (1 par, pistas)** → **AldeiaMix (se ainda houver silêncio)**. O Beber aquece a voz; as Cartas aquecem o humor cruel; o MemeMix usa a evidência; o MW e a Aldeia pedem calar. Esta ordem é design de produto, não um modo «party mix automático» (esse seria outro projecto e misturaria mal os segredos).

---

## 7. Top 25 ideias só nestes modos

Ordenadas por impacto na noite. Notas da secção do modo. Nenhuma exige editar JSON neste PR.

| # | Modo | Ideia | /10 | P | Porquê não é o que já existe |
|---|---|---|---:|---|---|
| 1 | Beber | **Vitória da Mesa** (regras / maldições / alianças / mini-boss) | 9 | 🔴 | O ecrã celebra goles; `agentSuccess` = 0 |
| 2 | Beber | **Consequência à escolha** + toggle sem álcool | 9 | 🔴 | Chips +1/+2/+3 e waterfall como objectivo |
| 3 | MemeMix | **«A malta» = roster**, pack de nomes reais fora do público | 9 | 🔴 | `legendasamigos.json` é um grupo concreto |
| 4 | Cartas | **Packs em JSON** (`base` deixa de ser inline) | 9 | 🔴 | 4 packs só no bundle; seed só vê `festa` |
| 5 | Mister White | **Memória de pares** sessão + device | 9 | 🔴 | `pickWordPair` sem histórico |
| 6 | Beber | **Copy Home** sem «beber até desmaiar» | 8 | 🔴 | `MODE_BLURB.drink` |
| 7 | AldeiaMix | **`nightSeconds` no lobby** | 8 | 🔴 | Já está em `normalizeSettings`, não na UI |
| 8 | MemeMix | **Quota de formatos** na mão (limitar «Quando») | 8 | 🔴 | 130/352 são o mesmo molde |
| 9 | Beber | **Mini-UI** história / cadeia / bluff / timer mini-boss | 8 | 🟡 | 370 `desafio` no mesmo cartão |
| 10 | Cartas | **Formatos de preta** 0/1/2 blanks | 8 | 🟡 | 79/84 com um único `___` |
| 11 | Cartas | **Frase do czar** + recap das combinações | 8 | 🟡 | +1 ponto e a ronda morre |
| 12 | Cartas | **Baralho Da sala** (1 preta / 2 brancas por pessoa) | 8 | 🟡 | Comunidade é admin/assíncrona |
| 13 | MemeMix | **Layouts** (molduras) em vez de memes oficiais vazios | 8 | 🟡 | 1 PNG fantasma, 0 ficheiros |
| 14 | MemeMix | **Álbum da noite** (foto+legenda+autor) | 8 | 🟡 | Fim = nome e score |
| 15 | Mister White | **Pistas estruturadas** por ronda | 8 | 🟡 | Timer vazio, fala livre desde já |
| 16 | Mister White | **Recap de pistas** no resultado | 8 | 🟡 | Voto sem memória |
| 17 | AldeiaMix | **Caderno do narrador** | 8 | 🟡 | Alvos já estão em memória, a UI esconde |
| 18 | AldeiaMix | **Scripts de tom** (festa / tenso / curto) | 8 | 🟡 | 8 frases hardcoded FE+BE |
| 19 | AldeiaMix | **Rumor** (info pública, não papel novo) | 8 | 🟡 | Zero informação como recurso |
| 20 | Beber | **Acto visível** na mesa | 8 | 🟡 | `sessionAct` invisível |
| 21 | Beber | **Momento Caos de mesa** (1×/acto) | 8 | 🟡 | 1 bloco `caos` / 817 |
| 22 | MemeMix | **Swap grátis** na 1.ª mão | 7 | 🟡 | Troca exige ponto |
| 23 | Mister White | **Packs finos honestos** (fundir ou encher) | 7 | 🟡 | Chips com 4 pares, ainda duplicados |
| 24 | AldeiaMix | **Desempate** entre empatados | 7 | 🟢 | Empate = skip → noite |
| 25 | Beber | **Agente ao virar o ecrã** (arquivo 24) | 7 | 🟢 | Filtrado; UI residual |

Fora do top mas úteis: C6 modo local Cartas (código morto); M6 espelhar meme no host; W5 tutorial MW; A6 autópsia de papéis; **não** ligar roleta Beber nem `SIPS_WEIGHTS`.

---

## 8. Prioridade de implementação 🔴🟡🟢

### 🔴 Agora (muda o que a mesa sente, pouco ou nenhum pack novo)

1. Beber: ecrã de resultados sem «quem bebeu mais»; métricas sociais; goles opcionais / rodapé.  
2. Beber: setup «álcool na mesa?» + pagamento à escolha.  
3. Beber + Home: blurb sem desmaio; `translations.js` Cartas sem nome de outro jogo.  
4. MemeMix: tirar «A malta» do catálogo público **ou** escondê-lo atrás de um flag; gerador por nomes do roster.  
5. Mister White: não repetir par na sessão.  
6. AldeiaMix: expor timer de noite.  
7. Cartas: plano técnico para packs JSON (implementação pode ser 🔴 de *arquitectura* mesmo que o *move* dos arrays seja um PR de conteúdo à parte — **este repo não move cartas neste entregável**).  
8. MemeMix: quota de prefixos no *deal* (código, sem reescrever as 352).

### 🟡 Segunda vaga (aprofunda modos que já correm)

- Beber: UI por tipo; acto visível; Caos de mesa.  
- Cartas: formatos de preta; frase do czar; Da sala.  
- MemeMix: layouts; álbum; swap de abertura.  
- Mister White: pistas por ronda; recap; verdade nos packs.  
- AldeiaMix: caderno; scripts; rumor.

### 🟢 Depois

- Agente Secreto (Beber) como está no arquivo.  
- Cartas local; IA Cartas/Beber só com filtros PT-PT e sem goles obrigatórios.  
- Tutorial MW; desempate Aldeia; autópsia; espelho MemeMix.  
- **Nunca:** roleta «Bebe 3»; `SIPS_WEIGHTS`; papéis clássicos extra na Aldeia; Impostor-perguntas no MW; pack de nomes reais.

### Dependências (para não pisar modos)

```
Home copy  ──►  independente
Beber resultados  ──►  não partilha VictoryScreen (já não usa)
MemeMix roster names  ──►  pode reutilizar drinkPlayerText (contracções PT)
Cartas JSON  ──►  não tocar em festa.json neste ciclo de design
Aldeia nightSeconds  ──►  só lobby + socket, sem novos papéis
MW memória  ──►  só misterWhite.js / FE, sem aldeiaMix
```

### Critério de sucesso por modo (aceitação de design)

| Modo | A noite foi boa se… |
|---|---|
| Beber | O recap nomeia regras e caos, **não** o ranking de goles; uma mesa sóbria consegue jogar o mesmo pack. |
| Cartas | Há pelo menos um formato de preta que não é `X é ___.`; o grupo cita uma combinação no Uber. |
| MemeMix | As 5 cartas da mão não são cinco «Quando»; os nomes na legenda são da *esta* mesa. |
| Mister White | A segunda partida da noite não sorteia o mesmo par; o MW sabe que tipo de pista deve imitar. |
| AldeiaMix | A noite 2 não dura o dobro porque o narrador se perdeu; há uma frase nova ou um rumor, não um 6.º papel. |

---

## 9. Apêndice: ficheiros-âncora

### Beber

```
frontend/src/pages/DrinkGame.jsx
frontend/src/utils/drinkAgentCompose.js
frontend/src/utils/drinkBaralhos.js
frontend/src/utils/drinkPlayerText.js
frontend/src/utils/drinkChaosUpgrade.js
frontend/src/utils/drinkImpostorGhost.js
frontend/src/utils/drinkDecksFallback.js
frontend/src/utils/game.js                 ← SIPS_WEIGHTS (não usado)
frontend/src/components/game/ImpostorCard.jsx
frontend/src/components/game/PreferenciaCard.jsx
frontend/src/pages/Home.jsx                ← MODE_BLURB.drink
backend/routes/drink.js
backend/routes/ai.js                       ← desafio surpresa (não ligado)
backend/lib/communityDrink.js
backend/models/DrinkPack.js
data/drink/decks.json                      ← 230
data/drink/noite-academica-pack.json       ← 280
data/drink/sem-filtros-pack.json           ← 200 (1 bloco caos)
data/drink/casais-festa-pack.json          ← 107
data/drink/communitydrink.json             ← 0
data/drink/cartas-classificadas.json       ← staging 600
data/drink/agent-secreto-arquivo.json      ← 24 agent
```

### Cartas

```
frontend/src/pages/CardsLobby.jsx
frontend/src/pages/CardsGame.jsx           ← PACKS inline + festa.json
frontend/src/utils/cardsSession.js
backend/websocket.js                      ← motor CAH-like
backend/lib/gameAuth.js
backend/models/Card.js
backend/routes/community.js
backend/routes/cardroom.js                ← NÃO é este modo
data/cards/festa.json                      ← 51 pretas + 50 brancas
data/cards/festacommunity.json             ← vazio
```

### MemeMix

```
frontend/src/pages/MemeMixHub.jsx          ← redirect
frontend/src/pages/MemeMixLobby.jsx
frontend/src/pages/MemeMixOnline.jsx
frontend/src/utils/mmSession.js
frontend/src/utils/mememixImage.js
backend/lib/mememixSocket.js
backend/lib/mememixSessions.js
backend/lib/localMememix.js
backend/routes/mememix.js
data/mememix/legendas-*.json               ← 352 legendas
data/mememix/legendasamigos.json           ← nomes reais
data/mememix/memes-pack.json               ← 1 URL fantasma
frontend/public/memes/LEIA-ME.txt
```

### Mister White

```
frontend/src/pages/MisterWhiteHub.jsx
frontend/src/pages/MisterWhiteGame.jsx
frontend/src/pages/MisterWhiteLobby.jsx
frontend/src/pages/MisterWhiteOnline.jsx
frontend/src/utils/misterWhiteShared.js    ← 126 pares únicos oficiais
frontend/src/utils/mwSession.js
frontend/src/components/mister/MisterMatchSettings.jsx
backend/lib/misterWhite.js
backend/lib/misterPairs.js
backend/routes/mister.js
data/mister/pares.json                     ← 89 (não 15/tema)
```

### AldeiaMix

```
frontend/src/pages/AldeiaMixHub.jsx
frontend/src/pages/AldeiaMixLobby.jsx       ← sem nightSeconds
frontend/src/pages/AldeiaMixOnline.jsx
frontend/src/utils/aldeiaMixShared.js
frontend/src/utils/amSession.js
backend/lib/aldeiaMix.js
backend/lib/aldeiaMixSocket.js
backend/lib/aldeiaNarrator.js              ← 8 passos
(nenhum data/aldeia/*.json)
```

### Contagens-relâmpago (master)

| Modo | Número que importa |
|---|---|
| Beber | 817 cartas jogáveis, 13 types, 14 baralhos, 4 packs, 1 bloco `caos`, 24 agent no arquivo, 0 comunidade JSON |
| Cartas | 84 pretas / 110 brancas, 5 com 2 blanks, default 161 cartas, 0 em `festacommunity.json` |
| MemeMix | 352 legendas, 130 «Quando», 56 «A malta», 1 meme oficial inexistente, mín. 3 fotos |
| Mister White | 126 pares únicos, 15 difíceis, 89 no JSON, timer 60/90/120 |
| AldeiaMix | 5 papéis, 8 scripts, 2 vitórias, nightSeconds escondido, 0 ficheiros de conteúdo |

### Notas de corpus (para quem for escrever packs noutro PR)

- Beber: usar **goles** (trago) na copy nova; o JSON vivo diz **golos** — inconsistência conhecida, **não** corrigida aqui.  
- Placeholders Beber: `reader` / `reader_a` / `player1_com` — 34 usos; há motor para mais.  
- Cartas: não inventar `base.json` na docs sem o criar.  
- MemeMix: normalizar EU/Eu num ciclo de conteúdo.  
- Mister: alinhar description «15 pares por tema» com as contagens reais (9–14).  
- Aldeia: se nascer JSON de scripts, uma só fonte (hoje FE e BE duplicam `NIGHT_STEPS`).

---

*Fim do relatório. Entregável único: este ficheiro. Zero edições a packs, cartas ou legendas.*
