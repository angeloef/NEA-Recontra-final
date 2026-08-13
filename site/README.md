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
