#!/usr/bin/env node
import assert from 'node:assert/strict';
import { compareBm4IterationMeasurements } from './lfea-bm4nl-iteration-compare.mjs';
import { semanticHash } from '../src/core/shared-piping-model/canonical-json.js';

const identity = Object.freeze({
  sourceAccdbSha256: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  packageSemanticHash: 'fnv1a64:1111111111111111',
  modelSemanticHash: 'fnv1a64:2222222222222222',
  profileId: 'BM4NL-L19-LINEAR-SOLVE-V1',
});

const before = measurement([
  row('20090', 'FORCE', 'UY', -1659.836792, -1991.8041504, 0.20, 'FAIL'),
  row('20030', 'FORCE', 'UX', -300, -285, 0.05, 'PASS'),
]);
const after = measurement([
  row('20090', 'FORCE', 'UY', -1659.836792, -1792.62373536, 0.08, 'PASS'),
  row('20030', 'FORCE', 'UX', -300, -279, 0.07, 'PASS'),
]);

const comparison = compareBm4IterationMeasurements(before, after, 'I-SYNTH');
assert.equal(comparison.totals.beforeExceedingComponentCount, 1);
assert.equal(comparison.totals.afterExceedingComponentCount, 0);
assert.equal(comparison.totals.failToPassCount, 1);
assert.equal(comparison.totals.passToFailCount, 0);
assert.equal(comparison.totals.decreasedErrorComponentCount, 1);
assert.equal(comparison.totals.increasedErrorComponentCount, 1);
assert.equal(comparison.acceptance.allComparedRestraintComponentsWithinProfileTolerance, true);
assert.equal(comparison.cases.L19.components.find((entry) => entry.nodeId === '20090').percentErrorDelta, -12);

assert.throws(
  () => compareBm4IterationMeasurements(before, resign({ ...withoutHash(after), profileId: 'OTHER' })),
  /different profileId/u,
);

const referenceDriftAfter = measurement([
  row('20090', 'FORCE', 'UY', -1600, -1792.62373536, 0.08, 'PASS'),
  row('20030', 'FORCE', 'UX', -300, -279, 0.07, 'PASS'),
]);
assert.throws(
  () => compareBm4IterationMeasurements(before, referenceDriftAfter),
  /Reference\/tolerance drift/u,
);

console.log(JSON.stringify({
  check: 'lfea-bm4nl-iteration-compare',
  status: 'PASS',
  comparisonSemanticHash: comparison.semanticHash,
  totals: comparison.totals,
  acceptance: comparison.acceptance,
  guards: {
    measurementHash: 'PASS',
    identityDrift: 'PASS',
    referenceToleranceDrift: 'PASS',
  },
}, null, 2));

function measurement(components) {
  const failures = components.filter((entry) => entry.status === 'FAIL');
  const caseRecord = {
    qualificationStatus: failures.length === 0 ? 'PASS' : 'FAIL',
    executionStatus: 'QUALIFIED',
    executionSemanticHash: 'fnv1a64:3333333333333333',
    executionEvidenceHash: 'fnv1a64:4444444444444444',
    comparedRestraintComponentCount: components.length,
    exceedingRestraintCount: new Set(failures.map((entry) => entry.nodeId)).size,
    exceedingComponentCount: failures.length,
    worstComponent: [...components].sort((left, right) => right.relativeError - left.relativeError)[0],
    worstFailure: failures[0] ?? null,
    failures,
    components,
  };
  return resign({
    schema: 'lfea-bm4nl-iteration-measurement/v1',
    ...identity,
    qualificationStatus: caseRecord.qualificationStatus,
    cases: { L19: caseRecord },
  });
}

function resign(base) {
  return Object.freeze({ ...base, semanticHash: semanticHash(base) });
}

function withoutHash(value) {
  const { semanticHash: _semanticHash, ...base } = value;
  return base;
}

function row(nodeId, quantity, component, referenceValue, actualValue, relativeError, status) {
  return Object.freeze({
    nodeId,
    quantity,
    component,
    unit: 'N',
    referenceValue,
    actualValue,
    absoluteError: Math.abs(actualValue - referenceValue),
    relativeError,
    percentError: relativeError * 100,
    scaleFloor: 50,
    status,
  });
}
