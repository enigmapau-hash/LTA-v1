# Architecture — League Team Analyzer v2

**Estado:** descripción funcional de la arquitectura acordada. Define responsabilidades y relaciones entre módulos, no una estructura de código.

## Índice

1. [Visión general](#1-visión-general)
2. [Principales módulos del sistema](#2-principales-módulos-del-sistema)
3. [Flujo de información](#3-flujo-de-información)
4. [Separación entre análisis, diagnóstico y presentación](#4-separación-entre-análisis-diagnóstico-y-presentación)
5. [Límites funcionales](#5-límites-funcionales)
6. [Principios de diseño](#6-principios-de-diseño)
7. [Aspectos arquitectónicos pendientes](#7-aspectos-arquitectónicos-pendientes)

## 1. Visión general

LTA organiza el razonamiento de una composición en responsabilidades diferenciadas: recibe una selección, comprueba que pueda analizarse, la relaciona con los atributos estratégicos disponibles, obtiene conclusiones y las explica al usuario.

La arquitectura distingue dos recorridos relacionados:

- **Composición incompleta:** orienta los puestos vacíos con candidatos afines a los campeones ya elegidos.
- **Composición completa:** identifica el plan que mejor encaja, diagnostica sus fortalezas y riesgos y prepara una lectura estratégica breve.

Los módulos que siguen son límites funcionales. No requieren corresponder uno a uno con componentes concretos de software.

## 2. Principales módulos del sistema

### 2.1 Interacción y composición

Recoge la composición propia que el usuario quiere analizar: un campeón por puesto. Mantiene la selección y comunica los puestos pendientes o los problemas que impiden continuar con una composición válida.

### 2.2 Validación de la composición

Comprueba que las elecciones no repitan campeones y que cada campeón esté disponible para el puesto asignado. Solo una composición válida y completa pasa al análisis estratégico completo.

### 2.3 Conocimiento de atributos

Proporciona los atributos estratégicos asociados a los campeones: identidad, función, ritmo de partida, fortalezas y debilidades. Estos atributos son la base común del análisis completo y de la afinidad en composiciones parciales.

### 2.4 Orientación para puestos vacíos

Cuando la composición está incompleta, compara candidatos para cada puesto vacío con las elecciones existentes. Ordena una lista breve —hasta tres candidatos por puesto— y explica el encaje y la contribución que cada opción aporta al plan posible.

### 2.5 Análisis estratégico

Relaciona los atributos del equipo completo con patrones de composición conocidos. Determina si hay una identidad principal y si existe evidencia suficiente para una identidad secundaria. Si las señales no forman un plan claro, comunica esa falta de cohesión en lugar de forzar una identidad.

### 2.6 Diagnóstico de la composición

Interpreta las conclusiones del análisis para describir qué favorece o limita el plan. Incluye fortalezas, riesgos y atributos ausentes relevantes. Cuando quitar un campeón cambia de forma significativa la identidad o el plan, identifica esa pieza y explica el efecto; si no ocurre, puede indicar que la identidad se mantiene estable.

### 2.7 Presentación de resultados

Convierte las conclusiones en una lectura que ayude a responder «¿Cómo debería jugar esta composición?». En una selección incompleta, prioriza el progreso y la orientación de los puestos vacíos. En una completa, ordena el diagnóstico, la mejora prioritaria y la protección estratégica, cada uno con una explicación breve. Muestra solo la mejora y la amenaza prioritarias; mantiene candidaturas alternativas, señales detalladas y pesos comparativos dentro de las capas internas.

### 2.8 Calibración de confianza

Estima por separado la solidez del diagnóstico, la corrección y la protección con niveles cualitativos —alta, media o baja— y una razón breve. Se apoya en la claridad del plan, la convergencia de señales, la estabilidad de la composición y el respaldo disponible para cada conclusión. Recibe resultados ya calculados y no vuelve a analizar la composición. La presentación usa los niveles para ajustar el tono sin mostrarlos como etiquetas ni añadir secciones.

## 3. Flujo de información

### 3.1 Recorrido con composición incompleta

1. La interacción entrega las elecciones y los puestos vacíos.
2. La validación descarta las elecciones duplicadas o no disponibles para su puesto.
3. El conocimiento de atributos aporta la información disponible sobre los campeones seleccionados y los candidatos posibles.
4. La orientación para puestos vacíos compara y ordena candidatos según su afinidad con la composición parcial.
5. La presentación muestra los puestos por completar y las recomendaciones justificadas. No presenta todavía el informe estratégico de composición completa.

### 3.2 Recorrido con composición completa

1. La interacción entrega cinco elecciones válidas.
2. El conocimiento de atributos aporta identidad, función, ritmo, fortalezas y debilidades.
3. El análisis estratégico relaciona esos atributos con los patrones de referencia y determina la identidad o la ausencia de un plan claro.
4. El diagnóstico explica cómo los atributos sostienen o debilitan el plan y qué cambia si falta una pieza relevante.
5. La corrección prioriza un perfil que atiende la carencia principal, sin sustituir elecciones.
6. La protección prioriza estilos que pueden castigar el plan y propone una pauta defensiva general, sin asumir una composición rival concreta.
7. La calibración de confianza estima la solidez de cada conclusión con la evidencia ya disponible.
8. La presentación ordena diagnóstico, corrección y protección en un informe breve y adapta la firmeza del texto a los niveles internos de confianza, sin volver a evaluar la composición ni mostrarlos.

## 4. Separación entre análisis, diagnóstico y presentación

- **Análisis:** determina qué patrones e identidades están respaldados por los atributos de la composición. Sus señales y puntuaciones detalladas sirven para ordenar conclusiones y permanecen internas.
- **Diagnóstico:** expresa qué significan esos resultados para el plan: fortalezas, riesgos, carencias de cohesión y dependencia de piezas clave.
- **Presentación:** selecciona y ordena las conclusiones para que el usuario entienda cómo jugar. No vuelve a evaluar la composición ni muestra cada señal interna como un bloque separado.

Esta separación mantiene trazable el razonamiento: la presentación explica conclusiones derivadas del diagnóstico, y el diagnóstico se apoya en el análisis.

## 5. Límites funcionales

- El objeto de análisis es la composición propia; no hay composición rival.
- La orientación para puestos vacíos ayuda a completar la composición y no constituye un sistema de draft.
- Las conclusiones se basan en los atributos disponibles y en los patrones de referencia aprobados.
- No forman parte de esta arquitectura funcional la IA, las estadísticas online, las tasas de victoria ni las consultas a servicios externos.
- No se define aquí una nueva fuente de datos ni un cambio en la experiencia de selección o en el contenido acordado del informe.

## 6. Principios de diseño

- **Responsabilidades claras:** cada módulo tiene un propósito funcional reconocible.
- **Separación del razonamiento y su explicación:** calcular una conclusión, diagnosticar su impacto y comunicarla son responsabilidades distintas.
- **Determinismo y explicabilidad:** las mismas elecciones y atributos deben producir conclusiones consistentes y justificables.
- **Una base común de atributos:** la composición parcial y la completa razonan a partir de la misma información estratégica disponible.
- **Presentación sin duplicados:** mostrar primero lo útil para decidir cómo jugar, sin convertir señales internas en ruido visual.
- **Límites explícitos:** no inferir información sobre el rival ni atribuir al sistema datos que no posee.
- **Evolución controlada:** una capacidad nueva requiere definición funcional aprobada; este documento no la autoriza por sí mismo.

## 7. Aspectos arquitectónicos pendientes

Este documento describe los límites funcionales acordados y no decide su correspondencia con módulos de software, sus interfaces internas, tecnologías o despliegue. Esos detalles se definirán por separado cuando sean necesarios y estén respaldados por decisiones aprobadas.
