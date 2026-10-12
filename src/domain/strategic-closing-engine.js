(function (root, factory) {
  const engine = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = engine;
  } else {
    root.LTAStrategicClosingEngine = Object.freeze(engine);
  }
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function buildStrategicClosing(input = {}) {
    const strategicState = input.strategicState || {};
    const diagnosis = input.diagnosis || {};

    if (strategicState.status !== "fragile") return null;

    if (!diagnosis.plan?.clear || diagnosis.coherence?.status === "incoherent") {
      return "Antes de jugar, definid un enfoque común.";
    }

    if (diagnosis.contradictions?.status === "contradictory"
      || diagnosis.coherence?.status === "contradictory") {
      return "Elegid qué identidad debe guiar las peleas.";
    }

    if (diagnosis.stability?.status === "fragile") {
      return "Preparad una alternativa si falta la pieza que sostiene el plan.";
    }

    return null;
  }

  return { buildStrategicClosing };
});
