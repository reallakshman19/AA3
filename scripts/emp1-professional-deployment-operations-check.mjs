#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const options = parseArgs(process.argv.slice(2));

const operationsFile = await readJsonFile(options.receipt, 'EMP1_DEPLOYMENT_OPERATIONS_RECEIPT_INVALID');
const deploymentFile = await readJsonFile(
  options.deploymentReceipt,
  'EMP1_DEPLOYMENT_OPERATIONS_PRODUCTION_DEPLOYMENT_RECEIPT_INVALID',
);
const receipt = operationsFile.value;
const deploymentReceipt = deploymentFile.value;

requireCondition(receipt.schema === 'emp1-professional-deployment-operations-receipt/v1',
  'EMP1_DEPLOYMENT_OPERATIONS_SCHEMA_INVALID');

if (receipt.releaseOperationMode === 'INITIAL_PRODUCTION_BOOTSTRAP') {
  emitFail('EMP1_DEPLOYMENT_OPERATIONS_INITIAL_BOOTSTRAP_ROLLBACK_BASELINE_REQUIRED', {
    qualification: 'BLOCKED_ROLLBACK_BASELINE_REQUIRED',
  });
}
requireCondition(receipt.releaseOperationMode === 'PROMOTION_WITH_ROLLBACK_BASELINE',
  'EMP1_DEPLOYMENT_OPERATIONS_PROMOTION_MODE_REQUIRED');

requireCondition(receipt.candidate?.headSha === options.expectedHead,
  'EMP1_DEPLOYMENT_OPERATIONS_HEAD_MISMATCH');
requireCondition(receipt.candidate?.treeSha === options.expectedTree,
  'EMP1_DEPLOYMENT_OPERATIONS_TREE_MISMATCH');
requireCondition(receipt.candidate?.buildArtifactSha256 === options.expectedArtifactSha256,
  'EMP1_DEPLOYMENT_OPERATIONS_ARTIFACT_MISMATCH');

validateProductionDeploymentReceipt(deploymentReceipt);

const preview = receipt.environments?.preview;
const staging = receipt.environments?.staging;
const production = receipt.environments?.production;
requireEnvironment(preview, 'PREVIEW', 'PREVIEW');
requireEnvironment(staging, 'STAGING', 'STAGING');
requireEnvironment(production, 'PRODUCTION', 'PRODUCTION');

requireCondition(new Set([preview.identity, staging.identity, production.identity]).size === 3,
  'EMP1_DEPLOYMENT_OPERATIONS_ENVIRONMENT_IDENTITY_COLLAPSE');
requireCondition(new Set([preview.url, staging.url, production.url]).size === 3,
  'EMP1_DEPLOYMENT_OPERATIONS_ENVIRONMENT_URL_COLLAPSE');

requireCondition(staging.state === 'DEPLOYED',
  'EMP1_DEPLOYMENT_OPERATIONS_STAGING_DEPLOYED_REQUIRED');
requireCondition(production.state === 'DEPLOYED',
  'EMP1_DEPLOYMENT_OPERATIONS_PRODUCTION_DEPLOYED_REQUIRED');
requireCandidateEnvironment(staging, 'STAGING');
requireCandidateEnvironment(production, 'PRODUCTION');
requireSmokePass(staging, 'STAGING');
requireSmokePass(production, 'PRODUCTION');

requireCondition(production.provider === deploymentReceipt.deployment?.provider,
  'EMP1_DEPLOYMENT_OPERATIONS_PRODUCTION_PROVIDER_MISMATCH');
requireCondition(production.url === deploymentReceipt.deployment?.url,
  'EMP1_DEPLOYMENT_OPERATIONS_PRODUCTION_URL_MISMATCH');
requireCondition(production.buildArtifactSha256 === deploymentReceipt.deployment?.deployedArtifactSha256,
  'EMP1_DEPLOYMENT_OPERATIONS_PRODUCTION_DEPLOYMENT_ARTIFACT_MISMATCH');

