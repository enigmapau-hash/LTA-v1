#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const XLSX = require("../vendor/xlsx.full.min.js");
const { diagnoseComposition } = require("../src/domain/diagnostic-engine.js");

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

const hybridPlan = diagnoseComposition(frontToBack);
assert.equal(hybridPlan.plan.primaryIdentity, "Front to Back");
assert.equal(hybridPlan.plan.secondaryIdentity, "Teamfight");
assert.equal(hybridPlan.coherence.status, "hybrid");
assert.ok(hybridPlan.coherence.explanation.includes("señales secundarias"));

const dependencyDiagnosis = diagnoseComposition(splitPush);
assert.equal(dependencyDiagnosis.plan.primaryIdentity, "Split Push");
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
assert.match(incoherentDiagnosis.primaryProblem.explanation, /No hay un plan de partida claro/i);

assert.deepEqual(
  diagnoseComposition(frontToBack),
  hybridPlan,
  "El diagnóstico debe ser determinista para la misma composición"
);
assert.equal(diagnoseComposition(dive.slice(0, 4)).status, "not-assessable");
assert.ok(diagnoseComposition(dive.slice(0, 4)).issues.includes("five-picks-required"));

console.log("Diagnostic Engine validado: plan claro, composición híbrida, cohesión, dependencias, robustez y determinismo.");
