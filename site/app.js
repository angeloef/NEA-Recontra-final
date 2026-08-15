/* NEA Sistemas — runtime propio. Sin dependencias, sin CDN. */
(() => {
  'use strict';

  const SCROLL_PACE = 3;

  const cl = (n, a, b) => Math.max(a, Math.min(b, n));
  const lp = (a, b, t) => a + (b - a) * t;
  const ez = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  const el = {};
  [
    'runway', 'stage', 'frame', 'video', 'scene', 'hero', 's2bg', 's2text', 'h1',
    'cta2', 'nav', 'navbg', 'navlinks', 'navcta', 'navlogo', 'logo',
    'navlinksA', 'designbg'
  ].forEach(k => { el[k] = document.getElementById('nea-' + k); });

  const pace = Math.max(1.8, Math.min(5, SCROLL_PACE));
  if (el.runway) el.runway.style.height = (pace * 100) + 'vh';

  /* El video del hero es el unico movimiento que corre sin que el usuario haga nada:
     con prefers-reduced-motion queda en el primer frame (el poster ya cubre el resto).
     Se escucha el cambio de preferencia, no solo el valor al cargar. */
  (() => {
    if (!el.scene) return;
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => { mq.matches ? el.scene.pause() : el.scene.play().catch(() => {}); };
    mq.addEventListener('change', apply);
    apply();
  })();

  /* En pantallas tactiles se apagan los efectos que dependen del cursor: la lupa de
     "Analizar" (que sigue al mouse) y el giro de las estrellas de "Diseñar". No es
     solo que no haya con que dispararlos: en un telefono son dos bucles de animacion
     compitiendo con el scroll. Se mide una vez, al cargar. */
  const TACTIL = matchMedia('(hover: none), (max-width: 860px)').matches;

  /* ---- estado de layout cacheado entre frames ---- */
  let vwPrev, vhPrev, hhMax = 0;
  let steps, words, panels, dots, rig;
  let procPr = 0, procOn = false;
  let ink, inkBases, proceso, nosotros, galeria, bgColor, bgLum;
  let galRig, galFrame;
  let grid = null, estrellas = null, ascii = null;
  const INK_TARGETS = {
    strong: [255, 255, 255], muted: [221, 227, 255], word: [143, 166, 255],
    line: [255, 255, 255], chip: [255, 255, 255], rule: [255, 255, 255]
  };

  /* ---------------------------------------------------------------- scroll */

  function update() {
    if (!el.runway || !el.video) return;
    const vw = innerWidth, vh = innerHeight;

    const total = Math.max(1, el.runway.offsetHeight - vh);
    const p = cl(-el.runway.getBoundingClientRect().top / total, 0, 1);
    const A = .34, H = .5;
    const ea = ez(cl(p / A, 0, 1));
    const ec = ez(cl((p - H) / (1 - H), 0, 1));
    const rawC = cl((p - H) / (1 - H), 0, 1);

    const narrow = vw < 1000;

    // hero copy: from inside the white bar down to the bottom-left corner
    const hh = el.hero.offsetHeight;
    if (vwPrev !== vw || vhPrev !== vh) { vwPrev = vw; vhPrev = vh; hhMax = 0; }
    hhMax = Math.max(hhMax, hh);
    const logoH = el.logo ? el.logo.offsetHeight : 66;
    // the bar always grows to fit nav + logo + copy, so the hero never spills onto the video
    const frameH = Math.round(Math.max(88 + logoH + 28 + hhMax + 21, Math.min(570, vh * .62)));
    el.frame.style.height = frameH + 'px';
    el.frame.style.transform = 'translate3d(0,' + (-frameH * ea) + 'px,0)';

    const top0 = Math.max(88 + logoH + 28, frameH - hhMax - 21);
    el.hero.style.top = top0 + 'px';
    if (el.logo) el.logo.style.top = Math.max(96, Math.min(frameH - 392, top0 - logoH - 28)) + 'px';
    const pad = vw >= 1920 ? 54 : Math.max(20, Math.round(vw * .028));
    el.hero.style.transform = 'translate3d(0,' + lp(0, (vh - pad - hh) - top0, ea) + 'px,0)';
    el.hero.style.opacity = String(1 - cl(rawC / .34, 0, 1));

    // video: framed strip -> full bleed -> floating card
    const k0 = { l: 8, r: 8, t: frameH, b: 0, rad: 24 };
    const k1 = { l: 0, r: 0, t: 0, b: 0, rad: 0 };
    const k2 = narrow
      ? { l: vw * .1, r: vw * .1, t: vh * .58, b: vh * .1, rad: 12 }
      : { l: vw * .577, r: vw * .0225, t: vh * .232, b: vh * .285, rad: 13 };
    const st = {};
    ['l', 'r', 't', 'b', 'rad'].forEach(k => {
      st[k] = lp(lp(k0[k], k1[k], ea), k2[k], ec);
    });
    const v = el.video.style;
    v.left = st.l + 'px'; v.right = st.r + 'px'; v.top = st.t + 'px'; v.bottom = st.b + 'px';
    v.borderRadius = st.rad + 'px ' + st.rad + 'px ' + lp(0, st.rad, ec) + 'px ' + lp(0, st.rad, ec) + 'px';
    v.boxShadow = ec > .02 ? '0 ' + (30 * ec) + 'px ' + (70 * ec) + 'px rgba(0,0,0,' + (.45 * ec) + ')' : 'none';

    // section two
    el.s2bg.style.opacity = String(cl(rawC / .5, 0, 1));
    const t2 = cl((rawC - .16) / .58, 0, 1);
    el.s2text.style.opacity = String(ez(t2));
    el.s2text.style.transform = 'translate3d(' + lp(-52, 0, ez(t2)) + 'px,0,0)';
    el.s2text.style.maxWidth = narrow ? '100%' : 'min(760px,62vw)';
    if (narrow) { el.s2text.style.justifyContent = 'flex-start'; el.s2text.style.paddingTop = (vh * .16) + 'px'; }

    // process section: pinned scroll-jack, one step revealed at a time
    if (!steps) {
      steps = Array.from(document.querySelectorAll('[data-nea-step]'));
      words = Array.from(document.querySelectorAll('[data-nea-word]'));
      panels = Array.from(document.querySelectorAll('[data-nea-panel]'));
      dots = Array.from(document.querySelectorAll('[data-nea-dot]'));
      rig = document.getElementById('nea-procrig');
    }
    const stack = vw < 1120;
    steps.forEach(s => {
      s.style.position = stack ? 'static' : 'absolute';
      s.style.transform = stack ? 'none' : 'translateY(-50%)';
      s.style.width = stack ? 'auto' : 'min(460px,42vw)';
      s.style.maxWidth = stack ? '620px' : 'none';
      s.style.order = stack ? '2' : '0';
      s.style.marginTop = stack ? '18px' : '0';
    });
    words.forEach(w => {
      w.style.textAlign = stack ? 'left' : (w.dataset.neaWord === '2' ? 'left' : 'right');
      w.style.fontSize = stack ? 'clamp(52px,13vw,120px)' : 'clamp(64px,15.6vw,300px)';
    });
    if (rig) {
      const rr = rig.getBoundingClientRect();
      procPr = cl(-rr.top / Math.max(1, rr.height - vh), 0, 1);
      procOn = rr.top < vh && rr.bottom > 0;
      const n = panels.length, seg = procPr * n;
      const active = Math.min(n - 1, Math.floor(seg));
      panels.forEach((pn, i) => {
        const d = seg - i + .25;
        const inT = cl(d / .25, 0, 1), outT = i === n - 1 ? 0 : cl((d - 1) / .25, 0, 1);
        const o = inT * (1 - outT);
        pn.style.opacity = String(o);
        pn.style.transform = 'translate3d(0,' + (lp(56, 0, ez(inT)) - outT * 46) + 'px,0)';
        pn.style.pointerEvents = o > .6 ? 'auto' : 'none';
      });
      dots.forEach((dt, i) => { dt.style.opacity = i === active ? '1' : '.22'; });
    }

    /* Galeria: siempre a pantalla completa, la entrada es un push-in desde el negro con el
       que termina "Proceso" — la imagen sale de la nada y se asienta justo cuando el frame
       queda clavado arriba. El recorrido es el ultimo viewport antes de que agarre el pin. */
    if (galFrame === undefined) {
      galRig = document.getElementById('galeria');
      galFrame = galRig ? galRig.querySelector('.js-trail-content') : null;
    }
    // 848px == el breakpoint 52.99em del CSS, donde el pin y la entrada se apagan
    if (galFrame && vw >= 848) {
      const t = ez(cl((vh - galRig.getBoundingClientRect().top) / vh, 0, 1));
      galFrame.style.opacity = cl(t * 1.35, 0, 1).toFixed(3);
      galFrame.style.transform = 'scale(' + (1 + .1 * (1 - t)).toFixed(4) + ')';
    }

    paintBackdrop(vh);

    // nav: full-width bar, colour follows whatever is behind it
    const nav = el.nav.style, bg = el.navbg.style;
    nav.opacity = String(cl((p / A - .3) / .7, 0, 1));
    nav.pointerEvents = p > A * .5 ? 'auto' : 'none';
    bg.width = vw + 'px';
    bg.padding = '0 ' + (narrow ? 20 : 32) + 'px';
    // "covered" must mean the video actually spans the whole nav band, not just that its top edge is high
    const covered = st.t < 4 && st.l < 4 && st.r < 4;
    bg.background = covered ? 'transparent' : (bgColor || '#FFFFFF');
    const fg = covered || (bgLum !== undefined && bgLum < .21) ? 255 : 10;
    el.navbg.style.color = 'rgb(' + fg + ',' + fg + ',' + fg + ')';
    const navLogoImg = document.getElementById('nea-navlogoimg');
    if (navLogoImg) {
      const src = 'uploads/Nea_logo_' + (fg > 128 ? 'blanco' : 'negro') + '.png';
      if (!navLogoImg.getAttribute('src').endsWith(src)) navLogoImg.setAttribute('src', src);
    }
    el.navlinks.style.display = narrow ? 'none' : 'flex';
    if (el.navlinksA) el.navlinksA.style.display = vw < 700 ? 'none' : 'flex';
  }

  /* ------------------------------------------------------------- backdrop */

  function paintBackdrop(vh) {
    if (!ink) {
      ink = Array.from(document.querySelectorAll('[data-ink]'));
      proceso = document.getElementById('proceso');
      nosotros = document.getElementById('nosotros');
      // la galeria es lo primero negro despues de "Proceso": el fondo tiene que quedar en
      // negro desde que entra ella, no desde "Nosotros", o el rig de 200vh vuelve al azul
      galeria = document.getElementById('galeria');
      inkBases = ink.map(node => {
        const c = getComputedStyle(node).color.match(/[\d.]+/g).map(Number);
        return [c[0], c[1], c[2]];
      });
    }
    if (!proceso || !nosotros) return;

    const rgb = (a, b, t) =>
      'rgb(' + Math.round(lp(a[0], b[0], t)) + ',' + Math.round(lp(a[1], b[1], t)) + ',' + Math.round(lp(a[2], b[2], t)) + ')';
    const mix = (a, b, t) => [lp(a[0], b[0], t), lp(a[1], b[1], t), lp(a[2], b[2], t)];
    const WHITE = [255, 255, 255], BLUE = [49, 87, 255], BLACK = [10, 10, 10];
    // Este es el color PLANO al que llega el fondo en "Diseñar". Tiene que ser el
    // crema base del gradiente de #nea-designbg (#F8F1E0), no el lima de marca: el
    // nav pinta este mismo color, y si no coinciden la barra se ve como una franja
    // de otro tono flotando sobre el gradiente.
    const PALE = [221, 227, 255], YELLOW = [248, 241, 224];
    const enter = (node, span, at) => cl(((vh * (at || 1)) - node.getBoundingClientRect().top) / (vh * span), 0, 1);

    // the services section stays black-on-white: the blue only starts once "Proceso" is nearly at the top
    const p1 = enter(proceso, .3, .34);
    const p2 = enter(galeria || nosotros, .5);
    // white -> pale blue (dark ink still reads) -> full blue, with the ink flip inside the short last leg
    const q = cl(p1 / .34, 0, 1);
    const leg = .88;
    const deep = cl((q - leg) / (1 - leg), 0, 1);
    let arr = deep > 0 ? mix(PALE, BLUE, deep) : mix(WHITE, PALE, q / leg);
    const seg = procPr * 3;
    // La textura de "Diseñar" sigue la misma curva que el color: entra cuando el fondo
    // vira al lima y se va cuando arranca a apagarse hacia el negro. Asi el cross-fade
    // es continuo y no se ve un corte entre el color plano y la imagen.
    // Las ventanas siguen al panel REAL. Con 3 paneles, "Diseñar" está pleno entre
    // seg 1.0 y 1.75 (ver inT/outT en update()), así que el lima y los destellos
    // viven ahí. Antes se estiraban hasta 2.15 y quedaban encima de "Construir".
    let designT = 0, toYellow = 0;
    if (procOn && seg > .8) {
      toYellow = cl((seg - .8) / .2, 0, 1);          // lima pleno al entrar Diseñar
      const toBlack = cl((seg - 1.75) / .2, 0, 1);   // negro pleno al entrar Construir
      arr = mix(mix(BLUE, YELLOW, toYellow), BLACK, toBlack);
      designT = toYellow * (1 - toBlack);
    }
    // La grilla entra junto con el azul (deep) y se va cuando el fondo vira al lima:
    // asi "Analizar" y "Diseñar" nunca se pisan.
    let gridT = deep * (1 - toYellow);
    if (p2 > 0) { arr = BLACK.slice(); designT = 0; gridT = 0; }
    if (el.designbg) el.designbg.style.opacity = designT.toFixed(3);
    if (grid) grid.set(gridT);

    // Las estrellas usan su propio 0→1: "Diseñar" ocupa de seg .8 a 1.95, o sea
    // que caen al entrar el lima y se van cuando empieza a virar al negro.
    if (estrellas) {
      let ep = cl((seg - .8) / 1.15, 0, 1);
      if (!procOn || p2 > 0) ep = seg > .8 ? 1 : 0;
      estrellas.set(ep);
    }

    // El ASCII se rearma cada vez que "Construir." entra en pantalla.
    if (ascii) ascii.set(procOn && seg > 1.8 && p2 <= 0);

    const bg = 'rgb(' + arr.map(Math.round).join(',') + ')';
    document.body.style.backgroundColor = bg;

    // flip from the backdrop's actual luminance, so whichever ink wins is always the one shown
    const lin = x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); };
    const c = bg.match(/[\d.]+/g).map(Number);
    bgLum = .2126 * lin(c[0]) + .7152 * lin(c[1]) + .0722 * lin(c[2]);
    bgColor = bg;

    const t = bgLum < .21 ? 1 : 0;

    /* Palabra ambiental legible sobre cualquier punto del degradado.
       Elige el extremo (blanco o negro) que deje mas recorrido de contraste desde el
       fondo, y avanza hacia el hasta cruzar WORD_CR. Si ni el extremo puro alcanza
       —pasa con fondos de luminancia media—, se queda en el extremo: es el maximo
       posible contra ese fondo. Busqueda binaria de 12 pasos, 3 nodos por frame. */
    const WORD_CR = 3.2;
    const relLum = c => .2126 * lin(c[0]) + .7152 * lin(c[1]) + .0722 * lin(c[2]);
    const ratio = (a, b) => {
      const L1 = relLum(a), L2 = relLum(b);
      return (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
    };
    function wordColor(bgArr) {
      const dest = ratio(bgArr, WHITE) >= ratio(bgArr, BLACK) ? WHITE : BLACK;
      if (ratio(bgArr, dest) <= WORD_CR) return rgb(bgArr.map(Math.round), dest, 1);
      let lo = 0, hi = 1;
      for (let k = 0; k < 12; k++) {
        const mid = (lo + hi) / 2;
        if (ratio(mix(bgArr, dest, mid), bgArr) < WORD_CR) lo = mid; else hi = mid;
      }
      return rgb(bgArr.map(Math.round), dest, hi);
    }

    ink.forEach((node, i) => {
      const kind = node.dataset.ink;
      if (kind === 'chip') {
        node.style.background = rgb(BLACK, WHITE, t);
        node.style.color = rgb(WHITE, BLACK, t);
        return;
      }
      // La palabra gigante sale del fondo mismo, empujada hacia el extremo con mas aire.
      // No sirve una mezcla fija: el fondo barre blanco -> azul -> lima -> negro, y el
      // mismo factor que alcanza sobre negro deja 2.2:1 sobre el azul. Se resuelve por
      // contraste, no por mezcla: se empuja lo justo hasta cruzar el 3:1 de texto grande.
      if (kind === 'word') node.style.color = wordColor(arr);
      else node.style.color = rgb(inkBases[i], INK_TARGETS[kind] || WHITE, t);
      if (kind === 'line' || kind === 'rule') {
        node.style.borderTopColor = t
          ? 'rgba(255,255,255,' + (kind === 'rule' ? .28 : .18) + ')'
          : 'rgba(10,10,10,' + (kind === 'rule' ? .16 : .12) + ')';
      }
    });
  }

  /* ------------------------------------------------- grilla de "Analizar" */

  // Malla deformada por ondas + el cursor. Dibuja sobre canvas y solo corre mientras
  // se ve: paintBackdrop le pasa la visibilidad y el bucle se apaga solo al llegar a 0.
  function initGrid() {
    const cv = document.getElementById('nea-grid');
    if (!cv || !cv.getContext) return null;
    const ctx = cv.getContext('2d');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Valores definidos en el banco de pruebas (lab/grid.html) y aprobados por el cliente.
    // Si se retocan, conviene volver a ese lab en vez de tantear acá.
    const GAP = 130;            // separación de la malla
    const GROSOR = 2;
    const AMPLITUD = 1;         // cuánto serpentea
    const FRECUENCIA = .1;      // ondas largas y suaves
    const VELOCIDAD = 0;        // malla quieta: solo se mueve con el cursor
    const RADIO = 200;          // alcance del cursor
    const EMPUJE = 52;          // cuánto corre cada nodo
    const FALLOFF = 1;          // caída lineal
    const INERCIA = .56;        // seguimiento elástico del cursor
    const OPACIDAD = .18;
    const LUPA_ZOOM = 1.15;
    const LUPA_RADIO = 250;
    const LUPA_BORDE = .64;     // aro del visor

    let w = 0, h = 0, raf = 0, vis = 0, dpr = 1;
    const mouse = { x: -9999, y: -9999, sx: -9999, sy: -9999, on: false };

    // El canvas de la malla va detras de todo (z-index:-1), asi que no puede tapar
    // el texto. Este segundo canvas va ENCIMA y pinta solo el circulo de la lupa:
    // fondo opaco + malla ampliada + la palabra gigante redibujada. Es un canvas,
    // no una copia del DOM, asi que no hay nada que mantener sincronizado.
    //
    // En mobile no se crea: la lupa sigue al cursor y sin cursor no tiene sentido.
    // Ademas es un canvas a pantalla completa por dpr, memoria que ahi no se regala.
    const cvL = TACTIL ? null : document.createElement('canvas');
    if (cvL) {
      cvL.setAttribute('aria-hidden', 'true');
      cvL.style.cssText = 'position:fixed;inset:0;z-index:60;pointer-events:none';
      document.body.appendChild(cvL);
    }
    const ctxL = cvL ? cvL.getContext('2d') : null;

    const resize = () => {
      dpr = Math.min(2, devicePixelRatio || 1);
      w = innerWidth; h = innerHeight;
      [cv, cvL].forEach(c => {
        if (!c) return;               // en mobile no hay canvas de lupa
        c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
        c.style.width = w + 'px'; c.style.height = h + 'px';
      });
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    addEventListener('resize', resize, { passive: true });
    addEventListener('pointermove', e => {
      mouse.x = e.clientX; mouse.y = e.clientY; mouse.on = true;
      if (vis > .001 && !raf) raf = requestAnimationFrame(draw);
    }, { passive: true });
    addEventListener('pointerleave', () => { mouse.on = false; });

    // Traza una polilínea suavizada pasando por los puntos medios.
    function curva(c, pts) {
      c.beginPath();
      c.moveTo(pts[0].x, pts[0].y);
      for (let k = 1; k < pts.length - 1; k++) {
        c.quadraticCurveTo(pts[k].x, pts[k].y, (pts[k].x + pts[k + 1].x) / 2, (pts[k].y + pts[k + 1].y) / 2);
      }
      c.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      c.stroke();
    }

    /* --- Texto redibujado para la lupa ---------------------------------
       Todo se lee del elemento real: posición, tipografía y color. El HTML sigue
       siendo la única fuente de verdad, no hay copia que mantener sincronizada. */

    const opacidadDe = nodo => {
      const panel = nodo.closest('[data-nea-panel]');
      return panel ? parseFloat(panel.style.opacity || '1') : 1;
    };
    const fuenteDe = cs => cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;

    // La caja de línea incluye el interlineado, así que centro el alto real del
    // glifo dentro de ella en vez de suponer dónde cae la línea de base.
    function baseline(c, txt, top, alto) {
      const m = c.measureText(txt);
      return top + (alto + (m.actualBoundingBoxAscent || 0) - (m.actualBoundingBoxDescent || 0)) / 2;
    }

    // Elementos de una sola línea: la palabra gigante, el "01" y el "PROCESO"
    // (que además lleva una rayita arriba, que no es texto sino un border-top).
    function pintarLinea(c, nodo) {
      if (!nodo) return;
      const r = nodo.getBoundingClientRect();
      if (!r.width || r.bottom < 0 || r.top > h) return;
      const op = opacidadDe(nodo);
      if (!(op > .01)) return;

      const cs = getComputedStyle(nodo);
      const txt = (nodo.textContent || '').trim();
      if (!txt) return;

      c.save();
      c.globalAlpha = op;
      const bw = parseFloat(cs.borderTopWidth) || 0;
      if (bw > 0) {
        c.fillStyle = cs.borderTopColor;
        c.fillRect(r.left, r.top, r.width, bw);
      }
      c.font = fuenteDe(cs);
      if ('letterSpacing' in c) c.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
      c.fillStyle = cs.color;
      const al = cs.textAlign === 'right' ? 'right' : cs.textAlign === 'center' ? 'center' : 'left';
      c.textAlign = al;
      c.textBaseline = 'alphabetic';
      const padTop = parseFloat(cs.paddingTop) || 0;
      const x = al === 'right' ? r.right : al === 'center' ? (r.left + r.right) / 2 : r.left;
      c.fillText(txt, x, baseline(c, txt, r.top + bw + padTop, r.height - bw - padTop));
      c.restore();
    }

    /* El párrafo sí tiene cortes de línea, y con text-wrap:pretty el navegador los
       balancea con un algoritmo que no se puede reproducir midiendo palabras. En
       vez de adivinar dónde corta, se lo preguntamos: recorriendo el nodo de texto
       con un Range, el carácter donde cambia la coordenada vertical es un salto de
       línea. Da los cortes exactos que se están viendo.
       Es O(n) en caracteres, así que se calcula una vez y se guarda; solo se rehace
       si cambia el ancho de la ventana, que es lo único que altera el wrap. */
    let lineasCache = null, cacheAncho = 0, cacheNodo = null;

    function medirLineas(p) {
      const t = p.firstChild;
      if (!t || t.nodeType !== 3) return [];
      const s = t.textContent;
      const base = p.getBoundingClientRect();
      const rango = document.createRange();
      const out = [];
      let ini = 0, top = null, alto = 0, left = 0;
      for (let i = 1; i <= s.length; i++) {
        rango.setStart(t, i - 1); rango.setEnd(t, i);
        const r = rango.getBoundingClientRect();
        if (!r.height) continue;                       // espacios colapsados al final de línea
        if (top === null) { top = r.top; alto = r.height; left = r.left; }
        else if (r.top - top > 1) {                    // cambió de renglón
          out.push({ txt: s.slice(ini, i - 1).trim(), dx: left - base.left, dy: top - base.top, alto: alto });
          ini = i - 1; top = r.top; alto = r.height; left = r.left;
        }
      }
      if (top !== null) out.push({ txt: s.slice(ini).trim(), dx: left - base.left, dy: top - base.top, alto: alto });
      return out;
    }

    function pintarParrafo(c, p) {
      if (!p) return;
      if (!lineasCache || cacheAncho !== w || cacheNodo !== p) {
        lineasCache = medirLineas(p); cacheAncho = w; cacheNodo = p;
      }
      if (!lineasCache.length) return;
      const op = opacidadDe(p);
      if (!(op > .01)) return;
      const r = p.getBoundingClientRect();
      if (r.bottom < 0 || r.top > h) return;

      const cs = getComputedStyle(p);
      c.save();
      c.globalAlpha = op;
      c.font = fuenteDe(cs);
      if ('letterSpacing' in c) c.letterSpacing = '0px';
      c.fillStyle = cs.color;
      c.textAlign = 'left';
      c.textBaseline = 'alphabetic';
      for (let i = 0; i < lineasCache.length; i++) {
        const L = lineasCache[i];
        c.fillText(L.txt, r.left + L.dx, baseline(c, L.txt, r.top + L.dy, L.alto));
      }
      c.restore();
    }

    // Las tres rayitas del paginador: rectángulos, no texto.
    function pintarDots(c) {
      const cont = document.getElementById('nea-procdots');
      if (!cont) return;
      const hijos = cont.children;
      for (let i = 0; i < hijos.length; i++) {
        const r = hijos[i].getBoundingClientRect();
        if (!r.width || r.bottom < 0 || r.top > h) continue;
        const cs = getComputedStyle(hijos[i]);
        c.save();
        c.globalAlpha = parseFloat(cs.opacity || '1');
        c.fillStyle = cs.backgroundColor;
        c.fillRect(r.left, r.top, r.width, r.height);
        c.restore();
      }
    }

    // Todo el contenido de la sección, en el orden en que se apila.
    function pintarSeccion(c) {
      const pin = document.getElementById('nea-procpin');
      if (pin) pintarLinea(c, pin.querySelector('[data-ink="rule"]'));
      pintarLinea(c, document.querySelector('[data-nea-word="1"]'));
      const paso = document.querySelector('[data-nea-step="1"]');
      if (paso) {
        pintarLinea(c, paso.querySelector('[data-ink="muted"]'));
        pintarParrafo(c, paso.querySelector('p'));
      }
      pintarDots(c);
    }

    function pintarMalla(c, malla, cols, rows) {
      c.lineWidth = GROSOR;
      c.strokeStyle = 'rgba(255,255,255,' + (OPACIDAD * vis).toFixed(3) + ')';
      for (let j = 0; j < rows; j++) curva(c, malla[j]);
      for (let i = 0; i < cols; i++) {
        const col = [];
        for (let j = 0; j < rows; j++) col.push(malla[j][i]);
        curva(c, col);
      }
    }

    function draw(ts) {
      raf = 0;
      ctx.clearRect(0, 0, w, h);
      if (vis <= .001) {
        // fuera de "Analizar" el círculo no debe quedar colgado
        ctxL.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctxL.clearRect(0, 0, w, h);
        return;
      }

      // seguimiento elástico: la malla llega al cursor con un leve retraso
      if (mouse.sx < -9000) { mouse.sx = mouse.x; mouse.sy = mouse.y; }
      mouse.sx += (mouse.x - mouse.sx) * INERCIA;
      mouse.sy += (mouse.y - mouse.sy) * INERCIA;
      const alcanzo = Math.abs(mouse.x - mouse.sx) < .4 && Math.abs(mouse.y - mouse.sy) < .4;

      const cols = Math.ceil(w / GAP) + 3, rows = Math.ceil(h / GAP) + 3;
      const t = reduce ? 0 : (ts || 0) * .0006 * VELOCIDAD;
      const malla = [];

      for (let j = 0; j < rows; j++) {
        const fila = [];
        for (let i = 0; i < cols; i++) {
          const bx = (i - 1) * GAP, by = (j - 1) * GAP;
          // dos senos desfasados por eje: da el serpenteo irregular, sin patrón obvio
          let x = bx + (Math.sin(by * .011 * FRECUENCIA + t * 1.1) * 13 + Math.sin((bx * .007 + by * .006) * FRECUENCIA + t * .8) * 9) * AMPLITUD;
          let y = by + (Math.cos(bx * .009 * FRECUENCIA - t * .9) * 12 + Math.sin((bx * .006 - by * .008) * FRECUENCIA + t) * 8) * AMPLITUD;
          if (mouse.on) {
            const dx = x - mouse.sx, dy = y - mouse.sy;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < RADIO && d > .01) {
              const f = Math.pow(1 - d / RADIO, FALLOFF) * EMPUJE;
              x += dx / d * f; y += dy / d * f;
            }
          }
          fila.push({ x, y });
        }
        malla.push(fila);
      }

      pintarMalla(ctx, malla, cols, rows);

      // Lupa, en el canvas de encima: dentro del círculo se pinta un fondo opaco
      // (tapa lo de abajo, así nada se ve doble) y sobre él la malla y la palabra
      // REDIBUJADAS a escala. Redibujar en vez de estirar el bitmap es lo que las
      // mantiene nítidas, y vale igual para el texto.
      if (ctxL) {
        ctxL.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctxL.clearRect(0, 0, w, h);
        if (mouse.on && LUPA_ZOOM > 1) {
          const x = mouse.sx, y = mouse.sy;
          ctxL.save();
          ctxL.beginPath();
          ctxL.arc(x, y, LUPA_RADIO, 0, Math.PI * 2);
          ctxL.clip();
          ctxL.fillStyle = document.body.style.backgroundColor || '#3157FF';
          ctxL.fillRect(0, 0, w, h);
          ctxL.translate(x, y); ctxL.scale(LUPA_ZOOM, LUPA_ZOOM); ctxL.translate(-x, -y);
          pintarMalla(ctxL, malla, cols, rows);
          pintarSeccion(ctxL);
          ctxL.restore();
          if (LUPA_BORDE > 0) {
            ctxL.beginPath();
            ctxL.arc(x, y, LUPA_RADIO, 0, Math.PI * 2);
            ctxL.lineWidth = 1;
            ctxL.strokeStyle = 'rgba(255,255,255,' + (LUPA_BORDE * vis).toFixed(3) + ')';
            ctxL.stroke();
          }
        }
      }

      // Con VELOCIDAD 0 la malla está quieta: una vez que el seguimiento alcanzó al
      // cursor no hay nada que redibujar, así que el bucle se apaga hasta el próximo
      // movimiento (lo despierta el listener de pointermove).
      if (!reduce && vis > .001 && (VELOCIDAD > 0 || !alcanzo)) raf = requestAnimationFrame(draw);
    }

    return {
      set(v) {
        const antes = vis;
        vis = v;
        cv.style.opacity = v.toFixed(3);
        if (v > .001 && !raf) raf = requestAnimationFrame(draw);
        else if (v <= .001 && antes > .001 && !raf) raf = requestAnimationFrame(draw); // un frame más para limpiar
      }
    };
  }

  /* ----------------------------------------------- estrellas de "Diseñar" */

  // Config definida en el banco de pruebas (lab/estrellas.html) y aprobada por el
  // cliente. Para retocarla conviene volver a ese lab en vez de tantear acá.
  function initEstrellas() {
    const campo = document.getElementById('nea-estrellas');
    if (!campo) return null;

    const COLS = 6, FILAS = 4, CUADROS = 24;   // la tira es 6x4
    const CANT = 4, TAM_MIN = 56, TAM_MAX = 366, OPACIDAD = 1;
    const ALTURA = 900, TRAMO = .38, ESCALONADO = .01, REBOTE = 1.1, DERIVA = 115;
    const FPS = 30, GIRA_HOVER = true, FPS_HOVER = 24;

    // x/y en % del viewport; k escala entre TAM_MIN y TAM_MAX.
    // v2 usa el segundo modelo de estrella (la de cuatro puntas): va en la mas
    // grande y en la mas chica, para que la mezcla se lea sin quedar simetrica.
    // Posiciones y tamaños definidos en lab/estrellas-layout.html.
    const SITIOS = [
      { x: 71.72, y: 31.09, k: 0.387 },
      { x: 81.45, y: 80.16, k: 0.545 },
      { x: 46.99, y: 36.60, k: 0.000, v2: true },
      { x: 30.33, y: 97.72, k: 1.000, v2: true }
    ];

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    // En mobile las estrellas caen pero no giran: quedan siempre en el cuadro 0.
    const quietas = reduce || TACTIL;
    const items = [];
    for (let i = 0; i < CANT; i++) {
      const s = SITIOS[i];
      const nodo = document.createElement('div');
      nodo.className = s.v2 ? 'nea-estrella v2' : 'nea-estrella';
      campo.appendChild(nodo);
      items.push({
        el: nodo, x: s.x, y: s.y, k: s.k, lado: i % 2 ? 1 : -1,
        tam: 0, cx: 0, cy: 0, baseX: 0, baseY: 0,
        cuadro: 0, estado: 'quieta', meta: 0, prev: -1
      });
    }

    function medir() {
      for (let i = 0; i < items.length; i++) {
        const e = items[i];
        const tam = Math.round(TAM_MIN + (TAM_MAX - TAM_MIN) * e.k);
        e.tam = tam;
        e.cx = innerWidth * e.x / 100;      // centro, para saber si el mouse está encima
        e.cy = innerHeight * e.y / 100;
        e.baseX = e.cx - tam / 2;
        e.baseY = e.cy - tam / 2;
        e.el.style.width = tam + 'px';
        e.el.style.height = tam + 'px';
        e.el.style.backgroundSize = (tam * COLS) + 'px ' + (tam * FILAS) + 'px';
      }
    }
    medir();
    addEventListener('resize', medir, { passive: true });

    const cl2 = (n, a, b) => Math.max(a, Math.min(b, n));
    const outBack = (t, s) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);

    let raf = 0, p = 0, tPrev = 0, activo = false;
    let mouseX = -9999, mouseY = -9999;

    function frame(ts) {
      raf = 0;
      const dt = Math.min(.05, (ts - tPrev) / 1000);
      tPrev = ts;
      let vivo = false;

      for (let i = 0; i < items.length; i++) {
        const e = items[i];
        const ent = cl2((p - i * ESCALONADO) / TRAMO, 0, 1);
        const sal = cl2((p - (1 - TRAMO)) / TRAMO, 0, 1);
        const vis = ent * (1 - sal);

        const dy = (1 - outBack(ent, REBOTE)) * -ALTURA + sal * sal * sal * -ALTURA;
        const dx = (1 - ent) * DERIVA * e.lado;
        e.el.style.opacity = (vis * OPACIDAD).toFixed(3);
        e.el.style.transform = 'translate3d(' + (e.baseX + dx).toFixed(1) + 'px,' + (e.baseY + dy).toFixed(1) + 'px,0)';

        // El giro nunca queda a medias: se pide mientras el mouse está encima o
        // mientras la caída AVANZA de verdad; al soltarse completa la vuelta y
        // se detiene en el cuadro 0.
        const avanza = Math.abs(p - e.prev) > 1e-4;
        e.prev = p;
        const encima = GIRA_HOVER && !quietas && vis > .05 &&
          Math.abs(mouseX - e.cx) < e.tam * .45 && Math.abs(mouseY - e.cy) < e.tam * .45;
        const pide = !quietas && (encima || (avanza && vis > .001));

        if (pide) e.estado = 'girando';
        else if (e.estado === 'girando') {
          e.estado = 'cerrando';
          e.meta = Math.ceil(e.cuadro / CUADROS) * CUADROS;
          if (e.meta <= e.cuadro + .001) e.meta += CUADROS;
        }
        if (e.estado !== 'quieta') {
          e.cuadro += (encima ? FPS_HOVER : FPS) * dt;
          if (e.estado === 'cerrando' && e.cuadro >= e.meta) { e.cuadro = 0; e.estado = 'quieta'; }
          vivo = true;
        }
        const c = Math.floor(e.cuadro) % CUADROS;
        e.el.style.backgroundPosition = (-(c % COLS) * e.tam) + 'px ' + (-Math.floor(c / COLS) * e.tam) + 'px';
      }

      // se apaga solo cuando ninguna gira: en reposo no consume nada
      if (vivo && activo) raf = requestAnimationFrame(frame);
    }

    addEventListener('pointermove', ev => {
      mouseX = ev.clientX; mouseY = ev.clientY;
      if (activo && !raf) { tPrev = performance.now(); raf = requestAnimationFrame(frame); }
    }, { passive: true });

    return {
      set(valor) {
        p = valor;
        activo = valor > 0 && valor < 1;
        campo.style.display = activo ? 'block' : 'none';
        if (activo && !raf) { tPrev = performance.now(); raf = requestAnimationFrame(frame); }
      }
    };
  }

  /* ------------------------------------------- "Construir." en arte ASCII */

  // Config definida en lab/construir.html y aprobada por el cliente. La palabra se
  // dibuja en un canvas fuera de pantalla y se mide cuánta tinta cae en cada celda
  // de la grilla; ese valor decide el carácter. Empieza todo en ruido y la palabra
  // aparece cuando el ruido de alrededor se retira al azar.
  function initAscii() {
    const pre = document.getElementById('nea-ascii');
    if (!pre) return null;

    const PALABRA = 'Construir.';
    const GROSOR = '800', RAMPA = ' 01', INTERLINEA = .86;
    const CAMBIOS = 13, UMBRAL = .16, RUIDO_FONDO = 1, DURACION = 1000;

    // Referencia del cliente: 150 columnas y 12px de carácter en 1920 de ancho.
    // Abajo se reparte por resolución para que el arte nunca desborde ni quede
    // ilegible: menos columnas en pantallas chicas, y el cuerpo se calcula para
    // llenar el ancho disponible.
    function medidas() {
      const vw = innerWidth;
      // Lo que decide si la palabra se lee no es el cuerpo del carácter sino cuántas
      // celdas recibe cada letra. Con 10 letras hacen falta ~9 columnas por letra:
      // por eso en pantallas chicas SUBEN las columnas y baja el cuerpo, en vez de
      // lo contrario. Antes había 56 columnas (5,6 por letra) y salía ruido.
      const cols = vw >= 1440 ? 150 : vw >= 1120 ? 124 : vw >= 860 ? 104 : vw >= 700 ? 96 : 92;
      const ancho = vw >= 1120 ? vw * .56 : vw * .94;   // en angosto usa casi todo el ancho
      return { cols: cols, ancho: ancho };
    }

    const cv = document.createElement('canvas');
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    let celdas = [], cols = 0, filas = 0, buffer = [];

    function moler() {
      const m = medidas();
      cols = m.cols;

      // proporción real del carácter monoespaciado, para no deformar el dibujo
      const probe = document.createElement('canvas').getContext('2d');
      const fam = getComputedStyle(pre).fontFamily;
      probe.font = '100px ' + fam;
      const rel = (probe.measureText('M').width / 100) / INTERLINEA;
      const tam = Math.max(4.5, Math.min(16, m.ancho / (cols * (probe.measureText('M').width / 100))));
      pre.style.fontSize = tam.toFixed(2) + 'px';
      pre.style.lineHeight = INTERLINEA;

      const alto = 200;
      const fuente = GROSOR + ' ' + alto + 'px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.font = fuente;

      const med = ctx.measureText(PALABRA);
      const aTxt = Math.max(1, Math.ceil(med.width));
      const asc = med.actualBoundingBoxAscent || alto * .75;
      const desc = med.actualBoundingBoxDescent || alto * .2;
      const hTxt = Math.max(1, Math.ceil(asc + desc));

      cv.width = aTxt; cv.height = hTxt;
      ctx.font = fuente;
      ctx.fillStyle = '#fff';
      ctx.textBaseline = 'alphabetic';
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.fillText(PALABRA, 0, asc);

      filas = Math.max(1, Math.round((hTxt / aTxt) * cols * rel));

      const img = ctx.getImageData(0, 0, cv.width, cv.height).data;
      const cw = cv.width / cols, ch = cv.height / filas;
      celdas = new Array(cols * filas);
      for (let f = 0; f < filas; f++) {
        for (let c = 0; c < cols; c++) {
          let suma = 0, n = 0;
          const x0 = Math.floor(c * cw), x1 = Math.max(x0 + 1, Math.floor((c + 1) * cw));
          const y0 = Math.floor(f * ch), y1 = Math.max(y0 + 1, Math.floor((f + 1) * ch));
          for (let y = y0; y < y1; y++) {
            for (let x = x0; x < x1; x++) { suma += img[(y * cv.width + x) * 4 + 3]; n++; }
          }
          celdas[f * cols + c] = n ? (suma / n) / 255 : 0;
        }
      }
      buffer = new Array(celdas.length).fill(' ');
    }

    // El molde depende de dos cosas que al arrancar todavía no están listas: la
    // webfont y el ancho real de la ventana. Por eso antes sólo se veía bien
    // después de redimensionar, que es lo que forzaba a recalcularlo.
    let anchoPrev = -1;
    function remoler() {
      if (innerWidth === anchoPrev) return;   // el alto no cambia el molde
      anchoPrev = innerWidth;
      moler();
    }
    function rehacer() { anchoPrev = -1; remoler(); }

    rehacer();

    // 1. Dibujar en canvas NO dispara la descarga de una webfont: hay que pedirla.
    //    Sin esto el molde sale con la tipografía de reemplazo, más angosta.
    if (document.fonts && document.fonts.load) {
      document.fonts.load('800 200px "Plus Jakarta Sans"').then(rehacer).catch(() => {});
      document.fonts.ready.then(rehacer).catch(() => {});
    }
    // 2. El ancho recién es fiable cuando el layout se asienta. ResizeObserver avisa
    //    de eso, además de los cambios de tamaño posteriores.
    addEventListener('resize', remoler, { passive: true });
    if (window.ResizeObserver) new ResizeObserver(remoler).observe(document.documentElement);
    else addEventListener('load', rehacer);

    // Ruidos estables por celda: uno decide cuándo se apaga, el otro si tiene fondo.
    const h1 = (c, f) => (((c * 73856093) ^ (f * 19349663)) >>> 0) % 1000 / 1000;
    const h2 = (c, f) => (((c * 83492791) ^ (f * 29009471)) >>> 0) % 1000 / 1000;

    let raf = 0, t0 = 0, ultimo = 0, visible = false, listo = false;

    function frame(ts) {
      raf = 0;
      if (!celdas.length) return;

      const t = reduce ? 1 : Math.min(1, (ts - t0) / DURACION);
      if (t >= 1) listo = true;

      const ult = RAMPA.length - 1;
      const refrescar = !reduce && CAMBIOS > 0 && (ts - ultimo > 1000 / CAMBIOS);
      if (refrescar) ultimo = ts;

      let salida = '';
      for (let f = 0; f < filas; f++) {
        for (let c = 0; c < cols; c++) {
          const i = f * cols + c;
          const v = celdas[i];
          if (v < UMBRAL) {
            // ruido de fondo: se retira al azar a medida que avanza t
            if (h2(c, f) >= RUIDO_FONDO || t >= h1(c, f)) { salida += ' '; continue; }
            if (refrescar || buffer[i] === ' ') buffer[i] = RAMPA[1 + Math.floor(Math.random() * ult)];
            salida += buffer[i];
            continue;
          }
          // la palabra: siempre presente, con los caracteres siempre vivos
          if (refrescar || buffer[i] === ' ') buffer[i] = RAMPA[1 + Math.floor(Math.random() * ult)];
          salida += buffer[i];
        }
        salida += '\n';
      }
      pre.textContent = salida;

      // sigue mientras entre el efecto o mientras los caracteres deban parpadear
      if (visible && !reduce) raf = requestAnimationFrame(frame);
    }

    return {
      set(dentro) {
        if (dentro && !visible) {          // acaba de entrar: se redispara
          visible = true; listo = false;
          t0 = performance.now(); ultimo = 0;
          buffer.fill(' ');
          if (!raf) raf = requestAnimationFrame(frame);
        } else if (!dentro && visible) {
          visible = false;
        }
      }
    };
  }

  /* ---------------------------------------------------------------- video */

  function playVideo() {
    const v = el.scene;
    if (!v || !v.play) return;
    v.muted = true; v.defaultMuted = true; v.playsInline = true; v.loop = true;
    const go = () => { const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); };
    go();
    const kick = () => { if (v.paused) go(); };
    ['pointerdown', 'touchstart', 'keydown', 'scroll'].forEach(ev => addEventListener(ev, kick, { passive: true }));
    document.addEventListener('visibilitychange', kick);
  }

  /* ------------------------------------------------------------- estimador
     Estado 0: nada elegido, dos columnas. Al tocar una card reducida nace la
     columna del medio con la card expandida. Cada panel guarda el estado de
     sus propios extras en su DOM, asi volver a un producto recupera lo que
     ya habias armado: la memoria por producto sale gratis.

     El morph usa la View Transitions API. Donde no existe (o con
     prefers-reduced-motion) el panel simplemente aparece. */

  // Numero de WhatsApp en formato internacional, sin + ni espacios.
  // TODO: completar con el numero real antes de publicar.
  const WA_NUMERO = '5493764000000';

  const MORPH = 'neacard';

  // El mantenimiento es un porcentaje del proyecto, no un precio por producto.
  // Por eso los extras no necesitan cargo mensual propio: al subir el total,
  // suben el plan solos.
  const MANTENIMIENTO_MENSUAL = 0.05;   // 5% del proyecto, por mes
  const MESES_POR_AÑO = 12;             // se factura una vez al año
  const ANIOS_GRATIS = 1;               // el primer año de soporte va de regalo

  function initEstimator() {
    const root = document.getElementById('nea-est');
    if (!root) return;

    const picks = Array.from(root.querySelectorAll('[data-pick]'));
    const panels = Array.from(root.querySelectorAll('[data-panel]'));

    // En mobile la estimacion se reduce a una barra de dos numeros y el resto
    // (plan de soporte, descuentos por varios años, desglose) vive detras de
    // este toggle. Sin el, en telefono no habia forma de contratar 2 o 3 años.
    const sumbar = document.getElementById('nea-sumbar');
    const sumbox = document.getElementById('nea-sum');
    function cerrarDetalle() {
      if (!sumbox) return;
      sumbox.classList.remove('is-detail');
      if (sumbar) sumbar.setAttribute('aria-expanded', 'false');
    }
    const totalNode = document.getElementById('nea-total');
    const totalLabel = document.getElementById('nea-totallabel');
    const noteNode = document.getElementById('nea-note');
    const detailNode = document.getElementById('nea-detail');
    const mesNode = document.getElementById('nea-mes');
    const mesLabel = document.getElementById('nea-meslabel');
    const ahorroNode = document.getElementById('nea-ahorro');
    const mesBlock = document.getElementById('nea-mesblock');
    const planOpts = Array.from(document.querySelectorAll('[data-plan]'));
    const barLabel = document.getElementById('nea-barlabel');
    const barMes = document.getElementById('nea-barmes');
    const cta = document.getElementById('nea-cta');
    const dlg = document.getElementById('nea-dlg');
    if (!picks.length || !totalNode) return;

    const fmt = n => '$' + Math.round(n).toLocaleString('es-AR');
    const weeks = base => (base < 900 ? '2 a 3' : base < 2000 ? '3 a 5' : '5 a 8');
    const quiet = matchMedia('(prefers-reduced-motion: reduce)');

    let open = null;   // id del producto abierto, o null en el estado 0

    const pickOf = id => picks.find(b => b.getAttribute('data-pick') === id);
    const panelOf = id => panels.find(p => p.getAttribute('data-panel') === id);
    const extrasOf = id => {
      const p = panelOf(id);
      return p ? Array.from(p.querySelectorAll('[data-add]')) : [];
    };

    // Lo que el usuario armo para el producto abierto.
    function state() {
      const btn = open && pickOf(open);
      if (!btn) return null;
      const chosen = extrasOf(open).filter(b => b.classList.contains('is-on'));
      const base = Number(btn.getAttribute('data-base') || 0);
      const total = base + chosen.reduce((n, b) => n + Number(b.getAttribute('data-price') || 0), 0);
      const mes = total * MANTENIMIENTO_MENSUAL;
      const plan = planOpts.find(o => o.classList.contains('is-on')) || planOpts[0];
      const anios = plan ? Number(plan.getAttribute('data-plan')) : 1;
      const off = plan ? Number(plan.getAttribute('data-off')) / 100 : 0;
      // El primer año va de regalo en todos los productos, asi que solo se
      // cobran los años que siguen. El descuento por prepago se aplica sobre
      // esos, no sobre el gratis.
      const aniosPagos = Math.max(0, anios - ANIOS_GRATIS);
      const lista = mes * MESES_POR_AÑO * aniosPagos;   // sin descuento
      const soporte = lista * (1 - off);
      return {
        id: open,
        name: btn.getAttribute('data-name'),
        isQuote: btn.hasAttribute('data-quote'),
        base: base,
        total: total,
        mes: mes,
        anios: anios,
        aniosPagos: aniosPagos,
        soporte: soporte,               // lo que paga por adelantado
        // Contra el precio de lista de TODA la cobertura, incluido el año regalado.
        ahorro: mes * MESES_POR_AÑO * anios - soporte,
        chosen: chosen.map(b => ({
          name: b.getAttribute('data-addname'),
          price: Number(b.getAttribute('data-price') || 0)
        }))
      };
    }

    function sumLine(label, value) {
      const row = document.createElement('div');
      row.className = 'nea-sumline';
      const a = document.createElement('span');
      a.textContent = label;
      const b = document.createElement('b');
      b.textContent = value;
      row.appendChild(a);
      row.appendChild(b);
      return row;
    }

    function render() {
      root.classList.toggle('is-open', !!open);

      picks.forEach(b => {
        const id = b.getAttribute('data-pick');
        const on = id === open;
        // aria-pressed y no aria-checked: son <button> que ademas despliegan un panel.
        // role=radio prometia navegacion con flechas y un solo tab stop, que este widget
        // no implementa; como botones de dos estados el contrato se cumple entero.
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.setAttribute('aria-expanded', on ? 'true' : 'false');
        b.classList.toggle('is-on', on);
        // Marca discreta: este producto ya lo tenias armado
        b.classList.toggle('has-extras', !on && extrasOf(id).some(x => x.classList.contains('is-on')));
      });

      panels.forEach(p => { p.hidden = p.getAttribute('data-panel') !== open; });

      // En mobile la card abierta es un modal a pantalla completa: hay que
      // frenar el scroll del fondo. La clase no hace nada en escritorio,
      // donde el panel convive con el resto de la pagina.
      document.documentElement.classList.toggle('nea-locked', !!open);

      // Las seis muestras pesan 460 KB juntas y no se ven hasta que abris una
      // card, asi que cada una se baja recien en el primer clic sobre su
      // producto. loading="lazy" no sirve aca: el panel arranca con hidden y
      // el navegador no vuelve a evaluarlo cuando se lo destapa.
      const visible = panels.find(p => !p.hidden);
      const foto = visible && visible.querySelector('img[data-src]');
      if (foto) {
        foto.src = foto.getAttribute('data-src');
        foto.removeAttribute('data-src');
      }

      // Si el usuario tildo algo y volvio a cerrar el desplegable, hay que
      // decirselo: si no, aparece un precio que no sabe de donde salio.
      panels.forEach(p => p.querySelectorAll('.nea-more').forEach(d => {
        const n = d.querySelectorAll('[data-add].is-on').length;
        const tag = d.querySelector('[data-morecount]');
        if (tag) tag.textContent = n ? ' · ' + n + ' elegido' + (n > 1 ? 's' : '') : '';
      }));
      extrasOf(open).forEach(b => {
        b.setAttribute('aria-checked', b.classList.contains('is-on') ? 'true' : 'false');
      });

      const s = state();

      if (!s) {
        totalLabel.textContent = 'PAGO ÚNICO';
        totalNode.textContent = 'Elegí una opción';
        noteNode.textContent = 'Elegí una opción y el número aparece acá.';
        detailNode.style.display = 'none';
        // Sin producto elegido no hay plan que ofrecer: mostrar descuentos
        // sobre nada deja un bloque vacio y un guion suelto.
        mesBlock.style.display = 'none';
        mesNode.textContent = '—';
        ahorroNode.style.display = 'none';
        barLabel.textContent = 'Elegí una opción';
        barMes.textContent = '';
        cta.textContent = 'Enviar por WhatsApp';
        return;
      }

      if (s.isQuote) {
        // Sistemas a medida no cotiza: la columna no se apaga, cambia de trabajo.
        totalLabel.textContent = 'SE COTIZA A MEDIDA';
        totalNode.textContent = 'Hablemos';
        noteNode.textContent = 'Los sistemas se presupuestan después de entender tu proceso. Contanos qué necesitás resolver y te mandamos una propuesta con alcance y precio.';
        detailNode.style.display = 'none';
        mesBlock.style.display = 'none';
        barLabel.textContent = 'Sistemas a medida';
        barMes.textContent = 'A cotizar';
      } else {
        totalLabel.textContent = 'PAGO ÚNICO';
        totalNode.textContent = 'Desde ' + fmt(s.total);
        noteNode.textContent = 'Incluye diseño, desarrollo y puesta online. Plazo estimado ' + weeks(s.base) + ' semanas.';
        detailNode.textContent = '';
        detailNode.style.display = '';
        detailNode.appendChild(sumLine(s.name, fmt(s.base)));
        s.chosen.forEach(x => detailNode.appendChild(sumLine(x.name, '+ ' + fmt(x.price))));
        mesBlock.style.display = '';
        if (s.aniosPagos === 0) {
          // El caso por defecto: no paga nada de soporte. El numero grande no
          // puede ser "$0", que se lee como error; se lee como regalo.
          mesLabel.textContent = 'Primer año';
          mesNode.textContent = 'Incluido';
          ahorroNode.style.display = '';
          ahorroNode.textContent = 'Te ahorrás ' + fmt(s.ahorro) + ' el primer año';
        } else {
          mesLabel.textContent = (s.aniosPagos === 1 ? 'Año 2' : 'Años 2 a ' + s.anios) + ', pago adelantado';
          mesNode.textContent = fmt(s.soporte);
          ahorroNode.style.display = '';
          ahorroNode.textContent = 'Ahorrás ' + fmt(s.ahorro) + ' · te queda en ' +
            fmt(s.soporte / (s.anios * MESES_POR_AÑO)) + ' por mes';
        }
        barLabel.textContent = 'Desde ' + fmt(s.total);
        barMes.textContent = s.aniosPagos === 0
          ? 'Soporte 1er año incluido'
          : '+ ' + fmt(s.soporte) + ' soporte';
      }
      cta.textContent = s.isQuote ? 'Contarnos tu caso' : 'Enviar por WhatsApp';
    }

    // El morph: el nombre de transicion viaja de la card reducida al panel.
    function morph(from, toGetter, mutate) {
      if (!document.startViewTransition || quiet.matches) { mutate(); render(); return; }
      if (from) from.style.viewTransitionName = MORPH;
      const clear = () => {
        if (from) from.style.viewTransitionName = '';
        const to = toGetter();
        if (to) to.style.viewTransitionName = '';
      };
      const t = document.startViewTransition(() => {
        if (from) from.style.viewTransitionName = '';
        mutate();
        render();
        const to = toGetter();
        if (to) to.style.viewTransitionName = MORPH;
      });
      // Un click rapido cancela la transicion anterior: `ready` rechaza y sin
      // este catch queda como error sin capturar en la consola.
      t.ready.catch(() => {});
      t.finished.then(clear, clear);
    }

    function openPanel(id) {
      if (open === id) return;
      // Al cambiar de producto la hoja de detalle vuelve a cerrarse: si no,
      // abris una card nueva y lo primero que ves es la estimacion tapandola.
      cerrarDetalle();
      morph(pickOf(id), () => panelOf(id), () => { open = id; });
    }

    function closePanel() {
      if (!open) return;
      cerrarDetalle();
      const from = panelOf(open);
      const back = pickOf(open);
      morph(from, () => back, () => { open = null; });
      if (back) back.focus();
    }

    picks.forEach(b => {
      b.addEventListener('click', () => openPanel(b.getAttribute('data-pick')));
    });

    planOpts.forEach(o => {
      o.addEventListener('click', () => {
        planOpts.forEach(x => {
          const on = x === o;
          x.classList.toggle('is-on', on);
          x.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        render();
      });
    });

    panels.forEach(p => {
      p.querySelectorAll('[data-close]').forEach(x => x.addEventListener('click', closePanel));
      // La X no descarta nada: los extras marcados quedan en el DOM del panel.
      p.querySelectorAll('[data-add]').forEach(b => {
        b.addEventListener('click', () => { b.classList.toggle('is-on'); render(); });
      });
    });

    if (sumbar && sumbox) {
      sumbar.addEventListener('click', () => {
        const abierto = sumbox.classList.toggle('is-detail');
        sumbar.setAttribute('aria-expanded', String(abierto));
      });
    }

    addEventListener('keydown', e => {
      if (e.key === 'Escape' && open && !(dlg && dlg.open)) closePanel();
    });

    /* -------------------------------------------------- plantilla + WhatsApp */

    function mensaje(extra) {
      const s = state();
      if (!s) return 'Hola, quiero armar un presupuesto.';
      const l = ['Hola, armé un presupuesto en la web.', '', 'Necesito: ' + s.name];
      if (s.isQuote) {
        l.push('Es un sistema a medida, sé que se cotiza según el alcance.');
      } else {
        if (s.chosen.length) {
          l.push('', 'Le sumo:');
          s.chosen.forEach(x => l.push('· ' + x.name + ' (+' + fmt(x.price) + ')'));
        }
        l.push('', 'Estimación: desde ' + fmt(s.total));
        if (s.aniosPagos === 0) {
          l.push('Soporte: primer año incluido');
        } else {
          l.push('Soporte por ' + s.anios + ' años: primer año incluido + ' + fmt(s.soporte) +
                 (s.aniosPagos === 1 ? ' por el año 2' : ' por los años 2 a ' + s.anios));
          l.push('(ahorro de ' + fmt(s.ahorro) + ')');
        }
      }
      if (extra && extra.length) {
        l.push('');
        extra.forEach(x => l.push(x));
      }
      return l.join('\n');
    }

    function abrirWhatsApp(extra) {
      const url = 'https://wa.me/' + WA_NUMERO + '?text=' + encodeURIComponent(mensaje(extra));
      const w = window.open(url, '_blank', 'noopener');
      if (!w) location.href = url;
    }

    if (dlg && typeof dlg.showModal === 'function') {
      const form = document.getElementById('nea-dlgform');
      const resumen = document.getElementById('nea-dlgsummary');

      cta.addEventListener('click', () => {
        resumen.textContent = mensaje(null);
        dlg.showModal();
      });

      form.addEventListener('submit', e => {
        // "Cancelar" solo cierra: no mandamos nada.
        if (e.submitter && e.submitter.value === 'cancel') return;
        const d = new FormData(form);
        const preguntas = [
          ['Rubro', d.get('rubro')],
          ['¿Ya tiene sitio?', d.get('sitio')],
          ['Logo y textos', d.get('material')],
          ['Plazo', d.get('plazo')]
        ].filter(x => x[1]).map(x => x[0] + ': ' + String(x[1]).trim());
        abrirWhatsApp(preguntas);
      });
    } else {
      // Sin <dialog>, el boton sigue funcionando: va directo al chat.
      cta.addEventListener('click', () => abrirWhatsApp(null));
    }

    render();
  }

  /* ------------------------------------------------------------------ boot */

  let queued = false;
  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; update(); });
  }

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
  addEventListener('load', onScroll);

  // ambos antes del primer update(): paintBackdrop ya les pasa su progreso
  grid = initGrid();
  estrellas = initEstrellas();
  ascii = initAscii();
  update();
  playVideo();
  initEstimator();
})();
