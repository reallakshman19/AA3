#!/usr/bin/env node
import assert from 'node:assert/strict';

import {
  PROTECTED_LAFEA3_LIMITATION,
  PROTECTED_LAFEA3_LIMITATIONS,
  PROTECTED_LAFEA4_LIMITATION,
  PROTECTED_LAFEA4_LIMITATIONS,
  evaluateLafea1371RegistryClosureReadiness,
} from './lib/lafea1371-registry-closure-readiness.mjs';

const HEAD = 'a'.repeat(40);
const HASH = `sha256:${'b'.repeat(64)}`;

const base = Object.freeze({
  repositoryHead: HEAD,
  implementationAuthorizationVerification: validVerification(),
  lafea3RegistryEntry: validLafea3(),
  lafea4RegistryEntry: validLafea4(),
});

const positive = evaluateLafea1371RegistryClosureReadiness(clone(base));
assert.equal(positive.status, 'PASS');
assert.equal(positive.disposition, 'READY_FOR_REGISTRY_CLEANUP_PR');
assert.equal(positive.qualifiedRepositoryHead, HEAD);
assert.equal(positive.implementationAuthorizationEvidenceHash, HASH);
assert.equal(positive.registryMutationPerformed, false);
assert.equal(positive.cleanupWordingAuthorizedByThisGate, false);
assert.equal(positive.cleanupProposalMayNowBeOpened, true);
assert.equal(positive.releaseAuthorityGranted, false);

expectFailure('stale evidence head', (fixture) => {
  fixture.implementationAuthorizationVerification.repositoryHead = 'c'.repeat(40);
}, /stale for the current repository HEAD/u);

expectFailure('incomplete Q1-Q5', (fixture) => {
  fixture.implementationAuthorizationVerification.q1ToQ5.q4 = 'NOT_RUN';
}, /Q4 exact-head PASS/u);

expectFailure('release authority contamination', (fixture) => {
  fixture.implementationAuthorizationVerification.releaseAuthorityGranted = true;
}, /true !== false/u);

expectFailure('premature LAFEA.3 wording softening', (fixture) => {
  fixture.lafea3RegistryEntry.limitation = 'Production orchestration complete.';
}, /protected registry wording changed before Section 17 readiness/u);

expectFailure('premature LAFEA.3 detailed limitation softening', (fixture) => {
  fixture.lafea3RegistryEntry.limitations[1] = 'Production orchestration complete.';
}, /protected limitations changed before Section 17 readiness/u);

expectFailure('LAFEA.4 authority widening', (fixture) => {
  fixture.lafea4RegistryEntry.authority = 'MITC4_PRODUCTION';
}, /CST_DKT_TRI3_THIN_SHELL_V1/u);

expectFailure('LAFEA.4 exclusion weakening', (fixture) => {
  fixture.lafea4RegistryEntry.limitations[1] = 'MITC4 production claim permitted.';
}, /authority\/exclusion wording changed/u);

process.stdout.write(`${JSON.stringify({
  schema: 'lafea1371-registry-closure-readiness-self-test/v1',
  status: 'PASS',
  checks: {
    validEvidenceAndProtectedRegistryBecomeReady: true,
    staleEvidenceHeadRejected: true,
    incompleteQ1ToQ5Rejected: true,
    releaseAuthorityContaminationRejected: true,
    prematureLafea3RegistrySofteningRejected: true,
    lafea4AuthorityWideningRejected: true,
    lafea4ExclusionWeakeningRejected: true,
  },
  engineeringMechanicsExecuted: false,
  registryMutationPerformed: false,
  releaseAuthorityGranted: false,
}, null, 2)}\n`);

function expectFailure(label, mutate, pattern) {
  const fixture = clone(base);
  mutate(fixture);
  assert.throws(
    () => evaluateLafea1371RegistryClosureReadiness(fixture),
    pattern,
    label,
  );
}

function validVerification() {
  return {
    schema: 'lafea-implementation-authorization-local-verification/v1',
    status: 'PASS',
    repository: 'reallaksh19/Advanced_Analysis',
    repositoryHead: HEAD,
    evidenceArtifactHash: HASH,
    q1ToQ5: { q1: 'PASS', q2: 'PASS', q3: 'PASS', q4: 'PASS', q5: 'PASS' },
    q1DirectLoadedElementEvidence: 'PASS',
    q3IndependentPressureEvidence: 'PASS',
    retainedFileMatchesDelegatedEnvelope: true,
    checkoutCleanAfterReceiptWrite: true,
    implementationAuthorizationEvidenceVerified: true,
    localHarnessAuthorityCreated: false,
    releaseAuthorityGranted: false,
  };
}

function validLafea3() {
  return {
    schema: 'lafea-stage-registry/v2',
    stageId: 'LAFEA.3',
    category: 'CONTINUUM_2D',
    engineState: 'QUALIFIED_ROUTE_REGISTERED',
    authority: 'T3_T6_Q8_LINEAR_CONTINUUM',
    enginePackage: 'local-continuum',
    inputContractRole: 'LOCAL_CONTINUUM_MODEL',
    resultContractRole: 'LOCAL_CONTINUUM_RESULT',
    presenterRole: 'CONTINUUM_RESULT_EVIDENCE',
    limitation: PROTECTED_LAFEA3_LIMITATION,
    limitations: [...PROTECTED_LAFEA3_LIMITATIONS],
  };
}

function validLafea4() {
  return {
    schema: 'lafea-stage-registry/v2',
    stageId: 'LAFEA.4',
    category: 'THIN_SHELL',
    engineState: 'QUALIFIED_ROUTE_REGISTERED',
    authority: 'CST_DKT_TRI3_THIN_SHELL_V1',
    enginePackage: 'local-shell',
    inputContractRole: 'LOCAL_SHELL_MODEL',
    resultContractRole: 'LOCAL_SHELL_RESULT',
    presenterRole: 'SHELL_RESULT_EVIDENCE',
    limitation: PROTECTED_LAFEA4_LIMITATION,
    limitations: [...PROTECTED_LAFEA4_LIMITATIONS],
  };
}

function clone(value) {
  return structuredClone(value);
}
