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

    if (strategicState.status !== "fragile") return null;

    if (strategicState.reason === "no-common-plan") {
      return "Antes de jugar, definid un enfoque común.";
    }

    if (strategicState.reason === "incompatible-plans") {
      return "Elegid qué identidad debe guiar las peleas.";
    }

    if (strategicState.reason === "key-pick-dependency") {
      return "Preparad una alternativa si falta la pieza que sostiene el plan.";
    }

    return null;
  }

  return { buildStrategicClosing };
});
