(function (root, factory) {
  const engine = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = engine;
  } else {
    root.LTAConfidenceEngine = Object.freeze(engine);
  }
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const LEVEL = Object.freeze({ high: "alta", medium: "media", low: "baja" });

  function hasConvergingEvidence(diagnosis) {
    return Number.isFinite(diagnosis?.coherence?.score) && diagnosis.coherence.score > 0;
  }

  function assessDiagnosis(diagnosis) {
    const winConditionCoherence = diagnosis?.winConditionCoherence;
    if (winConditionCoherence?.status === "contradictory") {
      return {
        level: LEVEL.low,
        rationale: "La condición de victoria contradice la identidad o mantiene planes incompatibles.",
      };
    }

    if (diagnosis?.contradictions?.status === "contradictory") {
      if (winConditionCoherence?.secondaryMitigation === "mitigates-conflict") {
        return {
          level: LEVEL.medium,
          rationale: "La condición secundaria ofrece una vía complementaria, aunque el conflicto no desaparece.",
        };
      }
      return {
        level: LEVEL.low,
        rationale: "Dos planes estratégicos incompatibles compiten en la composición.",
      };
    }

    if (diagnosis?.stability?.status === "fragile") {
      return {
        level: LEVEL.low,
        rationale: "La identidad principal depende de una pieza cuya ausencia rompe el plan.",
      };
    }

    const clearPlan = diagnosis?.status === "assessed"
      && diagnosis.plan?.clear === true
      && Boolean(diagnosis.plan?.primaryIdentity);
    const coherent = ["coherent", "hybrid"].includes(diagnosis?.coherence?.status);
    const robustness = diagnosis?.robustness?.status;
    const knownRobustness = ["stable", "dependent", "fragile"].includes(robustness);
    const converges = hasConvergingEvidence(diagnosis);

    if (!clearPlan || !coherent) {
      return {
        level: LEVEL.low,
        rationale: diagnosis?.status === "assessed"
          ? "Las señales no convergen en un plan suficientemente claro."
          : "Sin una composición válida no hay evidencia suficiente para valorar el plan.",
      };
    }

    if (winConditionCoherence?.status === "partially-coherent") {
      return {
        level: LEVEL.medium,
        rationale: winConditionCoherence.secondaryMitigation === "complements-plan"
          ? "La condición secundaria complementa el plan, aunque abre una vía adicional."
          : winConditionCoherence.explanation,
      };
    }

    if (diagnosis?.stability?.status === "dependent") {
      return {
        level: LEVEL.medium,
        rationale: "La composición conserva un plan, aunque puede cambiar si falta una pieza clave.",
      };
    }

    if (diagnosis.coherence.status === "coherent" && robustness === "stable" && converges) {
      return {
        level: LEVEL.high,
        rationale: "El plan es claro, las señales convergen y la identidad se mantiene estable.",
      };
    }

    return {
      level: LEVEL.medium,
      rationale: diagnosis.coherence.status === "hybrid"
        ? "El plan principal se reconoce, aunque convive con otra identidad."
        : knownRobustness && robustness !== "stable"
          ? "El plan es claro, pero puede cambiar si falta una pieza clave."
          : converges
            ? "Las señales apuntan a un plan, aunque falta confirmar su estabilidad."
            : "El plan es reconocible, pero la evidencia de convergencia es limitada.",
    };
  }

  function primaryImprovement(correction) {
    const improvements = Array.isArray(correction?.improvements) ? correction.improvements : [];
    return improvements.find((item) => item?.priority === "principal") || improvements[0] || null;
  }

  function assessCorrection(correction, diagnosisConfidence) {
    const improvement = primaryImprovement(correction);
    const factor = String(improvement?.limitingFactor || correction?.limitingFactor || "").trim();
    if (correction?.status !== "proposed" || !improvement || !factor || diagnosisConfidence.level === LEVEL.low) {
      return {
        level: LEVEL.low,
        rationale: "No hay una mejora prioritaria suficientemente respaldada por el diagnóstico.",
      };
    }

    const candidates = Array.isArray(improvement.candidates) ? improvement.candidates : [];
    if (diagnosisConfidence.level === LEVEL.high && candidates.length >= 2) {
      return {
        level: LEVEL.high,
        rationale: "La carencia está priorizada y varias opciones compatibles respaldan la corrección.",
      };
    }

    return {
      level: LEVEL.medium,
      rationale: "La mejora responde a una carencia detectada, con margen de incertidumbre en el plan.",
    };
  }

  function primaryThreat(protection) {
    const threats = Array.isArray(protection?.threats) ? protection.threats : [];
    return threats.find((item) => item?.priority === "principal") || threats[0] || null;
  }

  function assessProtection(protection, diagnosisConfidence) {
    const threat = primaryThreat(protection);
    if (protection?.status !== "assessed" || !threat || !String(threat.style || "").trim()
      || diagnosisConfidence.level === LEVEL.low) {
      return {
        level: LEVEL.low,
        rationale: "No hay base suficiente para priorizar una amenaza frente al plan.",
      };
    }

    const evidence = Array.isArray(threat.evidence) ? threat.evidence.filter(Boolean) : [];
    if (diagnosisConfidence.level === LEVEL.high && evidence.length >= 2) {
      return {
        level: LEVEL.high,
        rationale: "La amenaza coincide con un plan estable y está respaldada por varias señales.",
      };
    }

    return {
      level: LEVEL.medium,
      rationale: "La amenaza es plausible, aunque el plan mixto o sus dependencias reducen la certeza.",
    };
  }

  function assessConfidence(input = {}) {
    const diagnosis = input.diagnosis;
    const diagnosisConfidence = assessDiagnosis(diagnosis);
    const correctionConfidence = assessCorrection(input.correction, diagnosisConfidence);
    const protectionConfidence = assessProtection(input.protection, diagnosisConfidence);

    return {
      status: diagnosis?.status === "assessed" ? "assessed" : "not-assessable",
      conclusions: {
        diagnosis: diagnosisConfidence,
        correction: correctionConfidence,
        protection: protectionConfidence,
      },
    };
  }

  return { assessConfidence };
});
