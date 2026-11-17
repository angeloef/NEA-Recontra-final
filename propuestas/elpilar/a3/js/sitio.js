/* Hostería El Pilar · A3. Idioma, menú, reserva y consultas de demostración, galería y movimiento. */
(function () {
  'use strict';

  var CLAVE_IDIOMA = 'elpilar-idioma';
  var HUESPEDES_MIN = 1;
  var HUESPEDES_MAX = 6;
  var MES_INICIO = 10; // noviembre (0 = enero)
  var MES_FIN = 2;     // marzo
  var DIA_FIN = 31;
  var ALTO_CALENDARIO = 400;

  var TEXTOS = {
    es: {
      titulo: 'Hostería El Pilar | El Chaltén',
      vacio: 'dd/mm/aaaa',
      conFalta: 'Completá tu nombre, un correo válido y el mensaje.',
      conDemo: 'Demostración: el mensaje llegaría a info@hosteriaelpilar.com.ar.',
      meses: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
      dias: ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do'],
      anterior: 'Mes anterior',
      siguiente: 'Mes siguiente',
      calIn: 'Elegir fecha de llegada',
      calOut: 'Elegir fecha de salida',
      temporada: 'Temporada: del 1 de noviembre al 31 de marzo.',
      falta: 'Elegí la fecha de llegada y la de salida.',
      demo: 'Demostración: acá el huésped vería la disponibilidad real y reservaría, a través del motor de reservas de la hostería.'
    },
    en: {
      titulo: 'Hostería El Pilar | El Chaltén',
      vacio: 'dd/mm/yyyy',
      conFalta: 'Please fill in your name, a valid email and your message.',
      conDemo: 'Demo: the message would reach info@hosteriaelpilar.com.ar.',
      meses: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      dias: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
      anterior: 'Previous month',
      siguiente: 'Next month',
      calIn: 'Choose arrival date',
      calOut: 'Choose departure date',
      temporada: 'Season: November 1 to March 31.',
      falta: 'Choose an arrival and a departure date.',
      demo: 'Demo: here the guest would see real availability and book, through the hostería’s booking engine.'
    }
  };

  var doc = document;
  var raiz = doc.documentElement;

  /* ---------- Idioma ---------- */

  function leerIdiomaGuardado() {
    try { return window.localStorage.getItem(CLAVE_IDIOMA); } catch (e) { return null; }
  }
  function guardarIdioma(valor) {
    try { window.localStorage.setItem(CLAVE_IDIOMA, valor); } catch (e) { /* sin almacenamiento: el idioma vale solo para esta visita */ }
  }
  function idiomaInicial() {
    var guardado = leerIdiomaGuardado();
    if (guardado === 'es' || guardado === 'en') { return guardado; }
    var nav = (navigator.language || 'en').toLowerCase();
    return nav.indexOf('es') === 0 ? 'es' : 'en';
  }

  var idioma = idiomaInicial();

  function aplicarIdioma() {
    raiz.lang = idioma;
    doc.title = TEXTOS[idioma].titulo;
    doc.querySelectorAll('[data-es]').forEach(function (el) { el.textContent = el.dataset[idioma]; });
    doc.querySelectorAll('[data-es-alt]').forEach(function (el) { el.alt = el.dataset[idioma + 'Alt']; });
    doc.querySelectorAll('[data-es-aria]').forEach(function (el) { el.setAttribute('aria-label', el.dataset[idioma + 'Aria']); });
    doc.querySelectorAll('[data-lang]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.lang === idioma));
    });
    pintarCampos();
    if (reserva.abierto) { pintarCalendario(); }
    if (reserva.nota) { mostrarNota(reserva.nota); }
    if (contacto.nota) { notaContacto(contacto.nota); }
    if (visor.abierto !== null) { mostrarFoto(visor.abierto); }
    if (typeof medir === 'function') { medir(); }
  }

  /* ---------- Menú en celular ---------- */

  var botonMenu = doc.querySelector('.menu-b');
  var menu = doc.getElementById('menu');

  function cerrarMenu() {
    menu.classList.remove('abierto');
    botonMenu.setAttribute('aria-expanded', 'false');
  }
  botonMenu.addEventListener('click', function () {
    var abierto = menu.classList.toggle('abierto');
    botonMenu.setAttribute('aria-expanded', String(abierto));
  });
  menu.addEventListener('click', function (ev) {
    if (ev.target.closest('a')) { cerrarMenu(); }
  });

  /* ---------- Reserva ---------- */

  var form = doc.getElementById('reservar');
  var cal = doc.getElementById('cal');
  var nota = doc.getElementById('nota');
  var salidaHuespedes = doc.getElementById('v-h');
  var botonesFecha = { in: form.querySelector('[data-fecha="in"]'), out: form.querySelector('[data-fecha="out"]') };
  var valores = { in: doc.getElementById('v-in'), out: doc.getElementById('v-out') };

  var reserva = { in: null, out: null, huespedes: 2, abierto: null, vista: null, nota: null };

  function hoy() {
    var d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  function sumarDias(fecha, n) {
    return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + n);
  }
  function mismoDia(a, b) {
    return Boolean(a && b) && a.getTime() === b.getTime();
  }
  function dos(n) { return n < 10 ? '0' + n : String(n); }
  function formato(fecha) {
    return dos(fecha.getDate()) + '/' + dos(fecha.getMonth() + 1) + '/' + fecha.getFullYear();
  }

  /* Temporada vigente o próxima: 1/11 al 31/3. */
  function temporada() {
    var h = hoy();
    var anio = h.getMonth() > MES_FIN ? h.getFullYear() : h.getFullYear() - 1;
    var inicio = new Date(anio, MES_INICIO, 1);
    var fin = new Date(anio + 1, MES_FIN, DIA_FIN);
    return { inicio: h > inicio ? h : inicio, fin: fin };
  }
  function limites(cual) {
    var t = temporada();
    if (cual === 'in') { return { min: t.inicio, max: sumarDias(t.fin, -1) }; }
    var desde = reserva.in ? sumarDias(reserva.in, 1) : sumarDias(t.inicio, 1);
    return { min: desde, max: t.fin };
  }

  function pintarCampos() {
    ['in', 'out'].forEach(function (cual) {
      var fecha = reserva[cual];
      valores[cual].textContent = fecha ? formato(fecha) : TEXTOS[idioma].vacio;
      valores[cual].classList.toggle('vacio', !fecha);
    });
    salidaHuespedes.textContent = String(reserva.huespedes);
    form.querySelector('[data-paso="-1"]').disabled = reserva.huespedes <= HUESPEDES_MIN;
    form.querySelector('[data-paso="1"]').disabled = reserva.huespedes >= HUESPEDES_MAX;
  }

  function crear(etiqueta, clase, texto) {
    var el = doc.createElement(etiqueta);
    if (clase) { el.className = clase; }
    if (texto !== undefined) { el.textContent = texto; }
    return el;
  }

  function botonNavegar(delta, habilitado) {
    var t = TEXTOS[idioma];
    var b = crear('button', 'cal-nav', delta < 0 ? '←' : '→');
    b.type = 'button';
    b.setAttribute('aria-label', delta < 0 ? t.anterior : t.siguiente);
    b.disabled = !habilitado;
    b.addEventListener('click', function () {
      reserva.vista = new Date(reserva.vista.getFullYear(), reserva.vista.getMonth() + delta, 1);
      pintarCalendario();
      var siguiente = cal.querySelector(delta < 0 ? '.cal-nav' : '.cal-nav:last-of-type');
      (siguiente && !siguiente.disabled ? siguiente : cal.querySelector('.cal-d:not(:disabled)') || cal).focus();
    });
    return b;
  }

  function botonDia(fecha, lim) {
    var t = TEXTOS[idioma];
    var b = crear('button', 'cal-d', String(fecha.getDate()));
    b.type = 'button';
    b.disabled = fecha < lim.min || fecha > lim.max;
    b.setAttribute('aria-label', fecha.getDate() + ' ' + t.meses[fecha.getMonth()] + ' ' + fecha.getFullYear());
    if (mismoDia(fecha, hoy())) { b.classList.add('hoy'); }
    if (mismoDia(fecha, reserva.in) || mismoDia(fecha, reserva.out)) {
      b.classList.add('sel');
      b.setAttribute('aria-pressed', 'true');
    } else if (reserva.in && reserva.out && fecha > reserva.in && fecha < reserva.out) {
      b.classList.add('rango');
    }
    b.addEventListener('click', function () { elegir(fecha); });
    return b;
  }

  function pintarCalendario() {
    var t = TEXTOS[idioma];
    var cual = reserva.abierto;
    var lim = limites(cual);
    var vista = reserva.vista;
    var anio = vista.getFullYear();
    var mes = vista.getMonth();
    var primerMes = new Date(lim.min.getFullYear(), lim.min.getMonth(), 1);
    var ultimoMes = new Date(lim.max.getFullYear(), lim.max.getMonth(), 1);

    cal.textContent = '';
    cal.setAttribute('aria-label', cual === 'in' ? t.calIn : t.calOut);

    var cab = crear('div', 'cal-cab');
    cab.appendChild(botonNavegar(-1, vista > primerMes));
    var titulo = crear('span', 'cal-mes', t.meses[mes] + ' ' + anio);
    titulo.setAttribute('aria-live', 'polite');
    cab.appendChild(titulo);
    cab.appendChild(botonNavegar(1, vista < ultimoMes));
    cal.appendChild(cab);

    var grilla = crear('div', 'cal-grid');
    t.dias.forEach(function (d) {
      var c = crear('span', 'cal-ds', d);
      c.setAttribute('aria-hidden', 'true');
      grilla.appendChild(c);
    });
    var huecos = (new Date(anio, mes, 1).getDay() + 6) % 7; // semana que empieza en lunes
    for (var i = 0; i < huecos; i++) { grilla.appendChild(crear('span')); }
    var diasDelMes = new Date(anio, mes + 1, 0).getDate();
    for (var d = 1; d <= diasDelMes; d++) { grilla.appendChild(botonDia(new Date(anio, mes, d), lim)); }
    cal.appendChild(grilla);
    cal.appendChild(crear('p', 'cal-pie', t.temporada));
  }

  function ubicarCalendario(boton) {
    var campo = boton.closest('.campo');
    var rForm = form.getBoundingClientRect();
    var rCampo = campo.getBoundingClientRect();
    var izquierda = Math.max(0, Math.min(rCampo.left - rForm.left, rForm.width - cal.offsetWidth));
    cal.style.left = izquierda + 'px';
    var faltaAbajo = rForm.bottom + ALTO_CALENDARIO > window.innerHeight;
    var hayArriba = rForm.top > ALTO_CALENDARIO;
    cal.classList.toggle('arriba', faltaAbajo && hayArriba);
  }

  function abrirCalendario(cual) {
    var lim = limites(cual);
    var base = reserva[cual] || (cual === 'out' && reserva.in ? lim.min : lim.min);
    reserva.abierto = cual;
    reserva.vista = new Date(base.getFullYear(), base.getMonth(), 1);
    botonesFecha.in.setAttribute('aria-expanded', String(cual === 'in'));
    botonesFecha.out.setAttribute('aria-expanded', String(cual === 'out'));
    cal.hidden = false;
    pintarCalendario();
    ubicarCalendario(botonesFecha[cual]);
    if (cal.scrollIntoView) { cal.scrollIntoView({ block: 'nearest' }); }
    var foco = cal.querySelector('.cal-d.sel') || cal.querySelector('.cal-d:not(:disabled)');
    if (foco) { foco.focus({ preventScroll: true }); }
  }

  function cerrarCalendario(devolverFoco) {
    if (!reserva.abierto) { return; }
    var cual = reserva.abierto;
    reserva.abierto = null;
    cal.hidden = true;
    botonesFecha.in.setAttribute('aria-expanded', 'false');
    botonesFecha.out.setAttribute('aria-expanded', 'false');
    if (devolverFoco) { botonesFecha[cual].focus(); }
  }

  function elegir(fecha) {
    var cual = reserva.abierto;
    reserva[cual] = fecha;
    if (cual === 'in' && reserva.out && reserva.out <= fecha) { reserva.out = null; }
    pintarCampos();
    if (cual === 'in') {
      abrirCalendario('out');
    } else {
      cerrarCalendario(false);
      form.querySelector('.btn-g').focus();
    }
  }

  function mostrarNota(clave) {
    reserva.nota = clave;
    nota.textContent = TEXTOS[idioma][clave];
    nota.hidden = false;
  }

  ['in', 'out'].forEach(function (cual) {
    botonesFecha[cual].addEventListener('click', function () {
      if (reserva.abierto === cual) { cerrarCalendario(true); } else { abrirCalendario(cual); }
    });
  });

  form.querySelectorAll('[data-paso]').forEach(function (b) {
    b.addEventListener('click', function () {
      var nuevo = reserva.huespedes + Number(b.dataset.paso);
      reserva.huespedes = Math.max(HUESPEDES_MIN, Math.min(HUESPEDES_MAX, nuevo));
      pintarCampos();
    });
  });

  cal.addEventListener('keydown', function (ev) {
    var pasos = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (!(ev.key in pasos) || !ev.target.classList.contains('cal-d')) { return; }
    var dias = Array.prototype.slice.call(cal.querySelectorAll('.cal-d'));
    var destino = dias[dias.indexOf(ev.target) + pasos[ev.key]];
    if (destino && !destino.disabled) { ev.preventDefault(); destino.focus(); }
  });

  doc.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape') { return; }
    if (reserva.abierto) { cerrarCalendario(true); }
    cerrarMenu();
  });
  doc.addEventListener('click', function (ev) {
    if (reserva.abierto && !ev.target.closest('.cal') && !ev.target.closest('[data-fecha]') && doc.contains(ev.target)) {
      cerrarCalendario(false);
    }
  });
  window.addEventListener('resize', function () {
    if (reserva.abierto) { ubicarCalendario(botonesFecha[reserva.abierto]); }
  });

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (!reserva.in || !reserva.out) {
      mostrarNota('falta');
      abrirCalendario(reserva.in ? 'out' : 'in');
      return;
    }
    cerrarCalendario(false);
    mostrarNota('demo');
  });

  /* ---------- Idioma: botones ---------- */

  doc.querySelectorAll('[data-lang]').forEach(function (b) {
    b.addEventListener('click', function () {
      idioma = b.dataset.lang;
      guardarIdioma(idioma);
      aplicarIdioma();
    });
  });


  /* ---------- Consultas (demostración: no envía nada) ---------- */

  var formContacto = doc.getElementById('contacto');
  var notaCon = doc.getElementById('con-nota');
  var contacto = { nota: null };
  var CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function notaContacto(clave) {
    contacto.nota = clave;
    notaCon.textContent = TEXTOS[idioma][clave];
    notaCon.classList.toggle('error', clave === 'conFalta');
    notaCon.hidden = false;
  }

  formContacto.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var campos = {
      nombre: formContacto.elements.nombre,
      correo: formContacto.elements.correo,
      mensaje: formContacto.elements.mensaje
    };
    var malos = [];
    if (!campos.nombre.value.trim()) { malos.push(campos.nombre); }
    if (!CORREO_VALIDO.test(campos.correo.value.trim())) { malos.push(campos.correo); }
    if (!campos.mensaje.value.trim()) { malos.push(campos.mensaje); }
    Object.keys(campos).forEach(function (k) {
      var malo = malos.indexOf(campos[k]) !== -1;
      campos[k].classList.toggle('invalido', malo);
      campos[k].setAttribute('aria-invalid', String(malo));
    });
    if (malos.length) {
      notaContacto('conFalta');
      malos[0].focus();
      return;
    }
    notaContacto('conDemo');
  });

  /* ---------- Galería: avanza con flechas, sin barra de scroll ---------- */

  var pista = doc.getElementById('gal-pista');
  var items = Array.prototype.slice.call(pista.children);
  var flechas = doc.querySelectorAll('[data-gal]');
  var cuenta = doc.getElementById('gal-n');
  var galeria = { pos: 0 };
  var UMBRAL_DESLIZ = 40;

  doc.getElementById('gal-t').textContent = dos(items.length);

  function pasoGaleria() {
    return items[1].offsetLeft - items[0].offsetLeft;
  }
  function porVista() {
    var vista = pista.parentElement.getBoundingClientRect().width;
    return Math.max(1, Math.floor((vista + 2) / pasoGaleria()));
  }
  function moverGaleria(nueva) {
    var vistas = porVista();
    var max = Math.max(0, items.length - vistas);
    galeria.pos = Math.max(0, Math.min(max, nueva));
    pista.style.transform = 'translate3d(' + (-galeria.pos * pasoGaleria()) + 'px, 0, 0)';
    cuenta.textContent = dos(galeria.pos + 1);
    flechas[0].disabled = galeria.pos === 0;
    flechas[1].disabled = galeria.pos === max;
    items.forEach(function (it, i) {
      var visible = i >= galeria.pos && i < galeria.pos + vistas;
      it.querySelector('button').tabIndex = visible ? 0 : -1;
    });
  }
  flechas.forEach(function (b) {
    b.addEventListener('click', function () { moverGaleria(galeria.pos + Number(b.dataset.gal)); });
  });
  var inicioToque = null;
  pista.addEventListener('touchstart', function (ev) { inicioToque = ev.touches[0].clientX; }, { passive: true });
  pista.addEventListener('touchend', function (ev) {
    if (inicioToque === null) { return; }
    var dx = ev.changedTouches[0].clientX - inicioToque;
    inicioToque = null;
    if (Math.abs(dx) > UMBRAL_DESLIZ) { moverGaleria(galeria.pos + (dx < 0 ? 1 : -1)); }
  }, { passive: true });

  /* Visor */
  var visorEl = doc.getElementById('visor');
  var visorImg = doc.getElementById('visor-img');
  var visorTxt = doc.getElementById('visor-t');
  var visor = { abierto: null, origen: null };

  function mostrarFoto(i) {
    var n = items.length;
    var idx = (i + n) % n;
    var boton = items[idx].querySelector('button');
    var mini = boton.querySelector('img');
    visor.abierto = idx;
    visorImg.src = boton.dataset.full;
    visorImg.width = Number(boton.dataset.w);
    visorImg.height = Number(boton.dataset.h);
    visorImg.alt = mini.alt;
    visorTxt.textContent = dos(idx + 1) + ' / ' + dos(n) + ' · ' + mini.alt;
  }
  function abrirVisor(i, origen) {
    visor.origen = origen;
    mostrarFoto(i);
    visorEl.hidden = false;
    doc.body.style.overflow = 'hidden';
    visorEl.querySelector('.visor-x').focus();
  }
  function cerrarVisor() {
    if (visor.abierto === null) { return; }
    visor.abierto = null;
    visorEl.hidden = true;
    doc.body.style.overflow = '';
    if (visor.origen) { visor.origen.focus({ preventScroll: true }); }
  }
  items.forEach(function (it, i) {
    var b = it.querySelector('button');
    b.addEventListener('click', function () { abrirVisor(i, b); });
  });
  visorEl.querySelector('.visor-x').addEventListener('click', cerrarVisor);
  visorEl.querySelectorAll('[data-visor]').forEach(function (b) {
    b.addEventListener('click', function () { mostrarFoto(visor.abierto + Number(b.dataset.visor)); });
  });
  visorEl.addEventListener('click', function (ev) { if (ev.target === visorEl) { cerrarVisor(); } });
  visorEl.addEventListener('keydown', function (ev) {
    if (ev.key === 'ArrowLeft') { mostrarFoto(visor.abierto - 1); }
    if (ev.key === 'ArrowRight') { mostrarFoto(visor.abierto + 1); }
    if (ev.key === 'Tab') {
      var enfocables = visorEl.querySelectorAll('button');
      var primero = enfocables[0];
      var ultimo = enfocables[enfocables.length - 1];
      if (ev.shiftKey && doc.activeElement === primero) { ev.preventDefault(); ultimo.focus(); }
      else if (!ev.shiftKey && doc.activeElement === ultimo) { ev.preventDefault(); primero.focus(); }
    }
  });
  doc.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && visor.abierto !== null) { cerrarVisor(); }
  });

  /* ---------- Movimiento ---------- */

  var reducido = window.matchMedia('(prefers-reduced-motion: reduce)');
  var aparecen = doc.querySelectorAll('.rv, .rv-g, .cortina, .cortina-c');

  if (!reducido.matches && 'IntersectionObserver' in window) {
    /* Las cortinas arrancan recortadas a cero (clip-path), y Chrome no las da por visibles:
       ni dispara el observador ni descarga sus fotos diferidas. Por eso se observa el
       contenedor de cada cortina y la clase se aplica a la cortina. */
    var destinos = new Map();
    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) { return; }
        (destinos.get(e.target) || []).forEach(function (b) { b.classList.add('en'); });
        observador.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    aparecen.forEach(function (b) {
      var esCortina = b.classList.contains('cortina') || b.classList.contains('cortina-c');
      var vigia = esCortina && b.parentElement ? b.parentElement : b;
      if (!destinos.has(vigia)) { destinos.set(vigia, []); observador.observe(vigia); }
      destinos.get(vigia).push(b);
    });
  } else {
    aparecen.forEach(function (b) { b.classList.add('en'); });
  }

  /* Parallax suave en las fotos a sangre: se mueven un poco más lento que el scroll. */
  var sangres = Array.prototype.slice.call(doc.querySelectorAll('.sangre'));
  var PARALLAX = 0.05;
  var pendiente = false;

  function parallax() {
    pendiente = false;
    if (reducido.matches) { return; }
    var alto = window.innerHeight;
    sangres.forEach(function (s) {
      var r = s.getBoundingClientRect();
      if (r.bottom < 0 || r.top > alto) { return; }
      var avance = (r.top + r.height / 2 - alto / 2) / (alto / 2 + r.height / 2);
      s.style.setProperty('--py', (-avance * PARALLAX * r.height).toFixed(1) + 'px');
    });
  }
  function pedirParallax() {
    if (reducido.matches || pendiente) { return; }
    pendiente = true;
    window.requestAnimationFrame(parallax);
  }

  /* ---------- Cabecera: transparente sobre el hero, sólida al bajar ---------- */

  var cabecera = doc.getElementById('cab');
  var barra = cabecera.querySelector('.barra');
  var hero = doc.getElementById('inicio');
  var ANCHO_ESCRITORIO = 900;

  function medir() {
    var escritorio = window.innerWidth >= ANCHO_ESCRITORIO;
    var medio = escritorio ? Math.round(form.querySelector('.campo').offsetHeight / 2) : 0;
    raiz.style.setProperty('--reserva-medio', medio + 'px');
    raiz.style.setProperty('--barra-alto', barra.offsetHeight + 'px');
    moverGaleria(galeria.pos);
  }
  function alBajar() {
    var limite = Math.min(hero.offsetHeight * 0.5, hero.offsetHeight - cabecera.offsetHeight);
    cabecera.classList.toggle('solida', window.scrollY > limite || menu.classList.contains('abierto'));
    pedirParallax();
  }
  window.addEventListener('scroll', alBajar, { passive: true });
  window.addEventListener('resize', function () { medir(); alBajar(); });
  botonMenu.addEventListener('click', alBajar);

  aplicarIdioma();
  medir();
  alBajar();
  parallax();
})();
