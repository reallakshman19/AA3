#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  B02D_V2_GOVERNING_STATUS as S,
  classifyB02dV2GoverningResponse,
  verifyB02dV2BindingEnvelope,
} from './lib/lafea-b02d-v2-governing-response.js';

const HEAD = 'a'.repeat(40);
const binding = {
  schema: 'lafea-b02d-v2-binding-exact-head-envelope/v1',
  status: 'PASS',
  repositoryHead: HEAD,
  disposition: 'B02D_V2_BINDING_EXACT_HEAD_PASS',
  integratedB01Qualified: true,
  b02PrerequisiteEvidenceAvailable: true,
  b02dV2PreobservationQualityQualified: true,
  b02dV2BindingQualified: true,
  b02NumericalAuthorityGranted: false,
  responseSolverRepairAuthorized: false,
  reactionEquilibriumRepairAuthorized: false,
  releaseAuthorityGranted: false,
  trustAuthorityGranted: false,
  envelopeSha256: `sha256:${'b'.repeat(64)}`,
};
assert.equal(verifyB02dV2BindingEnvelope(binding, HEAD).status, S.PASS);
assert.throws(() => verifyB02dV2BindingEnvelope({ ...binding, repositoryHead: 'c'.repeat(40) }, HEAD));

const observation = (disposition) => ({
  schema: 'lafea-b02d-v2-governing-response-observation/v1',
  status: 'OBSERVED',
  disposition,
  b02NumericalAuthorityGranted: false,
  responseSolverRepairAuthorized: false,
  reactionEquilibriumRepairAuthorized: false,
  releaseAuthorityGranted: false,
  trustAuthorityGranted: false,
});

const cases = [
  { input: { bindingCommand: S.FAIL, bindingVerification: S.NOT_RUN, governingCommand: S.NOT_RUN, governingObservation: null }, expected: 'B02D_V2_BINDING_PREREQUISITE_NOT_QUALIFIED' },
  { input: { bindingCommand: S.PASS, bindingVerification: S.FAIL, governingCommand: S.NOT_RUN, governingObservation: null }, expected: 'B02D_V2_BINDING_RECEIPT_VERIFICATION_FAILED' },
  { input: { bindingCommand: S.PASS, bindingVerification: S.PASS, governingCommand: S.FAIL, governingObservation: null }, expected: 'B02D_V2_GOVERNING_RESPONSE_OBSERVER_FAILED' },
  { input: { bindingCommand: S.PASS, bindingVerification: S.PASS, governingCommand: S.PASS, governingObservation: observation('LOAD_ASSEMBLY_GATE_FAILURE_RCA_REQUIRED') }, expected: 'B02D_V2_LOAD_ASSEMBLY_RCA_REQUIRED', responseObserved: false },
  { input: { bindingCommand: S.PASS, bindingVerification: S.PASS, governingCommand: S.PASS, governingObservation: observation('GOVERNING_RESPONSE_ACCEPTED') }, expected: 'B02D_V2_GOVERNING_RESPONSE_ACCEPTED', ladder: true },
  { input: { bindingCommand: S.PASS, bindingVerification: S.PASS, governingCommand: S.PASS, governingObservation: observation('REACTION_EQUILIBRIUM_FAILURE_RCA_REQUIRED') }, expected: 'B02D_V2_REACTION_EQUILIBRIUM_RCA_REQUIRED', reactionRca: true },
  { input: { bindingCommand: S.PASS, bindingVerification: S.PASS, governingCommand: S.PASS, governingObservation: observation('ITERATIVE_SOLVER_FAILURE_RCA_REQUIRED') }, expected: 'B02D_V2_ITERATIVE_SOLVER_RCA_REQUIRED' },
  { input: { bindingCommand: S.PASS, bindingVerification: S.PASS, governingCommand: S.PASS, governingObservation: observation('FREE_DOF_RESIDUAL_FAILURE_RCA_REQUIRED') }, expected: 'B02D_V2_FREE_DOF_RESIDUAL_RCA_REQUIRED' },
];

for (const row of cases) {
  const result = classifyB02dV2GoverningResponse(row.input);
  assert.equal(result.disposition, row.expected);
  assert.equal(result.b02NumericalAuthorityGranted, false);
  assert.equal(result.responseSolverRepairAuthorized, false);
  assert.equal(result.reactionEquilibriumRepairAuthorized, false);
  assert.equal(result.historicalGalerkinCandidateAuthorized, false);
  assert.equal(result.releaseAuthorityGranted, false);
  assert.equal(result.trustAuthorityGranted, false);
  if (row.responseObserved === false) assert.equal(result.b02dV2GoverningResponseObserved, false);
  if (row.ladder) assert.equal(result.fullResponseLadderMayNowRun, true);
  if (row.reactionRca) assert.equal(result.reactionEquilibriumRcaRequired, true);
}
assert.throws(() => classifyB02dV2GoverningResponse({
  bindingCommand: S.FAIL,
  bindingVerification: S.PASS,
  governingCommand: S.NOT_RUN,
  governingObservation: null,
}));

console.log(JSON.stringify({
  schema: 'lafea-b02d-v2-governing-response-self-test/v2',
  status: 'PASS',
  cases: cases.length + 2,
  engineeringMechanicsExecuted: false,
  b02NumericalAuthorityGranted: false,
  reactionEquilibriumRepairAuthorized: false,
  releaseAuthorityGranted: false,
  trustAuthorityGranted: false,
}, null, 2));
