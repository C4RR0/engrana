// Reservas de la web de Fersaman, con confirmación de la tienda (stock) — Google Apps Script, gratis.
//
// Flujo: el cliente reserva en la web (doPost) -> se apunta en la hoja «Reservas» como PENDIENTE, se crea un
// evento «⏳» en el calendario y llega un correo a la tienda con los botones Lo tengo / Solo una parte / No tengo.
// Al pulsar, la tienda marca qué productos hay, la reserva pasa a CONFIRMADA / PARCIAL / SIN STOCK, el evento se
// actualiza (o se borra) y se abre WhatsApp con el mensaje para el cliente ya escrito (solo hay que enviarlo).
// El cliente puede ver el estado en el enlace que le da la web.
//
// Instalación (en la cuenta de Google de la tienda):
//  1. script.google.com -> Nuevo proyecto -> pegar este código -> ejecutar instalar() una vez y aceptar permisos.
//  2. Implementar -> Nueva implementación -> Aplicación web (Ejecutar como: yo; Acceso: cualquier usuario).
//  3. Copiar la URL /exec en TIENDA.API de index.html. El enlace del panel de la tienda sale en el registro de instalar().

const TIENDA = 'Fersaman';
const CALENDARIO = 'primary';
const HORAS_GUARDADO = 48;

function instalar() {
  const p = PropertiesService.getScriptProperties();
  if (!p.getProperty('CLAVE')) p.setProperty('CLAVE', Utilities.getUuid().replace(/-/g, ''));
  if (!p.getProperty('HOJA')) {
    const ss = SpreadsheetApp.create('Reservas web ' + TIENDA);
    ss.getActiveSheet().setName('Reservas').appendRow(['id', 'código', 'creada', 'estado', 'nombre', 'teléfono', 'día',
      'franja', 'productos (json)', 'nota', 'evento', 'respuesta']);
    p.setProperty('HOJA', ss.getId());
  }
  Logger.log('Panel de la tienda (guárdalo en favoritos): ' + ScriptApp.getService().getUrl() + '?panel=' + p.getProperty('CLAVE'));
}

// ---------- datos ----------
const prop = k => PropertiesService.getScriptProperties().getProperty(k);
const hoja = () => SpreadsheetApp.openById(prop('HOJA')).getSheetByName('Reservas');
const COL = { id: 1, codigo: 2, creada: 3, estado: 4, nombre: 5, tel: 6, dia: 7, franja: 8, productos: 9, nota: 10, evento: 11, respuesta: 12 };

function leer(id) {
  const sh = hoja(), datos = sh.getDataRange().getValues();
  for (let i = 1; i < datos.length; i++) if (datos[i][0] === id) {
    const f = datos[i];
    return { fila: i + 1, id: f[0], codigo: f[1], creada: f[2], estado: f[3], nombre: f[4], tel: String(f[5]), dia: f[6],
      franja: f[7], productos: JSON.parse(f[8]), nota: f[9], evento: f[10], respuesta: f[11] };
  }
  return null;
}
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const telWa = t => { t = String(t).replace(/\D/g, ''); return t.length === 9 ? '34' + t : t; };

// ---------- el cliente reserva ----------
function doPost(e) {
  try {
    const r = JSON.parse(e.postData.contents);
    if (!r.nombre || !r.tel || !r.dia || !Array.isArray(r.productos) || !r.productos.length) throw new Error('faltan datos');
    const productos = r.productos.slice(0, 40).map(p => ({ n: Math.max(1, Math.min(99, Number(p.n) || 1)), nombre: String(p.nombre).slice(0, 120) }));
    const id = Utilities.getUuid().slice(0, 8), codigo = Utilities.getUuid().slice(0, 6);
    const [a, m, d] = String(r.dia).split('-').map(Number);
    const ini = new Date(a, m - 1, d, Math.floor(r.ini / 60), r.ini % 60), fin = new Date(a, m - 1, d, Math.floor(r.fin / 60), r.fin % 60);
    const nombre = String(r.nombre).slice(0, 60), tel = String(r.tel).slice(0, 20), nota = String(r.nota || '').slice(0, 500);
    const lista = productos.map(p => `• ${p.n} × ${p.nombre}`).join('\n');
    const cal = CALENDARIO === 'primary' ? CalendarApp.getDefaultCalendar() : CalendarApp.getCalendarById(CALENDARIO);
    const ev = cal.createEvent(`⏳ Reserva sin confirmar: ${nombre}`, ini, fin, { description: `${lista}\n\nTeléfono: ${tel}${nota ? '\nNota: ' + nota : ''}` });
    hoja().appendRow([id, codigo, new Date(), 'PENDIENTE', nombre, tel, `${r.diaTxt}`, `${r.franjaTxt}`, JSON.stringify(productos), nota, ev.getId(), '']);
    const url = ScriptApp.getService().getUrl(), k = prop('CLAVE');
    const boton = (txt, color, accion) => `<a href="${url}?r=${id}&k=${k}&a=${accion}" style="display:inline-block;margin:4px 6px 4px 0;padding:12px 16px;border-radius:10px;background:${color};color:#fff;text-decoration:none;font-weight:700">${txt}</a>`;
    MailApp.sendEmail({
      to: Session.getEffectiveUser().getEmail(),
      subject: `Nueva reserva web: ${nombre} (${productos.length} producto${productos.length > 1 ? 's' : ''})`,
      htmlBody: `<p><b>${esc(nombre)}</b> · ${esc(tel)}<br>Recoge: ${esc(r.diaTxt)}, ${esc(r.franjaTxt)}</p><p>${esc(lista).replace(/\n/g, '<br>')}</p>` +
        (nota ? `<p>Nota: ${esc(nota)}</p>` : '') + `<p>¿Lo tienes?</p>` +
        boton('✅ Lo tengo', '#1E8E4E', 'si') + boton('🟡 Solo una parte', '#C98A00', 'parte') + boton('❌ No tengo', '#B3261E', 'no') +
        `<p style="color:#666;font-size:13px">Todas las pendientes: <a href="${url}?panel=${k}">panel de reservas</a></p>`
    });
    return json({ ok: true, id, codigo, estado: `${url}?e=${id}&c=${codigo}` });
  } catch (err) {
    return json({ ok: false, error: String(err.message || err) });
  }
}

