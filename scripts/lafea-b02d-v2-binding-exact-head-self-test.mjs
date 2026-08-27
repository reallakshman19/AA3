#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  B02D_V2_GATE_STATUS as S,
  classifyB02dV2BindingExactHead,
  verifyIntegratedB01Envelope,
} from './lib/lafea-b02d-v2-binding-exact-head.js';

const head = 'a'.repeat(40);
const validB01 = {
  schema: 'lafea-b01-integrated-exact-head-envelope/v1',
  status: 'PASS',
  repositoryHead: head,
  disposition: 'INTEGRATED_B01_EXACT_HEAD_PASS',
  integratedB01Qualified: true,
  b02PrerequisiteEvidenceAvailable: true,
  solverRepairAuthorized: false,
  b02NumericalAuthorityGranted: false,
  releaseAuthorityGranted: false,
  trustAuthorityGranted: false,
  envelopeSha256: `sha256:${'b'.repeat(64)}`,
};
assert.equal(verifyIntegratedB01Envelope(validB01, head).status, S.PASS);
assert.throws(() => verifyIntegratedB01Envelope({ ...validB01, repositoryHead: 'c'.repeat(40) }, head));
assert.throws(() => verifyIntegratedB01Envelope({ ...validB01, b02PrerequisiteEvidenceAvailable: false }, head));

const blocked = classifyB02dV2BindingExactHead({
  b01Command: S.FAIL, b01Verification: S.NOT_RUN, preobservationCommand: S.NOT_RUN, bindingCommand: S.NOT_RUN,
});
assert.equal(blocked.disposition, 'B01_PREREQUISITE_EXECUTION_NOT_QUALIFIED');
assert.equal(blocked.b02dV2BindingQualified, false);

const badReceipt = classifyB02dV2BindingExactHead({
  b01Command: S.PASS, b01Verification: S.FAIL, preobservationCommand: S.NOT_RUN, bindingCommand: S.NOT_RUN,
});
assert.equal(badReceipt.disposition, 'B01_PREREQUISITE_RECEIPT_VERIFICATION_FAILED');

const badPreobs = classifyB02dV2BindingExactHead({
  b01Command: S.PASS, b01Verification: S.PASS, preobservationCommand: S.FAIL, bindingCommand: S.NOT_RUN,
});
assert.equal(badPreobs.disposition, 'B02D_V2_PREOBSERVATION_QUALITY_FAILED');
assert.equal(badPreobs.b02PrerequisiteEvidenceAvailable, true);
assert.equal(badPreobs.b02dV2PreobservationQualityQualified, false);

const badBinding = classifyB02dV2BindingExactHead({
  b01Command: S.PASS, b01Verification: S.PASS, preobservationCommand: S.PASS, bindingCommand: S.FAIL,
});
assert.equal(badBinding.disposition, 'B02D_V2_BINDING_FAILED_RCA_REQUIRED');
assert.equal(badBinding.b02dV2PreobservationQualityQualified, true);
assert.equal(badBinding.b02dV2BindingQualified, false);

const pass = classifyB02dV2BindingExactHead({
  b01Command: S.PASS, b01Verification: S.PASS, preobservationCommand: S.PASS, bindingCommand: S.PASS,
});
assert.equal(pass.disposition, 'B02D_V2_BINDING_EXACT_HEAD_PASS');
assert.equal(pass.integratedB01Qualified, true);
assert.equal(pass.b02dV2PreobservationQualityQualified, true);
assert.equal(pass.b02dV2BindingQualified, true);
assert.equal(pass.b02NumericalAuthorityGranted, false);
assert.equal(pass.reactionEquilibriumRepairAuthorized, false);
assert.equal(pass.releaseAuthorityGranted, false);
assert.equal(pass.trustAuthorityGranted, false);

assert.throws(() => classifyB02dV2BindingExactHead({
  b01Command: S.FAIL, b01Verification: S.NOT_RUN, preobservationCommand: S.PASS, bindingCommand: S.NOT_RUN,
}));

console.log(JSON.stringify({
  schema: 'lafea-b02d-v2-binding-exact-head-self-test/v1',
  status: 'PASS',
  cases: 7,
  engineeringMechanicsExecuted: false,
  b02NumericalAuthorityGranted: false,
  releaseAuthorityGranted: false,
  trustAuthorityGranted: false,
}, null, 2));
