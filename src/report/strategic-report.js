(function (root, factory) {
  const builder = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = builder;
  } else {
    root.LTAStrategicReportBuilder = Object.freeze(builder);
  }
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function diagnosisSection(diagnosis) {
    const primary = diagnosis?.plan?.primaryIdentity;
    const secondary = diagnosis?.plan?.secondaryIdentity;
    if (!diagnosis || diagnosis.status !== "assessed") {
      return {
        id: "diagnosis",
        title: "Diagnóstico",
        answer: "Diagnóstico pendiente",
        explanation: diagnosis?.primaryProblem?.explanation || "Se necesita una composición completa para valorar el plan.",
      };
    }
    if (!diagnosis.plan?.clear || !primary) {
      return {
        id: "diagnosis",
        title: "Diagnóstico",
        answer: "Sin un plan de partida claro",
        explanation: diagnosis.primaryProblem?.explanation || diagnosis.coherence?.explanation || "Los atributos no convergen en una identidad principal.",
      };
    }
    return {
      id: "diagnosis",
      title: "Diagnóstico",
      answer: `Plan principal: ${primary}`,
      explanation: secondary
        ? `También muestra señales de ${secondary}.`
        : "Los atributos del equipo convergen en este plan.",
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
        explanation: correction?.explanation || "El diagnóstico no aporta evidencia suficiente para priorizar una mejora.",
      };
    }
    const profile = String(improvement.profile?.label || "un perfil complementario");
    const factor = String(improvement.limitingFactor || correction?.limitingFactor || "la carencia prioritaria");
    return {
      id: "correction",
      title: "Mejora prioritaria",
      answer: `Reforzar ${profile.toLowerCase()}`,
      explanation: `Prioriza corregir: ${factor}.`,
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
        explanation: protection?.recommendation || "Los datos disponibles no permiten resumir una protección concreta.",
      };
    }
    return {
      id: "protection",
      title: "Protección estratégica",
      answer: `Proteger el plan frente a ${String(threat.style || "la amenaza principal")}`,
      explanation: String(threat.explanation || "Este estilo puede castigar el plan de la composición."),
      action: String(threat.protection || ""),
    };
  }

  function buildStrategicReport(input = {}) {
    const diagnosis = input.diagnosis;
    return {
      status: diagnosis?.status === "assessed" ? "assessed" : "not-assessable",
      title: "Cómo jugarla",
      sections: [
        diagnosisSection(diagnosis),
        correctionSection(input.correction),
        protectionSection(input.protection),
      ],
    };
  }

  return { buildStrategicReport };
});