const promotion = receipt.promotion;
requireCondition(promotion?.fromEnvironment === 'STAGING',
  'EMP1_DEPLOYMENT_OPERATIONS_PROMOTION_FROM_STAGING_REQUIRED');
requireCondition(promotion?.toEnvironment === 'PRODUCTION',
  'EMP1_DEPLOYMENT_OPERATIONS_PROMOTION_TO_PRODUCTION_REQUIRED');
requireCondition(promotion?.buildArtifactSha256 === options.expectedArtifactSha256,
  'EMP1_DEPLOYMENT_OPERATIONS_PROMOTION_ARTIFACT_MISMATCH');
requireCondition(promotion?.rebuildPerformedBetweenStagingAndProduction === false,
  'EMP1_DEPLOYMENT_OPERATIONS_PRODUCTION_REBUILD_PROHIBITED');
requireCondition(staging.buildArtifactSha256 === production.buildArtifactSha256,
  'EMP1_DEPLOYMENT_OPERATIONS_STAGING_PRODUCTION_ARTIFACT_DRIFT');

const previous = receipt.previousProduction;
requireCondition(previous?.environment === 'PRODUCTION',
  'EMP1_DEPLOYMENT_OPERATIONS_PREVIOUS_PRODUCTION_ENVIRONMENT_REQUIRED');
requireCondition(validSha40(previous?.candidateHeadSha),
  'EMP1_DEPLOYMENT_OPERATIONS_PREVIOUS_HEAD_REQUIRED');
requireCondition(validSha40(previous?.candidateTreeSha),
  'EMP1_DEPLOYMENT_OPERATIONS_PREVIOUS_TREE_REQUIRED');
requireCondition(validSha256(previous?.buildArtifactSha256),
  'EMP1_DEPLOYMENT_OPERATIONS_PREVIOUS_BUILD_ARTIFACT_REQUIRED');
requireCondition(previous?.deployedArtifactSha256 === previous?.buildArtifactSha256,
  'EMP1_DEPLOYMENT_OPERATIONS_PREVIOUS_DEPLOYED_ARTIFACT_MISMATCH');
requireCondition(requiredText(previous?.provider),
  'EMP1_DEPLOYMENT_OPERATIONS_PREVIOUS_PROVIDER_REQUIRED');
requireCondition(requiredText(previous?.providerDeploymentVersionId),
  'EMP1_DEPLOYMENT_OPERATIONS_PREVIOUS_PROVIDER_VERSION_REQUIRED');
requireCondition(previous?.retained === true,
  'EMP1_DEPLOYMENT_OPERATIONS_PREVIOUS_ARTIFACT_RETENTION_REQUIRED');
requireCondition(previous?.deployedArtifactSha256 !== options.expectedArtifactSha256,
  'EMP1_DEPLOYMENT_OPERATIONS_ROLLBACK_TARGET_MUST_DIFFER_FROM_CURRENT');

const rollback = receipt.rollback;
requireCondition(rollback?.mode === 'WHOLE_ARTIFACT_VERSION_ROLLBACK',
  'EMP1_DEPLOYMENT_OPERATIONS_WHOLE_ARTIFACT_ROLLBACK_REQUIRED');
requireCondition(rollback?.targetArtifactSha256 === previous.deployedArtifactSha256,
  'EMP1_DEPLOYMENT_OPERATIONS_ROLLBACK_TARGET_ARTIFACT_MISMATCH');
requireCondition(rollback?.targetProviderDeploymentVersionId === previous.providerDeploymentVersionId,
  'EMP1_DEPLOYMENT_OPERATIONS_ROLLBACK_TARGET_VERSION_MISMATCH');
requireCondition(rollback?.selectiveAuthorityToggleAllowed === false,
  'EMP1_DEPLOYMENT_OPERATIONS_SELECTIVE_AUTHORITY_ROLLBACK_PROHIBITED');
requireCondition(rollback?.rollbackReady === true,
  'EMP1_DEPLOYMENT_OPERATIONS_ROLLBACK_READY_REQUIRED');
