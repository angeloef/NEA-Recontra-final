/* ------------------------------------------------------------------ medicion
   Va aca y no en app.js porque nav.js es el unico script que cargan las once
   paginas. Mientras los IDs sigan en PONER-*, no se pide nada a la red: el sitio
   se publica sin analitica rota y arranca sola el dia que pegues los IDs.
   Los IDs de medicion son publicos por diseno (viajan en el HTML de cualquier
   sitio que los use); no son secretos y no hay nada que ocultar aca. */
(() => {
  const GA4 = 'PONER-GA4';         // G-XXXXXXXXXX  (Google Analytics 4)
  const CLARITY = 'PONER-CLARITY'; // xxxxxxxxxx    (Microsoft Clarity)

  // Se valida la forma del ID, no que deje de ser el placeholder: asi un ID
  // vacio o a medio pegar tampoco dispara una request rota.
  if (/^G-[A-Z0-9]{6,}$/.test(GA4)) {
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', GA4, { anonymize_ip: true });
  }

  if (/^[a-z0-9]{8,}$/.test(CLARITY)) {
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', CLARITY);
  }

  /* Conversiones: todo click a WhatsApp cuenta como lead. Delegado en document,
     asi cubre tambien el estimador que app.js inyecta despues. */
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href*="wa.me"]');
    if (!a || typeof gtag !== 'function') return;
    gtag('event', 'generate_lead', { method: 'whatsapp', link_url: a.href });
  }, true);
})();

/* Barra de las subpáginas: toma el color de la sección que tiene detrás, igual que
   la de la home. Ahí esa lógica vive en app.js y depende de las secciones propias
   del home; acá se resuelve leyendo el fondo real de lo que hay debajo, así sirve
   para las nueve páginas sin que ninguna tenga que declarar nada. */
(() => {
  'use strict';

  const nav = document.getElementById('nav');
  if (!nav) return;

  const NEGRO = [10, 10, 10], BLANCO = [245, 244, 240];

  const lin = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); };
  const luz = c => .2126 * lin(c[0]) + .7152 * lin(c[1]) + .0722 * lin(c[2]);

  // Primer fondo opaco por debajo del borde inferior de la barra. Hay que subir por
  // el árbol porque casi todos los contenedores son transparentes. Se prueban tres
  // puntos por si el del medio cae sobre una tarjeta suelta.
  function fondoDetras() {
    const alto = nav.getBoundingClientRect().height || 88;
    const y = Math.round(alto + 6);
    const puntos = [innerWidth * .5, innerWidth * .2, innerWidth * .8];
    for (let i = 0; i < puntos.length; i++) {
      let el = document.elementFromPoint(Math.round(puntos[i]), y);
      while (el && el !== document.documentElement) {
        if (el !== nav && !nav.contains(el)) {
          const m = (getComputedStyle(el).backgroundColor || '').match(/[\d.]+/g);
          if (m && (m.length < 4 || +m[3] > .5)) return [+m[0], +m[1], +m[2]];
        }
        el = el.parentElement;
      }
    }
    return NEGRO;
  }

  let raf = 0, previo = '';

  function pintar() {
    raf = 0;
    const c = fondoDetras();
    const css = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
    if (css === previo) return;
    previo = css;

    nav.style.background = css;
    // mismo umbral que usa la home para decidir tinta clara u oscura
    const claro = luz(c) >= .21;
    nav.style.color = claro ? 'rgb(' + NEGRO.join(',') + ')' : 'rgb(' + BLANCO.join(',') + ')';
    // El desplegable de "Servicios" acompaña a la barra: sin esto quedaba
    // oscuro sobre una barra clara, como en las paginas legales.
    nav.style.setProperty('--nav-panel-bg', css);
    nav.style.setProperty('--nav-panel-fg', claro ? 'rgb(' + NEGRO.join(',') + ')' : 'rgb(' + BLANCO.join(',') + ')');

    const logo = nav.querySelector('img');
    if (logo) {
      const archivo = 'Nea_logo_' + (claro ? 'negro' : 'blanco') + '.png';
      const actual = logo.getAttribute('src') || '';
      if (!actual.endsWith(archivo)) logo.setAttribute('src', actual.replace(/Nea_logo_\w+\.png/, archivo));
    }
  }

  const pedir = () => { if (!raf) raf = requestAnimationFrame(pintar); };
  addEventListener('scroll', pedir, { passive: true });
  addEventListener('resize', pedir, { passive: true });
  pintar();
})();

/* ================================================ Desplegable "Servicios"
   El <details> ya abre y cierra solo, con mouse y con teclado. Lo unico que
   el navegador no hace es cerrarlo al tocar fuera o al apretar Escape. */
(() => {
  'use strict';
  const abiertos = () => document.querySelectorAll('#nav details[open],.nea-links details[open]');
  const cerrar = e => abiertos().forEach(d => { if (!e || !d.contains(e.target)) d.open = false; });
  document.addEventListener('click', cerrar);
  addEventListener('keydown', e => { if (e.key === 'Escape') cerrar(null); });
})();

/* ============================================================ Menu mobile
   Abajo de 1000px la tira de links no entra: se reemplaza por una hamburguesa
   y un panel a pantalla completa. El panel se arma clonando los links que la
   barra ya tiene, asi las diez paginas comparten el mismo menu sin declarar
   nada propio. Estilos en menu.css. */
