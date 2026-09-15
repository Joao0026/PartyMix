# PartyMix — Análise de Conteúdo e Design de Jogo

**Papel:** Content Designer + Game Designer  
**Âmbito:** análise do código e dos packs existentes; propostas originais em português de Portugal (PT-PT).  
**Restrição:** este ficheiro é o único entregável. Nenhum pack JSON, carta, desafio ou copy da app foi alterado.

---

## Como ler este relatório

O PartyMix já tem **volume**. O problema não é «faltam cartas». O problema é **ritmo, variedade de mecânicas e replayabilidade**: muitas cartas repetem o mesmo contrato social (beber / apontar / confessar / «ou bebes»), enquanto mecânicas fortes (bluff, memória, observação, regras temporárias, 1v1, criatividade) estão finas ou presas a um único modo.

Tese de produto:

1. **Beber** tem de ser um jogo de mesa com estado (regras, alianças, maldições, boss, risco), em que o álcool é **consequência opcional** — nunca o objectivo, nunca o marcador da noite.
2. **Amigos / Família / Casal** precisam de contratos de carta mais distintos, não de mais clones de «Tema: X. Palavra ao mesmo tempo.»
3. **Legendas** precisam de personalidade e de formatos, não de mais «Quando / POV / EU quando».

Todas as propostas de texto abaixo são originais, em PT-PT, e **não copiam** nomes, cartas ou frases de outros jogos. A inspiração externa é só de **mecânica**.

---

## 1. Estado atual

### 1.1 O que a app é, de facto

O PartyMix (`README.md`, `frontend/src/pages/Home.jsx`) é uma noite em telemóvel, não um catálogo de mini-jogos soltos. Há dois tipos de mesa:

| Tipo de mesa | Modos | Estado |
|---|---|---|
| **Um telemóvel no centro** | Beber, Amigos, Família, Casal | `sessionStorage` via `frontend/src/utils/game.js`; roster em `nightRoster.js` |
| **Um telemóvel por pessoa** | Cartas, MemeMix, Mister White (online), AldeiaMix | Socket.IO + sessões (`cardsSession`, `mmSession`, `mwSession`, `amSession`) |

Age gate: menores só vêem Família (`Home.jsx`, `isUnder18()`).

Isto é uma força. O conteúdo deve servir **a noite**, não encher um CMS.

### 1.2 Onde vive o conteúdo

| Modo | Ficheiros vivos | Volume aproximado |
|---|---|---|
| Amigos | `data/friends/base.json` (36), `festa.json` (73) | **109** desafios |
| Família | `data/family/base.json` (23), `festa.json` (55) | **78** desafios |
| Casal (JSON) | `data/couple/base.json` (9), `festa.json` (48) | **57** desafios |
| Casal (código) | `UNIQUE_CHALLENGES` em `CoupleGame.jsx` | **26** desafios hardcoded, paralelo ao JSON |
| Beber | `decks.json` (230) + `sem-filtros-pack.json` (200) + `noite-academica-pack.json` (280) + `casais-festa-pack.json` (107) | **817** cartas |
| Cartas | `data/cards/festa.json` | **50** brancas + **51** pretas |
| MemeMix | 8 packs de legendas + 1 meme de teste | **352** legendas, **1** imagem |
| Mister White | `data/mister/pares.json` | **89** pares, 8 temas |
| Comunidade | `community.json` / `communitydrink.json` / `festacommunity.json` / packs community MemeMix | **0** itens |

Arquivo / não jogável:

- `data/drink/cartas-classificadas.json` — 601 cartas de staging, dessincronizadas com o live.
- `data/drink/agent-secreto-arquivo.json` — 24 agentes, retirados a 2026-07-05 (UX de telemóvel partilhado).
- `data/CATALOGO-200-POR-TIPO-PARA-REVISAO.txt` — fila de revisão, **não entra no jogo**.
- `data/CONTEUDO-NOVO.md` está **desactualizado** (fala de `cards/base.json`, baralho Extremo e ~111 cartas Beber; o live é outro).

### 1.3 Estrutura de carta (campos reais)

**Mapa Amigos / Família / Casal** — modelo `backend/models/Challenge.js`:

```
text, category, mode_type, difficulty, answer, choices[], forbiddenWords[],
sips_penalty, time_limit, is_ongoing, ongoing_rounds, ongoing_instruction,
correct_question, wrong_question, pack, audience
```

Categorias no enum do modelo incluem várias que **quase não têm conteúdo JSON**: `palavra`, `acao` (mapa), `verdade`, `consequencia`, `cultura`, `desporto`, `musica`, `cinema`, `erotico`, `dados`.

**Beber** — `DrinkPack.decks[baralhoId].cards[]`:

```
type, emoji, title, text, pack, intensity, rarity, act
+ choices[] (preferencia)
+ correctQuestion / wrongQuestion (impostor)
+ secretMission / publicText (agent — arquivado)
+ image (documentado, praticamente não usado)
+ caos { text, title, cost } (Momento Caos, 30% — drinkChaosUpgrade.js)
```

Placeholders de nomes (`reader`, `player1`…, `reader_a`, `reader_de`…) estão bem documentados em `data/COMO-ESCREVER-CARTAS.txt`, mas no live **quase não se usam** (cerca de 33 `reader` em 817 cartas).

**Cartas CAH** — `white[]` / `black[]` com `___`.  
**Legendas** — `legendas: string[]`.  
**Mister** — `{ civil, undercover, difficulty }`.

### 1.4 Como a carta aparece no ecrã

- **Mapa:** `ChallengeCard.jsx` — faixa de categoria (emoji + label), nome do jogador, `text`, timer se `time_limit`, MCQ em Sabichão, palavras proibidas, botões Consegui/Falhei, Caos contínuo com «Aceitar desafio contínuo».
- **Beber:** `DrinkGame.jsx` — cartão a cores por `type` (`TYPE_LABELS` / `TYPE_COLORS`), título + texto, Preferias em split azul/vermelho (`PreferenciaCard.jsx`), Impostor com passagem de telemóvel, Aliança com picker, Mini Boss com Vitória/Falha, painel Mesa (regras activas, golos, maldições).
- **Casal:** menu de intensidade + actividades; mapa de corações; desafios locais, não o `ChallengeCard` do mapa.
- **MemeMix:** polaroid + bolha de fala; mão de 5 legendas ou texto livre.

Labels de categoria no mapa (`frontend/src/utils/game.js` → `CATEGORY_CONFIG`): Sincronia, Sabichão, Rabiscos, Gestos, Palavra Tabu, Caos, Conexão, Picante, Cena, Quanto me conheces?

### 1.5 Tom e língua (referência de estilo)

O que já funciona e deve ser o **norte de escrita**:

- PT-PT de mesa: *tu*, *gole*, *telemóvel*, *autocarro*, *fixe*, âncoras locais (MB Way, CP, IRS, Benfica, francesinha, São João, Piçarra).
- Uma ideia por carta, legível em voz alta (`COMO-ESCREVER-CARTAS.txt`).
- Humor de situação, não de insulto gratuito.
- Família limpa; Casal com consentimento explícito em várias cartas (`com consentimento`).

Problemas de língua já no live:

- Inconsistência **golo / gole**: JSON Beber usa «golo»; UI (`MiniGameModal.jsx`, `ChallengeCard.jsx`, ecrã de resultados) usa «gole». O guia de escrita pede «goles».
- Slip PT-BR em `data/couple/festa.json`: «em uma frase» → deveria ser «numa frase».
- Pack `legendas-br-pack.json` tem `pack: "br"` mas o conteúdo é PT-PT (o nome mente).
- `data/mememix/legendasamigos.json` está cheio de **nomes reais e inside jokes** (Jel, Pe, Brunex, Jo, Jorge, Guids, Bozen) e inclui «3 inalações de erva». Isto não é conteúdo de produto; é um pack privado que vazou para o repo.

### 1.6 Duração média (o que o código e o texto dizem)

| Superfície | Duração típica |
|---|---|
| Sincronia (fallback mapa) | 10 s (`MapGame.jsx` `fallbackChallenge`) |
| Gestos | 45 s |
| Rabiscos | 60 s |
| Casal `time_limit` | 30–60 s (8 cartas festa; uma com `0` = regra de 3 rondas) |
| Mini-jogo 10 Segundos | 10 s |
| Batalha | 30 s por lado |
| Mister White discussão | 90 s por defeito |
| Caos Amigos | 2–3 rondas, uma carta com `ongoing_rounds: 99` |
| Beber | a maior parte das cartas resolve em 10–20 s; história/cadeia/miniboss 20–40 s |

O ritmo da mesa é **rápido**. Cartas novas que peçam um discurso de 2 minutos vão partir o fluxo. Regras têm de arrancar em 10–20 segundos.

### 1.7 Forças

