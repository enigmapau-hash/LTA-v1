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

  const GAME_PLANS = {
    "front-to-back": ["Protege al ADC y fuerza peleas coordinadas cuando el equipo pueda aprovechar su DPS sostenido."],
    dive: ["Busca una ventana para entrar sobre la backline rival y coordina el seguimiento del equipo."],
    pick: ["Busca cazadas y convierte cada ventaja numérica en visión u objetivos."],
    poke: ["Desgasta al rival antes de disputar objetivos y evita los engages directos."],
    "split-push": ["Aplica presión en una línea lateral y evita alargar las teamfights."],
    teamfight: ["Agrupa para iniciar de forma coordinada y encadenar las definitivas."],
    scaling: ["Reduce los riesgos en early y juega alrededor de los picos de poder."],
    "early-game": ["Aprovecha la presión inicial para asegurar ventajas y acelerar la partida."],
  };

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

  function scoreArchetype(picks, archetype, expectedTeamSize = picks.length) {
    if (!picks.length) return 0;
    const weightedCoverage = archetype.signals.reduce((sum, signal) => {
      const contributors = picks.filter((pick) => matchesSignal(pick, signal)).length;
      const coverage = contributors >= 2 ? 1 : contributors === 1 ? 0.65 : 0;
      return sum + coverage * signal.weight;
    }, 0);
    const signalCoverage = weightedCoverage / archetype.signals.reduce((sum, signal) => sum + signal.weight, 0);
    const championCoverage = picks.filter((pick) =>
      archetype.signals.some((signal) => matchesSignal(pick, signal))
    ).length / expectedTeamSize;
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

  function rankArchetypes(picks, expectedTeamSize = picks.length) {
    return ARCHETYPES
      .map((archetype) => ({
        id: archetype.id,
        label: archetype.label,
        score: scoreArchetype(picks, archetype, expectedTeamSize),
      }))
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, "es"));
  }

  function selectIdentities(scores) {
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
    return { primaryScore, primary, secondary };
  }

  function assessPlanSupport(picks, primary, primaryScore) {
    const isComplete = picks.length === 5 && picks.every((pick) => pick.champion && pick.champion !== "—");
    if (!primary || !isComplete) return null;

    const archetype = ARCHETYPES.find((item) => item.id === primary.id);
    const counterfactuals = picks.map((pick, index) => {
      const remaining = picks.filter((_, pickIndex) => pickIndex !== index);
      const remainingScores = rankArchetypes(remaining, picks.length);
      const identityWithout = selectIdentities(remainingScores).primary;
      const scoreWithout = scoreArchetype(remaining, archetype, picks.length);
      const replacementArchetype = identityWithout
        ? ARCHETYPES.find((item) => item.id === identityWithout.id)
        : null;
      return {
        role: String(pick.role || ""),
        champion: String(pick.champion),
        identityWithout: identityWithout?.label || null,
        gamePlanWithout: replacementArchetype ? [...GAME_PLANS[replacementArchetype.id]] : [],
        scoreLoss: primaryScore.score - scoreWithout,
      };
    });
    const greatestScoreLoss = Math.max(0, ...counterfactuals.map((item) => item.scoreLoss));

    return {
      strongestPicks: greatestScoreLoss > 0
        ? counterfactuals.filter((item) => item.scoreLoss === greatestScoreLoss)
        : [],
      identityChanges: counterfactuals
        .filter((item) => item.identityWithout !== primary.label)
        .map(({ role, champion, identityWithout, gamePlanWithout }) => ({ role, champion, identityWithout, gamePlanWithout })),
    };
  }

  function strategicGaps(picks) {
    return STRATEGIC_GAPS.filter((gap) =>
      picks.every((pick) => !matchesSignal(pick, gap))
    ).map((gap) => gap.label);
  }

  function listField(value) {
    if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
    return String(value || "").split(/[,;·]/).map((item) => item.trim()).filter(Boolean);
  }

  function buildReport(picks, primary, secondary, cohesion, strengths, weaknesses, planSupport) {
    const identityLabel = primary?.label || "Sin identidad clara";
    const selectedPicks = picks
      .filter((pick) => pick.champion)
      .map((pick) => ({ role: String(pick.role || ""), champion: String(pick.champion) }));
    const sharedStrengths = new Map();
    for (const pick of picks) {
      for (const label of new Set(listField(pick.strengths))) {
        sharedStrengths.set(label, (sharedStrengths.get(label) || 0) + 1);
      }
    }
    const shared = [...sharedStrengths.entries()]
      .filter(([, count]) => count > 1)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"))
      .slice(0, 3)
      .map(([label]) => label);
    const internalSynergy = cohesion.coherent
      ? shared.length
        ? `La identidad ${identityLabel}${secondary ? ` se combina con ${secondary.label}` : ""} y comparte señales de ${shared.join(", ")}.`
        : `La composición converge en el plan ${identityLabel}${secondary ? `, con señales secundarias de ${secondary.label}` : ""}.`
      : cohesion.explanation;
    const gamePlan = primary ? [...GAME_PLANS[primary.id]] : [];
    const risks = primary ? [...weaknesses] : [...cohesion.gaps];
    const recommendations = primary
      ? [primary.winCondition, ...weaknesses.map((weakness) => `Ten en cuenta: ${weakness.toLowerCase()}.`)]
      : [cohesion.explanation];

    return {
      identity: identityLabel,
      executiveSummary: cohesion.coherent
        ? `Composición ${identityLabel}${secondary ? ` con un componente de ${secondary.label}` : ""}. ${primary.winCondition}`
        : cohesion.explanation,
      winCondition: primary?.winCondition || null,
      strengths: [...strengths],
      weaknesses: [...weaknesses],
      gamePlan,
      risks,
      internalSynergy,
      planSupport,
      recommendations,
      picks: selectedPicks,
      bans: { recommendation: null, explanation: "No hay datos de campeones rivales para recomendar bans." },
    };
  }

  function analyzeComposition(input) {
    const picks = Array.isArray(input) ? input.filter(Boolean) : [];
    const scores = rankArchetypes(picks);
    const { primaryScore, primary, secondary } = selectIdentities(scores);
    const gaps = strategicGaps(picks);

    const strengths = primary ? [...primary.strengths] : [];
    const weaknesses = primary ? [...primary.weaknesses] : [];
    const cohesion = {
        score: primaryScore?.score || 0,
        coherent: Boolean(primary),
        gaps: primary ? [] : gaps,
        explanation: primary
          ? null
          : gaps.length
            ? `No hay un plan de partida claro: faltan ${gaps.join(", ")}. Sin estos puntos en común, cuesta coordinar cómo iniciar, proteger o convertir las peleas.`
            : "No hay un arquetipo dominante; los atributos de la composición no convergen en un plan común.",
      };
    const planSupport = assessPlanSupport(picks, primary, primaryScore);
    return {
      identity: {
        primary: primary?.label || null,
        secondary: secondary?.label || null,
      },
      winCondition: primary?.winCondition || null,
      strengths,
      weaknesses,
      cohesion,
      report: buildReport(picks, primary, secondary, cohesion, strengths, weaknesses, planSupport),
      archetypeScores: scores.map((item) => ({
        ...item,
        selectedAs: item.id === primary?.id ? "primary" : item.id === secondary?.id ? "secondary" : null,
      })),
    };
  }

  function recommendPicks(input, candidatesByRole, limit = 3) {
    const picks = Array.isArray(input) ? input.filter(Boolean) : [];
    const selectedRoles = new Set(picks.map((pick) => String(pick.role || "").toLowerCase()));
    const selectedChampions = new Set(picks.map((pick) => normalize(pick.champion)).filter(Boolean));
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 3;

    return Object.entries(candidatesByRole || {})
      .filter(([role]) => !selectedRoles.has(role.toLowerCase()))
      .map(([role, candidates]) => {
        const ranked = new Map();
        for (const candidate of Array.isArray(candidates) ? candidates : []) {
          const champion = String(candidate?.champion || "").trim();
          const key = normalize(champion);
          if (!key || selectedChampions.has(key) || ranked.has(key)) continue;

          const candidatePick = { ...candidate, role, champion };
          const scores = rankArchetypes([...picks, candidatePick], 5);
          const { primary, primaryScore } = selectIdentities(scores);
          const topScore = scores[0];
          const archetype = primary || ARCHETYPES.find((item) => item.id === topScore?.id);
          ranked.set(key, {
            role,
            champion,
            affinity: primaryScore?.score || topScore?.score || 0,
            identity: primary?.label || null,
            direction: archetype?.label || null,
            coherent: Boolean(primary),
            strengths: listField(candidate.strengths).slice(0, 3),
            gamePlan: archetype ? [...GAME_PLANS[archetype.id]] : [],
          });
        }

        return [role, [...ranked.values()]
          .sort((a, b) => b.affinity - a.affinity || a.champion.localeCompare(b.champion, "es"))
          .slice(0, safeLimit)];
      })
      .filter(([, recommendations]) => recommendations.length)
      .reduce((result, [role, recommendations]) => {
        result[role] = recommendations;
        return result;
      }, {});
  }

  return { analyzeComposition, recommendPicks };
});
