# NEA Sistemas — landing

Sitio estático. No necesita build, no tiene dependencias y no carga nada de CDNs externos.

## Estructura
- `index.html` — todo el contenido, en HTML plano (crawleable sin ejecutar JS)
- `app.js` — animaciones de scroll, tipeo del hero y estimador de precios. Vanilla, sin librerías.
- `uploads/` — video, imágenes y logos

## Local
`npx serve .` y abrir el puerto que indique.

Abrir el archivo con `file://` no funciona: el video no carga.

## Deploy en Render
Render → New → **Static Site** → conectá este repo.
- Build Command: *(vacío)*
- Publish Directory: `.` (o `site` si subís la carpeta dentro de otro repo)

## WhatsApp
El número vive **literal en los `href`** de las 15 CTAs (así el link funciona sin JS y Google
lo lee). Hoy es un placeholder: `5493764000000`.

Para cambiarlo, un solo comando desde `site/`:

```sh
grep -rl 'wa.me/5493764000000' . | xargs sed -i 's/wa\.me\/5493764000000/wa.me\/TU_NUMERO/g'
```

Formato internacional sin `+` ni espacios. Verificar después con
`grep -rc 'wa.me' index.html */index.html` (esperado: 6 en la home, 1 en cada subsección).

## Notas
- Los precios del estimador viven en la constante `PRICING` de `app.js`. Los nombres y
  descripciones de cada opción están en el HTML, para que Google los lea.
- Los anchors `#mockup`, `#llamada`, `#servicios` y `#precios` todavía no tienen destino:
  quedan a la espera de definir el canal de contacto.

### Fuentes
Están auto-hospedadas en `uploads/fonts/` y los `@font-face` viven **inline en el `<head>`
de `index.html`** (inline y no en un `.css` aparte para no gastar un round-trip que bloquea
el render). No se le pide nada a Google.

**Instrument Serif y Jersey 10 Charted están recortadas** a los glifos de las palabras
"Diseñar" y "Construir." — pesan 4 KB y 14 KB en vez de 65 KB y 227 KB. Si cambiás ese
texto en `index.html`, hay que regenerarlas o van a aparecer letras faltantes:

    https://fonts.googleapis.com/css2?family=Jersey+10+Charted&text=TEXTO_NUEVO&display=swap

Pedí esa URL con un User-Agent de Chrome, bajá el `.woff2` que devuelve y reemplazá el archivo.

### Assets
- `hero-ar.mp4` está recomprimido a 1920×1080 CRF 28 sin audio (10,5 MB → 1,2 MB). Se mantuvo
  la resolución nativa a propósito: es un screencast con texto chico, y bajar de 1920 lo
  vuelve borroso.
- Las imágenes de Servicios son WebP de 900×900 recortadas (los PNG originales eran de
  2688×1520, hasta 5,8 MB cada uno, para mostrarse en tarjetas de ~350 px).
- `hero-poster.webp` es el primer frame del video, para que el hero no arranque en negro.
- `muestra-*.webp` son las seis muestras de la sección de presupuesto. Se bajan
  recién al primer clic sobre su producto, no en el load inicial.
- Los originales pesados de esas muestras viven en `assets-fuente/`, fuera de
  `site/`, y están ignorados por git. El sitio solo sirve los WebP.

## Publicar el primer caso real (`casos/`)

La plantilla y el checklist vivian como comentario dentro de `casos/index.html`;
se servian a todo el mundo en cada visita. Quedan aca:

```html
==================================================================
ACÁ ENTRAN LOS CASOS REALES.
Cuando exista el primero, borrar el bloque .slot de abajo y en su
lugar poner los casos. Estructura sugerida por caso (reusa las
primitivas que ya estan en este mismo <style>, no hace falta CSS
nuevo):

  <article class="scen">
    <p class="eyebrow">CASO 01 — {RUBRO}, {CIUDAD}</p>
    <h3 class="h3">{Nombre real de la empresa}</h3>
    <div class="scen-grid">
      <div><h4>ANTES</h4><p>{numero + fecha + fuente}</p></div>
      <div><h4>QUÉ SE HIZO</h4><p>{decisiones, no entregables}</p></div>
      <div><h4>DESPUÉS</h4><p>{mismo numero + meses transcurridos}</p></div>
    </div>
    <p class="p"><b>Lo que no funcionó:</b> {…}</p>
    <a class="scen-link" href="{sitio del cliente}" rel="noopener">Ver el sitio →</a>
  </article>

Ademas, al publicar el primer caso real:
 1. Cambiar el <h1> del hero y el primer parrafo del lead.
 2. Revisar la seccion #donde-estamos (deja de ser cierta tal cual).
 3. Recien ahi tiene sentido sumar Review/CreativeWork al JSON-LD,
    y solo con el texto textual que el cliente autorizo.
==================================================================
```
