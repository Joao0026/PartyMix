# Como criar packs de conteúdo (passo a passo)

Este guia explica **como adicionar cartas e desafios** ao PartyMix sem mexer no código React.

---

## O que é um “pack”?

Um **pack** é um conjunto de frases/desafios com um nome (ex.: `base`, `festa-2026`, `picante`).

- Guardas num ficheiro `.json` em `data/`
- Importas para a base de dados
- No jogo escolhes **só esse pack** no setup

Não precisas de “criar o pack” noutro sítio: o nome no JSON (`"pack": "festa-2026"`) cria a etiqueta automaticamente.

---

## Passo 1 — Escolhe o tipo de conteúdo

| Queres adicionar… | Modo no JSON | Ficheiro de exemplo |
|-------------------|--------------|---------------------|
| Cartas brancas/pretas (estilo CAH) | `"mode": "cards"` | `_exemplo/pack-cartas.json` |
| Desafios mapa Amigos/Família | `"mode": "friends"` ou `"family"` | `_exemplo/pack-amigos.json` |
| Desafios Casal | `"mode": "couple"` | `couple/base.json` |
| Cartas Modo Beber (baralhos) | `"mode": "drink"` + `"decks"` | `drink/decks.json` |
| Impostor (2 perguntas) | secção `"impostor"` | dentro de friends/drink |

---

## Passo 2 — Cria o ficheiro JSON

Copia `_exemplo/pack-amigos.json` ou `pack-cartas.json` e muda:

- `"name"` — nome bonito para ti
- `"pack"` — ID curto (sem espaços), ex. `minha-festa`
- `"mode"` — `friends`, `family`, `couple`, `drink`, `cards`

---

## Passo 3 — Importa para a base de dados

Com o backend configurado (`.env` com MongoDB):

```bash
# Um ficheiro
npm run import:pack -- ../data/amigos/minha-festa.json

# Todos os JSON em data/ de uma vez
npm run seed:packs
```

Repetidos (mesmo texto) são **ignorados** — podes correr outra vez sem duplicar.

---

## Passo 4 — Joga com esse pack

1. Abre o jogo (Amigos, Família, Casal ou Beber)
2. No setup aparece **Pack de conteúdo** — escolhe `minha-festa` (ou o ID que puseste)
3. Só saem cartas/desafios desse pack

**Modo Beber:** o pack escolhido carrega os **baralhos** de `data/drink/decks.json` (ou outro ficheiro drink com `"decks"` e o mesmo `"pack"`).

---

## Formato A — Desafios (Amigos / Família / Casal / extras Beber)

```json
{
  "name": "Amigos - Festa",
  "pack": "festa",
  "mode": "friends",
  "categories": {
    "perguntas": [
      {
        "text": "Que país ganhou o Euro 2016?",
        "answer": "Portugal",
        "choices": ["França", "Portugal", "Espanha", "Alemanha"]
      }
    ],
    "mimica": [
      { "text": "Representa alguém a pedir comida às 3 da manhã." }
    ],
    "impostor": [
      {
        "correctQuestion": "Quem é o mais organizado?",
        "wrongQuestion": "Quem é o mais medricas?"
      }
    ]
  }
}
```

**Tipos úteis em `categories`:** `telepatia`, `perguntas`, `desenho`, `mimica`, `proibido`, `caos`, `impostor`, `romantico`, `picante`, …

---

## Formato B — Cartas Modo Beber (baralhos)

Ficheiro à parte, com **categorias jogáveis** (Waterfall, Eu Nunca, …):

```json
{
  "name": "Beber - Baralhos",
  "pack": "base",
  "mode": "drink",
  "decks": {
    "waterfall": {
      "label": "🌊 Waterfall & Beber",
      "desc": "Quem bebe, bebe muito",
      "premium": false,
      "cards": [
        {
          "type": "beber",
          "emoji": "🍺",
          "title": "Bebe 2!",
          "text": "O mais alto bebe 2 goles."
        }
      ]
    }
  }
}
```

**Tipos de carta:** `beber`, `regra`, `desafio`, `poder`, `sorte`, `azar`, `caos`, `alliance`, `mirror`, `miniboss`

**Dica:** Se escreveres `bebe 3` ou `distribui 2` no texto, o Modo Beber **regista goles automaticamente** no contador.

---

## Formato C — Cartas brancas/pretas

```json
{
  "name": "Cartas - Festa",
  "pack": "festa",
  "mode": "cards",
  "white": ["Uma desculpa que ninguém acreditou"],
  "black": ["A festa acabou quando alguém trouxe ___."]
}
```

---

## Passo 5 — Admin (opcional)

Em `/admin` → **Packs** vês a lista e podes **exportar JSON** de um pack que já está na BD (útil para backup ou editar).

**Importar** também podes colar JSON em Admin → Importar.

---

## Resumo rápido

```
Criar JSON em data/  →  npm run seed:packs  →  Escolher pack no setup  →  Jogar
```

Dúvidas: vê os ficheiros reais em `data/friends/base.json`, `data/drink/decks.json` e os exemplos em `data/_exemplo/`.
