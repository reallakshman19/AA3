export const B01_GATE_STATUS = Object.freeze({
  PASS: 'PASS',
  FAIL: 'FAIL',
  NOT_RUN: 'NOT_RUN',
});

export function verifyPostNullspaceBoundaryReceipt(receipt, expectedHead) {
  requireObject(receipt, 'boundary receipt');
  requireEqual(receipt.schema, 'lafea-b01-post-nullspace-boundary-receipt/v1', 'boundary.schema');
  requireEqual(receipt.status, 'PASS', 'boundary.status');
  requireEqual(receipt.repositoryHead, expectedHead, 'boundary.repositoryHead');
  requireEqual(receipt.cleanTreeAtStart, true, 'boundary.cleanTreeAtStart');
  requireEqual(receipt.cleanTreeAtEnd, true, 'boundary.cleanTreeAtEnd');
  requireEqual(receipt.disposition, 'POST_NULLSPACE_GOVERNING_CASE_CLEARED', 'boundary.disposition');
  requireEqual(receipt.solverRepairAuthorized, false, 'boundary.solverRepairAuthorized');
  requireEqual(receipt.integratedB01Qualified, false, 'boundary.integratedB01Qualified');
  requireEqual(receipt.releaseAuthorityGranted, false, 'boundary.releaseAuthorityGranted');
  requireEqual(receipt.trustAuthorityGranted, false, 'boundary.trustAuthorityGranted');
  const expectedCommands = ['focused-nullspace', 'bbar-kernel', 'governing-lame'];
  requireCommandPasses(receipt.commands, expectedCommands, 'boundary.commands');
  return Object.freeze({
    status: 'PASS',
    repositoryHead: receipt.repositoryHead,
    disposition: receipt.disposition,
    commandIds: Object.freeze([...expectedCommands]),
  });
}

export function verifyHistoricalIntegratedReceipt(receipt, expectedHead) {
  requireObject(receipt, 'integrated receipt');
  requireEqual(receipt.schema, 'lafea-b01-final-integrated-receipt/v1', 'integrated.schema');
  requireEqual(receipt.status, 'PASS', 'integrated.status');
  requireEqual(receipt.branchHead, expectedHead, 'integrated.branchHead');
  requireEqual(receipt.expectedBranchHead, expectedHead, 'integrated.expectedBranchHead');
  requireEqual(receipt.exactHeadMatchesExpectation, true, 'integrated.exactHeadMatchesExpectation');
  requireEqual(receipt.cleanTreeAtStart, true, 'integrated.cleanTreeAtStart');
  requireEqual(receipt.cleanTreeAtEnd, true, 'integrated.cleanTreeAtEnd');
  requireEqual(receipt.frozenBaselineIsAncestor, true, 'integrated.frozenBaselineIsAncestor');
  requireEqual(receipt.route?.authority, 'T3_T6_Q8_LINEAR_CONTINUUM', 'integrated.route.authority');
  requireEqual(receipt.route?.enginePackage, 'local-continuum', 'integrated.route.enginePackage');
  requireEqual(receipt.qualification?.allCommandsPassed, true, 'integrated.qualification.allCommandsPassed');
  requireEqual(receipt.qualification?.routeQualified, true, 'integrated.qualification.routeQualified');
  requireEqual(receipt.qualification?.planeStrainBbar?.status, 'PASS', 'integrated.qualification.planeStrainBbar.status');
  requireEqual(receipt.qualification?.planeStrainBbar?.qualified, true, 'integrated.qualification.planeStrainBbar.qualified');
  requireEqual(receipt.qualification?.planeStrainBbar?.releaseAuthorityGranted, false, 'integrated.qualification.planeStrainBbar.releaseAuthorityGranted');
  requireEqual(receipt.qualification?.planeStrainBbar?.temperatureAuthorityGranted, false, 'integrated.qualification.planeStrainBbar.temperatureAuthorityGranted');
  requireQualifiedCount(receipt.qualification?.base, 54, 'integrated.qualification.base');
  requireQualifiedCount(receipt.qualification?.metamorphic, 270, 'integrated.qualification.metamorphic');
  requireQualifiedCount(receipt.qualification?.failClosed, 16, 'integrated.qualification.failClosed');
  requireEqual(receipt.releaseAuthorityGrantedByProgram, false, 'integrated.releaseAuthorityGrantedByProgram');
  requireEqual(receipt.temperatureAuthorityGrantedByProgram, false, 'integrated.temperatureAuthorityGrantedByProgram');
  const expectedCommands = [
    'independent-oracle',
    'deterministic-meshes',
    'shared-unit-contract',
    'prior-solver-control',
    'prior-imposed-displacement-control',
    'prior-t6-control',
    'prior-q8-control',
    'plane-strain-bbar-qualification',
    'registered-base-54',
    'metamorphic-270',
    'fail-closed-16',
  ];
  requireCommandPasses(receipt.commands, expectedCommands, 'integrated.commands');
  return Object.freeze({
    status: 'PASS',
    repositoryHead: receipt.branchHead,
    evidenceHash: receipt.evidenceHash,
    baseRunCount: 54,
    metamorphicRunCount: 270,
    failClosedRunCount: 16,
  });
}

