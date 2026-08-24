/* ------------------------------------------------------------------ agenda
   El unico script del sitio que habla con un servidor. Los datos (que horarios
   quedan libres, que reservo este cliente) viven en nea-leads; aca solo se
   pintan y se manda la eleccion.

   El link que recibe el cliente es /agenda/?t=<id>.<firma>. La firma la valida
   el server: aca el token viaja tal cual vino, sin interpretarlo. */

(function () {
  'use strict';

  // El servicio de nea-leads. Si algun dia cambia de host, se cambia aca.
  // Servido desde localhost apunta a la copia local, que es como se prueba
  // sin tocar la agenda de produccion.
  var LOCAL = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  var API = LOCAL ? 'http://127.0.0.1:8777' : 'https://nea-leads.onrender.com';

  var $ = function (id) { return document.getElementById(id); };
  var DOW = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  var MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun',
             'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  // el server manda las fechas sin acentos (todo su codigo es ascii); la
  // linea grande de la confirmacion se arma aca, con la ortografia del sitio
  var DIA_L = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado',
               'Domingo'];
  var MES_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
               'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  var token = new URLSearchParams(location.search).get('t') || '';
  var id = token.split('.')[0];
  var datos = null, dia = '', hora = '';

  function aviso(txt, mal) {
    $('estado').innerHTML = txt;
    $('estado').hidden = false;
    $('estado').classList.toggle('mal', !!mal);
  }

  // new Date('2026-08-27') se interpreta como UTC y en Argentina cae un dia
  // antes. Se arma con los tres numeros para que sea la fecha local, siempre.
  function fecha(iso) {
    var p = iso.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  function dow(f) { return DOW[(f.getDay() + 6) % 7]; }

  function etiqueta(iso, h) {
    var f = fecha(iso);
    return dow(f) + ' ' + f.getDate() + ' de ' + MES[f.getMonth()] +
           ' a las ' + h;
  }

  // '2026-08-26 10:00' -> 'Miércoles 26 de agosto, 10:00'
  function largo(cuando) {
    var p = cuando.split(' '), f = fecha(p[0]);
    return DIA_L[(f.getDay() + 6) % 7] + ' ' + f.getDate() + ' de ' +
           MES_L[f.getMonth()] + ', ' + p[1];
  }

  function pedir(cuerpo) {
    return fetch(API + '/api/agenda-reserva', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ id: id, token: token }, cuerpo))
    });
  }

  function pintaDias() {
    var isos = Object.keys(datos.dias);
    $('dias').innerHTML = '';
    isos.forEach(function (iso) {
      var f = fecha(iso), b = document.createElement('button');
      b.type = 'button';
      b.className = 'dia';
      b.setAttribute('aria-pressed', iso === dia ? 'true' : 'false');
      // los tres <span> sueltos no le dan nombre al boton: quien navega por
      // lector de pantalla escucharia "boton" y nada mas
      b.setAttribute('aria-label',
                     dow(f) + ' ' + f.getDate() + ' de ' + MES[f.getMonth()]);
      b.innerHTML = '<span class="dow">' + dow(f) + '</span>' +
                    '<span class="num">' + f.getDate() + '</span>' +
                    '<span class="mes">' + MES[f.getMonth()] + '</span>';
      b.onclick = function () { dia = iso; hora = ''; pinta(); };
      $('dias').appendChild(b);
    });
  }

  function pintaHoras() {
    $('horas').innerHTML = '';
    (datos.dias[dia] || []).forEach(function (h) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'hora';
      b.textContent = h;
      b.setAttribute('aria-pressed', h === hora ? 'true' : 'false');
      b.onclick = function () {
        hora = h;
        pinta();
        $('datos').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      };
      $('horas').appendChild(b);
    });
  }

  function pinta() {
    pintaDias();
    pintaHoras();
    $('datos').hidden = !hora;
    if (hora) $('confirmar').textContent = 'Confirmar ' + etiqueta(dia, hora);
  }

  function mostrar() {
    var hayDias = Object.keys(datos.dias).length > 0;
    if (datos.empresa)
      $('lead').textContent = 'Reunión de ' + datos.duracion + ' minutos con ' +
        datos.empresa + '. Elegí el día y la hora que te queden cómodos: es ' +
        'una videollamada, sin costo y sin compromiso.';

    if (datos.reserva) {
      $('cuando').textContent = largo(datos.reserva.cuando);
      $('ics').href = API + '/api/agenda-ics?id=' + encodeURIComponent(id) +
                      '&token=' + encodeURIComponent(token);
      $('confirmada').hidden = false;
      $('elegir').hidden = true;
      $('estado').hidden = true;
      return;
    }

    $('confirmada').hidden = true;
    if (!hayDias) {
      return aviso('No quedan horarios libres en las próximas semanas. ' +
        '<b><a href="https://wa.me/5493755446606">Escribinos por WhatsApp</a></b> ' +
        'y lo arreglamos a mano.');
    }
    dia = dia && datos.dias[dia] ? dia : Object.keys(datos.dias)[0];
    hora = '';
    $('nombre').value = $('nombre').value || datos.nombre || '';
    $('whatsapp').value = $('whatsapp').value || datos.whatsapp || '';
    $('estado').hidden = true;
    $('elegir').hidden = false;
    pinta();
  }

  function cargar() {
    // El plan free de Render duerme el servicio a los 15 minutos: la primera
    // carga puede tardar cerca de un minuto. Sin este aviso parece colgado.
    var lento = setTimeout(function () {
      aviso('Buscando los horarios libres… puede tardar hasta un minuto la ' +
            'primera vez.');
    }, 5000);
    fetch(API + '/api/agenda-slots?id=' + encodeURIComponent(id) +
          '&token=' + encodeURIComponent(token))
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      })
      .then(function (d) { clearTimeout(lento); datos = d; mostrar(); })
      .catch(function () {
        clearTimeout(lento);
        aviso('No pudimos abrir tu agenda. El link puede haber vencido: ' +
          '<b><a href="https://wa.me/5493755446606">escribinos por WhatsApp</a></b> ' +
          'y te mandamos uno nuevo.', true);
      });
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

  $('datos').addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (!hora) return;
    trabajando($('confirmar'), 'Confirmando…');
    pedir({ cuando: dia + ' ' + hora, nombre: $('nombre').value,
            whatsapp: $('whatsapp').value, tema: $('tema').value })
      .then(function (r) {
        if (r.ok) return location.reload();
        libre($('confirmar'));
        // 409: alguien tomo ese horario entre que abrio la pagina y confirmo
        if (r.status === 409) {
          $('aviso').textContent = 'Ese horario se acaba de ocupar. Te ' +
            'mostramos los que quedan libres.';
          $('aviso').classList.add('mal');
          return cargar();
        }
        $('aviso').textContent = 'No se pudo guardar. Probá de nuevo o ' +
          'escribinos por WhatsApp.';
        $('aviso').classList.add('mal');
      })
      .catch(function () {
        libre($('confirmar'));
        $('aviso').textContent = 'Sin conexión. Probá de nuevo en un momento.';
        $('aviso').classList.add('mal');
      });
  });

  $('reprogramar').onclick = function () {
    $('confirmada').hidden = true;
    $('elegir').hidden = false;
    dia = ''; hora = '';
    mostrarPicker();
  };

  // reprogramar no cancela nada todavia: la reserva vieja se pisa recien
  // cuando elige la nueva. Si cierra la pestaña a mitad, sigue teniendo la suya.
  function mostrarPicker() {
    var r = datos.reserva;
    datos.reserva = null;
    mostrar();
    datos.reserva = r;
  }

  $('cancelar').onclick = function () {
    if (!confirm('¿Cancelar la reunión? Podés volver a elegir horario con ' +
                 'este mismo link.')) return;
    trabajando($('cancelar'), 'Cancelando…');
    pedir({ borrar: 1 }).then(function () { location.reload(); })
      .catch(function () {
        libre($('cancelar'));
        alert('No se pudo cancelar. Escribinos por WhatsApp.');
      });
  };

  if (!id || token.indexOf('.') < 0) {
    aviso('Este link no es válido. ' +
      '<b><a href="https://wa.me/5493755446606">Escribinos por WhatsApp</a></b> ' +
      'y te mandamos el tuyo.', true);
  } else {
    cargar();
  }
})();
