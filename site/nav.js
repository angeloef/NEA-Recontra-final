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