1. Identidade PT-PT verdadeira (não é tradução BR).
2. Arquitectura de packs + baralhos + `act` (curva da noite no Beber) é madura.
3. Impostor, Aliança, Maldição, Mini Boss, Momento Caos já existem como **sistemas**, não só como texto.
4. Família está sanitizada (zero álcool nos JSON).
5. Dois tipos de mesa bem comunicados na Home.
6. MemeMix com fotos do grupo é o modo mais «único» do produto.

### 1.8 Problemas (com evidência)

1. **Beber é um contador de golos com cartas à volta**, não um jogo. Ecrã final: «Quem bebeu mais» (`DrinkGame.jsx` ~linha 1252). `SIPS_WEIGHTS` em `game.js` inclui «copo inteiro» e «dobro p/ grupo». `parseCardPenalty` reconhece «toda a gente bebe o copo».
2. **Template fatigue** em telepatia, história, provável, preferias, legendas (ver secção 5).
3. **Dois Casais**: JSON em `data/couple/` vs array hardcoded `UNIQUE_CHALLENGES` — o jogador não sabe qual está a jogar.
4. **Mini-jogos Amigos** resolvem quase todos em «alguém bebe N goles» (`MiniGameModal.jsx`). Família não tem mini-jogos (`GameSetup.jsx` `hasMini: false`).
5. **MemeMix sem memes oficiais** (1 PNG de teste).
6. **Placeholders de nomes** documentados e subusados — a mesa sente-se genérica.
7. **Docs vs jogo**: `CONTEUDO-NOVO.md` e i18n Família (`translations.js`: «Cultura, desporto, música e cinema») não batem com as categorias reais.
8. **Roleta Beber** implementada e nunca renderizada.
9. **Agente Secreto** com UI completa, filtrado do baralho jogável.

---

## 2. Análise dos modos

### 2.1 Beber — `DrinkGame.jsx` + `data/drink/`

Fluxo: MesaNoite (2–15, géneros) → packs (Essencial, Noite Académica, Sem Filtros, Casais na Festa) → toggle de baralhos → `buildPlayableDrinkDeck()`.

Baralhos oficiais (`drinkBaralhos.js`): Waterfall & Beber, Eu Nunca, Regras, Caos, Especiais, Desafios, Poder & Sorte, Picante, Preferias?, Quem é mais provável?, Bluff, Maldição, História, Cadeia.

Sistemas já coded:

- Reader a rodar; substituição de tokens.
- Anti-spam: evitar 3× `beber` seguidas; equilibrar por `deckId`; curva `act` 1→3.
- Regras activas com duração (rondas / até ser substituída).
- Aliança (se um bebe, o parceiro bebe).
- Maldição atribuída a um jogador, passa/falha.
- Impostor + impostor fantasma se alguém saiu.
- Mini Boss (Vitória/Falha).
- Momento Caos (30% se a carta tiver bloco `caos`).
- Estatísticas: drinks, distributed, agentSuccess, rulesCreated, unlucky.

**Diagnóstico de design:** o software já pensa em estado de mesa. O **conteúdo** ainda pensa em «bebe N». ~141/230 cartas do Essencial mencionam «bebe N». Preferias: a regra é quase sempre «Minoria bebe 1». Provável: fecho idêntico «A pessoa com mais dedos apontados bebe 1 golo» (28× no base). História: 12/12 com o mesmo sufixo.

Álcool **é o objectivo da noite** no ecrã de resultados. Isto contradiz o produto que queremos: álcool só como consequência opcional, nunca «quem bebe mais».

### 2.2 Amigos — mapa, só mini-jogos, só desafios

Setup (`GameSetup.jsx` `FRIENDS_MODES`): mapa+categorias, só mini-jogos, só desafios. Equipas opcionais. Penalização: goles / penálti / ambos. Mini-jogos: Maior/Menor, Grupo, Espião, 10 Segundos, Batalha, Sync, Quem Sou Eu?

Mapa (`MapGame.jsx`): 30 casas em espiral. Casas especiais Amigos: duelo, shot, regra, roubo, protecção, impostor, caos.

Conteúdo JSON: 7 categorias. **Impostor existe nos JSON** (`friends/base.json`, `festa.json`) mas **não está no seletor de categorias do setup** (`MODE_CONFIG.friends.cats` não inclui `impostor`) — entra sobretudo por casa especial.

Tom: festa, Uber, discoteca, IRS, influencer. Caos ainda usa «bebe 1 golo» mesmo fora do Modo Beber.

### 2.3 Família

Mesma ossatura do mapa, sem Caos, sem mini-jogos, `penaltyType` forçado a `none`. Categorias: as 5 «seguras». Sabichão é trivia escolar (capitais, Lusíadas, Euro). Gestos/Rabiscos são fofos mas previsíveis. Pack base **muito fino** (23 cartas; Palavra Tabu só 1).

i18n descreve o modo com categorias que **não existem** no setup.

### 2.4 Casal

Dois produtos colados:

1. Packs JSON (Conexão / Picante / Verdade / Ação / Cena / Quiz) — bons, curtos, consentimento presente.
2. `CoupleGame.jsx`: intensidade pacífico/picante/hardcore; mapa; dados eróticos; `UNIQUE_CHALLENGES`; DailyScratch com posições; «kinky» locked.

O JSON `quiz` vs festa `casal_pergunta` é o mesmo contrato com nomes diferentes. Base tem **9 cartas** — insuficiente para uma noite. Hardcore vive sobretudo no código, não nos packs.

### 2.5 Cartas (CAH-like)

Online, mão de 7, czar escolhe. Pack `festa.json` é local, satírico, bem ancorado. Volume baixo (101). Falta profundidade de pretas (todas 1 blank) e packs temáticos reais (o lobby menciona `dark`/`geek`/`politica` — verificar se há JSON ou só UI).

### 2.6 MemeMix

O melhor modo «PartyMix» (fotos da sala + juiz + legendas). Legenda em pack (mão de 5, swap custa 1 ponto) ou escritas. **352 legendas vs 1 meme oficial.** Pack `amigos` é conteúdo privado.

### 2.7 Mister White / AldeiaMix

Dedução já coberta. Pairs PT-PT sólidos, mas 89 pares saturam noites repetidas. AldeiaMix é outro jogo, não um baralho — fora do foco de cartas, mas mostra que o produto já tem «noite/dia/voto». Não precisamos de mais um werewolf em Amigos.

---

## 3. Categorias

### 3.1 Mapa — o que o jogador escolhe vs o que o modelo permite

**No setup (o que conta):**

| ID | Label UI | Amigos | Família | Casal |
|---|---|---|---|---|
| telepatia | Sincronia | sim | sim | — |
| perguntas | Sabichão | sim | sim | — |
| desenho | Rabiscos | sim | sim | — |
| mimica | Gestos | sim | sim | — |
| proibido | Palavra Tabu | sim | sim | — |
| caos | Caos | sim | não | — |
| romantico | Conexão | — | — | sim |
| picante | Picante | — | — | sim |
| verdade | Verdade | — | — | sim |
| acao | Ação | — | — | sim |
| roleplay | Cena | — | — | sim |
| casal_pergunta | Quanto me conheces? | — | — | sim |

**No modelo, quase órfãs:** cultura, desporto, musica, cinema, palavra, consequencia, erotico, dados. `ChallengesOnly.jsx` ainda tem fallbacks para algumas destas — outro sítio com conteúdo paralelo.

### 3.2 Beber — baralhos vs types

O jogador escolhe **baralhos**. A carta tem **type** (cor + etiqueta). Docs dizem que história deve ser `type: "desafio"`; o live usa `type: "historia"`. Preferias: `type: "preferencia"`. Mistura baralho `poder` com types poder/sorte/azar.

Pack Essencial **não tem** baralho `picante` nem `extreme` (existem em premium / arquivo).

### 3.3 Categorias finas (prioridade de conteúdo, não de volume cego)

| Categoria | Problema |
|---|---|
| Família `proibido` base | 1 carta |
| Família `base` inteiro | 23 cartas — uma noite esgota |
| Casal `base` | 9 cartas |
| Amigos `caos` base | 2 cartas |
| Beber `bluff` base | 6 cartas — a mecânica mais rica, o baralho mais pobre |
| Beber `cadeia` base | 7 |
| Beber `comunidade` | 0 |
| MemeMix imagens | 1 |
| Mister `dificil` | 11 pares |

---

## 4. Mecânicas existentes

Inventário honesto (o que o jogador **já faz**):

