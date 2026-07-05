# -*- coding: utf-8 -*-
"""Extrai PDF para secção de reformulação em COMO-ESCREVER-CARTAS.txt"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PDF_TXT = ROOT / "data" / "_pdf_extract.txt"
MODELOS = ROOT / "data" / "MODELOS-ESCREVER-CARTAS.json"
FORMAT_END_MARKER = "================================================================================\n11. PROMPT PARA CLAUDE"

FORMAT_HINTS = {
    "telepatia": 'JSON: { "text": "Tema: ... Dois jogadores dizem uma palavra ao mesmo tempo." }',
    "perguntas": "JSON: text, answer, choices[4], difficulty (facil|medio|dificil)",
    "desenho": 'JSON: { "text": "Desenha ..." }',
    "mimica": 'JSON: { "text": "Representa ..." }',
    "proibido": 'JSON: text + forbiddenWords[5] — ex.: Palavra: X | proibidas: a, b, c, d, e',
    "caos": "JSON: text, is_ongoing: true, ongoing_rounds, ongoing_instruction",
    "impostor": 'JSON: correctQuestion + wrongQuestion (sem text)',
    "beber": 'JSON: type "beber", emoji, title, text',
    "desafio": 'JSON: type "desafio", emoji, title, text',
    "regra": 'JSON: type "regra", emoji, title, text',
    "poder": 'JSON: type "poder", emoji, title, text',
    "sorte": 'JSON: type "sorte", emoji, title, text',
    "azar": 'JSON: type "azar", emoji, title, text',
    "caos_beber": 'JSON: type "caos", emoji, title, text',
    "agent": 'JSON: type "agent", emoji, title, publicText, secretMission',
    "alliance": 'JSON: type "alliance", emoji, title, text',
    "mirror": 'JSON: type "mirror", emoji, title, text',
    "miniboss": 'JSON: type "miniboss", emoji, title, text',
    "impostor_beber": 'JSON: type "impostor", emoji, title, correctQuestion, wrongQuestion',
    "white": 'JSON: string no array "white" (resposta curta)',
    "black": 'JSON: string no array "black" (frase com ___)',
    "mister": "Par: civil | undercover | Mr White",
    "romantico": 'JSON: { "text": "..." }',
    "picante": 'JSON: { "text": "..." }',
    "verdade": 'JSON: { "text": "..." }',
    "acao": 'JSON: { "text": "...", "time_limit": segundos opcional }',
    "roleplay": 'JSON: { "text": "Cena: ..." }',
    "quiz": 'JSON: { "text": "...", "answer": "Resposta do parceiro" }',
    "casal_pergunta": 'JSON: { "text": "...", "answer": "Resposta do parceiro" }',
}

SECTION_RE = re.compile(
    r"^(MODO\s+.+|TELEPATIA\s*\(|MÍMICA\s*\(|MIMICA\s*\(|PERGUNTAS\s*\(|DESENHO\s*\(|"
    r"PROIBIDO\s*\(|CAOS\s*\(|IMPOSTOR\s*\(|BEBER\s*\(|DESAFIO\s*\(|REGRA\s*\(|PODER\s*\(|"
    r"SORTE\s*\(|AZAR\s*\(|AGENT\s*★|ALLIANCE\s*★|MIRROR\s*★|MINIBOSS\s*★|"
    r"WHITE\s*\(|BLACK\s*\(|ROMÂNTICO\s*\(|ROMANTICO\s*\(|PICANTE\s*\(|VERDADE\s*\(|"
    r"AÇÃO\s*\(|ACAO\s*\(|ROLEPLAY\s*\(|CASAL_PERGUNTA\s*\(|MISTER\s+WHITE)",
    re.I,
)

NOISE_RE = [
    re.compile(r"^\d+\.?\s*$"),
    re.compile(r"^--\s*\d+\s+of\s+\d+\s*--$", re.I),
    re.compile(r"^PT\s*ORIGINAL", re.I),
    re.compile(r"^PARTE\s+\d+", re.I),
    re.compile(r"^ESPECIAIS\s*★", re.I),
    re.compile(r"^AGENTE\s+SECRETO", re.I),
]


def norm_cat(header: str, mode: str) -> str:
    h = header.upper()
    if "TELEPATIA" in h:
        return "telepatia"
    if "PERGUNTAS" in h:
        return "perguntas"
    if "DESENHO" in h:
        return "desenho"
    if "MÍMICA" in h or "MIMICA" in h:
        return "mimica"
    if "PROIBIDO" in h:
        return "proibido"
    if "CAOS" in h and mode == "beber":
        return "caos_beber"
    if "CAOS" in h:
        return "caos"
    if "IMPOSTOR" in h and mode == "beber":
        return "impostor_beber"
    if "IMPOSTOR" in h:
        return "impostor"
    if "BEBER" in h:
        return "beber"
    if "DESAFIO" in h:
        return "desafio"
    if "REGRA" in h:
        return "regra"
    if "PODER" in h:
        return "poder"
    if "SORTE" in h:
        return "sorte"
    if "AZAR" in h:
        return "azar"
    if "AGENT" in h:
        return "agent"
    if "ALLIANCE" in h:
        return "alliance"
    if "MIRROR" in h:
        return "mirror"
    if "MINIBOSS" in h:
        return "miniboss"
    if "WHITE" in h:
        return "white"
    if "BLACK" in h:
        return "black"
    if "ROMÂNTICO" in h or "ROMANTICO" in h:
        return "romantico"
    if "PICANTE" in h:
        return "picante"
    if "VERDADE" in h:
        return "verdade"
    if "AÇÃO" in h or "ACAO" in h:
        return "acao"
    if "ROLEPLAY" in h:
        return "roleplay"
    if "CASAL_PERGUNTA" in h:
        return "casal_pergunta"
    if "MISTER" in h:
        return "mister"
    return "outro"


def norm_mode(line: str) -> str | None:
    u = line.upper()
    if "MODO AMIGOS" in u or "PACK EXTRA" in u and "AMIGOS" in u:
        return "amigos"
    if "MODO FAMÍLIA" in u or "MODO FAMILIA" in u:
        return "familia"
    if "MODO BEBER" in u:
        return "beber"
    if "MODO CARTAS" in u:
        return "cartas"
    if "MISTER WHITE" in u:
        return "mister_white"
    if "MODO CASAL" in u:
        return "casal"
    return None


def is_noise(line: str) -> bool:
    s = line.strip()
    if not s:
        return True
    if re.match(r"^=+$", s):
        return True
    if "PACK" in s and "PT-" in s and len(s) < 40:
        return True
    if len(s) <= 3 and s.isdigit():
        return True
    for rx in NOISE_RE:
        if rx.match(s):
            return True
    if re.match(r"^\d+$", s):
        return True
    return False


def parse_pdf(lines: list[str]) -> list[dict]:
    mode = "amigos"
    cat = "telepatia"
    casal_block = 0
    items: list[dict] = []
    buf: list[str] = []

    def flush():
        nonlocal buf
        if not buf:
            return
        text = " ".join(buf).strip()
        buf = []
        if not text or is_noise(text):
            return
        if len(text) < 3:
            return
        items.append({"mode": mode, "cat": cat, "casal_block": casal_block, "raw": text})

    for raw in lines:
        line = raw.strip()
        if not line:
            flush()
            continue

        m_mode = norm_mode(line)
        if m_mode:
            flush()
            if m_mode == "casal":
                casal_block += 1
            mode = m_mode if m_mode != "mister_white" else "mister_white"
            if m_mode == "mister_white":
                cat = "mister"
            continue

        if re.match(r"^IMPOSTOR\s*★", line, re.I):
            flush()
            cat = "impostor_beber" if mode == "beber" else "impostor"
            continue

        if SECTION_RE.match(line):
            flush()
            nc = norm_cat(line, mode)
            if nc != "outro":
                cat = nc
            continue

        if is_noise(line):
            continue

        # continuação de linha partida no PDF (ex.: "aqui?" após wrongQuestion)
        if buf and re.match(r"^[a-záéíóúãõç?\"»«]+", line) and len(line) < 60:
            buf.append(line)
            continue

        if "correctQuestion:" in line:
            flush()
            items.append({"mode": mode, "cat": cat, "casal_block": casal_block, "raw": line})
            continue

        if line.endswith("|") or (buf and not line[0].isupper() and len(line) < 80):
            buf.append(line)
        elif buf and (line.startswith("Tema:") or line.startswith("Palavra") or line.startswith("Fingir")):
            flush()
            buf.append(line)
        else:
            if buf and (
                line.startswith("Tema:")
                or line.startswith("Qual ")
                or line.startswith("Quem ")
                or line.startswith("Cena:")
                or line.startswith("Diz ")
                or line.startswith("Palavra")
                or line.startswith("Fingir")
                or line.startswith("correctQuestion")
                or re.match(r"^[A-Z]", line)
            ):
                flush()
            buf.append(line)

    flush()
    return items


def group_items(items: list[dict]) -> dict:
    groups: dict = {}
    for it in items:
        key = (it["mode"], it["cat"], it["casal_block"] if it["mode"] == "casal" else 0)
        groups.setdefault(key, []).append(it["raw"])
    return groups


def build_reform_section(groups: dict) -> str:
    out = []
    out.append("")
    out.append("=" * 80)
    out.append("12. CONTEÚDO DO PDF — PARA REFORMULAR (rascunho)")
    out.append("=" * 80)
    out.append("")
    out.append("Origem: Pack Jogo Ptpt Amigos.pdf")
    out.append("Instruções:")
    out.append("  - Edita o texto em REFORMULAR; mantém o formato JSON indicado.")
    out.append("  - Marca [OK] quando estiver pronto para importar.")
    out.append("  - Telepatia: acrescenta instrução «Dois jogadores dizem uma palavra ao mesmo tempo.»")
    out.append("  - Agent: divide em publicText + secretMission (não uses só uma frase).")
    out.append("  - Cartas white/black: se parecer carta de beber/poder, reescreve como resposta/frase com ___.")
    out.append("  - Casal aparece 2x no PDF — revê duplicados.")
    out.append("")

    mode_labels = {
        "amigos": "MODO AMIGOS",
        "familia": "MODO FAMÍLIA",
        "beber": "MODO BEBER",
        "cartas": "MODO CARTAS",
        "mister_white": "MISTER WHITE",
        "casal": "MODO CASAL",
    }

    order = [
        ("amigos", "telepatia", 0),
        ("amigos", "perguntas", 0),
        ("amigos", "desenho", 0),
        ("amigos", "mimica", 0),
        ("amigos", "proibido", 0),
        ("amigos", "caos", 0),
        ("amigos", "impostor", 0),
        ("familia", "telepatia", 0),
        ("familia", "perguntas", 0),
        ("familia", "desenho", 0),
        ("familia", "mimica", 0),
        ("beber", "beber", 0),
        ("beber", "desafio", 0),
        ("beber", "regra", 0),
        ("beber", "poder", 0),
        ("beber", "sorte", 0),
        ("beber", "azar", 0),
        ("beber", "caos_beber", 0),
        ("beber", "agent", 0),
        ("beber", "alliance", 0),
        ("beber", "mirror", 0),
        ("beber", "miniboss", 0),
        ("beber", "impostor_beber", 0),
        ("beber", "impostor", 0),
        ("cartas", "white", 0),
        ("cartas", "black", 0),
        ("mister_white", "mister", 0),
        ("casal", "romantico", 1),
        ("casal", "picante", 1),
        ("casal", "verdade", 1),
        ("casal", "acao", 1),
        ("casal", "roleplay", 1),
        ("casal", "casal_pergunta", 1),
        ("casal", "romantico", 2),
        ("casal", "picante", 2),
        ("casal", "verdade", 2),
        ("casal", "acao", 2),
        ("casal", "roleplay", 2),
        ("casal", "casal_pergunta", 2),
    ]

    seen_keys = set()
    for mode, cat, block in order:
        key = (mode, cat, block)
        if key not in groups:
            continue
        seen_keys.add(key)
        lines = groups[key]
        hint = FORMAT_HINTS.get(cat, "")
        label = mode_labels.get(mode, mode)
        if mode == "casal" and block:
            label += f" (bloco PDF {block})"
        out.append("-" * 80)
        out.append(f"{label} — {cat.upper()} ({len(lines)} itens)")
        out.append(f"Formato alvo: {hint}")
        out.append("-" * 80)
        out.append("")
        for i, raw in enumerate(lines, 1):
            out.append(f"{i:03d}. [ ] REFORMULAR: {raw}")
        out.append("")

    # any leftover groups
    for key, lines in sorted(groups.items()):
        if key in seen_keys:
            continue
        mode, cat, block = key
        hint = FORMAT_HINTS.get(cat, "")
        out.append("-" * 80)
        out.append(f"{mode} — {cat} ({len(lines)} itens)")
        out.append(f"Formato alvo: {hint}")
        out.append("-" * 80)
        for i, raw in enumerate(lines, 1):
            out.append(f"{i:03d}. [ ] REFORMULAR: {raw}")
        out.append("")

    total = sum(len(v) for v in groups.values())
    out.append("=" * 80)
    out.append(f"Total itens do PDF listados: {total}")
    out.append("=" * 80)
    return "\n".join(out)


def main():
    text = PDF_TXT.read_text(encoding="utf-8")
    lines = text.splitlines()
    items = parse_pdf(lines)
    groups = group_items(items)

    tipos = TIPOS.read_text(encoding="utf-8")
    reform = build_reform_section(groups)

    SECTION_11 = """
