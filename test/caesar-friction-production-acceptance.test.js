import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateBm4lFrictionProductionAcceptance,
} from '../src/core/fea-benchmarks/caesar-friction-production-acceptance.js';

const CONTROL_CASES = ['L2', 'L3', 'L4', 'L5', 'L6', 'L14'];
const FRICTION_CASES = ['L13', 'L7', 'L15', 'L1'];

function accuracy(overrides = {}) {
  const cases = Object.fromEntries([...CONTROL_CASES, ...FRICTION_CASES].map((caseId) => [
    caseId,
    { restraint: { compared: 10, failed: 0, status: 'PASS' } },
  ]));
  for (const [caseId, value] of Object.entries(overrides)) cases[caseId] = value;
  return { cases };
}

function evaluate(overrides = {}) {
  return evaluateBm4lFrictionProductionAcceptance({
    mechanicsStatus: 'PASS',
    sourceCustodyStatus: 'PASS',
    accuracy: accuracy(),
    ...overrides,
  });
}

test('PASS requires zero restraint failures in every frozen control and friction case', () => {
  const result = evaluate();
  assert.equal(result.frozenControlRestraintGate.status, 'PASS');
  assert.equal(result.frictionRestraintGate.status, 'PASS');
  assert.equal(result.overallStatus, 'PASS');
});

test('one frozen non-friction restraint regression makes overall acceptance FAIL', () => {
  const result = evaluate({
    accuracy: accuracy({ L5: { restraint: { compared: 10, failed: 1, status: 'FAIL' } } }),
  });
  assert.equal(result.frozenControlRestraintGate.status, 'FAIL');
  assert.deepEqual(result.frozenControlRestraintGate.failedCaseIds, ['L5']);
  assert.equal(result.frozenControlRestraintGate.restraintFailureCount, 1);
  assert.equal(result.overallStatus, 'FAIL');
});

test('missing frozen control evidence blocks rather than passing', () => {
  const evidence = accuracy();
  delete evidence.cases.L14;
  const result = evaluate({ accuracy: evidence });
  assert.equal(result.frozenControlRestraintGate.status, 'NOT_READY');
  assert.deepEqual(result.frozenControlRestraintGate.missingCaseIds, ['L14']);
  assert.equal(result.overallStatus, 'BLOCKED');
});

test('friction restraint failure remains an independent FAIL gate', () => {
  const result = evaluate({
    accuracy: accuracy({ L13: { restraint: { compared: 10, failed: 2, status: 'FAIL' } } }),
  });
  assert.equal(result.frozenControlRestraintGate.status, 'PASS');
  assert.equal(result.frictionRestraintGate.status, 'FAIL');
  assert.equal(result.overallStatus, 'FAIL');
});

test('source custody or mechanics block before benchmark PASS is considered', () => {
  assert.equal(evaluate({ sourceCustodyStatus: 'BLOCKED_SOURCE_CUSTODY' }).overallStatus, 'BLOCKED');
  assert.equal(evaluate({ mechanicsStatus: 'BLOCKED' }).overallStatus, 'BLOCKED');
});
