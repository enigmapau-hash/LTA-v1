(function (root, factory) {
  const explanations = typeof module === "object" && module.exports
    ? require("./strategic-explanations.js")
    : root.LTAStrategicExplanations;
  const confidenceEngine = typeof module === "object" && module.exports
    ? require("../domain/confidence-engine.js")
    : root.LTAConfidenceEngine;
  const builder = factory(explanations, confidenceEngine);
  if (typeof module === "object" && module.exports) {
    module.exports = builder;
  } else {
    root.LTAStrategicReportBuilder = Object.freeze(builder);
  }
})(typeof window !== "undefined" ? window : globalThis, function (explanations, confidenceEngine) {
  "use strict";

  function diagnosisSection(diagnosis) {
    const primary = diagnosis?.plan?.primaryIdentity;
    if (!diagnosis || diagnosis.status !== "assessed") {
      return {
        id: "diagnosis",
        title: "Diagnóstico",
        answer: "Diagnóstico pendiente",
        explanation: explanations.explainDiagnosis(diagnosis),
      };
    }
    if (!diagnosis.plan?.clear || !primary) {
      return {
        id: "diagnosis",
        title: "Diagnóstico",
        answer: "Sin un plan de partida claro",
        explanation: explanations.explainDiagnosis(diagnosis),
      };
    }
    return {
      id: "diagnosis",
      title: "Diagnóstico",
      answer: `Plan principal: ${primary}`,
      explanation: explanations.explainDiagnosis(diagnosis),
    };
  }

  function correctionSection(correction) {
    const improvements = Array.isArray(correction?.improvements) ? correction.improvements : [];
    const improvement = improvements.find((item) => item?.priority === "principal") || improvements[0];
    if (!improvement) {
      return {
        id: "correction",
        title: "Corrección",
        answer: "Sin una mejora respaldada",
        explanation: explanations.explainCorrection(correction),
      };
    }
    const profile = String(improvement.profile?.label || "un perfil complementario");
    return {
      id: "correction",
      title: "Mejora prioritaria",
      answer: `Reforzar ${profile.toLowerCase()}`,
      explanation: explanations.explainCorrection(correction),
    };
  }

  function protectionSection(protection) {
    const threats = Array.isArray(protection?.threats) ? protection.threats : [];
    const threat = threats.find((item) => item?.priority === "principal") || threats[0];
    if (!threat) {
      return {
        id: "protection",
        title: "Protección",
        answer: "Sin una amenaza prioritaria",
        explanation: explanations.explainProtection(protection),
      };
    }
    return {
      id: "protection",
      title: "Protección estratégica",
      answer: `Proteger el plan frente a ${String(threat.style || "la amenaza principal")}`,
      explanation: explanations.explainProtection(protection),
      action: String(threat.protection || ""),
    };
  }

  function buildStrategicReport(input = {}) {
    const diagnosis = input.diagnosis;
    const confidence = confidenceEngine.assessConfidence({
      diagnosis,
      correction: input.correction,
      protection: input.protection,
    });
    return {
      status: diagnosis?.status === "assessed" ? "assessed" : "not-assessable",
      title: "Cómo jugarla",
      confidence,
      sections: [
        diagnosisSection(diagnosis),
        correctionSection(input.correction),
        protectionSection(input.protection),
      ],
    };
  }

  return { buildStrategicReport };
});