| Mecânica | Onde | Qualidade do contrato |
|---|---|---|
| Palavra simultânea (2 jogadores) | Sincronia + mini Sync | Bom, mas temas repetem o mesmo wrapper |
| Trivia MCQ | Sabichão | Escolar; pouco «festa» |
| Desenhar | Rabiscos | Bom, prompts visuais fortes no festa |
| Mímica | Gestos | Bom |
| Tabu | Palavra Tabu | Bom, volume baixo |
| Regra temporária | Caos Amigos + Regras/Caos Beber | Forte — é o DNA da mesa |
| Impostor (pergunta certa/errada) | Casa especial + Especiais Beber | Forte e pouco usada no setup |
| Duelo 1v1 | Casa especial + desafios Beber (PPT) | Existe, pouco conteúdo dedicado |
| Apontar / most likely | Provável Beber | Excessivo e preguiçoso |
| Eu Nunca | Baralho próprio | Clássico; álcool como payload |
| Preferias A/B | PreferenciaCard | UI boa, regra sempre igual |
| Bluff + voto | 6–24 cartas conforme pack | Subexplorada |
| História palavra-a-palavra | historia | Template único |
| Cadeia de categoria | cadeia | Igual a «10 segundos» sem relógio |
| Poder / sorte / azar | baralho poder | Bom como meta-jogo |
| Aliança | especiais | Bom |
| Maldição que passa | maldicao | Excelente, pouco volume no base |
| Mini Boss cooperativo | especiais | Excelente — é jogo, não gole |
| Maior/Menor | mini-jogo | Puro azar + beber |
| Espião (palavra oculta) | mini-jogo, 5+ | Sobreposição com Mister White |
| 10 segundos | mini-jogo | Bom ritmo |
| Batalha debate | mini-jogo | Bom, temas médios |
| Quem Sou Eu (testa) | mini-jogo | Clássico |
| Czar + brancas | Cartas | Sólido |
| Legenda + juiz | MemeMix | Sólido |
| Dedução de palavra | Mister White | Sólido |
| Lobos | AldeiaMix | Sólido |
| Dados corpo×acção | Casal | Intimidade; cuidado com hardcore |
| Roleplay cena | Casal JSON | Bom |

**O que o jogador faz vezes demais:** beber, apontar, confessar, escolher alguém, «faz X ou bebe».

**O que o jogador quase não faz:** observar a sala, memorizar cadeia, imitar com critério, construir regra, apostar risco/recompensa sem copo, votar conteúdo (não pessoas), mentir com palco, criar juntos sem ser «1 palavra até falhar».

---

## 5. Mecânicas e cartas repetitivas

### 5.1 Templates que já saturaram

| Template | Evidência | Efeito na mesa |
|---|---|---|
| `Tema: … Dois jogadores dizem uma palavra ao mesmo tempo.` | 5/5 telepatia base; 8/8 festa Amigos; Família igual | Sincronia = sempre o mesmo ritual |
| `Desenha …` / `Representa …` | Quase 100% de Rabiscos/Gestos | OK como prefixo; o problema é o *tipo* de prompt (sempre «alguém a…») |
| `Palavra: X. …` + 5 forbidden | Todas as Tabu | Contrato bom; precisa de variantes (mímica tabu, desenho tabu, uma pista só) |
| `Quem é mais provável … mais dedos … bebe 1` | 28 no Essencial; 15 no Casais | A mesa aponta, bebe, esquece |
| `EU NUNCA … Quem já fez, bebe` | baralho inteiro | Confissão + copo, noite após noite |
| `Minoria bebe 1` | 17/17 preferias base; 36× no Sem Filtros | A escolha A/B é gira; o payoff é sempre copo |
| `À vez, cada jogador diz 1 palavra. Quem travar bebe 2` | 12/12 história Essencial | Uma mecânica, N temas — o tema não salva |
| `Quando` / `POV:` / `EU quando` / `A cara de` | 130+60+42+37 em 352 legendas (~76%) | Legendas soam ao mesmo meme |
| Mini-jogos → «🍺 X bebe N goles» | `MiniGameModal.jsx` | Família não pode usar; Amigos vira Beber disfarçado |

### 5.2 Sobreposição entre modos

- Sincronia (mapa) ≈ Sync (mini-jogo) ≈ telepatia.
- Espião (mini) ≈ Mister White.
- Cadeia Beber ≈ 10 Segundos ≈ Sabichão de lista.
- Impostor Beber ≈ Impostor mapa ≈ «quem é mais…» com mentira.
- Casal verdade ≈ Beber Eu Nunca relacional.
- Grupo mini-jogo inclui «dizer um segredo», «mensagem ao ex», «beber 2 goles» — o trio que este brief pede para **não** dominar.

### 5.3 Cartas que melhoram pouco a noite (não apagar agora; não clonar)

- Waterfall cujo único conteúdo é um atributo físico («quem tem tatuagens», «queixo», «notificações») + bebe N.
- Provável sexual explícito no pack base (ex. masturbação em público) — tom de Sem Filtros a vazar para Essencial.
- Legendas `amigos` com nomes reais.
- Trivia Família tipo «capital de Espanha» / «H2O» — correcto, mas zero humor de sala.

---

## 6. O que melhorar (sem acrescentar volume cego)

1. **Separar consequência de vitória.** Em Amigos/Beber, o ecrã deve celebrar regras criadas, boss vencidos, bluffs, sincronias — não «quem bebeu mais». Goles, se existirem, são skip opcional.
2. **Variar o contrato, não só o tema.** Uma Sincronia pode ser gesto, onomatopeia, ou «a mesma mentira». Uma História pode ser frase, veto, ou dois narradores rivais.
3. **Usar os nomes da mesa.** `reader` / `player3_a` já funcionam. O conteúdo ignora-os.
4. **Unificar Casal.** JSON packs devem alimentar o menu; `UNIQUE_CHALLENGES` não deve ser um segundo cânone.
5. **Mini-jogos sem copo, e mini-jogos para Família.** O mapa Família sem mini é um tabuleiro mais pobre, não um tabuleiro mais seguro.
6. **Beber: menos baralhos de «bebe se», mais baralhos de estado** (lei da casa, maldição, boss, bluff, observação).
7. **Legendas: formatos novos** (diálogo, SMS, instrução de palco, anti-POV).
8. **Corrigir língua:** golo→gole no conteúdo futuro; PT-BR slips; pack `br` a chamar-se outra coisa.
9. **Retirar de produto** (quando houver trabalho de conteúdo) o pack de legendas com nomes reais — não clonar esse tom.

---

## 7. O que está em falta

Pensado como designer, não como fábrica de cartas:

**Mecânicas em falta**

- Observação da sala (objectos, poses, quem mexeu).
- Memória de cadeia com inversão / eco.
- Associação de palavras com veto (não tabu clássico).
- Espectro / termómetro (adivinhar o grau, não o facto).
- Uma pista só, cooperativa (o grupo ganha ou perde junto).
- Imitação com juiz (não mímica de charada).
- Construção de história com restrição a mudar a cada turno.
- Lei da casa votada (a mesa escreve a regra).
- Risco/recompensa sem copo (apostar ponto, shield, vez extra).
- Sudden death criativo (última palavra, última pose).
- 1v1 com palco (não só PPT).
- Equipas no Beber (hoje a aliança é o único «nós»).
- Escolha de jogador com custo (não «escolhe alguém para beber»).

**Tipos de carta em falta**

- `observacao`, `memoria`, `espectro`, `lei`, `aposta`, `eco`, `imitacao` — ou, mais realista, **novos contratos dentro das categorias já seleccionáveis**, para não partir o setup.

**Modos que precisam de variedade, não de mais do mesmo**

- Beber Essencial: bluff, maldição, cadeia, história (variação de regras).
- Amigos: Caos que não seja «bebe»; Sincronia com 3+ contratos; Impostor no setup.
- Família: mini-jogos secos; Sabichão com humor local; Tabu.
- Casal: competição leve, memória a dois, escolhas (não só picante).
- MemeMix: formatos de legenda + imagens oficiais.

**Interacções e momentos cómicos em falta**

- Alguém fica com uma lei ridícula e o grupo esquece-se — depois lembra-se todos ao mesmo tempo.
- Dois jogadores a defender teses opostas sobre a mesma foto da sala.
- O grupo a reconstruir o que uma pessoa fez há 3 turnos.
- Um «boss» que a mesa perde porque falou demais.
- Casal a descobrir que não se lembram da mesma viagem.

Replayabilidade vem de **sistemas** (regras que nascem na mesa, nomes, fotos, votos) não de mais 200 «EU NUNCA».

---

## 8. Inspiração noutros jogos (mecânica, nunca conteúdo)

Não se copiam nomes comerciais para o produto, nem frases, nem listas oficiais. Abaixo: o que **funciona na cabeça humana**, e como o PartyMix pode ter um primo original.

