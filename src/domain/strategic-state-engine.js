(function (root, factory) {
  const engine = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = engine;
  } else {
    root.LTAStrategicStateEngine = Object.freeze(engine);
  }
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function summarizeStrategicState(input = {}) {
    const diagnosis = input.diagnosis || {};
    const diagnosticSummary = input.diagnosticSummary || {};
    const winCondition = input.winCondition || diagnosis.winCondition || {};
    const coherence = input.coherence || diagnosis.winConditionCoherence || {};
    const stability = input.stability || diagnosis.stability || {};
    const contradiction = input.contradiction || diagnosis.contradictions || {};
    const confidence = input.confidence || {};
    const hasSecondaryObservation = Boolean(String(input.secondaryObservation || "").trim());

    if (diagnosis.status !== "assessed" || diagnosticSummary.status === "not-assessed") {
      return {
        status: "not-assessed",
        closing: "Completa la composición antes de valorar su estado.",
      };
    }

    const fragile = diagnosticSummary.status === "fragile"
      || !diagnosis.plan?.clear
      || !diagnosis.plan?.primaryIdentity
      || diagnosis.coherence?.status === "incoherent"
      || diagnosis.coherence?.status === "contradictory"
      || contradiction.status === "contradictory"
      || coherence.status === "contradictory"
      || coherence.relation === "conflicting"
      || stability.status === "fragile";

    if (fragile) {
      return {
        status: "fragile",
        closing: "Aclara un plan común antes de confiar en la composición.",
      };
    }

    const solid = diagnosticSummary.status === "solid"
      && confidence.level === "alta"
      && winCondition.status === "assessed"
      && coherence.status === "fully-coherent"
      && stability.status === "stable"
      && contradiction.status !== "contradictory";

    if (solid) {
      return {
        status: "solid",
        closing: "La composición puede ejecutar su plan principal con confianza.",
      };
    }

    return {
      status: "risk",
      closing: hasSecondaryObservation
        ? "Usa la vía complementaria como apoyo, no como un plan paralelo."
        : "Mantén flexibilidad mientras consolidas el plan.",
    };
  }

  return { summarizeStrategicState };
});