================================================================================
11. PROMPT PARA CLAUDE (gerar conteúdo — NÃO copiar texto de outros jogos)
================================================================================
Copia abaixo. Pede JSON só quando pedires "gera o JSON".

--- INÍCIO DO PROMPT ---

Estou a criar o PartyMix (app de jogos de festa, PT-PT, Portugal).
Gera conteúdo 100% ORIGINAL. Não copies texto de CAH, Taboo, Kings Cup, etc.

Regras:
- Usa "goles" (não "shots")
- Respeita os formatos JSON exactos das secções 1–10 deste ficheiro
- Família: tom leve, sem álcool explícito
- Casal picante: consensual, leve, nada explícito
- Cartas white = respostas curtas engraçadas; black = frases com ___

Gera [N] ideias para [SECÇÃO]. Só JSON se eu disser "gera o JSON".

--- FIM DO PROMPT ---

""".strip()

    FOOTER = """
================================================================================
Fim do documento — PartyMix
================================================================================
""".strip()

    if "12. CONTEÚDO DO PDF" in tipos:
        tipos = re.split(r"\n={80}\n12\. CONTEÚDO DO PDF", tipos)[0].rstrip()
    tipos = re.sub(r"\n={80}\n11\. PROMPT[\s\S]*?--- FIM DO PROMPT ---\s*", "\n", tipos)
    tipos = tipos.rstrip() + "\n\n" + SECTION_11 + "\n\n" + reform + "\n\n" + FOOTER + "\n"

    TIPOS.write_text(tipos, encoding="utf-8")
    print(f"Items: {sum(len(v) for v in groups.values())}")
    print(f"Written: {TIPOS}")
    print(f"Size: {TIPOS.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()
