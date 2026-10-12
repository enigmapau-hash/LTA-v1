#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const { assessWinConditionCoherence } = require("../src/domain/win-condition-coherence-engine.js");

function fixture(overrides = {}) {
  const diagnosis = {
    status: "assessed",
    plan: { clear: true, primaryIdentity: "Front to Back", secondaryIdentity: null },
    coherence: { status: "coherent" },
    contradictions: { status: "coherent" },
    winCondition: {
      status: "assessed",
      primary: { identity: "Front to Back", condition: "Proteger al ADC y forzar teamfights." },
      secondary: null,
    },
    ...overrides,
  };
  return diagnosis;
}

const aligned = assessWinConditionCoherence({ diagnosis: fixture() });
assert.equal(aligned.status, "fully-coherent");
assert.equal(aligned.relation, "aligned");
assert.equal(aligned.secondaryMitigation, "not-needed");

const hybrid = fixture({
  plan: { clear: true, primaryIdentity: "Front to Back", secondaryIdentity: "Teamfight" },
  coherence: { status: "hybrid" },
  contradictions: { status: "coherent-hybrid" },
  winCondition: {
    status: "assessed",
    primary: { identity: "Front to Back", condition: "Proteger al ADC y forzar teamfights." },
    secondary: {
      identity: "Teamfight",
      condition: "Iniciar una pelea coordinada y encadenar las definitivas.",
      relationship: "complementary",
    },
  },
});
const partial = assessWinConditionCoherence({ diagnosis: hybrid });
assert.equal(partial.status, "partially-coherent");
assert.equal(partial.relation, "complementary");
assert.equal(partial.secondaryMitigation, "complements-plan");

const unlinkedSecondaryDiagnosis = fixture({
  winCondition: {
    status: "assessed",
    primary: { identity: "Front to Back", condition: "Proteger al ADC y forzar teamfights." },
    secondary: { identity: "Teamfight", condition: "Iniciar una pelea coordinada.", relationship: "complementary" },
  },
});
const unlinkedSecondary = assessWinConditionCoherence({ diagnosis: unlinkedSecondaryDiagnosis });
assert.equal(unlinkedSecondary.status, "partially-coherent");
assert.equal(unlinkedSecondary.relation, "incomplete");

const primaryMismatch = fixture({
  winCondition: {
    status: "assessed",
    primary: { identity: "Dive", condition: "Eliminar rápidamente la backline rival." },
    secondary: null,
  },
});
const mismatch = assessWinConditionCoherence({ diagnosis: primaryMismatch });
assert.equal(mismatch.status, "contradictory");
assert.match(mismatch.explanation, /Dive contradice la identidad principal Front to Back/);

const structuralConflict = fixture({
  plan: { clear: true, primaryIdentity: "Poke", secondaryIdentity: "Dive" },
  coherence: { status: "contradictory" },
  contradictions: { status: "contradictory" },
  winCondition: {
    status: "assessed",
    primary: { identity: "Poke", condition: "Desgastar antes de pelear." },
    secondary: {
      identity: "Dive",
      condition: "Eliminar rápidamente la backline rival.",
      relationship: "conflicting",
    },
  },
});
const conflict = assessWinConditionCoherence({ diagnosis: structuralConflict });
assert.equal(conflict.status, "contradictory");
assert.equal(conflict.secondaryMitigation, "does-not-mitigate");

const mitigatedConflict = {
  ...structuralConflict,
  winCondition: {
    ...structuralConflict.winCondition,
    secondary: {
      ...structuralConflict.winCondition.secondary,
      relationship: "complementary",
    },
  },
};
const mitigation = assessWinConditionCoherence({ diagnosis: mitigatedConflict });
assert.equal(mitigation.status, "partially-coherent");
assert.equal(mitigation.secondaryMitigation, "mitigates-conflict");
assert.match(mitigation.explanation, /aunque persiste el conflicto/);

const unavailable = assessWinConditionCoherence({ diagnosis: { status: "not-assessable" } });
assert.equal(unavailable.status, "not-assessed");

for (const result of [aligned, partial, mismatch, conflict, mitigation, unavailable]) {
  assert.ok(result.explanation);
  assert.ok(result.explanation.split(/\s+/).length <= 22, "La explicación debe ser breve");
}
assert.deepEqual(assessWinConditionCoherence({ diagnosis: hybrid }), partial, "La evaluación debe ser determinista");

console.log("Win Condition Coherence Engine validado: alineación, complementariedad, mitigación, contradicción y determinismo.");
