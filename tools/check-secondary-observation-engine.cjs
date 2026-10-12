#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const XLSX = require("../vendor/xlsx.full.min.js");
const { diagnoseComposition } = require("../src/domain/diagnostic-engine.js");
const { findSecondaryObservation } = require("../src/domain/secondary-observation-engine.js");

const root = path.resolve(__dirname, "..");
const workbook = XLSX.read(fs.readFileSync(path.join(root, "Draft Pool.xlsx")), { type: "buffer" });
const sheets = { top: "Tabla Top", jungle: "Tabla Jungla", mid: "Tabla Mid", botline: "Tabla Botline", support: "Tabla Support" };

function picks(selection) {
  return Object.entries(selection).map(([role, champion]) => {
    const row = XLSX.utils.sheet_to_json(workbook.Sheets[sheets[role]], { defval: "" })
      .find((item) => item["Campeón"] === champion);
    assert.ok(row, `${champion} debe existir para ${role}`);
    return { role, champion, identity: row["Identidad"], function: row["Función"], tempo: row["Ritmo"], strengths: row["Fortalezas"], weaknesses: row["Debilidades"] };
  });
}

function observation(selection) {
  const diagnosis = diagnoseComposition(selection);
  return findSecondaryObservation({ diagnosis });
}

const clear = observation(picks({ top: "Olaf", jungle: "Zyra", mid: "Heimerdinger", botline: "Lucian", support: "Tahm Kench" }));
assert.equal(clear, null, "Un plan claro y sin una vía secundaria no necesita un matiz");

const hybridPicks = picks({ top: "Ornn", jungle: "Sejuani", mid: "Orianna", botline: "Jinx", support: "Lulu" });
const hybrid = observation(hybridPicks);
assert.equal(hybrid, "Matiz: Teamfight amplía las opciones sin desplazar el plan.");
assert.ok(hybrid.split(/\s+/).length <= 10, "La observación secundaria debe ser muy breve");
assert.deepEqual(observation(hybridPicks), hybrid, "La observación debe ser determinista");

const incoherent = observation(picks({ top: "Fiora", jungle: "Elise", mid: "Xerath", botline: "Draven", support: "Lulu" }));
assert.equal(incoherent, null, "Una composición sin plan compartido no debe recibir una observación secundaria especulativa");

const diagnosis = diagnoseComposition(hybridPicks);
assert.equal(findSecondaryObservation({
  diagnosis: {
    ...diagnosis,
    winConditionCoherence: { ...diagnosis.winConditionCoherence, relation: "conflicting" },
  },
}), null, "Una vía secundaria incompatible no cumple el criterio de complemento claro");
assert.equal(findSecondaryObservation({ diagnosis: { status: "not-assessable" } }), null);

console.log("Secondary Observation Engine validado: una observación complementaria opcional, breve y determinista.");
