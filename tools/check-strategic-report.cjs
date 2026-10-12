#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const XLSX = require("../vendor/xlsx.full.min.js");
const { diagnoseComposition } = require("../src/domain/diagnostic-engine.js");
const { proposeCorrections } = require("../src/domain/correction-engine.js");
const { protectComposition } = require("../src/domain/protection-engine.js");
const { buildStrategicReport } = require("../src/report/strategic-report.js");

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

function reportFor(picks) {
  const diagnosis = diagnoseComposition(picks);
  const correction = proposeCorrections({ picks, diagnosis, candidatesByRole });
  const protection = protectComposition({ diagnosis, correction });
  return buildStrategicReport({ diagnosis, correction, protection });
}

function assertReport(report, answers) {
  assert.equal(report.status, "assessed");
  assert.deepEqual(report.sections.map((section) => section.id), ["diagnosis", "correction", "protection"]);
  assert.deepEqual(report.sections.map((section) => section.answer), answers);
  assert.ok(report.sections.every((section) => section.title && section.explanation));
  const visibleText = report.sections.flatMap((section) => [section.title, section.answer, section.explanation, section.action || ""]).join(" ");
  assert.ok(visibleText.split(/\s+/).length <= 90, "El resumen debe ser breve y escaneable");
  assert.doesNotMatch(visibleText, /Afinidad|candidatos|\bTop:|\bJungla:/i, "No expone puntuaciones ni listas internas");
  assert.equal(JSON.stringify(report).includes("candidates"), false, "No filtra las listas internas de candidatos");
  assert.equal(JSON.stringify(report).includes("impact"), false, "No expone puntuaciones internas de impacto");
}

const clearPlan = composition({ top: "Olaf", jungle: "Zyra", mid: "Heimerdinger", botline: "Lucian", support: "Tahm Kench" });
const clearReport = reportFor(clearPlan);
assert.equal(diagnoseComposition(clearPlan).coherence.status, "coherent");
assertReport(clearReport, [
  "Plan principal: Front to Back",
  "Reforzar presión lateral",
  "Proteger el plan frente a Split Push",
]);
assert.match(clearReport.sections[0].explanation, /convergen en este plan/i);
assert.match(clearReport.sections[1].explanation, /Poca presión lateral/i);
assert.match(clearReport.sections[2].action, /línea lateral/i);

const hybridPlan = composition({ top: "Ornn", jungle: "Sejuani", mid: "Orianna", botline: "Jinx", support: "Lulu" });
const hybridReport = reportFor(hybridPlan);
assertReport(hybridReport, [
  "Plan principal: Front to Back",
  "Reforzar presión lateral",
  "Proteger el plan frente a Split Push",
]);
assert.match(hybridReport.sections[0].explanation, /señales de Teamfight/i);
assert.match(hybridReport.sections[1].explanation, /Poca presión lateral/i);
assert.match(hybridReport.sections[2].explanation, /presión lateral/i);

const splitPushPlan = composition({ top: "Fiora", jungle: "Viego", mid: "Twisted Fate", botline: "Ezreal", support: "Braum" });
const splitPushReport = reportFor(splitPushPlan);
assertReport(splitPushReport, [
  "Plan principal: Split Push",
  "Reforzar pick y control del mapa",
  "Proteger el plan frente a Teamfight",
]);

const incoherentPlan = [
  pick("top", "Fiora"),
  pick("jungle", "Elise"),
  pick("mid", "Xerath"),
  pick("botline", "Draven"),
  pick("support", "Lulu"),
];
const incoherentReport = reportFor(incoherentPlan);
assertReport(incoherentReport, [
  "Sin un plan de partida claro",
  "Reforzar iniciación y seguimiento",
  "Proteger el plan frente a Poke",
]);
assert.match(incoherentReport.sections[0].explanation, /faltan iniciación compartida, frontline/i);

assert.deepEqual(reportFor(clearPlan), clearReport, "El informe debe ser determinista");
const unavailable = buildStrategicReport({ diagnosis: { status: "not-assessable" } });
assert.equal(unavailable.status, "not-assessable");
assert.deepEqual(unavailable.sections.map((section) => section.id), ["diagnosis", "correction", "protection"]);

console.log("Informe estratégico v2 validado: diagnóstico, corrección y protección breves, ordenados y deterministas.");
