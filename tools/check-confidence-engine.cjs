#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const XLSX = require("../vendor/xlsx.full.min.js");
const { diagnoseComposition } = require("../src/domain/diagnostic-engine.js");
const { proposeCorrections } = require("../src/domain/correction-engine.js");
const { protectComposition } = require("../src/domain/protection-engine.js");
const { assessConfidence } = require("../src/domain/confidence-engine.js");

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
  const row = rows(role).find((item) => item["Campeón"] === champion);
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

function evaluate(picks) {
  const diagnosis = diagnoseComposition(picks);
  const correction = proposeCorrections({ picks, diagnosis, candidatesByRole });
  const protection = protectComposition({ diagnosis, correction });
  return { diagnosis, correction, protection, confidence: assessConfidence({ diagnosis, correction, protection }) };
}

const clearPlan = composition({ top: "Olaf", jungle: "Zyra", mid: "Heimerdinger", botline: "Lucian", support: "Tahm Kench" });
const hybridPlan = composition({ top: "Ornn", jungle: "Sejuani", mid: "Orianna", botline: "Jinx", support: "Lulu" });
const incoherentPlan = [
  pick("top", "Fiora"),
  pick("jungle", "Elise"),
  pick("mid", "Xerath"),
  pick("botline", "Draven"),
  pick("support", "Lulu"),
];

const cases = [
  { name: "plan claro", picks: clearPlan, expected: ["alta", "alta", "alta"] },
  { name: "plan híbrido", picks: hybridPlan, expected: ["media", "media", "media"] },
  { name: "plan incoherente", picks: incoherentPlan, expected: ["baja", "baja", "baja"] },
];

for (const testCase of cases) {
  const result = evaluate(testCase.picks);
  const conclusions = result.confidence.conclusions;
  assert.deepEqual(
    [conclusions.diagnosis.level, conclusions.correction.level, conclusions.protection.level],
    testCase.expected,
    `La confianza debe corresponder a ${testCase.name}`
  );
  assert.ok(Object.values(conclusions).every((item) => item.rationale && item.rationale.split(/\s+/).length <= 18));
  assert.deepEqual(assessConfidence(result), result.confidence, `La confianza debe ser determinista para ${testCase.name}`);
  const serialized = JSON.stringify(result.confidence);
  assert.doesNotMatch(serialized, /candidate|candidates|score|impact|probability|probabilidad|%/i, "La salida no expone listas, puntuaciones ni probabilidades");
}

const unavailable = assessConfidence({ diagnosis: { status: "not-assessable" } });
assert.equal(unavailable.status, "not-assessable");
assert.deepEqual(
  [unavailable.conclusions.diagnosis.level, unavailable.conclusions.correction.level, unavailable.conclusions.protection.level],
  ["baja", "baja", "baja"]
);

console.log("Confidence Engine validado: confianza alta, media y baja para planes claros, híbridos e incoherentes; determinismo y salida interna concisa.");
