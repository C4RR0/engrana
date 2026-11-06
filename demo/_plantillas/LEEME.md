# Maquetas por prospecto

**Autoescuelas** (hecho 7/11): copia `ejemplo_autoescuela.json`, rellena slug, nombre, dirección, cp, profesores/coches y las preguntas con los PRECIOS REALES de su web (nada inventado salvo profesores y horarios, que la página ya marca como ejemplo), y ejecuta:

    python generar_autoescuela.py mi_config.json

Sale `demo/<slug>/index.html` con noindex y contador (eventos `<slug>-*`). Si no hay logo, pone las iniciales en un círculo (nunca el de Circular). Probar en Chrome (no headless: la intro de la rotonda no avanza sin animaciones) y publicar con commit + push SOLO cuando el negocio haya respondido con interés.

**Otros sectores (pendiente):** clínicas, peluquerías e inmobiliarias necesitan cambiar el vocabulario (clase → cita, profesor → profesional, coche → sala) y la intro del coche. Base: la misma lógica de huecos, lista de espera, cambiar/anular y vista de la oficina.
