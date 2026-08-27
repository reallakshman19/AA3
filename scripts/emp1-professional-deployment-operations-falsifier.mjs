#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const checker = resolve(root, 'scripts/emp1-professional-deployment-operations-check.mjs');
const procedurePath = 'docs/emp1/EMP1_PROFESSIONAL_DEPLOYMENT_OPERATIONS.md';
const procedureSha256 = createHash('sha256').update(await readFile(resolve(root, procedurePath))).digest('hex');
const temp = await mkdtemp(join(tmpdir(), 'emp1-deployment-operations-'));

const HEAD = 'a'.repeat(40);
const TREE = 'b'.repeat(40);
const ARTIFACT = 'c'.repeat(64);
const PREVIOUS_ARTIFACT = 'd'.repeat(64);
const PREVIOUS_HEAD = 'e'.repeat(40);
const PREVIOUS_TREE = 'f'.repeat(40);

try {
  const deploymentReceipt = sign({
    schema: 'emp1-professional-deployment-receipt/v1',
    candidate: {
      headSha: HEAD,
      treeSha: TREE,
      buildArtifactSha256: ARTIFACT,
    },
    deployment: {
      provider: 'TEST_PROVIDER',
      environment: 'PRODUCTION',
      url: 'https://production.example.invalid/app',
      state: 'DEPLOYED',
      deployedArtifactSha256: ARTIFACT,
    },
    smokeCheck: {
      status: 'PASS',
      url: 'https://production.example.invalid/app',
      observedAtUtc: '2026-08-26T12:00:00Z',
    },
    authorityBoundary: {
      codeComplianceAuthorized: false,
      globalEmp1CRouteAuthority: false,
      broaderApplicationSecurityCertificationClaimed: false,
      deploymentAuthorityGrantedByReceipt: false,
    },
  });

  const valid = sign({
    schema: 'emp1-professional-deployment-operations-receipt/v1',
    releaseOperationMode: 'PROMOTION_WITH_ROLLBACK_BASELINE',
    candidate: {
      headSha: HEAD,
      treeSha: TREE,
      buildArtifactSha256: ARTIFACT,
    },
    environments: {
      preview: {
        environment: 'PREVIEW',
        identity: 'PREVIEW_PR_1473',
        url: 'https://preview.example.invalid/app',
        state: 'AVAILABLE',
      },
      staging: candidateEnvironment('STAGING', 'STAGING_RELEASE_CANDIDATE', 'https://staging.example.invalid/app'),
      production: {
        ...candidateEnvironment('PRODUCTION', 'PRODUCTION_PRIMARY', 'https://production.example.invalid/app'),
        provider: 'TEST_PROVIDER',
      },
    },
    promotion: {
      fromEnvironment: 'STAGING',
      toEnvironment: 'PRODUCTION',
      buildArtifactSha256: ARTIFACT,
      rebuildPerformedBetweenStagingAndProduction: false,
    },
    previousProduction: {
      environment: 'PRODUCTION',
      candidateHeadSha: PREVIOUS_HEAD,
      candidateTreeSha: PREVIOUS_TREE,
      buildArtifactSha256: PREVIOUS_ARTIFACT,
      deployedArtifactSha256: PREVIOUS_ARTIFACT,
      provider: 'TEST_PROVIDER',
      providerDeploymentVersionId: 'prod-version-previous-001',
      retained: true,
    },
    rollback: {
      mode: 'WHOLE_ARTIFACT_VERSION_ROLLBACK',
      targetArtifactSha256: PREVIOUS_ARTIFACT,
      targetProviderDeploymentVersionId: 'prod-version-previous-001',
      selectiveAuthorityToggleAllowed: false,
      rollbackReady: true,
      rollbackExecuted: false,
      rollbackSuccessClaimed: false,
      procedurePath,
      procedureSha256,
    },
    authorityBoundary: {
      engineeringAuthorityGranted: false,
      codeComplianceAuthorized: false,
      deploymentAuthorityGrantedByReceipt: false,
      providerPromotionExecutionObserved: false,
      rollbackExecutionObserved: false,
      rollbackSuccessAuthorizedByReceipt: false,
    },
  });

  const pass = await run(valid, deploymentReceipt);
  assert.equal(pass.status, 0);
  const passPayload = JSON.parse(pass.stdout);
  assert.equal(passPayload.status, 'PASS_DEPLOYMENT_OPERATIONS_CUSTODY_BOUND_TO_EXACT_CANDIDATE');
  assert.equal(passPayload.environmentSeparationQualified, true);
  assert.equal(passPayload.rollbackReady, true);
  assert.equal(passPayload.rollbackExecuted, false);
  assert.equal(passPayload.deploymentAuthorityGrantedByThisCheck, false);

  await expectFail(mutate(valid, (x) => { x.releaseOperationMode = 'INITIAL_PRODUCTION_BOOTSTRAP'; }),
    deploymentReceipt, 'EMP1_DEPLOYMENT_OPERATIONS_INITIAL_BOOTSTRAP_ROLLBACK_BASELINE_REQUIRED');
  await expectFail(mutate(valid, (x) => { x.environments.staging.identity = x.environments.preview.identity; }),
    deploymentReceipt, 'EMP1_DEPLOYMENT_OPERATIONS_ENVIRONMENT_IDENTITY_COLLAPSE');
  await expectFail(mutate(valid, (x) => { x.environments.staging.url = x.environments.preview.url; }),
    deploymentReceipt, 'EMP1_DEPLOYMENT_OPERATIONS_ENVIRONMENT_URL_COLLAPSE');
  await expectFail(mutate(valid, (x) => { x.environments.staging.buildArtifactSha256 = '1'.repeat(64); }),
    deploymentReceipt, 'EMP1_DEPLOYMENT_OPERATIONS_STAGING_ARTIFACT_MISMATCH');
  await expectFail(mutate(valid, (x) => { x.promotion.rebuildPerformedBetweenStagingAndProduction = true; }),
    deploymentReceipt, 'EMP1_DEPLOYMENT_OPERATIONS_PRODUCTION_REBUILD_PROHIBITED');
  await expectFail(mutate(valid, (x) => { x.previousProduction.retained = false; }),
    deploymentReceipt, 'EMP1_DEPLOYMENT_OPERATIONS_PREVIOUS_ARTIFACT_RETENTION_REQUIRED');
  await expectFail(mutate(valid, (x) => {
    x.previousProduction.buildArtifactSha256 = ARTIFACT;
    x.previousProduction.deployedArtifactSha256 = ARTIFACT;
  }), deploymentReceipt, 'EMP1_DEPLOYMENT_OPERATIONS_ROLLBACK_TARGET_MUST_DIFFER_FROM_CURRENT');
  await expectFail(mutate(valid, (x) => { x.previousProduction.providerDeploymentVersionId = ''; }),
    deploymentReceipt, 'EMP1_DEPLOYMENT_OPERATIONS_PREVIOUS_PROVIDER_VERSION_REQUIRED');
  await expectFail(mutate(valid, (x) => { x.rollback.mode = 'SELECTIVE_FLAG_ROLLBACK'; }),
    deploymentReceipt, 'EMP1_DEPLOYMENT_OPERATIONS_WHOLE_ARTIFACT_ROLLBACK_REQUIRED');
  await expectFail(mutate(valid, (x) => { x.rollback.selectiveAuthorityToggleAllowed = true; }),
    deploymentReceipt, 'EMP1_DEPLOYMENT_OPERATIONS_SELECTIVE_AUTHORITY_ROLLBACK_PROHIBITED');
  await expectFail(mutate(valid, (x) => { x.rollback.rollbackReady = false; }),
    deploymentReceipt, 'EMP1_DEPLOYMENT_OPERATIONS_ROLLBACK_READY_REQUIRED');
  await expectFail(mutate(valid, (x) => { x.rollback.rollbackExecuted = true; }),
    deploymentReceipt, 'EMP1_DEPLOYMENT_OPERATIONS_ROLLBACK_EXECUTION_NOT_ESTABLISHED');
  await expectFail(mutate(valid, (x) => { x.rollback.rollbackSuccessClaimed = true; }),
    deploymentReceipt, 'EMP1_DEPLOYMENT_OPERATIONS_ROLLBACK_SUCCESS_CLAIM_PROHIBITED');
  await expectFail(mutate(valid, (x) => { x.rollback.procedureSha256 = '0'.repeat(64); }),
    deploymentReceipt, 'EMP1_DEPLOYMENT_OPERATIONS_ROLLBACK_PROCEDURE_SHA_MISMATCH');
  await expectFail(mutate(valid, (x) => { x.authorityBoundary.providerPromotionExecutionObserved = true; }),
    deploymentReceipt, 'EMP1_DEPLOYMENT_OPERATIONS_PROVIDER_PROMOTION_OBSERVATION_FALSE_REQUIRED');
  await expectFail(mutate(valid, (x) => { x.authorityBoundary.rollbackExecutionObserved = true; }),
    deploymentReceipt, 'EMP1_DEPLOYMENT_OPERATIONS_ROLLBACK_OBSERVATION_FALSE_REQUIRED');

  const forged = structuredClone(valid);
  forged.environments.production.identity = 'FORGED_PRODUCTION_IDENTITY';
  await expectFailRaw(forged, deploymentReceipt, 'EMP1_DEPLOYMENT_OPERATIONS_RECEIPT_SEMANTIC_HASH_MISMATCH');

  const candidateSource = await readFile(resolve(root, 'scripts/emp1-professional-release-candidate.mjs'), 'utf8');
  const headersIndex = candidateSource.indexOf("runNode('DEPLOYMENT_SECURITY_HEADERS'");
  const operationsIndex = candidateSource.indexOf("runNode('DEPLOYMENT_OPERATIONS'");
  assert.ok(headersIndex >= 0, 'deployed security-header gate must exist');
  assert.ok(operationsIndex > headersIndex, 'deployment operations must run after deployment/header evidence');
  assert.match(candidateSource, /--deployment-operations-receipt/u,
    'release candidate must expose deployment-operations receipt input');
  assert.match(candidateSource, /deploymentOperationsReceiptSha256/u,
    'release candidate must bind operations receipt raw SHA-256');
  assert.match(candidateSource, /rollbackExecutionObservedByThisHarness:\s*false/u,
    'release harness must not claim rollback execution');

  console.log(JSON.stringify({
    schema: 'emp1-professional-deployment-operations-falsifier/v1',
    status: 'PASS',
    falsifiers: [
      'VALID_PROMOTION_CUSTODY_PASS',
      'INITIAL_BOOTSTRAP_BLOCKED',
      'ENVIRONMENT_IDENTITY_COLLAPSE_REJECTED',
      'ENVIRONMENT_URL_COLLAPSE_REJECTED',
      'STAGING_ARTIFACT_DRIFT_REJECTED',
      'PRODUCTION_REBUILD_REJECTED',
      'PREVIOUS_ARTIFACT_RETENTION_REQUIRED',
      'CURRENT_ARTIFACT_CANNOT_BE_ROLLBACK_TARGET',
      'PREVIOUS_PROVIDER_VERSION_REQUIRED',
      'WHOLE_ARTIFACT_ROLLBACK_REQUIRED',
      'SELECTIVE_AUTHORITY_ROLLBACK_REJECTED',
      'ROLLBACK_READY_REQUIRED',
      'UNOBSERVED_ROLLBACK_EXECUTION_CLAIM_REJECTED',
      'UNOBSERVED_ROLLBACK_SUCCESS_CLAIM_REJECTED',
      'ROLLBACK_PROCEDURE_HASH_BOUND',
      'PROVIDER_PROMOTION_OBSERVATION_CANNOT_BE_FORGED',
      'ROLLBACK_OBSERVATION_CANNOT_BE_FORGED',
      'SEMANTIC_HASH_FORGERY_REJECTED',
      'OPERATIONS_GATE_ORDERED_AFTER_DEPLOYMENT_SECURITY_HEADERS',
      'RELEASE_PROVENANCE_BINDS_OPERATIONS_RECEIPT',
      'RELEASE_HARNESS_CANNOT_CLAIM_ROLLBACK_EXECUTION',
    ],
    authorityBoundary: {
      actualProviderPromotionObserved: false,
      rollbackExecutionObserved: false,
      rollbackSuccessAuthorized: false,
      engineeringAuthorityGranted: false,
      releaseAuthorityGranted: false,
      deploymentAuthorityGranted: false,
    },
  }, null, 2));
} finally {
  await rm(temp, { recursive: true, force: true });
}

