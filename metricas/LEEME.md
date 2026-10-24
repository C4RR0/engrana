# Contador de visitas y panel de métricas de Engrana

Qué es: un contador de visitas **sin cookies** (no guarda IPs ni datos personales) y un panel con botón
«Actualizar» que solo consulta cuando se pulsa. Gratis: Cloudflare Workers + D1 (plan gratuito: 100.000
peticiones/día). Se usa primero en engranaia.com y después se ofrece a los clientes con su web.

Piezas:
- `worker.js`: el contador (recibe visitas en `/h` y da las cifras en `/stats` con clave).
- `schema.sql`: la base de datos D1 (tablas `sites` y `hits`).
- `../m.js`: el script que se pone en cada web (`data-site` + `data-api`). Los clics en elementos con
  `data-ev="nombre"` cuentan como acciones.
- `../panel/`: el panel (https://engranaia.com/panel/). Sin acceso configurado enseña datos de ejemplo.
  Enlace de cada cliente: `https://engranaia.com/panel/#s=SITIO&k=CLAVE` (la clave se guarda en su
  navegador y se borra de la barra de direcciones).
- `prueba.html`: página para probar el contador en local.

## Activarlo (sin instalar nada, desde la web de Cloudflare)
1. Crear cuenta gratis en https://dash.cloudflare.com/sign-up con sergiocarrovadillo@gmail.com (la crea Sergio).
2. Storage & Databases → D1 → Create → nombre `engrana-metricas`. En su pestaña Console pegar `schema.sql`
   cambiando `CLAVE_AQUI` por la clave del panel.
3. Workers & Pages → Create → Worker → nombre `engrana-metricas` → Deploy → Edit code → pegar `worker.js` → Deploy.
4. En el Worker: Settings → Bindings → Add → D1 database → Variable name `DB` → base `engrana-metricas` → Save.
5. Pasar a Claude la dirección del Worker (`https://engrana-metricas.XXXX.workers.dev`). Claude:
   - pone `API_POR_DEFECTO` en el panel y el `<script src="/m.js" ...>` en index.html y en la demo;
   - actualiza el aviso legal (ahora dice que la web no usa analítica: pasará a explicar el contador sin cookies);
   - prueba una visita real y la consulta desde el panel.

## Dar de alta a un cliente
En la consola de D1: `INSERT INTO sites (site, name, host, key) VALUES ('tinta-norte', 'Tinta Norte', 'tintanorte.es', 'CLAVE');`
y en su web: `<script defer src="https://engranaia.com/m.js" data-site="tinta-norte" data-api="https://engrana-metricas.XXXX.workers.dev"></script>`

## Probado (24/10/2026)
En local, con un servidor que usa exactamente las consultas SQL de `worker.js` sobre SQLite (D1 es SQLite):
visitas, clics, procedencia (Google, Instagram, directo), móvil/ordenador, comparación con el periodo anterior,
que el panel NO consulta solo (al recargar enseña la última consulta) y que «Actualizar» trae los datos nuevos,
y el aviso con clave errónea. Panel revisado a 390 px. Falta probar el Worker ya desplegado en Cloudflare.
