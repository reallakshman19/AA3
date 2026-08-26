#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  classifyPostNullspaceBoundary,
  POST_NULLSPACE_COMMAND_STATUS as S,
} from './lib/lafea-b01-post-nullspace-boundary.js';

const allPass = classifyPostNullspaceBoundary({
  focusedNullspace: S.PASS,
  kernel: S.PASS,
  governingLame: S.PASS,
});
assert.equal(allPass.disposition, 'POST_NULLSPACE_GOVERNING_CASE_CLEARED');

const focusedFail = classifyPostNullspaceBoundary({
  focusedNullspace: S.FAIL,
  kernel: S.NOT_RUN,
  governingLame: S.NOT_RUN,
});
assert.equal(focusedFail.disposition, 'ELEMENT_NULLSPACE_REPAIR_NOT_QUALIFIED');

const kernelFail = classifyPostNullspaceBoundary({
  focusedNullspace: S.PASS,
  kernel: S.FAIL,
  governingLame: S.NOT_RUN,
});
assert.equal(kernelFail.disposition, 'BBAR_KERNEL_REGRESSION_REQUIRES_RCA');

const governingFail = classifyPostNullspaceBoundary({
  focusedNullspace: S.PASS,
  kernel: S.PASS,
  governingLame: S.FAIL,
});
assert.equal(governingFail.disposition, 'GOVERNING_LAME_CASE_FAILED_RCA_REQUIRED');

for (const result of [allPass, focusedFail, kernelFail, governingFail]) {
  assert.equal(result.solverRepairAuthorized, false);
  assert.equal(result.integratedB01Qualified, false);
  assert.equal(result.releaseAuthorityGranted, false);
  assert.equal(result.trustAuthorityGranted, false);
}

assert.throws(() => classifyPostNullspaceBoundary({
  focusedNullspace: S.FAIL,
  kernel: S.PASS,
  governingLame: S.NOT_RUN,
}), /sequential execution/u);
assert.throws(() => classifyPostNullspaceBoundary({
  focusedNullspace: S.PASS,
  kernel: S.FAIL,
  governingLame: S.PASS,
}), /sequential execution/u);

console.log(JSON.stringify({
  schema: 'lafea-b01-post-nullspace-boundary-self-test/v1',
  status: 'PASS',
  cases: 6,
  solverRepairAuthorized: false,
  integratedB01Qualified: false,
  releaseAuthorityGranted: false,
}, null, 2));
