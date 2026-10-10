(function (root, factory) {
  const engine = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = engine;
  } else {
    root.LTACompositionEngine = Object.freeze(engine);
  }
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const ARCHETYPES = [
    {
      id: "front-to-back",
      label: "Front to Back",
      winCondition: "Proteger al ADC y forzar teamfights.",
      strengths: ["Frontline", "Peel", "DPS sostenido"],
      weaknesses: ["Poca presión lateral"],
      signals: [
        { fields: ["identity"], terms: ["front to back"], weight: 3 },
        { fields: ["strengths"], terms: ["frontline"], weight: 1 },
        { fields: ["strengths"], terms: ["peel"], weight: 1 },
        { fields: ["strengths", "function"], terms: ["dps", "hypercarry"], weight: 1 },
      ],
    },
    {
      id: "dive",
      label: "Dive",
      winCondition: "Eliminar rápidamente la backline rival.",
      strengths: ["Acceso a la backline", "Engage", "Follow-up"],
      weaknesses: ["Pierde valor si falla la iniciación"],
      signals: [
        { fields: ["strengths"], terms: ["backline", "acceso al carry"], weight: 2 },
        { fields: ["strengths"], terms: ["engage"], weight: 1 },
        { fields: ["strengths"], terms: ["follow-up"], weight: 2 },
        { fields: ["strengths"], terms: ["flanqueo", "movilidad"], weight: 1 },
        { fields: ["identity"], terms: ["engage"], weight: 1 },
      ],
    },
    {
      id: "pick",
      label: "Pick",
      winCondition: "Generar cazadas y convertir la ventaja numérica en objetivos.",
      strengths: ["Gran capacidad para generar cazadas"],
      weaknesses: ["Poco daño sostenido"],
      signals: [
        { fields: ["strengths"], terms: ["pick"], weight: 3 },
        { fields: ["strengths"], terms: ["ganks", "roams"], weight: 1 },
        { fields: ["strengths"], terms: ["control del mapa", "control de visión"], weight: 1 },
        { fields: ["function", "strengths"], terms: ["burst"], weight: 1 },
      ],
    },
    {
      id: "poke",
      label: "Poke",
      winCondition: "Desgastar antes de pelear y evitar engages directos.",
      strengths: ["Poke", "Asedio"],
      weaknesses: ["Evitar engages directos"],
      signals: [
        { fields: ["strengths"], terms: ["poke"], weight: 3 },
        { fields: ["strengths"], terms: ["asedio"], weight: 2 },
        { fields: ["function"], terms: ["artillery mage", "poke"], weight: 1 },
      ],
    },
    {
      id: "split-push",
      label: "Split Push",
      winCondition: "Crear presión lateral y obligar al rival a responder separado.",
      strengths: ["Presión lateral", "Duelos", "Presión global"],
      weaknesses: ["Evitar teamfights prolongadas"],
      signals: [
        { fields: ["strengths"], terms: ["side lane"], weight: 3 },
        { fields: ["strengths"], terms: ["duelos"], weight: 2 },
        { fields: ["strengths"], terms: ["presión global", "global"], weight: 2 },
        { fields: ["function"], terms: ["duelista"], weight: 1 },
      ],
      synergies: [{ signalIndexes: [0, 1, 2], minContributors: 3, bonus: 12 }],
    },
    {
      id: "teamfight",
      label: "Teamfight",
      winCondition: "Iniciar una pelea coordinada y encadenar las definitivas.",
      strengths: ["Sinergia de definitivas", "Excelente iniciación"],
      weaknesses: ["Depende de encontrar una iniciación coordinada"],
      signals: [
        { fields: ["strengths"], terms: ["teamfight"], weight: 3 },
        { fields: ["strengths"], terms: ["engage"], weight: 2 },
        { fields: ["strengths"], terms: ["follow-up"], weight: 2 },
        { fields: ["strengths"], terms: ["frontline"], weight: 1 },
      ],
    },
    {
      id: "scaling",
      label: "Escalado",
      winCondition: "Priorizar llegar a los picos de poder y evitar riesgos innecesarios en early.",
      strengths: ["Late muy fuerte", "Escalado", "DPS"],
      weaknesses: ["Early vulnerable"],
      signals: [
        { fields: ["tempo"], terms: ["late"], weight: 3 },
        { fields: ["tempo"], terms: ["mid/late"], weight: 2 },
        { fields: ["strengths"], terms: ["escalado"], weight: 2 },
        { fields: ["function", "strengths"], terms: ["hypercarry", "dps"], weight: 1 },
        { fields: ["weaknesses"], terms: ["early débil", "early muy débil"], weight: 1 },
      ],
    },
    {
      id: "early-game",
      label: "Early Game",
      winCondition: "Aprovechar la presión inicial para acelerar la partida.",
      strengths: ["Presión en early", "Tempo", "Snowball"],
      weaknesses: ["Pierde valor si la partida se alarga"],
      signals: [
        { fields: ["tempo"], terms: ["early"], weight: 3 },
        { fields: ["tempo"], terms: ["early/mid"], weight: 2 },
        { fields: ["strengths"], terms: ["tempo"], weight: 2 },
        { fields: ["strengths"], terms: ["snowball", "ganks", "roams"], weight: 1 },
        { fields: ["weaknesses"], terms: ["escala peor", "late inferior"], weight: 1 },
      ],
    },
  ];

  const STRATEGIC_GAPS = [
    { id: "engage", label: "iniciación compartida", fields: ["strengths"], terms: ["engage"] },
    { id: "pick", label: "herramientas de pick", fields: ["strengths"], terms: ["pick", "ganks"] },
    { id: "poke", label: "presión de poke", fields: ["strengths"], terms: ["poke", "asedio"] },
    { id: "frontline", label: "frontline", fields: ["strengths"], terms: ["frontline"] },
    { id: "peel", label: "protección para los carries", fields: ["strengths"], terms: ["peel"] },
    { id: "sustained-damage", label: "daño sostenido", fields: ["strengths", "function"], terms: ["dps", "hypercarry"] },
    { id: "side-lane", label: "presión lateral", fields: ["strengths"], terms: ["side lane"] },
  ];

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9/ -]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function fieldText(pick, field) {
    return normalize(pick?.[field]);
  }

  function matchesSignal(pick, signal) {
    return signal.fields.some((field) => {
      const value = fieldText(pick, field);
      return signal.terms.some((term) => value.includes(normalize(term)));
    });
  }

  function scoreArchetype(picks, archetype) {
    if (!picks.length) return 0;
    const weightedCoverage = archetype.signals.reduce((sum, signal) => {
      const contributors = picks.filter((pick) => matchesSignal(pick, signal)).length;
      const coverage = contributors >= 2 ? 1 : contributors === 1 ? 0.65 : 0;
      return sum + coverage * signal.weight;
    }, 0);
    const signalCoverage = weightedCoverage / archetype.signals.reduce((sum, signal) => sum + signal.weight, 0);
    const championCoverage = picks.filter((pick) =>
      archetype.signals.some((signal) => matchesSignal(pick, signal))
    ).length / picks.length;
    let score = Math.round((signalCoverage * 0.55 + championCoverage * 0.45) * 100);
    for (const synergy of archetype.synergies || []) {
      const contributors = new Set();
      for (const index of synergy.signalIndexes) {
        picks.forEach((pick, pickIndex) => {
          if (matchesSignal(pick, archetype.signals[index])) contributors.add(pickIndex);
        });
      }
      if (contributors.size >= synergy.minContributors) score += synergy.bonus;
    }
    return Math.min(score, 100);
  }

  function strategicGaps(picks) {
    return STRATEGIC_GAPS.filter((gap) =>
      picks.every((pick) => !matchesSignal(pick, gap))
    ).map((gap) => gap.label);
  }

  function analyzeComposition(input) {
    const picks = Array.isArray(input) ? input.filter(Boolean) : [];
    const scores = ARCHETYPES
      .map((archetype) => ({
        id: archetype.id,
        label: archetype.label,
        score: scoreArchetype(picks, archetype),
      }))
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, "es"));

    const best = scores[0];
    const timingProfile = best?.id === "front-to-back" && scores.find((item) =>
      ["scaling", "early-game"].includes(item.id) && item.score >= 80 && best.score - item.score <= 12
    );
    const primaryScore = timingProfile || best;
    const runnerUp = scores.find((item) => item.id !== primaryScore?.id);
    const primary = primaryScore && primaryScore.score >= 60
      ? ARCHETYPES.find((item) => item.id === primaryScore.id)
      : null;
    const secondary = primary && runnerUp.score >= 45 && runnerUp.score >= primaryScore.score * 0.62
      ? ARCHETYPES.find((item) => item.id === runnerUp.id)
      : null;
    const gaps = strategicGaps(picks);

    return {
      identity: {
        primary: primary?.label || null,
        secondary: secondary?.label || null,
      },
      winCondition: primary?.winCondition || null,
      strengths: primary ? [...primary.strengths] : [],
      weaknesses: primary ? [...primary.weaknesses] : [],
      cohesion: {
        score: primaryScore?.score || 0,
        coherent: Boolean(primary),
        gaps: primary ? [] : gaps,
        explanation: primary
          ? null
          : gaps.length
            ? `No hay un plan de partida claro: faltan ${gaps.join(", ")}. Sin estos puntos en común, cuesta coordinar cómo iniciar, proteger o convertir las peleas.`
            : "No hay un arquetipo dominante; los atributos de la composición no convergen en un plan común.",
      },
      archetypeScores: scores.map((item) => ({
        ...item,
        selectedAs: item.id === primary?.id ? "primary" : item.id === secondary?.id ? "secondary" : null,
      })),
    };
  }

  return { analyzeComposition };
});
