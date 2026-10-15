#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const XLSX = require("../vendor/xlsx.full.min.js");
const { diagnoseComposition } = require("../src/domain/diagnostic-engine.js");
const { proposeCorrections } = require("../src/domain/correction-engine.js");
const { protectComposition } = require("../src/domain/protection-engine.js");
const { explainDiagnosis, explainCorrection, explainProtection } = require("../src/report/strategic-explanations.js");
const { buildStrategicReport } = require("../src/report/strategic-report.js");
const { buildDiagnosticSummary } = require("../src/domain/diagnostic-summary-engine.js");

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
  assert.ok(report.confidence?.conclusions?.diagnosis, "El builder conserva la confianza interna por conclusión");
  assert.ok(report.confidence?.conclusions?.correction, "La confianza interna cubre la corrección");
  assert.ok(report.confidence?.conclusions?.protection, "La confianza interna cubre la protección");
  assert.deepEqual(report.sections.map((section) => section.id), ["diagnosis", "correction", "protection"]);
  assert.deepEqual(report.sections.map((section) => section.answer), answers);
  assert.ok(report.sections.every((section) => section.title && section.explanation));
  assert.ok(report.sections.every((section) => section.explanation.split(/\s+/).length <= 22), "Cada explicación debe ser breve");
  const visibleText = report.sections.flatMap((section) => [section.title, section.answer, section.explanation, section.action || ""]).join(" ");
  assert.ok(visibleText.split(/\s+/).length <= 110, "El resumen debe seguir siendo breve y escaneable con la condición de victoria explícita");
  assert.doesNotMatch(visibleText, /Afinidad|candidatos|\bTop:|\bJungla:/i, "No expone puntuaciones ni listas internas");
  assert.equal(JSON.stringify(report).includes("candidates"), false, "No filtra las listas internas de candidatos");
  assert.equal(JSON.stringify(report).includes("impact"), false, "No expone puntuaciones internas de impacto");
}

function visibleSections(report) {
  return report.sections.map(({ title, answer, explanation, action }) => [title, answer, explanation, action || null]);
}

const clearPlan = composition({ top: "Olaf", jungle: "Zyra", mid: "Heimerdinger", botline: "Lucian", support: "Tahm Kench" });
const clearReport = reportFor(clearPlan);
assert.equal(diagnoseComposition(clearPlan).coherence.status, "coherent");
assert.deepEqual(Object.values(clearReport.confidence.conclusions).map((item) => item.level), ["alta", "alta", "alta"]);
assertReport(clearReport, [
  "Plan principal: Front to Back · Cómo ganar: Proteger al ADC y forzar teamfights.",
  "Reforzar presión lateral",
  "Proteger el plan frente a Split Push",
]);
assert.match(clearReport.sections[0].explanation, /conserva su identidad pese a perder respaldo/i);
assert.match(clearReport.sections[1].explanation, /prioridad responde a poca presión lateral/i);
assert.match(clearReport.sections[2].action, /línea lateral/i);
assert.match(clearReport.sections[2].explanation, /amenaza prioritaria porque/i);
assert.deepEqual(visibleSections(clearReport), [
  ["Diagnóstico", "Plan principal: Front to Back · Cómo ganar: Proteger al ADC y forzar teamfights.", "Sin Tahm Kench, el plan conserva su identidad pese a perder respaldo.", null],
  ["Mejora prioritaria", "Reforzar presión lateral", "La prioridad responde a poca presión lateral y preserva la identidad del equipo.", null],
  ["Protección estratégica", "Proteger el plan frente a Split Push", "Es la amenaza prioritaria porque la presión lateral obliga a separarse.", "Asigna una respuesta segura a la línea lateral y conserva al resto del equipo en posición para disputar objetivos."],
], "La cadena de capas conserva exactamente el texto visible para un plan claro");

const hybridPlan = composition({ top: "Ornn", jungle: "Sejuani", mid: "Orianna", botline: "Jinx", support: "Lulu" });
const hybridReport = reportFor(hybridPlan);
assert.deepEqual(Object.values(hybridReport.confidence.conclusions).map((item) => item.level), ["media", "media", "media"]);
assertReport(hybridReport, [
  "Plan probable: Front to Back · Cómo ganar: Proteger al ADC y forzar teamfights.",
  "Orientación: reforzar presión lateral",
  "Conviene proteger el plan frente a Split Push",
]);
assert.match(hybridReport.sections[0].explanation, /no está del todo alineado/i);
assert.match(hybridReport.sections[0].explanation, /Matiz: Teamfight amplía las opciones sin desplazar el plan/i);
assert.match(hybridReport.sections[1].explanation, /poca presión lateral/i);
assert.match(hybridReport.sections[2].explanation, /presión lateral/i);
assert.match(hybridReport.sections[2].action, /^Como orientación,/i);
assert.deepEqual(visibleSections(hybridReport), [
  ["Diagnóstico", "Plan probable: Front to Back · Cómo ganar: Proteger al ADC y forzar teamfights.", "El plan es claro, aunque no está del todo alineado. Matiz: Teamfight amplía las opciones sin desplazar el plan.", null],
  ["Mejora prioritaria", "Orientación: reforzar presión lateral", "La prioridad responde a poca presión lateral y preserva la identidad del equipo.", null],
  ["Protección estratégica", "Conviene proteger el plan frente a Split Push", "Es la amenaza prioritaria porque la presión lateral obliga a separarse.", "Como orientación, asigna una respuesta segura a la línea lateral y conserva al resto del equipo en posición para disputar objetivos."],
], "La cadena de capas conserva exactamente el texto visible para un plan híbrido");

