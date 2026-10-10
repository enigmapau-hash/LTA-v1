# League Team Analyzer

Analiza composiciones de League of Legends y ofrece una lectura estratégica clara para entender cómo jugarlas.

## Características

- Versión visible: `v1.18.0`
- No permite campeones repetidos.
- Muestra iconos oficiales de campeones cuando están disponibles.
- El selector, la vista rápida y el resultado se actualizan sin recargar.
- SheetJS se incluye localmente; Data Dragon aporta iconos opcionales cuando hay conexión.

## Estructura del proyecto

- `index.html` y los CSS de la raíz: documento y estilos de la interfaz.
- `src/ui/`: controlador de la aplicación y comportamiento de los selectores, la navegación, la vista previa y la versión.
- `src/data/`: lectura de las listas de campeones de `Draft Pool.xlsx` y normalización de sus atributos.
- `src/domain/composition-logic.js`: validación y búsquedas puras usadas por la interfaz actual.
- `src/domain/composition-engine.js`: evaluación determinista y pura de la composición con los atributos del workbook. Informa identidad principal/secundaria, condición de victoria, fortalezas, debilidades y cohesión; alimenta el análisis estratégico del informe visible.
- `src/report/`: renderizado de la tabla de resultado y resumen visible.
- `src/utils/`: utilidades compartidas de texto.
- `sw.js`: caché offline de los recursos de la app, incluida la librería SheetJS.
- `vendor/xlsx.full.min.js`: versión local de SheetJS para que la lectura del Excel funcione offline.
- `.github/workflows/pwa-validation.yml`: pruebas de arquetipos del motor y pruebas con Chromium para el ciclo PWA, la lógica de composición, el flujo de teclado y los tamaños responsive.
- `tools/check-composition-engine.cjs`: compara el análisis con ocho arquetipos de referencia, una composición híbrida y otra descompensada. Se ejecuta con `npm run test:composition-engine`.
- `tools/check-composition.cjs`: compara cada selector con su hoja del Excel y comprueba duplicados, entradas inválidas y actualización en tiempo real.
- `tools/check-ux.cjs`: verifica el flujo por teclado, las etiquetas, el foco visible y el desbordamiento en 320, 375, 768 y 1280 px.
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

Usa `minor` para una mejora funcional compatible y `major` para un cambio incompatible. El comando sincroniza el badge y la versión de `README.md`, `version.json`, el fallback de `src/ui/version.js`, `package.json`, `CHANGELOG.md` y la caché del service worker en `sw.js`. Ejecuta `npm run version:check` para comprobar que los números visibles y el changelog siguen sincronizados. No requiere instalar dependencias para versionar. El workflow instala Chromium de forma temporal y prueba el ciclo PWA, los cinco selectores, duplicados, entradas inválidas, actualización en tiempo real, el uso por teclado y el diseño en varios anchos; también detecta errores de JavaScript y consola.
