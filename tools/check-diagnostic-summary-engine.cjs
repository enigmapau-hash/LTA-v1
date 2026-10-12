#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const XLSX = require("../vendor/xlsx.full.min.js");
const { diagnoseComposition } = require("../src/domain/diagnostic-engine.js");
const { assessConfidence } = require("../src/domain/confidence-engine.js");
const { buildDiagnosticSummary } = require("../src/domain/diagnostic-summary-engine.js");

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

function summaryFor(picks) {
  const diagnosis = diagnoseComposition(picks);
  const confidence = assessConfidence({ diagnosis }).conclusions.diagnosis;
  return buildDiagnosticSummary({
    diagnosis,
    confidence,
  });
}

const clear = summaryFor(composition({ top: "Olaf", jungle: "Zyra", mid: "Heimerdinger", botline: "Lucian", support: "Tahm Kench" }));
assert.deepEqual(clear, {
  status: "solid",
  summary: "El plan mantiene una dirección común incluso si falta una pieza.",
});

const hybrid = summaryFor(composition({ top: "Ornn", jungle: "Sejuani", mid: "Orianna", botline: "Jinx", support: "Lulu" }));
assert.equal(hybrid.status, "risk");
assert.match(hybrid.summary, /no está del todo alineado/);

const incoherent = summaryFor([
  pick("top", "Fiora"), pick("jungle", "Elise"), pick("mid", "Xerath"), pick("botline", "Draven"), pick("support", "Lulu"),
]);
assert.deepEqual(incoherent, {
  status: "risk",
  summary: "Por ahora, los atributos no apuntan a un plan común.",
});

const contradictory = summaryFor(composition({ top: "Ambessa", jungle: "Evelynn", mid: "Ziggs", botline: "Tristana", support: "Heimerdinger" }));
assert.equal(contradictory.status, "fragile");
assert.match(contradictory.summary, /parece frágil porque sus planes compiten/);

for (const result of [clear, hybrid, incoherent, contradictory]) {
  assert.ok(result.summary.split(/\s+/).length <= 13, "El resumen debe ser breve");
  assert.doesNotMatch(result.summary, /%|puntuaci[oó]n|probabilidad|candidatos|\bTop:|\bJungla:/i);
}
assert.deepEqual(summaryFor(composition({ top: "Olaf", jungle: "Zyra", mid: "Heimerdinger", botline: "Lucian", support: "Tahm Kench" })), clear, "El resumen debe ser determinista");
assert.deepEqual(buildDiagnosticSummary({ diagnosis: { status: "not-assessable" } }), {
  status: "not-assessed",
  summary: "Hace falta una composición completa para valorar su solidez.",
});

console.log("Diagnostic Summary Engine validado: estados sólido, riesgo y frágil; brevedad y determinismo.");
