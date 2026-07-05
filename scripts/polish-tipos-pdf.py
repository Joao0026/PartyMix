# -*- coding: utf-8 -*-
"""Melhora frases na secção de reformulação do COMO-ESCREVER-CARTAS.txt"""
import re
from pathlib import Path

MODELOS = Path(__file__).resolve().parents[1] / "data" / "MODELOS-ESCREVER-CARTAS.json"

WHITES = [
    "Uma desculpa que ninguém acreditou",
    "O amigo que desaparece quando chega a conta",
    "O comboio da CP com 40 minutos de atraso",
    "Um pedido de Glovo às 3 da manhã",
    "A música do Piçarra num casamento",
    "O Wi-Fi que falha no pior momento",
    "Um tio bêbado a contar a mesma história",
    "A fila do multibanco no dia 25",
    "Pastéis de Belém à meia-noite",
    "O grupo da família no WhatsApp",
    "Uma multa por estacionar mal",
    "O chefe a mandar mensagem ao domingo",
    "Um gin tónico a 12 euros",
    "A reunião que podia ser um email",
    "O autocarro cheio depois do jogo",
    "Um brinde com copo de plástico",
    "A selfie com flash na festa",
    "O IRS a pedir documentos outra vez",
    "Uma prenda de amigo secreto ridícula",
    "O ex que apareceu nas notificações",
    "MB Way a falhar no pior momento",
    "A avó no grupo a mandar bom dia",
    "Um Uber que chega ao fim oposto",
    "A francesinha a pingar molho",
    "O Benfica em modo sofrimento",
    "Uma ressaca de domingo à tarde",
    "O ginásio em janeiro cheio",
    "Um Tinder com foto de 2016",
    "A casa de banho da discoteca",
    "O amigo que pede «só mais uma»",
    "Uma prenda do amigo secreto",
    "O autocarro sem ar condicionado",
    "Pastel de nata ainda quente",
    "O grupo a dividir a conta",
    "Uma mensagem de voz de 4 minutos",
    "O elétrico 28 cheio de turistas",
    "A fila da discoteca à chuva",
    "Um brinde com água a fingir que é gin",
    "O chefe no Zoom com câmara desligada",
    "A sopa da avó a curar tudo",
    "Um cartão do metro perdido",
    "O Porto em noite de jogo",
    "Uma selfie com filtro demasiado",
    "O IRS em abril",
    "Um amigo que nunca traz dinheiro",
    "A playlist de casamento",
    "O Wi-Fi da festa com password «1234»",
    "Uma promessa de «já vou a caminho»",
    "O copo que se parte na mão",
    "A conta do restaurante",
]

BLACKS = [
    "A festa acabou quando alguém trouxe ___.",
    "O segredo para sobreviver a segunda-feira é ___.",
    "O novo plano do governo passa por ___.",
    "Na próxima eleição prometem ___.",
    "O grupo ficou em silêncio quando surgiu ___.",
    "A ressaca é 100% culpa de ___.",
    "O casamento quase cancelou por ___.",
    "O Benfica perdeu porque ___.",
    "A avó perguntou sobre ___.",
    "O pior date de Tinder envolve ___.",
    "O autocarro atrasou por causa de ___.",
    "A reunião de família discutiu ___.",
    "O Santo António abençoou ___.",
    "O São João no Porto cheirava a ___.",
    "O IRS pediu provas de ___.",
    "O grupo do WhatsApp explodiu por ___.",
    "A francesinha tinha demasiado ___.",
    "O elétrico 28 estava cheio de ___.",
    "O pastel de Belém veio com ___.",
    "A festa de finalistas acabou em ___.",
    "O jantar de Natal foi salvo por ___.",
    "O amigo secreto ofereceu ___.",
    "A despedida de solteiro incluiu ___.",
    "O chefe mandou email sobre ___.",
    "A segunda-feira começou com ___.",
    "O gin tónico sabia a ___.",
    "A viagem de Uber virou ___.",
    "O jogo da festa parou por ___.",
    "A foto do Instagram esconde ___.",
    "O fim de mês chegou com ___.",
    "A prenda de aniversário foi ___.",
    "O ex voltou por causa de ___.",
    "A discoteca fechou por ___.",
    "O churrasco acabou em ___.",
    "A praia em agosto tinha ___.",
    "O teste na escola falhou por ___.",
    "A novela da TV girou em torno de ___.",
    "O amigo desapareceu quando viu ___.",
    "A conta do jantar incluía ___.",
    "O brinde foi interrompido por ___.",
    "A ressaca moral veio de ___.",
    "O grupo perdeu porque ___.",
    "A viagem de Erasmus começou com ___.",
    "O padel acabou em ___.",
    "A fila do multibanco cheirava a ___.",
    "O teletrabalho foi salvo por ___.",
    "A festa de anos tinha tema ___.",
    "O amigo pediu emprestado ___.",
    "A noite acabou com ___.",
    "O Portugal ganhou graças a ___.",
]