| Nome (referência) | Como funciona | Porque funciona | Como adaptar ao PartyMix | Modo | Risco de repetição |
|---|---|---|---|---|---|
| Wavelength / termómetro | Alguém pensa num ponto duma escala; os outros adivinham o grau | Debate + empatia; não há resposta «certa» absoluta | Carta com eixo («frio ←→ ridículo»). Um jogador marca em segredo; a mesa aponta no ecrã | Amigos, Casal, Família | Baixo se os eixos forem situacionais |
| Just One / uma pista | Grupo dá pistas; pistas iguais anulam-se | Cooperação + tensão de originalidade | Palavra-alvo; cada um escreve 1 pista; duplicadas caem; um adivinha | Família, Amigos | Médio — precisa de dicionário grande |
| Codenames / grelha | Pista numérica liga palavras na mesa | Restrição gera criatividade | Mini-grelha 3×3 de palavras da festa; um dá pista | Amigos | Médio |
| Spyfall / local | Um não sabe o sítio; perguntas laterais | Dedução social curta | Já existe Espião/Mister; **não clonar outra vez** | — | Alto se repetirmos |
| Fibbage / mentira escrita | Inventar definição falsa credível | Mentir bem é palco | Carta: definição absurda duma «lei portuguesa inventada»; voto | Amigos, Beber | Baixo |
| Telestrations / telefone desenhado | Desenho → palpite → desenho | Degradação cómica | 4 jogadores, 3 passos, um telemóvel a circular | Amigos, Família | Baixo |
| Tabu | Palavras proibidas | Restrição verbal | Já existe; variantes (só gestos, só onomatopeias) | Amigos, Família | Médio |
| Dixit / interpretação | Imagem ambígua, voto na leitura | Poesia + farol | MemeMix já é isto com fotos reais — reforçar, não substituir | MemeMix | Baixo |
| Quiplash / respostas a voto | Duas legendas para o mesmo prompt | Competição criativa curta | Já é MemeMix; no mapa: prompt de 5 palavras + voto | Amigos | Médio se prompts fracos |
| The Mind / silêncio | Coordenar sem falar | Telepatia verdadeira | «Contar até 5 com palmas, sem marcar» / objectos da sala por ordem de tamanho | Amigos, Família | Baixo |
| Concept / ícones | Pistas abstractas | Criatividade constrangida | 3 emojis só para uma palavra | Amigos, Família | Médio |
| 5 Second Rule | Categoria relâmpago | Pânico engraçado | Já há 10 Segundos; falta **passagem obrigatória** (o que falhas, o da esquerda tenta) | Amigos, Família, Beber | Médio |
| Two rooms / persuasão | Vender uma ideia | Palco | Batalha já existe; falta «vende este objecto inútil da sala» | Amigos | Baixo |
| Poetry for Neanderthals | Só palavras de uma sílaba | Restrição linguística PT-PT | «Só palavras graves de uma sílaba» | Amigos, Família | Médio |
| Anomia / reacção | Símbolo igual → gritar categoria | Reflexo | Mini de ecrã: dois ícones, quem grita primeiro uma marca PT | Amigos, Família | Médio |
| Snake Oil | Combinar cartas para vender | Pitch cómico | 2 palavras aleatórias → vender à mesa em 15 s | Amigos, Casal | Baixo |
| Secret Hitler / facções | Equipas ocultas | Paranoia | AldeiaMix já cobre; Beber pode ter **facção visível** (Lei vs Caos) sem impostor extra | Beber | Alto se for outro werewolf |
| Jackbox Trivia Murder | Trivia com vida extra | Trivia deixa de ser exame | Sabichão com 2 vidas de equipa e «joker de público» | Família, Amigos | Médio |
| Boom / hot potato | Passar antes do timer | Tensão física | Categoria + telemóvel a circular | Família, Amigos | Médio |
| Catchphrase / palavra a passar | Descrever até o timer | Ritmo de grupo | Tabu + bomba de 20 s | Amigos | Médio |
| Werewolf | Noite/dia | Já temos AldeiaMix | Não adaptar outra vez | — | Muito alto |
| Kings Cup | Carta → regra fixa | Ritual de baralho | Beber já é isto; evoluir para **regras que a mesa escreve** | Beber | Alto se só for «A = bebe» |
| Never Have I Ever | Confissão colectiva | Bonding barato | Manter 1 baralho pequeno; não expandir | Beber | Muito alto |
| Most likely to | Apontar | Bonding barato e cruel | Congelar expansão; substituir por espectro/voto anónimo | Beber | Muito alto |

---

## 9. Novas mecânicas propostas

Cada ideia: scores /10. **Potencial de repetição** alto = mau (cansa). Não entram clones de «quem é mais / conta um segredo / escolhe alguém / faz X ou bebe».

### 9.1 Termómetro da Mesa

- **Tipo:** mini-jogo / carta especial · **Modo:** Amigos, Família, Casal · **Categoria:** nova casa ou Sincronia avançada · **Mecânica:** espectro
- Diversão 9 · Originalidade 8 · Replayabilidade 9 · Interacção 9 · Dificuldade 4 · Repetição 3
- **Porque deve entrar:** gera discussão, não confissão. Família consegue jogar. Casal descobre desvios («pensava que eras 8, marcaste 2»).
- **Porque é diferente:** ninguém ganha por beber nem por apontar a uma pessoa; ganha quem lê a mesa.

### 9.2 Uma Pista Só

- **Tipo:** desafio cooperativo · **Modo:** Família, Amigos · **Categoria:** Palavra / Sabichão invertido · **Mecânica:** pistas únicas
- 8 / 7 / 8 / 9 / 5 / 4
- **Porque deve entrar:** o grupo ganha junto — muda o tom competitivo do mapa.
- **Porque é diferente:** Tabu pune palavras; isto pune *pistas iguais*.

### 9.3 Olho de Lince

- **Tipo:** mini-jogo · **Modo:** Amigos, Família, Beber (consequência seca) · **Categoria:** observação · **Mecânica:** memória visual da sala
- 8 / 8 / 8 / 8 / 3 / 3
- **Porque deve entrar:** usa o sítio real (o que está em cima da mesa). Cada casa é um baralho novo.
- **Porque é diferente:** não há lista pré-escrita; a sala é o conteúdo.

### 9.4 Eco Invertido

- **Tipo:** cadeia · **Modo:** Amigos, Família, Beber · **Categoria:** memória · **Mecânica:** sequência que cresce e depois inverte
- 8 / 7 / 9 / 8 / 6 / 3
- **Porque deve entrar:** replay infinita; falhar é engraçado, não cruel.
- **Porque é diferente:** cadeia actual só testa vocabulário; esta testa memória social.

### 9.5 Lei da Casa

- **Tipo:** carta de estado · **Modo:** Beber, Amigos Caos · **Categoria:** regra escrita pela mesa · **Mecânica:** regra temporária votada
- 9 / 8 / 9 / 9 / 4 / 2
- **Porque deve entrar:** o melhor Caos já é isto; o conteúdo ainda traz a regra pronta. Dar a caneta à mesa.
- **Porque é diferente:** não é «durante 3 rondas quem rir bebe»; é «a mesa inventa a lei, o leitor só aplica».

### 9.6 Mentira com Palco (Bluff 2.0)

- **Tipo:** carta · **Modo:** Beber, Amigos · **Categoria:** bluff · **Mecânica:** tese absurda + 20 s + voto de actuação (não de verdade biográfica)
- 8 / 7 / 8 / 9 / 5 / 4
- **Porque deve entrar:** o baralho bluff actual pede factos da vida real — esgota e constrange. Palco não exige intimidade.
- **Porque é diferente:** não é «dois verdadeiros um falso sobre ti».

### 9.7 Facção visível: Lei vs Caos

- **Tipo:** meta-regra de sessão · **Modo:** Beber · **Categoria:** equipas · **Mecânica:** metade da mesa defende regras, metade tenta fazê-las falhar
- 8 / 9 / 8 / 9 / 5 / 4
- **Porque deve entrar:** dá objectivo ao Beber para além do copo. Usa regras activas que o código já guarda.
- **Porque é diferente:** não é impostor oculto (já temos); as facções são públicas.

### 9.8 Aposta Limpa

- **Tipo:** carta de risco · **Modo:** Amigos, Beber, Casal · **Categoria:** aposta · **Mecânica:** escolhes dificuldade; acertas = 2 pts / shield; falhas = perdes a vez (álcool só se o grupo tiver Beber ligado, 1 gole máx., skip permitido)
- 8 / 7 / 8 / 7 / 5 / 3
- **Porque deve entrar:** risco/recompensa sem «chug».
- **Porque é diferente:** o prémio não é distribuir golos.

### 9.9 Retrato Relâmpago

- **Tipo:** mini · **Modo:** Família, Amigos · **Categoria:** desenho em cadeia curta · **Mecânica:** 15 s desenho → passa → 10 s palpite
- 8 / 6 / 8 / 8 / 3 / 3
- **Porque deve entrar:** Telestrations cabem num telemóvel só, 3 passos, 40 s.
- **Porque é diferente:** Rabiscos actual é 60 s + «conseguiste?»; isto deforma o desenho.

### 9.10 Veto Criativo

- **Tipo:** carta · **Modo:** Amigos, Família, Casal · **Categoria:** criatividade · **Mecânica:** o parceiro/adversário veta 2 palavras antes de tu explicares um tema
- 7 / 7 / 8 / 8 / 4 / 3
- **Porque deve entrar:** Tabu invertido (quem veta joga também).
- **Porque é diferente:** as palavras proibidas nascem na mesa, não no JSON.

