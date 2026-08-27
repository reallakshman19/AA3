export const B02D_V2_GATE_STATUS = Object.freeze({
  PASS: 'PASS',
  FAIL: 'FAIL',
  NOT_RUN: 'NOT_RUN',
});

export function verifyIntegratedB01Envelope(receipt, expectedHead) {
  requireObject(receipt, 'B01 envelope');
  requireEqual(receipt.schema, 'lafea-b01-integrated-exact-head-envelope/v1', 'B01.schema');
  requireEqual(receipt.status, 'PASS', 'B01.status');
  requireEqual(receipt.repositoryHead, expectedHead, 'B01.repositoryHead');
  requireEqual(receipt.disposition, 'INTEGRATED_B01_EXACT_HEAD_PASS', 'B01.disposition');
  requireEqual(receipt.integratedB01Qualified, true, 'B01.integratedB01Qualified');
  requireEqual(receipt.b02PrerequisiteEvidenceAvailable, true, 'B01.b02PrerequisiteEvidenceAvailable');
  requireEqual(receipt.solverRepairAuthorized, false, 'B01.solverRepairAuthorized');
  requireEqual(receipt.b02NumericalAuthorityGranted, false, 'B01.b02NumericalAuthorityGranted');
  requireEqual(receipt.releaseAuthorityGranted, false, 'B01.releaseAuthorityGranted');
  requireEqual(receipt.trustAuthorityGranted, false, 'B01.trustAuthorityGranted');
  return Object.freeze({
    status: B02D_V2_GATE_STATUS.PASS,
    repositoryHead: receipt.repositoryHead,
    disposition: receipt.disposition,
    envelopeSha256: receipt.envelopeSha256 ?? null,
  });
}

export function classifyB02dV2BindingExactHead({
  b01Command,
  b01Verification,
  preobservationCommand,
  bindingCommand,
}) {
  const b01 = requireStatus(b01Command, 'b01Command');
  const b01Verify = requireStatus(b01Verification, 'b01Verification');
  const preobs = requireStatus(preobservationCommand, 'preobservationCommand');
  const binding = requireStatus(bindingCommand, 'bindingCommand');

  if (b01 !== B02D_V2_GATE_STATUS.PASS) {
    requireEqual(b01Verify, B02D_V2_GATE_STATUS.NOT_RUN, 'b01Verification after B01 command failure');
    requireEqual(preobs, B02D_V2_GATE_STATUS.NOT_RUN, 'preobservationCommand after B01 command failure');
    requireEqual(binding, B02D_V2_GATE_STATUS.NOT_RUN, 'bindingCommand after B01 command failure');
    return disposition('B01_PREREQUISITE_EXECUTION_NOT_QUALIFIED', false, false, false);
  }
  if (b01Verify !== B02D_V2_GATE_STATUS.PASS) {
    requireEqual(preobs, B02D_V2_GATE_STATUS.NOT_RUN, 'preobservationCommand after B01 verification failure');
    requireEqual(binding, B02D_V2_GATE_STATUS.NOT_RUN, 'bindingCommand after B01 verification failure');
    return disposition('B01_PREREQUISITE_RECEIPT_VERIFICATION_FAILED', false, false, false);
  }
  if (preobs !== B02D_V2_GATE_STATUS.PASS) {
    requireEqual(binding, B02D_V2_GATE_STATUS.NOT_RUN, 'bindingCommand after pre-observation failure');
    return disposition('B02D_V2_PREOBSERVATION_QUALITY_FAILED', true, false, false);
  }
  if (binding !== B02D_V2_GATE_STATUS.PASS) {
    return disposition('B02D_V2_BINDING_FAILED_RCA_REQUIRED', true, true, false);
  }
  return disposition('B02D_V2_BINDING_EXACT_HEAD_PASS', true, true, true);
}

function disposition(code, b01Qualified, preobservationQualified, bindingQualified) {
  return Object.freeze({
    disposition: code,
    integratedB01Qualified: b01Qualified,
    b02PrerequisiteEvidenceAvailable: b01Qualified,
    b02dV2PreobservationQualityQualified: preobservationQualified,
    b02dV2BindingQualified: bindingQualified,
    b02NumericalAuthorityGranted: false,
    responseSolverRepairAuthorized: false,
    reactionEquilibriumRepairAuthorized: false,
    releaseAuthorityGranted: false,
    trustAuthorityGranted: false,
  });
}

function requireStatus(value, path) {
  if (!Object.values(B02D_V2_GATE_STATUS).includes(value)) {
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
