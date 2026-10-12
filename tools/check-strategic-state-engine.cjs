#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const XLSX = require("../vendor/xlsx.full.min.js");
const { diagnoseComposition } = require("../src/domain/diagnostic-engine.js");
const { assessConfidence } = require("../src/domain/confidence-engine.js");
const { buildDiagnosticSummary } = require("../src/domain/diagnostic-summary-engine.js");
const { findSecondaryObservation } = require("../src/domain/secondary-observation-engine.js");
const { summarizeStrategicState } = require("../src/domain/strategic-state-engine.js");
const { buildStrategicReport } = require("../src/report/strategic-report.js");

const root = path.resolve(__dirname, "..");
const workbook = XLSX.read(fs.readFileSync(path.join(root, "Draft Pool.xlsx")), { type: "buffer" });
const sheets = { top: "Tabla Top", jungle: "Tabla Jungla", mid: "Tabla Mid", botline: "Tabla Botline", support: "Tabla Support" };

function pick(role, champion) {
  const row = XLSX.utils.sheet_to_json(workbook.Sheets[sheets[role]], { defval: "" })
    .find((item) => item["Campeón"] === champion);
  assert.ok(row, `${champion} debe existir para ${role}`);
  return { role, champion, identity: row["Identidad"], function: row["Función"], tempo: row["Ritmo"], strengths: row["Fortalezas"], weaknesses: row["Debilidades"] };
}

function composition(selection) {
  return Object.entries(selection).map(([role, champion]) => pick(role, champion));
}

function evaluate(picks) {
  const diagnosis = diagnoseComposition(picks);
  const confidence = assessConfidence({ diagnosis }).conclusions.diagnosis;
  const diagnosticSummary = buildDiagnosticSummary({
    diagnosis,
    winCondition: diagnosis.winCondition,
    coherence: diagnosis.winConditionCoherence,
    stability: diagnosis.stability,
    contradiction: diagnosis.contradictions,
    confidence,
  });
  const secondaryObservation = findSecondaryObservation({
    diagnosis,
    winCondition: diagnosis.winCondition,
    coherence: diagnosis.winConditionCoherence,
    contradiction: diagnosis.contradictions,
  });
  const state = summarizeStrategicState({
    diagnosis,
    diagnosticSummary,
    winCondition: diagnosis.winCondition,
    coherence: diagnosis.winConditionCoherence,
    stability: diagnosis.stability,
    contradiction: diagnosis.contradictions,
    confidence,
    secondaryObservation,
  });
  return { diagnosis, diagnosticSummary, confidence, secondaryObservation, state };
}

const clearPicks = composition({ top: "Olaf", jungle: "Zyra", mid: "Heimerdinger", botline: "Lucian", support: "Tahm Kench" });
const clear = evaluate(clearPicks);
assert.deepEqual(clear.state, {
  status: "solid",
  reason: "aligned-and-stable",
});

const hybridPicks = composition({ top: "Ornn", jungle: "Sejuani", mid: "Orianna", botline: "Jinx", support: "Lulu" });
const hybrid = evaluate(hybridPicks);
assert.equal(hybrid.state.status, "risk");
assert.equal(hybrid.state.reason, "complementary-secondary-path");
assert.ok(hybrid.secondaryObservation, "El híbrido tiene una observación complementaria reconocida");

const incoherentPicks = [pick("top", "Fiora"), pick("jungle", "Elise"), pick("mid", "Xerath"), pick("botline", "Draven"), pick("support", "Lulu")];
const incoherent = evaluate(incoherentPicks);
assert.deepEqual(incoherent.state, {
  status: "fragile",
  reason: "no-common-plan",
});
assert.equal(incoherent.secondaryObservation, null);

const contradictory = evaluate(composition({ top: "Ambessa", jungle: "Evelynn", mid: "Ziggs", botline: "Tristana", support: "Heimerdinger" }));
assert.deepEqual(contradictory.state, {
  status: "fragile",
  reason: "incompatible-plans",
});

const fragileDependency = summarizeStrategicState({
  diagnosis: {
    status: "assessed",
    plan: { clear: true, primaryIdentity: "Front to Back" },
    coherence: { status: "coherent" },
  },
  diagnosticSummary: { status: "fragile" },
  winCondition: { status: "assessed" },
  coherence: { status: "fully-coherent", relation: "aligned" },
  stability: { status: "fragile" },
  contradiction: { status: "coherent" },
  confidence: { level: "baja" },
});
assert.deepEqual(fragileDependency, { status: "fragile", reason: "key-pick-dependency" });

const unavailable = summarizeStrategicState({ diagnosis: { status: "not-assessable" } });
assert.equal(unavailable.status, "not-assessed");

assert.deepEqual(evaluate(clearPicks).state, clear.state, "La síntesis debe ser determinista");
assert.equal(Object.hasOwn(clear.state, "closing"), false, "La capa de estado no conserva texto duplicado del cierre");

const visibleReport = buildStrategicReport({ diagnosis: hybrid.diagnosis });
assert.deepEqual(visibleReport.sections.map((section) => section.id), ["diagnosis", "correction", "protection"]);
assert.equal(visibleReport.strategicState.status, "risk");
assert.deepEqual(buildStrategicReport({ diagnosis: hybrid.diagnosis }).strategicState, visibleReport.strategicState);

console.log("Strategic State Engine validado: clasificación global, motivos internos y determinismo.");
