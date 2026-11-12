"""Bodas/reportajes que el tío manda por WhatsApp: convierte a webp y escribe el bloque JS de la carpeta.
Uso: python -X utf8 boda_tio.py <prefijo> <salida.js> <foto1> <foto2> ...   (en el orden en que las mandó)
Salida: fotografo-fotos/fotos/<prefijo>-NN.webp (tamaño original, calidad 90) y -m.webp (900 px).
12/11: «Boda Albano y Paula» (prefijo boda-albano-paula), 11 fotos de WhatsApp (1600 px: pedir originales)."""
import io, json, os, sys
from PIL import Image, ImageCms, ImageOps
DEST = r"C:\Users\Sergio\AgenciaIA-PyMES\fotografo-fotos\fotos"
SRGB = ImageCms.createProfile("sRGB")


def a_srgb(im):
    icc = im.info.get("icc_profile")
    if icc:
        try:
            return ImageCms.profileToProfile(im, ImageCms.ImageCmsProfile(io.BytesIO(icc)), SRGB, outputMode="RGB")
        except Exception:
            pass
    return im.convert("RGB")


pref, salida, rutas = sys.argv[1], sys.argv[2], sys.argv[3:]
info = {}
for i, r in enumerate(rutas, 1):
    n = f"{pref}-{i:02d}"
    im = a_srgb(ImageOps.exif_transpose(Image.open(r)))
    im.save(os.path.join(DEST, n + ".webp"), "WEBP", quality=90, method=6)
    b = im.copy(); b.thumbnail((900, 900), Image.LANCZOS); b.save(os.path.join(DEST, n + "-m.webp"), "WEBP", quality=82, method=6)
    c = b.resize((1, 1), Image.BOX).getpixel((0, 0))
    info[n] = [round(im.width / im.height, 3), "#%02x%02x%02x" % tuple(int(v * .8) for v in c[:3])]
with open(salida, "w", encoding="utf-8") as o:
    o.write(json.dumps(info, ensure_ascii=False))
print("LISTO", len(info), "fotos")