### 9.11 Sudden Death da Última Pose

- **Tipo:** eliminação leve · **Modo:** Amigos, Família · **Categoria:** imitação · **Mecânica:** o líder faz uma pose de 3 s; quem copiar mal sai da ronda; último de pé ganha
- 8 / 6 / 7 / 9 / 2 / 4
- **Porque deve entrar:** físico sem risco, foto mental, gargalhada.
- **Porque é diferente:** Gestos pede uma charada; isto pede precisão.

### 9.12 SMS da Festa (formato legenda)

- **Tipo:** legenda · **Modo:** MemeMix · **Categoria:** formato · **Mecânica:** a carta é um ecrã de mensagens (2–3 linhas)
- 8 / 8 / 8 / 6 / 3 / 3
- **Porque deve entrar:** quebra o monopólio Quando/POV.
- **Porque é diferente:** é palco de diálogo, não narração.

---

## 10. Novas cartas (exemplos originais PT-PT)

Estes textos são **propostas**, não estão nos JSON. Estilo alinhado com `friends/festa.json` e `COMO-ESCREVER-CARTAS.txt`: uma ideia, voz alta, tu.

Scores na ordem: Diversão / Originalidade / Replayabilidade / Interacção / Dificuldade / Repetição.

### 10.1 Amigos

**A1 — Sincronia por gesto**  
«Sem falar: os dois fazem o mesmo gesto de ‘cheguei atrasado à discoteca’. Se o grupo não reconhecer o mesmo filme mental, falham.»  
Sincronia · 8/8/8/8/3/3 · Entra porque o wrapper actual é só palavra. Diferente: corpo, não vocabulário.

**A2 — Sincronia por mentira combinada**  
«Têm 8 segundos de olho. Depois cada um diz, ao mesmo tempo, uma desculpa para não pagar a conta. Se rimarem de sentido (não de rima), passam.»  
Sincronia · 8/8/7/8/4/3

**A3 — Sabichão de sala**  
«Quantas cadeiras se vêem deste sofá sem se levantarem? O grupo discute 10 segundos. A resposta certa é a contagem em voz alta no fim.»  
perguntas · 7/8/8/8/2/2 · Trivia que usa o sítio. Diferente: não é capital de país.

**A4 — Rabiscos com veto**  
«O jogador à tua direita veta uma coisa que não podes desenhar (ex.: pessoas). Desenha ‘fila do multibanco no dia 25’ na mesma.»  
desenho · 8/7/8/8/4/3

**A5 — Gestos em eco**  
«Fazes o gesto. O da esquerda copia com um erro de propósito. O grupo tem de apontar o erro em 8 segundos.»  
mimica · 8/8/8/9/4/3

**A6 — Tabu de uma pista**  
«Palavra: ‘praxe’. Só podes dizer UMA frase. Se a equipa falhar, o próximo tenta com uma frase nova, sem repetir a tua.»  
proibido · 8/7/8/8/5/3

**A7 — Caos sem copo**  
«Lei: durante 3 casas, ninguém pode dizer ‘eu’. Quem disser perde a vez (ou 1 ponto).»  
caos · 8/6/8/8/3/3 · Substitui «quem disser nomes bebe».

**A8 — Impostor de gosto**  
Certa: «Qual é a pior ementa de casamento em Portugal?» / Errada: «Qual é o teu prato de conforto?»  
impostor · 8/7/8/9/3/4 · Continua o bom padrão dos pares festa, sem sexo.

### 10.2 Família

**F1 — Sincronia onomatopeia**  
«Tema: electrodomésticos. Os dois fazem o som, não a palavra.»  
8/8/8/8/2/2

**F2 — Sabichão local com humor**  
«Em que cidade portuguesa é tradição o São João com martelinhos? A) Lisboa B) Porto C) Coimbra D) Faro»  
Resposta: Porto. · 7/5/6/6/2/5 · Melhor que «capital de Espanha»; ainda assim trivia — não clonar 40.

**F3 — Rabiscos de memória familiar**  
«Desenha o almoço de domingo em casa dos avós — sem desenhar comida.»  
8/8/7/7/4/3

**F4 — Gestos de ofícios**  
«Representa alguém a tentar dobrar um mapa de papel no lugar de vento.»  
7/6/7/7/3/4

**F5 — Tabu ‘Pastel de nata’**  
Proibidas: pastel, nata, Belém, canela, Lisboa.  
7/5/7/8/3/4 · Família base só tem 1 tabu — este contrato é que está em falta, não a palavra em si.

**F6 — Uma Pista Só (carta)**  
«Palavra secreta: elétrico. Cada um da equipa diz uma pista. Pistas iguais anulam-se. Um adivinha.»  
8/7/8/9/4/3

### 10.3 Casal (pacifico → picante leve, nunca explícito)

**C1 — Memória a dois**  
«Os dois escrevem, sem mostrar, o primeiro filme que viram juntos. Se for o mesmo, ganham a casa. Se for diferente, leem os dois e riem.»  
casal_pergunta / memória · 8/7/8/9/2/3

**C2 — Competição doce**  
«60 segundos: cada um lista sítios onde ainda não foram juntos. Quem tiver a lista mais específica (rua, não ‘Espanha’) ganha o próximo desafio à escolha.»  
acao · 8/7/8/8/3/3

**C3 — Escolha**  
«Preferias: um fim-de-semana sem telemóvel ou um jantar em que só o outro escolhe a ementa? Defende em 20 segundos. Não há copo.»  
escolha · 8/6/8/8/3/3

**C4 — Conexão**  
«Mostra com as mãos, sem falar, como foi o teu dia. O outro narra. Depois confirma: acertou o tom?»  
romantico · 8/8/8/9/3/2

**C5 — Picante leve**  
«Sussurra um sítio desta casa onde ainda não se beijaram. Se já se beijaram em todo o lado, inventam um sítio ridículo (varanda dos vizinhos conta).»  
picante · 8/7/7/8/2/4 · Intimidade sem explícito.

**C6 — Cena**  
«Cena: estão os dois no mesmo comboio CP com 40 minutos de atraso. Um quer conversa; o outro quer fones. 45 segundos. Consentimento: só palco.»  
roleplay · 8/7/7/8/3/3

### 10.4 Beber (álcool = skip opcional, nunca o prémio)

Regra de escrita destas cartas: o **objectivo é cumprir / enganar / criar lei**. Quem recusa ou falha pode **passar a vez**, perder 1 ponto de mesa, ou — se a mesa ligou ‘goles opcionais’ — 1 gole. Proibido: copo inteiro, dobro para o grupo, «quem bebe mais», desafios perigosos, conduzir.

**B1 — Lei da Casa**  
title: «A mesa escreve»  
«Em 20 segundos o grupo inventa UMA lei ridícula e legal (nada de dor, nada de copos extra). Fica activa 3 rondas. Quem a partir perde a vez.»  
regra · 9/8/9/9/3/2

**B2 — Observação**  
«Fecha os olhos. O da direita muda UMA coisa visível (óculos, pulseira, sítio da cadeira). Adivinhas em 10 segundos. Acertas: escolhes a próxima carta. Falhas: perdes esta ronda.»  
desafio · 8/8/8/8/3/2

**B3 — Bluff palco**  
«Defende 20 segundos: ‘Em Portugal, a torrada é um prato de festa oficial.’ A mesa vota a actuação, não a verdade. Maioria convencida: ganhas imunidade à próxima lei. Senão: a lei aplica-se-te já.»  
bluff · 8/8/8/9/4/3

**B4 — Mini Boss cooperativo**  
«Em 20 segundos, a mesa tem de apontar 8 objectos nesta sala que comecem pela mesma letra. Letra = primeira do nome de {reader}. Conseguem: todos ganham shield 1. Falham: {reader} escreve uma lei de 1 ronda.»  
miniboss · 9/8/8/9/5/2

**B5 — Maldição de vocabulário**  
«Maldição: durante 4 rondas só podes falar em perguntas. Se afirmares, passas a maldição à esquerda e ficas mudo 1 carta (não se bebe).»  
maldicao · 8/7/8/8/4/3

**B6 — Cadeia invertida**  
«Tema: esta noite (o que já aconteceu). Cada um acrescenta um facto verdadeiro. À quinta, o grupo recita a lista ao contrário. Quem furar a ordem perde a vez.»  
cadeia/memória · 8/8/9/8/5/2

**B7 — Preferias com payoff de jogo**  
choices: «Nunca mais podes escolher a música» / «Nunca mais podes queixar-te do volume»  
text: «Minoria cumpre a escolha durante 3 rondas (lei). Empate: os dois lados cumprem metade do tempo.»  
preferencia · 8/7/8/8/3/3 · **Não** «Minoria bebe 1».

**B8 — Poder sem copo**  
«Poder: anulas UMA lei activa ou duplicas a duração duma lei que te favoreça.»  
poder · 8/6/8/7/3/3

