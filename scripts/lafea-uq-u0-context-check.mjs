import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  BASE_LIMITATIONS,
  CANONICAL_UNITS,
  ENGINEERING_LEVEL,
  FORMULATIONS,
} from '../src/core/local-continuum/constants.js';
import {
  rejectRawSingularPeakAsConvergenceQuantity,
} from '../src/core/lafea-meshing/mesh-convergence-framework.js';

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

const context = readJson('../validation/lafea-benchmark-data/UQ/context/quantities-of-interest.json');
const limitStates = readJson('../validation/lafea-benchmark-data/UQ/reliability/limit-states.json');
const program = readJson('../validation/lafea-benchmark-program/program.json');

assert.equal(context.schema, 'lafea-uq-context/v1');
assert.equal(context.issue, 1673);
assert.equal(context.parentBenchmarkIssue, 1653);
assert.equal(context.productionMeshDependencyIssue, 1652);
assert.equal(context.stage, 'U0');
assert.equal(context.definitionState, 'CONTEXT_FROZEN_TARGET_AUTHORITY_PENDING');

assert.equal(context.deterministicBasis.engineeringLevel, ENGINEERING_LEVEL);
assert.equal(context.deterministicBasis.resultSchema, 'local-continuum-result/v1');
assert.deepEqual(context.deterministicBasis.formulations, Object.values(FORMULATIONS));
for (const [name, unit] of Object.entries(context.deterministicBasis.canonicalUnits)) {
  assert.equal(unit, CANONICAL_UNITS[name], `canonical unit drift: ${name}`);
}

assert.equal(context.claimBoundary.statisticalReliabilityQualified, false);
assert.equal(context.claimBoundary.productionMeshStatisticalClaimAuthorized, false);
assert.equal(context.claimBoundary.governingReliabilityStandard, null);
assert.equal(context.claimBoundary.consequenceClass, null);
assert.equal(context.claimBoundary.numericReliabilityTargetAuthorized, false);
assert.equal(context.claimBoundary.releaseAuthorityGranted, false);
assert.equal(context.claimBoundary.temperatureAuthorityGranted, false);

const qoiIds = context.quantitiesOfInterest.map((qoi) => qoi.qoiId);
assert.equal(new Set(qoiIds).size, qoiIds.length, 'duplicate U0 QoI identity');
assert.deepEqual(qoiIds, [
  'UQ-L3-SELECTED-DISPLACEMENT',
  'UQ-L3-RETAINED-STRESS-COMPONENT',
  'UQ-L3-RETAINED-VON-MISES',
  'UQ-L3-STRAIN-ENERGY',
  'UQ-L3-SUPPORT-REACTION',
]);
for (const qoi of context.quantitiesOfInterest) {
  assert.equal(qoi.domain, 'LAFEA.3');
  assert.equal(typeof qoi.producerSemantic, 'string');
  assert.ok(qoi.producerSemantic.length > 0);
  assert.equal(typeof qoi.canonicalUnit, 'string');
  assert.ok(qoi.canonicalUnit.length > 0);
  assert.equal(typeof qoi.observationLocation, 'string');
  assert.ok(qoi.observationLocation.length > 0);
  assert.equal(typeof qoi.aggregation, 'string');
  assert.ok(qoi.aggregation.length > 0);
  assert.equal(qoi.reliabilityBearing, false, `${qoi.qoiId} cannot be reliability-bearing in U0`);
}

const expectedLimitations = [
  'NO_CODE_COMPLIANCE',
  'NO_BUCKLING',
  'NO_FATIGUE',
  'NO_CRACK_OR_FRACTURE',
  'NO_WELD_STRESS',
  'NO_STRESS_SINGULARITY_ACCEPTANCE',
];
for (const limitation of expectedLimitations) {
  assert.ok(BASE_LIMITATIONS.includes(limitation), `current LAFEA.3 limitation missing: ${limitation}`);
}

const exclusions = new Set(context.explicitExclusions.map((row) => row.quantity));
for (const required of [
  'RAW_SINGULAR_PEAK_STRESS',
  'CODE_DEMAND_CAPACITY_RATIO',
  'BUCKLING_CAPACITY',
  'FATIGUE_DAMAGE_OR_LIFE',
  'FRACTURE_OR_CRACK_CAPACITY',
  'WELD_STRESS',
]) {
  assert.ok(exclusions.has(required), `missing U0 exclusion: ${required}`);
}
assert.throws(
  () => rejectRawSingularPeakAsConvergenceQuantity('RAW_SINGULAR_PEAK_STRESS'),
  /not an accepted convergence quantity/u,
);

assert.equal(limitStates.schema, 'lafea-uq-limit-states/v1');
assert.equal(limitStates.issue, 1673);
assert.equal(limitStates.stage, 'U0');
assert.equal(limitStates.definitionState, 'IDENTITIES_FROZEN_TARGETS_NOT_AUTHORIZED');
assert.equal(limitStates.governingReliabilityStandard, null);
assert.equal(limitStates.consequenceClass, null);
assert.equal(limitStates.numericReliabilityTarget, null);
assert.equal(limitStates.codeAllowable, null);

const limitStateIds = limitStates.limitStates.map((row) => row.limitStateId);
assert.equal(new Set(limitStateIds).size, limitStateIds.length, 'duplicate limit-state identity');
assert.deepEqual(limitStateIds, [
  'LS-L3-SERVICEABILITY-DISPLACEMENT',
  'LS-L3-EQUIVALENT-STRESS-STRENGTH',
]);
for (const row of limitStates.limitStates) {
  assert.ok(qoiIds.includes(row.responseQoiId), `unknown response QoI: ${row.responseQoiId}`);
  assert.equal(row.failureCondition, 'g <= 0');
  assert.equal(row.reliabilityBearingAuthorized, false);
  assert.equal(row.pfTarget, null);
  assert.equal(row.betaTarget, null);
  if ('displacementLimit' in row) assert.equal(row.displacementLimit, null);
  if ('resistanceAllowable' in row) assert.equal(row.resistanceAllowable, null);
}
for (const row of limitStates.nonReliabilityChecks) {
  assert.equal(row.mayGeneratePfOrBeta, false);
}

const forbiddenU0Keys = new Set([
  'distributionFamily',
  'mean',
  'standardDeviation',
  'coefficientOfVariation',
  'covariance',
  'correlation',
  'correlationMatrix',
  'sampleCount',
]);
function assertNoStochasticInputAuthority(value, path = '$') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoStochasticInputAuthority(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    assert.equal(forbiddenU0Keys.has(key), false, `U1 stochastic authority leaked into U0 at ${path}.${key}`);
    assertNoStochasticInputAuthority(child, `${path}.${key}`);
  }
}
assertNoStochasticInputAuthority(context);
assertNoStochasticInputAuthority(limitStates);

assert.equal(program.activeCaseId, 'B02');
assert.equal(program.evidencePolicy.releaseAuthorityGrantedByProgram, false);
assert.equal(program.evidencePolicy.temperatureAuthorityGrantedByProgram, false);
assert.deepEqual(program.futureQueue.map((row) => row.caseId), ['B03', 'B04', 'B05', 'B06']);

console.log(JSON.stringify({
  schema: 'lafea-uq-u0-context-check/v1',
  issue: 1673,
  stage: 'U0',
  status: 'PASS',
  u0DefinitionComplete: true,
  statisticalExecutionAuthorized: false,
  reliabilityTargetAuthorized: false,
  releaseAuthorityGranted: false,
  nextAuthorityBoundary: 'U1_SOURCE_BACKED_STOCHASTIC_INPUT_MODELS',
}));
