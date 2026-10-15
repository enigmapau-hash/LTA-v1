(function (root, factory) {
  const engine = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = engine;
  } else {
    root.LTADiagnosticSummaryEngine = Object.freeze(engine);
  }
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function namesOf(items) {
    return [...new Set(items.map((item) => String(item?.champion || "").trim()).filter(Boolean))];
  }

  function joinNames(names) {
    if (names.length < 2) return names[0] || "";
    return `${names.slice(0, -1).join(", ")} o ${names[names.length - 1]}`;
  }

  function stabilitySummary(diagnosis) {
    const stability = diagnosis.stability || {};
    const removals = Array.isArray(stability.removals) ? stability.removals : [];
    const identityLosses = removals.filter((item) => !String(item?.identityAfter || "").trim());
    if (identityLosses.length) {
      const champions = joinNames(namesOf(identityLosses));
      return champions ? `Si falta ${champions}, la composición pierde un plan claro.` : null;
    }

    if (stability.status === "dependent") {
      const changedIdentity = removals.find((item) =>
        item?.identityAfter && item.identityAfter !== diagnosis.plan?.primaryIdentity
      );
      if (changedIdentity?.champion) {
        return `Si falta ${changedIdentity.champion}, la identidad cambia a ${changedIdentity.identityAfter}.`;
      }
    }

    if (stability.status === "stable") {
      const keyChampion = stability.keyPicks?.[0]?.champion;
      if (keyChampion) {
        return `Sin ${keyChampion}, el plan conserva su identidad pese a perder respaldo.`;
      }
      return "El plan mantiene una dirección común incluso si falta una pieza.";
    }

    return null;
  }

  function buildDiagnosticSummary(input = {}) {
    const diagnosis = input.diagnosis || {};
    const coherence = diagnosis.winConditionCoherence || {};
    const stability = diagnosis.stability || {};
    const contradiction = diagnosis.contradictions || {};
    const confidence = input.confidence || {};

    if (diagnosis.status !== "assessed") {
      return {
        status: "not-assessed",
        summary: "Hace falta una composición completa para valorar su solidez.",
      };
    }

    if (contradiction.status === "contradictory"
      || coherence.status === "contradictory"
      || stability.status === "fragile") {
      return {
        status: "fragile",
        summary: contradiction.status === "contradictory" || coherence.status === "contradictory"
          ? "La composición parece frágil porque sus planes compiten."
          : stabilitySummary(diagnosis) || "La identidad puede perderse si falta una pieza clave.",
      };
    }

    if (!diagnosis.plan?.clear || !diagnosis.plan?.primaryIdentity) {
      return {
        status: "fragile",
        summary: confidence.level === "baja"
          ? "Por ahora, los atributos no apuntan a un plan común."
          : "Los atributos aún no convergen en un plan común.",
      };
    }

    const fullyAligned = coherence.status === "fully-coherent";
    const stable = stability.status === "stable";
    const dependencySummary = stabilitySummary(diagnosis);
    if (dependencySummary && stability.status === "dependent") {
      return { status: "risk", summary: dependencySummary };
    }
    if (confidence.level === "alta"
      && diagnosis.coherence?.status === "coherent"
      && fullyAligned
      && stable) {
      return {
        status: "solid",
        summary: dependencySummary || "El plan mantiene una dirección común incluso si falta una pieza.",
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