requireCondition(rollback?.rollbackExecuted === false,
  'EMP1_DEPLOYMENT_OPERATIONS_ROLLBACK_EXECUTION_NOT_ESTABLISHED');
requireCondition(rollback?.rollbackSuccessClaimed === false,
  'EMP1_DEPLOYMENT_OPERATIONS_ROLLBACK_SUCCESS_CLAIM_PROHIBITED');
requireCondition(rollback?.procedurePath === 'docs/emp1/EMP1_PROFESSIONAL_DEPLOYMENT_OPERATIONS.md',
  'EMP1_DEPLOYMENT_OPERATIONS_ROLLBACK_PROCEDURE_PATH_REQUIRED');
requireCondition(validSha256(rollback?.procedureSha256),
  'EMP1_DEPLOYMENT_OPERATIONS_ROLLBACK_PROCEDURE_SHA_REQUIRED');
const procedureSha256 = await fileSha256(rollback.procedurePath);
requireCondition(procedureSha256 === rollback.procedureSha256,
  'EMP1_DEPLOYMENT_OPERATIONS_ROLLBACK_PROCEDURE_SHA_MISMATCH');

requireCondition(receipt.authorityBoundary?.engineeringAuthorityGranted === false,
  'EMP1_DEPLOYMENT_OPERATIONS_ENGINEERING_AUTHORITY_FALSE_REQUIRED');
requireCondition(receipt.authorityBoundary?.codeComplianceAuthorized === false,
  'EMP1_DEPLOYMENT_OPERATIONS_CODE_AUTHORITY_FALSE_REQUIRED');
requireCondition(receipt.authorityBoundary?.deploymentAuthorityGrantedByReceipt === false,
  'EMP1_DEPLOYMENT_OPERATIONS_DEPLOYMENT_AUTHORITY_FALSE_REQUIRED');
requireCondition(receipt.authorityBoundary?.providerPromotionExecutionObserved === false,
  'EMP1_DEPLOYMENT_OPERATIONS_PROVIDER_PROMOTION_OBSERVATION_FALSE_REQUIRED');
requireCondition(receipt.authorityBoundary?.rollbackExecutionObserved === false,
  'EMP1_DEPLOYMENT_OPERATIONS_ROLLBACK_OBSERVATION_FALSE_REQUIRED');
requireCondition(receipt.authorityBoundary?.rollbackSuccessAuthorizedByReceipt === false,
  'EMP1_DEPLOYMENT_OPERATIONS_ROLLBACK_SUCCESS_AUTHORITY_FALSE_REQUIRED');

requireCondition(receipt.receiptSemanticHash === semanticHash(receipt),
  'EMP1_DEPLOYMENT_OPERATIONS_RECEIPT_SEMANTIC_HASH_MISMATCH');

console.log(JSON.stringify({
  schema: 'emp1-professional-deployment-operations-check/v1',
  status: 'PASS_DEPLOYMENT_OPERATIONS_CUSTODY_BOUND_TO_EXACT_CANDIDATE',
  operationsReceiptSha256: operationsFile.sha256,
  candidateHeadSha: options.expectedHead,
  candidateTreeSha: options.expectedTree,
  buildArtifactSha256: options.expectedArtifactSha256,
  environmentSeparationQualified: true,
  stagingProductionSameArtifact: true,
  productionRebuildPerformed: false,
  previousProductionRetained: true,
  rollbackMode: 'WHOLE_ARTIFACT_VERSION_ROLLBACK',
  rollbackReady: true,
  rollbackExecuted: false,
  rollbackSuccessClaimed: false,
  providerPromotionExecutionObserved: false,
  deploymentAuthorityGrantedByThisCheck: false,
  engineeringAuthorityGrantedByThisCheck: false,
}, null, 2));

