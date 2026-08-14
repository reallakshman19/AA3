#!/usr/bin/env node
import assert from 'node:assert/strict';
import { assessR8Nfv15 } from './lfea-m047-stage2-r8-nfv15-assess.mjs';

const SHA = '64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8';
const baseline = {
  caseId: 'L13',
  sourceAccdbSha256: SHA,
  solverProfileId: 'CAESAR-ACCDB-FRICTION-SOLVER-R2',
  restraints: [{
    restraintId: 'R1', nodeId: '1',
    normal: { percentError: 2 },
    tangential: { vectorRelativeError: 0.20 },
    regime: { match: false },
  }],
};
const candidate = {
  caseId: 'L13',
  sourceAccdbSha256: SHA,
  productionPromotionAuthorized: false,
  benchmarkAuthority: false,
  oneMechanicOnly: true,
  converged: true,
  equilibriumStatus: 'PASS',
  nonlinearGateStatus: 'PASS',
  nfvRefreshGateStatus: 'PASS',
  nfv15: {
    threshold: 0.15,
    capacityNormalSource: 'CURRENT_OWN_RESTRAINT_NORMAL_WITH_RETAINED_SLIDING_BASIS',
    refreshRule: 'REFRESH_ONLY_WHEN_RELATIVE_VARIATION_GT_THRESHOLD',
    refreshGateStatus: 'PASS',
  },
  restraints: [{
    restraintId: 'R1', nodeId: '1',
    normal: { percentError: 2 },
    tangential: { vectorRelativeError: 0.05 },
    regime: { match: true },
    nfv15: { retainedNormalBasisN: 100, currentNormalN: 95, variationRatio: 0.05, refreshCount: 1 },
  }],
};

const pass = assessR8Nfv15({ baseline, experiment: candidate });
assert.equal(pass.nomination, 'R8_NFV15_DIRECTIONALLY_NOMINATED_REQUIRES_NEXT_CASE_AND_CONTROLS');
assert.equal(pass.nextCase, 'L7');
assert.equal(pass.productionPromotionAuthorized, false);
assert.equal(pass.summary.tangentialWithinGoalDelta, 1);
assert.equal(pass.summary.normalWithinGoalDelta, 0);

assert.throws(
  () => assessR8Nfv15({ baseline, experiment: { ...candidate, nfv15: { ...candidate.nfv15, threshold: 0.10 } } }),
  /NFV=0\.15/,
);
assert.throws(
  () => assessR8Nfv15({ baseline, experiment: { ...candidate, oneMechanicOnly: false } }),
  /oneMechanicOnly/,
);
const noEq = assessR8Nfv15({ baseline, experiment: { ...candidate, equilibriumStatus: 'FAIL' } });
assert.equal(noEq.nomination, 'REJECT_R8_MEASUREMENT_PHYSICS_OR_CUSTODY_GATE_FAILED');

process.stdout.write(`${JSON.stringify({
  schema: 'm047-r8-nfv15-assessor-contract/v1',
  status: 'PASS',
  checks: [
    'positive_nomination',
    'threshold_fail_closed',
    'one_mechanic_fail_closed',
    'equilibrium_fail_closed',
  ],
}, null, 2)}\n`);
