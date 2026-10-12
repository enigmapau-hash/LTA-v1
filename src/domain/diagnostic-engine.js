(function (root, factory) {
  const compositionEngine = typeof module === "object" && module.exports
    ? require("./composition-engine.js")
    : root.LTACompositionEngine;
  const contradictionEngine = typeof module === "object" && module.exports
    ? require("./contradiction-engine.js")
    : root.LTAContradictionEngine;
  const engine = factory(compositionEngine, contradictionEngine);
  if (typeof module === "object" && module.exports) {
    module.exports = engine;
  } else {
    root.LTADiagnosticEngine = Object.freeze(engine);
  }
})(typeof window !== "undefined" ? window : globalThis, function (compositionEngine, contradictionEngine) {
  "use strict";

  const TEAM_SIZE = 5;

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }

  function validateComposition(picks) {
    const issues = [];
    if (picks.length !== TEAM_SIZE) issues.push("five-picks-required");

    const roles = new Set();
    const champions = new Set();
    for (const pick of picks) {
      const role = normalize(pick?.role);
      const champion = normalize(pick?.champion);
      if (!role) issues.push("role-required");
      else if (roles.has(role)) issues.push("duplicate-role");
      else roles.add(role);

      if (!champion) issues.push("champion-required");
      else if (champions.has(champion)) issues.push("duplicate-champion");
      else champions.add(champion);
    }
    return [...new Set(issues)];
  }

  function unavailableDiagnostic(issues) {
    const diagnosis = {
      status: "not-assessable",
      issues,
      plan: { clear: false, primaryIdentity: null, secondaryIdentity: null },
      coherence: { status: "not-assessed", score: null, gaps: [] },
      robustness: {
        status: "not-assessed",
        identityChanges: [],
        explanation: "Se necesitan cinco elecciones válidas para evaluar la composición completa.",
      },
      dependencies: [],
      primaryProblem: {
        type: "incomplete-composition",
        explanation: "Se necesitan cinco elecciones válidas para emitir un diagnóstico.",
        evidence: issues,
      },
      explanation: ["El diagnóstico completo está pendiente porque la composición no es válida o está incompleta."],
    };
    diagnosis.contradictions = contradictionEngine.assessContradictions({ diagnosis });
    return diagnosis;
  }

  function uniquePicks(items) {
    const seen = new Set();
    return items.filter((item) => {
      const key = `${normalize(item.role)}|${normalize(item.champion)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function buildDependencies(planSupport) {
    const strongestPicks = planSupport?.strongestPicks || [];
    const identityChanges = planSupport?.identityChanges || [];
    const criticalPicks = uniquePicks([
      ...strongestPicks,
      ...identityChanges,
    ]);

    return criticalPicks.map((pick) => {
      const identityChange = identityChanges.find((item) =>
        normalize(item.role) === normalize(pick.role)
        && normalize(item.champion) === normalize(pick.champion)
      ) || null;
      const strongestPick = strongestPicks.find((item) =>
        normalize(item.role) === normalize(pick.role)
        && normalize(item.champion) === normalize(pick.champion)
      ) || null;
      const missingIdentity = identityChange?.identityWithout || null;

      return {
        role: String(pick.role || ""),
        champion: String(pick.champion || ""),
        scoreLoss: strongestPick?.scoreLoss ?? null,
        identityWithout: identityChange ? missingIdentity : null,
        gamePlanWithout: [...(identityChange?.gamePlanWithout || [])],
        explanation: identityChange
          ? missingIdentity
            ? `Si falta ${pick.champion}, la identidad principal cambia a ${missingIdentity}.`
            : `Si falta ${pick.champion}, la composición pierde una identidad principal clara.`
          : `La ausencia de ${pick.champion} produce la mayor pérdida de ajuste observada para el plan.`,
      };
    });
  }

  function buildRobustness(identity, planSupport) {
    if (!identity?.primary || !planSupport) {
      return {
        status: "not-assessed",
        identityChanges: [],
        explanation: "No hay un plan claro cuya estabilidad pueda evaluarse.",
      };
    }

    const identityChanges = (planSupport.identityChanges || []).map((item) => ({
      role: String(item.role || ""),
      champion: String(item.champion || ""),
      identityWithout: item.identityWithout || null,
      gamePlanWithout: [...(item.gamePlanWithout || [])],
    }));
    const losesIdentity = identityChanges.some((item) => !item.identityWithout);
    const status = losesIdentity
      ? "fragile"
      : identityChanges.length
        ? "dependent"
        : "stable";

    const explanation = status === "fragile"
      ? "La identidad principal desaparece si falta al menos una pieza clave."
      : status === "dependent"
        ? "La identidad o el plan cambian si falta al menos una pieza clave."
        : "La identidad principal se mantiene al retirar cualquier pick individual.";

    return { status, identityChanges, explanation };
  }

  function diagnoseComposition(input) {
    const picks = Array.isArray(input) ? input.filter(Boolean) : [];
    const issues = validateComposition(picks);
    if (issues.length) return unavailableDiagnostic(issues);

    if (typeof compositionEngine?.analyzeComposition !== "function") {
      throw new Error("Diagnostic Engine necesita el evaluador de composición disponible.");
    }

    const analysis = compositionEngine.analyzeComposition(picks);
    const primaryIdentity = analysis.identity?.primary || null;
    const secondaryIdentity = analysis.identity?.secondary || null;
    const coherent = Boolean(primaryIdentity);
    const planSupport = analysis.report?.planSupport || null;
    const dependencies = buildDependencies(planSupport);
    const robustness = buildRobustness(analysis.identity, planSupport);
    const gaps = [...(analysis.cohesion?.gaps || [])];
    const weaknesses = [...(analysis.weaknesses || [])];
    const primaryProblem = coherent
      ? {
        type: "identity-risk",
        explanation: weaknesses[0] || "No se detecta un problema estructural principal en los atributos disponibles.",
        evidence: weaknesses,
      }
      : {
        type: "cohesion-gap",
        explanation: analysis.cohesion?.explanation || "Los atributos no convergen en un plan común.",
        evidence: gaps,
      };
    const coherenceStatus = !coherent ? "incoherent" : secondaryIdentity ? "hybrid" : "coherent";
    const coherence = {
      status: coherenceStatus,
      score: Number.isFinite(analysis.cohesion?.score) ? analysis.cohesion.score : null,
      gaps,
      explanation: coherent
        ? secondaryIdentity
          ? `La composición respalda ${primaryIdentity} y presenta señales secundarias de ${secondaryIdentity}.`
          : `La composición converge en el plan ${primaryIdentity}.`
        : primaryProblem.explanation,
    };

    const explanation = [
      coherence.explanation,
      `Problema estructural principal: ${primaryProblem.explanation}`,
      robustness.explanation,
      ...(dependencies.length ? dependencies.map((item) => item.explanation) : []),
    ];

    const diagnosis = {
      status: "assessed",
      issues: [],
      plan: { clear: coherent, primaryIdentity, secondaryIdentity },
      coherence,
      robustness,
      dependencies,
      primaryProblem,
      explanation,
    };
    diagnosis.contradictions = contradictionEngine.assessContradictions({ diagnosis, picks });

    if (diagnosis.contradictions.status === "contradictory") {
      diagnosis.coherence.status = "contradictory";
      diagnosis.coherence.explanation = diagnosis.contradictions.explanation;
      diagnosis.primaryProblem = {
        type: "strategic-contradiction",
        explanation: diagnosis.contradictions.explanation,
        evidence: diagnosis.contradictions.identities,
      };
      diagnosis.explanation = [
        `Problema estructural principal: ${diagnosis.primaryProblem.explanation}`,
        diagnosis.robustness.explanation,
        ...diagnosis.dependencies.map((item) => item.explanation),
      ];
    }

    return diagnosis;
  }

  return { diagnoseComposition };
});
