(function (root, factory) {
  const engine = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = engine;
  } else {
    root.LTASecondaryObservationEngine = Object.freeze(engine);
  }
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function findSecondaryObservation(input = {}) {
    const diagnosis = input.diagnosis || {};
    const winCondition = input.winCondition || diagnosis.winCondition || {};
    const coherence = input.coherence || diagnosis.winConditionCoherence || {};
    const contradiction = input.contradiction || diagnosis.contradictions || {};
    const secondaryIdentity = String(diagnosis.plan?.secondaryIdentity || "").trim();
    const secondaryCondition = winCondition.secondary;

    const hasClearComplement = diagnosis.status === "assessed"
      && diagnosis.plan?.clear === true
      && Boolean(secondaryIdentity)
      && contradiction.status === "coherent-hybrid"
      && coherence.relation === "complementary"
      && secondaryCondition?.relationship === "complementary"
      && secondaryCondition.identity === secondaryIdentity;

    if (!hasClearComplement) return null;

    return `Matiz: ${secondaryIdentity} amplía las opciones sin desplazar el plan.`;
  }

  return { findSecondaryObservation };
});
