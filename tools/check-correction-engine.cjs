#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const XLSX = require("../vendor/xlsx.full.min.js");
const { diagnoseComposition } = require("../src/domain/diagnostic-engine.js");
const { proposeCorrections } = require("../src/domain/correction-engine.js");

const root = path.resolve(__dirname, "..");
const workbook = XLSX.read(fs.readFileSync(path.join(root, "Draft Pool.xlsx")), { type: "buffer" });
const roleSheets = {
  top: "Tabla Top",
  jungle: "Tabla Jungla",
  mid: "Tabla Mid",
  botline: "Tabla Botline",
  support: "Tabla Support",
};

function rows(role) {
  return XLSX.utils.sheet_to_json(workbook.Sheets[roleSheets[role]], { defval: "" });
}

function pick(role, champion) {
  let row = rows(role).find((item) => item["Campeón"] === champion);
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

function composition(selection) {
  return Object.entries(selection).map(([role, champion]) => pick(role, champion));
}

const candidatesByRole = Object.fromEntries(Object.keys(roleSheets).map((role) => [
  role,
  rows(role).map((row) => ({
    champion: row["Campeón"],
    identity: row["Identidad"],
    function: row["Función"],
    tempo: row["Ritmo"],
    strengths: row["Fortalezas"],
    weaknesses: row["Debilidades"],
  })),
]));

const frontToBack = composition({
  top: "Ornn", jungle: "Sejuani", mid: "Orianna", botline: "Jinx", support: "Lulu",
});
const dive = composition({
  top: "Camille", jungle: "Vi", mid: "Ahri", botline: "Kai'Sa", support: "Rakan",
});
const incoherent = [
  pick("top", "Fiora"),
  pick("jungle", "Elise"),
  pick("mid", "Xerath"),
  pick("botline", "Draven"),
  pick("support", "Lulu"),
];

function verifyCandidates(result, selected) {
  assert.ok(result.improvements.length >= 1 && result.improvements.length <= 2);
  for (const improvement of result.improvements) {
    assert.ok(improvement.explanation);
    assert.ok(improvement.candidates.length >= 2 && improvement.candidates.length <= 3);
    assert.equal(new Set(improvement.candidates.map((candidate) => candidate.champion)).size, improvement.candidates.length);
    assert.ok(improvement.candidates.every((candidate) => candidate.contribution.length > 0));
    assert.ok(improvement.candidates.every((candidate) => !selected.has(candidate.champion)));
  }
}

const clearDiagnosis = diagnoseComposition(dive);
const clearCorrection = proposeCorrections({ picks: dive, diagnosis: clearDiagnosis, candidatesByRole });
assert.equal(clearCorrection.status, "proposed");
assert.equal(clearCorrection.limitingFactor, "Pierde valor si falla la iniciación");
assert.equal(clearCorrection.improvements[0].profile.id, "engage");
verifyCandidates(clearCorrection, new Set(dive.map((item) => item.champion)));

const hybridDiagnosis = diagnoseComposition(frontToBack);
assert.equal(hybridDiagnosis.coherence.status, "hybrid");
const hybridCorrection = proposeCorrections({ picks: frontToBack, diagnosis: hybridDiagnosis, candidatesByRole });
assert.equal(hybridCorrection.improvements[0].profile.id, "side-lane");
assert.equal(hybridCorrection.improvements[0].limitingFactor, "Poca presión lateral");
verifyCandidates(hybridCorrection, new Set(frontToBack.map((item) => item.champion)));

const incoherentDiagnosis = diagnoseComposition(incoherent);
const incoherentCorrection = proposeCorrections({ picks: incoherent, diagnosis: incoherentDiagnosis, candidatesByRole });
assert.equal(incoherentCorrection.limitingFactor, "iniciación compartida");
assert.equal(incoherentCorrection.improvements[0].profile.id, "engage");
assert.ok(incoherentCorrection.improvements.some((item) => item.profile.id === "frontline"));
verifyCandidates(incoherentCorrection, new Set(incoherent.map((item) => item.champion)));

const repeated = proposeCorrections({ picks: dive, diagnosis: clearDiagnosis, candidatesByRole });
assert.deepEqual(repeated, clearCorrection, "La corrección debe ser determinista y estable");

const noCandidates = proposeCorrections({ picks: dive, diagnosis: clearDiagnosis, candidatesByRole: {} });
assert.equal(noCandidates.status, "no-supported-correction");
assert.equal(noCandidates.improvements.length, 0);

const incomplete = proposeCorrections({ picks: dive.slice(0, 4), diagnosis: { status: "not-assessable" }, candidatesByRole });
assert.equal(incomplete.status, "not-assessable");

console.log("Correction Engine validado: plan claro, híbrido, incoherente, perfiles, candidatos y determinismo.");
