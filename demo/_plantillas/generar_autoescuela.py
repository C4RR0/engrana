"""Genera una maqueta de reservas para una autoescuela a partir de la de Circular (demo/autoescuela).

Uso:  python generar_autoescuela.py config.json
Crea demo/<slug>/index.html (+ logo si se da) con noindex y contador (eventos <slug>-*).
Cambia: nombre, dirección, código postal, profesores/coches, preguntas frecuentes (precios REALES de su web)
y los nombres de evento. Lo inventado (profesores, horarios) queda marcado como ejemplo en la página.
Plantilla de config: ejemplo_autoescuela.json
"""
import json
import re
import shutil
import sys
from pathlib import Path

DEMO = Path(__file__).resolve().parent.parent
BASE = DEMO / "autoescuela" / "index.html"


def bloque_js(nombre, valor):
    return f"const {nombre} = {json.dumps(valor, ensure_ascii=False, indent=2)};"


def main():
    cfg = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    slug, nombre, dire, cp = cfg["slug"], cfg["nombre"], cfg["direccion"], cfg.get("cp", "")
    html = BASE.read_text(encoding="utf-8")
    html = html.replace("Autoescuela Circular", nombre).replace("C/ Industrias, 1", dire)
    html = html.replace("47005 Valladolid", f"{cp} Valladolid".strip())
    html = html.replace('data-ev="autoescuela-', f'data-ev="{slug}-')
    # Profesores y FAQ: se sustituyen los bloques enteros
    html, n1 = re.subn(r"const PROFES = \[.*?\n\];", bloque_js("PROFES", cfg["profes"]), html, count=1, flags=re.S)
    html, n2 = re.subn(r"const FAQ = \[.*?\n\];", bloque_js("FAQ", cfg["faq"]), html, count=1, flags=re.S)
    # Las 2 clases reservadas de ejemplo usaban ids fijos (marta, javier): pasan a los 2 primeros profesores
    html = html.replace("|marta|10:15`", "|${PROFES[0].id}|10:15`").replace("|javier|17:30`", "|${PROFES[1 % PROFES.length].id}|17:30`")
    if "bono" in cfg:
        html = re.sub(r"const BONO = \d+, HECHAS = \d+;", f"const BONO = {cfg['bono']}, HECHAS = {cfg.get('hechas', 4)};", html)
    assert n1 == 1 and n2 == 1, "No encontré los bloques PROFES/FAQ en la plantilla"
    restos = [w for w in ("Circular", "Industrias") if w in html]
    destino = DEMO / slug
    destino.mkdir(exist_ok=True)
    (destino / "index.html").write_text(html, encoding="utf-8")
    logo = cfg.get("logo")
    if logo:
        shutil.copy(Path(logo), destino / "logo.png")
    else:  # NUNCA el logo de Circular: iniciales en un círculo con el color del primer profesor
        from PIL import Image, ImageDraw, ImageFont
        palabras = [w for w in nombre.replace("Autoescuela", "").split() if w[:1].isalpha()] or [nombre]
        ini = "".join(w[0] for w in palabras[:2]).upper()
        im = Image.new("RGBA", (98, 80), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        d.ellipse((9, 0, 89, 80), fill=cfg["profes"][0].get("c", "#2C7DA0"))
        try:
            f = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 34)
        except OSError:
            f = ImageFont.load_default()
        d.text((49, 40), ini, font=f, fill="white", anchor="mm")
        im.save(destino / "logo.png")
    print(f"Hecho: {destino / 'index.html'}" + (f"  ⚠ quedan restos: {restos}" if restos else ""))


if __name__ == "__main__":
    main()
