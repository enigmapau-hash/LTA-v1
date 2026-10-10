#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const XLSX = require("../vendor/xlsx.full.min.js");
const { analyzeComposition, recommendPicks } = require("../src/domain/composition-engine.js");

const root = path.resolve(__dirname, "..");
const workbook = XLSX.read(fs.readFileSync(path.join(root, "Draft Pool.xlsx")), { type: "buffer" });
const roleSheets = {
  top: "Tabla Top",
  jungle: "Tabla Jungla",
  mid: "Tabla Mid",
  botline: "Tabla Botline",
  support: "Tabla Support",
};

const references = [
  {
    name: "Front to Back",
    expected: "Front to Back",
    picks: { top: "Ornn", jungle: "Sejuani", mid: "Orianna", botline: "Jinx", support: "Lulu" },
  },
  {
    name: "Dive",
    expected: "Dive",
    picks: { top: "Camille", jungle: "Vi", mid: "Ahri", botline: "Kai'Sa", support: "Rakan" },
  },
  {
    name: "Pick",
    expected: "Pick",
    picks: { top: "Gragas", jungle: "Elise", mid: "Ahri", botline: "Jhin", support: "Bard" },
  },
  {
    name: "Poke",
    expected: "Poke",
    picks: { top: "Jayce", jungle: "Nidalee", mid: "Xerath", botline: "Varus (Letalidad)", support: "Karma" },
  },
  {
    name: "Split Push",
    expected: "Split Push",
    picks: { top: "Fiora", jungle: "Viego", mid: "Twisted Fate", botline: "Ezreal", support: "Braum" },
  },
  {
    name: "Teamfight",
    expected: "Teamfight",
    picks: { top: "Malphite", jungle: "Wukong", mid: "Yasuo", botline: "Miss Fortune", support: "Rell" },
  },
  {
    name: "Escalado",
    expected: "Escalado",
    picks: { top: "Sion", jungle: "Maokai", mid: "Azir", botline: "Smolder", support: "Milio" },
  },
  {
    name: "Early Game",
    expected: "Early Game",
    picks: { top: "Renekton", jungle: "Lee Sin", mid: "Pantheon", botline: "Draven", support: "Pyke" },
  },
];