**B9 — Aliança de palco**  
«Aliança com {player2}: nas próximas 3 cartas, só um de vocês fala. O outro faz de dobrador. Se falarem os dois na mesma carta, a aliança cai e perdem a vez os dois.»  
alliance · 8/8/8/9/4/2

**B10 — Impostor de regra**  
Certa: «Qual é a lei activa mais fácil de cumprir?» / Errada: «Qual é a lei que tu inventarias agora?»  
impostor · 8/8/8/9/4/3

---

## 11. Mini-jogos

Regras arrancam em 10–20 s. Consequência por defeito: **pontos / vez / lei**, nunca copo. Se a sessão Amigos tiver penalização «goles» ligada, o máximo é 1 gole e há sempre skip (penálti de sofá, perder a vez). Sem «quem bebe mais», sem chug, sem risco físico.

### 11.1 Termómetro da Mesa

- **Objectivo:** adivinhar onde o condutor marcou numa escala.
- **Jogadores:** 3–12 · **Duração:** 45–70 s
- **Regras:** o ecrã mostra um eixo (ex.: «isto é uma boa ideia ←→ isto é uma péssima ideia») e uma situação («levar tupperware para um casamento»). Um condutor marca 1–11 em segredo. A mesa discute 20 s e escolhe um número. Distância 0–1 = sucesso colectivo; 2–3 = meio; 4+ = falha do palpite, não humilhação.
- **Como ganhar:** palpite perto. Condutor ganha se a mesa ficar a 2–4 (leu o grupo sem ser óbvio).
- **Consequência:** pontos / o condutor escolhe o próximo eixo.
- **Modo:** Amigos, Família (eixos inocentes), Casal (eixos de casal).
- **Dificuldade:** fácil de explicar, média de ler pessoas · **Replayabilidade:** alta (eixos × situações).
- **Porque é divertido:** discute-se o mundo, não se aponta o amigo.

### 11.2 Uma Pista Só

- **Objectivo:** a mesa faz o adivinhador acertar sem pistas duplicadas.
- **Jogadores:** 4–10 · **Duração:** 40 s
- **Regras:** palavra secreta no ecrã (só a mesa vê, menos o adivinhador). Cada um diz 1 palavra-pista. Pistas iguais (ou a mesma raiz: gato/gatinho) anulam-se. Sobram as únicas. O adivinhador tem 1 tentativa.
- **Como ganhar:** acertar. Falhar = a palavra vai para o próximo adivinhador com 1 pista extra já visível.
- **Consequência:** +2 a todos se acertarem; senão, nada de copo — só a segunda ronda.
- **Modo:** Família, Amigos · **Dificuldade:** média · **Replayabilidade:** alta com dicionário PT-PT.
- **Porque é divertido:** o silêncio de duas pessoas que disseram a mesma pista.

### 11.3 Olho de Lince

- **Objectivo:** notar a alteração na sala.
- **Jogadores:** 3–12 · **Duração:** 30 s
- **Regras:** todos fecham os olhos 8 s. O jogador da vez muda uma coisa visível e legal (nada de esconder telemóveis dos outros, nada de objectos perigosos). A mesa abre os olhos e tem 15 s para um palpite colectivo.
- **Como ganhar:** nomear a mudança.
- **Consequência:** acertam → o ilusionista perde a vez extra que ia ganhar; falham → ele escolhe a próxima casa.
- **Modo:** Família, Amigos, Beber · **Dificuldade:** fácil · **Replayabilidade:** infinita (a sala muda).
- **Porque é divertido:** o conteúdo é o sofá de vocês.

### 11.4 Eco Invertido

- **Objectivo:** repetir a sequência e depois invertê-la.
- **Jogadores:** 3–10 · **Duração:** 60–90 s
- **Regras:** o primeiro diz uma palavra do tema (ex.: «marcas portuguesas»). Cada um acrescenta. Quando a cadeia chega a 5, o sentido inverte: têm de recitar do fim para o princípio.
- **Como ganhar:** fechar a inversão. Quem furar está fora desta bomba; o resto continua com a cadeia já feita.
- **Consequência:** último de pé +2; ou vitória colectiva se ninguém furar a inversão.
- **Modo:** Família, Amigos, Beber · **Dificuldade:** média-alta · **Replayabilidade:** alta.
- **Porque é divertido:** o cérebro pára de forma visível.

### 11.5 Vende Isto

- **Objectivo:** vender um objecto inútil da sala em 15 s.
- **Jogadores:** 3–12 (1v1 ou FFA) · **Duração:** 50 s
- **Regras:** o telemóvel propõe um objecto visível («esta colher», «este carregador»). Dois jogadores fazem pitch de 15 s. A mesa vota o pitch, não o objecto.
- **Como ganhar:** maioria.
- **Consequência:** vencedor escolhe o próximo vendedor; perdedor cumpre uma lei leve («falar como anúncio durante 1 casa»).
- **Modo:** Amigos, Casal (um vende uma viagem ao outro) · **Dificuldade:** fácil · **Replayabilidade:** alta.
- **Porque é divertido:** palco curto, sem confissão.

### 11.6 Contrário Obrigatório

- **Objectivo:** responder ao tema com o contrário óbvio, sem repetir.
- **Jogadores:** 3–12 · **Duração:** 40 s
- **Regras:** tema «coisas quentes». Cada um, sentido horário, diz uma coisa fria. Quem disser algo quente, repetir, ou travar 3 s, sai da bomba.
- **Como ganhar:** último de pé, ou 8 respostas limpas (vitória colectiva).
- **Consequência:** lei de 1 ronda para quem furar («responder sempre ‘depende’»).
- **Modo:** Família, Amigos · **Dificuldade:** fácil · **Replayabilidade:** média-alta.
- **Porque é divertido:** o cérebro quer a categoria certa e é obrigado a virar.

### 11.7 Cópia Fiel

- **Objectivo:** copiar a pose / tique do líder.
- **Jogadores:** 4–12 · **Duração:** 40 s
- **Regras:** líder faz um tique (coçar a sobrancelha, sorriso torto) 3 s. Os outros copiam. O grupo aponta o pior clone (voto rápido). Esse sai. Novo líder = o melhor clone.
- **Como ganhar:** último ou 3 rondas e conta de sobrevivência.
- **Consequência:** só eliminação da mini-ronda; no mapa, +1 ao vencedor.
- **Modo:** Família, Amigos · **Dificuldade:** fácil · **Replayabilidade:** alta.
- **Porque é divertido:** cara de mau actor.

### 11.8 Bomba de Categoria (passagem)

- **Objectivo:** nomear e passar o telemóvel antes dos 8 s.
- **Jogadores:** 4–12 · **Duração:** ~60 s até rebentar
- **Regras:** categoria no ecrã. Quem tem o telemóvel diz uma palavra nova e passa. Timer de 8 s a reiniciar a cada passe. Palavra repetida ou timer a zero = bomba (fora desta ronda). Sem corrida física, sem atirar o telemóvel — passar à mão.
- **Como ganhar:** sobreviver.
- **Consequência:** quem rebenta escolhe a próxima categoria (prémio irónico) e perde 1 ponto.
- **Modo:** Família, Amigos · **Dificuldade:** média · **Replayabilidade:** alta.
- **Porque é divertido:** 10 Segundos já existe mas é 1 jogador vs relógio; isto é o grupo vs relógio.

### 11.9 Duas Vozes, Uma História

- **Objectivo:** contar uma história em que os dois narradores se alternam palavra a palavra, mas um só pode ser optimista e o outro pessimista.
- **Jogadores:** 4–12 (2 no palco) · **Duração:** 45 s
- **Regras:** tema («o almoço de Natal»). A / B intercalam. A só diz coisas boas; B só complicações. 45 s. A mesa vota a história mais coerente, não o mais engraçado solto.
- **Como ganhar:** voto.
- **Consequência:** os dois do palco avançam 1 casa se a mesa rir de propósito (voto «coerente»); senão, dois novos narradores.
- **Modo:** Amigos, Família, Casal · **Dificuldade:** média · **Replayabilidade:** alta.
- **Porque é divertido:** conflito de tom, não de pessoas.

### 11.10 Duelo da Letra

- **Objectivo:** 1v1, mesma letra, mesma categoria, sem repetir.
- **Jogadores:** 2 no palco + mesa · **Duração:** 30 s
- **Regras:** letra + categoria («M — sopas portuguesas»). Alternam. Quem falhar perde. Mesa é juiz de validade.
- **Como ganhar:** o outro falha.
- **Consequência:** +1 ao vencedor; perdedor não bebe — escolhe os próximos duelistas.
- **Modo:** Amigos, Família, Beber · **Dificuldade:** média · **Replayabilidade:** alta.
- **Porque é divertido:** PPT já existe; isto testa cabeça, não sorte.

### 11.11 O Intruso da Lista

