"""Prepara las fotos del tío (José Luis Vadillo) para la web, sin pérdida visible de calidad.

Origen: C:\\Users\\Sergio\\Desktop\\web\\<Carpeta>\\*.jpg  (originales, NO se tocan)
Destino: engrana/demo/fotografo/fotos/<slug>-NN.webp (2560 px lado largo, calidad 90, sRGB)
         y <slug>-NN-m.webp (900 px, calidad 82) para miniaturas.
Escribe _albumes_tio.json con nombre, sesión, ids, orientación y color medio.
Uso: python -I fotos_tio.py
"""
import io, json, os, re, sys, unicodedata
from PIL import Image, ImageCms, ImageOps

Image.MAX_IMAGE_PIXELS = None
ORIGEN = r"C:\Users\Sergio\Desktop\web"
DEST = r"C:\Users\Sergio\AgenciaIA-PyMES\engrana\demo\fotografo\fotos"
SALIDA_JSON = r"C:\Users\Sergio\AgenciaIA-PyMES\engrana\demo\fotografo\_albumes_tio.json"
GRANDE, MINI = 2560, 900
SRGB = ImageCms.createProfile("sRGB")

def slug(t):
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", t.lower()).strip("-")

def nombre_sesion(carpeta):
    c = re.sub(r"([a-z])([A-Z])", r"\1 \2", carpeta).strip()      # DanielaVias -> Daniela Vias
    partes = c.split()
    if " y " in c or len(partes) == 1:
        return c, ""
    return partes[0], " ".join(partes[1:])

def a_srgb(im):
    icc = im.info.get("icc_profile")
    if icc:
        try:
            src = ImageCms.ImageCmsProfile(io.BytesIO(icc))
            im = ImageCms.profileToProfile(im, src, SRGB, outputMode="RGB")
        except Exception:
            im = im.convert("RGB")
    return im.convert("RGB")

def num(f):
    m = re.findall(r"\d+", f)
    return int(m[-1]) if m else 0

os.makedirs(DEST, exist_ok=True)
albumes = []
for carpeta in sorted(os.listdir(ORIGEN)):
    ruta = os.path.join(ORIGEN, carpeta)
    if not os.path.isdir(ruta):
        continue
    fs = sorted((f for f in os.listdir(ruta) if not f.startswith("._") and f.lower().endswith((".jpg", ".jpeg", ".png"))), key=num)
    nombre, sesion = nombre_sesion(carpeta)
    s = slug(carpeta)
    fotos, vert, color = [], [], {}
    for i, f in enumerate(fs, 1):
        n = f"{s}-{i:02d}"
        g, m = os.path.join(DEST, n + ".webp"), os.path.join(DEST, n + "-m.webp")
        if not (os.path.exists(g) and os.path.exists(m)):
            im = Image.open(os.path.join(ruta, f))
            im = ImageOps.exif_transpose(im)
            im = a_srgb(im)
            a = im.copy(); a.thumbnail((GRANDE, GRANDE), Image.LANCZOS)
            a.save(g, "WEBP", quality=90, method=6)
            b = im.copy(); b.thumbnail((MINI, MINI), Image.LANCZOS)
            b.save(m, "WEBP", quality=82, method=6)
        b = Image.open(m)
        if b.height > b.width:
            vert.append(n)
        c = b.resize((1, 1), Image.BOX).getpixel((0, 0))
        color[n] = "#%02x%02x%02x" % tuple(int(v * .8) for v in c[:3])
        fotos.append(n)
        print(carpeta, i, "/", len(fs), flush=True)
    albumes.append({"carpeta": carpeta, "nombre": nombre, "sesion": sesion, "fotos": fotos, "verticales": vert, "colores": color})

json.dump(albumes, open(SALIDA_JSON, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
tot = sum(os.path.getsize(os.path.join(DEST, f)) for f in os.listdir(DEST) if f.endswith(".webp"))
print("LISTO", len(albumes), "albumes,", sum(len(a["fotos"]) for a in albumes), "fotos,", round(tot / 1e6), "MB en webp")
