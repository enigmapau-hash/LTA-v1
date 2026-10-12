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
      return { status: "not-assessed", reason: "composition-incomplete" };
    }

    if (!diagnosis.plan?.clear
      || !diagnosis.plan?.primaryIdentity
      || diagnosis.coherence?.status === "incoherent") {
      return { status: "fragile", reason: "no-common-plan" };
    }

    if (contradiction.status === "contradictory"
      || diagnosis.coherence?.status === "contradictory"
      || coherence.status === "contradictory"
      || coherence.relation === "conflicting") {
      return { status: "fragile", reason: "incompatible-plans" };
    }

    if (stability.status === "fragile") {
      return { status: "fragile", reason: "key-pick-dependency" };
    }

    if (diagnosticSummary.status === "fragile") {
      return { status: "fragile", reason: "unclassified-fragility" };
    }

    const solid = diagnosticSummary.status === "solid"
      && confidence.level === "alta"
      && winCondition.status === "assessed"
      && coherence.status === "fully-coherent"
      && stability.status === "stable"
      && contradiction.status !== "contradictory";

    if (solid) {
      return { status: "solid", reason: "aligned-and-stable" };
    }

    return {
      status: "risk",
      reason: hasSecondaryObservation ? "complementary-secondary-path" : "limited-confidence",
    };
  }

  return { summarizeStrategicState };
});
