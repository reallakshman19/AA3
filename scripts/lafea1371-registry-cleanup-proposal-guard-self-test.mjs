#!/usr/bin/env node
import assert from 'node:assert/strict';

import {
  PROTECTED_LAFEA3_LIMITATION,
  PROTECTED_LAFEA3_LIMITATIONS,
  PROTECTED_LAFEA4_LIMITATION,
  PROTECTED_LAFEA4_LIMITATIONS,
  evaluateLafea1371RegistryClosureReadiness,
} from './lib/lafea1371-registry-closure-readiness.mjs';
import {
  evaluateLafea1371RegistryCleanupProposal,
} from './lib/lafea1371-registry-cleanup-proposal-guard.mjs';

const HEAD = 'a'.repeat(40);
const registry = validRegistry();
const readiness = evaluateLafea1371RegistryClosureReadiness({
  repositoryHead: HEAD,
  implementationAuthorizationVerification: validVerification(),
  lafea3RegistryEntry: registry.find((entry) => entry.stageId === 'LAFEA.3'),
  lafea4RegistryEntry: registry.find((entry) => entry.stageId === 'LAFEA.4'),
  stageRegistry: registry,
});

const candidate = preparedCandidate();
const positive = evaluateLafea1371RegistryCleanupProposal({
  readiness,
  candidateRegistry: candidate,
  changedPaths: [
    'src/workspace/lafea-stage-registry.js',
    'agents/PR9999_workreport.md',
    'agents/status/PR9999.yaml',
  ],
});
assert.equal(positive.status, 'PASS');
assert.equal(positive.disposition, 'STRUCTURALLY_ADMISSIBLE_FOR_HUMAN_WORDING_REVIEW');
assert.equal(positive.wordingApproved, false);
assert.equal(positive.mergeAuthorityGranted, false);
assert.deepEqual(positive.productionPaths, ['src/workspace/lafea-stage-registry.js']);

expectFailure('no wording change', (fixture) => {
  const row = fixture.candidateRegistry.find((entry) => entry.stageId === 'LAFEA.3');
  row.limitation = PROTECTED_LAFEA3_LIMITATION;
  row.limitations[1] = PROTECTED_LAFEA3_LIMITATIONS[1];
}, /did not replace the obsolete top-level limitation/u);

expectFailure('integration-point statement changed', (fixture) => {
  fixture.candidateRegistry.find((entry) => entry.stageId === 'LAFEA.3').limitations[0] = 'Nodal stress governs.';
}, /integration-point stress authority statement must remain unchanged/u);

expectFailure('continuum authority widened', (fixture) => {
  fixture.candidateRegistry.find((entry) => entry.stageId === 'LAFEA.3').authority = 'NONLINEAR_CONTINUUM';
}, /must not widen continuum authority/u);

expectFailure('LAFEA.4 changed', (fixture) => {
  fixture.candidateRegistry.find((entry) => entry.stageId === 'LAFEA.4').purpose = 'changed shell purpose';
}, /changes semantics outside the two permitted/u);

expectFailure('other stage changed', (fixture) => {
  fixture.candidateRegistry.find((entry) => entry.stageId === 'LAFEA.2').purpose = 'changed';
}, /changes semantics outside the two permitted/u);

expectFailure('extra production path', (fixture) => {
  fixture.changedPaths.push('src/core/local-continuum/solver.js');
}, /may mutate only the LAFEA stage registry/u);

process.stdout.write(`${JSON.stringify({
  schema: 'lafea1371-registry-cleanup-proposal-guard-self-test/v1',
  status: 'PASS',
  checks: {
    onlyTwoLafea3WordingFieldsStructurallyAdmissible: true,
    unchangedObsoleteWordingRejected: true,
    integrationPointAuthorityMutationRejected: true,
    continuumAuthorityWideningRejected: true,
    lafea4MutationRejected: true,
    otherStageMutationRejected: true,
    extraProductionPathRejected: true,
    wordingStillRequiresHumanReview: true,
  },
  engineeringMechanicsExecuted: false,
  wordingApproved: false,
  mergeAuthorityGranted: false,
  releaseAuthorityGranted: false,
}, null, 2)}\n`);

function expectFailure(label, mutate, pattern) {
  const fixture = {
    readiness,
    candidateRegistry: preparedCandidate(),
    changedPaths: ['src/workspace/lafea-stage-registry.js'],
  };
  mutate(fixture);
  assert.throws(() => evaluateLafea1371RegistryCleanupProposal(fixture), pattern, label);
}