export function classifyIntegratedB01ExactHead({
  boundaryCommand,
  boundaryVerification,
  integratedCommand,
  integratedVerification,
}) {
  const bCommand = requireStatus(boundaryCommand, 'boundaryCommand');
  const bVerify = requireStatus(boundaryVerification, 'boundaryVerification');
  const iCommand = requireStatus(integratedCommand, 'integratedCommand');
  const iVerify = requireStatus(integratedVerification, 'integratedVerification');

  if (bCommand !== B01_GATE_STATUS.PASS) {
    requireEqual(bVerify, B01_GATE_STATUS.NOT_RUN, 'boundaryVerification after boundary command failure');
    requireEqual(iCommand, B01_GATE_STATUS.NOT_RUN, 'integratedCommand after boundary command failure');
    requireEqual(iVerify, B01_GATE_STATUS.NOT_RUN, 'integratedVerification after boundary command failure');
    return disposition('POST_NULLSPACE_BOUNDARY_NOT_CLEARED', false);
  }
  if (bVerify !== B01_GATE_STATUS.PASS) {
    requireEqual(iCommand, B01_GATE_STATUS.NOT_RUN, 'integratedCommand after boundary verification failure');
    requireEqual(iVerify, B01_GATE_STATUS.NOT_RUN, 'integratedVerification after boundary verification failure');
    return disposition('POST_NULLSPACE_BOUNDARY_RECEIPT_VERIFICATION_FAILED', false);
  }
  if (iCommand !== B01_GATE_STATUS.PASS) {
    requireEqual(iVerify, B01_GATE_STATUS.NOT_RUN, 'integratedVerification after integrated command failure');
    return disposition('INTEGRATED_B01_EXECUTION_FAILED_RCA_REQUIRED', false);
  }
  if (iVerify !== B01_GATE_STATUS.PASS) {
    return disposition('INTEGRATED_B01_RECEIPT_VERIFICATION_FAILED', false);
  }
  return disposition('INTEGRATED_B01_EXACT_HEAD_PASS', true);
}

function disposition(code, qualified) {
  return Object.freeze({
    disposition: code,
    integratedB01Qualified: qualified,
    b02PrerequisiteEvidenceAvailable: qualified,
    solverRepairAuthorized: false,
    b02NumericalAuthorityGranted: false,
    releaseAuthorityGranted: false,
    trustAuthorityGranted: false,
  });
}

function requireQualifiedCount(value, expected, path) {
  requireObject(value, path);
  requireEqual(value.qualified, true, `${path}.qualified`);
  requireEqual(value.status, 'PASS', `${path}.status`);
  requireEqual(value.expectedRunCount, expected, `${path}.expectedRunCount`);
  requireEqual(value.selectedRunCount, expected, `${path}.selectedRunCount`);
  requireEqual(value.passCount, expected, `${path}.passCount`);
  requireEqual(value.failCount, 0, `${path}.failCount`);
}

function requireCommandPasses(commands, expectedIds, path) {
  if (!Array.isArray(commands)) throw new TypeError(`${path} must be an array.`);
  const byId = new Map(commands.map((row) => [row?.id, row]));
  for (const id of expectedIds) {
    const row = byId.get(id);
    requireObject(row, `${path}.${id}`);
    requireEqual(row.exitCode, 0, `${path}.${id}.exitCode`);
  }
}

function requireStatus(value, path) {
  if (!Object.values(B01_GATE_STATUS).includes(value)) {
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
