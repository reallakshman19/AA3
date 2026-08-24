#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const options = parseArgs(process.argv.slice(2));
const receipt = JSON.parse(await readFile(resolve(root, options.receipt), 'utf8'));

assert.equal(receipt.schema, 'emp1-professional-deployment-receipt/v1');
assert.equal(receipt.candidate?.headSha, options.expectedHead);
assert.equal(receipt.candidate?.treeSha, options.expectedTree);
assert.equal(receipt.candidate?.buildArtifactSha256, options.expectedArtifactSha256);
assert.equal(receipt.deployment?.deployedArtifactSha256, options.expectedArtifactSha256);
assert.equal(receipt.deployment?.environment, 'PRODUCTION');
assert.equal(receipt.deployment?.state, 'DEPLOYED');
assert.ok(requiredText(receipt.deployment?.provider), 'EMP1_DEPLOYMENT_PROVIDER_REQUIRED');
assert.ok(/^https:\/\//u.test(receipt.deployment?.url ?? ''),
  'EMP1_DEPLOYMENT_HTTPS_URL_REQUIRED');
assert.equal(receipt.smokeCheck?.status, 'PASS');
assert.equal(receipt.smokeCheck?.url, receipt.deployment.url);
assert.ok(validUtc(receipt.smokeCheck?.observedAtUtc), 'EMP1_DEPLOYMENT_SMOKE_UTC_REQUIRED');
assert.equal(receipt.authorityBoundary?.codeComplianceAuthorized, false);
assert.equal(receipt.authorityBoundary?.globalEmp1CRouteAuthority, false);
assert.equal(receipt.authorityBoundary?.broaderApplicationSecurityCertificationClaimed, false);
assert.equal(receipt.authorityBoundary?.deploymentAuthorityGrantedByReceipt, false);
assert.equal(receipt.receiptSemanticHash, semanticHash(receipt),
  'EMP1_DEPLOYMENT_RECEIPT_SEMANTIC_HASH_MISMATCH');

console.log(JSON.stringify({
  schema: 'emp1-professional-deployment-receipt-check/v1',
  status: 'PASS_DEPLOYMENT_RECEIPT_BOUND_TO_EXACT_CANDIDATE_AND_BUILD_ARTIFACT',
  candidateHeadSha: options.expectedHead,
  candidateTreeSha: options.expectedTree,
  buildArtifactSha256: options.expectedArtifactSha256,
  deploymentProvider: receipt.deployment.provider,
  deploymentUrl: receipt.deployment.url,
  codeComplianceAuthorizedByThisCheck: false,
  deploymentAuthorityGrantedByThisCheck: false,
}, null, 2));

function parseArgs(args) {
  const out = { receipt: null, expectedHead: null, expectedTree: null, expectedArtifactSha256: null };
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--receipt') out.receipt = args[++index] ?? null;
    else if (args[index] === '--expected-head') out.expectedHead = args[++index] ?? null;
    else if (args[index] === '--expected-tree') out.expectedTree = args[++index] ?? null;
    else if (args[index] === '--expected-artifact-sha256') out.expectedArtifactSha256 = args[++index] ?? null;
    else throw receiptError(`EMP1_DEPLOYMENT_RECEIPT_UNKNOWN_ARGUMENT:${args[index]}`);
  }
  if (!out.receipt) throw receiptError('EMP1_DEPLOYMENT_RECEIPT_PATH_REQUIRED');
  if (!/^[0-9a-f]{40}$/u.test(out.expectedHead ?? '')) {
    throw receiptError('EMP1_DEPLOYMENT_EXPECTED_HEAD_INVALID');
  }
  if (!/^[0-9a-f]{40}$/u.test(out.expectedTree ?? '')) {
    throw receiptError('EMP1_DEPLOYMENT_EXPECTED_TREE_INVALID');
  }
  if (!/^[0-9a-f]{64}$/u.test(out.expectedArtifactSha256 ?? '')) {
    throw receiptError('EMP1_DEPLOYMENT_EXPECTED_ARTIFACT_SHA256_INVALID');
  }
  return out;
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
function requiredText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}
function validUtc(value) {
  return typeof value === 'string'
    && /Z$/u.test(value)
    && Number.isFinite(Date.parse(value));
}
function receiptError(code) {
  const error = new TypeError(code);
  error.code = code;
  return error;
}