function preparedCandidate() {
  const result = structuredClone(registry);
  const row = result.find((entry) => entry.stageId === 'LAFEA.3');
  row.limitation = 'Qualified retained-mesh orchestration is available within the registered continuum authority.';
  row.limitations[1] = 'Model-to-mesh-to-analysis orchestration remains limited to the registered qualified continuum route.';
  return result;
}

function validVerification() {
  return {
    schema: 'lafea-implementation-authorization-local-verification/v1',
    status: 'PASS',
    repository: 'reallaksh19/Advanced_Analysis',
    repositoryHead: HEAD,
    evidenceArtifactHash: `sha256:${'b'.repeat(64)}`,
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

function validRegistry() {
  return [
    genericStage('LAFEA.1', 'FOUNDATION_LOAD_TRANSFER', 'LOAD_TRANSFER_AND_PRESSURE_BASELINE_ONLY'),
    genericStage('LAFEA.2', 'PIPE_SECTION_SCREENING', 'NOMINAL_PIPE_SECTION_SCREENING_ONLY'),
    validLafea3(),
    validLafea4(),
    genericStage('LAFEA.5', 'TRUNNION_FOOTPRINT', 'CALLER_AUTHORED_HOST_SHELL_FOOTPRINT_ONLY'),
    genericStage('LAFEA.6', 'WELD_PROFILE_PLACEHOLDER', 'UNSUPPORTED_STAGE_ENGINE_NOT_IMPLEMENTED'),
  ];
}

function genericStage(stageId, category, authority) {
  return {
    schema: 'lafea-stage-registry/v2', stageId, label: stageId, purpose: `${stageId} purpose`,
    limitation: `${stageId} limitation`, category, authority,
    engineState: stageId === 'LAFEA.6' ? 'ENGINE_NOT_IMPLEMENTED' : 'QUALIFIED_ROUTE_REGISTERED',
    enginePackage: null, inputContractRole: `${stageId}_INPUT`, resultContractRole: null,
    presenterRole: null, unitSourceRole: null, previewPolicy: 'NO_GEOMETRY_AUTHORITY',
    previewSource: { nodePath: null, elementPath: null, editable: false }, collectionPaths: [],
    limitations: [`${stageId} limitation detail`],
  };
}

function validLafea3() {
  return {
    schema: 'lafea-stage-registry/v2', stageId: 'LAFEA.3', label: '2D continuum',
    purpose: 'T6/Q8 continuum with T3 fallback and benchmark support', category: 'CONTINUUM_2D',
    engineState: 'QUALIFIED_ROUTE_REGISTERED', authority: 'T3_T6_Q8_LINEAR_CONTINUUM',
    enginePackage: 'local-continuum', inputContractRole: 'LOCAL_CONTINUUM_MODEL',
    resultContractRole: 'LOCAL_CONTINUUM_RESULT', presenterRole: 'CONTINUUM_RESULT_EVIDENCE',
    unitSourceRole: 'DOCUMENT_UNITS', previewPolicy: 'SOURCE_MESH_EDITABLE',
    previewSource: { nodePath: 'nodes', elementPath: 'elements', editable: true },
    collectionPaths: ['materials', 'nodes', 'elements', 'constraints', 'loadCases'],
    limitation: PROTECTED_LAFEA3_LIMITATION, limitations: [...PROTECTED_LAFEA3_LIMITATIONS],
  };
}

function validLafea4() {
  return {
    schema: 'lafea-stage-registry/v2', stageId: 'LAFEA.4', label: 'Thin shell',
    purpose: 'Legacy five-DOF triangular CST+DKT thin-shell path', category: 'THIN_SHELL',
    engineState: 'QUALIFIED_ROUTE_REGISTERED', authority: 'CST_DKT_TRI3_THIN_SHELL_V1',
    enginePackage: 'local-shell', inputContractRole: 'LOCAL_SHELL_MODEL',
    resultContractRole: 'LOCAL_SHELL_RESULT', presenterRole: 'SHELL_RESULT_EVIDENCE',
    unitSourceRole: 'DOCUMENT_UNITS', previewPolicy: 'SOURCE_MESH_EDITABLE',
    previewSource: { nodePath: 'nodes', elementPath: 'elements', editable: true },
    collectionPaths: ['materials', 'nodes', 'elements', 'constraints', 'loadCases'],
    limitation: PROTECTED_LAFEA4_LIMITATION, limitations: [...PROTECTED_LAFEA4_LIMITATIONS],
  };
}
