#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  PRODUCTION_CAPABILITY_PROFILE,
} from '../src/core/linear-piping-analysis-consumer/production-capability-profile.js';
import {
  PRODUCTION_PRESSURE_EFFECT_AUTHORITY_SCHEMA,
  sealProductionPressureEffectAuthority,
  sourceAuthorizedPressureEffects,
} from '../src/core/linear-piping-analysis-consumer/production-pressure-effect-authority.js';

const evidence = Object.freeze({
  sourceId: 'S5-QUALIFICATION-SOURCE',
  sourceRevision: 'EXPLICIT-ENGINEERING-AUTHORITY',
  sourceSemanticHash: 'fnv1a64:S5AUTHORITY',
});

const none = sealProductionPressureEffectAuthority({
  schema: PRODUCTION_PRESSURE_EFFECT_AUTHORITY_SCHEMA,
  authorityId: 'S5-NONE',
  bourdonMode: 'NONE',
  bendPressureStiffeningMode: 'EXCLUDE',
  elbowStiffeningPressureSelector: 'NONE',
  sourceEvidence: evidence,
});
assert.deepEqual(sourceAuthorizedPressureEffects(none), {
  codeStress: true,
  pressureStiffening: false,
  axialThrust: false,
  bourdon: false,
});

const translationOnly = sealProductionPressureEffectAuthority({
  schema: PRODUCTION_PRESSURE_EFFECT_AUTHORITY_SCHEMA,
  authorityId: 'S5-TRANSLATION',
  bourdonMode: 'TRANSLATION_ONLY',
  bendPressureStiffeningMode: 'EXCLUDE',
  elbowStiffeningPressureSelector: 'NONE',
  sourceEvidence: evidence,
});
assert.deepEqual(sourceAuthorizedPressureEffects(translationOnly), {
  codeStress: true,
  pressureStiffening: false,
  axialThrust: false,
  bourdon: true,
});

const translationAndRotation = sealProductionPressureEffectAuthority({
  schema: PRODUCTION_PRESSURE_EFFECT_AUTHORITY_SCHEMA,
  authorityId: 'S5-TRANSLATION-ROTATION',
  bourdonMode: 'TRANSLATION_AND_ROTATION',
  bendPressureStiffeningMode: 'INCLUDE',
  elbowStiffeningPressureSelector: 'P1',
  sourceEvidence: evidence,
});
assert.deepEqual(sourceAuthorizedPressureEffects(translationAndRotation), {
  codeStress: true,
  pressureStiffening: true,
  axialThrust: false,
  bourdon: true,
});

assert.throws(() => sealProductionPressureEffectAuthority({
  schema: PRODUCTION_PRESSURE_EFFECT_AUTHORITY_SCHEMA,
  authorityId: 'S5-CONFLICT-INCLUDE',
  bourdonMode: 'NONE',
  bendPressureStiffeningMode: 'INCLUDE',
  elbowStiffeningPressureSelector: 'NONE',
  sourceEvidence: evidence,
}), (error) => error?.code === 'PRESSURE_STIFFENING_PRESSURE_SELECTOR_REQUIRED');

assert.throws(() => sealProductionPressureEffectAuthority({
  schema: PRODUCTION_PRESSURE_EFFECT_AUTHORITY_SCHEMA,
  authorityId: 'S5-CONFLICT-EXCLUDE',
  bourdonMode: 'NONE',
  bendPressureStiffeningMode: 'EXCLUDE',
  elbowStiffeningPressureSelector: 'PMAX',
  sourceEvidence: evidence,
}), (error) => error?.code === 'PRESSURE_STIFFENING_PRESSURE_SELECTOR_CONFLICT');

// S5 prerequisite gate: source authorization is not implementation capability.
// These remain false until the production formulation consumes, proves and
// benchmarks each mechanism independently.
assert.equal(PRODUCTION_CAPABILITY_PROFILE.pressureStiffening, false);
assert.equal(PRODUCTION_CAPABILITY_PROFILE.pressureAxialThrust, false);
assert.equal(PRODUCTION_CAPABILITY_PROFILE.pressureBourdon, false);
assert.equal(PRODUCTION_CAPABILITY_PROFILE.pressureCodeStress, true);

console.log(JSON.stringify({
  check: 'lfea-s5-pressure-authority-gate',
  status: 'PASS',
  productionUseAuthorized: false,
  unresolved: [
    'CAESAR_BOURDON_JOB_MODE_CUSTODY',
    'CAESAR_BEND_PRESSURE_STIFFENING_POLICY_CUSTODY',
    'CAESAR_ELBOW_STIFFENING_PRESSURE_SELECTOR_CUSTODY',
    'PRODUCTION_MEC21_FREE_STATE_INTEGRATION',
  ],
}));
