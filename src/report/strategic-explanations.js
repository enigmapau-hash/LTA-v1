(function (root, factory) {
  const explanations = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = explanations;
  } else {
    root.LTAStrategicExplanations = Object.freeze(explanations);
  }
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function explainDiagnosis(diagnosis) {
    if (diagnosis?.status !== "assessed") {
      return "Hace falta una composición completa para valorar el plan.";
    }
    if (!diagnosis.plan?.clear || !diagnosis.plan?.primaryIdentity) {
      return "Sus atributos no convergen lo suficiente para sostener un plan compartido.";
    }
    if (diagnosis.plan.secondaryIdentity) {
      return `El plan principal concentra más señales; también hay apoyo para ${diagnosis.plan.secondaryIdentity}.`;
    }
    return "Las señales de los cinco roles convergen en una identidad común.";
  }

  function explainCorrection(correction) {
    const improvements = Array.isArray(correction?.improvements) ? correction.improvements : [];
    const improvement = improvements.find((item) => item?.priority === "principal") || improvements[0];
    if (!improvement) {
      return "El diagnóstico no respalda una mejora prioritaria concreta.";
    }
    return "Este perfil atiende la carencia principal sin desplazar la identidad del equipo.";
  }

  function explainProtection(protection) {
    const threats = Array.isArray(protection?.threats) ? protection.threats : [];
    const threat = threats.find((item) => item?.priority === "principal") || threats[0];
    if (!threat) {
      return "No hay señales suficientes para justificar una amenaza prioritaria.";
    }
    const reason = String(threat.explanation || "Este estilo puede castigar el plan del equipo.").trim();
    const conciseReason = reason
      .split(/,\s*(?:incluso|aunque)\b|\s+y\s+/i, 1)[0]
      .replace(/[.,;:]+$/, "");
    return `Es la amenaza prioritaria porque ${conciseReason.charAt(0).toLowerCase()}${conciseReason.slice(1)}.`;
  }

  return { explainDiagnosis, explainCorrection, explainProtection };
});
