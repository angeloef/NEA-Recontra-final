  /* ------------------------------------------------------------- estimador
     Estado 0: nada elegido, dos columnas. Al tocar una card reducida nace la
     columna del medio con la card expandida. Cada panel guarda el estado de
     sus propios extras en su DOM, asi volver a un producto recupera lo que
     ya habias armado: la memoria por producto sale gratis.

     El morph usa la View Transitions API. Donde no existe (o con
     prefers-reduced-motion) el panel simplemente aparece. */

  // Numero de WhatsApp en formato internacional, sin + ni espacios.
  // El mismo numero esta literal en los href de las CTAs: si cambia, van los dos.
  const WA_NUMERO = '5493755446606';

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
    // Un solo camino para abrir y cerrar la hoja: lo usan el boton, el swipe y
    // los cambios de producto, asi el aria y el texto del pie nunca se separan
    // del estado real.
    function setDetalle(on) {
      if (!sumbox) return;
      sumbox.classList.toggle('is-detail', on);
      if (sumbar) sumbar.setAttribute('aria-expanded', String(on));
      const hint = document.getElementById('nea-barhint');
      if (hint && hint.textContent) {
        hint.textContent = on
          ? 'Deslizá o tocá para ocultar'
          : 'Soporte · tocá para revisar';
      }
    }
    const cerrarDetalle = () => setDetalle(false);
    const totalNode = document.getElementById('nea-total');
    const totalLabel = document.getElementById('nea-totallabel');
    const noteNode = document.getElementById('nea-note');
    const detailNode = document.getElementById('nea-detail');
    const mesNode = document.getElementById('nea-mes');
    const mesLabel = document.getElementById('nea-meslabel');
    const mesNote = document.getElementById('nea-mesnote');
    // Soporte desde el año 2 (Precios v2, 14/10/2026): lo declara cada boton en data-soporte.
    const soporteDe = btn => btn && btn.getAttribute('data-soporte');
    const ahorroNode = document.getElementById('nea-ahorro');
    const mesBlock = document.getElementById('nea-mesblock');
    const planOpts = Array.from(document.querySelectorAll('[data-plan]'));
    const barLabel = document.getElementById('nea-barlabel');
    const barMes = document.getElementById('nea-barmes');
    const cta = document.getElementById('nea-cta');
    const dlg = document.getElementById('nea-dlg');
    if (!picks.length || !totalNode) return;

    const barHint = document.getElementById('nea-barhint');

    // Escribir un numero sin mover nada se lee como que no paso nada, sobre
    // todo en telefono donde no hay hover ni cursor. Cuando el texto cambia de
    // verdad, el nodo pulsa una vez.
    function setText(node, txt) {
      if (!node || node.textContent === txt) return;
      node.textContent = txt;
      if (quiet.matches) return;
      node.classList.remove('nea-bump');
      void node.offsetWidth;   // reinicia la animacion si el cambio es seguido
      node.classList.add('nea-bump');
    }

    // El plan de soporte es lo unico que el usuario tiene que decidir despues
    // de elegir producto, y en mobile vive detras de la barra. La primera vez
    // que hay algo que revisar ahi, la barra lo dice y late; despues de abrirla
    // una vez no vuelve a insistir.
    let nudged = false, nudgeVisto = false;
    function nudge(on) {
      if (!sumbox) return;
      if (on && !nudgeVisto && !nudged) { sumbox.classList.add('is-nudge'); nudged = true; }
      if (!on && nudged) { sumbox.classList.remove('is-nudge'); nudged = false; }
    }

    const fmt = n => '$' + Math.round(n).toLocaleString('es-AR');
    // Plazo por producto (Inicio v3 / Precios v2, 14/10/2026): lo declara cada boton en data-weeks.
    const weeks = btn => (btn && btn.getAttribute('data-weeks')) || '2 a 8';
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
        if (barHint) barHint.textContent = '';
        nudge(false);
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
        setText(barLabel, 'Sistemas a medida');
        barMes.textContent = 'A cotizar';
        if (barHint) barHint.textContent = 'Tocá para ver el detalle';
        nudge(false);
      } else {
        totalLabel.textContent = 'PAGO ÚNICO';
        setText(totalNode, 'Desde ' + fmt(s.total));
        noteNode.textContent = 'Incluye diseño, desarrollo y puesta online. Plazo estimado ' + weeks(pickOf(s.id)) + ' semanas.';
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
          ahorroNode.style.display = 'none';
          if (mesNote) {
            const sop = soporteDe(pickOf(s.id));
            mesNote.textContent = 'El primer año va incluido en el precio del proyecto: hosting, dominio, copias de seguridad, actualizaciones y hasta dos cambios menores por mes. ' +
              (sop ? 'Desde el segundo año, ' + sop + ' por mes, o diez meses si pagás el año adelantado.' : 'Desde el segundo año, el soporte se cotiza junto con el sistema.');
          }
        } else {
          mesLabel.textContent = (s.aniosPagos === 1 ? 'Año 2' : 'Años 2 a ' + s.anios) + ', pago adelantado';
          setText(mesNode, fmt(s.soporte));
          ahorroNode.style.display = '';
          ahorroNode.textContent = 'Ahorrás ' + fmt(s.ahorro) + ' · te queda en ' +
            fmt(s.soporte / (s.anios * MESES_POR_AÑO)) + ' por mes';
        }
        setText(barLabel, 'Desde ' + fmt(s.total));
        barMes.textContent = s.aniosPagos === 0
          ? '1er año incluido'
          : '+ ' + fmt(s.soporte);
        if (barHint) {
          barHint.textContent = sumbox && sumbox.classList.contains('is-detail')
            ? 'Deslizá o tocá para ocultar'
            : 'Soporte · tocá para revisar';
        }
        nudge(true);
      }
      cta.textContent = s.isQuote ? 'Contarnos tu caso' : 'Enviar por WhatsApp';
    }

    // El morph: el nombre de transicion viaja de la card reducida al panel.
    /* En telefono la card ocupa la pantalla entera y la View Transition tiene
       que fotografiar todo el documento para el morph: ahi se va a menos de 30
       fps. La hoja se anima con transform y opacidad, que van al compositor y
       no tocan layout. El morph queda para escritorio, donde la card es chica
       y el efecto se entiende. */
    const SHEET_EASE = 'cubic-bezier(.22,1,.36,1)';

    // Cortar lo que este corriendo antes de encadenar otra: abrir y cerrar
    // rapido dejaba dos animaciones peleando por el mismo transform.
    const cortar = node => node.getAnimations().forEach(a => { a.onfinish = a.oncancel = null; a.cancel(); });

    function sheetIn(node) {
      if (!node || quiet.matches || !node.animate) return;
      cortar(node);
      node.animate(
        [{ transform: 'translateY(16px)', opacity: 0 }, { transform: 'none', opacity: 1 }],
        { duration: 280, easing: SHEET_EASE }
      );
    }

    function sheetOut(node, done) {
      let hecho = false;
      const fin = () => { if (hecho) return; hecho = true; done(); };
      if (!node || quiet.matches || !node.animate) { fin(); return; }
      cortar(node);
      const a = node.animate(
        [{ transform: 'none', opacity: 1 }, { transform: 'translateY(18px)', opacity: 0 }],
        { duration: 210, easing: 'cubic-bezier(.4,0,1,1)' }
      );
      a.onfinish = a.oncancel = fin;
      // Red de seguridad: si la pestaña deja de pintar (cambio de app, ahorro
      // de energia) la animacion no termina nunca y la card quedaria abierta.
      setTimeout(fin, 340);
    }

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
      if (hoja.matches) { open = id; render(); sheetIn(panelOf(id)); return; }
      morph(pickOf(id), () => panelOf(id), () => { open = id; });
    }

    function closePanel() {
      if (!open) return;
      cerrarDetalle();
      const from = panelOf(open);
      const back = pickOf(open);
      if (hoja.matches) {
        // primero la salida, despues el render: si se apaga antes, no hay nada
        // que animar y la card desaparece de un frame al otro
        sheetOut(from, () => { open = null; render(); if (back) back.focus({ preventScroll: true }); });
        return;
      }
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

    /* La card a pantalla completa es una hoja mas: deslizarla hacia abajo la
       cierra, igual que la estimacion. La X sigue estando, pero en telefono
       nadie la busca primero. Mismo criterio que alla: solo cuenta si la card
       ya esta arriba de todo en su scroll, si no cerraria mientras se lee. */
    const hoja = matchMedia('(max-width:900px)');

    panels.forEach(p => {
      let y0 = 0, x0 = 0, arriba = true;
      p.addEventListener('touchstart', e => {
        const t = e.touches[0];
        y0 = t.clientY; x0 = t.clientX;
        arriba = p.scrollTop <= 0;
      }, { passive: true });
      p.addEventListener('touchend', e => {
        if (!hoja.matches || !arriba) return;
        const t = e.changedTouches[0];
        const dy = t.clientY - y0;
        if (dy < 72 || Math.abs(t.clientX - x0) > dy) return;
        closePanel();
      }, { passive: true });

      p.querySelectorAll('[data-close]').forEach(x => x.addEventListener('click', closePanel));
      // La X no descarta nada: los extras marcados quedan en el DOM del panel.
      p.querySelectorAll('[data-add]').forEach(b => {
        b.addEventListener('click', () => { b.classList.toggle('is-on'); render(); });
      });
    });

    if (sumbar && sumbox) {
      sumbar.addEventListener('click', () => {
        setDetalle(!sumbox.classList.contains('is-detail'));
        // ya lo vio: el aviso no vuelve en toda la sesion
        nudgeVisto = true;
        nudge(false);
      });

      /* La hoja se cierra deslizando para abajo, como cualquier bottom sheet:
         tocar el boton no puede ser la unica salida cuando el gesto natural es
         el otro. Solo cuenta si el detalle ya esta arriba de todo en su propio
         scroll, si no cerraria cada vez que el dedo baja para leer. */
      const sumfull = document.getElementById('nea-sumfull');
      let y0 = 0, x0 = 0, arriba = true;

      sumbox.addEventListener('touchstart', e => {
        const t = e.touches[0];
        y0 = t.clientY; x0 = t.clientX;
        arriba = !sumfull || sumfull.scrollTop <= 0;
      }, { passive: true });

      sumbox.addEventListener('touchend', e => {
        const t = e.changedTouches[0];
        const dy = t.clientY - y0;
        // gesto claramente vertical: si el dedo se fue en diagonal es scroll
        if (Math.abs(dy) < 56 || Math.abs(t.clientX - x0) > Math.abs(dy)) return;
        const abierto = sumbox.classList.contains('is-detail');
        if (abierto && dy > 0 && arriba) setDetalle(false);
        else if (!abierto && dy < 0) { setDetalle(true); nudgeVisto = true; nudge(false); }
      }, { passive: true });
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

  /* ---- montaje (estaba en el boot de app.js) ---- */
  /* El markup del estimador vive en estimador.html y lo comparten la home y
     /precios/. Si hay punto de montaje lo traemos y recien ahi lo inicializamos;
     si el fetch falla, el resto de la pagina sigue funcionando igual. */
  const estMount = document.getElementById('nea-estmount');
  if (estMount) {
    fetch(estMount.dataset.src)
      .then(r => r.ok ? r.text() : Promise.reject(r.status))
      .then(html => {
        const tpl = document.createElement('template');
        tpl.innerHTML = html.trim();
        const sec = tpl.content.querySelector('#estimacion');
        if (!sec) return;
        if (estMount.dataset.class) sec.classList.add(estMount.dataset.class);
        estMount.replaceWith(sec);
        initEstimator();
        // Si entraste directo con #estimacion, el ancla existia antes que el
        // bloque: el navegador ya no lo va a buscar solo.
        if (location.hash === '#estimacion') sec.scrollIntoView();
      })
      .catch(() => {});
  } else {
    initEstimator();
  }
