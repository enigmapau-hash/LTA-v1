(function (root, factory) {
  const engine = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = engine;
  } else {
    root.LTAWinConditionEngine = Object.freeze(engine);
  }
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function selectedArchetype(archetypeScores, selectedAs, identity) {
    return (Array.isArray(archetypeScores) ? archetypeScores : []).find((item) =>
      item?.selectedAs === selectedAs && item.label === identity
    ) || null;
  }

  function assessWinConditions(input = {}) {
    const diagnosis = input.diagnosis;
    const analysis = input.analysis;
    const primaryIdentity = String(diagnosis?.plan?.primaryIdentity || "").trim();
    if (diagnosis?.status !== "assessed" || !primaryIdentity) {
      return {
        status: "not-assessed",
        primary: null,
        secondary: null,
        explanation: "Hace falta un plan claro para identificar una condición de victoria.",
      };
    }

    const primaryProfile = selectedArchetype(analysis?.archetypeScores, "primary", primaryIdentity);
    const primaryCondition = String(analysis?.winCondition || primaryProfile?.winCondition || "").trim();
    if (!primaryCondition) {
      return {
        status: "not-assessed",
        primary: null,
        secondary: null,
        explanation: "El diagnóstico no contiene una condición de victoria respaldada.",
      };
    }

    const primary = {
      identity: primaryIdentity,
      condition: primaryCondition,
      explanation: `Concreta cómo ganar con ${primaryIdentity}.`,
    };
    const secondaryIdentity = String(diagnosis.plan?.secondaryIdentity || "").trim();
    const secondaryProfile = secondaryIdentity
      ? selectedArchetype(analysis?.archetypeScores, "secondary", secondaryIdentity)
      : null;
    const secondaryCondition = String(secondaryProfile?.winCondition || "").trim();
    const secondary = secondaryCondition
      ? {
        identity: secondaryIdentity,
        condition: secondaryCondition,
        relationship: diagnosis.contradictions?.status === "contradictory" ? "conflicting" : "complementary",
        explanation: diagnosis.contradictions?.status === "contradictory"
          ? `La condición secundaria de ${secondaryIdentity} compite con el plan principal.`
          : `La condición secundaria de ${secondaryIdentity} complementa el plan principal.`,
      }
      : null;

    return {
      status: "assessed",
      primary,
      secondary,
      explanation: primary.explanation,
    };
  }

  return { assessWinConditions };
});
