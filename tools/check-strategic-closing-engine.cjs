#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const XLSX = require("../vendor/xlsx.full.min.js");
const { diagnoseComposition } = require("../src/domain/diagnostic-engine.js");
const { buildStrategicReport } = require("../src/report/strategic-report.js");
const { buildStrategicClosing } = require("../src/domain/strategic-closing-engine.js");

const root = path.resolve(__dirname, "..");
const workbook = XLSX.read(fs.readFileSync(path.join(root, "Draft Pool.xlsx")), { type: "buffer" });
const sheets = { top: "Tabla Top", jungle: "Tabla Jungla", mid: "Tabla Mid", botline: "Tabla Botline", support: "Tabla Support" };

function composition(selection) {
  return Object.entries(selection).map(([role, champion]) => {
    const row = XLSX.utils.sheet_to_json(workbook.Sheets[sheets[role]], { defval: "" })
      .find((item) => item["Campeón"] === champion);
    assert.ok(row, `${champion} debe existir para ${role}`);
    return { role, champion, identity: row["Identidad"], function: row["Función"], tempo: row["Ritmo"], strengths: row["Fortalezas"], weaknesses: row["Debilidades"] };
  });
}

function reportFor(picks) {
  const diagnosis = diagnoseComposition(picks);
  return { diagnosis, report: buildStrategicReport({ diagnosis }) };
}

const clear = reportFor(composition({ top: "Olaf", jungle: "Zyra", mid: "Heimerdinger", botline: "Lucian", support: "Tahm Kench" }));
assert.equal(clear.report.strategicState.status, "solid");
assert.equal(clear.report.closing, undefined, "El cierre no aporta valor si el plan ya es sólido");

const hybrid = reportFor(composition({ top: "Ornn", jungle: "Sejuani", mid: "Orianna", botline: "Jinx", support: "Lulu" }));
assert.equal(hybrid.report.strategicState.status, "risk");
assert.equal(hybrid.report.closing, undefined, "El matiz híbrido ya aporta el cierre necesario");

const incoherentPicks = composition({ top: "Fiora", jungle: "Elise", mid: "Xerath", botline: "Draven", support: "Lulu" });
const incoherent = reportFor(incoherentPicks);
assert.equal(incoherent.report.strategicState.status, "fragile");
assert.equal(incoherent.report.closing, "Antes de jugar, definid un enfoque común.");

const contradictory = reportFor(composition({ top: "Ambessa", jungle: "Evelynn", mid: "Ziggs", botline: "Tristana", support: "Heimerdinger" }));
assert.equal(contradictory.report.strategicState.status, "fragile");
assert.equal(contradictory.report.closing, "Elegid qué identidad debe guiar las peleas.");

const stabilityClosing = buildStrategicClosing({ strategicState: { status: "fragile", reason: "key-pick-dependency" } });
assert.equal(stabilityClosing, "Preparad una alternativa si falta la pieza que sostiene el plan.");
assert.equal(buildStrategicClosing({ strategicState: { status: "risk", reason: "key-pick-dependency" } }), null);
assert.equal(buildStrategicClosing({ strategicState: { status: "not-assessed", reason: "key-pick-dependency" } }), null);
assert.equal(buildStrategicClosing({ strategicState: { status: "fragile" } }), null, "Sin motivo clasificado no inventa un cierre");

for (const closing of [incoherent.report.closing, contradictory.report.closing, stabilityClosing]) {
  assert.ok(closing.split(/\s+/).length <= 11, "El cierre debe ser breve");
  assert.doesNotMatch(closing, /%|puntuaci[oó]n|probabilidad|candidatos|\bTop:|\bJungla:/i);
}
assert.notEqual(incoherent.report.closing, incoherent.report.sections[0].explanation, "El cierre aporta una acción y no repite el diagnóstico");
assert.notEqual(hybrid.report.closing, hybrid.report.sections[0].explanation, "No repite el resumen ni el matiz secundario");
assert.deepEqual(reportFor(incoherentPicks).report.closing, incoherent.report.closing);
assert.deepEqual(incoherent.report.sections.map((section) => section.id), ["diagnosis", "correction", "protection"], "El cierre no crea otra sección de informe");

console.log("Strategic Closing Engine validado: cierre visible solo en estados frágiles cuando aporta una acción distinta.");
