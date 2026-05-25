# Conteúdo novo — resumo para revisão

Importar: `npm run seed:packs` (local e produção).

## Packs novos (`festa`)

| Ficheiro | Modo | Itens |
|----------|------|-------|
| `friends/festa.json` | Amigos | 73 desafios (8 telepatia, 15 perguntas, 12 desenho, 12 mímica, 8 tabu, 6 caos, 12 impostor) |
| `family/festa.json` | Família | 55 desafios |
| `couple/festa.json` | Casal | 48 desafios |
| `cards/festa.json` | Cartas (BD) | 45 brancas + 25 pretas |

No jogo: no setup escolhe pack **`festa`** (Amigos/Família/Casal).

## Packs `base` expandidos

| Ficheiro | Antes → Agora (aprox.) |
|----------|------------------------|
| `friends/base.json` | 18 → **36** |
| `family/base.json` | 14 → **23** |
| `couple/base.json` | 6 → **9** |
| `cards/base.json` | 4 → **30** cartas |

## Modo Beber (`drink/decks.json`)

- Baralho **Especiais**: +6 Agentes (com `publicText` + `secretMission`), +4 Impostor, +2 Aliança/Espelho, +3 Mini Boss
- Baralho **Extremo**: 6 cartas (estava vazio)
- Total baralhos beber: **~111** cartas

## Modo Cartas (multijogador)

- Novo pack **🎉 Festa Extra** em `CardsGame.jsx` (lê `data/cards/festa.json`)
- Por defeito selecionado: `base` + `festa` + `dark`

## Casal (código)

- +8 desafios em `CoupleGame.jsx` (`UNIQUE_CHALLENGES`)

## Como testar

1. `npm run seed:packs`
2. Amigos → setup → pack **festa** ou **base**
3. Beber → ativa baralho **Especiais** e **Extremo**
4. Cartas → criar sala → packs **Festa Extra** + outros
