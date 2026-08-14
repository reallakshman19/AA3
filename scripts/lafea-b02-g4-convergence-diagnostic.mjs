#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  LAFEA_CONTINUUM_PROBE_CONVERGENCE_DEFINITION_SCHEMA,
  compareLafeaContinuumPhysicalProbeEvidence,
  evaluateLafeaContinuumProbeConvergence,
} from '../src/workspace/lafea-continuum-probe-convergence.js';
import { LAFEA_CONTINUUM_PHYSICAL_PROBE_EVIDENCE_SCHEMA } from '../src/workspace/lafea-continuum-physical-probe.js';

const Q = `sha256:${'a'.repeat(64)}`;
const P = `sha256:${'b'.repeat(64)}`;
const asymptotic = evaluateLafeaContinuumProbeConvergence(definition(
  [26, 14, 11, 10.25],
));
assert.equal(asymptotic.classification, 'ASYMPTOTIC');
assert.ok(Math.abs(asymptotic.observedOrder - 2) < 1e-12);
assert.ok(Math.abs(asymptotic.richardsonExtrapolatedValue - 10) < 1e-12);
assert.ok(Math.abs(asymptotic.gciFineAbsolute - 0.3125) < 1e-12);
assert.equal(asymptotic.benchmarkAcceptanceGranted, false);
assert.equal(asymptotic.globalConvergenceAuthorityGranted, false);
assert.equal(asymptotic.releaseAuthorityGranted, false);

const oscillatory = evaluateLafeaContinuumProbeConvergence(definition([11, 9.5, 10.25]));
assert.equal(oscillatory.classification, 'OSCILLATORY');
assert.equal(oscillatory.observedOrder, null);

const divergent = evaluateLafeaContinuumProbeConvergence(definition([10, 10.1, 10.4]));
assert.equal(divergent.classification, 'DIVERGENT');

const preAsymptotic = evaluateLafeaContinuumProbeConvergence(definition(
  [26, 14, 11.5, 10.6], { orderStabilityRelativeTolerance: 0.1 },
));
assert.equal(preAsymptotic.classification, 'PRE_ASYMPTOTIC');
assert.equal(preAsymptotic.richardsonExtrapolatedValue, null);
assert.equal(preAsymptotic.gciFineAbsolute, null);

const nearZero = evaluateLafeaContinuumProbeConvergence(definition(
  [4e-9, 2e-9, 1e-9], { nearZeroAbsolute: 1e-8 },
));
assert.equal(nearZero.classification, 'NEAR_ZERO_SCALE_LIMITED');
assert.equal(nearZero.gciFinePercent, null);

const singularDefinition = definition([26, 14, 11], {}, true);
const singular = evaluateLafeaContinuumProbeConvergence(singularDefinition);
assert.equal(singular.classification, 'SINGULAR_EXCLUDED');
assert.equal(singular.pointwiseAcceptanceEligible, false);

const left = evidence(11, 1, '1');
const right = evidence(10.25, 0.5, '2');
const comparison = compareLafeaContinuumPhysicalProbeEvidence(left, right);
assert.equal(comparison.compatible, true);
assert.equal(comparison.quantityIdentityHash, Q);
assert.throws(
  () => compareLafeaContinuumPhysicalProbeEvidence(left, {
    ...right,
    quantityIdentityHash: `sha256:${'c'.repeat(64)}`,
  }),
  /LAFEA_G4_PROBE_COMPARISON_IDENTITY_MISMATCH/u,
);

console.log(JSON.stringify({
  schema: 'lafea-b02-g4-convergence-diagnostic/v1',
  status: 'PASS',
  incompatibleQuantityComparisonRejected: true,
  asymptoticClassification: true,
  preAsymptoticClassification: true,
  oscillatoryClassification: true,
  divergentClassification: true,
  nearZeroAbsoluteRuleApplied: true,
  singularPointwiseAcceptanceExcluded: true,
  benchmarkAcceptanceGranted: false,
  releaseAuthorityGranted: false,
  temperatureAuthorityGranted: false,
}));

function definition(values, overrides = {}, singular = false) {
  const hs = values.length === 4 ? [4, 2, 1, 0.5] : [4, 2, 1];
  return {
    schema: LAFEA_CONTINUUM_PROBE_CONVERGENCE_DEFINITION_SCHEMA,
    studyId: `G4-CONVERGENCE-${values.join('-')}`,
    quantityIdentityHash: Q,
    refinementRatio: 2,
    gciSafetyFactor: 1.25,
    nearZeroAbsolute: overrides.nearZeroAbsolute ?? 1e-12,
    orderStabilityRelativeTolerance: overrides.orderStabilityRelativeTolerance ?? 0.2,
    levels: values.map((value, index) => ({
      levelId: `L${index}`,
      h: hs[index],
      evidence: evidence(value, hs[index], String(index + 1), singular),
    })),
  };
}
function evidence(value, h, suffix, singular = false) {
  return {
    schema: LAFEA_CONTINUUM_PHYSICAL_PROBE_EVIDENCE_SCHEMA,
    status: 'PASS',
    semanticHash: `sha256:${suffix.repeat(64).slice(0, 64)}`,
    probeIdentityHash: P,
    quantityIdentityHash: Q,
    authoritativeUnits: 'MPa',
    authoritativeValue: value,
    pointwiseAcceptanceEligible: !singular,
    custody: {
      meshHash: `sha256:${String(Math.round(h * 10)).padStart(2, '0').repeat(32).slice(0, 64)}`,
      executionHash: `sha256:${'d'.repeat(63)}${suffix.slice(0, 1)}`,
      recoveryHash: `sha256:${'e'.repeat(63)}${suffix.slice(0, 1)}`,
    },
  };
}
