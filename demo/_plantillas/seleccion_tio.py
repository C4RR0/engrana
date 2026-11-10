"""Elige las mejores fotos de cada sesión del tío (sin casi-duplicados) y genera el bloque JS de álbumes por persona.

Lee _albumes_tio.json (de fotos_tio.py). Criterio: nitidez + diversidad (muestreo del punto más lejano
sobre una huella de 16x16 en color). Sesiones con <= MAX fotos se quedan enteras.
Salida: _albumes_tio.js (para pegar en index.html) y hojas de contactos de la selección en el scratchpad.
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

BASE = r"C:\Users\Sergio\AgenciaIA-PyMES\fotografo-web"
SCR = r"C:\Users\Sergio\AppData\Local\Temp\claude\0e3a8c2cd5986872\f8b70721-6b86-41a1-8180-16858e48c5f8\scratchpad\tio"
MAX = {"default": 9999}  # el tío quiere TODAS las fotos (9/11)
PERSONAS = [("Alba", ["alba-acequia", "alba-estudio", "alba-vias", "alba-y-jessi"]),
            ("Daniela", ["daniela-acequia", "daniela-simancas", "daniela-street", "danielavias"]),
            ("Amapolas", ["amapolas"]),
            ("Azu", ["azu-embarazo"])]
# fotos de OTRAS personas que venían dentro de la carpeta de Alba Estudio (revisado 9/11): fuera hasta que el tío diga dónde van
EXCLUIR = set()  # 9/11: Sergio pide meter también -78 y -89 (mujer del cárdigan naranja) en Estudio; -187 Jessi, -168 Alba y Jessi
TITULO = {"alba-y-jessi": "Con Jessi", "danielavias": "Vías", "alba-vias": "Vías"}

alb = json.load(open(os.path.join(BASE, "_albumes_tio.json"), encoding="utf-8"))
por_slug = {a["fotos"][0].rsplit("-", 1)[0]: a for a in alb if a["fotos"]}

def huella(n):
    im = Image.open(os.path.join(BASE, "fotos", n + "-m.webp")).convert("RGB")
    v = np.asarray(im.resize((16, 16), Image.BOX), dtype=np.float32).ravel() / 255
    g = im.convert("L").resize((400, int(400 * im.height / im.width)))
    nit = float(np.asarray(g.filter(ImageFilter.FIND_EDGES), dtype=np.float32).var())
    return v, nit

def elegir(fotos, k):
    if len(fotos) <= k:
        return list(fotos)
    H = {n: huella(n) for n in fotos}
    nits = np.array([H[n][1] for n in fotos]); umbral = np.percentile(nits, 25)
    cand = [n for n in fotos if H[n][1] >= umbral] or list(fotos)
    sel = [max(cand, key=lambda n: H[n][1])]
    while len(sel) < k and len(sel) < len(cand):
        d = {n: min(np.linalg.norm(H[n][0] - H[s][0]) for s in sel) for n in cand if n not in sel}
        sel.append(max(d, key=d.get))
    return sorted(sel, key=fotos.index)

personas, colores, verticales, titulos = [], {}, set(), {}
for nombre, slugs in PERSONAS:
    sesiones = []
    for s in slugs:
        a = por_slug[s]
        k = MAX.get(s, MAX["default"])
        f = elegir([n for n in a["fotos"] if n not in EXCLUIR], k)
        t = TITULO.get(s, a["sesion"] or a["nombre"])
        sesiones.append({"t": t if len(slugs) > 1 else (a["sesion"] or ""), "f": f})
        for n in f:
            colores[n] = a["colores"][n]
            titulos[n] = f"{nombre} · {t}" if len(slugs) > 1 or a["sesion"] else nombre
            if n in a["verticales"]:
                verticales.add(n)
        # hoja de contactos de lo elegido
        T = 150; cols = 8; rows = (len(f) + cols - 1) // cols
        sh = Image.new("RGB", (cols * T, rows * T), "white")
        for i, n in enumerate(f):
            im = Image.open(os.path.join(BASE, "fotos", n + "-m.webp")); im.thumbnail((T, T))
            sh.paste(im, ((i % cols) * T + (T - im.width) // 2, (i // cols) * T))
        sh.save(os.path.join(SCR, f"sel_{s}.jpg"), quality=75)
        print(f"{nombre} · {t}: {len(f)} de {len(a['fotos'])}")
    n_ses = len(sesiones)
    personas.append({"nombre": nombre, "sesion": f"{n_ses} sesiones" if n_ses > 1 else (sesiones[0]["t"] or "Sesión"),
                     "texto": "", "sesiones": sesiones, "fotos": [n for s in sesiones for n in s["f"]]})

js = ("/* === Álbumes del tío (generado por demo/_plantillas/seleccion_tio.py) === */\n"
      f"Object.assign(C, {json.dumps(colores)});\n"
      f"{json.dumps(sorted(verticales))}.forEach(n => V.add(n));\n"
      f"Object.assign(T, {json.dumps(titulos, ensure_ascii=False)});\n"
      f"const ALBUMES = {json.dumps(personas, ensure_ascii=False)};\n")
open(os.path.join(BASE, "_albumes_tio.js"), "w", encoding="utf-8").write(js)
print("total fotos en la web:", sum(len(p["fotos"]) for p in personas))
