/* Hostería El Pilar · A2 "Montaña moderna". Idioma, menú, reserva, galería, consultas y movimiento. */
(function () {
  'use strict';

  var CLAVE_IDIOMA = 'elpilar-idioma';
  var HUESPEDES_MIN = 1;
  var HUESPEDES_MAX = 6;
  var MES_INICIO = 10; // noviembre (0 = enero)
  var MES_FIN = 2;     // marzo
  var DIA_FIN = 31;
  var ALTO_CALENDARIO = 400;
  var ANCHO_MENU = 1280;
  var ANCHO_ESCRITORIO = 700;
  var UMBRAL_CHICA = 40;
  var DURACION_CONTADOR = 1600;

  var TEXTOS = {
    es: {
      titulo: 'Hostería El Pilar | El Chaltén',
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
      faltaContacto: 'Completá tu nombre, un correo válido y el mensaje.',
      demoContacto: 'Demostración: el mensaje llegaría a info@hosteriaelpilar.com.ar.',
      ampliar: 'Ampliar foto',
      decimal: ','
    },
    en: {
      titulo: 'Hostería El Pilar | El Chaltén',
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
      faltaContacto: 'Please fill in your name, a valid email and your message.',
      demoContacto: 'Demo: the message would reach info@hosteriaelpilar.com.ar.',
      ampliar: 'Enlarge photo',
      decimal: '.'
    }
  };

  /* Galería: archivo, ancho y alto de la miniatura, texto alternativo. */
  var GALERIA = [
    ['g01', 960, 640, 'El living con la escalera de madera y la biblioteca.', 'The living room with the wooden staircase and the library.'],
    ['g02', 480, 640, 'La sala, con sillones junto a la ventana.', 'The sitting room, with armchairs by the window.'],
    ['g03', 960, 640, 'Una habitación con cama de acolchado azul y ventanas al bosque.', 'A room with a blue quilt and windows to the forest.'],
    ['g04', 640, 640, 'El comedor iluminado al caer la tarde.', 'The dining room lit at dusk.'],
    ['g05', 960, 640, 'Una máquina de escribir antigua y libros en un estante.', 'An old typewriter and books on a shelf.'],
    ['g06', 640, 640, 'La casa al anochecer, con las ventanas encendidas.', 'The house at nightfall, with the windows lit.'],
    ['g07', 960, 640, 'Una mesa junto a la ventana del comedor.', 'A table by the dining room window.'],
    ['g08', 512, 640, 'El living visto desde arriba.', 'The living room seen from above.'],
    ['g09', 960, 640, 'El fuego de la chimenea.', 'The fire in the hearth.'],
    ['g10', 640, 640, 'Una habitación de noche, con la lámpara encendida.', 'A room at night, with the lamp lit.'],
    ['g11', 960, 640, 'Un corno colgado junto a una ventana.', 'A horn hanging by a window.'],
    ['g12', 480, 640, 'La entrada de la casa, con la puerta vidriada.', 'The entrance to the house, with the glass door.'],
    ['g13', 1024, 417, 'La casa desde el aire, en el valle.', 'The house from the air, in the valley.'],
    ['g14', 640, 640, 'Una regadera verde en la huerta.', 'A green watering can in the garden.'],
    ['g15', 960, 640, 'Copas en el bar.', 'Glasses at the bar.'],
    ['g16', 1080, 565, 'El cordón del Fitz Roy.', 'The Fitz Roy range.'],
    ['g17', 960, 640, 'El gato de la casa.', 'The house cat.'],
    ['g18', 960, 640, 'Las montañas al anochecer.', 'The mountains at nightfall.']
  ];

  var doc = document;
  var raiz = doc.documentElement;
  var reducido = window.matchMedia('(prefers-reduced-motion: reduce)');

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
    if (notaContacto.dataset.clave) { mostrarNotaContacto(notaContacto.dataset.clave); }
    textosGaleria();
    contadores.forEach(function (c) { if (c.listo) { escribirCifra(c, c.fin); } });
    medir();
  }

  /* ---------- Menú ---------- */

  var cabecera = doc.getElementById('cab');
  var botonMenu = doc.querySelector('.menu-b');
  var menu = doc.getElementById('menu');

  function cerrarMenu() {
    menu.classList.remove('abierto');
    cabecera.classList.remove('menu-ab');
    botonMenu.setAttribute('aria-expanded', 'false');
  }
  botonMenu.addEventListener('click', function () {
    var abierto = menu.classList.toggle('abierto');
    cabecera.classList.toggle('menu-ab', abierto);
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

  /* ---------- Galería: pista con flechas y visor ---------- */

  var lista = doc.getElementById('gal-lista');
  var pista = doc.getElementById('gal-pista');
  var flechas = doc.querySelectorAll('[data-gal]');
  var cuentaActual = doc.getElementById('gal-act');
  var visor = doc.getElementById('visor');
  var visorImg = doc.getElementById('visor-img');
  var visorN = doc.getElementById('visor-n');
  var fotoVisor = 0;

  doc.getElementById('gal-tot').textContent = String(GALERIA.length);
  doc.getElementById('visor-t').textContent = String(GALERIA.length);

  GALERIA.forEach(function (g, i) {
    var item = crear('li');
    var boton = crear('button');
    boton.type = 'button';
    boton.dataset.foto = String(i);
    var img = crear('img');
    img.src = 'img/' + g[0] + '-m.webp';
    img.width = g[1];
    img.height = g[2];
    img.loading = 'lazy';
    boton.appendChild(img);
    boton.addEventListener('click', function () { abrirVisor(i); });
    item.appendChild(boton);
    lista.appendChild(item);
  });

  function textosGaleria() {
    var esp = idioma === 'es' ? 3 : 4;
    lista.querySelectorAll('button').forEach(function (b) {
      var g = GALERIA[Number(b.dataset.foto)];
      b.querySelector('img').alt = g[esp];
      b.setAttribute('aria-label', TEXTOS[idioma].ampliar + ': ' + g[esp]);
    });
    if (visor.open) { mostrarFoto(fotoVisor); }
  }

  function estadoPista() {
    var max = pista.scrollWidth - pista.clientWidth - 2;
    flechas[0].disabled = pista.scrollLeft <= 2;
    flechas[1].disabled = pista.scrollLeft >= max;
    var items = lista.children;
    var actual = 0;
    for (var i = 0; i < items.length; i++) {
      if (items[i].offsetLeft - lista.offsetLeft <= pista.scrollLeft + 4) { actual = i; }
    }
    cuentaActual.textContent = String(actual + 1);
  }
  flechas.forEach(function (f) {
    f.addEventListener('click', function () {
      var paso = Math.max(pista.clientWidth * 0.75, 280) * Number(f.dataset.gal);
      pista.scrollBy({ left: paso, behavior: reducido.matches ? 'auto' : 'smooth' });
    });
  });
  pista.addEventListener('scroll', estadoPista, { passive: true });

  function mostrarFoto(i) {
    fotoVisor = (i + GALERIA.length) % GALERIA.length;
    var g = GALERIA[fotoVisor];
    visorImg.src = 'img/' + g[0] + '.webp';
    visorImg.alt = g[idioma === 'es' ? 3 : 4];
    visorN.textContent = String(fotoVisor + 1);
  }
  function abrirVisor(i) {
    mostrarFoto(i);
    if (typeof visor.showModal === 'function') { visor.showModal(); } else { visor.setAttribute('open', ''); }
  }
  function cerrarVisor() {
    if (typeof visor.close === 'function') { visor.close(); } else { visor.removeAttribute('open'); }
  }
  visor.addEventListener('close', function () {
    var b = lista.querySelector('[data-foto="' + fotoVisor + '"]');
    if (b) { b.focus({ preventScroll: true }); }
  });
  doc.getElementById('visor-cerrar').addEventListener('click', cerrarVisor);
  visor.querySelectorAll('[data-visor]').forEach(function (b) {
    b.addEventListener('click', function () { mostrarFoto(fotoVisor + Number(b.dataset.visor)); });
  });
  visor.addEventListener('click', function (ev) { if (ev.target === visor) { cerrarVisor(); } });
  visor.addEventListener('keydown', function (ev) {
    if (ev.key === 'ArrowLeft') { mostrarFoto(fotoVisor - 1); }
    if (ev.key === 'ArrowRight') { mostrarFoto(fotoVisor + 1); }
  });

  /* ---------- Consultas (demostración) ---------- */

  var contacto = doc.getElementById('contacto');
  var notaContacto = doc.getElementById('f-nota');

  function mostrarNotaContacto(clave) {
    notaContacto.dataset.clave = clave;
    notaContacto.textContent = TEXTOS[idioma][clave];
    notaContacto.hidden = false;
  }
  contacto.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var obligatorios = contacto.querySelectorAll('[required]');
    var primero = null;
    obligatorios.forEach(function (c) {
      var mal = !c.value.trim() || (c.type === 'email' && !c.checkValidity());
      c.classList.toggle('falta', mal);
      c.setAttribute('aria-invalid', String(mal));
      if (mal && !primero) { primero = c; }
    });
    if (primero) {
      mostrarNotaContacto('faltaContacto');
      primero.focus();
      return;
    }
    mostrarNotaContacto('demoContacto');
  });

  /* ---------- Aparecer al entrar ---------- */

  var bloques = doc.querySelectorAll('.rv, .rv-img');
  var contadores = [];
  doc.querySelectorAll('[data-contar]').forEach(function (el) {
    contadores.push({ el: el, fin: Number(el.dataset.contar), dec: Number(el.dataset.decimales || 0), listo: false });
  });

  function escribirCifra(c, valor) {
    var texto = valor.toFixed(c.dec);
    c.el.textContent = c.dec ? texto.replace('.', TEXTOS[idioma].decimal) : texto;
  }
  function contar(c) {
    if (c.listo) { return; }
    c.listo = true;
    if (reducido.matches || raiz.classList.contains('final')) { escribirCifra(c, c.fin); return; }
    var inicio = null;
    function paso(t) {
      if (inicio === null) { inicio = t; }
      var p = Math.min(1, (t - inicio) / DURACION_CONTADOR);
      var suave = 1 - Math.pow(1 - p, 3);
      escribirCifra(c, c.fin * suave);
      if (p < 1) { window.requestAnimationFrame(paso); }
    }
    escribirCifra(c, 0);
    window.requestAnimationFrame(paso);
  }

  if ('IntersectionObserver' in window) {
    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) { return; }
        e.target.classList.add('en');
        observador.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    bloques.forEach(function (b) { observador.observe(b); });

    var observaCifras = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) { return; }
        contadores.forEach(function (c) { if (c.el === e.target) { contar(c); } });
        observaCifras.unobserve(e.target);
      });
    }, { threshold: 0.6 });
    contadores.forEach(function (c) { observaCifras.observe(c.el); });
  } else {
    bloques.forEach(function (b) { b.classList.add('en'); });
    contadores.forEach(function (c) { c.listo = true; });
  }

  /* ---------- Parallax: las fotos a sangre van más lento que el scroll ---------- */

  var capas = [];
  doc.querySelectorAll('[data-parallax]').forEach(function (el) {
    var capa = el.querySelector('.senda-f, .pie-f') || el.querySelector('img');
    capa.classList.add('px');
    capas.push({ el: el, capa: capa, fuerza: Number(el.dataset.parallax) });
  });

  function moverCapas() {
    if (reducido.matches || raiz.classList.contains('final')) { return; }
    var alto = window.innerHeight;
    capas.forEach(function (c) {
      var r = c.el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > alto + 100) { return; }
      var avance = (r.top + r.height / 2 - alto / 2) / (alto + r.height); // -0,5 a 0,5
      c.capa.style.translate = '0 ' + (avance * c.fuerza * 2 * 100).toFixed(2) + '%';
    });
  }

  /* ---------- Cabecera: sólida y más chica al bajar ---------- */

  var hero = doc.getElementById('inicio');
  var barra = cabecera.querySelector('.barra');
  var enCola = false;

  function medir() {
    var escritorio = window.innerWidth >= ANCHO_ESCRITORIO;
    var medio = escritorio ? Math.round(form.querySelector('.campo').offsetHeight / 2) : 0;
    raiz.style.setProperty('--reserva-medio', medio + 'px');
    raiz.style.setProperty('--barra-alto', barra.offsetHeight + 'px');
    raiz.style.setProperty('--cab-alto', cabecera.offsetHeight + 'px');
    if (window.innerWidth >= ANCHO_MENU) { cerrarMenu(); }
    estadoPista();
  }
  function alBajar() {
    var y = window.scrollY;
    cabecera.classList.toggle('chica', y > UMBRAL_CHICA);
    cabecera.classList.toggle('solida', y > hero.offsetHeight - cabecera.offsetHeight * 1.2);
    moverCapas();
    enCola = false;
  }
  window.addEventListener('scroll', function () {
    if (!enCola) { enCola = true; window.requestAnimationFrame(alBajar); }
  }, { passive: true });
  window.addEventListener('resize', function () { medir(); alBajar(); });

  /* Sección actual en el menú */
  if ('IntersectionObserver' in window) {
    var enlaces = menu.querySelectorAll(':scope > a');
    var observaSecciones = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) { return; }
        enlaces.forEach(function (a) { a.classList.toggle('actual', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    doc.querySelectorAll('main section[id]').forEach(function (s) { observaSecciones.observe(s); });
  }

  aplicarIdioma();
  medir();
  alBajar();
})();
