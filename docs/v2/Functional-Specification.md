# Functional Specification — League Team Analyzer v2

**Estado:** borrador funcional inicial. Este documento recoge el comportamiento conocido y las decisiones acordadas; no aprueba por sí mismo nuevas funcionalidades.

## Índice

1. [Objetivo y alcance del producto](#1-objetivo-y-alcance-del-producto)
2. [Filosofía de LTA](#2-filosofía-de-lta)
3. [Flujo general de razonamiento](#3-flujo-general-de-razonamiento)
4. [Información que analiza](#4-información-que-analiza)
5. [Conclusiones que genera](#5-conclusiones-que-genera)
6. [Información que muestra al usuario](#6-información-que-muestra-al-usuario)
7. [Información que permanece interna](#7-información-que-permanece-interna)
8. [Límites funcionales acordados](#8-límites-funcionales-acordados)
9. [Principios de diseño aprobados](#9-principios-de-diseño-aprobados)
10. [Aspectos funcionales pendientes de definir](#10-aspectos-funcionales-pendientes-de-definir)

## 1. Objetivo y alcance del producto

League Team Analyzer (LTA) ayuda a entender una composición propia de League of Legends y a responder de forma clara: **«¿Cómo debería jugar esta composición?»**

La aplicación relaciona los campeones elegidos y sus atributos con un plan de partida, y resume los elementos que sostienen o debilitan ese plan. También orienta la elección cuando faltan puestos por completar.

Esta primera versión funcional de v2 documenta el producto y los comportamientos acordados hasta ahora. No introduce requisitos nuevos ni determina cambios funcionales respecto a la base existente.

## 2. Filosofía de LTA

- Priorizar una lectura estratégica breve, práctica y fácil de explicar.
- Relacionar las conclusiones con atributos identificables de los campeones.
- Mantener un razonamiento determinista: una misma composición y los mismos datos producen las mismas conclusiones.
- Ayudar al usuario a tomar decisiones; la selección final de campeones sigue siendo suya.
- Evitar ruido y repeticiones: cada bloque visible debe ayudar a entender la composición o cómo jugarla.
- No presentar las recomendaciones como un sistema de draft: no se dispone de una composición rival.
- No basar el análisis en IA, tasas de victoria, estadísticas online ni servicios de datos externos.

## 3. Flujo general de razonamiento

1. El usuario elige campeones para los cinco puestos: Top, Jungla, Mid, Botline y Support.
2. LTA comprueba que no se repitan campeones y que cada elección esté disponible para el puesto indicado.
3. Mientras falten elecciones válidas, muestra los puestos pendientes y puede orientar cada puesto vacío con candidatos afines a la composición parcial.
4. Con los cinco puestos completos, LTA contrasta los atributos del equipo con patrones estratégicos conocidos.
5. Si los atributos convergen, identifica un plan principal y, cuando hay señales suficientes, uno secundario. Si no convergen, lo indica y explica qué elementos de cohesión faltan.
6. La aplicación presenta una lectura estratégica compacta junto a la composición para ayudar al usuario a entender cómo jugarla.

## 4. Información que analiza

LTA analiza la composición propia: el puesto y campeón elegidos para cada integrante, junto con los atributos disponibles para esos campeones:

- identidad estratégica;
- función;
- ritmo de partida;
- fortalezas;
- debilidades.

Las señales se contrastan con estas identidades de referencia: Front to Back, Dive, Pick, Poke, Split Push, Teamfight, Escalado y Early Game. Son patrones de referencia, no reglas cerradas que determinen automáticamente la estrategia de una partida.

En una composición parcial, el análisis de afinidad compara cada candidato disponible para un puesto vacío con los campeones ya elegidos y sus atributos. Se limita a los puestos que siguen vacíos.

## 5. Conclusiones que genera

Según la composición y los datos disponibles, LTA puede derivar:

- identidad principal y, si las señales lo justifican, identidad secundaria;
- una orientación o plan de partida asociado a la identidad;
- fortalezas y debilidades comunes del equipo;
- riesgos o atributos estratégicos ausentes cuando no hay un plan claro;
- campeones que sostienen especialmente la identidad y qué cambia si falta una pieza;
- para cada puesto vacío, hasta tres candidatos ordenados por afinidad, con una indicación de encaje, su contribución y el plan asociado cuando existe información suficiente.

Las conclusiones dependen de los atributos disponibles. La herramienta no afirma conocer datos que no estén presentes en ellos.

## 6. Información que muestra al usuario

### Composición incompleta

- Los campeones elegidos y los puestos que aún faltan.
- El progreso de selección y los avisos necesarios para corregir elecciones repetidas o no disponibles.
- Recomendaciones para cada puesto vacío. Cada lista es breve y explica la afinidad y la aportación del candidato; puede mostrar el plan asociado cuando ayuda a distinguir opciones.
- No presenta el informe estratégico de composición completa antes de tener cinco elecciones válidas.

### Composición completa

- La alineación con puesto, campeón, función y ritmo.
- La identidad detectada, incluida la secundaria cuando existe.
- El plan de partida, las fortalezas y los riesgos.
- La pieza o piezas clave y el efecto de perderlas cuando el análisis de estabilidad detecta un cambio relevante. Si la identidad se mantiene al quitar cualquier elección, el informe puede indicarlo.
- Si no aparece una identidad clara, una explicación breve de la falta de cohesión.

La presentación debe responder primero a cómo jugar la composición y evitar repetir el mismo consejo en varios bloques.

## 7. Información que permanece interna

El análisis utiliza señales, puntuaciones y comparaciones entre identidades para ordenar sus conclusiones y evaluar afinidades. Estos valores detallados sirven al razonamiento; no se muestran como una tabla de puntuaciones para el usuario.

El motor puede derivar una condición de victoria, sinergia interna, recomendaciones generales y otros datos del informe. En la presentación actual no se ofrecen como bloques independientes cuando repetirían el plan, las fortalezas o los riesgos ya visibles. La sinergia no aparece como sección separada.

La información disponible no permite recomendar bans contra un rival. LTA no muestra un bloque de bans ni presenta una recomendación de ban como conclusión.

## 8. Límites funcionales acordados

- El análisis se limita al equipo propio; no incluye selección ni análisis del rival.
- Las recomendaciones de campeones ayudan a completar puestos y no constituyen un sistema de draft.
- No se incorporan IA, estadísticas de partidas, tasas de victoria ni consultas online como base de las conclusiones.
- Las conclusiones se limitan a los atributos y patrones disponibles; no se inventan datos para completar información ausente.
- Esta especificación no cambia el selector, el informe, el flujo de uso ni la fuente de datos actuales.

## 9. Principios de diseño aprobados

- **Claridad:** expresar el plan y sus razones con lenguaje directo.
- **Explicabilidad:** vincular una conclusión con atributos o señales comprensibles.
- **Determinismo:** evitar resultados variables ante las mismas entradas.
- **Simplicidad:** mantener los bloques visibles solo cuando añaden valor y evitar duplicados.
- **Utilidad en partida:** orientar cómo jugar, qué fortalezas aprovechar, qué riesgos evitar y qué piezas sostienen el plan.
- **Apoyo a la decisión:** ofrecer contexto y afinidad sin quitar al usuario el control de la selección.
- **Respeto a los límites conocidos:** no presentar análisis de rival, bans o datos externos que LTA no tiene.

## 10. Aspectos funcionales pendientes de definir

No se han acordado cambios funcionales adicionales para v2 más allá de los comportamientos y límites recogidos en este documento. Cualquier flujo, dato o resultado nuevo deberá definirse y aprobarse antes de incorporarse a la especificación.