function validateProductionDeploymentReceipt(value) {
  requireCondition(value?.schema === 'emp1-professional-deployment-receipt/v1',
    'EMP1_DEPLOYMENT_OPERATIONS_PRODUCTION_RECEIPT_SCHEMA_INVALID');
  requireCondition(value.candidate?.headSha === options.expectedHead,
    'EMP1_DEPLOYMENT_OPERATIONS_PRODUCTION_RECEIPT_HEAD_MISMATCH');
  requireCondition(value.candidate?.treeSha === options.expectedTree,
    'EMP1_DEPLOYMENT_OPERATIONS_PRODUCTION_RECEIPT_TREE_MISMATCH');
  requireCondition(value.candidate?.buildArtifactSha256 === options.expectedArtifactSha256,
    'EMP1_DEPLOYMENT_OPERATIONS_PRODUCTION_RECEIPT_ARTIFACT_MISMATCH');
  requireCondition(value.deployment?.deployedArtifactSha256 === options.expectedArtifactSha256,
    'EMP1_DEPLOYMENT_OPERATIONS_PRODUCTION_RECEIPT_DEPLOYED_ARTIFACT_MISMATCH');
  requireCondition(value.deployment?.environment === 'PRODUCTION',
    'EMP1_DEPLOYMENT_OPERATIONS_PRODUCTION_RECEIPT_ENVIRONMENT_INVALID');
  requireCondition(value.deployment?.state === 'DEPLOYED',
    'EMP1_DEPLOYMENT_OPERATIONS_PRODUCTION_RECEIPT_STATE_INVALID');
  requireCondition(requiredText(value.deployment?.provider),
    'EMP1_DEPLOYMENT_OPERATIONS_PRODUCTION_RECEIPT_PROVIDER_REQUIRED');
  requireCondition(Boolean(safeHttpsUrl(value.deployment?.url)),
    'EMP1_DEPLOYMENT_OPERATIONS_PRODUCTION_RECEIPT_HTTPS_REQUIRED');
  requireCondition(value.smokeCheck?.status === 'PASS',
    'EMP1_DEPLOYMENT_OPERATIONS_PRODUCTION_RECEIPT_SMOKE_PASS_REQUIRED');
  requireCondition(value.smokeCheck?.url === value.deployment.url,
    'EMP1_DEPLOYMENT_OPERATIONS_PRODUCTION_RECEIPT_SMOKE_URL_MISMATCH');
  requireCondition(value.receiptSemanticHash === semanticHash(value),
    'EMP1_DEPLOYMENT_OPERATIONS_PRODUCTION_RECEIPT_SEMANTIC_HASH_MISMATCH');
}

