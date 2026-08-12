/* NEA Sistemas — runtime propio. Sin dependencias, sin CDN. */
(() => {
  'use strict';

  const TYPED_WORDS = 'crezca todos los días|venda todos los días|no dependa de vos|genere consultas solo';
  const AUTO_TYPE = true;
  const SCROLL_PACE = 3;

  const cl = (n, a, b) => Math.max(a, Math.min(b, n));
  const lp = (a, b, t) => a + (b - a) * t;
  const ez = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  const el = {};
  [
    'runway', 'stage', 'frame', 'video', 'scene', 'hero', 's2bg', 's2text', 'h1',
    'caret', 'cta2', 'nav', 'navbg', 'navlinks', 'navcta', 'navlogo', 'logo',
    'typed', 'navlinksA', 'designbg'
  ].forEach(k => { el[k] = document.getElementById('nea-' + k); });

  const pace = Math.max(1.8, Math.min(5, SCROLL_PACE));
  if (el.runway) el.runway.style.height = (pace * 100) + 'vh';

  /* ---- estado de layout cacheado entre frames ---- */
  let vwPrev, vhPrev, hhMax = 0;
  let steps, words, panels, dots, rig;
  let procPr = 0, procOn = false;
  let ink, inkBases, proceso, nosotros, bgColor, bgLum;
  let grid = null;
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
    const PALE = [221, 227, 255], YELLOW = [199, 255, 74];   // #C7FF4A, el lima de marca
    const enter = (node, span, at) => cl(((vh * (at || 1)) - node.getBoundingClientRect().top) / (vh * span), 0, 1);

    // the services section stays black-on-white: the blue only starts once "Proceso" is nearly at the top
    const p1 = enter(proceso, .3, .34);
    const p2 = enter(nosotros, .5);
    // white -> pale blue (dark ink still reads) -> full blue, with the ink flip inside the short last leg
    const q = cl(p1 / .34, 0, 1);
    const leg = .88;
    const deep = cl((q - leg) / (1 - leg), 0, 1);
    let arr = deep > 0 ? mix(PALE, BLUE, deep) : mix(WHITE, PALE, q / leg);
    const seg = procPr * 3;
    // La textura de "Diseñar" sigue la misma curva que el color: entra cuando el fondo
    // vira al lima y se va cuando arranca a apagarse hacia el negro. Asi el cross-fade
    // es continuo y no se ve un corte entre el color plano y la imagen.
    let designT = 0, toYellow = 0;
    if (procOn && seg > .85) {
      toYellow = cl((seg - .85) / .3, 0, 1);
      const toBlack = cl((seg - 1.85) / .3, 0, 1);
      arr = mix(mix(BLUE, YELLOW, toYellow), BLACK, toBlack);
      designT = toYellow * (1 - toBlack);
    }
    // La grilla entra junto con el azul (deep) y se va cuando el fondo vira al lima:
    // asi "Analizar" y "Diseñar" nunca se pisan.
    let gridT = deep * (1 - toYellow);
    if (p2 > 0) { arr = BLACK.slice(); designT = 0; gridT = 0; }
    if (el.designbg) el.designbg.style.opacity = designT.toFixed(3);
    if (grid) grid.set(gridT);

    const bg = 'rgb(' + arr.map(Math.round).join(',') + ')';
    document.body.style.backgroundColor = bg;

    // flip from the backdrop's actual luminance, so whichever ink wins is always the one shown
    const lin = x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); };
    const c = bg.match(/[\d.]+/g).map(Number);
    bgLum = .2126 * lin(c[0]) + .7152 * lin(c[1]) + .0722 * lin(c[2]);
    bgColor = bg;

    const t = bgLum < .21 ? 1 : 0;
    ink.forEach((node, i) => {
      const kind = node.dataset.ink;
      if (kind === 'chip') {
        node.style.background = rgb(BLACK, WHITE, t);
        node.style.color = rgb(WHITE, BLACK, t);
        return;
      }
      if (kind === 'word') node.style.color = rgb(arr.map(Math.round), t ? WHITE : BLACK, .32);
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

    let w = 0, h = 0, raf = 0, vis = 0;
    const mouse = { x: -9999, y: -9999, sx: -9999, sy: -9999, on: false };

    const resize = () => {
      const dpr = Math.min(2, devicePixelRatio || 1);
      w = innerWidth; h = innerHeight;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      cv.style.width = w + 'px'; cv.style.height = h + 'px';
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
    function curva(pts) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let k = 1; k < pts.length - 1; k++) {
        ctx.quadraticCurveTo(pts[k].x, pts[k].y, (pts[k].x + pts[k + 1].x) / 2, (pts[k].y + pts[k + 1].y) / 2);
      }
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      ctx.stroke();
    }

    function pintarMalla(malla, cols, rows) {
      ctx.lineWidth = GROSOR;
      ctx.strokeStyle = 'rgba(255,255,255,' + (OPACIDAD * vis).toFixed(3) + ')';
      for (let j = 0; j < rows; j++) curva(malla[j]);
      for (let i = 0; i < cols; i++) {
        const col = [];
        for (let j = 0; j < rows; j++) col.push(malla[j][i]);
        curva(col);
      }
    }

    function draw(ts) {
      raf = 0;
      ctx.clearRect(0, 0, w, h);
      if (vis <= .001) return;

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

      pintarMalla(malla, cols, rows);

      // Lupa: recorte circular, se borra lo de adentro y se redibuja la malla escalada.
      // Se redibuja en vez de estirar el bitmap, asi las lineas quedan nitidas.
      if (mouse.on && LUPA_ZOOM > 1) {
        const x = mouse.sx, y = mouse.sy;
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, LUPA_RADIO, 0, Math.PI * 2);
        ctx.clip();
        ctx.clearRect(0, 0, w, h);
        ctx.translate(x, y); ctx.scale(LUPA_ZOOM, LUPA_ZOOM); ctx.translate(-x, -y);
        pintarMalla(malla, cols, rows);
        ctx.restore();
        if (LUPA_BORDE > 0) {
          ctx.beginPath();
          ctx.arc(x, y, LUPA_RADIO, 0, Math.PI * 2);
          ctx.lineWidth = 1;
          ctx.strokeStyle = 'rgba(255,255,255,' + (LUPA_BORDE * vis).toFixed(3) + ')';
          ctx.stroke();
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

  /* ------------------------------------------------------------ typewriter */

  function startType() {
    const list = TYPED_WORDS.split('|').map(s => s.trim()).filter(Boolean);
    if (!list.length || !el.typed) return;
    let i = 0, j = list[0].length, del = true;
    const step = () => {
      const w = list[i];
      if (!del) {
        j++;
        if (j >= w.length) {
          el.typed.textContent = w;
          onScroll();
          del = true;
          setTimeout(step, 2300);
          return;
        }
      } else {
        j--;
        if (j <= 0) { del = false; i = (i + 1) % list.length; j = 0; }
      }
      el.typed.textContent = list[i].slice(0, Math.max(0, j));
      onScroll();
      setTimeout(step, del ? 34 : 72);
    };
    setTimeout(step, 2400);
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

  function initEstimator() {
    const root = document.getElementById('nea-est');
    if (!root) return;

    const picks = Array.from(root.querySelectorAll('[data-pick]'));
    const panels = Array.from(root.querySelectorAll('[data-panel]'));
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
      const lista = mes * MESES_POR_AÑO * anios;   // sin descuento
      return {
        id: open,
        name: btn.getAttribute('data-name'),
        isQuote: btn.hasAttribute('data-quote'),
        base: base,
        total: total,
        mes: mes,
        anios: anios,
        soporte: lista * (1 - off),     // lo que paga por adelantado
        ahorro: lista * off,
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
        b.setAttribute('aria-checked', on ? 'true' : 'false');
        b.setAttribute('aria-expanded', on ? 'true' : 'false');
        b.classList.toggle('is-on', on);
        // Marca discreta: este producto ya lo tenias armado
        b.classList.toggle('has-extras', !on && extrasOf(id).some(x => x.classList.contains('is-on')));
      });

      panels.forEach(p => { p.hidden = p.getAttribute('data-panel') !== open; });

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
        noteNode.textContent = 'Elegí lo que necesitás a la izquierda y armá tu presupuesto.';
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
        mesLabel.textContent = s.anios === 1 ? 'Por 1 año' : 'Por ' + s.anios + ' años, pago adelantado';
        mesNode.textContent = fmt(s.soporte);
        if (s.ahorro > 0) {
          ahorroNode.style.display = '';
          ahorroNode.textContent = 'Ahorrás ' + fmt(s.ahorro) + ' · te queda en ' +
            fmt(s.soporte / (s.anios * MESES_POR_AÑO)) + ' por mes';
        } else {
          ahorroNode.style.display = 'none';
        }
        barLabel.textContent = 'Desde ' + fmt(s.total);
        barMes.textContent = '+ ' + fmt(s.soporte) + ' soporte';
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
      morph(pickOf(id), () => panelOf(id), () => { open = id; });
    }

    function closePanel() {
      if (!open) return;
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
          x.setAttribute('aria-checked', on ? 'true' : 'false');
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
        l.push('Soporte por ' + s.anios + (s.anios === 1 ? ' año: ' : ' años (adelantado): ') + fmt(s.soporte));
        if (s.ahorro > 0) l.push('(ahorro de ' + fmt(s.ahorro) + ')');
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

  grid = initGrid();   // antes del primer update(): paintBackdrop ya le pasa visibilidad
  update();
  playVideo();
  initEstimator();
  if (AUTO_TYPE) startType();
})();
