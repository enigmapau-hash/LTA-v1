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
const contradictoryPlan = composition({
  top: "Ambessa",
  jungle: "Evelynn",
  mid: "Ziggs",
  botline: "Tristana",
  support: "Heimerdinger",
});

const cases = [
  { name: "plan claro", picks: clearPlan, expected: ["alta", "alta", "alta"] },
  { name: "plan híbrido", picks: hybridPlan, expected: ["media", "media", "media"] },
  { name: "plan incoherente", picks: incoherentPlan, expected: ["baja", "baja", "baja"] },
  { name: "planes contradictorios", picks: contradictoryPlan, expected: ["baja", "baja", "baja"] },
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

const coherenceAdjusted = evaluate(clearPlan);
const legacyRobustnessConflict = assessConfidence({
  diagnosis: { ...coherenceAdjusted.diagnosis, robustness: { status: "fragile" } },
  correction: coherenceAdjusted.correction,
  protection: coherenceAdjusted.protection,
});
assert.deepEqual(
  legacyRobustnessConflict,
  coherenceAdjusted.confidence,
  "La confianza usa Stability como fuente única y no vuelve a clasificar el campo de robustez derivado"
);
const { stability: _stability, ...legacyDiagnosis } = coherenceAdjusted.diagnosis;
assert.deepEqual(
  assessConfidence({
    diagnosis: legacyDiagnosis,
    correction: coherenceAdjusted.correction,
    protection: coherenceAdjusted.protection,
  }),
  coherenceAdjusted.confidence,
  "Los diagnósticos previos que solo incluyen robustez mantienen compatibilidad"
);

const partialCoherenceDiagnosis = {
  ...coherenceAdjusted.diagnosis,
  winConditionCoherence: {
    status: "partially-coherent",
    secondaryMitigation: "complements-plan",
    explanation: "La condición secundaria complementa el plan, aunque abre una vía adicional.",
  },
};
const partialCoherenceConfidence = assessConfidence({
  diagnosis: partialCoherenceDiagnosis,
  correction: coherenceAdjusted.correction,
  protection: coherenceAdjusted.protection,
});
assert.deepEqual(
  Object.values(partialCoherenceConfidence.conclusions).map((item) => item.level),
  ["media", "media", "media"],
  "Una condición secundaria complementaria limita la confianza alta y modula el tono del informe"
);

const conflictingConditionDiagnosis = {
  ...coherenceAdjusted.diagnosis,
  winConditionCoherence: {
    status: "contradictory",
    secondaryMitigation: "does-not-mitigate",
    explanation: "La condición de victoria contradice la identidad principal.",
  },
};
const conflictingConditionConfidence = assessConfidence({
  diagnosis: conflictingConditionDiagnosis,
  correction: coherenceAdjusted.correction,
  protection: coherenceAdjusted.protection,
});
assert.deepEqual(
  Object.values(conflictingConditionConfidence.conclusions).map((item) => item.level),
  ["baja", "baja", "baja"],
  "Una condición contradictoria reduce la confianza y vuelve provisional el informe"
);

const fragileDiagnosis = {
  ...coherenceAdjusted.diagnosis,
  stability: { status: "fragile" },
};
const fragileConfidence = assessConfidence({
  diagnosis: fragileDiagnosis,
  correction: coherenceAdjusted.correction,
  protection: coherenceAdjusted.protection,
});
assert.equal(fragileConfidence.conclusions.diagnosis.level, "baja");

const dependentDiagnosis = {
  ...coherenceAdjusted.diagnosis,
  stability: { status: "dependent" },
};
const dependentConfidence = assessConfidence({
  diagnosis: dependentDiagnosis,
  correction: coherenceAdjusted.correction,
  protection: coherenceAdjusted.protection,
});
assert.equal(dependentConfidence.conclusions.diagnosis.level, "media");

const unavailable = assessConfidence({ diagnosis: { status: "not-assessable" } });
assert.equal(unavailable.status, "not-assessable");
assert.deepEqual(
  [unavailable.conclusions.diagnosis.level, unavailable.conclusions.correction.level, unavailable.conclusions.protection.level],
  ["baja", "baja", "baja"]
);

console.log("Confidence Engine validado: confianza ajustada por coherencia de la condición de victoria, determinismo y salida interna concisa.");
