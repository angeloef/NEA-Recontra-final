/* Hostería El Pilar · A1. Idioma, menú, reserva y consultas de demostración, galería, visor y movimiento. */
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
      titulo: 'Hostería El Pilar · El Chaltén, Patagonia',
      vacio: 'dd/mm/aaaa',
      meses: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
      dias: ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do'],
      anterior: 'Mes anterior',
      siguiente: 'Mes siguiente',
      calIn: 'Elegir fecha de llegada',
      calOut: 'Elegir fecha de salida',
      temporada: 'Temporada: del 1 de noviembre al 31 de marzo.',
      falta: 'Elegí la fecha de llegada y la de salida.',
      demo: 'Demostración: acá el huésped vería la disponibilidad real y reservaría, a través del motor de reservas de la hostería.',
      contactoFalta: 'Completá tu nombre, un correo válido y el mensaje.',
      contactoDemo: 'Demostración: el mensaje llegaría a info@hosteriaelpilar.com.ar.',
      foto: 'Foto'
    },
    en: {
      titulo: 'Hostería El Pilar · El Chaltén, Patagonia',
      vacio: 'dd/mm/yyyy',
      meses: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      dias: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
      anterior: 'Previous month',
      siguiente: 'Next month',
      calIn: 'Choose arrival date',
      calOut: 'Choose departure date',
      temporada: 'Season: November 1 to March 31.',
      falta: 'Choose an arrival and a departure date.',
      demo: 'Demo: here the guest would see real availability and book, through the hostería’s booking engine.',
      contactoFalta: 'Please fill in your name, a valid email and your message.',
      contactoDemo: 'Demo: the message would reach info@hosteriaelpilar.com.ar.',
      foto: 'Photo'
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
    if (typeof idiomaCambiado === 'function') { idiomaCambiado(); }
  }
  var idiomaCambiado = null;

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
    if (gal.visor >= 0) { cerrarVisor(); return; }
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

  /* ---------- Formulario de consultas (demostración, no envía) ---------- */

  var contacto = doc.getElementById('contacto');
  var notaContacto = doc.getElementById('c-nota');
  var claveContacto = null;
  var CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function mostrarContacto(clave) {
    claveContacto = clave;
    notaContacto.textContent = clave ? TEXTOS[idioma][clave] : '';
  }
  contacto.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var campos = [
      { el: contacto.elements.nombre, ok: contacto.elements.nombre.value.trim() !== '' },
      { el: contacto.elements.correo, ok: CORREO.test(contacto.elements.correo.value.trim()) },
      { el: contacto.elements.mensaje, ok: contacto.elements.mensaje.value.trim() !== '' }
    ];
    var primero = null;
    campos.forEach(function (c) {
      c.el.setAttribute('aria-invalid', String(!c.ok));
      if (!c.ok && !primero) { primero = c.el; }
    });
    if (primero) { mostrarContacto('contactoFalta'); primero.focus(); return; }
    mostrarContacto('contactoDemo');
  });
  contacto.addEventListener('input', function (ev) { ev.target.removeAttribute('aria-invalid'); });

  /* ---------- Galería: carrusel con flechas y visor ---------- */

  var FOTOS = [
    ['g01', 1024, 683, 'Una habitación con cama doble, manta azul y piso de madera.', 'A room with a double bed, a blue blanket and a wooden floor.'],
    ['g02', 1024, 683, 'Copas sobre un mueble tallado.', 'Glasses on a carved cabinet.'],
    ['g03', 1024, 683, 'Una lámpara de mesa de luz junto a la almohada.', 'A bedside lamp next to the pillow.'],
    ['g04', 1024, 683, 'Una máquina de escribir y libros en un estante.', 'A typewriter and books on a shelf.'],
    ['g05', 1024, 683, 'Una mesa del comedor junto a la ventana.', 'A dining table by the window.'],
    ['g06', 1024, 683, 'Una vitrina de madera con copas.', 'A wooden cabinet with glasses.'],
    ['g07', 1024, 683, 'El gato de la casa asomado detrás de una puerta.', 'The house cat peeking from behind a door.'],
    ['g08', 1024, 683, 'Chispas del fuego en el hogar.', 'Sparks from the fire in the hearth.'],
    ['g09', 1024, 683, 'El Fitz Roy recortado contra el cielo al anochecer.', 'Fitz Roy outlined against the sky at dusk.'],
    ['g10', 1024, 683, 'Botellas de vino en un estante de madera.', 'Wine bottles on a wooden rack.'],
    ['g11', 683, 1024, 'Una cama con toallas, bajo una foto enmarcada del Fitz Roy.', 'A bed with towels, under a framed photo of Fitz Roy.'],
    ['g12', 683, 1024, 'Una mesa de luz con lámpara y toallas sobre la cama.', 'A bedside table with a lamp and towels on the bed.'],
    ['g13', 683, 1024, 'Un cuadro junto a una puerta.', 'A painting next to a door.'],
    ['g14', 1024, 683, 'Un corno antiguo colgado junto a la ventana.', 'An old horn hanging by the window.'],
    ['g15', 683, 1024, 'Un sendero entre lengas hacia el Fitz Roy.', 'A trail among lenga trees towards Fitz Roy.'],
    ['g16', 1024, 683, 'El living con la escalera y la biblioteca.', 'The living room with the staircase and the bookshelves.'],
    ['g19', 1080, 1080, 'El comedor iluminado de noche.', 'The dining room lit at night.'],
    ['g20', 1080, 1080, 'El fogón encendido en el centro de la casa.', 'The hearth burning in the middle of the house.'],
    ['g21', 1080, 1440, 'Una cazuela de barro con pasta y flores.', 'A clay dish with pasta and flowers.'],
    ['g22', 1152, 1440, 'El living visto desde arriba.', 'The living room seen from above.'],
    ['g23', 1080, 1080, 'Una habitación con mesa junto al ventanal.', 'A room with a table by the window.'],
    ['g24', 1080, 720, 'La casa al atardecer, con el Fitz Roy detrás.', 'The house at sunset, with Fitz Roy behind.'],
    ['g25', 1080, 1080, 'Una regadera verde en la huerta.', 'A green watering can in the garden.']
  ];
  var pista = doc.getElementById('gal-pista');
  var flechas = doc.querySelectorAll('[data-gal]');
  var galI = doc.getElementById('gal-i');
  var gal = { i: 0, visor: -1, volver: null };

  FOTOS.forEach(function (f, n) {
    var li = crear('li');
    var b = crear('button');
    b.type = 'button';
    var img = crear('img');
    img.src = 'img/galeria/' + f[0] + '.webp';
    img.width = f[1];
    img.height = f[2];
    img.loading = 'lazy';
    b.appendChild(img);
    b.addEventListener('click', function () { abrirVisor(n, b); });
    li.appendChild(b);
    pista.appendChild(li);
  });
  doc.getElementById('gal-n').textContent = String(FOTOS.length);

  function altGaleria() {
    var col = idioma === 'es' ? 3 : 4;
    pista.querySelectorAll('img').forEach(function (img, n) { img.alt = FOTOS[n][col]; });
    pista.querySelectorAll('button').forEach(function (b, n) { b.setAttribute('aria-label', FOTOS[n][col]); });
  }

  function maxDesplazamiento() {
    return Math.max(0, pista.scrollWidth - pista.parentElement.clientWidth);
  }
  function moverGaleria() {
    var items = pista.children;
    var relleno = parseFloat(getComputedStyle(pista).paddingLeft) || 0;
    var x = Math.min(items[gal.i].offsetLeft - relleno, maxDesplazamiento());
    pista.style.transform = 'translate3d(' + (-x) + 'px, 0, 0)';
    galI.textContent = String(gal.i + 1);
    flechas[0].disabled = gal.i === 0;
    flechas[1].disabled = x >= maxDesplazamiento() - 1;
  }
  flechas.forEach(function (b) {
    b.addEventListener('click', function () {
      gal.i = Math.max(0, Math.min(FOTOS.length - 1, gal.i + Number(b.dataset.gal)));
      moverGaleria();
    });
  });

  var visor = doc.getElementById('visor');
  var visorImg = doc.getElementById('visor-img');
  var visorC = doc.getElementById('visor-c');

  function pintarVisor() {
    var f = FOTOS[gal.visor];
    var col = idioma === 'es' ? 3 : 4;
    visorImg.src = 'img/galeria/' + f[0] + '.webp';
    visorImg.alt = f[col];
    visor.setAttribute('aria-label', TEXTOS[idioma].foto + ' ' + (gal.visor + 1) + ' / ' + FOTOS.length);
    visorC.textContent = (gal.visor + 1) + ' / ' + FOTOS.length;
  }
  function abrirVisor(n, origen) {
    gal.visor = n;
    gal.volver = origen;
    pintarVisor();
    visor.hidden = false;
    doc.body.style.overflow = 'hidden';
    doc.getElementById('visor-x').focus();
  }
  function cerrarVisor() {
    if (gal.visor < 0) { return; }
    gal.visor = -1;
    visor.hidden = true;
    doc.body.style.overflow = '';
    if (gal.volver) { gal.volver.focus({ preventScroll: true }); }
  }
  function pasarVisor(delta) {
    gal.visor = (gal.visor + delta + FOTOS.length) % FOTOS.length;
    pintarVisor();
  }
  doc.getElementById('visor-x').addEventListener('click', cerrarVisor);
  visor.querySelectorAll('[data-visor]').forEach(function (b) {
    b.addEventListener('click', function () { pasarVisor(Number(b.dataset.visor)); });
  });
  visor.addEventListener('click', function (ev) { if (ev.target === visor) { cerrarVisor(); } });
  visor.addEventListener('keydown', function (ev) {
    if (ev.key === 'ArrowLeft') { pasarVisor(-1); }
    if (ev.key === 'ArrowRight') { pasarVisor(1); }
    if (ev.key === 'Escape') { ev.stopPropagation(); cerrarVisor(); }
    if (ev.key === 'Tab') {
      var botones = visor.querySelectorAll('button');
      var primero = botones[0];
      var ultimo = botones[botones.length - 1];
      if (ev.shiftKey && doc.activeElement === primero) { ev.preventDefault(); ultimo.focus(); }
      else if (!ev.shiftKey && doc.activeElement === ultimo) { ev.preventDefault(); primero.focus(); }
    }
  });

  idiomaCambiado = function () {
    altGaleria();
    if (gal.visor >= 0) { pintarVisor(); }
    if (claveContacto) { mostrarContacto(claveContacto); }
    medir();
  };

  /* ---------- Idioma: botones ---------- */

  doc.querySelectorAll('[data-lang]').forEach(function (b) {
    b.addEventListener('click', function () {
      idioma = b.dataset.lang;
      guardarIdioma(idioma);
      aplicarIdioma();
    });
  });

  /* ---------- Aparecer al entrar: bloques de texto y máscaras de fotos ---------- */

  var reducido = window.matchMedia('(prefers-reduced-motion: reduce)');
  var bloques = doc.querySelectorAll('.rv, .mk');
  if ('IntersectionObserver' in window) {
    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('en'); observador.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    bloques.forEach(function (b) { observador.observe(b); });
  } else {
    bloques.forEach(function (b) { b.classList.add('en'); });
  }

  /* ---------- Cabecera, barra de reserva y parallax ---------- */

  var cabecera = doc.getElementById('cab');
  var aviso = cabecera.querySelector('.aviso');
  var hero = doc.getElementById('inicio');
  var paralajes = Array.prototype.slice.call(doc.querySelectorAll('[data-parallax]'));
  var ANCHO_ESCRITORIO = 900;
  var PARALLAX = 0.08;
  var pendiente = false;

  function medir() {
    var escritorio = window.innerWidth >= ANCHO_ESCRITORIO;
    var medio = escritorio ? Math.round(form.querySelector('.campo').offsetHeight / 2) : 0;
    raiz.style.setProperty('--reserva-medio', medio + 'px');
    raiz.style.setProperty('--aviso-alto', aviso.offsetHeight + 'px');
  }
  function alBajar() {
    var limite = hero.offsetHeight * 0.5;
    cabecera.classList.toggle('solida', window.scrollY > limite || menu.classList.contains('abierto'));
  }
  function moverParallax() {
    pendiente = false;
    if (reducido.matches) { return; }
    var alto = window.innerHeight;
    paralajes.forEach(function (el) {
      var r = el.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > alto) { return; }
      var avance = (r.top + r.height / 2 - alto / 2) / (alto / 2 + r.height / 2); // -1 a 1
      el.style.transform = 'translate3d(0, ' + (avance * PARALLAX * r.height).toFixed(1) + 'px, 0)';
    });
  }
  function alScroll() {
    alBajar();
    if (!pendiente) { pendiente = true; window.requestAnimationFrame(moverParallax); }
  }
  window.addEventListener('scroll', alScroll, { passive: true });
  window.addEventListener('resize', function () { medir(); alBajar(); moverGaleria(); moverParallax(); });
  botonMenu.addEventListener('click', alBajar);

  aplicarIdioma();
  medir();
  alBajar();
  moverGaleria();
  moverParallax();
  window.requestAnimationFrame(function () { hero.classList.add('listo'); });
})();