// ---------- páginas (tienda y cliente) ----------
function doGet(e) {
  const q = e.parameter, k = prop('CLAVE');
  if (q.panel && q.panel === k) return pagina('Reservas pendientes', panel());
  if (q.r && q.k === k) {
    const res = leer(q.r); if (!res) return pagina('Reserva', '<p>No encuentro esta reserva.</p>');
    if (q.hecho && ['CONFIRMADA', 'PARCIAL', 'SIN STOCK'].indexOf(q.hecho) >= 0) return pagina('Reserva', responder(res, q.hecho, q.hay ? q.hay.split(',').filter(String).map(Number) : []));
    // Los botones del correo solo abren esta pantalla (ya marcada): nada cambia hasta pulsar «Guardar», por si el
    // programa de correo abre los enlaces por su cuenta.
    if (res.estado !== 'PENDIENTE') return pagina('Reserva', `<p>Esta reserva ya está respondida: <b>${esc(res.estado)}</b>.</p>`);
    return pagina('Reserva', elegir(res, q.a !== 'no'));
  }
  if (q.e && q.c) {
    const res = leer(q.e); if (!res || res.codigo !== q.c) return pagina('Tu reserva', '<p>No encuentro esta reserva.</p>');
    const txt = { 'PENDIENTE': '⏳ La tienda está comprobando si lo tiene. Te avisará por WhatsApp.', 'CONFIRMADA': '✅ ¡Confirmada! Te lo tenemos preparado.',
      'PARCIAL': '🟡 Confirmada en parte: mira el mensaje que te hemos enviado.', 'SIN STOCK': '❌ Lo sentimos, ahora mismo no lo tenemos.' }[res.estado];
    return pagina('Tu reserva en ' + TIENDA, `<p style="font-size:1.15rem"><b>${txt}</b></p>${tabla(res)}<p>Recogida: ${esc(res.dia)}, ${esc(res.franja)}</p>`);
  }
  return pagina(TIENDA, '<p>Página de reservas de ' + TIENDA + '.</p>');
}

function tabla(res, conCasillas, marcadas) {
  return '<ul style="padding-left:0;list-style:none">' + res.productos.map((p, i) =>
    `<li style="padding:10px 0;border-bottom:1px solid #eee">${conCasillas ? `<label><input type="checkbox" name="hay" value="${i}"${marcadas ? ' checked' : ''} style="width:22px;height:22px;vertical-align:middle;margin-right:8px">` : '• '}${p.n} × ${esc(p.nombre)}${conCasillas ? '</label>' : ''}</li>`).join('') + '</ul>';
}

function elegir(res, marcadas) {
  const url = ScriptApp.getService().getUrl();
  return `<p><b>${esc(res.nombre)}</b> · ${esc(res.tel)}<br>Recoge: ${esc(res.dia)}, ${esc(res.franja)}</p>${res.nota ? `<p>Nota: ${esc(res.nota)}</p>` : ''}
    <p>Marca lo que <b>sí</b> tienes:</p>
    <form id="f">${tabla(res, true, marcadas)}<button style="${BTN}background:#1B1A86">Guardar y avisar al cliente</button></form>
    <script>document.getElementById('f').onsubmit=function(ev){ev.preventDefault();
      var hay=[].slice.call(document.querySelectorAll('[name=hay]:checked')).map(function(c){return c.value});
      var estado=hay.length===${res.productos.length}?'CONFIRMADA':hay.length?'PARCIAL':'SIN STOCK';
      window.top.location.href='${url}?r=${res.id}&k=${prop('CLAVE')}&hecho='+encodeURIComponent(estado)+'&hay='+hay.join(',');};</script>`;
}

