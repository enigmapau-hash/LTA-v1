# Changelog

## v1.7.0

### Added
- Add pick support and identity resilience insights


## v1.6.0

### Changed
- Simplify strategic report for faster reading


## v1.5.0

### Added
- Improve champion selection and replacement flow


## v1.4.0

### Added
- Integrate Composition Engine analysis into the visible report


## v1.3.0

### Added
- Motor determinista interno de análisis de composiciones y reconocimiento de arquetipos


## v1.2.6

### Fixed
- Reorganización interna de UI, datos, lógica de composición e informes


## v1.2.5

### Fixed
- Mejoras de accesibilidad, navegación por teclado y experiencia responsive


## v1.2.4

### Added
- Comprobación Chromium de las listas por rol frente a `Draft Pool.xlsx`.
- Casos reproducibles para duplicados, entradas inválidas y resultado en tiempo real.


## v1.2.3

### Fixed
- SheetJS se incluye en el repositorio y en la caché del service worker para leer el Excel sin conexión.
- Las solicitudes offline fallidas ya no reciben el HTML de la app como si fuera un recurso solicitado.

### Added
- Iconos PNG de 192 y 512 px para la instalación de la PWA.
- Prueba con Chromium para primera carga, migración desde la caché v12 y selección offline.


## v1.2.2

### Added
- Activado el service worker para que la caché offline se registre en la app.
- Actualizada la caché a v12 para propagar la versión visible a instalaciones existentes.

## v1.2.1

### Fixed
- Corregida la fuente del Excel para cargar `Draft Pool.xlsx` desde este repositorio.

## v1.2.0

### Added
- README ampliado con flujo, estructura y uso.
- Capturas de referencia añadidas al repositorio.
- Arquitectura actualizada para reflejar la base actual.

### Notes
- La base funcional se mantiene intacta.
- La versión visible avanza con cada entrega publicada.

## v1.1.8

### Fixed
- Restaurado el clic sobre las opciones del selector tras el refactor.
- Añadido `data-role` a cada opción para aplicar correctamente el campeón.

### Notes
- El selector vuelve a funcionar tanto al escribir como al elegir con clic.
- La versión visible avanza con cada entrega publicada.

## v1.1.7

### Added
- CSS consolidado en menos archivos.
- Helpers compartidos para normalización y escape de texto.
- Assets obsoletos eliminados del despliegue.
- Carga de scripts y caché más consistente.

### Notes
- Refactor interno sin cambio funcional.
- La versión visible avanza con cada entrega publicada.

## v1.1.6

### Added
- Márgenes y alineaciones refinados.
- Iconos y tarjetas más compactos.
- Responsive móvil y tablet pulido.
- Colores más consistentes.

### Notes
- El pulido visual mejora la lectura sin tocar la lógica.

## v1.1.5

### Added
- Sinergia global plegable por defecto.
- Menos ruido visual en el resultado cuando la composición ya está completa.
- Lectura rápida más clara sin perder el detalle.

## v1.1.4

### Added
- Sinergia global encima del resultado.
- Identidades resumidas por frecuencia.
- Funciones resumidas por frecuencia.
- Fortalezas y debilidades destacadas.

## v1.1.3

### Added
- Identidad en la vista rápida.
- Función en la vista rápida.
- Resumen rápido más completo sobre la tabla.

## v1.1.2

### Added
- Resumen visual compacto encima de la tabla de resultado.
- Vista rápida con estado general y chips por rol.
- Mantiene el detalle tabulado sin cambiar la lógica del Excel.

## v1.1.1

### Added
- Búsqueda inteligente en el selector.
- Coincidencias por parte del nombre.
- Acrónimos como MF, KOG o LEE.
- Ordenación mejorada de resultados.

## v1.1.0

### Added
- Selector compacto con iconos.
- Campeones duplicados ocultos en el desplegable.
- Análisis en tiempo real.
- Despliegue de Pages y caché corregidos para incluir los assets nuevos.

## v1.0.0

### Added
- Selector unificado y estable.
- Lectura directa del Excel.
- Reproducción de la pestaña **Composición**.
- Responsive para móvil, tablet y escritorio.
- Sin IA ni pasos intermedios.

### Notes
- Base cerrada de la miniapp.
- Las mejoras futuras se tratarán como nuevas versiones menores.
