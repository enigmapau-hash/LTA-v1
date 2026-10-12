(function (root, factory) {
  const engine = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = engine;
  } else {
    root.LTADiagnosticSummaryEngine = Object.freeze(engine);
  }
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function buildDiagnosticSummary(input = {}) {
    const diagnosis = input.diagnosis || {};
    const winCondition = input.winCondition || diagnosis.winCondition || {};
    const coherence = input.coherence || diagnosis.winConditionCoherence || {};
    const stability = input.stability || diagnosis.stability || {};
    const contradiction = input.contradiction || diagnosis.contradictions || {};
    const confidence = input.confidence || {};

    if (diagnosis.status !== "assessed") {
      return {
        status: "not-assessed",
        summary: "Hace falta una composición completa para valorar su solidez.",
      };
    }

    if (contradiction.status === "contradictory"
      || coherence.status === "contradictory"
      || stability.status === "fragile"
      || winCondition.status === "assessed" && coherence.relation === "conflicting") {
      return {
        status: "fragile",
        summary: contradiction.status === "contradictory" || coherence.status === "contradictory"
          ? "La composición parece frágil porque sus planes compiten."
          : "La identidad puede perderse si falta una pieza clave.",
      };
    }

    if (!diagnosis.plan?.clear || !diagnosis.plan?.primaryIdentity) {
      return {
        status: "risk",
        summary: confidence.level === "baja"
          ? "Por ahora, los atributos no apuntan a un plan común."
          : "Los atributos aún no convergen en un plan común.",
      };
    }

    const fullyAligned = coherence.status === "fully-coherent"
      || coherence.relation === "aligned";
    const stable = stability.status === "stable";
    if (confidence.level === "alta"
      && diagnosis.coherence?.status === "coherent"
      && fullyAligned
      && stable) {
      return {
        status: "solid",
        summary: "El plan mantiene una dirección común incluso si falta una pieza.",
      };
    }

    return {
      status: "risk",
      summary: confidence.level === "baja"
        ? "El plan aún es provisional y puede cambiar si falta una pieza clave."
        : "El plan es claro, aunque no está del todo alineado.",
    };
  }

  return { buildDiagnosticSummary };
});
