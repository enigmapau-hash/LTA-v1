(function (root, factory) {
  const engine = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = engine;
  } else {
    root.LTAWinConditionCoherenceEngine = Object.freeze(engine);
  }
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function notAssessed(explanation) {
    return {
      status: "not-assessed",
      relation: "unavailable",
      secondaryMitigation: "not-assessed",
      explanation,
    };
  }

  function assessWinConditionCoherence(input = {}) {
    const diagnosis = input.diagnosis;
    const winCondition = input.winCondition || diagnosis?.winCondition;
    const primaryIdentity = String(diagnosis?.plan?.primaryIdentity || "").trim();
    const primaryCondition = winCondition?.primary;

    if (diagnosis?.status !== "assessed" || winCondition?.status !== "assessed" || !primaryIdentity) {
      return notAssessed("Hace falta un diagnóstico y una condición de victoria para comparar el plan.");
    }
    if (!primaryCondition?.identity || !String(primaryCondition.condition || "").trim()) {
      return notAssessed("No hay una condición principal suficiente para valorar su encaje con el plan.");
    }

    const primaryMatches = primaryCondition.identity === primaryIdentity;
    const secondaryCondition = winCondition.secondary;
    const secondaryIdentity = String(diagnosis.plan?.secondaryIdentity || "").trim();
    const secondaryMatches = !secondaryIdentity
      ? !secondaryCondition
      : Boolean(secondaryCondition?.identity === secondaryIdentity && String(secondaryCondition.condition || "").trim());
    const diagnosedConflict = diagnosis.contradictions?.status === "contradictory";
    const conflictingSecondary = secondaryCondition?.relationship === "conflicting";
    const complementarySecondary = secondaryCondition?.relationship === "complementary" && secondaryMatches;

    if (!primaryMatches) {
      return {
        status: "contradictory",
        relation: "conflicting",
        secondaryMitigation: complementarySecondary ? "mitigates-conflict" : secondaryCondition ? "does-not-mitigate" : "none",
        explanation: `La condición de ${primaryCondition.identity} contradice la identidad principal ${primaryIdentity}.`,
      };
    }

    if (diagnosedConflict || conflictingSecondary) {
      const canMitigate = complementarySecondary;
      return {
        status: canMitigate ? "partially-coherent" : "contradictory",
        relation: canMitigate ? "complementary" : "conflicting",
        secondaryMitigation: canMitigate ? "mitigates-conflict" : secondaryCondition ? "does-not-mitigate" : "none",
        explanation: canMitigate
          ? `La condición secundaria de ${secondaryCondition.identity} ofrece una vía complementaria, aunque persiste el conflicto del plan.`
          : `La condición principal sigue ${primaryIdentity}, pero el diagnóstico conserva planes incompatibles.`,
      };
    }

    if ((secondaryIdentity && !secondaryMatches) || (!secondaryIdentity && secondaryCondition)) {
      return {
        status: "partially-coherent",
        relation: "incomplete",
        secondaryMitigation: "not-assessed",
        explanation: secondaryIdentity
          ? `La condición principal refuerza ${primaryIdentity}, pero no hay una condición secundaria alineada con ${secondaryIdentity}.`
          : `La condición principal refuerza ${primaryIdentity}, pero la vía secundaria no coincide con el diagnóstico.`,
      };
    }

    if (complementarySecondary) {
      return {
        status: "partially-coherent",
        relation: "complementary",
        secondaryMitigation: "complements-plan",
        explanation: `La condición secundaria de ${secondaryIdentity} complementa el plan de ${primaryIdentity} sin sustituirlo.`,
      };
    }

    return {
      status: "fully-coherent",
      relation: "aligned",
      secondaryMitigation: "not-needed",
      explanation: `La condición de victoria refuerza la identidad principal ${primaryIdentity}.`,
    };
  }

  return { assessWinConditionCoherence };
});
