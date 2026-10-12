(function (root, factory) {
  const engine = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = engine;
  } else {
    root.LTACompositionStabilityEngine = Object.freeze(engine);
  }
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function unavailable(explanation) {
    return {
      status: "not-assessed",
      removals: [],
      keyPicks: [],
      explanation,
    };
  }

  function assessCompositionStability(input = {}) {
    const diagnosis = input.diagnosis;
    const primaryIdentity = String(diagnosis?.plan?.primaryIdentity || "").trim();
    const outcomes = Array.isArray(input.removalOutcomes) ? input.removalOutcomes : [];
    if (diagnosis?.status !== "assessed" || !primaryIdentity || !outcomes.length) {
      return unavailable("Hace falta un plan completo y sus resultados de retirada para evaluar estabilidad.");
    }

    const greatestPositiveLoss = Math.max(0, ...outcomes.map((item) =>
      Number.isFinite(item?.scoreLoss) ? item.scoreLoss : 0
    ));
    const removals = outcomes.map((item) => {
      const identityAfter = String(item?.identityWithout || "").trim() || null;
      const scoreLoss = Number.isFinite(item?.scoreLoss) ? item.scoreLoss : 0;
      const identityChanges = identityAfter !== primaryIdentity;
      const criticality = identityChanges || (greatestPositiveLoss > 0 && scoreLoss === greatestPositiveLoss)
        ? "alta"
        : scoreLoss > 0
          ? "media"
          : "baja";
      const impact = !identityAfter
        ? "critica"
        : identityChanges || scoreLoss > 0
          ? "moderada"
          : "leve";
      const explanation = !identityAfter
        ? `Si falta ${item.champion}, la composición pierde un plan de identidad claro.`
        : identityChanges
          ? `Si falta ${item.champion}, la identidad principal cambia a ${identityAfter}.`
          : scoreLoss > 0
            ? `Si falta ${item.champion}, ${primaryIdentity} se mantiene, pero pierde parte de su respaldo.`
            : `Si falta ${item.champion}, la identidad ${primaryIdentity} se mantiene sin una pérdida de respaldo observada.`;

      return {
        role: String(item?.role || ""),
        champion: String(item?.champion || ""),
        identityAfter,
        criticality,
        impact,
        explanation,
      };
    });

    const losesPlan = removals.some((item) => item.impact === "critica");
    const changesPlan = removals.some((item) => item.identityAfter !== primaryIdentity);
    const status = losesPlan ? "fragile" : changesPlan ? "dependent" : "stable";
    const keyPicks = removals
      .filter((item) => item.criticality === "alta")
      .map(({ role, champion }) => ({ role, champion }));
    const explanation = status === "fragile"
      ? "La composición pierde una identidad clara si falta al menos una pieza clave."
      : status === "dependent"
        ? "La identidad cambia si falta al menos una pieza clave, aunque la composición conserva otro plan."
        : "La identidad principal se mantiene al retirar cualquier pieza por separado.";

    return { status, removals, keyPicks, explanation };
  }

  return { assessCompositionStability };
});
