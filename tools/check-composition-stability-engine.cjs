#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const XLSX = require("../vendor/xlsx.full.min.js");
const { diagnoseComposition } = require("../src/domain/diagnostic-engine.js");
const { assessCompositionStability } = require("../src/domain/composition-stability-engine.js");

const root = path.resolve(__dirname, "..");
const workbook = XLSX.read(fs.readFileSync(path.join(root, "Draft Pool.xlsx")), { type: "buffer" });
const roleSheets = {
  top: "Tabla Top",
  jungle: "Tabla Jungla",
  mid: "Tabla Mid",
  botline: "Tabla Botline",
  support: "Tabla Support",
};

function pick(role, champion) {
  const row = XLSX.utils.sheet_to_json(workbook.Sheets[roleSheets[role]], { defval: "" })
    .find((item) => item["Campeón"] === champion);
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

function composition(selection) {
  return Object.entries(selection).map(([role, champion]) => pick(role, champion));
}

const clearPicks = composition({ top: "Olaf", jungle: "Zyra", mid: "Heimerdinger", botline: "Lucian", support: "Tahm Kench" });
const hybridPicks = composition({ top: "Ornn", jungle: "Sejuani", mid: "Orianna", botline: "Jinx", support: "Lulu" });
const incoherentPicks = [
  pick("top", "Fiora"),
  pick("jungle", "Elise"),
  pick("mid", "Xerath"),
  pick("botline", "Draven"),
  pick("support", "Lulu"),
];

const clearDiagnosis = diagnoseComposition(clearPicks);
assert.equal(clearDiagnosis.coherence.status, "coherent");
assert.equal(clearDiagnosis.stability.status, "stable");
assert.equal(clearDiagnosis.stability.removals.length, 5);
assert.ok(clearDiagnosis.stability.removals.every((item) => item.identityAfter === clearDiagnosis.plan.primaryIdentity));

const hybridDiagnosis = diagnoseComposition(hybridPicks);
assert.equal(hybridDiagnosis.coherence.status, "hybrid");
assert.equal(hybridDiagnosis.stability.removals.length, 5);
assert.equal(new Set(hybridDiagnosis.stability.removals.map((item) => item.champion)).size, 5);
assert.ok(hybridDiagnosis.stability.removals.every((item) => item.explanation && item.criticality));

const incoherentDiagnosis = diagnoseComposition(incoherentPicks);
assert.equal(incoherentDiagnosis.coherence.status, "incoherent");
assert.equal(incoherentDiagnosis.stability.status, "not-assessed");

const diagnosis = {
  status: "assessed",
  plan: { primaryIdentity: "Front to Back" },
};
const removalOutcomes = [
  { role: "top", champion: "Ornn", identityWithout: "Front to Back", scoreLoss: 0 },
  { role: "jungle", champion: "Sejuani", identityWithout: "Teamfight", scoreLoss: 4 },
  { role: "mid", champion: "Orianna", identityWithout: "Front to Back", scoreLoss: 9 },
  { role: "botline", champion: "Jinx", identityWithout: null, scoreLoss: 7 },
  { role: "support", champion: "Lulu", identityWithout: "Front to Back", scoreLoss: 2 },
];
const stability = assessCompositionStability({ diagnosis, removalOutcomes });
assert.equal(stability.status, "fragile");
assert.equal(stability.removals.find((item) => item.champion === "Jinx").impact, "critica");
assert.equal(stability.removals.find((item) => item.champion === "Orianna").criticality, "alta");
assert.equal(stability.removals.find((item) => item.champion === "Sejuani").impact, "moderada");
assert.equal(stability.removals.find((item) => item.champion === "Lulu").criticality, "media");
assert.equal(stability.removals.find((item) => item.champion === "Ornn").impact, "leve");
assert.ok(stability.keyPicks.some((item) => item.champion === "Jinx"));
assert.deepEqual(assessCompositionStability({ diagnosis, removalOutcomes }), stability, "La evaluación debe ser determinista");
assert.ok(stability.explanation.split(/\s+/).length <= 18);
assert.ok(stability.removals.every((item) => item.explanation.split(/\s+/).length <= 18));
assert.doesNotMatch(JSON.stringify(stability), /score|percentage|probability|%/i, "La salida no debe exponer puntuaciones");

const dependent = assessCompositionStability({
  diagnosis,
  removalOutcomes: [
    { role: "top", champion: "Fiora", identityWithout: "Split Push", scoreLoss: 8 },
    { role: "jungle", champion: "Viego", identityWithout: "Front to Back", scoreLoss: 1 },
  ],
});
assert.equal(dependent.status, "dependent");
assert.equal(dependent.removals[0].impact, "moderada");

console.log("Composition Stability Engine validado: estabilidad, dependencia, fragilidad, impacto por pick y determinismo.");
