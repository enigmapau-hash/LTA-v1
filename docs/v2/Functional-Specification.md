# Functional Specification — League Team Analyzer v2

**Estado:** primera versión completa para revisión. Describe el alcance funcional acordado; no autoriza por sí misma capacidades fuera de ese alcance.

## Resumen ejecutivo

League Team Analyzer (LTA) ayuda a comprender cómo jugar una composición propia de League of Legends y qué hace que ese plan sea más o menos sólido. Relaciona los campeones elegidos con sus atributos estratégicos, identifica una identidad cuando hay señales suficientes y explica fortalezas, riesgos y piezas críticas.

Si faltan puestos, orienta la selección con un grupo breve de candidatos afines. Si no hay cohesión suficiente, lo comunica en lugar de presentar una estrategia como segura. El razonamiento es determinista, explicable y limitado a la información disponible. LTA apoya las decisiones del usuario; no juega, no selecciona por él y no analiza todavía al rival.

## Índice

1. [Misión y problema](#1-misión-y-problema)
2. [Alcance: núcleo de v2 y frontera de v3](#2-alcance-núcleo-de-v2-y-frontera-de-v3)
3. [Filosofía del producto](#3-filosofía-del-producto)
4. [Flujo general de razonamiento](#4-flujo-general-de-razonamiento)
5. [Información analizada y conclusiones](#5-información-analizada-y-conclusiones)
6. [Diagnosticar, corregir y proteger](#6-diagnosticar-corregir-y-proteger)
7. [Confianza en las conclusiones](#7-confianza-en-las-conclusiones)
8. [Información visible e interna](#8-información-visible-e-interna)
9. [Principios de diseño](#9-principios-de-diseño)
10. [Qué no hará LTA v2](#10-qué-no-hará-lta-v2)

## 1. Misión y problema

La misión de LTA v2 es ayudar al usuario a responder **«¿Cómo debería jugar esta composición?»** con una explicación breve, práctica y coherente con los campeones elegidos.

El problema que resuelve es la dificultad de convertir cinco elecciones individuales en una lectura común: qué identidad puede sostener el equipo, qué plan conviene priorizar, qué riesgos limitarán ese plan y qué campeones son importantes para mantenerlo. Cuando la composición aún está incompleta, también ayuda a entender qué candidatos pueden encajar en los puestos vacíos.

LTA analiza únicamente la composición propia. Sus conclusiones describen lo que sugieren los atributos disponibles; no predicen el resultado de una partida.

## 2. Alcance: núcleo de v2 y frontera de v3

### Núcleo aprobado de v2

- Analizar una composición propia de cinco puestos: Top, Jungla, Mid, Botline y Support.
- Relacionar los atributos disponibles de los campeones con patrones de identidad conocidos.
- Comunicar identidad principal y secundaria cuando estén suficientemente respaldadas, o explicar que no hay un plan claro.
- Expresar la condición de victoria principal separada de la identidad y conservar una secundaria cuando los resultados ya calculados la respalden.
- Distinguir una combinación híbrida compatible de dos identidades con objetivos incompatibles, e identificar el problema principal con evidencia disponible.
- Presentar una lectura estratégica compacta con plan, fortalezas, riesgos y estabilidad de piezas clave.
- Ayudar a completar puestos vacíos con hasta tres candidatos ordenados por afinidad y acompañados de una explicación.
- Expresar el grado de respaldo mediante evidencia y límites claros, sin prometer certeza sobre la partida.

### Frontera de v3 o posterior

No hay funcionalidades de v3 aprobadas todavía. El análisis del rival y del draft, los bans, el uso de estadísticas o servicios externos, la IA, los cambios automáticos de campeones y una probabilidad numérica de éxito quedan fuera del núcleo de v2. Podrían evaluarse en una etapa posterior, pero este documento no los compromete ni los define como requisitos.

## 3. Filosofía del producto

- **Estrategia antes que volumen:** explicar el plan y sus razones sin llenar la pantalla de conclusiones repetidas.
- **Explicabilidad:** conectar cada conclusión con atributos reconocibles de la composición.
- **Honestidad:** admitir cuando las señales no bastan para identificar un plan.
- **Apoyo, no automatización de decisiones:** ofrecer contexto y opciones; el usuario conserva el control de sus picks.
- **Determinismo:** las mismas elecciones y los mismos atributos producen conclusiones consistentes.
- **Simplicidad:** mostrar solo la información que ayuda a entender o completar la composición.

## 4. Flujo general de razonamiento

1. El usuario elige un campeón para cada puesto de su equipo.
2. LTA comprueba que no haya campeones repetidos y que cada elección esté disponible para el puesto asignado.
3. Con puestos vacíos, LTA presenta el estado de la composición y compara candidatos para esos puestos con los campeones ya elegidos.
4. Con cinco elecciones válidas, LTA relaciona los atributos del equipo con patrones estratégicos de referencia.
5. LTA identifica la identidad mejor respaldada y una secundaria solo cuando hay evidencia suficiente. Si las señales no forman un plan común, explica la falta de cohesión.
6. El diagnóstico traduce esos resultados en un plan, fortalezas, riesgos y una lectura de estabilidad.
7. La presentación prioriza la información útil para la decisión actual: completar puestos o entender cómo jugar la composición completa.

## 5. Información analizada y conclusiones

### Información analizada

LTA considera el puesto y el campeón elegido, además de los atributos estratégicos disponibles para ese campeón:

- identidad;
- función;
- ritmo de partida;
- fortalezas;
- debilidades.

En composiciones completas, contrasta las señales con los patrones de referencia Front to Back, Dive, Pick, Poke, Split Push, Teamfight, Escalado y Early Game. Son referencias para interpretar atributos, no reglas que garanticen cómo se desarrollará una partida.

En composiciones parciales, compara la afinidad de candidatos con las elecciones existentes y con el plan que empieza a tomar forma.

### Conclusiones generadas

Según la evidencia disponible, LTA puede generar:

- una identidad principal y, si corresponde, una identidad secundaria;
- una condición de victoria principal —y una secundaria cuando exista una identidad secundaria respaldada— que describe cómo convertir el plan en una victoria;
- un plan de partida asociado a esa identidad;
- fortalezas y debilidades comunes;
- riesgos o atributos estratégicos ausentes cuando no hay cohesión suficiente;
- las piezas que sostienen especialmente la identidad y el cambio que implicaría perderlas;
- recomendaciones breves para puestos vacíos, ordenadas por afinidad, con su encaje y contribución explicados.

Las recomendaciones de composición parcial muestran hasta tres candidatos por puesto vacío. Su afinidad indica ajuste según los atributos disponibles, no rendimiento real en partidas.

## 6. Diagnosticar, corregir y proteger

### Diagnosticar

Diagnosticar significa explicar qué plan sugieren los atributos y qué tan bien se apoyan entre sí. Separa la identidad —el tipo de composición— de la condición de victoria —la forma concreta de convertir ese plan en una victoria—. El diagnóstico señala fortalezas compartidas, riesgos, carencias de cohesión y dependencias relevantes. También distingue las identidades secundarias compatibles de las que exigen planes opuestos; cuando hay una contradicción respaldada, explica el conflicto principal y señala una pieza que empuja hacia el plan secundario si los atributos disponibles permiten identificarla. Si la composición no sostiene una identidad clara, lo dice y explica qué señales comunes faltan. No atribuye la causa a un rival que no se ha analizado.

### Corregir

Corregir significa ayudar al usuario a responder a una carencia identificada sin decidir por él. Mientras falten puestos, LTA propone candidatos para los puestos vacíos y explica qué aportaría cada opción. En una composición completa puede señalar qué debilita el plan; elegir o cambiar un campeón sigue siendo una acción del usuario. LTA no sustituye picks ni aplica cambios automáticamente.

### Proteger la composición

Proteger significa hacer visible qué campeones sostienen de forma crítica la identidad o el plan. LTA compara la lectura de la composición cuando falta una pieza y explica si la identidad cambia, se debilita o deja de estar clara. Si la identidad se mantiene al retirar cualquiera de las piezas, puede comunicar esa estabilidad.

Esta lectura es informativa: no bloquea elecciones, no reserva campeones ni garantiza que la composición mantenga su rendimiento en una partida real.

## 7. Confianza en las conclusiones

La confianza de LTA procede de la calidad y convergencia de la evidencia disponible, no de datos externos ni de una predicción de victoria. Una contradicción detectada entre planes reduce la solidez del diagnóstico y de las conclusiones que dependen de él. Se expresa de forma calibrada:

- cuando varios atributos respaldan un mismo patrón, LTA comunica la identidad principal y explica el plan;
- solo añade una identidad secundaria si también tiene señales suficientes;
- cuando las señales no convergen, evita forzar una identidad y explica la falta de cohesión;
- las recomendaciones muestran su afinidad y contribución para que el usuario pueda juzgar el encaje.

Internamente, LTA asigna confianza alta, media o baja al diagnóstico, la corrección y la protección. Tiene en cuenta la claridad del plan, la convergencia de señales y la estabilidad de la composición; en corrección y protección también considera si la conclusión está respaldada por sus propias evidencias. Estos niveles no son porcentajes ni se muestran como etiquetas: ajustan la firmeza de la redacción sin cambiar el orden ni la estructura del informe.

La afinidad visible de los candidatos es una puntuación de ajuste basada en atributos. Sirve para ordenar y comparar opciones dentro de la recomendación; **no es un porcentaje de confianza, una probabilidad de ganar ni una tasa de victoria**. LTA no muestra una probabilidad de éxito ni una garantía de resultado.

## 8. Información visible e interna

### Lo que ve el usuario

**Con la composición incompleta:**

- los campeones elegidos, los puestos pendientes y el progreso;
- avisos si una elección está repetida o no está disponible para el puesto;
- los atributos disponibles de las elecciones en la tabla;
- candidatos para cada puesto vacío, su nivel relativo de afinidad, su contribución y el plan asociado cuando aporta claridad.

El informe estratégico de composición completa no aparece mientras falten elecciones válidas.

**Con la composición completa:**

- la alineación de puestos, campeones, función y ritmo;
- el diagnóstico principal: identidad y condición de victoria, o falta de un plan claro;
- la mejora de mayor prioridad, expresada como perfil y vinculada a la carencia detectada;
- el estilo rival que más amenaza el plan y una pauta general para protegerlo;
- una explicación breve para cada conclusión.

La lectura aparece en este orden: diagnóstico, corrección y protección. Conserva la tabla de composición y evita repetir candidatos, puntuaciones o señales internas en el informe.

### Lo que permanece interno

Las señales y puntuaciones detalladas que se utilizan para comparar identidades, perfiles de mejora y estilos amenazantes no se presentan como un desglose técnico. El informe muestra solo la corrección y la amenaza prioritarias; conserva candidatos alternativos, amenazas secundarias y pesos comparativos como información interna.

La condición de victoria secundaria se conserva en el diagnóstico cuando hay una identidad secundaria respaldada. La lectura visible prioriza la condición principal para no añadir un bloque redundante.

La condición de victoria, la sinergia interna y las recomendaciones generales no se convierten en bloques independientes cuando repetirían el plan o el diagnóstico. LTA no muestra bans porque no analiza campeones rivales.

## 9. Principios de diseño

- **Claridad:** usar lenguaje directo y jerarquizar identidad, plan y razones.
- **Trazabilidad:** relacionar las conclusiones con atributos observables.
- **Calibración:** limitar cada afirmación a lo que la evidencia permite sostener.
- **Determinismo:** producir resultados consistentes ante los mismos datos.
- **Separación de responsabilidades:** distinguir evaluación, diagnóstico de impacto y comunicación al usuario.
- **Simplicidad:** no exponer métricas internas ni crear secciones que repitan valor existente.
- **Control del usuario:** mantener en manos del usuario la elección y el cambio de campeones.
- **Límites explícitos:** no simular información del rival, del resultado o de fuentes que LTA no tiene.

## 10. Qué no hará LTA v2

El núcleo de v2 no:

- analizará una composición rival ni recomendará bans contra ella;
- funcionará como sistema completo de draft;
- utilizará IA, tasas de victoria, estadísticas online o servicios externos como base de sus conclusiones;
- sustituirá campeones o corregirá la selección sin intervención del usuario;
- afirmará que una composición ganará ni presentará la afinidad como probabilidad de éxito;
- añadirá conclusiones que no estén respaldadas por los atributos disponibles.

Las capacidades que amplíen estos límites requieren una especificación y aprobación posteriores. No se consideran parte del alcance aprobado de v2 ni un compromiso de v3.