function candidateEnvironment(environment, identity, url) {
  return {
    environment,
    identity,
    url,
    state: 'DEPLOYED',
    candidateHeadSha: HEAD,
    candidateTreeSha: TREE,
    buildArtifactSha256: ARTIFACT,
    smokeCheck: { status: 'PASS', url, observedAtUtc: '2026-08-26T12:00:00Z' },
  };
}
function sign(payload) {
  return { ...payload, receiptSemanticHash: semanticHash(payload) };
}
function mutate(source, mutator) {
  const copy = structuredClone(source);
  delete copy.receiptSemanticHash;
  mutator(copy);
  return sign(copy);
}
async function expectFail(receipt, deploymentReceipt, expectedCode) {
  const result = await run(receipt, deploymentReceipt);
  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, 'FAIL');
  assert.equal(payload.code, expectedCode);
  assert.equal(payload.rollbackExecuted, false);
  assert.equal(payload.deploymentAuthorityGrantedByThisCheck, false);
}
async function expectFailRaw(receipt, deploymentReceipt, expectedCode) {
  const result = await run(receipt, deploymentReceipt);
  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.code, expectedCode);
}
async function run(receipt, deploymentReceipt) {
  const nonce = Math.random().toString(16).slice(2);
  const receiptPath = join(temp, `operations-${nonce}.json`);
  const deploymentPath = join(temp, `deployment-${nonce}.json`);
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  await writeFile(deploymentPath, `${JSON.stringify(deploymentReceipt, null, 2)}\n`, 'utf8');
  const result = spawnSync(process.execPath, [
    checker,
    '--receipt', receiptPath,
    '--deployment-receipt', deploymentPath,
    '--expected-head', HEAD,
    '--expected-tree', TREE,
    '--expected-artifact-sha256', ARTIFACT,
  ], { cwd: root, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  assert.equal(result.error, undefined);
  return result;
}
function semanticHash(value) {
  const { receiptSemanticHash: _hash, ...payload } = value;
  return createHash('sha256').update(JSON.stringify(sortValue(payload)), 'utf8').digest('hex');
}
function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
  }
  return value;
}
