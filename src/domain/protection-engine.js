(function (root, factory) {
  const engine = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = engine;
  } else {
    root.LTAProtectionEngine = Object.freeze(engine);
  }
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const THREATS = [
    {
      id: "dive",
      label: "Dive",
      why: "Una entrada directa puede alcanzar la backline y castigar la falta de frontline o protección.",
      protection: "Mantén recursos de peel junto a los carries y evita separarlos antes de que el rival muestre su entrada.",
    },
    {
      id: "poke",
      label: "Poke",
      why: "El desgaste a distancia puede reducir la vida y los recursos antes de que la composición encuentre una iniciación favorable.",
      protection: "Evita el desgaste prolongado: avanza con visión y busca una entrada coordinada antes de disputar el objetivo.",
    },
    {
      id: "pick",
      label: "Pick",
      why: "Las cazadas pueden castigar rotaciones aisladas y romper la coordinación necesaria para ejecutar el plan.",
      protection: "Agrupa las rotaciones importantes y asegura visión antes de cruzar zonas sin información.",
    },
    {
      id: "split-push",
      label: "Split Push",
      why: "La presión lateral obliga a separarse y puede alejar al equipo de su condición principal de pelea.",
      protection: "Asigna una respuesta segura a la línea lateral y conserva al resto del equipo en posición para disputar objetivos.",
    },
    {
      id: "teamfight",
      label: "Teamfight",
      why: "Una iniciación coordinada puede forzar peleas prolongadas, incluso si la composición prefiere evitarlas.",
      protection: "No agrupes sin visión ni ventanas de respuesta; conserva espacio para cortar o responder a la iniciación.",
    },
    {
      id: "front-to-back",
      label: "Front to Back",
      why: "Una frontline resistente puede absorber cazadas o burst y exponer la falta de daño sostenido.",
      protection: "No gastes todas las herramientas sobre la frontline; espera una ventana para alcanzar a sus carries.",
    },
    {
      id: "early-game",
      label: "Early Game",
      why: "La presión temprana puede castigar una composición que necesita tiempo para llegar a sus picos de poder.",
      protection: "Reduce los riesgos en línea y protege las primeras rotaciones hasta que el equipo alcance sus picos.",
    },
    {
      id: "scaling",
      label: "Escalado",
      why: "Si la partida se alarga, el rival puede superar una composición cuyo valor depende de cerrar antes.",
      protection: "Convierte pronto las ventajas en objetivos y evita intercambios sin progreso hacia el cierre.",
    },
  ];

  const PLAN_THREATS = {
    "front-to-back": ["split-push", "dive"],
    dive: ["poke", "teamfight"],
    pick: ["front-to-back", "split-push"],
    poke: ["dive", "teamfight"],
    "split-push": ["teamfight", "pick"],
    teamfight: ["poke", "split-push"],
    scaling: ["early-game", "pick"],
    "early-game": ["scaling", "teamfight"],
  };

  const FACTOR_THREATS = [
    { terms: ["iniciación compartida", "iniciacion compartida", "falla la iniciación", "falla la iniciacion", "iniciación coordinada", "iniciacion coordinada"], threat: "poke" },
    { terms: ["frontline"], threat: "dive" },
    { terms: ["peel", "protección para los carries", "proteccion para los carries"], threat: "dive" },
    { terms: ["daño sostenido", "dano sostenido"], threat: "front-to-back" },
    { terms: ["presión lateral", "presion lateral", "side lane"], threat: "split-push" },
    { terms: ["engages directos", "engage directo"], threat: "dive" },
    { terms: ["teamfights prolongadas", "teamfight prolongada"], threat: "teamfight" },
    { terms: ["early vulnerable", "early débil", "early debil"], threat: "early-game" },
    { terms: ["partida se alarga", "pierde valor si la partida"], threat: "scaling" },
  ];

  const CORRECTION_THREATS = {
    engage: "poke",
    frontline: "dive",
    "sustained-damage": "front-to-back",
    "side-lane": "split-push",
    peel: "dive",
    pick: "split-push",
    "early-pressure": "early-game",
    scaling: "early-game",
  };

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function threatById(id) {
    return THREATS.find((threat) => threat.id === id) || null;
  }

  function addThreat(scores, id, weight, source) {
    const threat = threatById(id);
    if (!threat) return;
    const current = scores.get(id) || {
      threat,
      score: 0,
      sources: [],
    };
    current.score += weight;
    if (source && !current.sources.includes(source)) current.sources.push(source);
    scores.set(id, current);
  }

  function addPlanThreats(scores, identity, weight) {
    const key = normalize(identity).replace(/ /g, "-");
    const candidates = PLAN_THREATS[key] || [];
    candidates.forEach((id, index) => {
      addThreat(scores, id, weight - index, `plan:${identity}`);
    });
  }

  function factorsFrom(diagnosis) {
    const evidence = Array.isArray(diagnosis?.primaryProblem?.evidence)
      ? diagnosis.primaryProblem.evidence
      : [];
    const gaps = Array.isArray(diagnosis?.coherence?.gaps) ? diagnosis.coherence.gaps : [];
    return [...new Set([...evidence, ...gaps].map((item) => String(item || "").trim()).filter(Boolean))];
  }

  function correctionProfiles(correction) {
    return (Array.isArray(correction?.improvements) ? correction.improvements : [])
      .map((item) => item?.profile?.id)
      .filter(Boolean);
  }

  function buildThreats(diagnosis, correction) {
    const scores = new Map();
    const primaryIdentity = diagnosis?.plan?.primaryIdentity;
    const secondaryIdentity = diagnosis?.plan?.secondaryIdentity;
    if (primaryIdentity) addPlanThreats(scores, primaryIdentity, 4);
    if (secondaryIdentity) addPlanThreats(scores, secondaryIdentity, 2);

    const factors = factorsFrom(diagnosis);
    factors.forEach((factor, index) => {
      const normalized = normalize(factor);
      const rule = FACTOR_THREATS.find((item) => item.terms.some((term) => normalized.includes(normalize(term))));
      if (rule) addThreat(scores, rule.threat, index === 0 ? 6 : 4, `factor:${factor}`);
    });

    correctionProfiles(correction).forEach((profileId, index) => {
      const threatId = CORRECTION_THREATS[profileId];
      if (threatId) addThreat(scores, threatId, index === 0 ? 5 : 3, `correction:${profileId}`);
    });

    return [...scores.values()]
      .sort((a, b) => b.score - a.score || THREATS.findIndex((item) => item.id === a.threat.id) - THREATS.findIndex((item) => item.id === b.threat.id))
      .slice(0, 3)
      .map((item, index) => ({
        id: item.threat.id,
        style: item.threat.label,
        priority: index === 0 ? "principal" : index === 1 ? "alta" : "a vigilar",
        impact: item.score,
        explanation: item.threat.why,
        protection: item.threat.protection,
        evidence: item.sources,
      }));
  }

  function protectComposition(input) {
    const diagnosis = input?.diagnosis;
    if (diagnosis?.status !== "assessed") {
      return {
        status: "not-assessable",
        mostDangerousStyle: null,
        threats: [],
        recommendation: "Se necesita un diagnóstico completo para analizar amenazas estratégicas.",
      };
    }

    const threats = buildThreats(diagnosis, input?.correction);
    if (!threats.length) {
      return {
        status: "no-supported-threat",
        mostDangerousStyle: null,
        threats: [],
        recommendation: "Los datos disponibles no permiten priorizar un estilo rival concreto.",
      };
    }

    const priorityThreat = threats[0];
    return {
      status: "assessed",
      mostDangerousStyle: priorityThreat.style,
      threats,
      recommendation: `${priorityThreat.protection} ${priorityThreat.explanation}`,
    };
  }

  return { protectComposition };
});