MISTER_FIX = {
    "verão|inverno": ("verão", "outono"),
    "noite|dia": ("noite", "madrugada"),
    "sol|lua": ("sol", "lâmpada"),
    "fogo|água": ("fogo", "fumaça"),
    "vermelho|azul": ("vermelho", "bordeaux"),
    "amor|amizade": ("amor", "carinho"),
    "comida|bebida": ("comida", "petisco"),
    "som|silêncio": ("som", "ruído"),
    "rápido|lento": ("rápido", "veloz"),
    "alto|baixo": ("alto", "grande"),
    "pequeno|grande": ("pequeno", "médio"),
    "frio|gelo": ("frio", "neve"),
    "avião|carro": ("avião", "helicóptero"),
    "gato|cão": ("gato", "gato malhado"),
    "café|energia": ("café", "cappuccino"),
    "praia|mar": ("praia", "costa"),
    "luz|sombra": ("luz", "lâmpada"),
    "dinheiro|riqueza": ("dinheiro", "notas"),
    "água|bebida": ("água", "sumo"),
    "família|amigos": ("família", "parentes"),
    "cão|gato": ("cão", "cachorro"),
    "fruta|vegetal": ("fruta", "legumes"),
}

AGENT_TEMPLATES = [
    ("Missão pública: pede à mesa um brinde em conjunto.", "Missão secreta: faz alguém dizer «comboio» sem pedires diretamente."),
    ("Missão pública: todos contam o que comeram ao pequeno-almoço.", "Missão secreta: faz alguém bater palmas antes do próximo turno."),
    ("Missão pública: elogia a roupa de alguém à tua escolha.", "Missão secreta: faz alguém dizer um número acima de 10."),
    ("Missão pública: propõe um tema de conversa para 2 minutos.", "Missão secreta: faz alguém mencionar futebol."),
    ("Missão pública: pede uma história embaraçosa de infância.", "Missão secreta: faz alguém tocar no copo."),
    ("Missão pública: convence alguém a fazer uma pose ridícula.", "Missão secreta: faz alguém dizer «honestamente»."),
    ("Missão pública: organiza uma contagem decrescente em voz alta.", "Missão secreta: faz alguém perguntar «onde estás?»."),
    ("Missão pública: todos dizem a última série que viram.", "Missão secreta: faz alguém dizer «pastel» ou «nata»."),
    ("Missão pública: escolhe quem começa o próximo desafio.", "Missão secreta: faz alguém levantar-se sem razão aparente."),
    ("Missão pública: pede um elogio sincero a alguém da mesa.", "Missão secreta: faz alguém dizer «MB Way» ou «multibanco»."),
    ("Missão pública: propõe um jogo de mãos na mesa.", "Missão secreta: faz alguém dizer «gole» ou «beber»."),
    ("Missão pública: todos dizem a última música que ouviram.", "Missão secreta: faz alguém cantarolar sem pedires."),
    ("Missão pública: pede para alguém contar uma anedota.", "Missão secreta: faz alguém dizer o teu nome."),
    ("Missão pública: organiza um brinde falso (sem beber).", "Missão secreta: faz dois jogadores brindarem ao mesmo tempo."),
    ("Missão pública: pergunta quem chegou mais tarde.", "Missão secreta: faz alguém confessar que se perdeu a caminho."),
    ("Missão pública: pede opinião sobre o melhor petisco.", "Missão secreta: faz alguém dizer «francesinha» ou «prego»."),
    ("Missão pública: todos imitam o último gesto que fizeste.", "Missão secreta: faz alguém repetir o teu gesto sem notar."),
    ("Missão pública: escolhe quem conta a próxima história.", "Missão secreta: faz alguém interromper a história a meio."),
    ("Missão pública: propõe foto de grupo.", "Missão secreta: faz alguém dizer «flash» ou «selfie»."),
    ("Missão pública: pede previsão para o jogo.", "Missão secreta: faz alguém apostar num resultado errado."),
    ("Missão pública: todos dizem uma palavra sobre a festa.", "Missão secreta: faz alguém dizer «caos» ou «regra»."),
    ("Missão pública: pede para trocar de lugar com alguém.", "Missão secreta: faz alguém mudar de lugar sem te pedires."),
    ("Missão pública: organiza votação sobre melhor música.", "Missão secreta: faz alguém defender uma música que odeia."),
    ("Missão pública: pede um cumprimento criativo.", "Missão secreta: faz alguém dar um high-five."),
    ("Missão pública: todos fecham os olhos 5 segundos.", "Missão secreta: faz alguém abrir os olhos antes do tempo."),
]

