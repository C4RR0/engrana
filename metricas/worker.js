// Engrana · contador de visitas sin cookies (Cloudflare Worker + D1).
// No guarda IPs, cookies ni identificadores: solo cuenta páginas vistas, de dónde llegan
// (dominio del referrer), si es móvil u ordenador, y los clics marcados con data-ev.
//
// Rutas:
//   POST /h       {s: sitio, p: ruta, r: referrer, e: evento|''}  -> 204   (lo envía m.js)
//   GET  /stats?site=ID&days=30   cabecera Authorization: Bearer CLAVE -> JSON (lo pide el panel)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
};

const BOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|whatsapp/i;

const SQL_SUMAR = `INSERT INTO hits (day, site, kind, path, ref, device, n) VALUES (?, ?, ?, ?, ?, ?, 1)
  ON CONFLICT (day, site, kind, path, ref, device) DO UPDATE SET n = n + 1`;

const SQL_DIARIO = `SELECT day,
    SUM(CASE WHEN kind = 'pv' THEN n ELSE 0 END) AS vistas,
    SUM(CASE WHEN kind = 'pv' AND ref <> 'interno' THEN n ELSE 0 END) AS visitas,
    SUM(CASE WHEN kind <> 'pv' THEN n ELSE 0 END) AS acciones
  FROM hits WHERE site = ? AND day >= ? AND day <= ? GROUP BY day ORDER BY day`;

const SQL_PAGINAS = `SELECT path, SUM(n) AS vistas FROM hits
  WHERE site = ? AND day >= ? AND day <= ? AND kind = 'pv' GROUP BY path ORDER BY vistas DESC LIMIT 10`;

const SQL_ORIGEN = `SELECT ref, SUM(n) AS visitas FROM hits
  WHERE site = ? AND day >= ? AND day <= ? AND kind = 'pv' AND ref <> 'interno' GROUP BY ref ORDER BY visitas DESC LIMIT 10`;

const SQL_DISPOSITIVO = `SELECT device, SUM(n) AS visitas FROM hits
  WHERE site = ? AND day >= ? AND day <= ? AND kind = 'pv' AND ref <> 'interno' GROUP BY device`;

const SQL_EVENTOS = `SELECT kind AS evento, SUM(n) AS veces FROM hits
  WHERE site = ? AND day >= ? AND day <= ? AND kind <> 'pv' GROUP BY kind ORDER BY veces DESC`;

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    try {
      if (url.pathname === '/h' && req.method === 'POST') return await contar(req, env);
      if (url.pathname === '/stats' && req.method === 'GET') return await estadisticas(req, url, env);
    } catch (err) {
      return json({ error: 'Error interno' }, 500);
    }
    return new Response('Engrana · métricas', { status: 404, headers: CORS });
  },
};

async function contar(req, env) {
  const vacio = new Response(null, { status: 204, headers: CORS });
  const ua = req.headers.get('User-Agent') || '';
  if (!ua || BOT.test(ua)) return vacio;

  let d;
  try { d = JSON.parse((await req.text()).slice(0, 2000)); } catch { return vacio; }
  const site = String(d.s || '').slice(0, 40);
  const fila = await env.DB.prepare('SELECT host FROM sites WHERE site = ?').bind(site).first();
  if (!fila) return vacio;

  // Solo se aceptan visitas enviadas desde la propia web del sitio (o desde localhost para probar).
  const origen = hostDe(req.headers.get('Origin') || '');
  const host = fila.host.replace(/^www\./, '');
  if (origen !== host && origen !== 'localhost' && origen !== '127.0.0.1') return vacio;

  const ruta = (String(d.p || '/').split(/[?#]/)[0] || '/').slice(0, 200);
  const refHost = hostDe(String(d.r || ''));
  const ref = !refHost ? 'directo' : (refHost === host ? 'interno' : refHost);
  const evento = String(d.e || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 32);
  const kind = evento || 'pv';
  const movil = req.headers.get('Sec-CH-UA-Mobile') === '?1' || /Mobi|Android|iPhone/i.test(ua);

  await env.DB.prepare(SQL_SUMAR)
    .bind(hoy(0), site, kind, ruta, ref, movil ? 'movil' : 'ordenador').run();
  return vacio;
}

async function estadisticas(req, url, env) {
  const site = (url.searchParams.get('site') || '').slice(0, 40);
  const clave = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const fila = await env.DB.prepare('SELECT name, key FROM sites WHERE site = ?').bind(site).first();
  if (!fila || !clave || !igual(clave, fila.key)) return json({ error: 'Sitio o clave incorrectos' }, 401);

  const dias = Math.min(90, Math.max(1, parseInt(url.searchParams.get('days') || '30', 10) || 30));
  const hasta = hoy(0);
  const desde = hoy(-(dias - 1));
  const antHasta = hoy(-dias);
  const antDesde = hoy(-(2 * dias - 1));

  const q = (sql, a, b) => env.DB.prepare(sql).bind(site, a, b);
  const [diario, paginas, origen, dispositivo, eventos, anterior] = await env.DB.batch([
    q(SQL_DIARIO, desde, hasta),
    q(SQL_PAGINAS, desde, hasta),
    q(SQL_ORIGEN, desde, hasta),
    q(SQL_DISPOSITIVO, desde, hasta),
    q(SQL_EVENTOS, desde, hasta),
    q(SQL_DIARIO, antDesde, antHasta),
  ]);

  const suma = (filas, campo) => filas.reduce((t, f) => t + (f[campo] || 0), 0);
  return json({
    site, nombre: fila.name, dias, desde, hasta, generado: new Date().toISOString(),
    diario: diario.results,
    paginas: paginas.results,
    origen: origen.results,
    dispositivo: dispositivo.results,
    eventos: eventos.results,
    anterior: {
      visitas: suma(anterior.results, 'visitas'),
      vistas: suma(anterior.results, 'vistas'),
      acciones: suma(anterior.results, 'acciones'),
    },
  });
}

function hoy(desplazamiento) {
  // Fecha en hora de Madrid, AAAA-MM-DD.
  const t = new Date(Date.now() + desplazamiento * 86400000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(t);
}

function hostDe(u) {
  try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; }
}

function igual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
