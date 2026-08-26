#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  B01_GATE_STATUS as S,
  classifyIntegratedB01ExactHead,
  verifyHistoricalIntegratedReceipt,
  verifyPostNullspaceBoundaryReceipt,
} from './lib/lafea-b01-integrated-exact-head.js';

const HEAD = '1'.repeat(40);
const boundary = boundaryReceipt();
const integrated = integratedReceipt();
assert.equal(verifyPostNullspaceBoundaryReceipt(boundary, HEAD).status, 'PASS');
assert.equal(verifyHistoricalIntegratedReceipt(integrated, HEAD).status, 'PASS');

const passed = classifyIntegratedB01ExactHead({
  boundaryCommand: S.PASS,
  boundaryVerification: S.PASS,
  integratedCommand: S.PASS,
  integratedVerification: S.PASS,
});
assert.equal(passed.disposition, 'INTEGRATED_B01_EXACT_HEAD_PASS');
assert.equal(passed.integratedB01Qualified, true);
assert.equal(passed.solverRepairAuthorized, false);
assert.equal(passed.releaseAuthorityGranted, false);

assert.equal(classifyIntegratedB01ExactHead({
  boundaryCommand: S.FAIL,
  boundaryVerification: S.NOT_RUN,
  integratedCommand: S.NOT_RUN,
  integratedVerification: S.NOT_RUN,
}).disposition, 'POST_NULLSPACE_BOUNDARY_NOT_CLEARED');

assert.equal(classifyIntegratedB01ExactHead({
  boundaryCommand: S.PASS,
  boundaryVerification: S.FAIL,
  integratedCommand: S.NOT_RUN,
  integratedVerification: S.NOT_RUN,
}).disposition, 'POST_NULLSPACE_BOUNDARY_RECEIPT_VERIFICATION_FAILED');

assert.equal(classifyIntegratedB01ExactHead({
  boundaryCommand: S.PASS,
  boundaryVerification: S.PASS,
  integratedCommand: S.FAIL,
  integratedVerification: S.NOT_RUN,
}).disposition, 'INTEGRATED_B01_EXECUTION_FAILED_RCA_REQUIRED');

assert.equal(classifyIntegratedB01ExactHead({
  boundaryCommand: S.PASS,
  boundaryVerification: S.PASS,
  integratedCommand: S.PASS,
  integratedVerification: S.FAIL,
}).disposition, 'INTEGRATED_B01_RECEIPT_VERIFICATION_FAILED');

assert.throws(() => classifyIntegratedB01ExactHead({
  boundaryCommand: S.FAIL,
  boundaryVerification: S.NOT_RUN,
  integratedCommand: S.PASS,
  integratedVerification: S.PASS,
}), /after boundary command failure/u);

const wrongHead = integratedReceipt();
wrongHead.branchHead = '2'.repeat(40);
assert.throws(() => verifyHistoricalIntegratedReceipt(wrongHead, HEAD), /branchHead/u);

const wrongCount = integratedReceipt();
wrongCount.qualification.base.selectedRunCount = 53;
assert.throws(() => verifyHistoricalIntegratedReceipt(wrongCount, HEAD), /selectedRunCount/u);

const widenedAuthority = integratedReceipt();
widenedAuthority.releaseAuthorityGrantedByProgram = true;
assert.throws(() => verifyHistoricalIntegratedReceipt(widenedAuthority, HEAD), /releaseAuthorityGrantedByProgram/u);

console.log(JSON.stringify({
  schema: 'lafea-b01-integrated-exact-head-self-test/v1',
  status: 'PASS',
  cases: 9,
  integratedB01QualifiedOnlyOnFullPass: true,
  solverRepairAuthorized: false,
  b02NumericalAuthorityGranted: false,
  releaseAuthorityGranted: false,
}, null, 2));

function boundaryReceipt() {
  return {
    schema: 'lafea-b01-post-nullspace-boundary-receipt/v1',
    status: 'PASS', repositoryHead: HEAD,
    cleanTreeAtStart: true, cleanTreeAtEnd: true,
    disposition: 'POST_NULLSPACE_GOVERNING_CASE_CLEARED',
    solverRepairAuthorized: false, integratedB01Qualified: false,
    releaseAuthorityGranted: false, trustAuthorityGranted: false,
    commands: ['focused-nullspace', 'bbar-kernel', 'governing-lame'].map((id) => ({ id, exitCode: 0 })),
  };
}

function integratedReceipt() {
  const summary = (count) => ({
    status: 'PASS', qualified: true, selectedRunCount: count,
    expectedRunCount: count, passCount: count, failCount: 0,
  });
  return {
    schema: 'lafea-b01-final-integrated-receipt/v1',
    status: 'PASS', branchHead: HEAD, expectedBranchHead: HEAD,
    exactHeadMatchesExpectation: true, cleanTreeAtStart: true, cleanTreeAtEnd: true,
    frozenBaselineIsAncestor: true,
    route: { authority: 'T3_T6_Q8_LINEAR_CONTINUUM', enginePackage: 'local-continuum' },
    qualification: {
      allCommandsPassed: true, routeQualified: true,
      planeStrainBbar: { status: 'PASS', qualified: true, releaseAuthorityGranted: false, temperatureAuthorityGranted: false },
      base: summary(54), metamorphic: summary(270), failClosed: summary(16),
    },
    commands: [
      'independent-oracle', 'deterministic-meshes', 'shared-unit-contract',
      'prior-solver-control', 'prior-imposed-displacement-control', 'prior-t6-control',
      'prior-q8-control', 'plane-strain-bbar-qualification', 'registered-base-54',
      'metamorphic-270', 'fail-closed-16',
    ].map((id) => ({ id, exitCode: 0 })),
    releaseAuthorityGrantedByProgram: false,
    temperatureAuthorityGrantedByProgram: false,
    evidenceHash: 'sha256:fixture',
  };
}