function requireEnvironment(value, expectedEnvironment, label) {
  requireCondition(value?.environment === expectedEnvironment,
    `EMP1_DEPLOYMENT_OPERATIONS_${label}_ENVIRONMENT_REQUIRED`);
  requireCondition(requiredText(value?.identity),
    `EMP1_DEPLOYMENT_OPERATIONS_${label}_IDENTITY_REQUIRED`);
  requireCondition(Boolean(safeHttpsUrl(value?.url)),
    `EMP1_DEPLOYMENT_OPERATIONS_${label}_HTTPS_URL_REQUIRED`);
}
function requireCandidateEnvironment(value, label) {
  requireCondition(value.candidateHeadSha === options.expectedHead,
    `EMP1_DEPLOYMENT_OPERATIONS_${label}_HEAD_MISMATCH`);
  requireCondition(value.candidateTreeSha === options.expectedTree,
    `EMP1_DEPLOYMENT_OPERATIONS_${label}_TREE_MISMATCH`);
  requireCondition(value.buildArtifactSha256 === options.expectedArtifactSha256,
    `EMP1_DEPLOYMENT_OPERATIONS_${label}_ARTIFACT_MISMATCH`);
}
function requireSmokePass(value, label) {
  requireCondition(value.smokeCheck?.status === 'PASS',
    `EMP1_DEPLOYMENT_OPERATIONS_${label}_SMOKE_PASS_REQUIRED`);
  requireCondition(value.smokeCheck?.url === value.url,
    `EMP1_DEPLOYMENT_OPERATIONS_${label}_SMOKE_URL_MISMATCH`);
  requireCondition(validUtc(value.smokeCheck?.observedAtUtc),
    `EMP1_DEPLOYMENT_OPERATIONS_${label}_SMOKE_UTC_REQUIRED`);
}
function parseArgs(args) {
  const out = { receipt: null, deploymentReceipt: null, expectedHead: null, expectedTree: null, expectedArtifactSha256: null };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--receipt') out.receipt = requiredValue(args, ++index, arg);
    else if (arg === '--deployment-receipt') out.deploymentReceipt = requiredValue(args, ++index, arg);
    else if (arg === '--expected-head') out.expectedHead = requiredValue(args, ++index, arg);
    else if (arg === '--expected-tree') out.expectedTree = requiredValue(args, ++index, arg);
    else if (arg === '--expected-artifact-sha256') out.expectedArtifactSha256 = requiredValue(args, ++index, arg);
    else throw controlledError(`EMP1_DEPLOYMENT_OPERATIONS_ARGUMENT_UNSUPPORTED:${safeCode(arg)}`);
  }
  if (!out.receipt) throw controlledError('EMP1_DEPLOYMENT_OPERATIONS_RECEIPT_PATH_REQUIRED');
  if (!out.deploymentReceipt) throw controlledError('EMP1_DEPLOYMENT_OPERATIONS_PRODUCTION_RECEIPT_PATH_REQUIRED');
  if (!validSha40(out.expectedHead)) throw controlledError('EMP1_DEPLOYMENT_OPERATIONS_EXPECTED_HEAD_INVALID');
  if (!validSha40(out.expectedTree)) throw controlledError('EMP1_DEPLOYMENT_OPERATIONS_EXPECTED_TREE_INVALID');
  if (!validSha256(out.expectedArtifactSha256)) throw controlledError('EMP1_DEPLOYMENT_OPERATIONS_EXPECTED_ARTIFACT_SHA_INVALID');
  return out;
}
async function readJsonFile(path, invalidCode) {
  try {
    const raw = await readFile(resolve(root, path));
    return Object.freeze({
      value: JSON.parse(raw.toString('utf8')),
      sha256: createHash('sha256').update(raw).digest('hex'),
    });
  } catch {
    emitFail(invalidCode);
  }
}
async function fileSha256(path) {
  try {
    return createHash('sha256').update(await readFile(resolve(root, path))).digest('hex');
  } catch {
    emitFail('EMP1_DEPLOYMENT_OPERATIONS_ROLLBACK_PROCEDURE_UNREADABLE');
  }
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
function safeHttpsUrl(value) {
  try {
    const parsed = new URL(String(value));
    return parsed.protocol === 'https:' ? parsed : null;
  } catch {
    return null;
  }
}
function validSha40(value) { return typeof value === 'string' && /^[0-9a-f]{40}$/u.test(value); }
function validSha256(value) { return typeof value === 'string' && /^[0-9a-f]{64}$/u.test(value); }
function requiredText(value) { return typeof value === 'string' && value.trim().length > 0; }
function validUtc(value) { return typeof value === 'string' && /Z$/u.test(value) && Number.isFinite(Date.parse(value)); }
function requiredValue(args, index, flag) {
  const value = args[index];
  if (!value || value.startsWith('--')) throw controlledError(`EMP1_DEPLOYMENT_OPERATIONS_ARGUMENT_VALUE_REQUIRED:${safeCode(flag)}`);
  return value;
}
function safeCode(value) {
  return String(value).toUpperCase().replace(/[^A-Z0-9]+/gu, '_').replace(/^_+|_+$/gu, '').slice(0, 80) || 'UNKNOWN';
}
function requireCondition(condition, code) { if (!condition) emitFail(code); }
function controlledError(code) { const error = new TypeError(code); error.code = code; return error; }
function emitFail(code, extra = {}) {
  console.log(JSON.stringify({
    schema: 'emp1-professional-deployment-operations-check/v1',
    status: 'FAIL',
    code,
    rollbackExecuted: false,
    rollbackSuccessClaimed: false,
    deploymentAuthorityGrantedByThisCheck: false,
    engineeringAuthorityGrantedByThisCheck: false,
    ...extra,
  }, null, 2));
  process.exit(1);
}
