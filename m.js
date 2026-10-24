/* Engrana · contador de visitas sin cookies. Uso:
   <script defer src="https://engranaia.com/m.js" data-site="ID" data-api="https://URL-DEL-WORKER"></script>
   Los clics en elementos con data-ev="nombre" cuentan como acciones. */
(function () {
  var s = document.currentScript;
  var site = s && s.getAttribute('data-site');
  var api = s && s.getAttribute('data-api');
  if (!site || !api || navigator.webdriver || location.protocol === 'file:') return;

  function enviar(evento) {
    var datos = JSON.stringify({ s: site, p: location.pathname, r: evento ? '' : document.referrer, e: evento || '' });
    if (navigator.sendBeacon) navigator.sendBeacon(api + '/h', datos);
    else fetch(api + '/h', { method: 'POST', body: datos, keepalive: true });
  }

  enviar();
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest && ev.target.closest('[data-ev]');
    if (el) enviar(el.getAttribute('data-ev'));
  }, true);
  window.engranaEv = enviar;
})();
