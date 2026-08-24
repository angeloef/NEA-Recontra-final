/* ------------------------------------------------------------------ agenda
   El unico script del sitio que habla con un servidor. Los datos (que dias y
   horas quedan libres, que reservo este cliente) viven en nea-leads; aca solo
   se pintan y se manda la eleccion.

   El link que recibe el cliente es /agenda/?t=<id>.<firma>. La firma la valida
   el server: aca el token viaja tal cual vino, sin interpretarlo.

   Tres pasos sobre el mismo panel: cuando -> datos -> listo. Las transiciones
   las hace GSAP; si el visitante pidio menos movimiento, se saltean y el
   resultado es el mismo, sin animar. */

(function () {
  'use strict';

  // El servicio de nea-leads. Si algun dia cambia de host, se cambia aca.
  // Servido desde localhost apunta a la copia local, que es como se prueba
  // sin tocar la agenda de produccion.
  var LOCAL = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  var API = LOCAL ? 'http://127.0.0.1:8777' : 'https://nea-leads.onrender.com';

  var $ = function (id) { return document.getElementById(id); };
  var MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
             'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var MES_C = ['ene', 'feb', 'mar', 'abr', 'may', 'jun',
               'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var DIA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado',
             'Domingo'];

  var token = new URLSearchParams(location.search).get('t') || '';
  var id = token.split('.')[0];

  var datos = null;       // lo que contesta /api/agenda-slots
  var mesVista = null;    // primer dia del mes que se esta mirando
  var dia = '';           // iso elegido
  var hora = '';          // 'HH:MM' elegida
  var enfocado = '';      // iso con tabindex 0 en la grilla

  // ---------------------------------------------------------------- fechas
  // new Date('2026-08-27') se interpreta como UTC y en Argentina cae un dia
  // antes. Todas las fechas se arman con los tres numeros, que es hora local.
  function aFecha(iso) {
    var p = iso.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  function aIso(f) {
    return f.getFullYear() + '-' +
           ('0' + (f.getMonth() + 1)).slice(-2) + '-' +
           ('0' + f.getDate()).slice(-2);
  }

  function lunes0(f) { return (f.getDay() + 6) % 7; }   // 0 = lunes

  function largo(iso) {
    var f = aFecha(iso);
    return DIA[lunes0(f)] + ' ' + f.getDate() + ' de ' + MES[f.getMonth()];
  }

  function mismoMes(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
  }

  // ---------------------------------------------------------------- motion
  var gsap = window.gsap;
  var quieto = !gsap ||
    (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function entra(sel, opciones) {
    if (quieto) return;
    var o = opciones || {};
    gsap.fromTo(sel, { opacity: 0, y: o.y === undefined ? 10 : o.y },
      { opacity: 1, y: 0, duration: o.duration || 0.42, ease: 'power3.out',
        stagger: o.stagger || 0, delay: o.delay || 0, clearProps: 'transform,opacity' });
  }

  // ----------------------------------------------------------------- pasos
  var PASOS = ['cuando', 'datos', 'listo'];
  var pasoActual = '';

  function paso(nombre, foco) {
    var saliendo = pasoActual ? $('paso-' + pasoActual) : null;
    var entrando = $('paso-' + nombre);
    pasoActual = nombre;
    pintaSteps();

    function mostrar() {
      PASOS.forEach(function (p) { $('paso-' + p).hidden = p !== nombre; });
      $('estado').hidden = true;
      $('steps').hidden = false;
      // en una columna el panel arranca abajo del contexto: cambiar de paso
      // sin traerlo a la vista deja al cliente mirando el paso anterior
      if (saliendo && document.querySelector('.ag-panel').getBoundingClientRect().top < 0)
        document.querySelector('.ag-panel').scrollIntoView({
          behavior: quieto ? 'auto' : 'smooth', block: 'start' });
      if (foco && foco.focus) foco.focus({ preventScroll: true });
    }

    if (quieto || !saliendo || saliendo === entrando) {
      mostrar();
      if (!quieto) entra(entrando, { y: 12 });
      return;
    }
    // cruce corto: lo que sale no empuja a lo que entra porque comparten lugar
    gsap.to(saliendo, {
      opacity: 0, y: -8, duration: 0.2, ease: 'power2.in',
      onComplete: function () {
        gsap.set(saliendo, { clearProps: 'all' });
        mostrar();
        entra(entrando, { y: 12 });
      }
    });
  }

  function pintaSteps() {
    var i = PASOS.indexOf(pasoActual);
    [].forEach.call($('steps').children, function (li, n) {
      li.classList.toggle('on', n === i);
      li.classList.toggle('done', n < i);
    });
  }

  // ---------------------------------------------------------------- estado
  function aviso(txt, mal) {
    $('estado-txt').innerHTML = txt;
    $('estado').hidden = false;
    $('estado').classList.toggle('mal', !!mal);
    PASOS.forEach(function (p) { $('paso-' + p).hidden = true; });
    $('steps').hidden = true;
    pasoActual = '';
  }

  // ------------------------------------------------------------ calendario
  function isosLibres() { return Object.keys(datos.dias).sort(); }

  function limites() {
    var libres = isosLibres();
    var hoy = new Date();
    var min = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    var ult = libres.length ? aFecha(libres[libres.length - 1]) : hoy;
    var max = new Date(ult.getFullYear(), ult.getMonth(), 1);
    if (max < min) max = min;
    return { min: min, max: max };
  }

  function pintaMes() {
    var lim = limites();
    var hoyIso = aIso(new Date());
    var primero = new Date(mesVista.getFullYear(), mesVista.getMonth(), 1);
    var dias = new Date(mesVista.getFullYear(), mesVista.getMonth() + 1, 0).getDate();

    $('mes-tit').textContent = MES[mesVista.getMonth()] + ' ' + mesVista.getFullYear();
    $('mes-ant').disabled = !(mesVista > lim.min);
    $('mes-sig').disabled = !(mesVista < lim.max);

    var grid = $('grid');
    grid.innerHTML = '';
    var i;
    for (i = 0; i < lunes0(primero); i++) {
      var h = document.createElement('div');
      h.className = 'ag-hueco';
      h.setAttribute('role', 'presentation');
      grid.appendChild(h);
    }

    var hayAlguno = false;
    for (i = 1; i <= dias; i++) {
      var iso = aIso(new Date(mesVista.getFullYear(), mesVista.getMonth(), i));
      var libre = !!datos.dias[iso];
      hayAlguno = hayAlguno || libre;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ag-dia' + (iso === hoyIso ? ' hoy' : '');
      b.textContent = i;
      b.dataset.iso = iso;
      b.setAttribute('role', 'gridcell');
      b.setAttribute('aria-selected', iso === dia ? 'true' : 'false');
      b.setAttribute('aria-label', largo(iso) +
        (libre ? ', ' + datos.dias[iso].length + ' horarios disponibles'
               : ', sin horarios'));
      if (!libre) b.setAttribute('aria-disabled', 'true');
      grid.appendChild(b);
    }

    // roving tabindex: uno solo entra por Tab, el resto se recorre con flechas
    if (!grid.querySelector('[data-iso="' + enfocado + '"]')) {
      enfocado = dia && mismoMes(aFecha(dia), mesVista) ? dia
               : (primerLibreDe(mesVista) || aIso(primero));
    }
    marcaFoco();

    $('mes-vacio').hidden = hayAlguno;
    if (!hayAlguno) {
      var sig = isosLibres().filter(function (x) { return aFecha(x) > mesVista; })[0];
      $('mes-vacio').innerHTML = 'No quedan horarios en ' + MES[mesVista.getMonth()] +
        (sig ? '. <button type="button" id="ir-sig">Ver ' + MES[aFecha(sig).getMonth()] +
               '</button>' : '.');
      if (sig) $('ir-sig').onclick = function () { vaAlMes(aFecha(sig), true); };
    }

    entra(grid.querySelectorAll('.ag-dia'),
          { y: 6, duration: 0.34, stagger: 0.008 });
  }

  function primerLibreDe(mes) {
    return isosLibres().filter(function (x) { return mismoMes(aFecha(x), mes); })[0] || '';
  }

  function marcaFoco() {
    [].forEach.call($('grid').querySelectorAll('.ag-dia'), function (b) {
      b.tabIndex = b.dataset.iso === enfocado ? 0 : -1;
    });
  }

  function vaAlMes(f, focar) {
    var lim = limites();
    var m = new Date(f.getFullYear(), f.getMonth(), 1);
    if (m < lim.min) m = lim.min;
    if (m > lim.max) m = lim.max;
    if (mesVista && mismoMes(m, mesVista)) return;
    mesVista = m;
    enfocado = '';
    pintaMes();
    if (focar) {
      var b = $('grid').querySelector('[data-iso="' + enfocado + '"]');
      if (b) b.focus();
    }
  }

  function eligeDia(iso) {
    nota('');
    dia = iso;
    hora = '';
    enfocado = iso;
    [].forEach.call($('grid').querySelectorAll('.ag-dia'), function (b) {
      b.setAttribute('aria-selected', b.dataset.iso === iso ? 'true' : 'false');
    });
    marcaFoco();
    pintaHoras();
  }

  // ----------------------------------------------------------------- horas
  function pintaHoras() {
    var cont = $('horas');
    if (!dia) {
      $('horas-tit').textContent = 'Elegí un día';
      cont.innerHTML = '<p class="ag-horas-vacio">Tocá un día del calendario ' +
        'para ver los horarios libres.</p>';
      return;
    }
    var f = aFecha(dia);
    $('horas-tit').textContent = DIA[lunes0(f)].slice(0, 3) + ' ' + f.getDate() +
                                 ' ' + MES_C[f.getMonth()];
    cont.innerHTML = '';
    (datos.dias[dia] || []).forEach(function (h) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ag-hora';
      b.textContent = h;
      b.setAttribute('aria-selected', 'false');
      b.setAttribute('aria-label', h + ' del ' + largo(dia));
      b.onclick = function () {
        hora = h;
        b.setAttribute('aria-selected', 'true');
        aDatos();
      };
      cont.appendChild(b);
    });
    entra(cont.querySelectorAll('.ag-hora'),
          { y: 8, duration: 0.32, stagger: 0.03 });
  }

  // ------------------------------------------------------------------ red
  function pedir(cuerpo) {
    return fetch(API + '/api/agenda-reserva', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ id: id, token: token }, cuerpo))
    });
  }

  function cargar(alVolver) {
    // El plan free de Render duerme el servicio a los 15 minutos: la primera
    // carga puede tardar cerca de un minuto. Sin este aviso parece colgado.
    var lento = setTimeout(function () {
      $('estado-txt').textContent = 'Buscando los horarios libres… puede ' +
        'tardar hasta un minuto la primera vez.';
    }, 5000);
    return fetch(API + '/api/agenda-slots?id=' + encodeURIComponent(id) +
                 '&token=' + encodeURIComponent(token))
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      })
      .then(function (d) {
        clearTimeout(lento);
        datos = d;
        pinta(alVolver);
      })
      .catch(function () {
        clearTimeout(lento);
        aviso('No pudimos abrir tu agenda. El link puede haber vencido: ' +
          '<b><a href="https://wa.me/5493755446606">escribinos por WhatsApp</a></b> ' +
          'y te mandamos uno nuevo.', true);
      });
  }

  // ---------------------------------------------------------------- pintar
  function pinta(forzarElegir) {
    if (datos.empresa) $('empresa').textContent = datos.empresa;
    if (datos.duracion) $('dur').textContent = datos.duracion + ' minutos';

    if (datos.reserva && !forzarElegir) {
      $('cuando').textContent = largo(datos.reserva.cuando.split(' ')[0]) +
                                ', ' + datos.reserva.cuando.split(' ')[1];
      $('ics').href = API + '/api/agenda-ics?id=' + encodeURIComponent(id) +
                      '&token=' + encodeURIComponent(token);
      paso('listo');
      festeja();
      return;
    }

    if (!isosLibres().length) {
      return aviso('No quedan horarios libres en las próximas semanas. ' +
        '<b><a href="https://wa.me/5493755446606">Escribinos por WhatsApp</a></b> ' +
        'y lo arreglamos a mano.');
    }

    var primero = isosLibres()[0];
    if (!dia || !datos.dias[dia]) dia = primero;
    vaAlMes(aFecha(dia));
    eligeDia(dia);
    paso('cuando');
  }

  function festeja() {
    if (quieto) return;
    gsap.fromTo('.ag-tick', { scale: 0.4, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.55, ease: 'back.out(2)', delay: 0.1 });
    gsap.fromTo('.ag-tick svg', { opacity: 0, scale: 0.6 },
      { opacity: 1, scale: 1, duration: 0.35, ease: 'power2.out', delay: 0.28 });
    gsap.fromTo('#paso-listo .ag-cuando', { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', delay: 0.18,
        clearProps: 'transform,opacity' });
    gsap.fromTo('#paso-listo .ag-meta > div', { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out', delay: 0.3,
        stagger: 0.06, clearProps: 'transform,opacity' });
  }

  // ------------------------------------------------------------ paso datos
  function aDatos() {
    $('elegido-dia').textContent = largo(dia);
    $('elegido-hora').textContent = hora + ' a ' + fin(hora) +
                                    ' · hora de Argentina';
    $('nombre').value = $('nombre').value || datos.nombre || '';
    $('whatsapp').value = $('whatsapp').value || datos.whatsapp || '';
    var ancha = window.matchMedia('(min-width:720px)').matches;
    paso('datos', ancha ? $('nombre') : null);
  }

  function fin(h) {
    var p = h.split(':'), m = (+p[0]) * 60 + (+p[1]) + (datos.duracion || 45);
    return ('0' + Math.floor(m / 60) % 24).slice(-2) + ':' + ('0' + m % 60).slice(-2);
  }

  function marcaError(campo, mal) {
    $(campo).setAttribute('aria-invalid', mal ? 'true' : 'false');
    $('err-' + campo).hidden = !mal;
    return !mal;
  }

  function trabajando(btn, txt) {
    btn.disabled = true;
    btn.dataset.antes = btn.textContent;
    btn.textContent = txt;
  }

  function libre(btn) {
    btn.disabled = false;
    btn.textContent = btn.dataset.antes || btn.textContent;
  }

  // mensaje corto arriba del calendario (el horario que se ocupo, p. ej.)
  function nota(txt) {
    $('nota').textContent = txt;
    $('nota').hidden = !txt;
    if (txt && !quieto) gsap.fromTo('#nota', { opacity: 0, y: -6 },
      { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' });
  }

  function pieMal(txt) {
    $('aviso').textContent = txt;
    $('aviso').classList.add('mal');
    if (!quieto) gsap.fromTo('#aviso', { opacity: 0 }, { opacity: 1, duration: 0.3 });
  }

  // --------------------------------------------------------------- eventos
  $('grid').addEventListener('click', function (ev) {
    var b = ev.target.closest('.ag-dia');
    if (!b || b.getAttribute('aria-disabled') === 'true') return;
    eligeDia(b.dataset.iso);
  });

  // teclado en la grilla, como cualquier date picker que se respete
  $('grid').addEventListener('keydown', function (ev) {
    var salto = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7,
                  PageUp: -1000, PageDown: 1000 }[ev.key];
    if (salto === undefined && ev.key !== 'Home' && ev.key !== 'End') return;
    ev.preventDefault();
    var f = aFecha(enfocado || dia);
    if (salto === -1000 || salto === 1000) {
      f = new Date(f.getFullYear(), f.getMonth() + (salto > 0 ? 1 : -1), 1);
    } else if (ev.key === 'Home') {
      f.setDate(f.getDate() - lunes0(f));
    } else if (ev.key === 'End') {
      f.setDate(f.getDate() + (6 - lunes0(f)));
    } else {
      f.setDate(f.getDate() + salto);
    }
    var iso = aIso(f);
    if (!mismoMes(f, mesVista)) {
      vaAlMes(f);
      if (!$('grid').querySelector('[data-iso="' + iso + '"]')) return;
    }
    enfocado = iso;
    marcaFoco();
    var b = $('grid').querySelector('[data-iso="' + iso + '"]');
    if (b) b.focus();
  });

  $('mes-ant').onclick = function () {
    vaAlMes(new Date(mesVista.getFullYear(), mesVista.getMonth() - 1, 1));
  };
  $('mes-sig').onclick = function () {
    vaAlMes(new Date(mesVista.getFullYear(), mesVista.getMonth() + 1, 1));
  };

  $('cambiar').onclick = function () {
    hora = '';
    paso('cuando');
    pintaHoras();
  };

  $('paso-datos').addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (!dia || !hora) return;
    var ok = marcaError('nombre', !$('nombre').value.trim());
    ok = marcaError('whatsapp', !$('whatsapp').value.trim()) && ok;
    if (!ok) return $(!$('nombre').value.trim() ? 'nombre' : 'whatsapp').focus();

    trabajando($('confirmar'), 'Confirmando…');
    pedir({ cuando: dia + ' ' + hora, nombre: $('nombre').value,
            whatsapp: $('whatsapp').value, tema: $('tema').value })
      .then(function (r) {
        if (r.ok) return cargar();
        libre($('confirmar'));
        // 409: alguien tomo ese horario entre que abrio la pagina y confirmo
        if (r.status === 409) {
          hora = '';
          return cargar(true).then(function () {
            nota('Ese horario se acaba de ocupar mientras lo completabas. ' +
                 'Estos son los que quedan libres.');
          });
        }
        pieMal('No se pudo guardar. Probá de nuevo o escribinos por WhatsApp.');
      })
      .catch(function () {
        libre($('confirmar'));
        pieMal('Sin conexión. Probá de nuevo en un momento.');
      });
  });

  $('reprogramar').onclick = function () {
    // no cancela nada todavia: la reserva vieja se pisa recien cuando elige la
    // nueva. Si cierra la pestaña a mitad, sigue teniendo la suya.
    hora = '';
    pinta(true);
  };

  $('cancelar').onclick = function () {
    if (!confirm('¿Cancelar la reunión? Podés volver a elegir horario con ' +
                 'este mismo link.')) return;
    trabajando($('cancelar'), 'Cancelando…');
    pedir({ borrar: 1 })
      .then(function () { dia = ''; hora = ''; return cargar(); })
      .catch(function () {
        libre($('cancelar'));
        alert('No se pudo cancelar. Escribinos por WhatsApp.');
      });
  };

  // ---------------------------------------------------------------- arranque
  if (!id || token.indexOf('.') < 0) {
    aviso('Este link no es válido. ' +
      '<b><a href="https://wa.me/5493755446606">Escribinos por WhatsApp</a></b> ' +
      'y te mandamos el tuyo.', true);
  } else {
    if (!quieto) entra('.ag-rail > *', { y: 14, stagger: 0.05, duration: 0.5 });
    cargar();
  }
})();
