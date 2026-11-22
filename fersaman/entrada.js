/* Entrada de Fersaman: la fresa corta una llave, la llave abre el candado y sube la persiana.
   Sale una vez por sesión (con ?intro se fuerza). Si algo falla, la web se ve igual sin entrada. */
window.FersamanEntrada = (function () {
  const NS = 'http://www.w3.org/2000/svg';
  // Perfil de los dientes de la llave (x, y) sobre la hoja
  const DIENTES = [[0,-17],[18,-17],[28,-6],[40,-14],[54,-3],[68,-15],[82,-7],[96,-16],[110,-2],[124,-12],[138,-5],[152,-15],[166,-8],[180,-13],[196,0]];
  const perfil = x => {
    for (let i = 1; i < DIENTES.length; i++) {
      const [x0, y0] = DIENTES[i - 1], [x1, y1] = DIENTES[i];
      if (x <= x1) return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
    }
    return 0;
  };
  const HOJA_CORTADA = 'M' + DIENTES.map(p => p.join(',')).join(' L') + ' L180,17 L0,17 Z';
  const HOJA_ENTERA = 'M0,-17 H180 L196,0 L180,17 H0 Z';

  function dientesFresa(r, n) {
    let d = '';
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, b = (i + .55) / n * Math.PI * 2, c = (i + .7) / n * Math.PI * 2;
      d += (i ? 'L' : 'M') + (Math.cos(a) * (r - 7)).toFixed(1) + ',' + (Math.sin(a) * (r - 7)).toFixed(1) +
        'L' + (Math.cos(b) * r).toFixed(1) + ',' + (Math.sin(b) * r).toFixed(1) +
        'L' + (Math.cos(c) * (r - 7)).toFixed(1) + ',' + (Math.sin(c) * (r - 7)).toFixed(1);
    }
    return d + 'Z';
  }

  const ESCENA = `
  <defs>
    <linearGradient id="eLaton" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE98A"/><stop offset=".45" stop-color="#E5B93C"/><stop offset="1" stop-color="#9A7116"/></linearGradient>
    <linearGradient id="eAcero" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F2F4F8"/><stop offset=".5" stop-color="#AEB4C2"/><stop offset="1" stop-color="#666C7C"/></linearGradient>
    <linearGradient id="eCuerpo" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8A8FA0"/><stop offset=".3" stop-color="#E9ECF2"/><stop offset=".65" stop-color="#B9BECB"/><stop offset="1" stop-color="#6A6F80"/></linearGradient>
    <clipPath id="eHecho"><rect id="eHechoR" x="-1" y="-30" width="0" height="60"/></clipPath>
    <clipPath id="eFalta"><rect id="eFaltaR" x="0" y="-30" width="200" height="60"/></clipPath>
    <clipPath id="eVisible"><rect id="eVisibleR" x="-1" y="-30" width="200" height="60"/></clipPath>
  </defs>
  <g id="eHembrilla"><rect x="268" y="248" width="64" height="30" rx="5" fill="url(#eAcero)" stroke="#0C0B40" stroke-width="2"/><circle cx="279" cy="263" r="3" fill="#555B6B"/><circle cx="321" cy="263" r="3" fill="#555B6B"/></g>
  <g id="eMaquina">
    <rect x="282" y="-40" width="36" height="120" fill="url(#eAcero)" stroke="#0C0B40" stroke-width="2"/>
    <g id="eFresa"><path d="${dientesFresa(56, 26)}" fill="url(#eAcero)" stroke="#2A2C3C" stroke-width="1.5"/><circle r="30" fill="#7C8291"/><circle r="11" fill="#20222F"/><path d="M-24,0H24M0,-24V24" stroke="#555B6B" stroke-width="3"/></g>
    <path d="M232,112 A68,68 0 0 1 368,112 L350,112 A50,50 0 0 0 250,112 Z" fill="#F4E31A" stroke="#0C0B40" stroke-width="2"/>
  </g>
  <g id="eCaida">
    <path id="eArco" d="M256,366 V304 a44,44 0 0 1 88,0 V366" fill="none" stroke="url(#eAcero)" stroke-width="17" stroke-linecap="round"/>
    <rect x="232" y="364" width="136" height="130" rx="16" fill="url(#eCuerpo)" stroke="#0C0B40" stroke-width="2.5"/>
    <rect x="232" y="392" width="136" height="30" fill="#F4E31A"/>
    <circle cx="300" cy="462" r="11" fill="#14152A"/><rect x="296.5" y="464" width="7" height="20" rx="2" fill="#14152A"/>
    <g id="eLlave">
      <g clip-path="url(#eVisible)">
        <path d="${HOJA_ENTERA}" fill="url(#eLaton)" stroke="#6E500E" stroke-width="1.5" clip-path="url(#eFalta)"/>
        <path d="${HOJA_CORTADA}" fill="url(#eLaton)" stroke="#6E500E" stroke-width="1.5" clip-path="url(#eHecho)"/>
        <path d="M4,7 H176" stroke="#8D6815" stroke-width="2.5"/>
      </g>
      <rect x="-14" y="-12" width="16" height="24" fill="url(#eLaton)" stroke="#6E500E" stroke-width="1.5"/>
      <circle cx="-56" cy="0" r="46" fill="url(#eLaton)" stroke="#6E500E" stroke-width="2"/>
      <circle cx="-82" cy="0" r="10" fill="#14134F" stroke="#6E500E" stroke-width="2"/>
    </g>
  </g>`;

  const CSS = `
  #entrada .ent-lamas, #entrada .ent-chispas { position: absolute; inset: 0; }
  #entrada .ent-lama { position: absolute; left: 0; width: 100%; display: block; will-change: transform; }
  #entrada .ent-chispas { pointer-events: none; z-index: 4; }
  #entrada svg { position: absolute; z-index: 3; left: 50%; top: 56%; width: min(92vw, 54vh); height: auto; transform: translate(-50%, -50%); overflow: visible; }
  #entrada .ent-caja { position: absolute; z-index: 5; left: 0; right: 0; top: 0; height: clamp(16px, 2.6vh, 26px); background: linear-gradient(180deg, #2A2B3A, #0B0B22); box-shadow: 0 6px 14px rgba(0,0,0,.55); }
  #entrada .ent-texto { position: absolute; z-index: 5; left: 16px; right: 16px; bottom: max(4.5vh, calc(14px + env(safe-area-inset-bottom))); text-align: center; color: #fff; font: 800 clamp(1.02rem, 2.4vh, 1.35rem) Archivo, 'Arial Black', sans-serif; letter-spacing: .01em; text-shadow: 0 2px 0 rgba(0,0,0,.45); }
  #entrada .ent-saltar { position: absolute; z-index: 6; right: 12px; top: calc(clamp(16px, 2.6vh, 26px) + 10px + env(safe-area-inset-top)); min-height: 40px; padding: 8px 15px; border-radius: 10px; border: 1.5px solid rgba(255,255,255,.6); background: rgba(12,11,64,.72); color: #fff; font: 700 .9rem Inter, sans-serif; cursor: pointer; }
  #entrada .ent-saltar:hover { background: #F4E31A; color: #12115E; border-color: #F4E31A; }`;

  function pintarLamas(cont, W, H) {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const alto = Math.max(32, Math.round(H / 21)), n = Math.ceil(H / alto) + 1;
    // Un único dibujo repartido entre las lamas: al separarse, las letras se parten
    const arte = document.createElement('canvas');
    arte.width = Math.round(W * dpr); arte.height = Math.round(n * alto * dpr);
    const a = arte.getContext('2d'); a.scale(dpr, dpr);
    const fondo = a.createLinearGradient(0, 0, W, n * alto);
    fondo.addColorStop(0, '#22209A'); fondo.addColorStop(.55, '#1B1A86'); fondo.addColorStop(1, '#12115E');
    a.fillStyle = fondo; a.fillRect(0, 0, W, n * alto);
    a.textAlign = 'center'; a.textBaseline = 'middle';
    a.font = '900 100px Archivo, "Arial Black", sans-serif';
    const tam = Math.min(100 * (W * .88) / a.measureText('FERSAMAN').width, H * .115);
    const yT = Math.max(H * .125, 104);
    a.font = `900 ${tam}px Archivo, "Arial Black", sans-serif`;
    a.fillStyle = '#0B0A45'; a.fillText('FERSAMAN', W / 2 + tam * .045, yT + tam * .05);
    a.fillStyle = '#F4E31A'; a.fillText('FERSAMAN', W / 2, yT);
    a.font = `700 ${Math.max(11, tam * .17)}px Inter, Arial, sans-serif`;
    a.fillStyle = '#fff'; a.fillText('FERRETERÍA · TUDELA DE DUERO', W / 2, yT + tam * .72);

    const lamas = [];
    for (let i = 0; i < n; i++) {
      const c = document.createElement('canvas');
      c.className = 'ent-lama'; c.width = arte.width; c.height = Math.round(alto * dpr);
      c.style.top = i * alto + 'px'; c.style.height = alto + 'px';
      const x = c.getContext('2d');
      x.drawImage(arte, 0, -Math.round(i * alto * dpr));
      const luz = x.createLinearGradient(0, 0, 0, c.height);
      luz.addColorStop(0, 'rgba(255,255,255,.26)'); luz.addColorStop(.16, 'rgba(255,255,255,.05)');
      luz.addColorStop(.62, 'rgba(0,0,0,0)'); luz.addColorStop(.92, 'rgba(0,0,0,.34)'); luz.addColorStop(1, 'rgba(0,0,0,.62)');
      x.fillStyle = luz; x.fillRect(0, 0, c.width, c.height);
      cont.appendChild(c); lamas.push(c);
    }
    return { lamas, alto, n };
  }

  async function iniciar(op) {
    const raiz = document.getElementById('entrada');
    let acabado = false, tl = null, vigilante = null, portadaHecha = false;
    const portada = () => { if (!portadaHecha) { portadaHecha = true; op.portada && op.portada(); } };
    const acabar = () => {
      if (acabado) return; acabado = true;
      clearTimeout(vigilante); gsap.ticker.remove(paso); removeEventListener('keydown', tecla);
      if (tl) tl.kill();
      try { sessionStorage.setItem('fersaman_entrada', '1'); } catch (e) {}
      portada();
      document.documentElement.classList.remove('con-entrada');
      raiz.remove();
      op.fin && op.fin();
    };
    const saltar = () => { if (tl) tl.kill(); portada(); gsap.to(raiz, { autoAlpha: 0, duration: .25, onComplete: acabar }); };
    const tecla = e => { if (e.key === 'Escape') saltar(); };

    // ---------- Chispas ----------
    let ctx = null, chispas = [], emitiendo = null;
    const paso = () => avanzar(Math.min(gsap.ticker.deltaRatio() / 60, .05));
    function avanzar(dt) {
      if (!ctx) return;
      const lienzo = ctx.canvas;
      ctx.clearRect(0, 0, lienzo.width, lienzo.height);
      if (emitiendo) for (let i = 0; i < 5; i++) chispas.push({
        x: emitiendo.x, y: emitiendo.y, vx: 90 + Math.random() * 420, vy: -170 + Math.random() * 330, v: 1, d: .28 + Math.random() * .5
      });
      ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      chispas = chispas.filter(c => (c.v -= dt / c.d) > 0);
      for (const c of chispas) {
        const x0 = c.x, y0 = c.y;
        c.vy += 720 * dt; c.x += c.vx * dt; c.y += c.vy * dt;
        ctx.strokeStyle = c.v > .55 ? `rgba(255,244,170,${c.v})` : `rgba(255,${Math.round(120 + 110 * c.v)},30,${c.v})`;
        ctx.lineWidth = 1 + c.v * 1.5;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(c.x, c.y); ctx.stroke();
      }
    }

    try {
      const est = document.createElement('style'); est.textContent = CSS; document.head.appendChild(est);
      if (document.fonts && document.fonts.load) {
        await Promise.race([Promise.all([document.fonts.load('900 40px Archivo'), document.fonts.load('700 14px Inter')]), new Promise(r => setTimeout(r, 650))]);
      }
      const W = innerWidth, H = innerHeight;
      raiz.innerHTML = `<div class="ent-lamas"></div><svg viewBox="0 0 600 660" aria-hidden="true">${ESCENA}</svg><canvas class="ent-chispas"></canvas><div class="ent-caja"></div><div class="ent-texto" role="status">Un segundo, que abrimos…</div><button class="ent-saltar" type="button">Saltar</button>`;
      const q = s => raiz.querySelector(s);
      const { lamas, alto, n } = pintarLamas(q('.ent-lamas'), W, H);
      const lienzo = q('.ent-chispas'); lienzo.width = W; lienzo.height = H; ctx = lienzo.getContext('2d');
      q('.ent-saltar').addEventListener('click', saltar);
      addEventListener('keydown', tecla);
      // ?intro=fijo: la animación no corre sola y se avanza con FersamanEntrada.fotograma(t) (para grabar el vídeo)
      const fijo = /[?&]intro=fijo\b/.test(location.search);
      if (!fijo) {
        gsap.ticker.add(paso);
        vigilante = setTimeout(acabar, 11000); // pase lo que pase, la web nunca se queda tapada
      }

      // ---------- Estado de la escena ----------
      const svg = q('svg'), llave = q('#eLlave'), fresa = q('#eFresa'), maquina = q('#eMaquina'), caida = q('#eCaida'), arco = q('#eArco');
      const hecho = q('#eHechoR'), falta = q('#eFaltaR'), visible = q('#eVisibleR');
      const CORTE_Y = 196, R = 56, AGUJERO_Y = 468;
      const e = { x: -190, y: CORTE_Y, r: 0, s: 1, giro: 1, corte: 0, meter: false, fresaY: -150, ang: 0, arco: 0, cae: 0, caeR: 0, tiembla: 0 };
      const pintar = () => {
        llave.setAttribute('transform', `translate(${e.x} ${e.y}) rotate(${e.r}) scale(${e.s} ${e.s * e.giro})`);
        hecho.setAttribute('width', e.corte + 1);
        falta.setAttribute('x', e.corte); falta.setAttribute('width', Math.max(0, 200 - e.corte));
        visible.setAttribute('width', (e.meter ? Math.max(0, Math.min(197, (e.y - AGUJERO_Y) / e.s)) : 200) + 1);
        const yFresa = CORTE_Y + perfil(e.corte) - R;
        fresa.setAttribute('transform', `translate(300 ${yFresa}) rotate(${e.ang})`);
        maquina.setAttribute('transform', `translate(0 ${e.fresaY + yFresa - (CORTE_Y - 17 - R)})`);
        arco.setAttribute('transform', `translate(0 ${e.arco})`);
        caida.setAttribute('transform', `translate(${e.tiembla} ${e.cae}) rotate(${e.caeR} 300 430)`);
      };
      pintar();
      const girarFresa = () => { e.ang = (e.ang + 26) % 360; };
      if (!fijo) gsap.ticker.add(girarFresa);
      const puntoPantalla = () => {
        const m = svg.getScreenCTM(); if (!m) return null;
        return { x: 300 * m.a + m.e, y: (CORTE_Y + perfil(e.corte)) * m.d + m.f };
      };
      const texto = q('.ent-texto');
      const aviso = op.abierto ? '¡Pasa, estamos abiertos!' : 'Ahora cerrado, pero la web no cierra';

      // ---------- Guion (unos 6 s) ----------
      tl = gsap.timeline({ paused: fijo, onUpdate: pintar, onComplete: fijo ? null : acabar });
      tl.from(texto, { y: 16, autoAlpha: 0, duration: .4, ease: 'power2.out' }, 0)
        .to(e, { fresaY: 0, duration: .45, ease: 'back.out(1.3)' }, .05)
        .to(e, { x: 300, duration: .6, ease: 'power3.out' }, .2)
        .call(() => { emitiendo = puntoPantalla(); }, null, .82)
        .to(e, { corte: 196, x: 104, duration: 1.75, ease: 'none',
          onUpdate() { if (emitiendo) emitiendo = puntoPantalla(); } }, .82)
        .call(() => { emitiendo = null; }, null, 2.57)
        .to(e, { fresaY: -120, duration: .34, ease: 'power2.in' }, 2.6)
        .to(maquina, { autoAlpha: 0, duration: .24 }, 2.68)
        .call(() => gsap.ticker.remove(girarFresa), null, 3)
        .to(e, { x: 300, y: 590, r: -90, s: .5, duration: .68, ease: 'power2.inOut' }, 2.72)
        .call(() => { e.meter = true; }, null, 3.4)
        .to(e, { y: 478, duration: .3, ease: 'power2.in' }, 3.42)
        .to(e, { giro: .16, duration: .24, ease: 'power2.inOut' }, 3.76)
        .to(e, { arco: -25, duration: .13, ease: 'power4.out' }, 4)
        .to(e, { tiembla: 4, duration: .04, repeat: 3, yoyo: true }, 4)
        .to(texto, { autoAlpha: 0, y: -8, duration: .12 }, 4.02)
        .call(() => { texto.textContent = aviso; }, null, 4.15)
        .fromTo(texto, { y: 10, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .24, immediateRender: false }, 4.16)
        .to(e, { cae: 900, caeR: 38, duration: .62, ease: 'power2.in' }, 4.2)
        .to(q('#eHembrilla'), { autoAlpha: 0, duration: .15 }, 4.72)
        // Las lamas se separan y entra la luz de la tienda por las rendijas
        .set(raiz, { background: 'transparent' }, 4.7)
        .to(lamas, { y: i => -(n - 1 - i) * 7, duration: .42, ease: 'power2.out' }, 4.72)
        .call(portada, null, 5.1)
        .to(lamas, { y: () => -(H + alto * 2 + n * 7), duration: 1.05, ease: 'power2.inOut', stagger: { each: .006, from: 'start' } }, 5.14)
        .to(texto, { autoAlpha: 0, duration: .2 }, 5.5)
        .to(q('.ent-saltar'), { autoAlpha: 0, duration: .15 }, 5.3)
        .to(q('.ent-caja'), { yPercent: -110, duration: .25, ease: 'power2.in' }, 6.15);
      if (fijo) api.fotograma = t => { girarFresa(); tl.time(t, false); pintar(); avanzar(1 / 30); return tl.duration(); };
    } catch (err) {
      acabar();
    }
  }
  const api = { iniciar };
  return api;
})();