INSTR_TELEPATIA = " Dois jogadores dizem uma palavra ao mesmo tempo."


def split_sections(body_part: str) -> list[str]:
    """Divide secção 12 em blocos por cabeçalho MODO / MISTER WHITE."""
    parts = re.split(r"\n-{80}\n(?=(?:MODO |MISTER WHITE))", body_part)
    return parts


def merge_impostor_lines(lines: list[str]) -> list[str]:
    out = []
    i = 0
    while i < len(lines):
        line = lines[i]
        m = re.match(r"^(\d{3})\. \[ \] REFORMULAR: (.+)$", line)
        if not m:
            out.append(line)
            i += 1
            continue
        num, body = m.group(1), m.group(2).strip()
        if body.startswith("correctQuestion:"):
            full = body
            j = i + 1
            while j < len(lines):
                m2 = re.match(r"^(\d{3})\. \[ \] REFORMULAR: (.+)$", lines[j])
                if not m2:
                    break
                b2 = m2.group(2).strip()
                if b2.startswith("correctQuestion:"):
                    break
                if (
                    re.match(r"^[a-záéíóúãõç\"»«?»“”]+", b2, re.I)
                    or b2.endswith("?")
                    or len(b2) < 55
                ):
                    full += " " + b2
                    j += 1
                else:
                    break
            out.append(f"{num}. [ ] REFORMULAR: {full}")
            i = j
        elif re.match(r"^[a-záéíóúãõç\"»«?»“”]+", body, re.I) and len(body) < 55:
            i += 1
        else:
            out.append(line)
            i += 1
    return out


def split_quiz_line(body: str) -> list[str]:
    """Separa várias perguntas coladas na mesma linha."""
    pattern = r" \| (facil|medio|dificil) (?=(?:Qual|Quem|Quantos|Quantas|Qual é))"
    matches = list(re.finditer(pattern, body))
    if not matches:
        return [body]
    out = []
    start = 0
    for m in matches:
        chunk = body[start : m.start()].strip()
        if chunk:
            out.append(f"{chunk} | {m.group(1)}")
        start = m.end()
    last = body[start:].strip()
    if last:
        out.append(last)
    return out


def merge_broken_quiz_lines(lines: list[str]) -> list[str]:
    """Funde linhas partidas (ex.: answer: vazio + linha seguinte)."""
    merged = []
    i = 0
    while i < len(lines):
        m = re.match(r"^(\d{3})\. \[ \] REFORMULAR: (.+)$", lines[i])
        if not m:
            i += 1
            continue
        body = m.group(2)
        if re.search(r"\| answer:\s*$", body) or body.rstrip().endswith("| answer:"):
            if i + 1 < len(lines):
                m2 = re.match(r"^(\d{3})\. \[ \] REFORMULAR: (.+)$", lines[i + 1])
                if m2:
                    body = body.rstrip() + " " + m2.group(2)
                    i += 1
        merged.append(body)
        i += 1
    return merged


