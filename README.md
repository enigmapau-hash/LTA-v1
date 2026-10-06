# LoL Team Analyzer

Mini PWA para reproducir en el navegador la pestaña **Composición** del Excel del repositorio.

## Estado actual

- Versión visible: `v1.2.0`
- Fuente de datos: `Draft Pool.xlsx` de este repositorio.
- La app lee el Excel en el navegador y genera el resultado a partir de la hoja **Composición**.
- Cada rol usa su lista de campeones de la hoja correspondiente.
- No permite campeones repetidos.
- El selector, la vista rápida y el resultado se actualizan sin recargar.
- Las librerías del navegador se cargan desde CDN.

## Estructura del proyecto

- `index.html`: estructura principal de la app.
- `style.css` y los archivos `stage3-*.css`: estilos de la interfaz.
- `app.js`: carga del Excel, selector, validaciones y resultado.
- `shared-utils.js`, `smart-search.js`, `no-duplicate-options.js`, `selected-preview.js`, `menu-icons.js` y `realtime-mode.js`: comportamiento del selector.
- `result-summary.js` y `result-summary.css`: resumen del resultado.
- `version.json` y `version.js`: versión visible.
- `sw.js`: caché offline de los recursos de la app.
- `Draft Pool.xlsx`: workbook usado por la app.

## Uso local

No hay paso de compilación ni dependencias npm necesarias. Sirve los archivos con un servidor estático desde la raíz del proyecto:

```bash
python -m http.server 8000
```

Abre `http://localhost:8000`. La app carga SheetJS desde CDN; para usar la app por primera vez se necesita conexión a internet.

## Despliegue

El proyecto contiene los archivos de una web estática y puede publicarse con un hosting estático, incluido GitHub Pages. La configuración de publicación depende de los ajustes del repositorio.

## Mantenimiento

Mantén `version.json`, `version.js`, el badge de `index.html` y `CHANGELOG.md` sincronizados al publicar una versión nueva.