function responder(res, estado, hay) {
  if (res.estado === 'PENDIENTE') {
    const sh = hoja();
    sh.getRange(res.fila, COL.estado).setValue(estado);
    sh.getRange(res.fila, COL.respuesta).setValue(new Date());
    try {
      const cal = CALENDARIO === 'primary' ? CalendarApp.getDefaultCalendar() : CalendarApp.getCalendarById(CALENDARIO);
      const ev = cal.getEventById(res.evento);
      if (ev) {
        if (estado === 'SIN STOCK') ev.deleteEvent();
        else {
          ev.setTitle(`${estado === 'CONFIRMADA' ? '✅' : '🟡'} Reserva: ${res.nombre}`);
          ev.setDescription(res.productos.filter((_, i) => hay.indexOf(i) >= 0).map(p => `• ${p.n} × ${p.nombre}`).join('\n') + `\n\nTeléfono: ${res.tel}`);
        }
      }
    } catch (err) { /* el evento pudo borrarse a mano */ }
    res.estado = estado;
  }
  const si = res.productos.filter((_, i) => hay.indexOf(i) >= 0), no = res.productos.filter((_, i) => hay.indexOf(i) < 0);
  const lista = a => a.map(p => `• ${p.n} × ${p.nombre}`).join('\n');
  const msg = res.estado === 'CONFIRMADA'
    ? `Hola ${res.nombre}, somos ${TIENDA}. Tu reserva está lista:\n${lista(si)}\n\nTe la guardamos hasta ${HORAS_GUARDADO} h. Te esperamos el ${res.dia}, ${res.franja.toLowerCase()}. ¡Gracias!`
    : res.estado === 'PARCIAL'
    ? `Hola ${res.nombre}, somos ${TIENDA}. De tu reserva tenemos:\n${lista(si)}\n\nAhora mismo no nos queda:\n${lista(no)}\n\nSi quieres te lo pedimos. Lo que hay te lo guardamos ${HORAS_GUARDADO} h.`
    : `Hola ${res.nombre}, somos ${TIENDA}. Lo sentimos, ahora mismo no tenemos:\n${lista(res.productos)}\n\n¿Quieres que te lo pidamos? Te avisamos cuando llegue.`;
  return `<p style="font-size:1.1rem"><b>Reserva de ${esc(res.nombre)}: ${esc(res.estado)}</b></p>
    <a href="https://wa.me/${telWa(res.tel)}?text=${encodeURIComponent(msg)}" target="_top" style="${BTN}background:#1E8E4E">Avisar a ${esc(res.nombre)} por WhatsApp</a>
    <p style="color:#666;font-size:.9rem">Se abre WhatsApp con el mensaje escrito: solo tienes que enviarlo.</p>
    <p><a href="${ScriptApp.getService().getUrl()}?panel=${prop('CLAVE')}" target="_top">Ver todas las pendientes</a></p>`;
}

function panel() {
  const datos = hoja().getDataRange().getValues().slice(1).filter(f => f[3] === 'PENDIENTE').reverse();
  if (!datos.length) return '<p>No hay reservas pendientes. 🎉</p>';
  const url = ScriptApp.getService().getUrl(), k = prop('CLAVE');
  return datos.map(f => {
    const prods = JSON.parse(f[8]).map(p => `${p.n} × ${esc(p.nombre)}`).join('<br>');
    return `<div style="border:1px solid #ddd;border-radius:12px;padding:14px;margin:12px 0"><b>${esc(f[4])}</b> · ${esc(f[5])}<br>
      <span style="color:#666">Recoge: ${esc(f[6])}, ${esc(f[7])}</span><p>${prods}</p>
      <a href="${url}?r=${f[0]}&k=${k}&a=si" target="_top" style="${BTN}background:#1E8E4E">✅ Lo tengo</a>
      <a href="${url}?r=${f[0]}&k=${k}&a=parte" target="_top" style="${BTN}background:#C98A00">🟡 Una parte</a>
      <a href="${url}?r=${f[0]}&k=${k}&a=no" target="_top" style="${BTN}background:#B3261E">❌ No tengo</a></div>`;
  }).join('');
}

const BTN = 'display:inline-block;margin:4px 6px 4px 0;padding:12px 16px;border:0;border-radius:10px;color:#fff;text-decoration:none;font:700 1rem sans-serif;cursor:pointer;';

function pagina(titulo, cuerpo) {
  return HtmlService.createHtmlOutput(`<div style="font:16px/1.5 system-ui,sans-serif;max-width:560px;margin:0 auto;padding:16px;color:#15163A">
    <h2 style="margin:0 0 12px">${esc(titulo)}</h2>${cuerpo}</div>`).setTitle(titulo)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
