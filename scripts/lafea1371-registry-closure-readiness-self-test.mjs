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
  stageRegistry: validRegistry(),
  stageRegistrySource: validRegistrySource(),
});

const positive = evaluateLafea1371RegistryClosureReadiness(clone(base));
assert.equal(positive.status, 'PASS');
assert.equal(positive.disposition, 'READY_FOR_REGISTRY_CLEANUP_PR');
assert.equal(positive.qualifiedRepositoryHead, HEAD);
assert.equal(positive.implementationAuthorizationEvidenceHash, HASH);
assert.match(positive.registryBaselineHash, /^sha256:[0-9a-f]{64}$/u);
assert.match(positive.registrySourceHash, /^sha256:[0-9a-f]{64}$/u);
assert.match(positive.registrySourceTemplateHash, /^sha256:[0-9a-f]{64}$/u);
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
}, /must not contain release authority/u);
expectFailure('premature LAFEA.3 wording softening', (fixture) => {
  fixture.lafea3RegistryEntry.limitation = 'Production orchestration complete.';
}, /protected registry wording changed before Section 17 readiness/u);
expectFailure('LAFEA.4 authority widening', (fixture) => {
  fixture.lafea4RegistryEntry.authority = 'MITC4_PRODUCTION';
}, /CST\+DKT authority changed/u);
expectFailure('full registry missing LAFEA.4', (fixture) => {
  fixture.stageRegistry = fixture.stageRegistry.filter((entry) => entry.stageId !== 'LAFEA.4');
}, /missing LAFEA\.4/u);
expectFailure('protected source wording changed independently', (fixture) => {
  fixture.stageRegistrySource = fixture.stageRegistrySource.replace(
    PROTECTED_LAFEA3_LIMITATION,
    'Production orchestration complete.',
  );
}, /protected top-level wording is not the qualified source literal/u);
expectFailure('source representation stopped being canonical literal', (fixture) => {
  fixture.stageRegistrySource = fixture.stageRegistrySource.replace(
    `    limitation: '${PROTECTED_LAFEA3_LIMITATION}',`,
    `    limitation: PROTECTED_LIMITATION,`,
  );
}, /canonical top-level limitation literal/u);

const modifiedRegistry = validRegistry();
modifiedRegistry.find((entry) => entry.stageId === 'LAFEA.2').purpose = 'changed';
const changedBaseline = evaluateLafea1371RegistryClosureReadiness({
  ...clone(base), stageRegistry: modifiedRegistry,
});
assert.notEqual(changedBaseline.registryBaselineHash, positive.registryBaselineHash);

const sourceDrift = evaluateLafea1371RegistryClosureReadiness({
  ...clone(base),
  stageRegistrySource: `${validRegistrySource()}\n// unrelated source drift\n`,
});
assert.notEqual(sourceDrift.registrySourceHash, positive.registrySourceHash);
assert.notEqual(sourceDrift.registrySourceTemplateHash, positive.registrySourceTemplateHash,
  'registry source template hash must cover bytes outside the two wording literals');

process.stdout.write(`${JSON.stringify({
  schema: 'lafea1371-registry-closure-readiness-self-test/v3',
  status: 'PASS',
  checks: {
    validEvidenceAndProtectedRegistryBecomeReady: true,
    registryBaselineHashRetained: true,
    registrySourceHashRetained: true,
    registrySourceTemplateHashRetained: true,
    registrySourceTemplateCoversNonWordingBytes: true,
    protectedSourceWordingRequired: true,
    canonicalSourceLiteralShapeRequired: true,
    staleEvidenceHeadRejected: true,
    incompleteQ1ToQ5Rejected: true,
    releaseAuthorityContaminationRejected: true,
    prematureLafea3RegistrySofteningRejected: true,
    lafea4AuthorityWideningRejected: true,
    incompleteFullRegistryRejected: true,
  },
  engineeringMechanicsExecuted: false,
  registryMutationPerformed: false,
  releaseAuthorityGranted: false,
}, null, 2)}\n`);

