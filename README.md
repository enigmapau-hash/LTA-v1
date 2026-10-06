# LoL Team Analyzer

Mini PWA para reproducir en el navegador la pestaña **Composición** del Excel del repositorio.

## Estado actual

- Versión visible: `v1.2.4`
- Fuente de datos: `Draft Pool.xlsx` de este repositorio.
- La app lee el Excel en el navegador y genera el resultado a partir de la hoja **Composición**.
- Cada rol usa su lista de campeones de la hoja correspondiente.
- No permite campeones repetidos.
- Muestra iconos oficiales de campeones cuando están disponibles.
- El selector, la vista rápida y el resultado se actualizan sin recargar.
- SheetJS se incluye localmente; Data Dragon aporta iconos opcionales cuando hay conexión.

## Estructura del proyecto

- `index.html`: estructura principal de la app.
- `style.css` y los archivos `stage3-*.css`: estilos de la interfaz.
- `app.js`: carga del Excel, selector, validaciones y resultado.
- `shared-utils.js`, `smart-search.js`, `no-duplicate-options.js`, `selected-preview.js`, `menu-icons.js` y `realtime-mode.js`: comportamiento del selector.
- `result-summary.js` y `result-summary.css`: resumen del resultado.
- `version.json` y `version.js`: versión visible y detalle de cambios.
- `sw.js`: caché offline de los recursos de la app, incluida la librería SheetJS.
- `vendor/xlsx.full.min.js`: versión local de SheetJS para que la lectura del Excel funcione offline.
- `.github/workflows/pwa-validation.yml`: pruebas con Chromium para el ciclo PWA y la lógica de composición.
- `tools/check-composition.cjs`: compara cada selector con su hoja del Excel y comprueba duplicados, entradas inválidas y actualización en tiempo real.
- `Draft Pool.xlsx`: workbook usado por la app.
- `tools/bump-version.cjs`: sincroniza la versión y el changelog.
- `vendor/README.md` y `vendor/LICENSE.txt`: procedencia y licencia de SheetJS.

## Uso local

No hay paso de compilación ni dependencias npm necesarias. Sirve los archivos con un servidor estático desde la raíz del proyecto:

```bash
python -m http.server 8000
```

Abre `http://localhost:8000`. SheetJS está incluido en el repositorio y el service worker guarda sus archivos junto con el workbook. Tras cargar la página una vez, se pueden seleccionar campeones y generar el resultado sin conexión. Los iconos de Data Dragon son opcionales y solo aparecen cuando hay conexión.

## Despliegue

El proyecto contiene los archivos de una web estática y puede publicarse con un hosting estático, incluido GitHub Pages. La configuración de publicación depende de los ajustes del repositorio.

## Versionado de cambios

Actualiza la versión en la misma rama y PR que introduce cada cambio que se vaya a publicar:

```bash
npm run version:bump -- patch "Resumen del cambio"
```

Usa `minor` para una mejora funcional compatible y `major` para un cambio incompatible. El comando sincroniza el badge y la versión de `README.md`, `version.json`, el fallback de `version.js`, `package.json`, `CHANGELOG.md` y la caché del service worker en `sw.js`. Ejecuta `npm run version:check` para comprobar que los números visibles y el changelog siguen sincronizados. No requiere instalar dependencias para versionar. El workflow instala Chromium de forma temporal y prueba el ciclo PWA junto con los cinco selectores, duplicados, entradas inválidas, actualización en tiempo real y ausencia de errores en consola.