function rowsForSheet(sheetName) {
  const sheet = workbook.Sheets[sheetName];
  assert.ok(sheet, `El workbook debe contener la hoja ${sheetName}`);
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

function pickFromWorkbook(role, champion) {
  const requestedSheet = roleSheets[role];
  let row = rowsForSheet(requestedSheet).find((item) => item["Campeón"] === champion);

  // The Fase 1 reference names Maokai in jungle, while the workbook only has top/support entries.
  if (!row && champion === "Maokai") {
    row = rowsForSheet("Tabla Top").find((item) => item["Campeón"] === champion);
  }

  assert.ok(row, `${champion} debe existir en ${requestedSheet} para la referencia ${role}`);
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

function evaluate(reference) {
  const picks = Object.entries(reference.picks).map(([role, champion]) => pickFromWorkbook(role, champion));
  return { picks, result: analyzeComposition(picks) };
}

const candidatesByRole = Object.fromEntries(
  Object.entries(roleSheets).map(([role, sheetName]) => [
    role,
    rowsForSheet(sheetName).map((row) => ({
      champion: row["Campeón"],
      identity: row["Identidad"],
      function: row["Función"],
      tempo: row["Ritmo"],
      strengths: row["Fortalezas"],
      weaknesses: row["Debilidades"],
    })),
  ])
);

const results = new Map();
for (const reference of references) {
  const { picks, result } = evaluate(reference);
  results.set(reference.name, { picks, result });
  assert.equal(
    result.identity.primary,
    reference.expected,
    `${reference.name} debe reconocerse como arquetipo principal; puntuaciones: ${JSON.stringify(result.archetypeScores.slice(0, 3))}`
  );
  assert.ok(result.winCondition, `${reference.name} debe producir una condición de victoria`);
  assert.ok(result.strengths.length, `${reference.name} debe describir fortalezas`);
  assert.ok(result.weaknesses.length, `${reference.name} debe describir debilidades`);
  assert.equal(result.report.identity, reference.expected, `${reference.name} debe alimentar la identidad visible`);
  assert.ok(result.report.executiveSummary, `${reference.name} debe producir un resumen ejecutivo`);
  assert.ok(result.report.gamePlan.length, `${reference.name} debe producir un plan de partida`);
  assert.ok(result.report.risks.length, `${reference.name} debe exponer riesgos`);
  assert.ok(result.report.internalSynergy, `${reference.name} debe explicar su sinergia interna`);
  assert.ok(result.report.planSupport, `${reference.name} debe explicar qué picks sostienen su plan`);
  assert.ok(Array.isArray(result.report.planSupport.strongestPicks), `${reference.name} debe devolver los picks de mayor soporte`);
  assert.ok(Array.isArray(result.report.planSupport.identityChanges), `${reference.name} debe medir los cambios al retirar un pick`);
  assert.ok(result.report.planSupport.identityChanges.every((item) => Array.isArray(item.gamePlanWithout)), `${reference.name} debe incluir un plan alternativo para cada cambio de identidad`);
  assert.equal(result.report.picks.length, 5, `${reference.name} debe conservar los cinco picks`);
  assert.match(result.report.bans.explanation, /No hay datos de campeones rivales/i);
}

const frontToBack = results.get("Front to Back").result;
assert.match(frontToBack.winCondition, /proteger al ADC/i);
assert.ok(frontToBack.strengths.includes("Frontline"));
assert.ok(frontToBack.strengths.includes("Peel"));
assert.ok(frontToBack.strengths.includes("DPS sostenido"));
assert.ok(frontToBack.weaknesses.some((weakness) => /lateral/i.test(weakness)));
assert.equal(results.get("Front to Back").result.report.winCondition, frontToBack.winCondition);
assert.deepEqual(results.get("Front to Back").result.report.strengths, frontToBack.strengths);
assert.deepEqual(results.get("Front to Back").result.report.weaknesses, frontToBack.weaknesses);
assert.equal(frontToBack.report.planSupport.identityChanges.length, 0, "Front to Back debe conservar su identidad al retirar cualquier pick individual");

const dive = results.get("Dive").result;
assert.match(dive.winCondition, /backline rival/i);
assert.ok(dive.weaknesses.some((weakness) => /iniciación/i.test(weakness)));

const pick = results.get("Pick").result;
assert.ok(pick.strengths.some((strength) => /cazadas/i.test(strength)));
assert.ok(pick.weaknesses.some((weakness) => /sostenido/i.test(weakness)));

const poke = results.get("Poke").result;
assert.match(poke.winCondition, /desgastar/i);
assert.ok(poke.weaknesses.some((weakness) => /engages directos/i.test(weakness)));

const splitPush = results.get("Split Push").result;
assert.match(splitPush.winCondition, /presión lateral/i);
assert.ok(splitPush.weaknesses.some((weakness) => /teamfights prolongadas/i.test(weakness)));
assert.ok(
  splitPush.report.planSupport.identityChanges.some((item) => item.champion === "Fiora" && item.identityWithout === null),
  "Split Push debe señalar a Fiora como una pieza cuya ausencia elimina una identidad principal clara"
);
assert.ok(
  splitPush.report.planSupport.identityChanges.some((item) => item.champion === "Twisted Fate" && item.identityWithout === "Escalado" && item.gamePlanWithout.some((step) => /picos de poder/i.test(step))),
  "Split Push debe ofrecer el plan de escalado existente cuando cambia a esa identidad"
);

const teamfight = results.get("Teamfight").result;
assert.ok(teamfight.strengths.some((strength) => /definitivas/i.test(strength)));
assert.ok(teamfight.strengths.some((strength) => /iniciación/i.test(strength)));

const scaling = results.get("Escalado").result;
assert.match(scaling.weaknesses.join(" "), /Early vulnerable/i);
assert.match(scaling.winCondition, /picos de poder/i);

const early = results.get("Early Game").result;
assert.match(early.strengths.join(" "), /early/i);
assert.match(early.winCondition, /acelerar/i);
assert.match(early.weaknesses.join(" "), /alarga/i);

const hybrid = analyzeComposition(results.get("Front to Back").picks);
assert.equal(hybrid.identity.primary, "Front to Back");
assert.equal(hybrid.identity.secondary, "Teamfight", "El motor debe reconocer una identidad secundaria con evidencia suficiente");

const unbalancedPicks = [
  pickFromWorkbook("top", "Fiora"),
  pickFromWorkbook("jungle", "Elise"),
  pickFromWorkbook("mid", "Xerath"),
  pickFromWorkbook("botline", "Draven"),
  pickFromWorkbook("support", "Lulu"),
];
const unbalanced = analyzeComposition(unbalancedPicks);
assert.equal(unbalanced.identity.primary, null, `Una composición sin señales compartidas no debe recibir identidad inventada; puntuaciones: ${JSON.stringify(unbalanced.archetypeScores.slice(0, 3))}`);
assert.equal(unbalanced.cohesion.coherent, false);
assert.match(unbalanced.cohesion.explanation, /No hay un plan de partida claro/i);
assert.ok(unbalanced.cohesion.gaps.includes("iniciación compartida"));
assert.ok(unbalanced.cohesion.gaps.includes("frontline"));
assert.match(unbalanced.cohesion.explanation, /cuesta coordinar/i);
assert.equal(unbalanced.report.planSupport, null, "una composición sin identidad clara no debe afirmar dependencias del plan");
assert.equal(analyzeComposition(results.get("Front to Back").picks.slice(0, 4)).report.planSupport, null, "un draft parcial no debe presentar una evaluación de resiliencia de equipo completo");

for (const { picks, result } of results.values()) {
  assert.deepEqual(analyzeComposition(picks), result, "El análisis debe ser determinista para la misma composición");
}

const frontToBackPicks = results.get("Front to Back").picks;
const partialRecommendationCases = [
  { count: 1, role: "jungle", expectedDirection: "Front to Back" },
  { count: 2, role: "mid", expectedDirection: "Front to Back" },
  { count: 3, role: "botline", expectedDirection: "Teamfight" },
  { count: 4, role: "support", expectedDirection: "Front to Back", expectedChampion: "Lulu" },
];

for (const testCase of partialRecommendationCases) {
  const partial = frontToBackPicks.slice(0, testCase.count);
  const recommendations = recommendPicks(partial, candidatesByRole);
  const roleRecommendations = recommendations[testCase.role];
  assert.ok(roleRecommendations, `Una composición con ${testCase.count} picks debe recomendar para ${testCase.role}`);
  assert.equal(roleRecommendations.length, 3, `Deben mostrarse tres candidatos para ${testCase.role}`);
  for (const pick of partial) {
    assert.equal(recommendations[pick.role], undefined, `No se debe recomendar el rol ya ocupado ${pick.role}`);
  }
  assert.equal(roleRecommendations[0].direction, testCase.expectedDirection, `El mejor candidato para ${testCase.role} debe apuntar a ${testCase.expectedDirection}`);
  assert.ok(roleRecommendations.every((item) => item.strengths.length && item.gamePlan.length), "Cada recomendación debe explicar fortalezas y plan");
  assert.ok(roleRecommendations.every((item) => item.affinity >= 0 && item.affinity <= 100), "La afinidad debe usar la escala del motor");
  assert.ok(roleRecommendations.every((item, index) => index === 0 || roleRecommendations[index - 1].affinity >= item.affinity), "Los candidatos deben ordenarse por afinidad descendente");
  const bestAffinity = roleRecommendations[0].affinity;
  for (const item of roleRecommendations) {
    const expectedQuality = item.affinity === bestAffinity
      ? "Mejor afinidad"
      : item.coherent
        ? "Buen encaje"
        : "Orientación inicial";
    assert.equal(item.quality, expectedQuality, "La etiqueta debe reflejar afinidad relativa y la confianza ya definida por el motor");
  }
  assert.deepEqual(
    recommendPicks(partial, candidatesByRole),
    recommendations,
    "Las recomendaciones deben ser deterministas"
  );
  if (testCase.expectedChampion) {
    assert.equal(roleRecommendations[0].champion, testCase.expectedChampion, "La pieza de referencia debe encabezar el rol que completa Front to Back");
  }
}

assert.equal(
  recommendPicks(frontToBackPicks, candidatesByRole).support,
  undefined,
  "Una composición completa no debe recomendar cambios para roles ocupados"
);

console.log("Composition Engine validado: 8 arquetipos, composición híbrida/descompensada y recomendaciones deterministas para 1-4 picks.");
