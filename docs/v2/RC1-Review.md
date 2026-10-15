# LTA v2 — Release Candidate Review (RC1)

**Base revisada:** `main` después de PR #42.  
**Alcance:** conformidad funcional y arquitectónica de v2; sin revisión del equilibrio de atributos del Excel ni de la experiencia de selección de v1.

## 1. Funcionalidad completamente implementada

La revisión contrasta la [Functional Specification](Functional-Specification.md) y la [Architecture](../architecture/Architecture.md) con los módulos estratégicos, el informe visible, sus pruebas y la documentación de producto.

| Responsabilidad | Implementación y consumidores | Estado |
|---|---|---|
| Atributos, identidad y análisis de composición | `composition-engine.js` relaciona la composición con los arquetipos aprobados. Diagnostic Engine consume su análisis y `planSupport`. La misma capa sustenta las recomendaciones parciales existentes. | Completa |
| Diagnóstico | `diagnostic-engine.js` valida la composición y reúne plan, cohesión, problema principal, contradicción, condición de victoria, coherencia y estabilidad. Sus salidas alimentan correction, protection, confidence y el informe. | Completa |
| Corrección estratégica | `correction-engine.js` propone perfiles y candidatos para atender la carencia prioritaria; no sustituye picks. Sus resultados se usan en el informe y en confidence/protection. | Completa |
| Protección estratégica | `protection-engine.js` prioriza un estilo de amenaza y una pauta de protección a partir del plan y la evidencia existente. El informe consume la amenaza prioritaria. | Completa |
| Confianza y tono | `confidence-engine.js` clasifica por separado diagnóstico, corrección y protección con niveles cualitativos. `strategic-report.js` adapta el texto sin mostrar niveles ni puntuaciones. | Completa |
| Contradicciones | `contradiction-engine.js` distingue señales secundarias compatibles de planes incompatibles y alimenta el diagnóstico, la coherencia y la confianza. | Completa |
| Condición de victoria | `win-condition-engine.js` produce una condición principal y, si hay evidencia, una secundaria, diferenciadas de la identidad. | Completa |
| Coherencia de condición de victoria | `win-condition-coherence-engine.js` clasifica la relación entre identidad, condición de victoria y contradicciones. Diagnostic Summary la consume para clasificar el estado. | Completa |
| Estabilidad y dependencias | `composition-stability-engine.js` evalúa retiradas individuales, identidad posterior, impacto y picks clave. Diagnostic Engine reutiliza sus resultados para robustez y dependencias; Diagnostic Summary los convierte en una explicación visible del cambio relevante. | Completa tras el ajuste de RC1 |
| Resumen y observación secundaria | `diagnostic-summary-engine.js` asigna estado y redacta una síntesis compacta. `secondary-observation-engine.js` aporta como máximo una señal secundaria. Ambos son consumidos por el informe y el estado estratégico. | Completa |
| Estado y cierre | `strategic-state-engine.js` deriva el estado global del resumen y evidencia ya calculada. `strategic-closing-engine.js` decide si el cierre opcional añade valor; Strategic Report puede incluirlo sin crear otro bloque del informe. | Completa |
| Presentación estratégica | `strategic-report.js` orquesta las salidas existentes en el orden diagnóstico, mejora prioritaria y protección. No recalcula el análisis. `result-summary.js` presenta el informe en la interfaz de v2. | Completa |
| Composición parcial y límites de producto | La UI mantiene recomendaciones para puestos vacíos y no presenta el informe completo antes de validar cinco elecciones. El alcance excluye rival, bans, draft completo, IA y datos externos. | Completa según el alcance aprobado |

La cadena conserva separación entre análisis de atributos, diagnóstico de impacto, capas de corrección/protección y presentación. El diagnóstico es la fuente de plan, estabilidad, contradicciones y win condition; las capas posteriores consumen esos resultados y no vuelven a recorrer los campeones para decidir desde cero.

## 2. Funcionalidad parcialmente implementada

No queda una responsabilidad funcional del núcleo v2 implementada solo a medias tras el ajuste de estabilidad de esta RC. La protección estratégica trabaja con estilos y una pauta general, tal como define la especificación; no es protección contra una composición rival concreta.

La confianza se expresa indirectamente por el tono y no como etiqueta visible. La condición de victoria secundaria, las señales detalladas y alternativas internas se conservan fuera del informe principal para respetar la brevedad definida. Estas decisiones están documentadas y no constituyen omisiones.

## 3. Funcionalidad pendiente respecto a la especificación

No se identifica funcionalidad pendiente dentro del núcleo aprobado de v2. La revisión detectó una brecha de comunicación en estabilidad: antes del ajuste, el informe decía de forma genérica que podía perderse una pieza, sin nombrar el pick ni precisar si el plan cambiaba o desaparecía. Aunque Stability Engine ya calculaba las retiradas, esa evidencia concreta no llegaba al usuario. RC1 la integra en la explicación existente del diagnóstico, sin añadir una sección ni alterar el orden del informe.

Los siguientes asuntos quedan fuera de v2 y no son requisitos pendientes: análisis de rival/draft, bans concretos, estadísticas externas, IA y probabilidad de victoria. Roadmap y ADR conservan sus plantillas iniciales porque no hay decisiones posteriores aprobadas que registrar.

Deuda técnica no bloqueante observada:

- `composition-engine.js` sigue construyendo campos heredados del informe v1 que no consume el informe v2; parte del contrato sigue cubierta por pruebas y no se eliminó durante esta revisión para evitar cambios de compatibilidad.
- `strategic-explanations.js` conserva explicaciones de capas que el informe actual no usa en todas las rutas. No se retiró código durante la RC porque no es necesario para completar el alcance y conviene revisar sus consumidores y contratos en una tarea de mantenimiento separada.
- Las salidas internas incluyen evidencia y explicaciones más amplias que el texto visible. El informe selecciona una síntesis; una depuración de contratos no es requisito de cierre.

No se detectaron contradicciones funcionales entre especificación y arquitectura que requieran modificar el producto. El README sí contenía una descripción antigua que afirmaba que el diagnóstico aún no estaba integrado; RC1 la actualiza para reflejar el flujo real.

## 4. Recomendación final

**v2 lista para cerrar**, una vez que la suite local y los workflows de la PR estén en verde.

El núcleo funcional de la especificación tiene implementación, pruebas y consumidores reales. El único hueco relevante encontrado —la falta de una explicación concreta sobre qué ocurre al perder una pieza crítica— queda resuelto en esta misma revisión mediante la salida del Stability Engine ya calculada. No se añade una capability ni heurística nueva: se presenta evidencia existente en la explicación del diagnóstico. La deuda enumerada es de limpieza y compatibilidad, no impide usar ni cerrar el alcance de v2.
