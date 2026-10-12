#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const XLSX = require("../vendor/xlsx.full.min.js");
const { diagnoseComposition } = require("../src/domain/diagnostic-engine.js");
const { assessContradictions } = require("../src/domain/contradiction-engine.js");
const { analyzeComposition } = require("../src/domain/composition-engine.js");

const root = path.resolve(__dirname, "..");
const workbook = XLSX.read(fs.readFileSync(path.join(root, "Draft Pool.xlsx")), { type: "buffer" });
const roleSheets = {
  top: "Tabla Top",
  jungle: "Tabla Jungla",
  mid: "Tabla Mid",
  botline: "Tabla Botline",
  support: "Tabla Support",
};

function roleRows(role) {
  const sheet = workbook.Sheets[roleSheets[role]];
  assert.ok(sheet, `El workbook debe contener la hoja para ${role}`);
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

function pick(role, champion) {
  let row = roleRows(role).find((item) => item["Campeón"] === champion);
  if (!row && champion === "Maokai") {
    row = XLSX.utils.sheet_to_json(workbook.Sheets["Tabla Top"], { defval: "" })
      .find((item) => item["Campeón"] === champion);
  }
  assert.ok(row, `${champion} debe existir para ${role}`);
  return {
    role,
    champion,
    identity: row["Identidad"],
    function: row["Función"],
    tempo: row["Ritmo"],
    strengths: row["Fortalezas"],
    weaknesses: row["Debilidades"],
  };
}

function composition(picks) {
  return Object.entries(picks).map(([role, champion]) => pick(role, champion));
}

const frontToBack = composition({
  top: "Ornn",
  jungle: "Sejuani",
  mid: "Orianna",
  botline: "Jinx",
  support: "Lulu",
});
const dive = composition({
  top: "Camille",
  jungle: "Vi",
  mid: "Ahri",
  botline: "Kai'Sa",
  support: "Rakan",
});
const splitPush = composition({
  top: "Fiora",
  jungle: "Viego",
  mid: "Twisted Fate",
  botline: "Ezreal",
  support: "Braum",
});
const incoherent = [
  pick("top", "Fiora"),
  pick("jungle", "Elise"),
  pick("mid", "Xerath"),
  pick("botline", "Draven"),
  pick("support", "Lulu"),
];
const contradictory = composition({
  top: "Ambessa",
  jungle: "Evelynn",
  mid: "Ziggs",
  botline: "Tristana",
  support: "Heimerdinger",
});
const winConditionReferences = [
  { identity: "Front to Back", picks: frontToBack },
  { identity: "Dive", picks: dive },
  { identity: "Pick", picks: composition({ top: "Gragas", jungle: "Elise", mid: "Ahri", botline: "Jhin", support: "Bard" }) },
  { identity: "Poke", picks: composition({ top: "Jayce", jungle: "Nidalee", mid: "Xerath", botline: "Varus (Letalidad)", support: "Karma" }) },
  { identity: "Split Push", picks: splitPush },
  { identity: "Teamfight", picks: composition({ top: "Malphite", jungle: "Wukong", mid: "Yasuo", botline: "Miss Fortune", support: "Rell" }) },
  { identity: "Escalado", picks: composition({ top: "Sion", jungle: "Maokai", mid: "Azir", botline: "Smolder", support: "Milio" }) },
  { identity: "Early Game", picks: composition({ top: "Renekton", jungle: "Lee Sin", mid: "Pantheon", botline: "Draven", support: "Pyke" }) },
];

const clearPlan = diagnoseComposition(dive);
assert.equal(clearPlan.status, "assessed");
assert.equal(clearPlan.plan.clear, true);
assert.equal(clearPlan.plan.primaryIdentity, "Dive");
assert.ok(["coherent", "hybrid"].includes(clearPlan.coherence.status));
assert.ok(clearPlan.coherence.score > 0);
assert.equal(clearPlan.primaryProblem.type, "identity-risk");
assert.ok(clearPlan.primaryProblem.explanation);
assert.ok(clearPlan.explanation.some((item) => /problema estructural principal/i.test(item)));

const stablePlan = diagnoseComposition(frontToBack);
assert.equal(stablePlan.robustness.status, "stable");
assert.equal(stablePlan.robustness.identityChanges.length, 0);
assert.equal(stablePlan.stability.status, "stable");
assert.equal(stablePlan.stability.removals.length, 5);
assert.ok(stablePlan.stability.removals.every((item) => item.identityAfter === stablePlan.plan.primaryIdentity));

const hybridPlan = diagnoseComposition(frontToBack);
assert.equal(hybridPlan.plan.primaryIdentity, "Front to Back");
assert.equal(hybridPlan.plan.secondaryIdentity, "Teamfight");
assert.equal(hybridPlan.coherence.status, "hybrid");
assert.ok(hybridPlan.coherence.explanation.includes("señales secundarias"));
assert.equal(hybridPlan.contradictions.status, "coherent-hybrid");
assert.match(hybridPlan.contradictions.explanation, /complementan Front to Back/);

const dependencyDiagnosis = diagnoseComposition(splitPush);
assert.equal(dependencyDiagnosis.plan.primaryIdentity, "Split Push");
assert.ok(["dependent", "fragile"].includes(dependencyDiagnosis.stability.status));
assert.equal(dependencyDiagnosis.stability.removals.length, 5);
assert.ok(dependencyDiagnosis.stability.keyPicks.length);
assert.ok(["dependent", "fragile"].includes(dependencyDiagnosis.robustness.status));
assert.ok(dependencyDiagnosis.dependencies.some((item) => item.champion === "Fiora"));
assert.ok(dependencyDiagnosis.dependencies.some((item) => item.champion === "Twisted Fate"));
assert.ok(dependencyDiagnosis.dependencies.every((item) => item.explanation));

const incoherentDiagnosis = diagnoseComposition(incoherent);
assert.equal(incoherentDiagnosis.plan.clear, false);
assert.equal(incoherentDiagnosis.coherence.status, "incoherent");
assert.equal(incoherentDiagnosis.primaryProblem.type, "cohesion-gap");
assert.ok(incoherentDiagnosis.primaryProblem.evidence.length);
assert.equal(incoherentDiagnosis.robustness.status, "not-assessed");
assert.equal(incoherentDiagnosis.stability.status, "not-assessed");
assert.match(incoherentDiagnosis.primaryProblem.explanation, /No hay un plan de partida claro/i);
assert.equal(incoherentDiagnosis.contradictions.status, "incoherent");

const contradictoryDiagnosis = diagnoseComposition(contradictory);
assert.equal(contradictoryDiagnosis.plan.primaryIdentity, "Poke");
assert.equal(contradictoryDiagnosis.plan.secondaryIdentity, "Dive");
assert.equal(contradictoryDiagnosis.contradictions.status, "contradictory");
assert.equal(contradictoryDiagnosis.coherence.status, "contradictory");
assert.equal(contradictoryDiagnosis.primaryProblem.type, "strategic-contradiction");
assert.deepEqual(contradictoryDiagnosis.contradictions.identities, ["Poke", "Dive"]);
assert.ok(contradictoryDiagnosis.contradictions.deviatingPicks.some((item) => item.champion === "Ambessa"));
assert.match(contradictoryDiagnosis.primaryProblem.explanation, /Poke necesita desgastar.*Dive busca entrar.*Ambessa/);
assert.ok(contradictoryDiagnosis.contradictions.explanation.split(/\s+/).length <= 24);
assert.deepEqual(diagnoseComposition(contradictory), contradictoryDiagnosis, "La contradicción debe ser determinista");

for (const reference of winConditionReferences) {
  const diagnosis = diagnoseComposition(reference.picks);
  const existingAnalysis = analyzeComposition(reference.picks);
  assert.equal(diagnosis.plan.primaryIdentity, reference.identity, `${reference.identity}: debe conservarse la identidad reconocida`);
  assert.equal(diagnosis.winCondition.status, "assessed", `${reference.identity}: debe derivar su condición de victoria`);
  assert.equal(diagnosis.winCondition.primary.identity, diagnosis.plan.primaryIdentity);
  assert.equal(diagnosis.winCondition.primary.condition, existingAnalysis.winCondition, `${reference.identity}: reutiliza la condición ya calculada por el análisis`);
  assert.notEqual(diagnosis.winCondition.primary.condition, diagnosis.winCondition.primary.identity, `${reference.identity}: identidad y condición son conceptos distintos`);
  assert.ok(diagnosis.winCondition.primary.explanation.split(/\s+/).length <= 14, `${reference.identity}: explicación breve`);
  assert.deepEqual(diagnoseComposition(reference.picks).winCondition, diagnosis.winCondition, `${reference.identity}: resultado determinista`);
}

assert.equal(hybridPlan.winCondition.primary.identity, "Front to Back");
assert.equal(hybridPlan.winCondition.secondary.identity, "Teamfight");
assert.notEqual(hybridPlan.winCondition.primary.condition, hybridPlan.winCondition.secondary.condition);
assert.equal(hybridPlan.winCondition.secondary.relationship, "complementary");
assert.equal(hybridPlan.winConditionCoherence.status, "partially-coherent");
assert.equal(hybridPlan.winConditionCoherence.secondaryMitigation, "complements-plan");
assert.equal(contradictoryDiagnosis.winCondition.secondary.relationship, "conflicting");
assert.equal(contradictoryDiagnosis.winConditionCoherence.status, "contradictory");
assert.equal(contradictoryDiagnosis.winConditionCoherence.secondaryMitigation, "does-not-mitigate");
assert.equal(diagnoseComposition(dive.slice(0, 4)).winCondition.status, "not-assessed");
assert.equal(diagnoseComposition(dive.slice(0, 4)).winConditionCoherence.status, "not-assessed");

const pureHybrid = assessContradictions({
  diagnosis: {
    status: "assessed",
    plan: { primaryIdentity: "Front to Back", secondaryIdentity: "Teamfight" },
    coherence: { status: "hybrid" },
  },
});
assert.equal(pureHybrid.status, "coherent-hybrid");

const pureConflict = assessContradictions({
  diagnosis: {
    status: "assessed",
    plan: { primaryIdentity: "Poke", secondaryIdentity: "Dive" },
    coherence: { status: "hybrid" },
  },
  picks: [{ role: "top", champion: "Test Pick", identity: "⚔️ Engage" }],
});
assert.equal(pureConflict.status, "contradictory");
assert.ok(pureConflict.deviatingPicks.some((item) => item.champion === "Test Pick"));
assert.deepEqual(assessContradictions({
  diagnosis: {
    status: "assessed",
    plan: { primaryIdentity: "Poke", secondaryIdentity: "Dive" },
    coherence: { status: "hybrid" },
  },
  picks: [{ role: "top", champion: "Test Pick", identity: "⚔️ Engage" }],
}), pureConflict, "La capa de contradicciones debe ser determinista sin volver a analizar la composición");

assert.deepEqual(
  diagnoseComposition(frontToBack),
  hybridPlan,
  "El diagnóstico debe ser determinista para la misma composición"
);
assert.equal(diagnoseComposition(dive.slice(0, 4)).status, "not-assessable");
assert.ok(diagnoseComposition(dive.slice(0, 4)).issues.includes("five-picks-required"));

console.log("Diagnostic Engine validado: condiciones de victoria, híbridos coherentes, contradicciones, cohesión y determinismo.");
