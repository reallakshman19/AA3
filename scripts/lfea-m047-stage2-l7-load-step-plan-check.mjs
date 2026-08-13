#!/usr/bin/env node
/** Contract for the fail-closed M047 L7 load-step readiness boundary. */
import assert from 'node:assert/strict';
import { buildL7LoadStepPlan } from './lfea-m047-stage2-l7-load-step-plan.mjs';

const base = {
  schema: 'm047-bm4l-stage2-post-direction-residual-rca/v1',
  caseId: 'L13',
  sourceAccdbSha256: '64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8',
  semanticHash: 'fnv1a64:test',
};

assert.throws(
  () => buildL7LoadStepPlan({
    ...base,
    next: { decision: 'RUN_R2_MOBILISATION_NEXT', l7LoadSteppingAllowed: false },
  }),
  (error) => error?.code === 'M047_L7_LOAD_STEPPING_BLOCKED_BY_L13_RCA',
  'L7 must remain blocked while L13 mobilisation RCA is unresolved',
);

assert.throws(
  () => buildL7LoadStepPlan({
    ...base,
    next: { decision: 'PER_AXIS_CAPACITY_PARTITION_EXPERIMENT_JUSTIFIED', l7LoadSteppingAllowed: false },
  }),
  (error) => error?.code === 'M047_L7_LOAD_STEPPING_BLOCKED_BY_L13_RCA',
  'L7 must remain blocked while L13 capacity partition is unresolved',
);

const plan = buildL7LoadStepPlan({
  ...base,
  next: { decision: 'L13_RCA_CLEARED_FOR_L7_LOAD_STEPPING', l7LoadSteppingAllowed: true },
});
assert.deepEqual(plan.stepCounts, [1, 5, 10]);
assert.deepEqual(plan.variants.map((row) => row.incrementFraction), [1, 0.2, 0.1]);
assert.ok(plan.variants.every((row) => row.carrySlipStateBetweenIncrements === true));
assert.ok(plan.variants.every((row) => row.carryActiveSetBetweenIncrements === true));
assert.ok(plan.variants.every((row) => row.solveEachIncrementToExistingNonlinearConvergenceGates === true));
assert.equal(plan.mechanicsChanged, false);
assert.equal(plan.toleranceChanged, false);
assert.equal(plan.comparisonPolicyChanged, false);

process.stdout.write('PASS m047 L7 load-step readiness contract\n');