def polish_telepatia(body: str) -> str:
    if not body.lower().startswith("tema:"):
        body = "Tema: " + body.lstrip("Tema:").strip()
    b = body
    b = re.sub(r"\bodeiam\b", "odes", b, flags=re.I)
    b = re.sub(r"\bgostavam\b", "gostarias", b, flags=re.I)
    b = re.sub(r"\bcomeriam\b", "comerias", b, flags=re.I)
    b = re.sub(r"\bfazem\b", "fazes", b, flags=re.I)
    b = re.sub(r"\bIrritante\b", "irritante", b)
    b = re.sub(r"\bObjeto\b", "objeto", b)
    instr = INSTR_TELEPATIA.strip()
    if instr not in b:
        b = b.rstrip(".") + "." + INSTR_TELEPATIA
    else:
        b = re.sub(
            r"([^\.\?!])\s+(Dois jogadores dizem uma palavra)",
            r"\1. \2",
            b,
        )
    return b


def polish_mimica(body: str) -> str:
    if body.startswith("Fingir que estás"):
        return "Representa" + body[16:]
    if body.startswith("Fingir que"):
        return "Representa" + body[10:]
    if body.startswith("Fingir "):
        return "Representa " + body[7:]
    return body


def polish_desenho(body: str) -> str:
    if not body.lower().startswith("desenha"):
        if body[0].isupper():
            return "Desenha: " + body[0].lower() + body[1:]
    return body


def polish_beber(body: str) -> str:
    body = re.sub(r"\s+,", ",", body)
    body = re.sub(r"bebe\s+,", "bebe,", body)
    body = re.sub(r"\s+\.", ".", body)
    fixes = {
        "Quem olhar para o teto bebe 1 gole": "Quem olhar para o teto durante 10 segundos bebe 1 gole",
        "Quem disser «ok» bebe 1 gole": "Quem disser «ok» ou «okay» bebe 1 gole",
        "Quem disser «literalmente» bebe 1 gole": "Quem disser «literalmente» ou «tipo» bebe 1 gole",
        "Se um beber , o outro bebe metade": "Se um beber, o outro bebe metade",
        "Se um falhar , o outro faz o mesmo desafio": "Se um falhar, o outro faz o mesmo desafio",
        "Se um rir , o outro bebe": "Se um rir, o outro bebe",
    }
    for a, b in fixes.items():
        if body.strip() == a:
            return b
    return body


def polish_caos(body: str) -> str:
    if not body.lower().startswith("regra:"):
        body = "Regra: " + body[0].lower() + body[1:] if body else body
    if "ronda" not in body.lower() and "rondas" not in body.lower():
        body = body.rstrip(".") + " (3 rondas)."
    return body.replace("Regra: regra:", "Regra:")


def polish_impostor_pair(body: str) -> str:
    replacements = {
        "Quem aqui confias menos?": "Quem chega sempre atrasado?",
        "Quem é o mais falso?": "Quem faz a pior imitação de alguém famoso?",
        "Quem mentiu hoje?": "Quem dormiu menos de 5 horas?",
        "Quem manipula mais?": "Quem explica piadas demasiado tempo?",
        "Quem confiares menos?": "Quem perde as chaves com mais frequência?",
        "Quem confias menos?": "Quem chega sempre atrasado?",
        "«Quem confias menos?»": "«Quem chega sempre atrasado?»",
        '"Quem confias menos?"': '"Quem chega sempre atrasado?"',
        "Quem é o impostor?": "Quem seria o primeiro expulso de um reality?",
        "Já traíste confiança aqui?": "Quem já fingiu estar doente para faltar?",
        "Quem eliminarias do jogo?": "Quem demora mais tempo no telemóvel?",
        "Quem venceria se fosse impostor?": "Quem seria o melhor a esconder um segredo?",
    }
    for a, b in replacements.items():
        body = body.replace(a, b)
    return body


def polish_proibido(body: str) -> str:
    return re.sub(r"\s+,", ",", body)


def polish_casal_romantico(body: str) -> str:
    body = body.replace("inventada para o futuro", "que gostarias de viver")
    body = body.replace("memória inventada feliz", "memória feliz que gostarias de criar")
    return body


