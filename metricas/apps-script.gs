// Engrana · contador de visitas sin cookies en Google Apps Script (sustituye al Worker de Cloudflare,
// que los días de partido bloquean Movistar, Orange, Vodafone y DIGI).
// Guarda totales por día en una hoja de cálculo de la cuenta: no guarda IPs, cookies ni identificadores.
//
//   POST (m.js, con sendBeacon)  {s: sitio, p: ruta, r: referrer, e: evento|'', m: 1 si es móvil}
//   GET  ?site=ID&days=30&key=CLAVE  -> JSON con las cifras (lo pide el panel)
//
// Puesta en marcha: pegar este fichero, ejecutar preparar() una vez (pide permisos) e implementar como
// aplicación web (ejecutar como: yo; acceso: cualquier usuario).

const TZ = 'Europe/Madrid';

function libro_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('LIBRO');
  if (id) return SpreadsheetApp.openById(id);
  const ss = SpreadsheetApp.create('Engrana · Métricas');
  const hits = ss.getSheets()[0].setName('hits');
  hits.getRange('A:G').setNumberFormat('@');
  hits.appendRow(['clave', 'day', 'site', 'kind', 'path', 'ref', 'device', 'n']);
  const sites = ss.insertSheet('sites');
  sites.getRange('A:D').setNumberFormat('@');
  sites.appendRow(['site', 'name', 'host', 'key']);
  props.setProperty('LIBRO', ss.getId());
  return ss;
}

// Ejecutar una vez desde el editor: crea la hoja y da de alta la web de Engrana.
function preparar() {
  const ss = libro_();
  const sites = ss.getSheetByName('sites');
  if (!buscarSitio_(ss, 'engrana')) sites.appendRow(['engrana', 'Engrana', 'engranaia.com', 'CLAVE_DEL_PANEL']);
  Logger.log(ss.getUrl());
}

function buscarSitio_(ss, site) {
  if (!site) return null;
  const filas = ss.getSheetByName('sites').getDataRange().getValues().slice(1);
  const f = filas.find((r) => String(r[0]) === site);
  return f ? { site: String(f[0]), name: String(f[1]), host: String(f[2]).replace(/^www\./, ''), key: String(f[3]) } : null;
}

function hostDe_(u) {
  const m = /^https?:\/\/([^\/:?#]+)/i.exec(u || '');
  return m ? m[1].toLowerCase().replace(/^www\./, '') : '';
}

// Evita que un texto que llega de fuera se interprete como fórmula en la hoja.
function texto_(s) {
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function salida_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const d = JSON.parse(String((e.postData && e.postData.contents) || '').slice(0, 2000));
    const ss = libro_();
    const sitio = buscarSitio_(ss, String(d.s || '').slice(0, 40));
    if (!sitio) return salida_({});
    const ruta = texto_((String(d.p || '/').split(/[?#]/)[0] || '/').slice(0, 200));
    const rh = hostDe_(String(d.r || ''));
    const ref = texto_(!rh ? 'directo' : (rh === sitio.host ? 'interno' : rh));
    const evento = String(d.e || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 32);
    const kind = evento || 'pv';
    const device = d.m ? 'movil' : 'ordenador';
    const day = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
    const clave = [day, sitio.site, kind, ruta, ref, device].join('|');

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const hits = ss.getSheetByName('hits');
      const celda = hits.getRange('A:A').createTextFinder(clave).matchEntireCell(true).findNext();
      if (celda) {
        const n = hits.getRange(celda.getRow(), 8);
        n.setValue(Number(n.getValue()) + 1);
      } else {
        hits.appendRow([clave, day, sitio.site, kind, ruta, ref, device, 1]);
      }
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    // Una visita mal formada no debe romper nada: se ignora (queda en el registro de ejecuciones).
    console.error(err);
  }
  return salida_({});
}

function doGet(e) {
  const q = (e && e.parameter) || {};
  const ss = libro_();
  const sitio = buscarSitio_(ss, String(q.site || '').slice(0, 40));
  if (!sitio || !q.key || String(q.key) !== sitio.key) return salida_({ error: 'Sitio o clave incorrectos' });

  const dias = Math.min(90, Math.max(1, parseInt(q.days || '30', 10) || 30));
  const dia = (n) => Utilities.formatDate(new Date(Date.now() + n * 86400000), TZ, 'yyyy-MM-dd');
  const hasta = dia(0), desde = dia(-(dias - 1)), antHasta = dia(-dias), antDesde = dia(-(2 * dias - 1));

  const filas = ss.getSheetByName('hits').getDataRange().getValues().slice(1)
    .filter((r) => String(r[2]) === sitio.site)
    .map((r) => ({ day: r[1] instanceof Date ? Utilities.formatDate(r[1], TZ, 'yyyy-MM-dd') : String(r[1]), kind: String(r[3]), path: String(r[4]).replace(/^'/, ''), ref: String(r[5]).replace(/^'/, ''), device: String(r[6]), n: Number(r[7]) || 0 }));

  const enPeriodo = (a, b) => filas.filter((r) => r.day >= a && r.day <= b);
  const actual = enPeriodo(desde, hasta);
  const previo = enPeriodo(antDesde, antHasta);
  const sumaPor = (lista, clave, filtro) => {
    const m = {};
    lista.filter(filtro).forEach((r) => { m[r[clave]] = (m[r[clave]] || 0) + r.n; });
    return m;
  };
  const top = (m, a, b) => Object.keys(m).map((k) => ({ [a]: k, [b]: m[k] })).sort((x, y) => y[b] - x[b]).slice(0, 10);

  const porDia = {};
  actual.forEach((r) => {
    const d = porDia[r.day] || (porDia[r.day] = { day: r.day, vistas: 0, visitas: 0, acciones: 0 });
    if (r.kind === 'pv') { d.vistas += r.n; if (r.ref !== 'interno') d.visitas += r.n; } else d.acciones += r.n;
  });
  const totales = (lista) => lista.reduce((t, r) => {
    if (r.kind === 'pv') { t.vistas += r.n; if (r.ref !== 'interno') t.visitas += r.n; } else t.acciones += r.n;
    return t;
  }, { visitas: 0, vistas: 0, acciones: 0 });

  const esVisita = (r) => r.kind === 'pv' && r.ref !== 'interno';
  return salida_({
    site: sitio.site, nombre: sitio.name, dias: dias, desde: desde, hasta: hasta, generado: new Date().toISOString(),
    diario: Object.keys(porDia).sort().map((k) => porDia[k]),
    paginas: top(sumaPor(actual, 'path', (r) => r.kind === 'pv'), 'path', 'vistas'),
    origen: top(sumaPor(actual, 'ref', esVisita), 'ref', 'visitas'),
    dispositivo: top(sumaPor(actual, 'device', esVisita), 'device', 'visitas'),
    eventos: top(sumaPor(actual, 'kind', (r) => r.kind !== 'pv'), 'evento', 'veces'),
    anterior: totales(previo),
  });
}

// Borra las visitas de prueba (rutas que empiezan por /prueba).
function limpiar() {
  const hits = libro_().getSheetByName('hits');
  const filas = hits.getDataRange().getValues();
  for (let i = filas.length - 1; i >= 1; i--) if (String(filas[i][4]).indexOf('/prueba') === 0) hits.deleteRow(i + 1);
}
