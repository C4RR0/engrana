/* Engrana · contador de visitas sin cookies. Uso:
   <script defer src="https://engranaia.com/m.js" data-site="ID" data-api="https://URL-DEL-WORKER"></script>
   Los clics en elementos con data-ev="nombre" cuentan como acciones. */
(function () {
  var s = document.currentScript;
  var site = s && s.getAttribute('data-site');
  var api = s && s.getAttribute('data-api');
  if (!site || !api || navigator.webdriver || location.protocol === 'file:') return;
  if (/bot|crawl|spider|slurp|headless|lighthouse|preview/i.test(navigator.userAgent)) return;
  // Google Apps Script recibe en la propia URL (/exec); el Worker de Cloudflare, en /h.
  var destino = /\/exec$/.test(api) ? api : api + '/h';
  var movil = /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 1 : 0;

  function enviar(evento) {
    var datos = JSON.stringify({ s: site, p: location.pathname, r: evento ? '' : document.referrer, e: evento || '', m: movil });
    if (navigator.sendBeacon) navigator.sendBeacon(destino, datos);
    else fetch(destino, { method: 'POST', body: datos, keepalive: true, mode: 'no-cors' });
  }

  enviar();
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest && ev.target.closest('[data-ev]');
    if (el) enviar(el.getAttribute('data-ev'));
  }, true);
  window.engranaEv = enviar;
})();