def fix_mister_pair(civil: str, under: str, idx: int) -> tuple[str, str]:
    key = f"{civil.lower()}|{under.lower()}"
    if key in MISTER_FIX:
        return MISTER_FIX[key]
    bad_under = {
        "dia", "inverno", "lua", "água", "azul", "amizade", "bebida",
        "silêncio", "lento", "grande", "gelo", "carro", "cão", "energia", "mar",
        "sombra",
    }
    if under.lower() in bad_under:
        pairs = list(MISTER_FIX.values())
        return pairs[idx % len(pairs)]
    return civil, under


def process_section(lines: list[str], section_key: str) -> list[str]:
    if section_key == "white":
        return [f"{i:03d}. [ ] REFORMULAR: {w}" for i, w in enumerate(WHITES, 1)]

    if section_key == "black":
        return [f"{i:03d}. [ ] REFORMULAR: {b}" for i, b in enumerate(BLACKS, 1)]

    if section_key == "agent":
        out = []
        for i in range(1, 51):
            pub, sec = AGENT_TEMPLATES[(i - 1) % len(AGENT_TEMPLATES)]
            out.append(f"{i:03d}. [ ] REFORMULAR: publicText: {pub} | secretMission: {sec}")
        return out

    if section_key == "mister":
        out = []
        idx = 0
        for line in lines:
            m = re.match(
                r"^\d{3}\. \[ \] REFORMULAR: Palavra civil: (.+?) \| Undercover: (.+?) \| Mr White:.*$",
                line,
            )
            if not m:
                continue
            civil, under = fix_mister_pair(m.group(1).strip(), m.group(2).strip(), idx)
            idx += 1
            out.append(
                f"{idx:03d}. [ ] REFORMULAR: Palavra civil: {civil} | Undercover: {under} | Mr White: sem palavra"
            )
        return out[:50]

    if section_key == "perguntas":
        raw = merge_broken_quiz_lines(lines)
        expanded = []
        for body in raw:
            expanded.extend(split_quiz_line(body))
        out = []
        for i, body in enumerate(expanded, 1):
            if not re.search(r"\| (facil|medio|dificil)\s*$", body):
                body = body.rstrip() + " | medio"
            out.append(f"{i:03d}. [ ] REFORMULAR: {body}")
        return out

    out = []
    for line in lines:
        m = re.match(r"^(\d{3})\. \[ \] REFORMULAR: (.+)$", line)
        if not m:
            continue
        num, body = m.group(1), m.group(2)

        if "ORIGINAL" in body or "BOSS / IMPOSTOR" in body:
            continue

        if section_key == "telepatia":
            body = polish_telepatia(body)
        elif section_key == "mimica":
            body = polish_mimica(body)
        elif section_key == "desenho":
            body = polish_desenho(body)
        elif section_key == "proibido":
            body = polish_proibido(body)
        elif section_key == "caos":
            body = polish_caos(body)
        elif section_key in ("beber", "desafio", "regra", "poder", "sorte", "azar", "caos_beber", "alliance", "mirror"):
            body = polish_beber(body)
        elif section_key in ("impostor", "impostor_beber"):
            body = polish_impostor_pair(body)
        elif section_key == "miniboss" and "Falha coletiva" in body:
            body = "Mesa inteira: desafio em 20 segundos — se falharem, todos bebem 2 goles; se ganharem, todos distribuem 2."
        elif section_key == "romantico":
            body = polish_casal_romantico(body)

        out.append(f"{num}. [ ] REFORMULAR: {body}")

    if section_key in ("impostor", "impostor_beber"):
        out = merge_impostor_lines(out)

    return out