function expectFailure(label, mutate, pattern) {
  const fixture = clone(base);
  mutate(fixture);
  assert.throws(() => evaluateLafea1371RegistryClosureReadiness(fixture), pattern, label);
}
function validVerification() {
  return {
    schema: 'lafea-implementation-authorization-local-verification/v1', status: 'PASS',
    repository: 'reallaksh19/Advanced_Analysis', repositoryHead: HEAD, evidenceArtifactHash: HASH,
    q1ToQ5: { q1: 'PASS', q2: 'PASS', q3: 'PASS', q4: 'PASS', q5: 'PASS' },
    q1DirectLoadedElementEvidence: 'PASS', q3IndependentPressureEvidence: 'PASS',
    retainedFileMatchesDelegatedEnvelope: true, checkoutCleanAfterReceiptWrite: true,
    implementationAuthorizationEvidenceVerified: true, localHarnessAuthorityCreated: false,
    releaseAuthorityGranted: false,
  };
}
function validRegistry() {
  return [genericStage('LAFEA.1','FOUNDATION_LOAD_TRANSFER','LOAD_TRANSFER_AND_PRESSURE_BASELINE_ONLY'),
    genericStage('LAFEA.2','PIPE_SECTION_SCREENING','NOMINAL_PIPE_SECTION_SCREENING_ONLY'),
    validLafea3(), validLafea4(),
    genericStage('LAFEA.5','TRUNNION_FOOTPRINT','CALLER_AUTHORED_HOST_SHELL_FOOTPRINT_ONLY'),
    genericStage('LAFEA.6','WELD_PROFILE_PLACEHOLDER','UNSUPPORTED_STAGE_ENGINE_NOT_IMPLEMENTED')];
}
function genericStage(stageId, category, authority) {
  return { schema:'lafea-stage-registry/v2', stageId, label:stageId, purpose:`${stageId} purpose`,
    limitation:`${stageId} limitation`, category, authority,
    engineState:stageId==='LAFEA.6'?'ENGINE_NOT_IMPLEMENTED':'QUALIFIED_ROUTE_REGISTERED',
    enginePackage:null, inputContractRole:`${stageId}_INPUT`, resultContractRole:null,
    presenterRole:null, unitSourceRole:null, previewPolicy:'NO_GEOMETRY_AUTHORITY',
    previewSource:{nodePath:null,elementPath:null,editable:false}, collectionPaths:[],
    limitations:[`${stageId} limitation detail`] };
}
function validLafea3() {
  return { schema:'lafea-stage-registry/v2', stageId:'LAFEA.3', label:'2D continuum',
    purpose:'T6/Q8 continuum with T3 fallback and benchmark support', category:'CONTINUUM_2D',
    engineState:'QUALIFIED_ROUTE_REGISTERED', authority:'T3_T6_Q8_LINEAR_CONTINUUM',
    enginePackage:'local-continuum', inputContractRole:'LOCAL_CONTINUUM_MODEL',
    resultContractRole:'LOCAL_CONTINUUM_RESULT', presenterRole:'CONTINUUM_RESULT_EVIDENCE',
    unitSourceRole:'DOCUMENT_UNITS', previewPolicy:'SOURCE_MESH_EDITABLE',
    previewSource:{nodePath:'nodes',elementPath:'elements',editable:true},
    collectionPaths:['materials','nodes','elements','constraints','loadCases'],
    limitation:PROTECTED_LAFEA3_LIMITATION, limitations:[...PROTECTED_LAFEA3_LIMITATIONS] };
}
function validLafea4() {
  return { schema:'lafea-stage-registry/v2', stageId:'LAFEA.4', label:'Thin shell',
    purpose:'Legacy five-DOF triangular CST+DKT thin-shell path', category:'THIN_SHELL',
    engineState:'QUALIFIED_ROUTE_REGISTERED', authority:'CST_DKT_TRI3_THIN_SHELL_V1',
    enginePackage:'local-shell', inputContractRole:'LOCAL_SHELL_MODEL', resultContractRole:'LOCAL_SHELL_RESULT',
    presenterRole:'SHELL_RESULT_EVIDENCE', unitSourceRole:'DOCUMENT_UNITS', previewPolicy:'SOURCE_MESH_EDITABLE',
    previewSource:{nodePath:'nodes',elementPath:'elements',editable:true},
    collectionPaths:['materials','nodes','elements','constraints','loadCases'],
    limitation:PROTECTED_LAFEA4_LIMITATION, limitations:[...PROTECTED_LAFEA4_LIMITATIONS] };
}
function validRegistrySource() {
  return `export const LAFEA_STAGE_REGISTRY = Object.freeze([\n  entry({\n    stageId: 'LAFEA.3',\n    label: '2D continuum',\n    limitation: '${PROTECTED_LAFEA3_LIMITATION}',\n    limitations: [\n      '${PROTECTED_LAFEA3_LIMITATIONS[0]}',\n      '${PROTECTED_LAFEA3_LIMITATIONS[1]}',\n    ],\n  }),\n  entry({\n    stageId: 'LAFEA.4',\n    label: 'Thin shell',\n  }),\n]);\nfunction helper() { return true; }\n`;
}
function clone(value) { return structuredClone(value); }
