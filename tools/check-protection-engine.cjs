#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const XLSX = require("../vendor/xlsx.full.min.js");
const { diagnoseComposition } = require("../src/domain/diagnostic-engine.js");
const { proposeCorrections } = require("../src/domain/correction-engine.js");
const { protectComposition } = require("../src/domain/protection-engine.js");

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

const dive = composition({ top: "Camille", jungle: "Vi", mid: "Ahri", botline: "Kai'Sa", support: "Rakan" });
const frontToBack = composition({ top: "Ornn", jungle: "Sejuani", mid: "Orianna", botline: "Jinx", support: "Lulu" });
const incoherent = [
  pick("top", "Fiora"),
  pick("jungle", "Elise"),
  pick("mid", "Xerath"),
  pick("botline", "Draven"),
  pick("support", "Lulu"),
];

function evaluate(picks) {
  const diagnosis = diagnoseComposition(picks);
  const correction = proposeCorrections({ picks, diagnosis, candidatesByRole });
  return { diagnosis, correction, protection: protectComposition({ diagnosis, correction }) };
}

function verify(protection, expectedThreats) {
  assert.equal(protection.status, "assessed");
  assert.ok(protection.threats.length >= 2 && protection.threats.length <= 3);
  assert.equal(protection.mostDangerousStyle, protection.threats[0].style);
  assert.deepEqual(protection.threats.slice(0, expectedThreats.length).map((item) => item.id), expectedThreats);
  assert.ok(protection.recommendation);
  assert.ok(protection.threats.every((item) => item.explanation && item.protection && item.evidence.length));
  assert.deepEqual(protection.threats.map((item) => item.priority), ["principal", "alta", "a vigilar"].slice(0, protection.threats.length));
  assert.ok(protection.threats.every((item, index, items) => index === 0 || items[index - 1].impact >= item.impact));
}

const clear = evaluate(dive);
assert.equal(clear.diagnosis.plan.primaryIdentity, "Dive");
assert.notEqual(clear.diagnosis.coherence.status, "incoherent");
verify(clear.protection, ["poke", "teamfight"]);
assert.match(clear.protection.recommendation, /desgaste|visión/i);

const hybrid = evaluate(frontToBack);
assert.equal(hybrid.diagnosis.coherence.status, "hybrid");
verify(hybrid.protection, ["split-push", "dive", "poke"]);
assert.match(hybrid.protection.threats[0].explanation, /presión lateral/i);

const disjoint = evaluate(incoherent);
assert.equal(disjoint.diagnosis.coherence.status, "incoherent");
verify(disjoint.protection, ["poke", "dive"]);
assert.ok(disjoint.protection.threats[0].evidence.some((item) => item.startsWith("factor:")));

assert.deepEqual(evaluate(dive).protection, clear.protection, "La protección debe ser determinista para una composición y diagnóstico iguales");
const withoutCorrection = protectComposition({ diagnosis: clear.diagnosis });
assert.equal(withoutCorrection.mostDangerousStyle, "Poke", "El diagnóstico debe seguir bastando si aún no hay corrección");
verify(withoutCorrection, ["poke", "teamfight"]);
assert.equal(
  protectComposition({ diagnosis: { status: "not-assessable" } }).status,
  "not-assessable"
);
assert.equal(
  protectComposition({ diagnosis: { status: "assessed", plan: {}, coherence: { gaps: [] }, primaryProblem: { evidence: [] } } }).status,
  "no-supported-threat"
);

console.log("Protection Engine validado: estilos amenazantes, planes claros, híbridos, incoherentes y determinismo.");