- **Objectivo:** achar a palavra que não pertence, com uma pista falsa no meio.
- **Jogadores:** 3–12 · **Duração:** 35 s
- **Regras:** o ecrã mostra 5 palavras (4 duma família, 1 intruso). Um jogador (o «isca») recebeu em segredo a ordem de defender o intruso. Debate 20 s. Voto no intruso.
- **Como ganhar:** mesa acerta o intruso; o isca ganha se o voto cair noutra.
- **Consequência:** pontos. Sem copo.
- **Modo:** Amigos, Família · **Dificuldade:** média · **Replayabilidade:** alta com listas PT-PT.
- **Porque é divertido:** impostor curto sem papel de noite inteira.

### 11.12 Relógio de Silêncio

- **Objectivo:** o grupo conta 15 segundos em silêncio absoluto, cada um a dizer um número quando quiser, sem sobrepor, até 15.
- **Jogadores:** 4–12 · **Duração:** 20–40 s
- **Regras:** ninguém aponta, ninguém faz sinal. Dois a falar ao mesmo tempo = reset. 3 resets = falha colectiva.
- **Como ganhar:** chegar a 15.
- **Consequência:** sucesso colectivo = todos +1 (raro e doce). Falha = a casa não conta.
- **Modo:** Amigos, Família · **Dificuldade:** alta · **Replayabilidade:** média (é um momento, não um baralho).
- **Porque é divertido:** telepatia verdadeira; o contrário da Sincronia falada.

### 11.13 Já existentes — o que mudar (não são cartas novas)

| Mini actual | Problema | Ajuste de design |
|---|---|---|
| Maior/Menor | Puro azar + «os outros bebem 3» | Meta 5, prémio = escolher próxima casa; falha = perde a vez |
| Grupo | Pool com segredo / ex / beber / flexões | Reescrever tarefas (observação, palco, categorias); zero «mensagem ao ex» |
| Espião | Clone curto do Mister White | Manter só se Mister não foi jogado nesta noite (flag de sessão) |
| 10 Segundos | Bom | Adicionar passagem (11.8) em vez de mais categorias |
| Batalha | Bom | Eixos mais PT-PT de sofá, menos «geração Z é preguiçosa» |
| Sync | Clone da Sincronia | Fundir ou fazer Sync = gesto/som |
| Quem Sou Eu | Lista de famosos mista (Rita Ora + Napoleon) | Packs: Portugal / desenhos animados / «pessoas desta mesa» (o grupo escreve 8 nomes no setup) |

---

## 12. Melhorias — Modo Beber

### 12.1 Princípio

O Modo Beber já tem software de **jogo** (regras activas, act, alianças, maldições, boss, caos). O conteúdo e o ecrã final ainda celebram o copo. Inverter:

- **Objectivo da noite:** leis cumpridas, boss vencidos, bluffs, alianças vivas, facção.
- **Álcool:** toggle no setup «Goles opcionais». Off = só vez/lei/pontos. On = falha pode ser 1 gole **ou** skip. Nunca copo inteiro, nunca dobro para o grupo, nunca ranking «quem bebeu mais».
- `SIPS_WEIGHTS` e `parseCardPenalty` («bebe o copo») são um risco de produto — a corrigir em trabalho futuro de código, não neste PR.

### 12.2 O que deixar de crescer

Eu Nunca, Provável, Waterfall de atributo físico, Preferias com «Minoria bebe 1». Há volume de mais.

### 12.3 O que crescer

1. **Lei da Casa** (a mesa escreve).  
2. **Bluff de palco** (não biografia).  
3. **Maldições** que passam sem copo.  
4. **Mini Boss** cooperativos da sala.  
5. **Observação / memória / 1v1 de letra**.  
6. **Facção visível Lei vs Caos** no fim da noite (quem partiu menos leis vs quem criou o melhor caos).  
7. **Placeholders de nomes** de verdade.  
8. **Momento Caos** como risco/recompensa («evoluis a lei pagando a tua vez»), não mais golos.

### 12.4 Ecrã de resultados proposto

Trocar «Quem bebeu mais» por: Arquitecto de Leis, Melhor Bluff, Escudo da Mesa, Caos Controlado, Aliança da Noite. Goles, se o toggle esteve on, são nota de rodapé, não título.

### 12.5 Segurança (obrigatório)

Proibido em qualquer carta futura: chug, corridas a beber, misturar condução, dor, humilhação sexual, «bebe por cada pessoa que já viste nua» como eixo de pack base. Picante de casais, se existir, fica no pack opt-in 18+ e mesmo aí o copo não é o desafio.

---

## 13. Melhorias — Modo Amigos

- Meter **Impostor no setup** (já há 17 pares nos JSON; o seletor ignora-os).
- Caos **sem beber** (perder vez / lei).
- Sincronia: 3 contratos (palavra, gesto, mentira combinada).
- Mini-jogos: Família-compatíveis e sem copo por defeito; Grupo reescrito.
- Casas especiais `shot` («Perdedor bebe 2 goles») devem ter gémeo seco (`duelo` já existe — o default deve ser o seco).
- Humor: manter MB Way, CP, IRS, discoteca — é a voz. Não clonar «Desenha a cara de quem viu a conta» (já existe em base e festa).
- Equipas: duelo de equipas merece cartas próprias, não o mesmo Sabichão com prefixo.

---

## 14. Melhorias — Modo Família

- **Ligar mini-jogos secos** (Termómetro, Uma Pista, Lince, Eco, Cópia Fiel, Relógio de Silêncio). `hasMini: false` empobrece o mapa.
- Encher Tabu e Sincronia do `base.json` (23 cartas não chegam).
- Sabichão: menos exame, mais Portugal quotidiano e disparates inofensivos («Qual destas NÃO é sopa portuguesa?»).
- Zero álcool, zero adulto, zero «ex», zero flexões. O mini Grupo actual é inapropriado aqui.
- i18n: deixar de anunciar «cultura, desporto, música e cinema» se essas categorias não estão no setup — ou criá-las de verdade como **filtros de tema** dentro de Sabichão/Gestos, não como 4 categorias fantasma.
- Multi-idade: cartas que um miúdo de 8 e um avô jogam ao mesmo nível (observação, gesto, espectro), não só trivia de escola.

---

## 15. Melhorias — Modo Casal

- **Uma fonte de verdade:** os packs JSON alimentam mapa, desafios e quiz. `UNIQUE_CHALLENGES` deve passar a ser seed, não cânone secreto.
- Pacifico precisa de **volume** (base tem 9). Competição leve, memória, escolhas, palco — não só massagens.
- Picante: manter consentimento; evitar explícito; o escape «ou bebe 2 goles de água» é honesto mas desnecessário — o escape deve ser «passar».
- «Quanto me conheces?» com `answer: "Resposta do parceiro"` não é quiz: é um prompt. Tratar como **adivinha e confirma**, com UI de certo/errado dada pelo parceiro (já o espírito, falta o ritual).
- Cenas: mais Portugal (CP, pastelaria, tasca, São João) e menos «bar de desconhecidos» genérico.
- Hardcore: se existir, pack opt-in separado, nunca no pacifico por engano.
- DailyScratch / dados: fora deste relatório de cartas, mas o menu promete mais do que os JSON entregam — alinhar expectativas.

---

## 16. Legendadas (MemeMix)

### 16.1 O que existe

352 legendas. Aberturas: Quando 130, EU/Eu quando 60, POV 42, A cara 37, A energia 18 — ~76% no mesmo molde. Média ~54 caracteres / ~11 palavras: bom comprimento de bolha.

O que já está no tom certo (referência, não para copiar):

- «Quando disseste «só mais um copo»» (`legendas-pack.json`)
- «EU quando o MB Way falha na fila»
- «POV: és o único sóbrio da mesa»
- Nostalgia Nokia/MSN — pack temático forte
- Trabalho «conforme falado» — específico e PT

O que falha:

- Pack `legendasamigos.json`: nomes reais, erva, inside jokes — **não é produto**.
- Pack `br` com conteúdo PT-PT.
- Quase zero formatos de diálogo / SMS / instrução.
- 1 imagem oficial.

### 16.2 Regras de escrita propostas

- Máx. ~80 caracteres, uma respiração.
- Preferir **cena** a **label**.
- Variar formato: SMS, didascália, anúncio, anti-POV («Ninguém pediu a minha opinião e mesmo assim»).
- Sem nomes de pessoas reais.
- Picante = innuendo, não explícito.

### 16.3 Legendas novas (originais PT-PT)

**Base / house-party**

1. «Eu a dizer ‘fico só um bocadinho’ com o casaco ainda vestido»  
2. «A notificação do MB Way a 2% de bateria»  
3. «Didascália: entra em cena o amigo que ia ‘passar a noite’»  
4. «— Dividimos? — Claro. (mente)»  
5. «O DJ a fingir que esta música foi pedida»  
6. «Eu a procurar o Uber no sítio errado da rua»  
7. «A fila do WC a negociar paz mundial»  
8. «SMS: ‘já estou a chegar’ (saiu de casa agora)»  
9. «O único que trouxe tupperware para a festa»  
10. «Nós a discutir o IRS como se fosse futebol»