def detect_section_key(title: str) -> str | None:
    t = title.upper()
    if "MISTER WHITE" in t or "MISTER —" in t:
        return "mister"
    if "IMPOSTOR_BEBER" in t or ("BEBER" in t and "IMPOSTOR" in t):
        return "impostor_beber"
    if "CAOS_BEBER" in t or ("BEBER" in t and "CAOS" in t and "AMIGOS" not in t):
        return "caos_beber"
    mapping = [
        ("TELEPATIA", "telepatia"),
        ("PERGUNTAS", "perguntas"),
        ("DESENHO", "desenho"),
        ("MIMICA", "mimica"),
        ("MÍMICA", "mimica"),
        ("PROIBIDO", "proibido"),
        ("IMPOSTOR_BEBER", "impostor_beber"),
        ("CAOS_BEBER", "caos_beber"),
        ("IMPOSTOR", "impostor"),
        ("AGENT", "agent"),
        ("ALLIANCE", "alliance"),
        ("MIRROR", "mirror"),
        ("MINIBOSS", "miniboss"),
        ("DESAFIO", "desafio"),
        ("REGRA", "regra"),
        ("PODER", "poder"),
        ("SORTE", "sorte"),
        ("AZAR", "azar"),
        ("BEBER", "beber"),
        ("WHITE", "white"),
        ("BLACK", "black"),
        ("ROMANTICO", "romantico"),
        ("ROMÂNTICO", "romantico"),
        ("PICANTE", "picante"),
        ("VERDADE", "verdade"),
        ("ACAO", "acao"),
        ("AÇÃO", "acao"),
        ("ROLEPLAY", "roleplay"),
        ("CASAL_PERGUNTA", "casal_pergunta"),
    ]
    for pat, key in mapping:
        if pat in t:
            if key == "caos" and "BEBER" in t:
                return "caos_beber"
            if key == "impostor" and "BEBER" in t:
                return "impostor_beber"
            if key == "caos" and "AMIGOS" in t:
                return "caos"
            return key
    return None


def main():
    text = TIPOS.read_text(encoding="utf-8")
    if "12. CONTEÚDO DO PDF" not in text:
        print("Secção 12 não encontrada")
        return

    head, rest = text.split("12. CONTEÚDO DO PDF", 1)
    rest = "12. CONTEÚDO DO PDF" + rest

    footer_m = re.search(r"\n={80}\nTotal itens", rest)
    if footer_m:
        body_part = rest[: footer_m.start()]
        footer = rest[footer_m.start() :]
    else:
        body_part = rest
        footer = ""

    sections = split_sections(body_part)
    if len(sections) < 2:
        print(f"Abort: secções não encontradas (got {len(sections)}). Ficheiro intacto.")
        return

    new_sections = [sections[0]]
    total = 0
    casal_blocks = 0

    for block in sections[1:]:
        if not block.strip():
            continue
        lines = block.split("\n")
        title = next((ln for ln in lines if ln.startswith("MODO ") or ln.startswith("MISTER WHITE")), "")

        if "CASAL" in title.upper() and "BLOCO PDF 2" in title.upper():
            new_sections.append(
                block.split("\n")[0]
                + "\n[DUPLICADO DO BLOCO 1 — podes apagar se não precisares]\n"
                + "\n".join(block.split("\n")[1:])
            )
            continue

        key = detect_section_key(title)
        item_lines = [ln for ln in lines if re.match(r"^\d{3}\. \[ \]", ln)]

        if key:
            new_items = process_section(item_lines, key)
        else:
            new_items = item_lines

        header_lines = []
        for ln in lines:
            if re.match(r"^\d{3}\. \[ \]", ln):
                break
            header_lines.append(ln)

        if "CASAL" in title.upper():
            casal_blocks += 1

        new_block = "\n".join(header_lines) + "\n" + "\n".join(new_items) + "\n"
        new_sections.append(new_block)
        total += len(new_items)

    new_body = new_sections[0]
    for block in new_sections[1:]:
        new_body += "\n--------------------------------------------------------------------------------\n" + block.lstrip("\n")

    footer = re.sub(
        r"Total itens do PDF listados: \d+",
        f"Total itens do PDF listados: {total}",
        footer,
    )

    note = (
        "Nota (revisão automática v2): telepatia com instrução; perguntas partidas; "
        "cartas white/black estilo CAH; agent com publicText|secretMission; "
        "mister white com pares parecidos; impostor com linhas fundidas; lixo PDF removido.\n"
    )
    if "revisão automática v2" not in head and "12. CONTEÚDO DO PDF" in head:
        head = head.replace(
            "Origem: Pack Jogo Ptpt Amigos.pdf",
            note + "Origem: Pack Jogo Ptpt Amigos.pdf",
        )

    TIPOS.write_text(head + new_body + footer, encoding="utf-8")
    print(f"Polished. Sections: {len(new_sections)-1}, items: {total}, casal blocks: {casal_blocks}")


if __name__ == "__main__":
    main()
