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

  function adaptSectionTone(section, level) {
    if (level === "alta") return section;
    const action = section.action
      ? level === "media"
        ? `Como orientación, ${section.action.charAt(0).toLocaleLowerCase("es")}${section.action.slice(1)}`
        : `De forma provisional, ${section.action.charAt(0).toLocaleLowerCase("es")}${section.action.slice(1)}`
      : section.action;

    if (level === "media") {
      const answer = section.id === "diagnosis"
        ? section.answer.replace(/^Plan principal:/, "Plan probable:")
        : section.id === "correction"
          ? section.answer.replace(/^Reforzar\s+/, "Orientación: reforzar ")
          : section.answer.replace(/^Proteger el plan frente a\s+/, "Conviene proteger el plan frente a ");
      return { ...section, answer, ...(action ? { action } : {}) };
    }

    const answer = section.id === "diagnosis"
      ? `Lectura provisional: ${section.answer}`
      : section.id === "correction"
        ? section.answer.startsWith("Reforzar ")
          ? section.answer.replace(/^Reforzar\s+/, "Posible mejora: reforzar ")
          : "Sin mejora prioritaria respaldada por ahora"
        : section.answer.startsWith("Proteger el plan frente a ")
          ? section.answer.replace(/^Proteger el plan frente a\s+/, "Protección provisional frente a ")
          : "Sin amenaza prioritaria por ahora";
    return { ...section, answer, ...(action ? { action } : {}) };
  }

  function buildStrategicReport(input = {}) {
    const diagnosis = input.diagnosis;
    const confidence = confidenceEngine.assessConfidence({
      diagnosis,
      correction: input.correction,
      protection: input.protection,
    });
    const sections = [
      diagnosisSection(diagnosis),
      correctionSection(input.correction),
      protectionSection(input.protection),
    ].map((section) => adaptSectionTone(section, confidence.conclusions[section.id]?.level));
    return {
      status: diagnosis?.status === "assessed" ? "assessed" : "not-assessable",
      title: "Cómo jugarla",
      confidence,
      sections,
    };
  }

  return { buildStrategicReport };
});