const splitPushPlan = composition({ top: "Fiora", jungle: "Viego", mid: "Twisted Fate", botline: "Ezreal", support: "Braum" });
const splitPushReport = reportFor(splitPushPlan);
assert.deepEqual(Object.values(splitPushReport.confidence.conclusions).map((item) => item.level), ["baja", "baja", "baja"]);
assertReport(splitPushReport, [
  "Lectura provisional: Plan principal: Split Push · Cómo ganar: Crear presión lateral y obligar al rival a responder separado.",
  "Posible mejora: reforzar pick y control del mapa",
  "Protección provisional frente a Teamfight",
]);
assert.match(splitPushReport.sections[0].explanation, /Si falta Fiora o Viego, la composición pierde un plan claro/);

const incoherentPlan = [
  pick("top", "Fiora"),
  pick("jungle", "Elise"),
  pick("mid", "Xerath"),
  pick("botline", "Draven"),
  pick("support", "Lulu"),
];
const contradictoryPlan = composition({
  top: "Ambessa",
  jungle: "Evelynn",
  mid: "Ziggs",
  botline: "Tristana",
  support: "Heimerdinger",
});
const incoherentReport = reportFor(incoherentPlan);
assert.deepEqual(Object.values(incoherentReport.confidence.conclusions).map((item) => item.level), ["baja", "baja", "baja"]);
assertReport(incoherentReport, [
  "Lectura provisional: Sin un plan de partida claro",
  "Posible mejora: reforzar iniciación y seguimiento",
  "Protección provisional frente a Poke",
]);
assert.match(incoherentReport.sections[0].explanation, /no apuntan a un plan común/i);
assert.match(incoherentReport.sections[2].action, /^De forma provisional,/i);
assert.deepEqual(visibleSections(incoherentReport), [
  ["Diagnóstico", "Lectura provisional: Sin un plan de partida claro", "Por ahora, los atributos no apuntan a un plan común.", null],
  ["Mejora prioritaria", "Posible mejora: reforzar iniciación y seguimiento", "La prioridad responde a iniciación compartida y preserva la identidad del equipo.", null],
  ["Protección estratégica", "Protección provisional frente a Poke", "Es la amenaza prioritaria porque el desgaste a distancia puede reducir la vida.", "De forma provisional, evita el desgaste prolongado: avanza con visión y busca una entrada coordinada antes de disputar el objetivo."],
], "La cadena de capas conserva exactamente el texto visible para una composición incoherente");

const contradictoryReport = reportFor(contradictoryPlan);
assert.deepEqual(Object.values(contradictoryReport.confidence.conclusions).map((item) => item.level), ["baja", "baja", "baja"]);
assertReport(contradictoryReport, [
  "Lectura provisional: Plan principal: Poke · Cómo ganar: Desgastar antes de pelear y evitar engages directos.",
  contradictoryReport.sections[1].answer,
  contradictoryReport.sections[2].answer,
]);
assert.match(contradictoryReport.sections[0].explanation, /parece frágil porque sus planes compiten/i);
assert.match(contradictoryReport.sections[0].answer, /Lectura provisional/);

assert.match(explainDiagnosis(diagnoseComposition(clearPlan)), /Concreta cómo ganar con Front to Back/i);
assert.equal(
  clearReport.sections[0].explanation,
  buildDiagnosticSummary({
    diagnosis: diagnoseComposition(clearPlan),
    confidence: clearReport.confidence.conclusions.diagnosis,
  }).summary,
  "El informe reutiliza el resumen compacto en el bloque de diagnóstico existente"
);
assert.equal(explainCorrection(proposeCorrections({ picks: clearPlan, diagnosis: diagnoseComposition(clearPlan), candidatesByRole })), clearReport.sections[1].explanation);
assert.equal(explainProtection(protectComposition({ diagnosis: diagnoseComposition(clearPlan) })), clearReport.sections[2].explanation);
for (const report of [clearReport, hybridReport, incoherentReport, contradictoryReport]) {
  const explanations = report.sections.map((section) => section.explanation);
  assert.equal(new Set(explanations).size, explanations.length, "Las explicaciones deben aportar razones distintas");
  assert.doesNotMatch(explanations.join(" "), /candidatos|Afinidad|impacto|puntuación|Top:|Jungla:/i, "No expone listas ni datos internos");
}

assert.deepEqual(reportFor(clearPlan), clearReport, "El informe debe ser determinista");
const unavailable = buildStrategicReport({ diagnosis: { status: "not-assessable" } });
assert.equal(unavailable.status, "not-assessable");
assert.deepEqual(unavailable.sections.map((section) => section.id), ["diagnosis", "correction", "protection"]);

console.log("Informe estratégico v2 validado: tono adaptado a la confianza, estructura y orden conservados.");
