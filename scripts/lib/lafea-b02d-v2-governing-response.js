export const B02D_V2_GOVERNING_STATUS = Object.freeze({
  PASS: 'PASS',
  FAIL: 'FAIL',
  NOT_RUN: 'NOT_RUN',
});

export function verifyB02dV2BindingEnvelope(receipt, expectedHead) {
  requireObject(receipt, 'binding envelope');
  requireEqual(receipt.schema, 'lafea-b02d-v2-binding-exact-head-envelope/v1', 'binding.schema');
  requireEqual(receipt.status, 'PASS', 'binding.status');
  requireEqual(receipt.repositoryHead, expectedHead, 'binding.repositoryHead');
  requireEqual(receipt.disposition, 'B02D_V2_BINDING_EXACT_HEAD_PASS', 'binding.disposition');
  requireEqual(receipt.integratedB01Qualified, true, 'binding.integratedB01Qualified');
  requireEqual(receipt.b02PrerequisiteEvidenceAvailable, true, 'binding.b02PrerequisiteEvidenceAvailable');
  requireEqual(receipt.b02dV2PreobservationQualityQualified, true, 'binding.b02dV2PreobservationQualityQualified');
  requireEqual(receipt.b02dV2BindingQualified, true, 'binding.b02dV2BindingQualified');
  requireEqual(receipt.b02NumericalAuthorityGranted, false, 'binding.b02NumericalAuthorityGranted');
  requireEqual(receipt.responseSolverRepairAuthorized, false, 'binding.responseSolverRepairAuthorized');
  requireEqual(receipt.reactionEquilibriumRepairAuthorized, false, 'binding.reactionEquilibriumRepairAuthorized');
  requireEqual(receipt.releaseAuthorityGranted, false, 'binding.releaseAuthorityGranted');
  requireEqual(receipt.trustAuthorityGranted, false, 'binding.trustAuthorityGranted');
  return Object.freeze({
    status: B02D_V2_GOVERNING_STATUS.PASS,
    repositoryHead: receipt.repositoryHead,
    envelopeSha256: receipt.envelopeSha256 ?? null,
  });
}

export function classifyB02dV2GoverningResponse({
  bindingCommand,
  bindingVerification,
  governingCommand,
  governingObservation,
}) {
  const binding = requireStatus(bindingCommand, 'bindingCommand');
  const bindingVerify = requireStatus(bindingVerification, 'bindingVerification');
  const governing = requireStatus(governingCommand, 'governingCommand');
  const observation = governingObservation === null ? null : requireObservation(governingObservation);

  if (binding !== B02D_V2_GOVERNING_STATUS.PASS) {
    requireEqual(bindingVerify, B02D_V2_GOVERNING_STATUS.NOT_RUN, 'bindingVerification after binding command failure');
    requireEqual(governing, B02D_V2_GOVERNING_STATUS.NOT_RUN, 'governingCommand after binding command failure');
    requireEqual(observation, null, 'governingObservation after binding command failure');
    return disposition('B02D_V2_BINDING_PREREQUISITE_NOT_QUALIFIED', false, false, false, false);
  }
  if (bindingVerify !== B02D_V2_GOVERNING_STATUS.PASS) {
    requireEqual(governing, B02D_V2_GOVERNING_STATUS.NOT_RUN, 'governingCommand after binding verification failure');
    requireEqual(observation, null, 'governingObservation after binding verification failure');
    return disposition('B02D_V2_BINDING_RECEIPT_VERIFICATION_FAILED', false, false, false, false);
  }
  if (governing !== B02D_V2_GOVERNING_STATUS.PASS) {
    requireEqual(observation, null, 'governingObservation after governing command failure');
    return disposition('B02D_V2_GOVERNING_RESPONSE_OBSERVER_FAILED', true, false, false, false);
  }
  if (!observation) throw new TypeError('governingObservation required after governing command PASS.');

  if (observation.disposition === 'GOVERNING_RESPONSE_ACCEPTED') {
    return disposition('B02D_V2_GOVERNING_RESPONSE_ACCEPTED', true, true, true, false);
  }
  if (observation.disposition === 'REACTION_EQUILIBRIUM_FAILURE_RCA_REQUIRED') {
    return disposition('B02D_V2_REACTION_EQUILIBRIUM_RCA_REQUIRED', true, true, false, true);
  }
  if (observation.disposition === 'ITERATIVE_SOLVER_FAILURE_RCA_REQUIRED') {
    return disposition('B02D_V2_ITERATIVE_SOLVER_RCA_REQUIRED', true, true, false, false);
  }
  if (observation.disposition === 'FREE_DOF_RESIDUAL_FAILURE_RCA_REQUIRED') {
    return disposition('B02D_V2_FREE_DOF_RESIDUAL_RCA_REQUIRED', true, true, false, false);
  }
  return disposition('B02D_V2_OTHER_GOVERNING_RESPONSE_RCA_REQUIRED', true, true, false, false);
}

function disposition(code, bindingQualified, responseObserved, governingAccepted, reactionRcaRequired) {
  return Object.freeze({
    disposition: code,
    b02dV2BindingQualified: bindingQualified,
    b02dV2GoverningResponseObserved: responseObserved,
    b02dV2GoverningResponseAccepted: governingAccepted,
    fullResponseLadderMayNowRun: governingAccepted,
    reactionEquilibriumRcaRequired: reactionRcaRequired,
    b02NumericalAuthorityGranted: false,
    responseSolverRepairAuthorized: false,
    reactionEquilibriumRepairAuthorized: false,
    historicalGalerkinCandidateAuthorized: false,
    releaseAuthorityGranted: false,
    trustAuthorityGranted: false,
  });
}

function requireObservation(value) {
  requireObject(value, 'governingObservation');
  requireEqual(value.schema, 'lafea-b02d-v2-governing-response-observation/v1', 'governingObservation.schema');
  requireEqual(value.status, 'OBSERVED', 'governingObservation.status');
  if (typeof value.disposition !== 'string' || !value.disposition) {
    throw new TypeError('governingObservation.disposition must be a non-empty string.');
  }
  requireEqual(value.b02NumericalAuthorityGranted, false, 'governingObservation.b02NumericalAuthorityGranted');
  requireEqual(value.responseSolverRepairAuthorized, false, 'governingObservation.responseSolverRepairAuthorized');
  requireEqual(value.reactionEquilibriumRepairAuthorized, false, 'governingObservation.reactionEquilibriumRepairAuthorized');
  requireEqual(value.releaseAuthorityGranted, false, 'governingObservation.releaseAuthorityGranted');
  requireEqual(value.trustAuthorityGranted, false, 'governingObservation.trustAuthorityGranted');
  return value;
}

function requireStatus(value, path) {
  if (!Object.values(B02D_V2_GOVERNING_STATUS).includes(value)) {
    throw new TypeError(`${path} must be PASS, FAIL, or NOT_RUN.`);
  }
  return value;
}
function requireObject(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${path} must be an object.`);
  }
}
function requireEqual(actual, expected, path) {
  if (actual !== expected) {
    throw new TypeError(`${path} expected ${JSON.stringify(expected)} but received ${JSON.stringify(actual)}.`);
  }
}
