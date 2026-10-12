(function (root, factory) {
  const engine = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = engine;
  } else {
    root.LTAContradictionEngine = Object.freeze(engine);
  }
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const CONFLICTS = [
    {
      identities: ["Poke", "Dive"],
      explanation: "Poke necesita desgastar a distancia, mientras Dive busca entrar pronto sobre la backline.",
    },
  ];

  const IDENTITY_FAMILIES = {
    "front to back": ["Front to Back"],
    engage: ["Dive", "Teamfight"],
    dive: ["Dive"],
    pick: ["Pick"],
    poke: ["Poke"],
    "split push": ["Split Push"],
    teamfight: ["Teamfight"],
    escalado: ["Escalado"],
    scaling: ["Escalado"],
    "early game": ["Early Game"],
  };

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function findConflict(primary, secondary) {
    const pair = [normalize(primary), normalize(secondary)].sort();
    return CONFLICTS.find((item) =>
      item.identities.map(normalize).sort().every((identity, index) => identity === pair[index])
    ) || null;
  }

  function findDeviatingPicks(picks, secondaryIdentity, primaryIdentity) {
    const secondary = normalize(secondaryIdentity);
    const primary = normalize(primaryIdentity);
    return (Array.isArray(picks) ? picks : [])
      .filter((pick) => {
        const families = IDENTITY_FAMILIES[normalize(pick?.identity)] || [];
        return families.some((identity) => normalize(identity) === secondary)
          && !families.some((identity) => normalize(identity) === primary);
      })
      .map((pick) => ({ role: String(pick.role || ""), champion: String(pick.champion || "") }));
  }

  function assessContradictions(input = {}) {
    const diagnosis = input.diagnosis;
    if (diagnosis?.status !== "assessed") {
      return {
        status: "not-assessed",
        identities: [],
        deviatingPicks: [],
        explanation: "Hace falta un diagnóstico completo para valorar contradicciones.",
      };
    }

    const primary = String(diagnosis.plan?.primaryIdentity || "").trim();
    const secondary = String(diagnosis.plan?.secondaryIdentity || "").trim();
    if (!primary) {
      return {
        status: "incoherent",
        identities: [],
        deviatingPicks: [],
        explanation: String(diagnosis.primaryProblem?.explanation || "Los atributos no convergen en un plan común."),
      };
    }

    const conflict = secondary ? findConflict(primary, secondary) : null;
    if (!conflict) {
      return {
        status: secondary ? "coherent-hybrid" : "coherent",
        identities: secondary ? [primary, secondary] : [primary],
        deviatingPicks: [],
        explanation: secondary
          ? `Las señales de ${secondary} complementan ${primary} sin exigir un plan incompatible.`
          : `La composición mantiene una dirección común en torno a ${primary}.`,
      };
    }

    const deviatingPicks = findDeviatingPicks(input.picks, secondary, primary);
    const keyPick = deviatingPicks[0];
    return {
      status: "contradictory",
      identities: [...conflict.identities],
      deviatingPicks,
      explanation: keyPick
        ? `${conflict.explanation} ${keyPick.champion} (${keyPick.role}) aporta señales del plan secundario ${secondary}.`
        : conflict.explanation,
    };
  }

  return { assessContradictions };
});
