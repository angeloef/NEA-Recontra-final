# NEA Sistemas — landing

Sitio estático. No necesita build.

## Estructura
- index.html
- support.js (runtime que necesita index.html)
- uploads/ (video, imágenes y logos)

## Deploy en Render
Render → New → **Static Site** → conectá este repo.
- Build Command: *(vacío)*
- Publish Directory: `.`  (o `site` si subís la carpeta dentro de otro repo)

## Local
`npx serve .` y abrir el puerto que indique (abrir el archivo con file:// no carga el video ni el runtime).
