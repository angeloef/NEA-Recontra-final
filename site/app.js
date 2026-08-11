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
    'typed', 'navlinksA'
  ].forEach(k => { el[k] = document.getElementById('nea-' + k); });

  const pace = Math.max(1.8, Math.min(5, SCROLL_PACE));
  if (el.runway) el.runway.style.height = (pace * 100) + 'vh';

  /* ---- estado de layout cacheado entre frames ---- */
  let vwPrev, vhPrev, hhMax = 0;
  let steps, words, panels, dots, rig;
  let procPr = 0, procOn = false;
  let ink, inkBases, proceso, nosotros, bgColor, bgLum;
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
    const PALE = [221, 227, 255], YELLOW = [199, 255, 74];
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
    if (procOn && seg > .85) arr = mix(mix(BLUE, YELLOW, cl((seg - .85) / .3, 0, 1)), BLACK, cl((seg - 1.85) / .3, 0, 1));
    if (p2 > 0) arr = BLACK.slice();

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

  /* ------------------------------------------------------------- estimador */

  // Los nombres y descripciones viven en el HTML (crawleables). Acá solo los precios.
  const PRICING = {
    landing:       { from: 450,  to: 750 },
    institucional: { from: 850,  to: 1400 },
    catalogo:      { from: 1200, to: 2000 },
    tienda:        { from: 1900, to: 3400 },
    sistemas:      { from: 3500, to: 0 }
  };

  function initEstimator() {
    const buttons = Array.from(document.querySelectorAll('[data-opt]'));
    const labelNode = document.getElementById('nea-pricelabel');
    const noteNode = document.getElementById('nea-pricenote');
    if (!buttons.length || !labelNode || !noteNode) return;

    const fmt = n => 'USD ' + n.toLocaleString('es-AR');
    const weeks = from => (from < 900 ? '2 a 3' : from < 2000 ? '3 a 5' : '5 a 8');

    const render = pick => {
      const p = PRICING[pick];
      labelNode.textContent = p
        ? (p.to ? fmt(p.from) + ' – ' + fmt(p.to) : 'Desde ' + fmt(p.from))
        : 'Elegí una opción';
      noteNode.textContent = p
        ? (p.to
            ? 'Incluye diseño, desarrollo y puesta online. Plazo estimado ' + weeks(p.from) + ' semanas.'
            : 'Se cotiza por alcance: relevamiento, arquitectura e integraciones. Arrancamos con un informe sin costo.')
        : 'Elegí una opción para ver la estimación.';

      buttons.forEach(b => {
        const on = b.getAttribute('data-opt') === pick;
        b.setAttribute('aria-checked', on ? 'true' : 'false');
        b.classList.toggle('is-on', on);
      });
    };

    buttons.forEach(b => {
      b.addEventListener('click', () => render(b.getAttribute('data-opt')));
    });
    render(null);
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

  update();
  playVideo();
  initEstimator();
  if (AUTO_TYPE) startType();
})();
