"""Inyecta los .md del plan dentro de arbol.html.

El arbol se abre como archivo local, y fetch() de .md esta bloqueado en file://,
asi que el contenido viaja embebido. Se corre despues de editar cualquier .md:

    python plan-captura/build-arbol.py
"""
import io, json, re, pathlib

HERE = pathlib.Path(__file__).parent
TPL = HERE / "arbol.html"

GRUPOS = {
    "00": "Panorama", "01": "Tramos", "02": "Tramos", "03": "Tramos",
    "04": "Tramos", "05": "Tramos", "06": "Transversal", "07": "Transversal",
    "08": "Transversal",
}

def titulo(md: str, fallback: str) -> str:
    m = re.search(r"^#\s+(.+)$", md, re.M)
    return m.group(1).strip() if m else fallback

def main() -> None:
    docs = []
    for p in sorted(HERE.glob("*.md")):
        n = p.name[:2]
        body = io.open(p, encoding="utf-8").read()
        docs.append({
            "file": p.name,
            "n": n,
            "group": GRUPOS.get(n, "Otros"),
            "title": titulo(body, p.stem),
            "body": body,
        })

    html = io.open(TPL, encoding="utf-8").read()
    data = json.dumps(docs, ensure_ascii=False).replace("</", "<\\/")
    nuevo = re.sub(
        r'(<script id="DATA" type="application/json">).*?(</script>)',
        lambda m: m.group(1) + data + m.group(2),
        html, flags=re.S,
    )
    io.open(TPL, "w", encoding="utf-8").write(nuevo)
    print(f"arbol.html actualizado con {len(docs)} documentos")

if __name__ == "__main__":
    main()
