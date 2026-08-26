import assert from 'node:assert/strict';

export const LAFEA1371_REGISTRY_CLOSURE_READINESS_SCHEMA =
  'lafea1371-registry-closure-readiness/v1';

export const PROTECTED_LAFEA3_LIMITATION =
  'Production geometry-to-mesh-to-convergence orchestration is incomplete.';

export const PROTECTED_LAFEA3_LIMITATIONS = Object.freeze([
  'Integration-point stress is authoritative for T6/Q8; nodal projection is display-only.',
  'Production geometry-to-mesh-to-convergence orchestration is not complete.',
]);

export const PROTECTED_LAFEA4_LIMITATION =
  'No production MITC4/MITC3 or thick-shell authority.';

export const PROTECTED_LAFEA4_LIMITATIONS = Object.freeze([
  'Current production dispatch is the legacy five-DOF triangular thin-shell path.',
  'No production MITC4/MITC3 claim, drilling DOF, thick-shell claim, weld stress or code assessment.',
]);

export function evaluateLafea1371RegistryClosureReadiness({
  repositoryHead,
  implementationAuthorizationVerification,
  lafea3RegistryEntry,
  lafea4RegistryEntry,
} = {}) {
  assert.match(
    repositoryHead ?? '',
    /^[0-9a-f]{40}$/u,
    'Section 17 readiness requires the current exact repository HEAD',
  );

  requireImplementationAuthorizationVerification(
    implementationAuthorizationVerification,
    repositoryHead,
  );
  requireProtectedLafea3RegistryState(lafea3RegistryEntry);
  requireProtectedLafea4RegistryState(lafea4RegistryEntry);

  return Object.freeze({
    schema: LAFEA1371_REGISTRY_CLOSURE_READINESS_SCHEMA,
    status: 'PASS',
    disposition: 'READY_FOR_REGISTRY_CLEANUP_PR',
    issue: 1371,
    section: 17,
    repository: 'reallaksh19/Advanced_Analysis',
    qualifiedRepositoryHead: repositoryHead,
    implementationAuthorizationEvidenceHash:
      implementationAuthorizationVerification.evidenceArtifactHash,
    implementationAuthorizationEvidenceVerified: true,
    q1ToQ5: Object.freeze({
      q1: 'PASS',
      q2: 'PASS',
      q3: 'PASS',
      q4: 'PASS',
      q5: 'PASS',
    }),
    protectedRegistryStateObserved: Object.freeze({
      lafea3Limitation: PROTECTED_LAFEA3_LIMITATION,
      lafea3Authority: 'T3_T6_Q8_LINEAR_CONTINUUM',
      lafea4Limitation: PROTECTED_LAFEA4_LIMITATION,
      lafea4Authority: 'CST_DKT_TRI3_THIN_SHELL_V1',
    }),
    registryMutationPerformed: false,
    cleanupWordingAuthorizedByThisGate: false,
    cleanupProposalMayNowBeOpened: true,
    localGateAuthorityCreated: false,
    releaseAuthorityGranted: false,
  });
}

function requireImplementationAuthorizationVerification(verification, repositoryHead) {
  assertRecord(verification, 'implementation authorization verification');
  assert.equal(verification.schema, 'lafea-implementation-authorization-local-verification/v1');
  assert.equal(verification.status, 'PASS');
  assert.equal(
    verification.repository,
    'reallaksh19/Advanced_Analysis',
    'implementation authorization verification belongs to another repository',
  );
  assert.equal(
    verification.repositoryHead,
    repositoryHead,
    'Section 17 evidence is stale for the current repository HEAD',
  );
  assert.equal(verification.implementationAuthorizationEvidenceVerified, true);
  assert.equal(verification.retainedFileMatchesDelegatedEnvelope, true);
  assert.equal(verification.checkoutCleanAfterReceiptWrite, true);
  assert.equal(verification.q1DirectLoadedElementEvidence, 'PASS');
  assert.equal(verification.q3IndependentPressureEvidence, 'PASS');
  assert.equal(verification.localHarnessAuthorityCreated, false);
  assert.equal(verification.releaseAuthorityGranted, false);
  assert.match(
    verification.evidenceArtifactHash ?? '',
    /^sha256:[0-9a-f]{64}$/u,
    'implementation authorization evidence hash must be canonical SHA-256',
  );

  assertRecord(verification.q1ToQ5, 'implementation authorization Q1-Q5 disposition');
  for (const question of ['q1', 'q2', 'q3', 'q4', 'q5']) {
    assert.equal(
      verification.q1ToQ5[question],
      'PASS',
      `Section 17 requires ${question.toUpperCase()} exact-head PASS`,
    );
  }
}

function requireProtectedLafea3RegistryState(entry) {
  assertRecord(entry, 'LAFEA.3 registry entry');
  assert.equal(entry.schema, 'lafea-stage-registry/v2');
  assert.equal(entry.stageId, 'LAFEA.3');
  assert.equal(entry.category, 'CONTINUUM_2D');
  assert.equal(entry.engineState, 'QUALIFIED_ROUTE_REGISTERED');
  assert.equal(entry.authority, 'T3_T6_Q8_LINEAR_CONTINUUM');
  assert.equal(entry.enginePackage, 'local-continuum');
  assert.equal(entry.inputContractRole, 'LOCAL_CONTINUUM_MODEL');
  assert.equal(entry.resultContractRole, 'LOCAL_CONTINUUM_RESULT');
  assert.equal(entry.presenterRole, 'CONTINUUM_RESULT_EVIDENCE');
  assert.equal(
    entry.limitation,
    PROTECTED_LAFEA3_LIMITATION,
    'LAFEA.3 protected registry wording changed before Section 17 readiness',
  );
  assert.deepEqual(
    entry.limitations,
    PROTECTED_LAFEA3_LIMITATIONS,
    'LAFEA.3 protected limitations changed before Section 17 readiness',
  );
}

function requireProtectedLafea4RegistryState(entry) {
  assertRecord(entry, 'LAFEA.4 registry entry');
  assert.equal(entry.schema, 'lafea-stage-registry/v2');
  assert.equal(entry.stageId, 'LAFEA.4');
  assert.equal(entry.category, 'THIN_SHELL');
  assert.equal(entry.engineState, 'QUALIFIED_ROUTE_REGISTERED');
  assert.equal(entry.authority, 'CST_DKT_TRI3_THIN_SHELL_V1');
  assert.equal(entry.enginePackage, 'local-shell');
  assert.equal(entry.inputContractRole, 'LOCAL_SHELL_MODEL');
  assert.equal(entry.resultContractRole, 'LOCAL_SHELL_RESULT');
  assert.equal(entry.presenterRole, 'SHELL_RESULT_EVIDENCE');
  assert.equal(entry.limitation, PROTECTED_LAFEA4_LIMITATION);
  assert.deepEqual(
    entry.limitations,
    PROTECTED_LAFEA4_LIMITATIONS,
    'LAFEA.4 authority/exclusion wording changed during LAFEA.3 closure readiness',
  );
}

function assertRecord(value, label) {
  assert.ok(
    value && typeof value === 'object' && !Array.isArray(value),
    `${label} must be an object`,
  );
}
