// Reservas de la web de Fersaman -> Google Calendar de la tienda.
// Instalación (en la cuenta de Google de la tienda): script.google.com -> Nuevo proyecto -> pegar este código ->
// Implementar -> Nueva implementación -> Aplicación web (Ejecutar como: yo; Acceso: cualquier usuario) ->
// copiar la URL /exec en TIENDA.API de index.html.

const CALENDARIO = 'primary';       // o el ID de un calendario «Reservas web»
const AVISO_CORREO = true;          // manda un correo a la cuenta de la tienda con cada reserva
const HORAS_GUARDADO = 48;

function doPost(e) {
  try {
    const r = JSON.parse(e.postData.contents);
    if (!r.nombre || !r.tel || !r.dia || !Array.isArray(r.productos) || !r.productos.length) throw new Error('faltan datos');
    const [a, m, d] = r.dia.split('-').map(Number);
    const inicio = new Date(a, m - 1, d, Math.floor(r.ini / 60), r.ini % 60);
    const fin = new Date(a, m - 1, d, Math.floor(r.fin / 60), r.fin % 60);
    const lista = r.productos.map(p => `• ${Number(p.n)} × ${String(p.nombre).slice(0, 120)}`).join('\n');
    const titulo = `Reserva web: ${String(r.nombre).slice(0, 60)} (${r.productos.length} producto${r.productos.length > 1 ? 's' : ''})`;
    const desc = `${lista}\n\nTeléfono: ${String(r.tel).slice(0, 20)}\nRecogida: ${r.diaTxt}, ${r.franjaTxt}\n` +
      (r.nota ? `Nota: ${String(r.nota).slice(0, 500)}\n` : '') + `Se guarda ${HORAS_GUARDADO} h.`;
    const cal = CALENDARIO === 'primary' ? CalendarApp.getDefaultCalendar() : CalendarApp.getCalendarById(CALENDARIO);
    cal.createEvent(titulo, inicio, fin, { description: desc });
    if (AVISO_CORREO) MailApp.sendEmail(Session.getEffectiveUser().getEmail(), titulo, desc);
    return salida({ ok: true });
  } catch (err) {
    return salida({ ok: false, error: String(err.message || err) });
  }
}

function salida(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
