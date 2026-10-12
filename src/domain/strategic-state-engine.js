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
    const coherence = diagnosis.winConditionCoherence || {};
    const stability = diagnosis.stability || {};
    const contradiction = diagnosis.contradictions || {};
    const hasSecondaryObservation = Boolean(String(input.secondaryObservation || "").trim());

    if (diagnosis.status !== "assessed" || diagnosticSummary.status === "not-assessed") {
      return { status: "not-assessed", reason: "composition-incomplete" };
    }

    const status = ["solid", "risk", "fragile"].includes(diagnosticSummary.status)
      ? diagnosticSummary.status
      : "risk";

    let reason;
    if (!diagnosis.plan?.clear || !diagnosis.plan?.primaryIdentity) reason = "no-common-plan";
    if (contradiction.status === "contradictory"
      || coherence.status === "contradictory") {
      reason = reason || "incompatible-plans";
    }

    if (stability.status === "fragile") reason = reason || "key-pick-dependency";
    if (status === "fragile" && !reason) reason = "unclassified-fragility";

    if (status === "solid") return { status, reason: "aligned-and-stable" };

    return { status, reason: reason || (hasSecondaryObservation ? "complementary-secondary-path" : "limited-confidence") };
  }

  return { summarizeStrategicState };
});