(() => {
  'use strict';

  // Home y subpaginas tienen barras distintas; lo unico que hace falta es la
  // fila donde meter el boton y de donde salen los links.
  const barra = document.getElementById('nea-navbg') || document.querySelector('#nav .in');
  if (!barra) return;

  const fuente = document.getElementById('nea-navlinks') || barra.querySelector('nav');
  const links = fuente ? Array.from(fuente.querySelectorAll('a')) : [];
  if (!links.length) return;

  // El CTA de la barra (lima en la home, boton en las subpaginas) baja al pie
  // del panel: en telefono es la accion, no un adorno de la barra.
  const ctaOrig = document.getElementById('nea-navcta') || barra.querySelector('.cta');
  const contacto = barra.querySelector('a[href="#contacto"]');

  const burger = document.createElement('button');
  burger.type = 'button';
  burger.className = 'nea-burger';
  burger.id = 'nea-burger';
  burger.setAttribute('aria-expanded', 'false');
  burger.setAttribute('aria-controls', 'nea-menu');
  burger.setAttribute('aria-label', 'Abrir menú');
  burger.innerHTML = '<span></span><span></span>';

  const panel = document.createElement('div');
  panel.className = 'nea-menu';
  panel.id = 'nea-menu';
  panel.hidden = true;

  const lista = document.createElement('nav');
  lista.setAttribute('aria-label', 'Menú');
  const items = links.slice();
  if (contacto) items.push(contacto);
  items.forEach((a, i) => {
    const copia = document.createElement('a');
    copia.href = a.getAttribute('href');
    copia.textContent = a.textContent.trim();
    if (a.hasAttribute('aria-current')) copia.setAttribute('aria-current', a.getAttribute('aria-current'));
    copia.style.setProperty('--i', String(i));
    lista.appendChild(copia);
  });
  panel.appendChild(lista);

  if (ctaOrig) {
    const cta = document.createElement('a');
    cta.href = ctaOrig.getAttribute('href');
    cta.className = 'nea-menu-cta';
    cta.textContent = ctaOrig.textContent.trim();
    cta.style.setProperty('--i', String(items.length));
    panel.appendChild(cta);
  }

  // En la home el CTA y "Contacto" viven en un contenedor propio dentro de la
  // barra: en telefono se apagan enteros y su lugar lo toma el panel.
  if (ctaOrig && ctaOrig.parentElement !== barra) ctaOrig.parentElement.classList.add('nea-navactions');

  barra.appendChild(burger);
  document.body.appendChild(panel);

  let abierto = false;

  function abrir() {
    if (abierto) return;
    abierto = true;
    panel.hidden = false;
    // forzar el reflow entre mostrar y animar: sin esto el navegador colapsa
    // los dos estados y el panel aparece de golpe. Es sincronico a proposito,
    // un requestAnimationFrame no corre si la pestaña no esta pintando.
    void panel.offsetHeight;
    // La X sale de la barra y pasa al body mientras el panel esta abierto: la
    // barra es un stacking context propio (z-index 90) y ahi adentro el 97 del
    // boton no le gana al 96 del panel, asi que la X no se podia tocar.
    document.body.appendChild(burger);
    panel.classList.add('is-open');
    burger.classList.add('is-open');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Cerrar menú');
    document.documentElement.classList.add('nea-menulock');
    // el foco entra al panel: con teclado o lector, si no queda atras del sheet
    const primero = panel.querySelector('a');
    if (primero) primero.focus({ preventScroll: true });
  }

  function cerrar() {
    if (!abierto) return;
    abierto = false;
    panel.classList.remove('is-open');
    burger.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Abrir menú');
    barra.appendChild(burger);
    document.documentElement.classList.remove('nea-menulock');
    // el hidden espera a que termine el fundido; si mientras tanto se vuelve a
    // abrir, el guard de arriba deja todo como estaba
    setTimeout(() => { if (!abierto) panel.hidden = true; }, 320);
  }

  burger.addEventListener('click', () => { if (abierto) { cerrar(); burger.focus(); } else abrir(); });

  /* Escapes naturales del panel, ademas de la X y de Escape:
     - tocar el vacio: es una hoja, el aire alrededor de los links cierra
     - deslizar hacia arriba: bajo desde arriba, se va por donde vino
     El swipe solo cuenta si la lista entra entera en pantalla; si tiene scroll
     propio, ese mismo movimiento es leer el resto del menu. */
  panel.addEventListener('click', e => {
    if (e.target.closest('a')) { cerrar(); return; }
    if (e.target === panel) { cerrar(); burger.focus(); }
  });

  let y0 = 0, x0 = 0, cabeEntera = true;
  panel.addEventListener('touchstart', e => {
    const t = e.touches[0];
    y0 = t.clientY; x0 = t.clientX;
    cabeEntera = panel.scrollHeight <= panel.clientHeight + 2;
  }, { passive: true });
  panel.addEventListener('touchend', e => {
    if (!abierto || !cabeEntera) return;
    const t = e.changedTouches[0];
    const dy = y0 - t.clientY;
    if (dy < 56 || Math.abs(t.clientX - x0) > dy) return;
    cerrar();
    burger.focus();
  }, { passive: true });
  addEventListener('keydown', e => { if (e.key === 'Escape' && abierto) { cerrar(); burger.focus(); } });
  // Al pasar a escritorio el panel deja de existir visualmente: hay que soltar
  // el scroll o la pagina queda trabada.
  addEventListener('resize', () => { if (abierto && innerWidth >= 1000) cerrar(); });
})();

/* ====================================================== Pull-to-refresh
   El gesto de recargar tiene que existir, pero solo donde se espera: arriba
   de todo. Mas abajo el mismo movimiento es "cerrar esta hoja" (la card del
   estimador, la estimacion, el menu), y ahi Chrome recargaba la pagina en vez
   de dejar pasar el gesto. La clase la lee menu.css. */
(() => {
  'use strict';
  const raiz = document.documentElement;
  const marcar = () => raiz.classList.toggle('nea-top', scrollY <= 0);
  addEventListener('scroll', marcar, { passive: true });
  addEventListener('resize', marcar, { passive: true });
  marcar();
})();