**Nostalgia / trabalho**

11. «O som do Messenger a entrar — e tu a fingir que não viste»  
12. «Reunião às 17h55: crime de guerra corporativo»  
13. «‘Conforme falado no stand-up’ — ninguém se lembra do stand-up»  
14. «Eu a sorrir no Zoom com o microfone no sítio errado»

**Relacionamentos / picante leve**

15. «‘Estou quase’ — fase 1 de 7»  
16. «Nós a escolher restaurante como se fosse tratado de paz»  
17. «A mão a ir ao telemóvel no meio do filme (foi visto)»  
18. «‘Vem só ver um episódio’ — clássico da diplomacia»

**Anti-formato (para quebrar Quando/POV)**

19. «Instrução de palco: olha para o amigo que disse ‘última ronda’»  
20. «Anúncio: perdeu-se um casaco. Recompensa: nenhum julgamento.»  
21. «Lista do supermercado: gelo, gelo, gelo, arrependimento»  
22. «Tradução simultânea do ‘está tudo bem’»

Estas legendas complementam a foto; não descrevem o meme. Personalidade: ironia baixa, específica, portuguesa.

---

## 17. Top 20 ideias (as que devem entrar primeiro)

Critério: máxima variedade por unidade de conteúdo; cabe no software actual ou num mini-jogo; PT-PT; sem copo como objectivo.

| # | Ideia | Modo | Porquê no Top |
|---|---|---|---|
| 1 | Lei da Casa (mesa escreve a regra) | Beber, Amigos | Usa regras activas já coded; replay infinita |
| 2 | Termómetro da Mesa | Amigos, Família, Casal | Mecânica nova, segura, viciante |
| 3 | Ecrã de resultados Beber sem «quem bebeu mais» | Beber | Muda o produto de uma assentada |
| 4 | Toggle «Goles opcionais» + cap 1 + skip | Beber, Amigos | Segurança + alinhamento com o brief |
| 5 | Uma Pista Só | Família, Amigos | Cooperação que o mapa não tem |
| 6 | Olho de Lince | Família, Amigos, Beber | A sala é o pack |
| 7 | Eco Invertido | Todos os mapas + Beber | Memória social |
| 8 | Bluff de palco (não biografia) | Beber, Amigos | Salva o baralho mais rico e mais pobre |
| 9 | Mini Boss da sala + {reader} | Beber | Já há UI de boss |
| 10 | Impostor no setup Amigos | Amigos | Conteúdo já escrito, em falta no seletor |
| 11 | Mini-jogos secos na Família | Família | O mapa deixa de ser só trivia |
| 12 | Sincronia por gesto / mentira | Amigos, Família | Quebra o template «Tema:» |
| 13 | Preferias com payoff de lei | Beber | UI já existe; só muda o `text` futuro |
| 14 | Formatos de legenda SMS / didascália | MemeMix | 76% das legendas partilham 4 aberturas |
| 15 | Unificar Casal JSON vs UNIQUE_CHALLENGES | Casal | Uma noite, um cânone |
| 16 | Memória a dois (escrevem a mesma coisa) | Casal | Know-the-partner sem quiz falso |
| 17 | Facção visível Lei vs Caos | Beber | Objectivo de sessão |
| 18 | Vende Isto | Amigos | Palco 15 s, zero confissão |
| 19 | Intruso da Lista | Família, Amigos | Impostor de 35 s, sem werewolf |
| 20 | Placeholders de nomes no Beber | Beber | Sistema existe; conteúdo ignora-o |

Fora do Top 20 de propósito: mais Eu Nunca, mais Provável, mais «Quando…», mais trivia de capitais, mais Espião, mais «faz X ou bebe».

---

## 18. Prioridade 🔴🟡🟢

### 🔴 Fazer primeiro (muda a noite)

1. **Redefinir vitória do Beber** — resultados e copy sem ranking de copos; álcool como skip opcional. (`DrinkGame.jsx` fase `results`; `SIPS_WEIGHTS`; mini-jogos.)
2. **Lei da Casa + Mini Boss da sala + Bluff palco** — 15–25 cartas futuras, não 200. Encaixam em `regra` / `miniboss` / `bluff`.
3. **Termómetro + Uma Pista Só + Olho de Lince** — três minis que desbloqueiam Família e Amigos.
4. **Impostor visível no setup Amigos** — código de setup, o JSON já existe.
5. **Caos / Shot / mini-jogos sem copo por defeito.**
6. **Não expandir Provável / Eu Nunca / «Minoria bebe 1».**

### 🟡 Depois (replay e identidade)

7. Eco Invertido, Vende Isto, Intruso da Lista, Duelo da Letra.  
8. Sincronia com 3 contratos; Tabu Família.  
9. Legendas em formatos novos; reformular/omitir pack `amigos` privado.  
10. Unificar conteúdo Casal; memória a dois; escolhas sem copo.  
11. Usar `{reader}` / géneros nas cartas Beber novas.  
12. Preferias com leis em vez de golos (quando houver novo conteúdo).  
13. Facção Lei vs Caos como opção de sessão.  
14. Alinhar docs (`CONTEUDO-NOVO.md`, i18n Família) com o jogo real.

### 🟢 Mais tarde / só se sobrar fôlego

15. Imagens oficiais MemeMix.  
16. Relógio de Silêncio (momento, não baralho).  
17. Grelha tipo pistas numéricas (se o Termómetro colar).  
18. Packs Cartas temáticos originais (volume CAH ainda é baixo, mas não é o buraco da replay).  
19. Mais pares Mister `dificil` — só depois das minis de mapa.  
20. Agente Secreto: só regressa com UX de telemóvel por jogador, nunca no telemóvel partilhado.

### Não fazer

- Clonar Werewolf para o mapa.  
- Clonar Mister White no mini Espião em noites em que já se jogou Mister.  
- «Quem bebe mais», chug, copo inteiro, conduzir, dor, flexões como punição.  
- Copiar texto, nomes ou cartas de CAH, Jackbox, Undercover, Tabu comercial, etc.  
- Encher o CATALOGO-200 só para ter número.  
- Meter conteúdo de `legendasamigos.json` (nomes reais) como tom a seguir.

---

## Apêndice A — Contratos de carta (guia rápido para quem escrever depois)

| Contrato | Frase de arranque típica | Vitória | Falha |
|---|---|---|---|
| Sincronia palavra | «Tema: … Ao mesmo tempo.» | Coincidem | Vez / ponto |
| Sincronia gesto | «Sem falar, o mesmo gesto de…» | O grupo reconhece o mesmo | Vez |
| Tabu | «Palavra: … Sem dizer…» | Equipa acerta | Vez |
| Uma pista | «Pistas únicas. Iguais anulam.» | Adivinhador acerta | Segunda ronda |
| Lei | «A mesa inventa… dura N rondas.» | Cumprir | Perder vez |
| Bluff palco | «Defende 20 s: ‘…’. Votam a actuação.» | Maioria | A lei aplica-se-te |
| Observação | «Fecha os olhos. Muda uma coisa.» | Adivinhar a mudança | O ilusionista manda a próxima |
| Espectro | «Eixo: … Marca 1–11.» | Distância ≤1 | Debate, sem humilhação |
| Boss sala | «Em 20 s, 8 coisas desta sala…» | Shield colectivo | Lei de 1 ronda |
| Memória casal | «Escrevam os dois, sem mostrar…» | Igual = casa | Lêem e riem |

Álcool, se existir, entra **só na coluna Falha**, como alternativa a vez/lei, com skip. Nunca na coluna Vitória.

---

## Apêndice B — Ficheiros-âncora desta análise

- Conteúdo: `data/friends/*.json`, `data/family/*.json`, `data/couple/*.json`, `data/drink/*.json`, `data/cards/festa.json`, `data/mememix/*.json`, `data/mister/pares.json`
- Modelos: `backend/models/Challenge.js`, `Card.js`, `DrinkPack.js`
- UI: `ChallengeCard.jsx`, `MiniGameModal.jsx`, `DrinkGame.jsx`, `MapGame.jsx`, `CoupleGame.jsx`, `GameSetup.jsx`, `PreferenciaCard.jsx`, `ImpostorCard.jsx`
- Regras de escrita: `data/COMO-ESCREVER-CARTAS.txt`, `data/MODELOS-ESCREVER-CARTAS.json`
- Tom visual de modos: `frontend/src/theme/modes.js`
- Labels: `frontend/src/utils/game.js` (`CATEGORY_CONFIG`), `frontend/src/utils/drinkBaralhos.js`
- Penalizações: `frontend/src/utils/penalties.js`, `SIPS_WEIGHTS` em `game.js`

---

*Fim da análise. Próximo passo de conteúdo (noutro PR, se o produto avançar): implementar 🔴, sem tocar nos packs actuais até haver decisão explícita de reescrita.*
